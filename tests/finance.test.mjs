import test from 'node:test';
import assert from 'node:assert/strict';
import { runInContext } from 'node:vm';
import { harness, card, read, fillPayment } from './harness.mjs';

const entry=(entry_date,amount,entry_type='expense',rest={})=>({id:entry_date+entry_type+amount,user_id:'test-user',entry_date,month:entry_date.slice(0,7)+'-01',amount,entry_type,payment_method:'銀行轉帳／現金',category:'餐飲',...rest});
const payment=(payment_date,amount,cycle_end='2026-08-17',rest={})=>({id:payment_date+amount,user_id:'test-user',payment_date,amount,cycle_end,credit_card_id:'1',issuer:'台新',...rest});
const spend=(date,amount,rest={})=>entry(date,amount,'expense',{credit_card_id:'1',payment_method:'台新',...rest});
const profile={rent:1000,family:0,telecom:0,gym:0,daily:3000,leisure:0};
function model(){return harness().ctx.MPFinanceModel}
function state(entries,payments=[],rest={}){return model().ledger({month:'2026-09',today:'2026-09-10',entries,payments,cards:[card()],...rest})}
function engine(h){const s=read('index.html');runInContext(s.slice(s.indexOf('async function readMoneyTable('),s.indexOf('async function persistMonthSnapshot(')),h.ctx)}

test('跨月刷卡與繳款：消費只認列一次，扣款只影響付款月現金',()=>{
  const entries=[entry('2026-08-01',20000,'income'),spend('2026-08-10',3000),entry('2026-09-01',20000,'income')];
  const payments=[payment('2026-09-02',3000)];
  const aug=state(entries,payments,{month:'2026-08'}),sep=state(entries,payments);
  assert.equal(aug.monthExpense,3000);assert.equal(aug.monthCashOut,0);assert.equal(aug.liquidCash,20000);assert.equal(aug.cardDebt,3000);
  assert.equal(sep.monthExpense,0);assert.equal(sep.monthCashOut,3000);assert.equal(sep.monthUnallocated,17000);assert.equal(sep.liquidCash,37000);assert.equal(sep.cardDebt,0);
  assert.equal(aug.liquidCash-aug.cardDebt+20000,sep.liquidCash-sep.cardDebt,'payment must not reduce net assets again');
});
test('同月現金消費、刷卡、繳款與存投不混算',()=>{
  const st=state([entry('2026-09-01',30000,'income'),entry('2026-09-02',1000),spend('2026-09-03',2000),entry('2026-09-04',3000,'saving',{category:'緊急預備金'}),entry('2026-09-04',4000,'investment')],[payment('2026-09-05',2000,'2026-09-17')]);
  assert.equal(st.monthExpense,3000);assert.equal(st.monthCashOut,3000);assert.equal(st.monthUnallocated,20000);assert.equal(st.liquidCash,20000);assert.equal(st.emergency,3000);assert.equal(st.cardDebt,0);
});
test('只記舊帳單繳款也列入付款月；不憑空補成消費或溢繳資產',()=>{
  const st=state([entry('2026-09-01',20000,'income')],[payment('2026-09-02',4000)]);
  assert.equal(st.monthExpense,0);assert.equal(st.monthCardPayments,4000);assert.equal(st.liquidCash,16000);assert.equal(st.unmatchedPayments,4000);assert.equal(st.cardDebt,0);
});
test('多期未繳／部分繳款不因換月消失，也不拿另一張卡的付款抵銷',()=>{
  const st=state([spend('2026-06-10',1000),spend('2026-07-10',2000),spend('2026-08-10',3000)],
    [payment('2026-07-02',400,'2026-06-17'),payment('2026-08-02',2000,'2026-07-17',{credit_card_id:'2'})],{cards:[card(),card('2','台新','其他卡')]});
  assert.equal(st.cardDebt,5600);assert.equal(st.bills.filter(x=>x.overdue).length,3);
  assert.equal(st.unmatchedPayments,2000);
});
test('未來實際日期與固定模板不計入已發生金流；月底及台北日界線',()=>{
  const st=state([entry('2026-09-01',20000,'income'),entry('2026-09-30',1000),entry('1900-01-01',5000)],[payment('2026-09-30',2000)]);
  assert.equal(st.monthExpense,0);assert.equal(st.monthCardPayments,0);
  const future=state([entry('2026-10-01',20000,'income')],[],{month:'2026-10'});assert.equal(future.monthIncome,0);
  const h=harness('2026-09-30T16:00:01Z'),oct=h.ctx.MPFinanceModel.ledger({month:'2026-10',entries:[entry('2026-10-01',800,'income')]});assert.equal(oct.monthIncome,800);
});
test('滾動配置扣除卡費、已存投、未繳卡債與剩餘生活，不超出現金',()=>{
  const base=[entry('2026-09-01',20000,'income')],a=state(base),b=state([...base,entry('2026-09-05',2000,'saving'),entry('2026-09-05',3000,'investment')],[payment('2026-09-02',4000)]);
  const plan=x=>model().rolling(x,profile,10000,'2026-09-10'),pa=plan(a),pb=plan(b);
  assert.equal(pa.available-pb.available,9000);
  assert.equal(pb.remainingLiving,4000);assert.equal(pb.available,7000);
  assert.equal(pb.emergency+pb.core+pb.flex,pb.available);assert.equal(pb.core,0);
  const cardOnly=plan(state([...base,spend('2026-09-03',1000)]));
  assert.equal(cardOnly.available,16000,'unpaid card debt replaces already-consumed living reserve, never free spending money');
});
test('消費型態變動、超支與上月同期影響建議；固定責任不按天數放大',()=>{
  const st=state([entry('2026-08-01',20000,'income'),entry('2026-08-05',1200),entry('2026-08-25',900),entry('2026-09-01',20000,'income'),entry('2026-09-03',2400),entry('2026-09-02',1000,'expense',{category:'房租／住宿'})]);
  const plan=model().rolling(st,profile,10000,'2026-09-10');
  assert.equal(plan.categories.find(x=>x.key==='daily').forecast,7200);
  assert.equal(plan.categories.find(x=>x.key==='rent').remaining,0);
  assert.equal(plan.previousExpense,1200);assert.equal(plan.expenseDelta,2200);
  assert.equal(plan.historyMonths,1);assert.ok(plan.forecast>plan.planned);
});
test('負現金、無收入、未來／過去月份與卡片歸屬不明不產生追加投資',()=>{
  for(const st of [state([entry('2026-09-01',1000)]),state([entry('2026-08-01',20000,'income')],[],{month:'2026-08'}),state([entry('2026-10-01',20000,'income')],[],{month:'2026-10'}),state([entry('2026-09-01',20000,'income'),entry('2026-09-03',100,'expense',{payment_method:'台新'})],[],{cards:[card(),card('2','台新','另一張卡')]})]){
    const plan=model().rolling(st,profile,10000,'2026-09-10');assert.equal(plan.available,0);assert.equal(plan.core,0);
  }
});
test('卡費改金額、移到另一月、刪除後，引擎即時重算但消費不變',async()=>{
  const h=harness();engine(h);h.db.credit_cards=[card()];h.db.finance_entries=[entry('2026-08-01',20000,'income'),spend('2026-08-10',3000),entry('2026-09-01',20000,'income')];h.db.credit_card_payments=[payment('2026-09-02',3000)];
  h.load('src/runtime/cards.js');h.ctx.tab='m';let renders=0;h.ctx.render=async()=>renders++;
  const id=h.db.credit_card_payments[0].id;
  await h.ctx.mpEditCardPayment(id);fillPayment(h,{amount:1000,date:'2026-08-20',cycle:'2026-08-17',note:'補正日期'});await h.ctx.mpSaveCardPayment();
  assert.equal((await h.ctx.moneyEngine('2026-09')).monthCardPayments,0);assert.equal((await h.ctx.moneyEngine('2026-08')).monthCardPayments,1000);
  assert.equal((await h.ctx.moneyEngine('2026-09')).cardDebt,2000);
  await h.ctx.mpDeleteCardPayment(id);assert.equal((await h.ctx.moneyEngine('2026-09')).cardDebt,3000);assert.equal(renders,2);
  assert.equal(h.db.finance_entries.length,3);assert.equal(h.ctx.tab,'m');assert.equal(h.snapshots.length,0,'do not overwrite historical valuations on payment amendment');
});
test('資產引擎讀取失敗不能用零筆代替；使用者資料隔離',async()=>{
  const h=harness();engine(h);h.db.finance_entries=[entry('2026-09-01',20000,'income'),entry('2026-09-02',90000,'income',{user_id:'other-user'})];
  assert.equal((await h.ctx.moneyEngine('2026-09')).monthIncome,20000);
  h.fail('credit_card_payments');await assert.rejects(h.ctx.moneyEngine('2026-09'),/無法讀取完整金流/);
});
test('月明細列出付款並連到正確 CRUD；備註跳脫，兩個建議區塊同步改變',()=>{
  const h=harness(),s=read('index.html');runInContext(s.slice(s.indexOf('function renderEntryTable('),s.indexOf('async function addFinanceEntry()')),h.ctx);
  const rows=h.field('entryRows'),summary=h.field('entrySummary');
  const st=state([entry('2026-09-01',20000,'income')],[payment('2026-09-02',4000,'2026-08-17',{note:'<img src=x>'})]);
  h.ctx.renderEntryTable(st.current,st);assert.match(rows.innerHTML,/mpEditCardPayment/);assert.match(rows.innerHTML,/&lt;img/);assert.doesNotMatch(rows.innerHTML,/<img/);assert.match(summary.innerHTML,/4,000/);
  h.ctx.getBudgetProfile=()=>profile;h.ctx.getEmergencyGoalCached=()=>10000;const alloc=h.field('allocBox'),review=h.field('mp-spending-review');
  h.ctx.mpRenderRolling(st);const old=[alloc.innerHTML,review.innerHTML];
  h.ctx.getBudgetProfile=()=>({...profile,daily:9000});h.ctx.mpRenderRolling(st);
  assert.notEqual(old[0],alloc.innerHTML);assert.notEqual(old[1],review.innerHTML);
});
test('歷史繳款不截斷到八筆，手機每筆都有日期、金額與操作',async()=>{
  const h=harness();h.db.credit_cards=[card()];h.db.credit_card_payments=Array.from({length:12},(_,i)=>payment('2026-09-02',i+1));h.load('src/runtime/cards.js');await h.ctx.mpCreditCards();
  assert.equal((h.app.innerHTML.match(/class="mp-payment-item"/g)||[]).length,12);assert.match(h.app.innerHTML,/繳款日 2026-09-02/);assert.match(h.app.innerHTML,/mpDeleteCardPayment/);
});
test('超過一千筆的帳務完整分頁讀取',async()=>{
  const h=harness();engine(h);
  h.db.finance_entries=Array.from({length:1005},(_,i)=>entry('2026-09-01',1,'income',{id:String(i)}));
  assert.equal((await h.ctx.moneyEngine('2026-09')).monthIncome,1005);
});
test('完整月度與總覽函式共用金流；無薪資月份仍可查看扣款與操作',async()=>{
  const h=harness('2026-09-10T04:00:00Z');
  const storage=new Map();h.ctx.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
  let lifeRenders=0;h.ctx.mpEnhanceLifeBudget=async()=>lifeRenders++;
  h.ctx.fixtureClient=h.ctx.c;
  const html=read('index.html'),base=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).find(x=>x.includes("const U="));
  runInContext(base.replace('\ninit();\n','\n'),h.ctx);
  h.db.credit_cards=[card()];h.db.finance_entries=[entry('2026-08-01',20000,'income')];h.db.credit_card_payments=[payment('2026-09-02',4000)];
  await runInContext('c=fixtureClient;u={id:"test-user"};financeMonthCursor="2026-09";tab="m";monthly()',h.ctx);
  assert.match(h.app.innerHTML,/mp-spending-review/);assert.match(h.app.innerHTML,/本月現金支出／扣款/);assert.match(h.app.innerHTML,/4,000/);
  assert.match(h.app.innerHTML,/id="mp-life-budget-card"/);assert.equal(lifeRenders,1,'direct monthly refresh must restore the same life-budget renderer');
  assert.doesNotMatch(h.app.innerHTML,/opacity:.5;pointer-events:none/);
  assert.equal(h.ctx.__mpMonthView.state.monthCardPayments,4000);
  await runInContext('tab="o";overview()',h.ctx);assert.match(h.app.innerHTML,/2026-09 MONEY FLOW/);assert.match(h.app.innerHTML,/4,000/);
});
test('生活預算只更新固定目標，快速切換不覆蓋右側配置或遺失狀態',async()=>{
  const h=harness(),store=new Map();
  h.ctx.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
  h.ctx.__MP_QUALITY24=true;h.ctx.tab='m';
  h.ctx.__mpBudgetProfile={rent:1000,family:2000,telecom:500,gym:500,daily:3000,leisure:0,__fixed:{rent:true,family:true,telecom:true,gym:true,daily:false,leisure:false}};
  h.ctx.getBudgetProfile=()=>h.ctx.__mpBudgetProfile;
  h.ctx.selectedMonth=()=> '2026-09';
  h.ctx.__mpMonthView={userId:'test-user',state:{month:'2026-09',current:[]}};
  let fallbackReads=0;h.ctx.q=async()=>{fallbackReads++;return []};
  const life=h.field('mp-life-budget-card'),alloc=h.field('allocBox');alloc.innerHTML='ROLLING ALLOCATION';
  h.load('src/runtime/features.js');
  await h.ctx.mpEnhanceLifeBudget();
  assert.equal(life.dataset.mpLifeRenderer,'single-source-v26');
  assert.match(life.innerHTML,/設定生活預算/);assert.equal(fallbackReads,0,'reuse the monthly state instead of querying all entries again');
  await Promise.all([h.ctx.mpLifeToggle('rent'),h.ctx.mpLifeToggle('family')]);
  assert.equal(h.ctx.__mpBudgetProfile.__fixed.rent,false);assert.equal(h.ctx.__mpBudgetProfile.__fixed.family,false);
  assert.match(life.innerHTML,/固定 2 項/);assert.equal(alloc.innerHTML,'ROLLING ALLOCATION');assert.doesNotMatch(alloc.innerHTML,/STEP 2/);
  assert.doesNotMatch(read('src/runtime/features.js'),/finance-layout \.budget-grid/);
});
test('舊帳單彙總不推估成另一份每月生活費，繳卡費後可配置不重複縮減',()=>{
  const entries=[entry('2026-09-01',20000,'income'),spend('2026-08-15',3000,{category:'帳單／費用'})];
  const before=state(entries),after=state(entries,[payment('2026-09-02',3000)]);
  const a=model().rolling(before,profile,10000,'2026-09-10'),b=model().rolling(after,profile,10000,'2026-09-10');
  assert.equal(b.remainingLiving,4000);assert.equal(b.available,13000);assert.equal(a.available,b.available);
});
test('繳款表單可改卡片與期別，取消與未來扣款不寫資料',async()=>{
  const h=harness();h.db.credit_cards=[card(),card('2','國泰','另一張卡')];h.db.credit_card_payments=[payment('2026-09-02',300)];h.load('src/runtime/cards.js');
  const id=h.db.credit_card_payments[0].id;
  await h.ctx.mpEditCardPayment(id);fillPayment(h,{cardId:'2',cycle:'2026-08-24',date:'2026-09-03',amount:500});await h.ctx.mpSaveCardPayment();
  const row=h.db.credit_card_payments[0];assert.equal(row.credit_card_id,'2');assert.equal(row.issuer,'國泰');assert.equal(row.cycle_end,'2026-08-24');assert.equal(h.db.credit_card_payments.length,1);
  const count=h.writes.length;
  await h.ctx.mpRecordCardPayment('1',null,100);h.ctx.mpClosePaymentModal();assert.equal(h.writes.length,count);
  await h.ctx.mpEditCardPayment(id);fillPayment(h,{date:'2026-10-01'});await h.ctx.mpSaveCardPayment();assert.equal(h.writes.length,count);assert.match(h.alerts.at(-1),/尚未扣款/);
});
test('生活預算同步失敗保留原設定，不顯示已同步',async()=>{
  const h=harness(),store=new Map();h.ctx.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
  h.ctx.__MP_QUALITY24=true;h.ctx.__mpBudgetProfile={...profile,__fixed:{daily:true}};h.ctx.getBudgetProfile=()=>h.ctx.__mpBudgetProfile;
  let previews=0,toasts=0;h.ctx.previewAllocation=()=>previews++;h.ctx.mpToast=()=>toasts++;
  h.load('src/runtime/features.js');h.field('bp_daily','9000');h.fail('profiles');
  await h.ctx.mpLifeSave();assert.equal(h.ctx.__mpBudgetProfile.daily,3000);assert.equal(previews,0);assert.equal(toasts,0);assert.match(h.alerts[0],/生活預算儲存失敗/);
});
test('新版淨資產快照保留投資價值，不誤把卡債扣在投資上',()=>{
  const h=harness(),s=read('index.html');runInContext(s.slice(s.indexOf('function snapshotInvestmentValue('),s.indexOf('function monthStatusText(')),h.ctx);
  const snapshot={cash_savings:15000,total_assets:21000,notes:'[AUTO_SNAPSHOT_V2] '+JSON.stringify({cardDebt:4000,investmentValue:10000})};
  assert.equal(h.ctx.snapshotInvestmentValue(snapshot),10000);
  assert.equal(h.ctx.snapshotInvestmentValue({cash_savings:10000,total_assets:18000}),8000);
});
