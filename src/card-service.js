/* Shared persistence boundary for every card entry point. No backfill on page load. */
window.mpLoadCards = async function () {
  if (typeof c === 'undefined' || typeof u === 'undefined' || !c || !u) return [];
  const { data, error } = await c.from('credit_cards')
    .select('id,issuer,card_name,status,statement_day,due_day').eq('user_id', u.id).order('created_at');
  if (error) throw error;
  return data || [];
};
window.mpResolvePayment = async function (value, existing = null) {
  const cards = await mpLoadCards();
  // Editing the other fields of a historic purchase must preserve its card ID,
  // including an inactive card, unless the payment choice itself changes.
  if (existing?.credit_card_id != null && value === existing.payment_method) {
    const card = cards.find(x => String(x.id) === String(existing.credit_card_id));
    if (!card) throw new Error('原卡片不存在，請重新選擇付款方式');
    return { payment_method: card.issuer, credit_card_id: card.id };
  }
  const card = MPCardModel.resolve(value, cards, {
    allowInactive: !!existing && value === existing.payment_method
  });
  return card ? { payment_method: card.issuer, credit_card_id: card.id }
    : { payment_method: String(value || '銀行轉帳／現金'), credit_card_id: null };
};
window.mpFillCardOptions = function (select, cards, base = ['銀行轉帳／現金', '證券交割', '其他']) {
  const previous = select.value;
  select.replaceChildren();
  const option = (value, label) => {
    const el = document.createElement('option'); el.value = value; el.textContent = label; select.appendChild(el);
  };
  base.forEach(value => option(value, value));
  cards.filter(x => x.status !== 'inactive').forEach(card => option(MPCardModel.token(card),
    `${card.issuer} · ${card.card_name || '信用卡'}`));
  try {
    const card = MPCardModel.resolve(previous, cards);
    const next = card ? MPCardModel.token(card) : previous;
    if ([...select.options].some(x => x.value === next)) select.value = next;
  } catch (_) { /* An ambiguous/deactivated previous label must be reselected. */ }
};
