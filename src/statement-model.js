(function(root){
  'use strict';
  const M=root.MPCardModel;
  const cents=n=>Math.round((Number(n)||0)*100);
  const cash=n=>n/100;
  const key=(card,cycle)=>String(card)+'|'+cycle;
  const categories={rent:'房租／住宿',family:'父母／家庭',telecom:'電信／網路',gym:'健身／健康',daily:'餐飲／交通／日常',leisure:'娛樂／治裝彈性',other:'帳單未分類'};
  function latest(card,today=M.today()){
    const end=M.cycleEnd(today,card.statement_day);
    return end<=today?end:M.shiftMonth(end,-1,card.statement_day);
  }
  function cycle(row,cards){
    const card=cards.find(c=>M.matchesRecord(row,c,cards));
    return card?key(card.id,M.cycleEnd(String(row.entry_date||row.month).slice(0,10),card.statement_day)):null;
  }
  function validate(row){
    M.parts(row.cycle_end);M.parts(row.due_date);
    if(row.cycle_start){M.parts(row.cycle_start);if(row.cycle_start>row.cycle_end)throw new Error('帳單起日不能晚於結帳日');}
    if(row.cycle_end>M.today())throw new Error('尚未結帳，請等帳單公布後登錄');
    if(row.due_date<row.cycle_end)throw new Error('繳款日不能早於結帳日');
    for(const k of ['total','carryover'])if(!Number.isFinite(Number(row[k]))||Number(row[k])<0)throw new Error('帳單金額及上期未繳須為非負數');
    if(cents(row.carryover)>cents(row.total))throw new Error('上期未繳不能超過帳單總額；跨期退款請先核對原期帳單');
    const split=row.categories||{};
    if(Object.keys(split).some(k=>!categories[k]||!Number.isFinite(Number(split[k]))||Number(split[k])<0))throw new Error('分類金額不正確');
    if(Object.values(split).reduce((n,x)=>n+cents(x),0)>cents(row.total)-cents(row.carryover))throw new Error('分類合計不能超過本期新增消費');
    return row;
  }
  // Statements replace cycle totals in the derived ledger only. Original purchases
  // remain intact, including their dates, and reappear if a statement is removed.
  function reconcile(entries,statements,cards,asOf){
    const known=statements.filter(s=>s.cycle_end<=asOf);
    const byCycle=new Map(known.map(s=>[key(s.credit_card_id,s.cycle_end),s]));
    const retained=entries.filter(e=>e.entry_type!=='expense'||!known.some(s=>{
      const card=cards.find(c=>String(c.id)===String(s.credit_card_id));
      const date=String(e.entry_date||e.month).slice(0,10);
      return card&&M.matchesRecord(e,card,cards)&&(s.cycle_start?date>=s.cycle_start&&date<=s.cycle_end:byCycle.get(cycle(e,cards))===s);
    }));
    const synthetic=known.flatMap(s=>{
      const card=cards.find(c=>String(c.id)===String(s.credit_card_id));
      const split={...(s.categories||{})};
      const allocated=Object.values(split).reduce((n,x)=>n+cents(x),0);
      split.other=cash(cents(split.other)+cents(s.total)-cents(s.carryover)-allocated);
      return Object.entries(split).filter(([,n])=>cents(n)!==0).map(([cat,n])=>({
        id:'statement:'+s.id+':'+cat,statement_id:s.id,user_id:s.user_id,entry_date:s.cycle_end,month:s.cycle_end.slice(0,7)+'-01',
        entry_type:'expense',category:categories[cat]||categories.other,amount:Number(n),credit_card_id:s.credit_card_id,
        payment_method:card?.issuer||'信用卡',statement_cycle:s.cycle_end,one_off:!!s.one_off,
        note:'帳單認列（非逐筆消費日期）'+(s.note?' · '+s.note:'')
      }));
    });
    return [...retained,...synthetic];
  }
  // Process statement and payment events chronologically. Carried debt remains
  // attached to older cycles and is not recognized as consumption a second time.
  function balances(entries,payments,cards,statements,asOf){
    const bills=new Map();let unresolved=0;
    const get=(id,cycle,issuer)=>{
      const k=key(id,cycle),card=cards.find(c=>String(c.id)===String(id));
      if(!bills.has(k))bills.set(k,{cardId:id,issuer:card?.issuer||issuer,cycleEnd:cycle,dueDate:card?M.shiftMonth(cycle,1,card.due_day):null,spent:0,paid:0,opening:0,carryover:0});
      return bills.get(k);
    };
    const events=[];
    for(const e of entries.filter(e=>e.entry_type==='expense'&&String(e.entry_date||e.month).slice(0,10)<=asOf)){
      const card=cards.find(c=>M.matchesRecord(e,c,cards));
      if(!card){if(root.MPFinanceModel.isCard(e,cards))unresolved++;continue;}
      events.push({date:String(e.entry_date||e.month).slice(0,10),order:0,run:()=>{get(card.id,e.statement_cycle||M.cycleEnd(String(e.entry_date||e.month).slice(0,10),card.statement_day),card.issuer).spent+=cents(e.amount);}});
    }
    for(const s of statements.filter(s=>s.cycle_end<=asOf))events.push({date:s.cycle_end,order:1,run:()=>{
      const b=get(s.credit_card_id,s.cycle_end);Object.assign(b,{statementId:s.id,dueDate:s.due_date,carryover:cents(s.carryover),total:cents(s.total)});
      const older=[...bills.values()].filter(x=>String(x.cardId)===String(b.cardId)&&x.cycleEnd<b.cycleEnd);
      const oldDebt=older.reduce((n,x)=>n+Math.max(0,x.spent+x.opening-x.paid),0);
      b.opening=Math.max(0,b.carryover-oldDebt);
    }});
    for(const p of payments.filter(p=>p.payment_date<=asOf))events.push({date:p.payment_date,order:2,run:()=>{
      const card=cards.find(c=>M.matchesRecord(p,c,cards,'issuer'));
      if(!card){unresolved++;return;}
      const b=get(card.id,p.cycle_end,card.issuer);let remaining=cents(p.amount);
      if(b.statementId&&b.carryover){
        let carryLimit=b.carryover;
        for(const old of [...bills.values()].filter(x=>String(x.cardId)===String(b.cardId)&&x.cycleEnd<b.cycleEnd).sort((a,b)=>a.cycleEnd.localeCompare(b.cycleEnd))){
          const used=Math.min(remaining,carryLimit,Math.max(0,old.spent+old.opening-old.paid));old.paid+=used;remaining-=used;carryLimit-=used;
        }
      }
      b.paid+=remaining;
    }});
    events.sort((a,b)=>a.date.localeCompare(b.date)||a.order-b.order).forEach(e=>e.run());
    const rows=[...bills.values()].map(b=>({...b,spent:cash(b.spent+b.opening),paid:cash(b.paid),opening:cash(b.opening),carryover:cash(b.carryover),total:cash(b.total),outstanding:cash(Math.max(0,b.spent+b.opening-b.paid)),unmatched:cash(Math.max(0,b.paid-b.spent-b.opening)),closed:b.cycleEnd<=asOf,overdue:!!b.dueDate&&b.dueDate<asOf&&b.spent+b.opening>b.paid}));
    return {bills:rows,cardDebt:rows.reduce((n,b)=>n+b.outstanding,0),unmatchedPayments:rows.reduce((n,b)=>n+b.unmatched,0),unresolved};
  }
  function reserve(st){
    const rows=st.cards.filter(c=>c.status!=='inactive'&&(st.statements||[]).some(s=>String(s.credit_card_id)===String(c.id))).map(card=>{
      const history=(st.statements||[]).filter(s=>String(s.credit_card_id)===String(card.id)&&!s.one_off&&s.cycle_end<=st.asOf).sort((a,b)=>b.cycle_end.localeCompare(a.cycle_end)).slice(0,3);
      const amounts=history.map(s=>Math.max(0,Number(s.total)-Number(s.carryover))).sort((a,b)=>a-b);
      const estimate=Number(card.monthly_spend_cap)>0?Number(card.monthly_spend_cap):amounts.length>=3?amounts[1]:0;
      const next=M.cycleEnd(st.asOf,card.statement_day),end=next<=st.asOf?M.shiftMonth(next,1,card.statement_day):next;
      const observed=st.bills.filter(b=>String(b.cardId)===String(card.id)&&b.cycleEnd===end).reduce((n,b)=>n+b.spent,0);
      const latestEnd=latest(card,st.asOf),missing=!(st.statements||[]).some(s=>String(s.credit_card_id)===String(card.id)&&s.cycle_end===latestEnd);
      return {cardId:card.id,issuer:card.issuer,cycleEnd:end,estimate,remaining:Math.max(0,estimate-observed),unknown:estimate===0,missing,latestEnd,source:Number(card.monthly_spend_cap)>0?'自訂刷卡預留':'最近三期一般帳單中位數'};
    });
    return {rows,total:rows.reduce((n,x)=>n+x.remaining,0),uncertain:rows.some(x=>x.unknown||x.missing)};
  }
  root.MPStatementModel=Object.freeze({latest,cycle,validate,reconcile,balances,reserve,categories});
})(typeof window!=='undefined'?window:globalThis);
