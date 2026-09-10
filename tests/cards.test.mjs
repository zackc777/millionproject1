import test from 'node:test';
import assert from 'node:assert/strict';
import { harness, card, plain } from './harness.mjs';

test('結帳日包含當天；台新、富邦、國泰依次月繳款',()=>{
  const m=harness().ctx.MPCardModel;
  for(const [cutoff,due] of [[17,2],[24,9],[24,9]]){
    const day=String(cutoff).padStart(2,'0');
    assert.equal(m.cycleEnd(`2026-09-${day}`,cutoff),`2026-09-${day}`);
    assert.equal(m.cycleEnd(`2026-09-${cutoff+1}`,cutoff),`2026-10-${day}`);
    assert.equal(m.shiftMonth(`2026-09-${day}`,1,due),`2026-10-${String(due).padStart(2,'0')}`);
  }
});
test('月底、閏年、跨年與台北午夜日期',()=>{
  const m=harness().ctx.MPCardModel;
  assert.equal(m.cycleEnd('2026-02-28',31),'2026-02-28');
  assert.equal(m.cycleEnd('2028-02-29',31),'2028-02-29');
  assert.equal(m.shiftMonth('2026-12-17',1,2),'2027-01-02');
  assert.equal(m.today(new Date('2026-09-30T16:01:00Z')),'2026-10-01');
  assert.throws(()=>m.parts('2026-02-30'));
  assert.throws(()=>m.billingDay(17.5));
});
test('穩定 ID 優先；舊名稱須唯一；不重複計入同銀行卡片',()=>{
  const m=harness().ctx.MPCardModel,a=card(),b=card('2','台新','另一張卡');
  const explicit={credit_card_id:'2',payment_method:'玫瑰卡'};
  assert.equal(m.matchesRecord(explicit,a,[a,b]),false);
  assert.equal(m.matchesRecord(explicit,b,[a,b]),true);
  assert.equal(m.matchesRecord({payment_method:'玫瑰卡'},a,[a,b]),true);
  assert.equal(m.matchesRecord({payment_method:'台新'},a,[a,b]),false);
  assert.throws(()=>m.resolve('台新',[a,b]),/同名/);
  assert.throws(()=>m.resolve('card:missing',[a,b]),/不存在/);
  assert.equal(m.couldMatchRecord({payment_method:'台新'},a,[a,b]),true);
});
test('停用卡不收新消費；修改歷史備註保留卡片；改現金會清除關聯',async()=>{
  const h=harness();h.db.credit_cards=[{...card(),status:'inactive'}];
  await assert.rejects(h.ctx.mpResolvePayment('card:1'),/停用/);
  const old={credit_card_id:'1',payment_method:'台新'};
  assert.deepEqual(plain(await h.ctx.mpResolvePayment('台新',old)),{payment_method:'台新',credit_card_id:'1'});
  assert.deepEqual(plain(await h.ctx.mpResolvePayment('銀行轉帳／現金',old)),{payment_method:'銀行轉帳／現金',credit_card_id:null});
  assert.equal((await h.ctx.mpResolvePayment('台新',{payment_method:'台新'})).credit_card_id,'1');
});
test('選單重繪保留選中的卡片 ID，卡名作為顯示文字',()=>{
  const h=harness(),a=card(),b=card('2','富邦','J卡');
  const select=h.field('epm','card:2');
  h.ctx.mpFillCardOptions(select,[a,b]);
  assert.equal(select.value,'card:2');
  assert.equal(select.options.find(x=>x.value==='card:2').textContent,'富邦 · J卡');
});
test('信用卡新增→帳單→繳款→修改／刪除繳款，支出不增加第二次',async()=>{
  const h=harness();h.db.credit_cards=[card()];h.load('src/runtime/cards.js');
  h.field('mpcc-date','2026-09-17');h.field('mpcc-card','card:1');h.field('mpcc-cat','餐飲');h.field('mpcc-amt','300');
  await h.ctx.mpAddCardSpend();
  assert.equal(h.alerts.length,0);assert.equal(h.db.finance_entries.length,1);
  assert.equal(h.db.finance_entries[0].credit_card_id,'1');
  assert.match(h.app.innerHTML,/mpRecordCardPayment\('1','2026-09-17',300\)/);
  h.prompts.push('300');await h.ctx.mpRecordCardPayment('1','2026-09-17',300);
  assert.equal(h.db.credit_card_payments[0].credit_card_id,'1');
  assert.equal(h.db.finance_entries.length,1);
  assert.doesNotMatch(h.app.innerHTML,/mpRecordCardPayment\('1'/);
  h.prompts.push('200','2026-09-18','部分繳款');await h.ctx.mpEditCardPayment('1');
  assert.match(h.app.innerHTML,/mpRecordCardPayment\('1','2026-09-17',100\)/);
  await h.ctx.mpDeleteCardPayment('1');
  assert.match(h.app.innerHTML,/mpRecordCardPayment\('1','2026-09-17',300\)/);
  assert.equal(h.db.finance_entries.length,1);
});
test('繳款日當天不標逾期；隔天才標示',async()=>{
  for(const [time,late] of [['2026-10-02T15:00:00Z',false],['2026-10-02T16:00:00Z',true]]){
    const h=harness(time);h.db.credit_cards=[card()];
    h.db.finance_entries=[{user_id:'test-user',entry_type:'expense',entry_date:'2026-09-17',month:'2026-09-01',amount:300,payment_method:'台新'}];
    h.load('src/runtime/cards.js');await h.ctx.mpCreditCards();
    assert.equal(h.app.innerHTML.includes('逾期待繳'),late);
  }
});
test('讀不到繳款資料時顯示錯誤，避免顯示未扣款的錯誤帳單',async()=>{
  const h=harness();h.db.credit_cards=[card()];h.load('src/runtime/cards.js');h.fail('credit_card_payments');
  await h.ctx.mpCreditCards();assert.match(h.app.innerHTML,/信用卡資料載入失敗/);
});
test('卡片刪除保護涵蓋 ID／舊卡名；無歷史卡片可刪除',async()=>{
  for(const entry of [{credit_card_id:'1',payment_method:'舊名稱'},{payment_method:'玫瑰卡'}]){
    const h=harness();h.db.credit_cards=[card()];h.db.finance_entries=[{id:'old',user_id:'test-user',...entry}];
    h.load('src/runtime/cards.js');await h.ctx.mpDeleteCard('1','台新');
    assert.equal(h.db.credit_cards.length,1);assert.match(h.alerts[0],/停用/);
  }
  const h=harness();h.db.credit_cards=[card()];h.load('src/runtime/cards.js');await h.ctx.mpDeleteCard('1','台新');
  assert.equal(h.db.credit_cards.length,0);
});
test('快速記帳保存卡片 ID；共享查詢只共享進行中請求',async()=>{
  const h=harness();h.db.credit_cards=[card()];h.load('src/runtime/runtime.js');
  h.field('mp31-date','2026-09-17');h.field('mp31-amt','400');h.field('mp31-pay','card:1');
  await h.ctx.q('finance_entries');await h.ctx.mp31Save();
  const rows=await h.ctx.q('finance_entries');assert.equal(rows.length,1);assert.equal(rows[0].credit_card_id,'1');
  h.ctx.u={id:'another-user'};
  let calls=0; // A separate harness verifies the account contributes to the query key.
  const h2=harness();h2.ctx.q=async()=>{calls++;return []};h2.load('src/runtime/runtime.js');
  const a=h2.ctx.q('credit_cards'),b=h2.ctx.q('credit_cards');await Promise.all([a,b]);assert.equal(calls,1);
  const c=h2.ctx.q('credit_cards');h2.ctx.u={id:'another-user'};await Promise.all([c,h2.ctx.q('credit_cards')]);assert.equal(calls,3);
});
test('月明細編輯跨月重算兩月，保留卡片；刪除後重算原月',async()=>{
  const h=harness();h.db.credit_cards=[card()];h.loadFinance();
  h.field('ed','2026-08-17');h.field('et','expense');h.field('ec','餐飲');h.field('ea','100');h.field('epm','card:1');
  await h.ctx.addFinanceEntry();assert.equal(h.db.finance_entries[0].credit_card_id,'1');
  h.snapshots.length=0;h.prompts.push('2026-09-17','250','調整','餐飲','台新');
  await h.ctx.editFinanceEntry('1');
  assert.deepEqual(h.snapshots,['2026-08','2026-09']);assert.equal(h.db.finance_entries[0].credit_card_id,'1');
  h.snapshots.length=0;await h.ctx.deleteFinanceEntry('1');
  assert.equal(h.db.finance_entries.length,0);assert.deepEqual(h.snapshots,['2026-09']);
});
test('卡片設定新增、編輯額度、停用，保留信用卡資料',async()=>{
  const h=harness();h.load('src/runtime/cards.js');
  for(const [id,val] of Object.entries({'mpc-issuer':'國泰','mpc-name':'CUBE','mpc-limit':'50000','mpc-statement':'24','mpc-due':'9','mpc-status':'active'}))h.field(id,val);
  await h.ctx.mpSaveCardSettings(null);assert.equal(h.db.credit_cards.length,1);
  h.field('mpc-limit','60000');h.field('mpc-status','inactive');await h.ctx.mpSaveCardSettings('1');
  assert.equal(h.db.credit_cards[0].credit_limit,60000);assert.equal(h.db.credit_cards[0].status,'inactive');
  h.field('mpc-statement','17.5');await h.ctx.mpSaveCardSettings('1');
  assert.equal(h.db.credit_cards[0].statement_day,24);assert.match(h.alerts.at(-1),/整數/);
});
test('卡片改名不能讓舊名稱消費斷鏈',async()=>{
  const h=harness();h.db.credit_cards=[card()];h.db.finance_entries=[{user_id:'test-user',payment_method:'玫瑰卡',credit_card_id:null}];
  h.load('src/runtime/cards.js');
  for(const [id,val] of Object.entries({'mpc-issuer':'台新','mpc-name':'新卡名','mpc-limit':'50000','mpc-statement':'17','mpc-due':'2','mpc-status':'active'}))h.field(id,val);
  await h.ctx.mpSaveCardSettings('1');
  assert.match(h.alerts.at(-1),/暫時不能改名/);assert.equal(h.db.credit_cards[0].card_name,'玫瑰卡');
  h.db.finance_entries[0].credit_card_id='1';await h.ctx.mpSaveCardSettings('1');
  assert.equal(h.db.credit_cards[0].card_name,'新卡名');
});
test('信用卡預覽使用同一結帳算法與卡片 ID；保留未來支出阻擋',async()=>{
  const h=harness();h.db.credit_cards=[card()];h.load('src/runtime/cards.js');h.load('src/runtime/runtime.js');h.load('src/runtime/card-guard.js');
  h.field('mpcc-date','2026-09-17');h.field('mpcc-card','card:1');const preview=h.field('mpcc-cycle-preview','');
  h.events.get('change')[0]({target:{id:'mpcc-date'}});
  for(let i=0;i<10;i++)await Promise.resolve();
  assert.match(preview.innerHTML,/9\/17 結帳 → 10\/2 繳款/);
  h.field('mpcc-date','2026-09-19');h.field('mpcc-amt','300');await h.ctx.mpAddCardSpend();
  assert.equal(h.db.finance_entries.length,0);assert.match(h.alerts.at(-1),/未來日期/);
});
test('投資 guard 仍轉交成交表單與交易 CRUD，不寫入一般支出路徑',async()=>{
  const h=harness();h.loadFinance();h.load('src/runtime/investment-guard.js');
  const routed=[];h.ctx.openInvestmentBuy=opts=>routed.push(['buy',opts]);
  h.field('et','investment');h.field('ed','2026-09-18');h.field('ea','1000');
  await h.ctx.addFinanceEntry();assert.equal(routed[0][0],'buy');assert.equal(h.writes.length,0);
  h.db.finance_entries=[{id:'f1',user_id:'test-user',entry_type:'investment'}];
  h.db.investment_transactions=[{id:'t1',user_id:'test-user',finance_entry_id:'f1'}];
  h.ctx.mpInvEditTrade=id=>routed.push(['edit',id]);h.ctx.mpInvDeleteTrade=id=>routed.push(['delete',id]);
  await h.ctx.editFinanceEntry('f1');await h.ctx.deleteFinanceEntry('f1');
  assert.deepEqual(routed.slice(1),[['edit','t1'],['delete','t1']]);assert.equal(h.writes.length,0);
});
