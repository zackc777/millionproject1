import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,card,plain,fillPayment} from './harness.mjs';
const income={id:'inc',user_id:'test-user',entry_date:'2026-08-01',month:'2026-08-01',entry_type:'income',amount:50000,payment_method:'銀行转帳／現金'};
const statement=(extra={})=>({id:'s1',user_id:'test-user',credit_card_id:'1',cycle_end:'2026-08-17',due_date:'2026-09-02',total:8500,carryover:0,categories:{},revision:1,...extra});
const payment=(extra={})=>({id:'p1',user_id:'test-user',credit_card_id:'1',issuer:'台新',cycle_end:'2026-08-17',payment_date:'2026-09-02',amount:8500,...extra});
const spend={id:'e1',user_id:'test-user',credit_card_id:'1',payment_method:'台新',entry_date:'2026-08-05',month:'2026-08-01',entry_type:'expense',amount:2300};
function run({entries=[income],statements=[statement()],payments=[],month='2026-09',cards=[card()],today='2026-09-18'}={}){const h=harness(today+'T04:00:00Z');return h.ctx.MPFinanceModel.ledger({month,entries,statements,payments,cards,today});}
test('帳單取代同一期明細，結帳認列，付款月份只扣現金',()=>{
  const entries=[income,spend],saved=plain(entries);
  const aug=run({entries,month:'2026-08'}),sep=run({entries,payments:[payment()]});
  assert.equal(aug.monthExpense,8500);assert.equal(aug.cardDebt,8500);assert.equal(aug.monthCashOut,0);
  assert.equal(sep.monthExpense,0);assert.equal(sep.cardDebt,0);assert.equal(sep.monthCashOut,8500);assert.equal(sep.liquidCash,41500);assert.deepEqual(entries,saved);
});
test('帳單修改與移除重算，不製造任何支出資料列',()=>{
  assert.equal(run({entries:[income,spend],statements:[statement({total:7000})]}).cardDebt,7000);
  assert.equal(run({entries:[income,spend],statements:[]}).cardDebt,2300);
  const before=run({entries:[income,spend],today:'2026-08-10',month:'2026-08'});assert.equal(before.monthExpense,2300);
});
test('上期未繳不重複認列，部分繳款、再付款及刪除付款皆守恆',()=>{
  const statements=[statement({total:3000}),statement({id:'s2',cycle_end:'2026-09-17',due_date:'2026-10-02',total:7000,carryover:3000})];
  const p1=payment({cycle_end:'2026-09-17',payment_date:'2026-09-18',amount:1000}),p2=payment({id:'p2',cycle_end:'2026-09-17',payment_date:'2026-09-18',amount:6000});
  for(const [payments,debt] of [[[],7000],[[p1],6000],[[p1,p2],0]]){
    const st=run({statements,payments});assert.equal(st.monthExpense,4000);assert.equal(st.totalExpense,7000);assert.equal(st.cardDebt,debt);assert.equal(st.liquidCash-st.cardDebt,43000);
  }
});
test('第一次導入的上期欠款保留負債，不虛構消費',()=>{
  const st=run({statements:[statement({total:8500,carryover:3000})]});assert.equal(st.totalExpense,5500);assert.equal(st.cardDebt,8500);
  assert.equal(run({statements:[statement({total:8500,carryover:3000})],payments:[payment()]}).cardDebt,0);
});
test('多卡隔離、零元帳單、超繳提示、失聯舊紀錄不消失',()=>{
  const st=run({statements:[statement({total:0})],payments:[payment({amount:200})],entries:[income,{...spend,credit_card_id:'missing',amount:300}]});
  assert.equal(st.unmatchedPayments,200);assert.equal(st.cardDebt,300);assert.equal(st.unresolved,1);
  assert.equal(run({cards:[card(),card('2','國泰')],payments:[payment({credit_card_id:'2',issuer:'國泰'})]}).cardDebt,8500);
});
test('分類合計、未來帳單與負值驗證；帳單分類不按結帳日放大速度',()=>{
  const h=harness(),S=h.ctx.MPStatementModel;
  for(const s of [statement({total:-1}),statement({carryover:9000}),statement({categories:{daily:9000}}),statement({cycle_end:'2026-10-17',due_date:'2026-11-02'})])assert.throws(()=>S.validate(s));
  const st=run({statements:[statement({cycle_end:'2026-09-17',due_date:'2026-10-02',categories:{daily:8500}})]});
  const plan=h.ctx.MPFinanceModel.rolling(st,{daily:8500,__fixed:{daily:false}},70000,'2026-09-18');
  assert.equal(plan.categories.find(c=>c.key==='daily').forecast,8500);
});
test('未出帳預留與生活預算取較高者，缺資料不產生投資上限',()=>{
  const h=harness(),s=statement({cycle_end:'2026-09-17',due_date:'2026-10-02',total:1000});
  const profile={daily:3000,__fixed:{daily:false}};
  const a=run({statements:[s],cards:[{...card(),monthly_spend_cap:5000}]});const p=h.ctx.MPFinanceModel.rolling(a,profile,0,'2026-09-18');
  assert.equal(p.necessaryReserve,5000);assert.equal(p.unbilledReserve,5000);assert.equal(p.remainingLiving,3000);assert.equal(p.afterReserve,Math.min(a.monthUnallocated,a.liquidCash)-a.cardDebt-5000);
  const missing=run({statements:[s]});assert.equal(h.ctx.MPFinanceModel.rolling(missing,profile,0,'2026-09-18').core,0);
});
test('帳單繳款入口預填含舊欠款金額，付款 handler 保持單一資料來源',async()=>{
  const h=harness();h.db.credit_cards=[card()];h.db.credit_card_statements=[statement()];h.db.finance_entries=[income,spend];h.load('src/runtime/cards.js');
  await h.ctx.mpStatementPay('s1');fillPayment(h,{amount:8500,date:'2026-09-02',cycle:'2026-08-17'});await h.ctx.mpSaveCardPayment();
  assert.equal(h.db.finance_entries.length,2);assert.equal(h.db.credit_card_payments.length,1);
  assert.equal(run({entries:h.db.finance_entries,payments:h.db.credit_card_payments}).cardDebt,0);
});
test('帳單刪除保護、讀取失敗與卡片停用',async()=>{
  const h=harness();h.db.credit_cards=[card()];h.db.credit_card_statements=[statement()];h.db.credit_card_payments=[payment()];
  await h.ctx.mpDeleteStatement('s1');assert.equal(h.db.credit_card_statements.length,1);assert.match(h.alerts.at(-1),/關聯/);
  h.load('src/runtime/cards.js');await h.ctx.mpDeleteCard('1','台新');assert.equal(h.db.credit_cards.length,1);
  h.fail('credit_card_statements');await h.ctx.mpCreditCards();assert.match(h.app.innerHTML,/資料載入失敗/);
});
function form(h,changes={}){
  for(const [k,v] of Object.entries({card:'1',cycle:'2026-08-17',start:'2026-07-18',due:'2026-09-02',total:'8500',carry:'0',note:'',...changes}))h.field('mpst-'+k,String(v));
  h.field('mpst-confirm').checked=true;h.field('mpst-error');h.field('mpst-save');
}
test('帳單表單新增連點只寫一筆，編輯使用 revision 且失敗保留表單',async()=>{
  const h=harness();h.db.credit_cards=[card()];let renders=0;h.ctx.render=async()=>renders++;
  await h.ctx.mpNewStatement('1');form(h);await Promise.all([h.ctx.mpSaveStatement(),h.ctx.mpSaveStatement()]);
  assert.equal(h.db.credit_card_statements.length,1);assert.equal(h.db.finance_entries.length,0);assert.equal(renders,1);
  h.db.credit_card_statements[0].revision=1;
  await h.ctx.mpEditStatement('1');form(h,{total:7000});await h.ctx.mpSaveStatement();assert.equal(h.db.credit_card_statements[0].total,7000);
  await h.ctx.mpEditStatement('1');form(h,{total:6000});h.db.credit_card_statements[0].revision=2;await h.ctx.mpSaveStatement();
  assert.equal(h.db.credit_card_statements[0].total,7000);assert.match(h.elements.get('mpst-error').textContent,/其他裝置/);
});
test('改卡片結帳日不改已對帳期間；原明細不重複出現',()=>{
  const s=statement({cycle_start:'2026-07-18'});const st=run({statements:[s],entries:[income,spend],cards:[{...card(),statement_day:1}]});
  assert.equal(st.totalExpense,8500);assert.equal(st.cardDebt,8500);assert.equal(st.bills.find(b=>b.statementId==='s1').dueDate,'2026-09-02');
});
test('每月卡費增加時先縮減追加配置；繳款後不再扣第二次',()=>{
  const h=harness(),entries=[{...income,entry_date:'2026-09-01',month:'2026-09-01'}];
  const profile={rent:10000,daily:6000,__fixed:{rent:true,daily:false}};
  const plan=(total,payments=[])=>h.ctx.MPFinanceModel.rolling(run({entries,payments,cards:[{...card(),monthly_spend_cap:5000}],statements:[statement({total})],today:'2026-09-10'}),profile,70000,'2026-09-10');
  const low=plan(8000),high=plan(12000),paid=plan(12000,[payment({amount:12000})]);
  assert.equal(low.available-high.available,4000);
  assert.equal(high.available,paid.available);assert.equal(high.spendingAvailable,paid.spendingAvailable);
  assert.equal(high.core,0);assert.equal(high.emergency+high.flex,high.available);
});
test('日常可花先保留房租，卡費暴增時日限額下降且停止追加存投',()=>{
  const h=harness(),profile={rent:10000,daily:6000,__fixed:{rent:true,daily:false}};
  const entries=[{...income,amount:20000,entry_date:'2026-09-01',month:'2026-09-01'}];
  const st=run({entries,cards:[{...card(),monthly_spend_cap:5000}],statements:[statement({total:8000})],today:'2026-09-10'});
  const p=h.ctx.MPFinanceModel.rolling(st,profile,70000,'2026-09-10');
  assert.equal(p.spendingAvailable,2000);assert.equal(p.dailyLimit,100);assert.equal(p.afterReserve,-4000);
  assert.equal(p.available,0);assert.equal(p.emergency,0);assert.equal(p.core,0);
  const missing=h.ctx.MPFinanceModel.rolling(run({entries}),profile,70000,'2026-09-18');
  assert.equal(missing.spendingAvailable,0);assert.equal(missing.dailyLimit,0);
});
test('信用卡安全可刷池與每月財務共用日常可用金額',async()=>{
  const h=harness('2026-09-10T04:00:00Z');h.db.credit_cards=[{...card(),monthly_spend_cap:5000}];
  h.db.finance_entries=[{...income,amount:20000,entry_date:'2026-09-01',month:'2026-09-01'}];h.db.credit_card_statements=[statement({total:8000})];
  h.ctx.getBudgetProfile=()=>({rent:10000,daily:6000,__fixed:{rent:true,daily:false}});h.ctx.plannedLivingTotal=()=>16000;
  h.load('src/runtime/cards.js');await h.ctx.mpCreditCards();
  assert.match(h.app.innerHTML,/全卡共用安全可刷池：NT\$2,000/);
});
