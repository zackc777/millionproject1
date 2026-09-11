function mpCashFlowHtml(st) {
  return `<div class="finance-kpis mp-cash-summary">
    <div class="finance-kpi"><div class="label">本月現金支出／扣款</div><div class="num">${money(st.monthCashOut)}</div><div class="tiny">現金消費 ${money(st.monthCashExpense)} ＋ 繳卡費 ${money(st.monthCardPayments)}</div></div>
    <div class="finance-kpi"><div class="label">本月消費支出</div><div class="num">${money(st.monthExpense)}</div><div class="tiny">含刷卡 ${money(st.monthCardSpend)}；繳卡費不重複認列消費</div></div>
    <div class="finance-kpi"><div class="label">本月資金餘額</div><div class="num">${money(st.monthUnallocated)}</div><div class="tiny">收入扣除現金扣款、存款與實際投資</div></div>
    <div class="finance-kpi"><div class="label">尚待繳卡費</div><div class="num">${money(st.cardDebt)}</div><div class="tiny">包含未出帳與以前月份未清餘額；先預留再配置</div></div>
  </div>${st.unmatchedPayments ? `<div class="status-note" style="margin-top:10px">有 ${money(st.unmatchedPayments)} 繳款超過系統中對應帳單的消費，可能是舊帳單、溢繳或漏記刷卡。現金已扣除，請核對原帳單；系統不會自動補成當月消費。</div>` : ''}${st.unresolved ? '<div class="status-note" role="status">有舊卡片紀錄尚無法唯一歸屬，追加配置暫停建議。請在原明細選擇正確卡片。</div>' : ''}`;
}
function mpRollingAllocationHtml(st, plan) {
  const shortfall=Math.max(0,-plan.afterReserve);
  const current=plan.mode==='current';
  const focusLabel=plan.mode==='past'?'當月必要預留後餘額':plan.mode==='future'?'尚未開始配置':shortfall?'目前應先補足':'必要預留後可安排';
  const focusValue=plan.mode==='future'?'—':money(shortfall||Math.max(0,plan.afterReserve));
  const focusHint=plan.mode==='past'?'僅供回顧，不產生今天的轉帳建議。':plan.mode==='future'?'未來收入與交易尚未發生，不列為可用資金。':shortfall?'先暫停追加存款與投資，核對生活預算及待繳帳單。':'此金額仍包含下方現金緩衝、預備金與投資上限。';
  const steps=[
    ['生活責任',plan.remainingLiving,`整月預估 ${money(plan.forecast)} · 已消費 ${money(st.monthExpense)}`,'life'],
    ...(st.cardDebt>0?[['信用卡待繳',st.cardDebt,'包含未出帳及以前月份尚未繳清金額','card']]:[]),
    ...(plan.gap>0||plan.emergency>0?[['預備金',plan.emergency,`目前 ${money(st.emergency)} · 距目標 ${money(plan.gap)}`,'reserve']]:[]),
    ['現金緩衝',plan.flex,'保留約一週變動生活費，不會轉出','buffer'],
    ['投資上限',plan.core,'扣除必要預留後的上限，不代表必須全數投入','invest']
  ];
  return `<div class="mp-plan-head"><div><div class="section-kicker">ROLLING ALLOCATION · ${esc(st.month)}</div><h3>現在最該做什麼</h3></div><span class="pill">${esc(plan.stage)}</span></div>
    <p class="muted">依截至 ${esc(st.asOf)} 的實際金流即時重算；只顯示接下來要保留或可安排的金額。</p>
    <div class="mp-plan-focus ${shortfall&&current?'warn':''}"><span>${focusLabel}</span><b>${focusValue}</b><small>${focusHint}</small></div>
    <div class="mp-plan-list">${steps.map(([label,value,hint,type],i)=>`<div class="mp-plan-row ${!value?'zero':''}"><i class="${type}">${i+1}</i><div><b>${esc(label)}</b><span>${esc(hint)}</span></div><strong>${money(value)}</strong></div>`).join('')}</div>
    <div class="mp-plan-formula">可運用 ${money(plan.cashBase)} − 卡費 ${money(st.cardDebt)} − 生活預留 ${money(plan.remainingLiving)} = ${money(plan.afterReserve)}</div>`;
}
function mpSpendingReviewHtml(st, plan) {
  const comparison = plan.expenseDelta === null ? '上月資料不足，暫不比較。' : `較上月${plan.mode === 'current' ? '同期' : ''}${plan.expenseDelta > 0 ? '增加' : '減少'} ${money(Math.abs(plan.expenseDelta))}。`;
  const over = Math.max(0, plan.forecast - plan.planned);
  return `<div class="section-kicker">SPENDING REVIEW · ${esc(st.month)}</div><h3>${plan.mode === 'past' ? '這個月花費回顧' : '花費變化與下一步'}</h3>
    <div class="smart-alert ${over ? 'warn' : 'good'}"><b>${plan.top ? `${esc(plan.top.label)}已超過設定預算 ${money(plan.top.spent - plan.top.budget)}` : '已記錄消費未超過各類預算'}</b><div>${comparison}</div></div>
    <div class="advice-list">
      <div class="advice-item"><span>${plan.mode === 'past' ? '整月實際消費' : '整月消費預估'}</span><b>${money(plan.forecast)}</b></div>
      <div class="advice-item"><span>生活預算</span><b>${money(plan.planned)}</b></div>
      ${plan.mode === 'current' ? `<div class="advice-item"><span>剩餘 ${plan.remainingDays} 天，每日預算上限</span><b>${money(plan.dailyLimit)}</b></div>` : ''}
    </div>
    <p class="tiny">${plan.historyMonths ? `參考最近三個月中 ${plan.historyMonths} 個有消費紀錄的月份` : '歷史資料不足，先使用你設定的生活預算'}；固定項目保留尚未支付部分，可分類的變動項目取預算、歷史中位數與本月速度的較高值。未分類與帳單彙總不推估重複消費。本月未滿 7 天不推估消費速度；漏記會影響結果。</p>
    ${plan.categories.filter(x => x.spent || x.budget || x.remaining).map(x => `<div class="mp-category-review"><b>${esc(x.label)}</b><span>已花 ${money(x.spent)} · ${plan.mode === 'past' ? '預算' : '預估'} ${money(plan.mode === 'past' ? x.budget : x.forecast)}</span></div>`).join('')}
    <div class="status-note" style="margin-top:12px">${plan.afterReserve < 0 ? `現金預留缺口 ${money(-plan.afterReserve)}：先檢查未繳帳單與固定責任，調低可延後的花費。` : over ? `按目前紀錄推估會超過生活預算 ${money(over)}。先檢查花費增加的類別，再調整生活預算。` : '持續記錄實際花費；消費、繳款與預算改動後，剩餘配置會同步更新。'}</div>`;
}
function mpRenderRolling(st) {
  const plan = MPFinanceModel.rolling(st, getBudgetProfile(), getEmergencyGoalCached());
  if ($('allocBox')) $('allocBox').innerHTML = mpRollingAllocationHtml(st, plan);
  if ($('mp-spending-review')) $('mp-spending-review').innerHTML = mpSpendingReviewHtml(st, plan);
  return plan;
}

if(typeof document!=='undefined'&&!document.getElementById('mp-finance-view-style')){
  const style=document.createElement('style');style.id='mp-finance-view-style';
  style.textContent=`
  .mp-plan-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.mp-plan-head h3{margin:3px 0}.mp-plan-focus{display:grid;gap:3px;padding:15px 16px;border:1px solid #bfdbfe;border-radius:16px;background:linear-gradient(135deg,#eff6ff,#f8fafc);margin:14px 0}.mp-plan-focus.warn{border-color:#fed7aa;background:linear-gradient(135deg,#fff7ed,#fff)}.mp-plan-focus span{font-size:11px;color:#64748b;font-weight:800}.mp-plan-focus b{font-size:28px;color:#0f172a}.mp-plan-focus small{font-size:11px;line-height:1.55;color:#64748b}.mp-plan-list{border:1px solid #e5e7eb;border-radius:16px;overflow:hidden}.mp-plan-row{display:grid;grid-template-columns:32px minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px 12px;border-bottom:1px solid #edf0f4;background:#fff}.mp-plan-row:last-child{border-bottom:0}.mp-plan-row.zero{opacity:.62}.mp-plan-row i{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:#eef4ff;color:#2563eb;font-size:11px;font-style:normal;font-weight:900}.mp-plan-row i.card{background:#fff7ed;color:#ea580c}.mp-plan-row i.reserve{background:#ecfdf5;color:#059669}.mp-plan-row i.buffer{background:#f0fdfa;color:#0f766e}.mp-plan-row i.invest{background:#eef2ff;color:#4f46e5}.mp-plan-row div b,.mp-plan-row div span{display:block}.mp-plan-row div b{font-size:13px}.mp-plan-row div span{font-size:10px;color:#64748b;margin-top:2px;line-height:1.4}.mp-plan-row strong{font-size:14px;white-space:nowrap}.mp-plan-formula{margin-top:10px;padding:10px 12px;border-radius:12px;background:#f8fafc;color:#64748b;font-size:10px;line-height:1.5}
  @media(max-width:430px){.mp-plan-head{display:block}.mp-plan-head .pill{margin-top:7px}.mp-plan-focus b{font-size:25px}.mp-plan-row{grid-template-columns:28px minmax(0,1fr)}.mp-plan-row strong{grid-column:2;font-size:16px}.mp-plan-row div span{white-space:normal}}
  `;
  document.head.appendChild(style);
}
