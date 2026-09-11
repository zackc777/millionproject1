
  window.MILLIONPROJECT_INVESTMENT_CORE_VERSION = "investment-core-35";
  (()=>{
    if (window.__MP_INVESTMENT_CORE35) return;
    window.__MP_INVESTMENT_CORE35 = true;
    const money35 = (n)=>'NT$' + Math.round(Number(n) || 0).toLocaleString('zh-TW');
    const esc35 = (s)=>String(s ?? '').replace(/[&<>"']/g, (m)=>({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[m]);
    const today35 = ()=>new Date().toISOString().slice(0, 10);
    const month35 = ()=>new Date().toISOString().slice(0, 7);
    const parseLegacy = (n)=>{
      const s = String(n || '');
      const g = (k)=>(s.match(new RegExp('\\[' + k + ':([^\\]]*)\\]')) || [])[1] || '';
      return {
        symbol: g('SYMBOL'),
        qty: +g('QTY') || 0,
        price: +g('PRICE') || 0
      };
    };
    const toast35 = (m, bad = false)=>{
      try {
        if (typeof mpToast === 'function') return mpToast(m, bad);
      } catch (_) {}
      try {
        if (typeof v7Toast === 'function') return v7Toast(m);
      } catch (_) {}
      if (bad) alert(m);
    };
    async function recalcMonth35(m) {
      try {
        if (m && typeof persistMonthSnapshot === 'function' && typeof moneyEngine === 'function') await persistMonthSnapshot(m, await moneyEngine(m));
      } catch (e) {
        console.warn('month recalc', e);
      }
    }
    async function syncMarket35() {
      try {
        const r = await fetch('https://jypukgxllsilctsmfxmw.supabase.co/functions/v1/millionproject-market-sync?ts=' + Date.now(), {
          cache: 'no-store'
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.json();
      } catch (e) {
        console.warn('market sync', e);
        return null;
      }
    }
    function closeTrade35() {
      document.getElementById('invModal')?.remove();
    }
    window.closeInvModal = closeTrade35;
    function tradePreview35() {
      const a = +(document.getElementById('iv_amount')?.value || 0), q1 = +(document.getElementById('iv_qty')?.value || 0), p = +(document.getElementById('iv_price')?.value || 0), e = document.getElementById('iv_preview');
      if (!e) return;
      if (!(a > 0) || !(q1 > 0)) {
        e.innerHTML = '<b>要建立持倉，投入金額與買入數量都必須填。</b><div class="tiny">成交價可留白，系統會用「投入金額 ÷ 數量」估算。</div>';
        return;
      }
      const implied = a / q1, trade = p > 0 ? p : implied, diff = p > 0 ? Math.abs(q1 * p - a) : 0;
      e.innerHTML = `<b>這筆會增加 ${q1.toLocaleString()} 股／單位</b><div class="tiny">實際成本均價 ${money35(implied)}${p > 0 ? ` · 成交價 ${money35(trade)}${diff > 1 ? ' · 投入金額與成交金額差額 ' + money35(diff) + ' 可視為手續費／其他成本' : ''}` : ' · 成交價將以投入金額 ÷ 數量估算'}</div>`;
    }
    window.mpInvTradePreview = tradePreview35;
    window.openInvestmentBuy = (pref = {})=>{
      try {
        closeTrade35();
        const date = String(pref.trade_date || pref.date || today35()).slice(0, 10), e = document.createElement('div');
        e.id = 'invModal';
        e.className = 'modal-backdrop';
        e.onclick = (ev)=>{
          if (ev.target === e) closeTrade35();
        };
        e.innerHTML = `<div class="modal"><div class="modal-head"><div><div class="section-kicker">INVESTMENT TRADE</div><h3 style="margin:3px 0">${pref.id ? '編輯投資交易' : '📈 記錄實際買入'}</h3></div><button type="button" class="btn ghost" onclick="closeInvModal()">關閉</button></div><input id="iv_tx_id" type="hidden" value="${esc35(pref.id || '')}"><input id="iv_fe_id" type="hidden" value="${esc35(pref.finance_entry_id || '')}"><input id="iv_plan_id" type="hidden" value="${esc35(pref.plan_id || pref.planId || '')}"><input id="iv_old_month" type="hidden" value="${esc35(String(pref.trade_date || pref.date || '').slice(0, 7))}"><div class="row3"><div class="field"><label>成交日期</label><input id="iv_date" type="date" max="${today35()}" value="${esc35(date)}"></div><div class="field"><label>標的代號</label><input id="iv_symbol" value="${esc35(pref.symbol || '')}" placeholder="例如 0050"></div><div class="field"><label>名稱</label><input id="iv_name" value="${esc35(pref.name || '')}" placeholder="例如 元大台灣50"></div></div><div class="row3" style="margin-top:10px"><div class="field"><label>實際投入／扣款金額</label><input id="iv_amount" type="number" min="0" step="any" inputmode="decimal" value="${pref.amount ?? ''}" oninput="mpInvTradePreview()"></div><div class="field"><label>買入數量 <b style="color:#dc2626">必填</b></label><input id="iv_qty" type="number" min="0" step="any" inputmode="decimal" value="${pref.quantity ?? pref.qty ?? ''}" oninput="mpInvTradePreview()"></div><div class="field"><label>成交價（可留白）</label><input id="iv_price" type="number" min="0" step="any" inputmode="decimal" value="${pref.trade_price ?? pref.price ?? ''}" oninput="mpInvTradePreview()"></div></div><div class="row" style="margin-top:10px"><div class="field"><label>策略</label><select id="iv_strategy">${[
          '核心ETF',
          '其他ETF',
          '個股',
          '債券／債券ETF',
          '其他投資'
        ].map((x)=>`<option ${String(pref.strategy || '核心ETF') === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div class="field"><label>備註</label><input id="iv_note" value="${esc35(pref.notes || pref.note || '')}" placeholder="例如：9 月定期定額"></div></div><div id="iv_preview" class="status-note" style="margin-top:10px"></div>${pref.finance_entry_id && !pref.id ? '<div class="status-note" style="margin-top:8px;border-color:#f59e0b;background:#fffbeb"><b>這是舊的投資金流。</b><div class="tiny">補上實際買入數量後，系統才會把它轉成正式交易並建立持倉。</div></div>' : ''}<div class="actions"><button type="button" class="btn main" id="iv_save_btn" onclick="saveInvestmentBuy()">${pref.id ? '儲存修改' : '儲存並同步持倉'}</button><button type="button" class="btn ghost" onclick="closeInvModal()">取消</button></div></div>`;
        document.body.appendChild(e);
        tradePreview35();
        setTimeout(()=>document.getElementById(pref.symbol ? 'iv_qty' : 'iv_symbol')?.focus(), 20);
      } catch (e) {
        alert('投資表單開啟失敗：' + e.message);
      }
    };
    window.saveInvestmentBuy = async ()=>{
      const btn = document.getElementById('iv_save_btn');
      try {
        if (typeof c === 'undefined' || typeof u === 'undefined' || !c || !u) return alert('請先登入');
        const id = document.getElementById('iv_tx_id')?.value || null, fe = document.getElementById('iv_fe_id')?.value || null, plan = document.getElementById('iv_plan_id')?.value || null, oldMonth = document.getElementById('iv_old_month')?.value || '', date = document.getElementById('iv_date')?.value || today35(), symbol = (document.getElementById('iv_symbol')?.value || '').trim().toUpperCase(), name = (document.getElementById('iv_name')?.value || '').trim(), amount = +(document.getElementById('iv_amount')?.value || 0), qty = +(document.getElementById('iv_qty')?.value || 0);
        let price = +(document.getElementById('iv_price')?.value || 0);
        const strategy = document.getElementById('iv_strategy')?.value || '核心ETF', notes = (document.getElementById('iv_note')?.value || '').trim();
        if (date > today35()) return alert('實際投資交易不能使用未來日期。');
        if (!symbol) return alert('請填標的代號');
        if (!(amount > 0)) return alert('請填實際投入金額');
        if (!(qty > 0)) return alert('請填實際買入數量；沒有數量就無法建立持倉與計算報酬。');
        if (!(price > 0)) price = amount / qty;
        if (!(price > 0)) return alert('成交價無法推算');
        if (btn) {
          btn.disabled = true;
          btn.textContent = '同步中…';
        }
        const { error } = await c.rpc('save_investment_trade', {
          p_id: id || null,
          p_finance_entry_id: fe || null,
          p_trade_date: date,
          p_symbol: symbol,
          p_name: name || symbol,
          p_strategy: strategy,
          p_amount: amount,
          p_quantity: qty,
          p_trade_price: price,
          p_notes: notes,
          p_plan_id: plan ? +plan : null
        });
        if (error) throw error;
        closeTrade35();
        const newMonth = date.slice(0, 7);
        await recalcMonth35(newMonth);
        if (oldMonth && oldMonth !== newMonth) await recalcMonth35(oldMonth);
        toast35('交易已儲存，正在更新官方收盤價');
        await syncMarket35();
        if (typeof render === 'function') await render();
        else if (typeof portfolio === 'function') await portfolio();
      } catch (e) {
        alert('投資交易儲存失敗：' + (e?.message || e));
      } finally{
        if (btn) {
          btn.disabled = false;
          btn.textContent = '儲存並同步持倉';
        }
      }
    };
    window.mpInvEditTrade = async (id)=>{
      try {
        const { data, error } = await c.from('investment_transactions').select('*').eq('user_id', u.id).eq('id', id).maybeSingle();
        if (error) throw error;
        if (data) openInvestmentBuy(data);
      } catch (e) {
        alert('讀取投資交易失敗：' + e.message);
      }
    };
    window.mpInvDeleteTrade = async (id)=>{
      if (!confirm('確定刪除這筆投資交易？\n\n會同步刪除對應的本月投資金流，並重新計算持股數量與平均成本。')) return;
      try {
        const { data: x } = await c.from('investment_transactions').select('trade_date').eq('user_id', u.id).eq('id', id).maybeSingle();
        const { error } = await c.rpc('delete_investment_trade', {
          p_id: id,
          p_finance_entry_id: null
        });
        if (error) throw error;
        await recalcMonth35(String(x?.trade_date || '').slice(0, 7));
        if (typeof render === 'function') await render();
        else await portfolio();
        toast35('投資交易已刪除，持倉已重算');
      } catch (e) {
        alert('刪除失敗：' + e.message);
      }
    };
    window.mpInvRepairLegacy = async (feid)=>{
      try {
        const { data: x, error } = await c.from('finance_entries').select('*').eq('user_id', u.id).eq('id', feid).maybeSingle();
        if (error) throw error;
        if (!x) return;
        const p = parseLegacy(x.note), symbol = (p.symbol || String(x.category || '').split('／')[0] || '').toUpperCase(), strategy = String(x.category || '').split('／')[1] || '核心ETF';
        openInvestmentBuy({
          finance_entry_id: x.id,
          trade_date: x.entry_date,
          symbol,
          amount: +x.amount || 0,
          qty: p.qty || '',
          price: p.price || '',
          strategy,
          notes: String(x.note || '').replace(/\[[^\]]+\]/g, '').trim()
        });
      } catch (e) {
        alert('讀取舊投資紀錄失敗：' + e.message);
      }
    };
    window.mpInvDeleteLegacy = async (feid)=>{
      if (!confirm('確定刪除這筆尚未建立持倉的投資金流？')) return;
      try {
        const { data: x } = await c.from('finance_entries').select('entry_date').eq('user_id', u.id).eq('id', feid).maybeSingle();
        const { error } = await c.rpc('delete_investment_trade', {
          p_id: null,
          p_finance_entry_id: feid
        });
        if (error) throw error;
        await recalcMonth35(String(x?.entry_date || '').slice(0, 7));
        if (typeof render === 'function') await render();
        else await portfolio();
      } catch (e) {
        alert('刪除失敗：' + e.message);
      }
    };
    function closeHolding35() {
      document.getElementById('holdModal')?.remove();
    }
    window.mpInvCloseHolding = closeHolding35;
    window.addHolding = ()=>window.mpInvHoldingModal(null);
    window.mpInvHoldingModal = async (id)=>{
      try {
        closeHolding35();
        let x = null, derived = false;
        if (id != null) {
          const { data, error } = await c.from('portfolio').select('*').eq('user_id', u.id).eq('id', id).maybeSingle();
          if (error) throw error;
          x = data;
          if (!x) return;
          derived = (+x.opening_quantity || 0) <= 0;
        }
        const e = document.createElement('div');
        e.id = 'holdModal';
        e.className = 'modal-backdrop';
        e.onclick = (ev)=>{
          if (ev.target === e) closeHolding35();
        };
        e.innerHTML = `<div class="modal"><div class="modal-head"><div><div class="section-kicker">OPENING POSITION</div><h3 style="margin:3px 0">${id ? '編輯舊持倉' : '＋ 新增舊持倉'}</h3></div><button type="button" class="btn ghost" onclick="mpInvCloseHolding()">關閉</button></div><input id="mh_id" type="hidden" value="${id ?? ''}"><input id="mh_derived" type="hidden" value="${derived ? '1' : '0'}">${derived ? '<div class="status-note"><b>這個持倉由交易紀錄自動產生。</b><div class="tiny">數量與成本必須從「投資交易」修改，避免直接改持倉造成帳務不一致；此處只能修改名稱、類別與備註。</div></div>' : ''}<div class="row3" style="margin-top:10px"><div class="field"><label>代號</label><input id="mh_symbol" value="${esc35(x?.symbol || '')}" ${id ? 'disabled' : ''} placeholder="例如 0050"></div><div class="field"><label>名稱</label><input id="mh_name" value="${esc35(x?.name || '')}"></div><div class="field"><label>類別</label><select id="mh_type">${[
          'ETF',
          '上市個股',
          '上櫃個股',
          '債券／債券ETF',
          'REIT／不動產',
          '其他'
        ].map((v)=>`<option ${String(x?.asset_type || 'ETF') === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div><div class="row3" style="margin-top:10px"><div class="field"><label>期初持有數量</label><input id="mh_qty" type="number" step="any" min="0" value="${derived ? '' : +x?.opening_quantity || +x?.quantity || ''}" ${derived ? 'disabled' : ''}></div><div class="field"><label>期初平均成本</label><input id="mh_cost" type="number" step="any" min="0" value="${derived ? '' : +x?.opening_avg_cost || +x?.avg_cost || ''}" ${derived ? 'disabled' : ''}></div><div class="field"><label>期初日期</label><input id="mh_date" type="date" max="${today35()}" value="${esc35(String(x?.opening_date || x?.as_of_date || today35()).slice(0, 10))}" ${derived ? 'disabled' : ''}></div></div><div class="field" style="margin-top:10px"><label>備註</label><input id="mh_notes" value="${esc35(x?.notes || '')}"></div><div class="status-note" style="margin-top:10px"><b>舊持倉只用來設定開始使用 millionproject 前已存在的部位。</b><div class="tiny">之後的買入請一律使用「記錄投資」，系統才會自動重算成本與損益。</div></div><div class="actions"><button type="button" class="btn main" onclick="mpInvSaveHolding()">儲存</button>${id ? '<button type="button" class="btn danger-btn" onclick="mpInvDeleteHolding(' + id + ')">刪除／移除期初部位</button>' : ''}<button type="button" class="btn ghost" onclick="mpInvCloseHolding()">取消</button></div></div>`;
        document.body.appendChild(e);
      } catch (e) {
        alert('舊持倉表單載入失敗：' + e.message);
      }
    };
    window.editHolding = (id)=>window.mpInvHoldingModal(id);
    window.mpInvSaveHolding = async ()=>{
      try {
        const id = document.getElementById('mh_id')?.value || null, derived = document.getElementById('mh_derived')?.value === '1', symbol = (document.getElementById('mh_symbol')?.value || '').trim().toUpperCase(), name = (document.getElementById('mh_name')?.value || '').trim(), type = document.getElementById('mh_type')?.value || 'ETF', notes = (document.getElementById('mh_notes')?.value || '').trim();
        if (derived && id) {
          const { error } = await c.from('portfolio').update({
            name: name || symbol,
            asset_type: type,
            notes,
            updated_at: new Date().toISOString()
          }).eq('user_id', u.id).eq('id', id);
          if (error) throw error;
        } else {
          const qty = +(document.getElementById('mh_qty')?.value || 0), cost = +(document.getElementById('mh_cost')?.value || 0), date = document.getElementById('mh_date')?.value || today35();
          if (!symbol || !(qty > 0) || cost < 0) return alert('請填代號、期初數量與平均成本');
          const { error } = await c.rpc('save_opening_holding', {
            p_id: id ? +id : null,
            p_symbol: symbol,
            p_name: name || symbol,
            p_asset_type: type,
            p_quantity: qty,
            p_avg_cost: cost,
            p_opening_date: date,
            p_notes: notes
          });
          if (error) throw error;
        }
        closeHolding35();
        await syncMarket35();
        if (typeof render === 'function') await render();
        else await portfolio();
      } catch (e) {
        alert('舊持倉儲存失敗：' + e.message);
      }
    };
    window.mpInvDeleteHolding = async (id)=>{
      try {
        const { data: h, error: e1 } = await c.from('portfolio').select('symbol,opening_quantity').eq('user_id', u.id).eq('id', id).maybeSingle();
        if (e1) throw e1;
        if (!h) return;
        const { count, error: e2 } = await c.from('investment_transactions').select('id', {
          count: 'exact',
          head: true
        }).eq('user_id', u.id).eq('symbol', String(h.symbol || '').toUpperCase());
        if (e2) throw e2;
        if ((+h.opening_quantity || 0) <= 0 && (count || 0) > 0) return alert('這個持倉由投資交易產生，不能直接刪除。請到「本月投了什麼」編輯或刪除實際交易，持倉會自動重算。');
        const msg = (count || 0) > 0 ? '這會移除「期初舊持倉」，但保留 millionproject 內的實際交易並重新計算持倉。確定？' : '確定刪除這筆舊持倉？';
        if (!confirm(msg)) return;
        const { error } = await c.rpc('delete_opening_holding', {
          p_id: +id
        });
        if (error) throw error;
        closeHolding35();
        if (typeof render === 'function') await render();
        else await portfolio();
      } catch (e) {
        alert('刪除持倉失敗：' + e.message);
      }
    };
    window.deleteHolding = (id)=>window.mpInvDeleteHolding(id);
    window.mpInvSyncPrices = async ()=>{
      const b = document.getElementById('mp-inv-sync');
      try {
        if (b) {
          b.disabled = true;
          b.textContent = '更新中…';
        }
        const r = await syncMarket35();
        if (!r?.ok && r?.message !== 'No symbols to sync') throw new Error(r?.message || '更新失敗');
        if (typeof render === 'function') await render();
        else await portfolio();
        toast35(r?.synced ? `已更新 ${r.synced} 檔官方收盤價` : '目前沒有可同步的持倉標的');
      } catch (e) {
        alert('行情更新失敗：' + e.message);
      } finally{
        if (b) {
          b.disabled = false;
          b.textContent = '↻ 更新官方價格';
        }
      }
    };
    window.mpRunPlan = (id, symbol, gap)=>{
      if (gap > 0) openInvestmentBuy({
        planId: id,
        symbol,
        amount: Math.round(gap),
        strategy: '核心ETF',
        notes: '定期定額計畫'
      });
    };
    async function portfolio35() {
      const app = document.getElementById('app');
      if (!app) return;
      try {
        const m = month35(), holdings = typeof q === 'function' ? await q('portfolio', {
          order: 'updated_at'
        }) : [];
        const { data: trades, error: te } = await c.from('investment_transactions').select('*').eq('user_id', u.id).gte('trade_date', m + '-01').lte('trade_date', m + '-31').order('trade_date', {
          ascending: false
        }).order('created_at', {
          ascending: false
        });
        if (te) throw te;
        const all = typeof q === 'function' ? await q('finance_entries', {
          order: 'entry_date'
        }) : [], invEntries = all.filter((x)=>String(x.month || '').slice(0, 7) === m && x.entry_type === 'investment'), linked = new Set((trades || []).map((x)=>String(x.finance_entry_id || '')).filter(Boolean)), legacy = invEntries.filter((x)=>!linked.has(String(x.id)));
        const { data: prices } = await c.from('market_prices').select('*').order('price_date', {
          ascending: false
        }), priceMap = new Map();
        (prices || []).forEach((p)=>{
          const k = String(p.symbol || '').toUpperCase();
          if (!priceMap.has(k)) priceMap.set(k, p);
        });
        let totalCost = 0, totalValue = 0, latestDate = '';
        const holdingRows = holdings.map((h)=>{
          const qty = +h.quantity || 0, cost = qty * (+h.avg_cost || 0), mp = priceMap.get(String(h.symbol || '').toUpperCase()), price = +(mp?.close_price ?? h.current_price ?? 0) || 0, date = String(mp?.price_date || h.as_of_date || '').slice(0, 10), val = qty * price, pnl = val - cost, pct = cost ? pnl / cost * 100 : 0;
          totalCost += cost;
          totalValue += val;
          if (date > latestDate) latestDate = date;
          return `<tr><td><b>${esc35(h.symbol)}</b><br><span class="tiny">${esc35(h.name || '')}</span></td><td>${qty.toLocaleString()}</td><td>${money35(h.avg_cost)}</td><td>${price ? money35(price) : '—'}<br><span class="tiny">${date || '尚無行情'}</span></td><td>${price ? money35(val) : '—'}</td><td class="${pnl >= 0 ? 'up' : 'down'}">${price ? (pnl >= 0 ? '+' : '') + money35(pnl) + '<br><span class="tiny">' + (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%</span>' : '—'}</td><td><button class="btn ghost" onclick="editHolding('${h.id}')">編輯</button> <button class="btn danger-btn" onclick="deleteHolding('${h.id}')">刪除</button></td></tr>`;
        }).join(''), pnl = totalValue - totalCost, pct = totalCost ? pnl / totalCost * 100 : 0;
        let snap = {
          saving: 0,
          investment: invEntries.reduce((s, x)=>s + (+x.amount || 0), 0),
          remaining: 0,
          plan: {
            core: 0,
            emergency: 0
          }
        };
        try {
          if (typeof smartMonthSnapshot === 'function') snap = await smartMonthSnapshot(m);
        } catch (_) {}
        const coreTarget = +snap.plan?.core || 0, coreGap = Math.max(0, coreTarget - (+snap.investment || 0)), pctDone = coreTarget ? Math.min(100, (+snap.investment || 0) / coreTarget * 100) : 0, tradeRows = (trades || []).map((x)=>`<div class="txn mp35-txn"><div>${esc35(String(x.trade_date || '').slice(5, 10))}</div><div class="symbol">${esc35(x.symbol)}</div><div><b>${esc35(x.name || x.strategy || '')}</b><div class="tiny">${(+x.quantity || 0).toLocaleString()} 股／單位 · 成交 ${money35(x.trade_price)} · 實際投入 ${money35(x.amount)}</div></div><div class="amt" style="text-align:right"><b>${money35(x.amount)}</b><div class="actions" style="justify-content:flex-end;margin-top:5px"><button class="btn ghost" onclick="mpInvEditTrade('${x.id}')">編輯</button><button class="btn danger-btn" onclick="mpInvDeleteTrade('${x.id}')">刪除</button></div></div></div>`).join(''), legacyRows = legacy.map((x)=>{
          const p = parseLegacy(x.note), sym = p.symbol || String(x.category || '').split('／')[0] || '投資';
          return `<div class="txn mp35-txn mp35-legacy"><div>${esc35(String(x.entry_date || '').slice(5, 10))}</div><div class="symbol">${esc35(sym)}</div><div><b>${esc35(x.category || '舊投資金流')}</b><div class="tiny">只有投入金額，尚未建立可計算的持倉。</div></div><div class="amt" style="text-align:right"><b>${money35(x.amount)}</b><div class="actions" style="justify-content:flex-end;margin-top:5px"><button class="btn soft" onclick="mpInvRepairLegacy('${x.id}')">補成交資料</button><button class="btn danger-btn" onclick="mpInvDeleteLegacy('${x.id}')">刪除</button></div></div></div>`;
        }).join('');
        app.innerHTML = `<section class="grid g4"><div class="metric"><div class="label">持倉成本</div><div class="num">${money35(totalCost)}</div></div><div class="metric"><div class="label">目前市值</div><div class="num">${money35(totalValue)}</div></div><div class="metric"><div class="label">未實現損益</div><div class="num ${pnl >= 0 ? 'up' : 'down'}">${pnl >= 0 ? '+' : ''}${money35(pnl)}</div></div><div class="metric"><div class="label">未實現報酬率</div><div class="num ${pct >= 0 ? 'up' : 'down'}">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</div><div class="tiny">未含配息</div></div></section><section class="card mp35-market" style="margin-top:14px"><div class="split"><div><div class="section-kicker">OFFICIAL CLOSE · TWSE / TPEX</div><h3 style="margin:3px 0">官方盤後行情</h3><div class="tiny">${latestDate ? '持倉價格截至 ' + latestDate + ' 收盤' : '建立持倉後會自動抓最近交易日官方收盤價'} · 交易日 17:45 自動同步</div></div><button id="mp-inv-sync" class="btn ghost" onclick="mpInvSyncPrices()">↻ 更新官方價格</button></div></section><section class="month-plan" style="margin-top:14px"><div class="card"><div class="section-title"><div><div class="section-kicker">SMART MONTHLY INVESTING</div><h3>📈 ${m} 投資執行</h3></div><button class="btn main" onclick="openInvestmentBuy()">＋ 記錄實際買入</button></div><div class="smart-grid" style="grid-template-columns:repeat(3,1fr)"><div class="smart-card"><div class="title">建議核心投入</div><div class="value">${money35(coreTarget)}</div></div><div class="smart-card"><div class="title">本月已投入</div><div class="value">${money35(snap.investment)}</div></div><div class="smart-card"><div class="title">還差</div><div class="value">${money35(coreGap)}</div></div></div><div class="progress-line" style="margin-top:12px"><i style="width:${pctDone}%"></i></div><div class="status-note" style="margin-top:12px"><b>計畫 ≠ 成交。</b><div class="tiny">定期定額只代表「預計投入」；只有真正記錄買入數量後，才會形成持倉並計算損益。</div></div></div></section><section class="card" style="margin-top:14px"><div class="section-title"><div><div class="section-kicker">INVESTMENT LEDGER</div><h3>本月投了什麼</h3><div class="tiny">每一筆真實交易都可以編輯或刪除；持倉會自動重建。</div></div></div>${tradeRows}${legacyRows}${!tradeRows && !legacyRows ? '<div class="empty">本月還沒有投資交易。</div>' : ''}</section><section class="card" style="margin-top:14px"><div class="split"><div><div class="section-kicker">PORTFOLIO</div><h3>目前持倉</h3><div class="tiny">舊持倉是期初部位；之後的數量與成本由交易紀錄自動計算。</div></div><button class="btn ghost" onclick="addHolding()">＋ 新增舊持倉</button></div><div class="scroll" style="margin-top:12px"><table class="table"><tr><th>標的</th><th>數量</th><th>均價</th><th>官方收盤</th><th>市值</th><th>損益／報酬</th><th>操作</th></tr>${holdingRows || '<tr><td colspan="7" class="empty">尚無持倉。可以補舊持倉，或從上方記錄第一筆實際買入。</td></tr>'}</table></div></section>`;
      } catch (e) {
        app.innerHTML = `<section class="card"><h3>投資組合載入失敗</h3><div class="tiny">${esc35(e?.message || e)}</div></section>`;
      }
    }
    window.mpInvestmentPortfolio = portfolio35;
    window.portfolio = portfolio35;
    try {
      portfolio = portfolio35;
    } catch (_) {}
    const css = `.mp35-txn{grid-template-columns:64px 100px minmax(220px,1fr) minmax(190px,auto)!important;align-items:center}.mp35-legacy{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:10px}.mp35-market{border-color:#bfdbfe;background:linear-gradient(135deg,#f8fbff,#fff)}@media(max-width:720px){.mp35-txn{grid-template-columns:52px 72px 1fr!important}.mp35-txn>.amt{grid-column:2/-1;text-align:left!important}.mp35-txn>.amt .actions{justify-content:flex-start!important}.mp35-market .split{align-items:flex-start}.mp35-market .btn{flex:0 0 auto}}`, st = document.createElement('style');
    st.id = 'mp-investment35-style';
    st.textContent = css;
    document.head.appendChild(st);
    setTimeout(()=>{
      let t = '';
      try {
        t = tab;
      } catch (_) {}
      if (t === 'p') portfolio35();
    }, 160);
  })();
