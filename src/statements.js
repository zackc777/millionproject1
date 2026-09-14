/* Bill-first UI. No inferred writes and no second finance entry for a statement. */
(function(root){
  'use strict';
  const M=root.MPCardModel,S=root.MPStatementModel;
  let editing=null,busy=false;
  const $=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'NT$'+Number(n||0).toLocaleString('zh-TW',{maximumFractionDigits:2});
  const value=id=>$('mpst-'+id)?.value||'';
  async function all(){return Promise.all([readMoneyTable('credit_card_statements','cycle_end'),readMoneyTable('credit_cards','created_at'),readMoneyTable('finance_entries','entry_date'),readMoneyTable('credit_card_payments','payment_date')]);}
  async function changed(){root.mpInvalidateQueries?.();if(typeof render==='function')await render();}
  root.mpCloseStatement=()=>{if(busy)return;$('mp-statement-modal')?.remove();editing=null;};
  root.mpNewStatement=async(cardId)=>{
    try{
      const [statements,cards,entries,payments]=await all();const card=cards.find(c=>String(c.id)===String(cardId));if(!card)throw new Error('卡片不存在');
      const end=S.latest(card);const existing=statements.find(s=>String(s.credit_card_id)===String(card.id)&&s.cycle_end===end);
      if(existing)return root.mpEditStatement(existing.id);
      const previous=M.shiftMonth(end,-1,card.statement_day),start=new Date(Date.parse(previous+'T00:00:00Z')+86400000).toISOString().slice(0,10);
      await open({credit_card_id:card.id,cycle_start:start,cycle_end:end,due_date:M.shiftMonth(end,1,card.due_day),total:'',carryover:0,categories:{}},cards,entries,statements,payments);
    }catch(e){alert('無法開啟帳單：'+e.message);}
  };
  root.mpEditStatement=async id=>{
    try{const [statements,cards,entries,payments]=await all();const row=statements.find(s=>String(s.id)===String(id));if(!row)throw new Error('帳單已不存在');await open(row,cards,entries,statements,payments);}catch(e){alert('無法開啟帳單：'+e.message);}
  };
  async function open(row,cards,entries,statements,payments){
    if(busy)return;root.mpCloseStatement();editing={...row,sessionUser:u.id};
    const el=document.createElement('div');el.id='mp-statement-modal';el.className='modal-backdrop';
    el.innerHTML=`<div class="modal mp-statement-dialog" role="dialog" aria-modal="true" aria-labelledby="mpst-title"><div class="modal-head"><h3 id="mpst-title">${row.id?'編輯':'登錄'}帳單</h3><button class="btn ghost" onclick="mpCloseStatement()">關閉</button></div>
      <p>收到帳單記一次，實際扣款再確認繳款。</p>
      <div class="mp-statement-fields"><div class="field"><label for="mpst-card">信用卡</label><select id="mpst-card" ${row.id?'disabled':''} onchange="mpStatementDateChanged(true)">${cards.map(c=>`<option value="${escape(c.id)}" ${String(c.id)===String(row.credit_card_id)?'selected':''}>${escape(c.issuer+' · '+c.card_name)}</option>`).join('')}</select></div>
      <div class="field"><label for="mpst-cycle">帳單结帳日／期別</label><input id="mpst-cycle" type="date" max="${M.today()}" value="${row.cycle_end}" ${row.id?'disabled':''} onchange="mpStatementDateChanged(false)"></div>
      <div class="field"><label for="mpst-total">本期應繳總額</label><input id="mpst-total" type="number" min="0" step="0.01" inputmode="decimal" value="${row.total}" oninput="mpStatementPreview()"></div>
      <div class="field"><label for="mpst-due">帳單實際繳款期限</label><input id="mpst-due" type="date" value="${row.due_date}"></div></div>
      <details ${Number(row.carryover)>0?'open':''}><summary>含上期未繳、退款、分期或費用</summary><div class="field"><label for="mpst-start">帳單涵蓋起日（依銀行帳單核對）</label><input id="mpst-start" type="date" value="${row.cycle_start||''}" ${row.id?'disabled':''} onchange="mpStatementPreview()"></div><div class="field"><label for="mpst-carry">總額中包含的上期未繳</label><input id="mpst-carry" type="number" min="0" step="0.01" value="${row.carryover||0}" oninput="mpStatementPreview()"></div><p class="tiny">總額填銀行本期應繳金額，已包含本期分期、費用及扣除退款；不再加一次。上期未繳會排除於新增消費，繳款優先結清其中的舊欠款。未來分期尚未出帳，不在此當作本期費用。</p></details>
      <details><summary>簡單分類（選填，不用逐筆輸入）</summary><div class="mp-statement-fields">${Object.entries(S.categories).filter(([k])=>k!=='other').map(([k,label])=>`<div class="field"><label for="mpst-cat-${k}">${label}</label><input id="mpst-cat-${k}" type="number" min="0" step="0.01" value="${Number(row.categories?.[k])||0}" oninput="mpStatementPreview()"></div>`).join('')}</div><p class="tiny">只分本期新增消費。剩餘自動列未分類；未分類不推測花費用途。</p></details>
      <label><input id="mpst-once" type="checkbox" ${row.one_off?'checked':''}> 本期含一次性大額消費，不作為一般帳單預估樣本</label>
      <div class="field"><label for="mpst-note">備註（選填）</label><input id="mpst-note" value="${escape(row.note)}" placeholder="例如：旅遊、分期第 2/6 期、退款"></div>
      <div id="mpst-preview" class="status-note" role="status"></div>
      <label><input id="mpst-confirm" type="checkbox"> 已核對：本期以帳單為準，既有逐筆紀錄保留但不重複計算</label>
      <div class="actions"><button id="mpst-save" class="btn main" onclick="mpSaveStatement()">儲存帳單</button>${row.id?`<button class="btn danger-btn" onclick="mpDeleteStatement('${row.id}')">刪除帳單</button>`:''}<button class="btn ghost" onclick="mpCloseStatement()">取消</button></div><div id="mpst-error" role="alert"></div></div>`;
    document.body.appendChild(el);
    editing.cards=cards;editing.entries=entries;editing.statements=statements;editing.payments=payments;await root.mpStatementPreview();
  }
  root.mpStatementDateChanged=async changeCard=>{
    const card=editing?.cards.find(c=>String(c.id)===value('card'));if(!card)return;
    if(changeCard)$('mpst-cycle').value=S.latest(card);
    try{$('mpst-due').value=M.shiftMonth(value('cycle'),1,card.due_day);$('mpst-start').value=new Date(Date.parse(M.shiftMonth(value('cycle'),-1,card.statement_day)+'T00:00:00Z')+86400000).toISOString().slice(0,10);await root.mpStatementPreview();}catch(e){$('mpst-error').textContent=e.message;}
  };
  root.mpStatementPreview=async()=>{
    if(!editing||!$('mpst-preview'))return;
    const cycle=value('cycle'),id=value('card');let existing=0;
    try{const card=editing.cards.find(c=>String(c.id)===id);existing=editing.entries?.filter(e=>e.entry_type==='expense'&&card&&M.matchesRecord(e,card,editing.cards)&&e.entry_date>=value('start')&&e.entry_date<=cycle).reduce((n,e)=>n+Number(e.amount),0)||0;}catch(_){}
    const net=Number(value('total'))-Number(value('carry'));
    const allocated=Object.keys(S.categories).filter(k=>k!=='other').reduce((n,k)=>n+Number(value('cat-'+k)),0);
    const prior=MPFinanceModel.ledger({month:M.today().slice(0,7),entries:editing.entries||[],cards:editing.cards,statements:editing.statements||[],payments:editing.payments||[]}).bills.filter(b=>String(b.cardId)===id&&b.cycleEnd<cycle).reduce((n,b)=>n+b.outstanding,0);
    $('mpst-preview').textContent=`本期新增消費 ${money(net)}；其中未分類 ${money(net-allocated)}。同一期原有逐筆合計 ${money(existing)}，與本期新增差額 ${money(net-existing)}。儲存後以帳單統計，不會相加，也不會立即扣現金。${prior>0?' 目前較早期仍有 '+money(prior)+' 未清，請展開特殊項目，核對本次總額是否包含上期未繳。':''}`;
  };
  root.mpSaveStatement=async()=>{
    if(busy||!editing)return;busy=true;const original=editing;const button=$('mpst-save');if(button)button.disabled=true;
    try{
      if(!u?.id||u.id!==original.sessionUser)throw new Error('登入狀態已變更，請重新開啟帳單');
      if(!$('mpst-confirm')?.checked)throw new Error('請先核對帳單與逐筆紀錄');
      if(value('total')==='')throw new Error('請填應繳總額，零元帳單請填 0');
      const row=S.validate({user_id:u.id,credit_card_id:original.id?original.credit_card_id:value('card'),cycle_end:original.id?original.cycle_end:value('cycle'),due_date:value('due'),total:Number(value('total')),carryover:Number(value('carry')),categories:Object.fromEntries(Object.keys(S.categories).filter(k=>k!=='other').map(k=>[k,Number(value('cat-'+k))])),one_off:!!$('mpst-once')?.checked,note:value('note')});
      row.cycle_start=original.id?original.cycle_start:value('start');M.parts(row.cycle_start);S.validate(row);
      const result=original.id?await c.from('credit_card_statements').update(row).eq('user_id',u.id).eq('id',original.id).eq('revision',original.revision).select('id'):await c.from('credit_card_statements').insert(row).select('id');
      if(result.error)throw new Error(result.error.code==='23505'?'這張卡此期已有帳單，請開啟歷史帳單編輯':result.error.message);
      if(!result.data?.length)throw new Error('帳單已由其他裝置更新，請重新開啟後核對');
      busy=false;root.mpCloseStatement();await changed();
    }catch(e){if($('mpst-error'))$('mpst-error').textContent='儲存失敗：'+e.message;else alert(e.message);}finally{busy=false;if(button)button.disabled=false;}
  };
  root.mpDeleteStatement=async id=>{
    if(busy)return;
    try{
      const [statements,cards,,payments]=await all(),s=statements.find(x=>String(x.id)===String(id));if(!s)throw new Error('帳單已不存在');
      const card=cards.find(x=>String(x.id)===String(s.credit_card_id));
      if(payments.some(p=>M.couldMatchRecord(p,card,cards,'issuer')&&p.cycle_end>=s.cycle_end)||statements.some(x=>String(x.credit_card_id)===String(s.credit_card_id)&&x.cycle_end>s.cycle_end&&Number(x.carryover)>0))throw new Error('此期或後續已有繳款／欠款銜接，請先核對並處理關聯紀錄');
      if(!confirm('刪除帳單後，此期恢復使用原有逐筆紀錄計算。確定刪除？'))return;
      busy=true;const r=await c.from('credit_card_statements').delete().eq('user_id',u.id).eq('id',id).eq('revision',s.revision).select('id');
      if(r.error)throw r.error;if(!r.data?.length)throw new Error('帳單已更新，請重新整理');busy=false;root.mpCloseStatement();await changed();
    }catch(e){alert('刪除失敗：'+e.message);}finally{busy=false;}
  };
  root.mpStatementPay=async id=>{
    try{const [statements,cards,entries,payments]=await all(),s=statements.find(x=>String(x.id)===String(id));if(!s)throw new Error('帳單不存在');
      const st=MPFinanceModel.ledger({month:M.today().slice(0,7),cards,entries,payments,statements});
      const current=st.bills.find(b=>b.statementId===s.id),older=st.bills.filter(b=>String(b.cardId)===String(s.credit_card_id)&&b.cycleEnd<s.cycle_end).reduce((n,b)=>n+b.outstanding,0);
      await mpRecordCardPayment(s.credit_card_id,s.cycle_end,(current?.outstanding||0)+Math.min(Number(s.carryover),older));
    }catch(e){alert('無法開啟繳款：'+e.message);}
  };
  root.mpStatementPanel=st=>{
    const statements=st.statements||[];
    const reminders=st.cards.filter(c=>c.status!=='inactive').map(card=>{
      const end=S.latest(card),s=statements.find(x=>String(x.credit_card_id)===String(card.id)&&x.cycle_end===end);
      return `<div class="mp-statement-task"><div><b>${escape(card.issuer+' · '+card.card_name)}</b><div class="tiny">${end} 結帳 · ${s?escape(s.due_date):M.shiftMonth(end,1,card.due_day)} 繳款</div></div><button class="btn ${s?'ghost':'main'}" onclick="mpNewStatement('${card.id}')">${s?'查看本期帳單':'登錄帳單'}</button></div>`;
    }).join('');
    const history=[...statements].sort((a,b)=>b.cycle_end.localeCompare(a.cycle_end)).map(s=>{
      const b=st.bills.find(b=>b.statementId===s.id),card=st.cards.find(c=>String(c.id)===String(s.credit_card_id));
      const old=st.bills.filter(b=>String(b.cardId)===String(s.credit_card_id)&&b.cycleEnd<s.cycle_end).reduce((n,b)=>n+b.outstanding,0),out=(b?.outstanding||0)+Math.min(Number(s.carryover),old);
      const status=out===0?'已結清':s.due_date<st.asOf?'已到期，待確認繳款':(s.due_date<=M.shiftMonth(st.asOf,0)?'今日繳款':`待繳 ${s.due_date}`);
      const past=statements.filter(x=>String(x.credit_card_id)===String(s.credit_card_id)&&x.cycle_end<s.cycle_end&&!x.one_off).sort((a,b)=>b.cycle_end.localeCompare(a.cycle_end)).slice(0,3).map(x=>Number(x.total)-Number(x.carryover)).sort((a,b)=>a-b);
      const trend=past.length===3?`較前三期一般帳單中位數 ${money(Number(s.total)-Number(s.carryover)-past[1])}`:'一般帳單未滿三期，暫不判斷趨勢';
      return `<article class="mp-payment-item"><div class="split"><b>${escape(card?.issuer||'信用卡')} · ${s.cycle_end} 帳單</b><b>${money(s.total)}</b></div><p class="tiny">${escape(status)} · 本期新增 ${money(Number(s.total)-Number(s.carryover))} · 含上期未繳 ${money(s.carryover)}</p><p class="tiny">${escape(trend)}${s.one_off?' · 一次性消費，不納入一般預估':''}</p><div class="actions"><button class="btn ghost" onclick="mpEditStatement('${s.id}')">編輯／查看</button>${out>0?`<button class="btn main" onclick="mpStatementPay('${s.id}')">確認已繳／部分繳款</button>`:''}<button class="btn danger-btn" onclick="mpDeleteStatement('${s.id}')">刪除</button></div></article>`;
    }).join('');
    return `<section class="card" style="margin-top:14px"><div class="section-kicker">MONTHLY STATEMENTS</div><h3>收到帳單記一次</h3><p class="tiny">依結帳月份認列消費；繳款依實際扣款日。自動扣繳也需要確認，系統不會假設銀行已扣款。</p>${reminders||'<p>先新增信用卡即可登錄帳單。</p>'}<p class="tiny">${st.statementReserve?.rows.length?`未出帳預留估計 ${money(st.statementReserve.total)}。與生活預算取較高者，尚未確認用途，並非銀行即時餘額。`: '第一份帳單登錄後啟用預留估計；可在卡片設定填寫每期刷卡預留。'}</p>${st.statementReserve?.uncertain?'<p class="status-note">部分卡片缺最近一期帳單或刷卡預留。請補帳單／設定預留；在資料完整前不建議追加投資。</p>':''}<details><summary>歷史帳單（${statements.length}）</summary><div class="mp-payment-list">${history||'尚未登錄'}</div></details></section>`;
  };
  if(typeof document!=='undefined'){
    const style=document.createElement('style');style.textContent='.mp-statement-dialog{max-height:90dvh;overflow:auto;max-width:680px}.mp-statement-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mp-statement-fields input,.mp-statement-fields select{width:100%;min-width:0;box-sizing:border-box}.mp-statement-dialog details{margin:16px 0}.mp-statement-dialog summary{cursor:pointer;font-weight:700;padding:10px 0}.mp-statement-task{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #e2e8f0}.mp-statement-dialog #mpst-error{color:#b91c1c;margin-top:10px}@media(max-width:520px){.mp-statement-fields{grid-template-columns:1fr}.mp-statement-dialog{width:100%;max-height:85dvh;box-sizing:border-box}.mp-statement-task{align-items:flex-start;flex-wrap:wrap}.mp-statement-dialog .actions{display:flex;flex-wrap:wrap}}';document.head.appendChild(style);
  }
})(window);
