(function (root) {
  'use strict';
  const cardModel = root.MPCardModel;
  const amount = row => Number(row.amount) || 0;
  const sum = rows => rows.reduce((n, row) => n + amount(row), 0);
  const date = row => String(row.entry_date || row.month || '').slice(0, 10);
  const monthOf = row => date(row).slice(0, 7);
  const keys = ['rent', 'family', 'telecom', 'gym', 'daily', 'leisure'];
  const labels = { rent:'房租／住宿', family:'父母／家庭', telecom:'電信／網路', gym:'健身／健康', daily:'餐飲／交通／日常', leisure:'娛樂／治裝彈性', other:'其他消費' };
  function isCard(row, cards) {
    return row.credit_card_id != null || cardModel.candidates(row.payment_method, cards).length > 0 ||
      /^(台新|富邦|國泰)$|信用卡|^card:/.test(String(row.payment_method || ''));
  }
  function categoryKey(row) {
    const tag = String(row.note || '').match(/\[(?:LIFE_FIXED|KEY):([^\]]+)\]/)?.[1];
    if (keys.includes(tag)) return tag;
    const cat = String(row.category || '');
    for (const [key, pattern] of [['rent', /房租|住宿/], ['family', /父母|家庭|孝親/], ['telecom', /電信|網路/], ['gym', /健身|健康/], ['daily', /餐飲|交通|日常/], ['leisure', /娛樂|治裝|服飾|美容|社交/]]) {
      if (pattern.test(cat)) return key;
    }
    return 'other';
  }
  // Payments settle only their own card and billing cycle. An old unpaid bill never
  // disappears when the calendar rolls forward; unlinked legacy records stay visible.
  function cardBalances(entries, payments, cards, asOf) {
    const bills = new Map();
    let unresolved = 0;
    function getBill(row, payment) {
      const matches = row.credit_card_id != null ? cards.filter(c => String(c.id) === String(row.credit_card_id)) :
        cardModel.candidates(row[payment ? 'issuer' : 'payment_method'], cards);
      const card = matches.length === 1 ? matches[0] : null;
      const cycle = payment ? String(row.cycle_end || '').slice(0, 10) : card ? cardModel.cycleEnd(date(row), card.statement_day) : 'unresolved';
      const id = card ? String(card.id) : row.credit_card_id != null ? String(row.credit_card_id) : 'legacy:' + String(row[payment ? 'issuer' : 'payment_method']);
      if (!card) unresolved++;
      const key = id + '|' + cycle;
      if (!bills.has(key)) bills.set(key, { cardId:card?.id, issuer:card?.issuer || row.issuer || row.payment_method, cycleEnd:cycle,
        dueDate:card ? cardModel.shiftMonth(cycle, 1, card.due_day) : null, spent:0, paid:0 });
      return bills.get(key);
    }
    entries.filter(x => x.entry_type === 'expense' && isCard(x, cards) && date(x) <= asOf).forEach(x => getBill(x, false).spent += amount(x));
    payments.filter(x => String(x.payment_date).slice(0, 10) <= asOf).forEach(x => getBill(x, true).paid += amount(x));
    const rows = [...bills.values()].map(x => ({ ...x, outstanding:Math.max(0, x.spent - x.paid), unmatched:Math.max(0, x.paid - x.spent),
      closed:x.cycleEnd < asOf, overdue:!!x.dueDate && x.dueDate < asOf && x.spent > x.paid })).sort((a, b) => a.cycleEnd.localeCompare(b.cycleEnd));
    return { bills:rows, cardDebt:rows.reduce((n, x) => n + x.outstanding, 0), unmatchedPayments:rows.reduce((n, x) => n + x.unmatched, 0), unresolved };
  }
  function ledger({ month, entries = [], payments = [], cards = [], today = cardModel.today() }) {
    cardModel.parts(month + '-01');
    const next = cardModel.shiftMonth(month + '-01', 1);
    const end = new Date(Date.parse(next + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
    const asOf = today < end ? today : end;
    const all = entries.filter(x => String(x.month).slice(0, 7) !== '1900-01' && date(x) <= asOf);
    const current = all.filter(x => monthOf(x) === month);
    const allPayments = payments.filter(x => String(x.payment_date).slice(0, 10) <= asOf);
    const monthPayments = allPayments.filter(x => String(x.payment_date).slice(0, 7) === month);
    const totals = rows => ({ Income:sum(rows.filter(x => x.entry_type === 'income')), Expense:sum(rows.filter(x => x.entry_type === 'expense')),
      Saving:sum(rows.filter(x => x.entry_type === 'saving')), Investment:sum(rows.filter(x => x.entry_type === 'investment')),
      CashExpense:sum(rows.filter(x => x.entry_type === 'expense' && !isCard(x, cards))), CardSpend:sum(rows.filter(x => x.entry_type === 'expense' && isCard(x, cards))) });
    const st = { month, asOf, all, current, cards, allPayments, monthPayments };
    for (const [prefix, rows] of [['total', all], ['month', current]]) for (const [key, value] of Object.entries(totals(rows))) st[prefix + key] = value;
    st.monthCardPayments = sum(monthPayments); st.totalCardPayments = sum(allPayments);
    st.monthCashOut = st.monthCashExpense + st.monthCardPayments;
    st.totalCashOut = st.totalCashExpense + st.totalCardPayments;
    st.monthUnallocated = st.monthIncome - st.monthCashOut - st.monthSaving - st.monthInvestment;
    st.liquidCash = st.totalIncome - st.totalCashOut - st.totalSaving - st.totalInvestment;
    st.emergency = sum(all.filter(x => x.entry_type === 'saving' && String(x.category).includes('緊急預備金')));
    st.otherSaving = st.totalSaving - st.emergency;
    st.cashLike = st.liquidCash + st.totalSaving;
    return Object.assign(st, cardBalances(all, allPayments, cards, asOf));
  }
  function rolling(st, profile, target, today = cardModel.today()) {
    const mode = st.month < today.slice(0, 7) ? 'past' : st.month > today.slice(0, 7) ? 'future' : 'current';
    const days = new Date(Date.UTC(+st.month.slice(0, 4), +st.month.slice(5, 7), 0)).getUTCDate();
    const elapsed = mode === 'current' ? +today.slice(8, 10) : mode === 'past' ? days : 0;
    const remainingDays = days - elapsed;
    const previousMonths = [1, 2, 3].map(i => cardModel.shiftMonth(st.month + '-01', -i).slice(0, 7));
    // Only months with observed expenses are samples; absent records are not a zero-spend month.
    const observedMonths = previousMonths.filter(m => st.all.some(x => monthOf(x) === m && x.entry_type === 'expense'));
    const expenses = st.current.filter(x => x.entry_type === 'expense');
    const categories = [...keys, 'other'].map(key => {
      const spent = sum(expenses.filter(x => categoryKey(x) === key));
      const budget = Math.max(0, Number(profile[key]) || 0);
      const fixed = profile.__fixed?.[key] ?? ['rent', 'family', 'telecom', 'gym'].includes(key);
      const samples = observedMonths.map(m => sum(st.all.filter(x => x.entry_type === 'expense' && monthOf(x) === m && categoryKey(x) === key))).sort((a, b) => a - b);
      const history = samples.length ? samples[Math.floor(samples.length / 2)] : 0;
      const pace = key !== 'other' && elapsed >= 7 ? spent / elapsed * days : 0;
      // Fixed bills do not extrapolate by daily pace. Variable budgets never shrink
      // automatically just because early-month records are sparse.
      const forecast = mode === 'past' || key === 'other' ? spent : fixed ? Math.max(spent, budget) : Math.max(spent, budget, history, pace);
      return { key, label:labels[key], spent, budget, history, fixed, forecast:Math.ceil(forecast), remaining:Math.ceil(Math.max(0, forecast - spent)) };
    });
    const remainingLiving = categories.reduce((n, x) => n + x.remaining, 0);
    const forecast = st.monthExpense + remainingLiving;
    const planned = keys.reduce((n, key) => n + Math.max(0, Number(profile[key]) || 0), 0);
    const cashBase = Math.min(st.monthUnallocated, st.liquidCash);
    const afterReserve = cashBase - st.cardDebt - remainingLiving;
    const available = mode === 'current' && !st.unresolved ? Math.max(0, Math.floor(afterReserve)) : 0;
    const gap = Math.max(0, target - st.emergency);
    // Keep one week of observed/planned variable living costs as a cash buffer.
    const week = Math.ceil(categories.filter(x => !x.fixed).reduce((n, x) => n + x.forecast, 0) / days * 7);
    const flex = Math.min(available, week);
    const emergency = Math.min(gap, available - flex);
    const core = Math.max(0, available - flex - emergency);
    const previousExpense = sum(st.all.filter(x => monthOf(x) === previousMonths[0] && x.entry_type === 'expense' && (mode !== 'current' || +date(x).slice(8, 10) <= elapsed)));
    const previousObserved = observedMonths.includes(previousMonths[0]);
    const top = [...categories].sort((a, b) => (b.spent - b.budget) - (a.spent - a.budget)).find(x => x.spent > x.budget);
    const stage = mode === 'past' ? '月份回顧' : mode === 'future' ? '尚未開始' : st.unresolved ? '先核對卡片歸屬' : afterReserve < 0 ? '先補現金缺口' : gap > 0 ? '優先建立安全墊' : '可評估追加投資';
    return { mode, stage, categories, remainingDays, remainingLiving, planned, forecast, cashBase, afterReserve, available, gap, emergency, core, flex,
      historyMonths:observedMonths.length, previousExpense:previousObserved ? previousExpense : null, expenseDelta:previousObserved ? st.monthExpense - previousExpense : null,
      dailyLimit:remainingDays > 0 ? Math.floor(Math.max(0, Math.min(planned - st.monthExpense, cashBase - st.cardDebt)) / remainingDays) : 0, top };
  }
  root.MPFinanceModel = Object.freeze({ ledger, rolling, isCard, cardBalances, categoryKey, monthOf });
})(typeof window !== 'undefined' ? window : globalThis);
