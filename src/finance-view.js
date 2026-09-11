function mpCashFlowHtml(st) {
  return `<div class="finance-kpis mp-cash-summary">
    <div class="finance-kpi"><div class="label">本月現金支出／扣款</div><div class="num">${money(st.monthCashOut)}</div><div class="tiny">現金消費 ${money(st.monthCashExpense)} ＋ 繳卡費 ${money(st.monthCardPayments)}</div></div>
    <div class="finance-kpi"><div class="label">本月消費支出</div><div class="num">${money(st.monthExpense)}</div><div class="tiny">含刷卡 ${money(st.monthCardSpend)}；繳卡費不重複認列消費</div></div>
    <div class="finance-kpi"><div class="label">本月資金餘額</div><div class="num">${money(st.monthUnallocated)}</div><div class="tiny">收入扣除現金扣款、存款與實際投資</div></div>
    <div class="finance-kpi"><div class="label">尚待繳卡費</div><div class="num">${money(st.cardDebt)}</div><div class="tiny">包含未出帳與以前月份未清餘額；先預留再配置</div></div>
  </div>${st.unmatchedPayments ? `<div class="status-note" style="margin-top:10px">有 ${money(st.unmatchedPayments)} 繳款超過系統中對應帳單的消費，可能是舊帳單、溢繳或漏記刷卡。現金已扣除，請核對原帳單；系統不會自動補成當月消費。</div>` : ''}${st.unresolved ? '<div class="status-note" role="status">有舊卡片紀錄尚無法唯一歸屬，追加配置暫停建議。請在原明細選擇正確卡片。</div>' : ''}`;
}
function mpRollingAllocationHtml(st, plan) {
  return `<div class="section-kicker">ROLLING ALLOCATION · ${esc(st.month)}</div><h3>現在還能怎麼分</h3><span class="pill">${esc(plan.stage)}</span>
    <p class="muted">依截至 ${esc(st.asOf)} 的收入、消費、卡費扣款與已完成存投重算。以下為剩餘可追加金額。</p>
    <div class="budget-grid" style="grid-template-columns:1fr 1fr">
      <div class="budget-card"><div class="label">餘下生活先預留</div><div class="amt">${money(plan.remainingLiving)}</div><div class="hint">整月預估 ${money(plan.forecast)}，已消費 ${money(st.monthExpense)}</div></div>
      <div class="budget-card"><div class="label">還可補預備金</div><div class="amt">${money(plan.emergency)}</div><div class="hint">已累積 ${money(st.emergency)}，距目標 ${money(plan.gap)}</div></div>
      <div class="budget-card"><div class="label">投資可用上限</div><div class="amt">${money(plan.core)}</div><div class="hint">扣除生活、卡債、安全墊與現金緩衝後；不代表應全數投入</div></div>
      <div class="budget-card"><div class="label">額外現金緩衝</div><div class="amt">${money(plan.flex)}</div><div class="hint">以約一週變動生活費估算，仍留在現金中</div></div>
    </div>
    <div class="call" style="margin-top:12px">可分配基礎 ${money(plan.cashBase)} − 待繳卡費 ${money(st.cardDebt)} − 剩餘生活 ${money(plan.remainingLiving)} ＝ ${money(plan.afterReserve)}。${plan.afterReserve < 0 ? '先補足缺口，暫停追加存投。' : '先保留緩衝並補足安全墊，再評估投資。'}</div>
    ${plan.mode !== 'current' ? `<div class="tiny" style="margin-top:10px">${plan.mode === 'past' ? '過去月份顯示實際回顧，不產生今天的轉帳建議。' : '未來月份尚未發生的收入與交易不列為可用資金。'}</div>` : ''}`;
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
