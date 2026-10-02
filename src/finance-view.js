function mpCashFlowHtml(st) {
  return `<div class="finance-kpis mp-cash-summary">
    <div class="finance-kpi"><div class="label">未指定用途現金</div><div class="num">${money(st.liquidCash)}</div><div class="tiny">含上月結轉；已排除預備金及專用存款，尚未扣下方待繳與生活預留</div></div>
    <div class="finance-kpi"><div class="label">淨資產</div><div class="num">${st.totalAssets==null?'缺當月投資快照':money(st.totalAssets)}</div><div class="tiny">全部現金存款＋投資市值－待繳卡費</div></div>
    <div class="finance-kpi"><div class="label">${esc(st.month)} 認列消費</div><div class="num">${money(st.monthExpense)}</div><div class="tiny">現金消費 ${money(st.monthCashExpense)} ＋ 信用卡消費 ${money(st.monthCardSpend)}</div></div>
    <div class="finance-kpi"><div class="label">${esc(st.month)} 實際扣款</div><div class="num">${money(st.monthCashOut)}</div><div class="tiny">現金消費 ${money(st.monthCashExpense)} ＋ 繳卡費 ${money(st.monthCardPayments)}；不含存款及投資轉出</div></div>
  </div><div class="status-note" style="margin-top:10px">待繳卡費 <b>${money(st.cardDebt)}</b> · ${st.reconciliation?'現金基準 '+esc(st.reconciliation.balance_date)+'，其後依金流推算':'現金尚未對帳'} <button class="btn ghost" onclick="mpOpenCash()">核對現金</button></div>
  <details class="mp-finance-fold"><summary>這些數字怎麼算？信用卡何時認列？</summary><p>你使用帳單模式時，信用卡新增消費計入「結帳月份」；繳款只在實際付款月份扣現金，不再算一次消費。尚未用帳單對帳的逐筆刷卡依消費日認列。</p><p>因此，上月帳單本月繳款：上月顯示消費，本月顯示卡費扣款。存款是用途移轉；買入投資是現金轉為投資資產，都不列生活消費。</p><p>淨資產：現金及存款 ${money(st.cashLike)} ＋ 投資 ${st.investmentValue==null?'未保存當月市值':money(st.investmentValue)} − 卡費負債 ${money(st.cardDebt)}。</p><p>本月資金增減 ${money(st.monthUnallocated)}＝收入 ${money(st.monthIncome)} − 實際扣款 ${money(st.monthCashOut)} − 存款 ${money(st.monthSaving)} − 投資 ${money(st.monthInvestment)} ＋ 未指定用途現金校正 ${money(st.monthCashAdjustment)}。這不是你的全部現金餘額。</p>${st.unmatchedPayments?`<p>有 ${money(st.unmatchedPayments)} 繳款超過對應消費，可能為舊帳單或溢繳。現金已扣，不會猜成當月消費。</p>`:''}</details><details class="mp-finance-fold"><summary>信用卡帳單與本月繳款對照</summary><p class="tiny">帳單期別決定消費認列；付款日期決定現金扣款。兩者不是兩筆消費。</p>
    ${(st.bills||[]).filter(b=>b.outstanding>0||String(b.cycleEnd).startsWith(st.month)||String(b.dueDate).startsWith(st.month)).map(b=>`<div class="mp-card-reconcile"><b>${esc(b.issuer||'未指定卡片')}</b><span>帳單 ${esc(b.cycleEnd)} · 到期 ${esc(b.dueDate||'未確認')}</span><strong>尚待繳 ${money(b.outstanding)}</strong></div>`).join('')||'<p>這個月沒有相關帳單或未清餘額。</p>'}
    <h4>本月實際繳款</h4>${(st.monthPayments||[]).map(p=>`<div class="mp-card-reconcile"><b>${esc(p.issuer)}</b><span>${esc(String(p.payment_date).slice(0,10))} 付款 · 帳單 ${esc(String(p.cycle_end).slice(0,10))}</span><strong>${money(p.amount)}</strong></div>`).join('')||'<p>本月尚無繳款紀錄；不代表沒有待繳帳單。</p>'}<button class="btn ghost" onclick="mp31Go('c')">管理帳單／確認繳款</button></details>`;
}
function mpFinanceTodayHtml(st,plan){
  if(plan.mode!=='current')return `<div class="status-note">${plan.mode==='past'?'正在回顧歷史月份；每日可花與即時配置只在本月顯示。':'未來月份尚未開始，不將預期薪資當成可用現金。'} <button class="btn ghost" onclick="goCurrentFinanceMonth()">查看本月建議</button></div>`;
  const blocked=plan.uncertain||st.unresolved;
  return `<div class="mp-today-head"><div><div class="section-kicker">${esc(st.month)} · 今天先看這裡</div><h3>接下來可以怎麼花？</h3></div><span class="pill">${blocked?'還有資料待補':plan.afterReserve<0?'先控制花費':'已自動更新'}</span></div>
    <div class="finance-kpis mp-today-kpis"><div class="finance-kpi"><div class="label">整月生活預算</div><div class="num">${money(plan.planned)}</div><div class="tiny">依你設定的固定與彈性預算；不需每月重新啟動</div></div><div class="finance-kpi"><div class="label">${blocked?'每日預算參考':'每日可花上限（估計）'}</div><div class="num">${money(blocked?plan.budgetDaily:plan.dailyLimit)}</div><div class="tiny">含今天剩 ${plan.remainingDays} 天；${blocked?'僅按生活預算分攤，尚未確認現金足夠':'已預留待繳卡費及固定責任'}</div></div><div class="finance-kpi"><div class="label">${blocked?'日常資金狀態':'剩餘日常可用（估計）'}</div><div class="num">${blocked?'待補資料':money(plan.spendingAvailable)}</div><div class="tiny">預備金、專用存款不挪用；不是可追加投資金額</div></div></div>
    ${(plan.reasons||[]).length?`<div class="mp-next-actions"><b>補齊以下項目就會自動重算，不需要找啟動按鈕：</b>${plan.reasons.map(r=>`<div>${esc(r.text)} <button class="btn ghost" onclick="${r.action==='cash'?'mpOpenCash()':"mp31Go('c')"}">${r.action==='cash'?'核對餘額':'查看信用卡'}</button></div>`).join('')}</div>`:`<p class="tiny">已使用上月結轉＋本月實際金流。新增收入、消費、繳款或修改預算後會更新；未入帳薪資不提前計入。</p>`}
    ${plan.afterReserve<0?`<div class="status-note">按目前生活預算與卡費預留，仍有 ${money(-plan.afterReserve)} 缺口。先降低可延後的花費；追加存款與投資暫為 0。</div>`:''}`;
}
function mpRollingAllocationHtml(st, plan) {
  const shortfall=Math.max(0,-plan.afterReserve);
  const current=plan.mode==='current';
  const focusLabel=plan.mode==='past'?'當月必要預留後餘額':plan.mode==='future'?'尚未開始配置':shortfall?'目前應先補足':'必要預留後可安排';
  const focusValue=plan.mode==='future'?'—':money(shortfall||Math.max(0,plan.afterReserve));
  const focusHint=plan.mode==='past'?'僅供回顧，不產生今天的轉帳建議。':plan.mode==='future'?'未來收入與交易尚未發生，不列為可用資金。':shortfall?'先暫停追加存款與投資，核對生活預算及待繳帳單。':'此金額仍包含下方現金緩衝、預備金與投資上限。';
  const steps=[
    ['生活與未出帳預留',plan.necessaryReserve??plan.remainingLiving,`生活餘額 ${money(plan.remainingLiving)} · 未出帳估計 ${money(plan.unbilledReserve)}；用途未確認，先取較高者`,'life'],
    ...(st.cardDebt>0?[['信用卡待繳',st.cardDebt,'包含未出帳及以前月份尚未繳清金額','card']]:[]),
    ...(plan.gap>0||plan.emergency>0?[['預備金',plan.emergency,`目前 ${money(st.emergency)} · 距目標 ${money(plan.gap)}`,'reserve']]:[]),
    ['現金緩衝',plan.flex,'保留約一週變動生活費，不會轉出','buffer'],
    ['投資上限',plan.core,'扣除必要預留後的上限，不代表必須全數投入','invest']
  ];
  return `<div class="mp-plan-head"><div><div class="section-kicker">ROLLING ALLOCATION · ${esc(st.month)}</div><h3>預留與追加配置明細</h3></div><span class="pill">${esc(plan.stage)}</span></div>
    <p class="muted">依截至 ${esc(st.asOf)} 的已記錄金流及對帳餘額推估；只顯示接下來要保留或可安排的金額；未記錄的花費仍會影響結果。</p>
    <div class="mp-plan-focus ${shortfall&&current?'warn':''}"><span>${focusLabel}</span><b>${focusValue}</b><small>${focusHint}</small></div>
    <div class="mp-plan-list">${steps.map(([label,value,hint,type],i)=>`<div class="mp-plan-row ${!value?'zero':''}"><i class="${type}">${i+1}</i><div><b>${esc(label)}</b><span>${esc(hint)}</span></div><strong>${money(value)}</strong></div>`).join('')}</div>
    ${plan.uncertain?'<p class="status-note">現金尚未對帳、對帳已超過 31 天，或帳單／刷卡預留資料不足。請先核對，暫不建議追加投資。</p>':''}
    <div class="mp-plan-formula">可運用 ${money(plan.cashBase)} − 卡費 ${money(st.cardDebt)} − 生活／未出帳預留 ${money(plan.necessaryReserve??plan.remainingLiving)} = ${money(plan.afterReserve)}</div>`;
}
function mpSpendingReviewHtml(st, plan) {
  const comparison = st.statements?.length?'帳單跨月且集中結帳，暫不與逐日消費作同期比較；逐卡趨勢請看信用卡帳單。':plan.expenseDelta === null ? '上月資料不足，暫不比較。' : `較上月${plan.mode === 'current' ? '同期' : ''}${plan.expenseDelta > 0 ? '增加' : '減少'} ${money(Math.abs(plan.expenseDelta))}。`;
  const over = Math.max(0, plan.forecast - plan.planned);
  return `<div class="section-kicker">SPENDING REVIEW · ${esc(st.month)}</div><h3>${plan.mode === 'past' ? '這個月花費回顧' : '花費變化與下一步'}</h3>
    <div class="smart-alert ${over ? 'warn' : 'good'}"><b>${plan.top ? `${esc(plan.top.label)}已超過設定預算 ${money(plan.top.spent - plan.top.budget)}` : '已記錄消費未超過各類預算'}</b><div>${comparison}</div></div>
    <div class="advice-list">
      <div class="advice-item"><span>${plan.mode === 'past' ? '整月實際消費' : '整月消費預估'}</span><b>${money(plan.forecast)}</b></div>
      <div class="advice-item"><span>生活預算</span><b>${money(plan.planned)}</b></div>
      ${plan.mode === 'current' ? `<div class="advice-item"><span>接下來可用於日常花費</span><b>${plan.uncertain||st.unresolved?'待核對':money(plan.spendingAvailable)}</b></div><div class="advice-item"><span>含今天 ${plan.remainingDays} 天，每日上限</span><b>${plan.uncertain||st.unresolved?'待核對':money(plan.dailyLimit)}</b></div><p class="tiny">已保留待繳卡費、未付固定費用與額外未出帳預留。日常可用金額包含在生活預留內，不可再加到投資配置。</p>` : ''}
    </div>
    <p class="tiny">${plan.historyMonths ? `參考最近三個月中 ${plan.historyMonths} 個有消費紀錄的月份` : '歷史資料不足，先使用你設定的生活預算'}；固定項目保留尚未支付部分，可分類的變動項目取預算、歷史中位數與本月速度的較高值。未分類與帳單彙總不推估重複消費。本月未滿 7 天不推估消費速度；漏記會影響結果。</p>
    ${plan.categories.filter(x => x.spent || x.budget || x.remaining).map(x => `<div class="mp-category-review"><b>${esc(x.label)}</b><span>已花 ${money(x.spent)} · ${plan.mode === 'past' ? '預算' : '預估'} ${money(plan.mode === 'past' ? x.budget : x.forecast)}</span></div>`).join('')}
    <div class="status-note" style="margin-top:12px">${plan.afterReserve < 0 ? `現金預留缺口 ${money(-plan.afterReserve)}：先檢查未繳帳單與固定責任，調低可延後的花費。` : over ? `按目前紀錄推估會超過生活預算 ${money(over)}。先檢查花費增加的類別，再調整生活預算。` : '持續記錄實際花費；消費、繳款與預算改動後，剩餘配置會同步更新。'}</div>`;
}
function mpRenderRolling(st) {
  const plan = MPFinanceModel.rolling(st, getBudgetProfile(), getEmergencyGoalCached());
  if ($('mp-finance-today')) $('mp-finance-today').innerHTML=mpFinanceTodayHtml(st,plan);
  if ($('allocBox')) $('allocBox').innerHTML = mpRollingAllocationHtml(st, plan);
  if ($('mp-spending-review')) $('mp-spending-review').innerHTML = mpSpendingReviewHtml(st, plan);
  return plan;
}

if(typeof document!=='undefined'&&!document.getElementById('mp-finance-view-style')){
  const style=document.createElement('style');style.id='mp-finance-view-style';
  style.textContent=`
  .mp-card-reconcile{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:12px 0;border-bottom:1px solid #e2e8f0}.mp-card-reconcile span{font-size:12px;color:#64748b}
  .mp-finance-fold{margin-top:12px;border:1px solid #e2e8f0;border-radius:14px;padding:0 14px;background:#fff}.mp-finance-fold>summary{padding:15px 0;cursor:pointer;font-weight:800;min-height:44px}.mp-finance-fold>summary small{font-weight:400;color:#64748b;margin-left:8px}.mp-finance-fold>p{line-height:1.7;color:#64748b}.mp-finance-fold[open]{padding-bottom:14px}.mp-today-head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.mp-today-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.mp-next-actions{padding:12px;background:#fff7ed;border-radius:12px;margin-top:12px}.mp-next-actions>div{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px}@media(max-width:700px){.mp-today-kpis{grid-template-columns:1fr}.mp-next-actions>div{flex-wrap:wrap}}
  .mp-plan-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.mp-plan-head h3{margin:3px 0}.mp-plan-focus{display:grid;gap:3px;padding:15px 16px;border:1px solid #bfdbfe;border-radius:16px;background:linear-gradient(135deg,#eff6ff,#f8fafc);margin:14px 0}.mp-plan-focus.warn{border-color:#fed7aa;background:linear-gradient(135deg,#fff7ed,#fff)}.mp-plan-focus span{font-size:11px;color:#64748b;font-weight:800}.mp-plan-focus b{font-size:28px;color:#0f172a}.mp-plan-focus small{font-size:11px;line-height:1.55;color:#64748b}.mp-plan-list{border:1px solid #e5e7eb;border-radius:16px;overflow:hidden}.mp-plan-row{display:grid;grid-template-columns:32px minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px 12px;border-bottom:1px solid #edf0f4;background:#fff}.mp-plan-row:last-child{border-bottom:0}.mp-plan-row.zero{opacity:.62}.mp-plan-row i{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:#eef4ff;color:#2563eb;font-size:11px;font-style:normal;font-weight:900}.mp-plan-row i.card{background:#fff7ed;color:#ea580c}.mp-plan-row i.reserve{background:#ecfdf5;color:#059669}.mp-plan-row i.buffer{background:#f0fdfa;color:#0f766e}.mp-plan-row i.invest{background:#eef2ff;color:#4f46e5}.mp-plan-row div b,.mp-plan-row div span{display:block}.mp-plan-row div b{font-size:13px}.mp-plan-row div span{font-size:10px;color:#64748b;margin-top:2px;line-height:1.4}.mp-plan-row strong{font-size:14px;white-space:nowrap}.mp-plan-formula{margin-top:10px;padding:10px 12px;border-radius:12px;background:#f8fafc;color:#64748b;font-size:10px;line-height:1.5}
  @media(max-width:430px){.mp-plan-head{display:block}.mp-plan-head .pill{margin-top:7px}.mp-plan-focus b{font-size:25px}.mp-plan-row{grid-template-columns:28px minmax(0,1fr)}.mp-plan-row strong{grid-column:2;font-size:16px}.mp-plan-row div span{white-space:normal}}
  `;
  document.head.appendChild(style);
}
