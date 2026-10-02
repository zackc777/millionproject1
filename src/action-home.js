/* Task-first navigation: all actions open existing forms; none infer financial writes. */
(function(root){
  'use strict';
  let actions=[],owner=null,returnFocus=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>'NT$'+Number(n||0).toLocaleString('zh-TW',{maximumFractionDigits:0});
  const byId=id=>document.getElementById(id);
  const add=(label,hint,keywords,run)=>{actions.push({label,hint,keywords,run});return actions.length-1};
  function button(id,label,kind='ghost'){return `<button class="btn ${kind}" onclick="mpHomeAction(${id})">${esc(label||actions[id].label)}</button>`}
  root.mpFinanceJump=async id=>{
    financeMonthCursor=MPCardModel.today().slice(0,7);
    if(tab==='m')await monthly();else if(!await mp31Go('m'))return;
    const el=byId(id);if(!el)return;
    el.open=true;el.scrollIntoView({behavior:'auto',block:'start'});
    el.querySelector('input:not([type=hidden]),select,button')?.focus({preventScroll:true});
  };
  root.mpHomeAction=async id=>{
    if(!u?.id||u.id!==owner){root.mpCloseActionSearch();return alert('登入狀態已變更，請回到總覽重新載入')}
    const action=actions[Number(id)];if(!action)return;
    root.mpCloseActionSearch();
    try{await action.run()}catch(error){alert('無法開啟：'+error.message)}
  };
  root.mpCloseActionSearch=()=>{byId('mp-action-search')?.remove();returnFocus?.focus?.();returnFocus=null};
  root.mpFilterActions=()=>{
    const words=(byId('mp-action-query')?.value||'').trim().toLowerCase().split(/\s+/).filter(Boolean);
    const found=actions.map((a,id)=>({...a,id})).filter(a=>words.every(word=>(a.label+' '+a.hint+' '+a.keywords).toLowerCase().includes(word)));
    byId('mp-action-results').innerHTML=found.map(a=>`<button class="mp-action-result" onclick="mpHomeAction(${a.id})"><b>${esc(a.label)}</b><small>${esc(a.hint)}</small><span aria-hidden="true">→</span></button>`).join('')||'<p>找不到這個動作。可試「薪資」、「帳單」、「支出」、「投資」或「預算」。</p>';
  };
  root.mpOpenActionSearch=()=>{
    if(!u?.id||owner!==u.id)return alert('請先回到總覽載入你的快捷動作');
    root.mpCloseActionSearch();returnFocus=document.activeElement;
    const el=document.createElement('div');el.id='mp-action-search';el.className='modal-backdrop';
    el.innerHTML=`<div class="modal mp-action-dialog" role="dialog" aria-modal="true" aria-labelledby="mp-action-title"><div class="modal-head"><h3 id="mp-action-title">你想做什麼？</h3><button class="btn ghost" onclick="mpCloseActionSearch()">關閉</button></div><label for="mp-action-query" class="tiny">搜尋動作，例如繳卡費、月底、薪資</label><input id="mp-action-query" type="search" placeholder="輸入你想做的事…" oninput="mpFilterActions()" autocomplete="off"><div id="mp-action-results"></div><p class="tiny">只開啟操作畫面；金額仍需你確認後才儲存。</p></div>`;
    el.addEventListener('click',event=>{if(event.target===el)root.mpCloseActionSearch()});
    el.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();root.mpCloseActionSearch();return}
      if(event.key==='Enter'&&event.target===byId('mp-action-query')){event.preventDefault();byId('mp-action-results')?.querySelector('button')?.click()}
      if(event.key==='Tab'){
        const nodes=[...el.querySelectorAll('button,input')].filter(x=>!x.disabled),first=nodes[0],last=nodes.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
      }
    });
    document.body.appendChild(el);root.mpFilterActions();byId('mp-action-query').focus();
  };
  document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'&&u?.id){event.preventDefault();root.mpOpenActionSearch()}});
  root.mpActionHomeHtml=(st,plan,{target,emergencyTarget,plans,researchCount,decisionCount})=>{
    owner=u.id;actions=[];
    const quick=add('記一筆支出','直接開啟快速記錄','花錢 記帳 消費 現金',()=>mp31Quick('expense'));
    const income=add('登錄實領薪資','開啟本月薪資欄位','收入 發薪 工資',()=>root.mpFinanceJump('mp-income-fold'));
    const cash=add('核對實際餘額','輸入銀行與手上現金，校正漏記差額','月底 對帳 現金 資產 結算',()=>mpOpenCash());
    const budget=add('調整生活預算','修改固定責任與彈性花費上限','預算 配置 生活費 每日 能花',()=>root.mpFinanceJump('mp-budget-fold'));
    const investment=add('記錄實際投資','開啟成交表單；計畫不等於已買入','買股票 ETF 買入 交易 定期定額',()=>openInvestmentBuy());
    const saving=add('存入預備金','記錄實際移入預備金的金額','儲蓄 存錢 緊急 留存',()=>mp31Quick('saving',{category:'緊急預備金'}));
    add('其他收入','獎金、退款或兼職實際入帳','收入 獎金 兼職',()=>mp31Quick('income'));
    add('查看每月明細','開啟本月完整收支記錄','編輯 刪除 金流 歷史',()=>root.mpFinanceJump('mp-ledger-fold'));
    add('管理投資與定期定額','查看持倉、交易與計畫','投資 股票 ETF 報酬',()=>mp31Go('p'));
    add('搜尋市場研究','查看研究池與市場資料','研究 標的 市場',()=>mp31Go('r'));
    add('記錄投資決策','保存買賣理由與事後回顧','決策 筆記',()=>mp31Go('d'));
    add('繼續投資課','查看學習進度','學習 課程 教學',()=>mp31Go('l'));
    add('修改資產目標','調整資產累積目標','目標 百萬',async()=>{if(await mp31Go('s'))document.getElementById('goalInput')?.focus()});
    add('管理信用卡','卡片設定、帳單及繳款歷史','信用卡 額度 繳卡費 帳單',()=>mp31Go('c'));
    const cardActions=st.cards.filter(c=>c.status!=='inactive').map(c=>({card:c,id:add('登錄'+c.issuer+'帳單',c.card_name||'收到銀行帳單後填一次','信用卡 帳單 結帳 '+c.issuer,()=>mpNewStatement(c.id))}));
    const obligations=(st.bills||[]).filter(b=>b.outstanding>0).sort((a,b)=>String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999')));
    const todo=obligations.map(b=>{
      const id=add('確認'+(b.issuer||'信用卡')+'繳款',`帳單 ${b.cycleEnd} · 待繳 ${fmt(b.outstanding)}`,'繳卡費 還款 付款 '+(b.issuer||''),()=>b.statementId?mpStatementPay(b.statementId):b.cardId?mpRecordCardPayment(b.cardId,b.cycleEnd,b.outstanding):mp31Go('c'));
      const due=b.dueDate,days=due?Math.ceil((Date.parse(due)-Date.parse(st.asOf))/86400000):null;
      return {priority:days!==null&&days<0?0:days!==null&&days<=7?1:4,title:(b.issuer||'信用卡')+' 待繳 '+fmt(b.outstanding),hint:`${days===null?'繳款日待核對':days<0?'已過繳款日':days===0?'今天到期':days+' 天後到期'} · ${due||''} · 帳單 ${b.cycleEnd}`,id,label:'確認繳款'};
    });
    for(const reason of plan.reasons||[])todo.push({priority:2,title:reason.text,hint:'補齊後自動更新每日可花與配置建議',id:reason.action==='cash'?cash:actions.findIndex(a=>a.label==='管理信用卡'),label:'立即處理'});
    if(plan.afterReserve<0)todo.push({priority:3,title:'必要預留仍差 '+fmt(-plan.afterReserve),hint:'先調整可延後的生活費，暫停追加存款與投資',id:budget,label:'調整預算'});
    if(!st.monthIncome)todo.push({priority:5,title:'本月尚無已登錄收入',hint:'已使用現有結轉現金，薪資實際入帳後再登錄',id:income,label:'登錄薪資'});
    const activePlans=(plans||[]).filter(p=>p.status==='active'&&String(p.start_month).slice(0,7)<=st.month&&(!p.end_month||String(p.end_month).slice(0,7)>=st.month));
    if(activePlans.length)todo.push({priority:6,title:'本月有 '+activePlans.length+' 個啟用投資計畫',hint:'請以實際成交為準；先確認資金，不會自動下單或扣款',id:actions.findIndex(a=>a.label==='管理投資與定期定額'),label:'查看計畫'});
    todo.sort((a,b)=>a.priority-b.priority);
    const taskHtml=items=>items.map(x=>`<div class="mp-home-task"><div><b>${esc(x.title)}</b><p>${esc(x.hint)}</p></div>${button(x.id,x.label,x.priority<=1?'main':'ghost')}</div>`).join('');
    const goalPct=Math.max(0,Math.min(100,st.totalAssets/target*100));
    if(!byId('mp-action-global')){const launcher=document.createElement('button');launcher.id='mp-action-global';launcher.className='btn main';launcher.textContent='找動作 ⌕';launcher.title='搜尋操作（Ctrl / ⌘ K）';launcher.onclick=root.mpOpenActionSearch;document.body.appendChild(launcher)}
    return `<section class="card mp-home-intro"><div><div class="section-kicker">${esc(st.month)} · 個人理財中心</div><h2>今天，先把重要的事處理好</h2><p>需要處理的項目與常用操作都在這裡。</p></div><button class="mp-home-search" onclick="mpOpenActionSearch()">我想做什麼… <small>搜尋動作 · Ctrl / ⌘ K</small></button></section>
      <section class="mp-home-actions">${[[quick,'記支出'],[income,'填薪資'],[cash,'核對餘額'],[investment,'記投資'],[saving,'存預備金']].map(([id,label])=>button(id,label)).join('')}<button class="btn ghost" onclick="mpOpenActionSearch()">更多動作</button></section>
      <section class="card" style="margin-top:14px">${mpFinanceTodayHtml(st,plan)}</section>
      <section class="mp-home-columns"><div class="card"><div class="split"><h3>接下來要處理</h3><span class="pill">${todo.length} 項</span></div>${todo.length?taskHtml(todo.slice(0,4)):'<p class="muted">目前沒有系統偵測到的待辦。若有漏記或新帳單，請用上方快捷動作補齊。</p>'}${todo.length>4?`<details><summary>其餘 ${todo.length-4} 項</summary>${taskHtml(todo.slice(4))}</details>`:''}${plans===null?'<p class="tiny">投資計畫暫時讀取失敗，可至投資頁重新載入。</p>':''}</div><div class="card"><h3>收到帳單，直接登錄</h3><p class="tiny">每張卡每期填一次；繳款由左側待辦確認，不重複記消費。</p><div class="mp-home-card-actions">${cardActions.map(x=>button(x.id,x.card.issuer+' · '+(x.card.card_name||'帳單'))).join('')||'<button class="btn ghost" onclick="mp31Go(\'c\')">設定第一張信用卡</button>'}</div><hr><div class="split"><b>資產目標進度</b><span>${goalPct.toFixed(1)}%</span></div><h3>${fmt(st.totalAssets)} <small class="muted">／ ${fmt(target)}</small></h3><div class="bar"><i style="width:${goalPct}%"></i></div><p class="tiny">預備金 ${fmt(st.emergency)}／${fmt(emergencyTarget)} · 資產依已記錄金流與行情推估</p></div></section>
      <details class="mp-finance-fold"><summary>資產與消費怎麼算？<small>查看現金、卡費及對帳依據</small></summary>${mpCashFlowHtml(st)}</details>
      <details class="mp-finance-fold"><summary>本月任務與研究<small>研究 ${researchCount} · 決策 ${decisionCount}</small></summary><div class="card"><h3>本月作戰清單</h3><p class="tiny">正在整理任務…</p></div><div class="actions"><button class="btn ghost" onclick="mp31Go('r')">查看研究</button><button class="btn ghost" onclick="mp31Go('d')">記錄決策</button><button class="btn ghost" onclick="mp31Go('l')">繼續學習</button></div></details>`;
  };
  const style=document.createElement('style');style.textContent=`.mp-home-intro{display:flex;align-items:center;justify-content:space-between;gap:20px}.mp-home-intro h2{margin:6px 0}.mp-home-intro p{color:#64748b;margin:0}.mp-home-search{min-height:58px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:14px;padding:12px 20px;text-align:left;font-size:16px;cursor:pointer}.mp-home-search small{display:block;font-size:10px;color:#64748b;margin-top:5px}.mp-home-actions{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:12px}.mp-home-actions .btn{min-height:48px}.mp-home-columns{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:14px;margin-top:14px}.mp-home-task{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 0;border-bottom:1px solid #e2e8f0}.mp-home-task p{font-size:12px;color:#64748b;line-height:1.6;margin:5px 0 0}.mp-home-task .btn{flex-shrink:0;min-height:44px}.mp-home-card-actions{display:grid;gap:8px}.mp-action-dialog{width:min(620px,100%);max-height:85dvh;overflow:auto}.mp-action-dialog>input{width:100%;font-size:16px;padding:14px;border:1px solid #cbd5e1;border-radius:12px}.mp-action-result{display:grid;grid-template-columns:1fr auto;width:100%;gap:4px;padding:14px 8px;text-align:left;border:0;border-bottom:1px solid #e2e8f0;background:white;cursor:pointer}.mp-action-result small{grid-column:1;color:#64748b}.mp-action-result span{grid-column:2;grid-row:1/3;align-self:center}.mp-action-result:hover,.mp-action-result:focus-visible{background:#eff6ff}body:has(.mp-home-intro) #mp-action-global{display:none}#mp-action-global{position:fixed;right:18px;top:12px;z-index:9000;min-height:42px;box-shadow:0 3px 12px #0f172a20}@media(max-width:760px){.mp-home-intro{display:block}.mp-home-search{width:100%;margin-top:14px}.mp-home-actions{grid-template-columns:repeat(3,minmax(0,1fr))}.mp-home-columns{grid-template-columns:1fr}.mp-home-task{flex-wrap:wrap}.mp-home-task .btn{margin-left:auto}#mp-action-global{top:auto;bottom:160px;right:12px;font-size:12px;min-height:40px;padding:8px 12px}.mp-action-dialog{padding:16px}}`;
  document.head.appendChild(style);
})(window);
