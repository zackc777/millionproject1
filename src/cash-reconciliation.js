/* Day-end cash observations; no inferred expense writes. */
(function(root){
  'use strict';
  let editing=null,busy=false,opening=false;
  const M=root.MPCardModel,$=id=>document.getElementById(id);
  const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>'NT$'+Number(n||0).toLocaleString('zh-TW',{maximumFractionDigits:2});
  const yesterday=()=>new Date(Date.parse(M.today()+'T00:00:00Z')-86400000).toISOString().slice(0,10);
  const input=k=>$('mpcash-'+k)?.value??'';
  function values(){
    const row={balance_date:input('date'),note:input('note').trim()};M.parts(row.balance_date);
    if(row.balance_date>=M.today())throw new Error('請填昨天或更早日期的日終餘額');
    for(const key of ['bank_total','wallet_total','emergency','other_saving']){
      if(input(key).trim()==='')throw new Error('請填完整餘額，沒有請填 0');
      row[key]=Number(input(key));
      if(!Number.isFinite(row[key])||row[key]<0||row[key]>=1e12||Math.abs(row[key]*100-Math.round(row[key]*100))>1e-5)throw new Error('金額需為非負數，最多兩位小數');
    }
    if(row.emergency+row.other_saving>row.bank_total+row.wallet_total)throw new Error('預備金與專用存款是總餘額的一部分，不能超過總餘額');
    if(row.note.length>1000)throw new Error('備註最多 1000 字');
    return row;
  }
  function expected(row,st){return root.MPFinanceModel.ledger({month:row.balance_date.slice(0,7),today:row.balance_date,entries:st.rawEntries,payments:st.allPayments,cards:st.cards,statements:st.statements,reconciliations:st.reconciliations.filter(x=>x.balance_date<row.balance_date)});}
  root.mpCloseCash=()=>{if(busy)return;$('mp-cash-modal')?.remove();editing=null;};
  root.mpOpenCash=async id=>{
    if(busy||opening)return;opening=true;
    try{
      const userId=u?.id;if(!userId)throw new Error('請先登入');
      const st=await moneyEngine(M.today().slice(0,7));
      if(u?.id!==userId)throw new Error('登入狀態已變更');
      const row=id?st.reconciliations.find(x=>String(x.id)===String(id)):null;
      if(id&&!row)throw new Error('紀錄已不存在，請重新整理');
      root.mpCloseCash();editing={row,userId,st};
      const el=document.createElement('div');el.id='mp-cash-modal';el.className='modal-backdrop';
      const fields=[['bank_total','所有銀行存款合計',''],['wallet_total','手上現金',''],['emergency','總額中保留為緊急預備金',st.emergency],['other_saving','總額中保留為其他專用存款',st.otherSaving]];
      el.innerHTML=`<div class="modal mp-cash-dialog" role="dialog" aria-modal="true" aria-labelledby="mpcash-title"><div class="modal-head"><h3 id="mpcash-title">${row?'編輯':'核對'}實際現金</h3><button class="btn ghost" onclick="mpCloseCash()">關閉</button></div>
      <p>每月底核對一次；不必補完所有小額消費。請使用同一天結束時的銀行餘額及手上現金，不含股票市值與信用卡可刷額度。</p>
      <div class="field"><label for="mpcash-date">餘額日期（日終）</label><input id="mpcash-date" type="date" value="${e(row?.balance_date||yesterday())}" max="${yesterday()}" ${row?'disabled':''} onchange="mpPreviewCash()"></div>
      <p class="tiny">最晚填昨天，避免今天稍後的交易被漏算。月底對帳可於次月初填上月底餘額。</p>
      <div class="mp-cash-fields">${fields.map(([key,label,value])=>`<div class="field"><label for="mpcash-${key}">${label}</label><input id="mpcash-${key}" type="number" inputmode="decimal" min="0" step="0.01" value="${e(row?.[key]??value)}" oninput="mpPreviewCash()"></div>`).join('')}</div>
      <p class="tiny">銀行合計已包含預備金及專用存款，下方兩項只是劃分用途，不會再加一次。不同帳戶互轉也不算支出。</p>
      <div id="mpcash-preview" class="status-note" role="status"></div>
      <div class="field"><label for="mpcash-note">差額說明（選填）</label><input id="mpcash-note" maxlength="1000" value="${e(row?.note)}" placeholder="例如：漏記現金花費、期初存款未登錄"></div>
      <label><input id="mpcash-confirm" type="checkbox"> 我已核對日期、所有帳戶及現金；以此餘額校正資產</label>
      <p class="tiny">差額單獨保存，不算薪資或消費。待繳卡費仍會扣除於淨資產及可配置金額；預備金不列入日常可花金額。</p>
      <div class="actions"><button id="mpcash-save" class="btn main" onclick="mpSaveCash()">確認並校正餘額</button>${row?`<button class="btn danger-btn" onclick="mpDeleteCash()">刪除此筆對帳</button>`:''}<button class="btn ghost" onclick="mpCloseCash()">取消</button></div><p id="mpcash-error" role="alert"></p></div>`;
      document.body.appendChild(el);root.mpPreviewCash();
    }catch(err){alert('無法開啟現金對帳：'+err.message)}finally{opening=false}
  };
  root.mpPreviewCash=()=>{
    if(!editing)return;
    try{const row=values(),prior=expected(row,editing.st),total=row.bank_total+row.wallet_total,delta=total-prior.cashLike;
      $('mpcash-preview').textContent=`帳面現金＋存款 ${fmt(prior.cashLike)} → 實際 ${fmt(total)}；對帳差額 ${delta>=0?'+':''}${fmt(delta)}。其中未指定用途現金 ${fmt(total-row.emergency-row.other_saving)}，尚未扣待繳卡費與生活預留。補登此日以前的金流不會再次扣掉已核對餘額。`;
    }catch(err){$('mpcash-preview').textContent=err.message}
  };
  async function refresh(){root.mpInvalidateQueries?.();await render()}
  root.mpSaveCash=async()=>{
    if(busy||!editing)return;busy=true;const original=editing,button=$('mpcash-save');if(button)button.disabled=true;
    try{
      if(u?.id!==original.userId)throw new Error('登入狀態已變更，請重新開啟');
      const row=values();if(!$('mpcash-confirm')?.checked)throw new Error('請先勾選已核對餘額');
      const current=await moneyEngine(M.today().slice(0,7));
      if(u?.id!==original.userId)throw new Error('登入狀態已變更');
      row.expected_cash=expected(row,current).cashLike;row.user_id=original.userId;
      const r=original.row?await c.from('cash_reconciliations').update(row).eq('user_id',original.userId).eq('id',original.row.id).eq('revision',original.row.revision).select('id'):await c.from('cash_reconciliations').insert(row).select('id');
      if(r.error)throw new Error(r.error.code==='23505'?'此日已有對帳，請由歷史紀錄開啟編輯':r.error.message);
      if(!r.data?.length)throw new Error('紀錄已由其他裝置更新，請重新開啟');
      busy=false;root.mpCloseCash();await refresh();
    }catch(err){if($('mpcash-error'))$('mpcash-error').textContent='儲存失敗：'+err.message;else alert(err.message)}finally{busy=false;if(button)button.disabled=false}
  };
  root.mpDeleteCash=async()=>{
    if(busy||!editing?.row)return;
    if(!confirm('刪除後，將依前一次對帳與金流重新推算現金；較晚的對帳餘額仍保留。確定刪除？'))return;
    const original=editing;busy=true;
    try{
      if(u?.id!==original.userId)throw new Error('登入狀態已變更');
      const r=await c.from('cash_reconciliations').delete().eq('user_id',original.userId).eq('id',original.row.id).eq('revision',original.row.revision).select('id');
      if(r.error)throw r.error;if(!r.data?.length)throw new Error('紀錄已更新，請重新開啟');
      busy=false;root.mpCloseCash();await refresh();
    }catch(err){$('mpcash-error').textContent='刪除失敗：'+err.message}finally{busy=false}
  };
  root.mpCashReconciliationPanel=st=>`<div class="mp-cash-panel"><div class="split"><div><h3>月底現金對帳</h3><p class="tiny">${st.reconciliation?'最近對帳 '+e(st.reconciliation.balance_date)+'；其後餘額依已記錄金流推估。':'尚未核對實際餘額；漏記會讓帳面資產與配置失準。'}</p></div><button class="btn main" onclick="mpOpenCash()">核對實際餘額</button></div>
    <p class="tiny">可每月底核對，或在大筆付款後提早核對。消費分類仍以有記錄的資料為準。</p>
    <details><summary>對帳歷史（${st.reconciliations.length} 筆）</summary>${[...st.reconciliations].sort((a,b)=>b.balance_date.localeCompare(a.balance_date)).map(x=>`<div class="mp-cash-history"><div><b>${e(x.balance_date)}</b><div>現金＋存款 ${fmt(Number(x.bank_total)+Number(x.wallet_total))}</div><small>保存時差額 ${fmt(Number(x.bank_total)+Number(x.wallet_total)-Number(x.expected_cash))} · ${e(x.note||'未填原因')}</small></div><button class="btn ghost" onclick="mpOpenCash('${e(x.id)}')">編輯／刪除</button></div>`).join('')||'<p>尚無對帳紀錄</p>'}</details></div>`;
  const style=document.createElement('style');style.textContent='.mp-cash-dialog{width:min(620px,100%);max-height:88dvh;overflow:auto}.mp-cash-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mp-cash-fields input{min-width:0;width:100%;font-size:16px}.mp-cash-panel{margin-top:16px;padding:16px;border:1px solid #dbeafe;border-radius:16px;background:#f8fafc}.mp-cash-history{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #e2e8f0}.mp-cash-history small{overflow-wrap:anywhere}.mp-cash-dialog input[type=checkbox]{width:auto}@media(max-width:600px){.mp-cash-fields{grid-template-columns:1fr}.mp-cash-dialog{padding:16px}.mp-cash-panel>.split{align-items:stretch;flex-direction:column}.mp-cash-history{flex-direction:column}}';document.head.appendChild(style);
})(window);
