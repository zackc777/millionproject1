(function (root) {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  function parts(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
    if (!m) throw new Error('請填寫有效日期（YYYY-MM-DD）');
    const y = +m[1], month = +m[2], day = +m[3];
    if (y < 100 || month < 1 || month > 12 || day < 1 || day > days(y, month)) {
      throw new Error('請填寫有效日期（YYYY-MM-DD）');
    }
    return { y, month, day };
  }
  function days(y, month) { return new Date(Date.UTC(y, month, 0)).getUTCDate(); }
  function billingDay(value) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 31) throw new Error('結帳日／繳款日須為 1–31 的整數');
    return n;
  }
  function dateInMonth(y, month, day) {
    const d = new Date(Date.UTC(y, month - 1, 1));
    y = d.getUTCFullYear(); month = d.getUTCMonth() + 1;
    return `${y}-${pad(month)}-${pad(Math.min(billingDay(day), days(y, month)))}`;
  }
  function shiftMonth(value, offset, day) {
    const p = parts(value);
    return dateInMonth(p.y, p.month + offset, day ?? p.day);
  }
  function cycleEnd(value, day) {
    const p = parts(value), end = dateInMonth(p.y, p.month, day);
    return value <= end ? end : dateInMonth(p.y, p.month + 1, day);
  }
  function today(now = new Date()) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now).map(x => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }
  const token = card => `card:${card.id}`;
  function candidates(value, cards) {
    const v = String(value || '').trim();
    if (!v) return [];
    if (v.startsWith('card:')) return cards.filter(c => String(c.id) === v.slice(5));
    return cards.filter(c => [c.issuer, c.card_name].some(a => String(a || '').trim() === v));
  }
  function resolve(value, cards, { allowInactive = false } = {}) {
    const matches = candidates(value, cards);
    if (matches.length > 1) throw new Error('同名卡片無法判定，請選擇完整卡片名稱');
    if (!matches.length) {
      if (String(value).startsWith('card:')) throw new Error('這張卡片已不存在，請重新選擇');
      return null;
    }
    const card = matches[0];
    if (!allowInactive && card.status === 'inactive') throw new Error('這張卡已停用，請重新選擇付款方式');
    return card;
  }
  function matchesRecord(record, card, cards, field = 'payment_method') {
    if (record.credit_card_id != null) return String(record.credit_card_id) === String(card.id);
    const matches = candidates(record[field], cards);
    return matches.length === 1 && String(matches[0].id) === String(card.id);
  }
  function couldMatchRecord(record, card, cards, field = 'payment_method') {
    if (record.credit_card_id != null) return String(record.credit_card_id) === String(card.id);
    return candidates(record[field], cards).some(c => String(c.id) === String(card.id));
  }
  root.MPCardModel = Object.freeze({ parts, billingDay, cycleEnd, shiftMonth, today, token,
    candidates, resolve, matchesRecord, couldMatchRecord });
})(typeof window !== 'undefined' ? window : globalThis);
