
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
    const today35 = ()=>MPCardModel.today();
    const month35 = ()=>today35().slice(0,7);
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
    let tradeContext=null,tradeBusy=false,tradeOpening=false;
    const decimal35=n=>'NT$'+Number(n||0).toLocaleString('zh-TW',{maximumFractionDigits:4});
    const field35=id=>document.getElementById(id);
    function closeTrade35(){if(tradeBusy)return;field35('invModal')?.remove();tradeContext=null;}
    window.closeInvModal=closeTrade35;
    function tradeInput35(){
      return {side:field35('iv_side').value,date:field35('iv_date').value,symbol:field35('iv_symbol').value.trim().toUpperCase(),
        qty:Number(field35('iv_qty').value),price:Number(field35('iv_price').value),amount:Number(field35('iv_amount').value),
        fees:Number(field35('iv_fees').value),tax:Number(field35('iv_tax').value),sequence:Number(field35('iv_sequence').value)};
    }
    window.mpInvTradeSide=()=>{
      const sell=field35('iv_side').value==='sell';
      field35('iv_sell_fields').hidden=!sell;
      field35('iv_amount_label').textContent=sell?'扣費後應收／實收金額':'實際投入／扣款金額';
      field35('iv_quantity_label').textContent=sell?'賣出數量':'買入數量';
      field35('iv_price_label').textContent=sell?'實際成交價（必填）':'成交價（可留白）';
      field35('iv_title').textContent=(tradeContext?.pref.id?'編輯':'記錄實際')+(sell?'賣出':'買入');
      window.mpInvTradePreview();
    };
    window.mpInvTradeOrder=()=>{
      if(!tradeContext)return;
      const date=field35('iv_date').value,symbol=field35('iv_symbol').value.trim().toUpperCase();
      const rows=tradeContext.trades.filter(t=>t.id!==tradeContext.pref.id&&t.trade_date===date&&t.symbol.toUpperCase()===symbol);
      if(!tradeContext.pref.id)field35('iv_sequence').value=1+Math.max(0,...rows.map(t=>Number(t.trade_sequence)||1));
      window.mpInvTradePreview();
    };
    window.mpInvCalculateNet=()=>{
      const x=tradeInput35();
      if(field35('iv_fees').value===''||field35('iv_tax').value===''){field35('iv_error').textContent='請填券商手續費與交易稅，沒有請填 0';return;}
      if(x.qty>0&&x.price>0&&x.side==='sell')field35('iv_amount').value=(x.qty*x.price-x.fees-x.tax).toFixed(2);
      window.mpInvTradePreview();
    };
    window.mpInvSettlement=()=>{field35('iv_settlement').disabled=!field35('iv_settled').checked;window.mpInvTradePreview()};
    window.mpInvTradePreview=()=>{
      const e=field35('iv_preview');if(!e||!tradeContext)return;
      const x=tradeInput35(),sell=x.side==='sell';
      const holding=tradeContext.holdings.find(h=>h.symbol.toUpperCase()===x.symbol);
      if(!(x.qty>0)||!(x.amount>0)){
        e.innerHTML=sell?`<b>請填賣出數量、成交價及扣費後淨額。</b><div class="tiny">目前帳面持股 ${Number(holding?.quantity||0).toLocaleString()}；回補歷史交易時，系統以成交當時可用數量檢查。</div>`:'<b>請填實際扣款金額與買入數量。</b><div class="tiny">成本包含實際扣款中的費用；成交價留白時，以扣款金額 ÷ 數量估算。</div>';
        return;
      }
      e.innerHTML=sell?`<b>這筆賣出 ${x.qty.toLocaleString()} 股／單位，淨額 ${money35(x.amount)}</b><div class="tiny">成交總額 ${decimal35(x.qty*x.price)} − 手續費 ${decimal35(x.fees)} − 交易稅 ${decimal35(x.tax)}。${field35('iv_settled').checked?'依填寫的實際入帳日增加現金，不列薪資或生活收入。':'先列待入帳交割款，保留在資產中，不列日常可用現金。'}</div><div class="tiny">儲存後依移動平均成本重算已實現損益；不代表券商指定庫存批次的損益。</div>`:`<b>這筆增加 ${x.qty.toLocaleString()} 股／單位</b><div class="tiny">含費用成本均價 ${decimal35(x.amount/x.qty)}；買入不會直接產生收益。</div>`;
    };
    window.openInvestmentBuy=async(pref={})=>{
      if(tradeBusy||tradeOpening)return;tradeOpening=true;
      try{
        const userId=u?.id;if(!userId)throw new Error('請先登入');
        const [trades,holdings]=await Promise.all([readMoneyTable('investment_transactions','trade_date'),readMoneyTable('portfolio','updated_at')]);
        if(u?.id!==userId)throw new Error('登入狀態已變更');
        closeTrade35();tradeContext={pref,userId,trades,holdings,requestId:crypto.randomUUID()};
        const date=String(pref.trade_date||pref.date||today35()).slice(0,10),sell=pref.side==='sell',e=document.createElement('div');e.id='invModal';e.className='modal-backdrop';
        e.onclick=ev=>{if(ev.target===e)closeTrade35()};
        e.innerHTML=`<div class="modal mp-trade-dialog" role="dialog" aria-modal="true" aria-labelledby="iv_title"><div class="modal-head"><div><div class="section-kicker">INVESTMENT TRADE</div><h3 id="iv_title"></h3></div><button class="btn ghost" onclick="closeInvModal()">關閉</button></div>
        <div class="row3"><div class="field"><label>買賣方向</label><select id="iv_side" onchange="mpInvTradeSide()" ${pref.id||pref.finance_entry_id||pref.plan_id||pref.planId?'disabled':''}><option value="buy" ${!sell?'selected':''}>買入</option><option value="sell" ${sell?'selected':''}>賣出</option></select></div><div class="field"><label>成交日期</label><input id="iv_date" type="date" max="${today35()}" value="${esc35(date)}" onchange="mpInvTradeOrder()"></div><div class="field"><label>同日成交順序</label><input id="iv_sequence" type="number" min="1" max="1000000" step="1" value="${Number(pref.trade_sequence)||1}"><small class="tiny">同標的同一天：先成交填較小數字</small></div></div>
        <div class="row" style="margin-top:10px"><div class="field"><label>標的代號</label><input id="iv_symbol" value="${esc35(pref.symbol||'')}" list="iv_symbols" placeholder="例如 0050" onchange="mpInvTradeOrder()"><datalist id="iv_symbols">${holdings.map(h=>`<option value="${esc35(h.symbol)}">${esc35(h.name)} · ${Number(h.quantity||0).toLocaleString()} 股</option>`).join('')}</datalist></div><div class="field"><label>名稱</label><input id="iv_name" value="${esc35(pref.name||'')}" placeholder="例如 元大台灣50"></div></div>
        <div class="row3" style="margin-top:10px"><div class="field"><label id="iv_quantity_label"></label><input id="iv_qty" type="number" min="0" step="any" inputmode="decimal" value="${pref.quantity??pref.qty??''}" oninput="mpInvTradePreview()"></div><div class="field"><label id="iv_price_label"></label><input id="iv_price" type="number" min="0" step="any" inputmode="decimal" value="${pref.trade_price??pref.price??''}" oninput="mpInvTradePreview()"></div><div class="field"><label id="iv_amount_label"></label><input id="iv_amount" type="number" min="0" step="0.01" inputmode="decimal" value="${pref.amount??''}" oninput="mpInvTradePreview()"></div></div>
        <section id="iv_sell_fields" class="status-note" style="margin-top:12px"><div class="row3"><div class="field"><label>手續費</label><input id="iv_fees" type="number" min="0" step="0.01" inputmode="decimal" value="${pref.fees??''}" oninput="mpInvTradePreview()"></div><div class="field"><label>交易稅</label><input id="iv_tax" type="number" min="0" step="0.01" inputmode="decimal" value="${pref.tax??''}" oninput="mpInvTradePreview()"></div><button class="btn ghost" type="button" onclick="mpInvCalculateNet()">計算扣費後淨額</button></div><p class="tiny">請依券商成交明細填寫費用，淨額可依券商取整結果調整。</p><label class="mp-trade-check"><input id="iv_settled" type="checkbox" ${pref.settlement_date?'checked':''} onchange="mpInvSettlement()">賣出款項已實際入帳</label><div class="field"><label>實際入帳日（未入帳先留白）</label><input id="iv_settlement" type="date" max="${today35()}" value="${esc35(pref.settlement_date||'')}" ${pref.settlement_date?'':'disabled'}></div></section>
        <div class="row" style="margin-top:10px"><div class="field"><label>策略</label><select id="iv_strategy">${['核心ETF','其他ETF','個股','債券／債券ETF','其他投資'].map(x=>`<option ${String(pref.strategy||'核心ETF')===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>備註</label><input id="iv_note" maxlength="1000" value="${esc35(pref.notes||pref.note||'')}" placeholder="例如：分批獲利了結"></div></div>
        <div id="iv_preview" class="status-note" style="margin-top:12px"></div><p id="iv_error" class="danger" role="alert"></p><div class="actions"><button type="button" class="btn main" id="iv_save_btn" onclick="saveInvestmentBuy()">儲存並同步持倉</button><button class="btn ghost" onclick="closeInvModal()">取消</button></div></div>`;
        document.body.appendChild(e);window.mpInvTradeSide();window.mpInvTradeOrder();
        field35(pref.symbol?'iv_qty':'iv_symbol')?.focus();
      }catch(e){alert('投資表單開啟失敗：'+e.message)}finally{tradeOpening=false}
    };
    window.openInvestmentSell=async holdingId=>{
      if(holdingId==null)return window.openInvestmentBuy({side:'sell'});
      try{const {data,error}=await c.from('portfolio').select('*').eq('user_id',u.id).eq('id',holdingId).maybeSingle();if(error)throw error;if(!data)throw new Error('持倉已不存在');return window.openInvestmentBuy({side:'sell',symbol:data.symbol,name:data.name})}catch(e){alert(e.message)}
    };
    window.saveInvestmentBuy=async()=>{
      if(tradeBusy||!tradeContext)return;
      const context=tradeContext,btn=field35('iv_save_btn');
      try{
        if(u?.id!==context.userId)throw new Error('登入狀態已變更，請重新開啟');
        const x=tradeInput35(),sell=x.side==='sell';MPCardModel.parts(x.date);
        if(x.date>today35())throw new Error('不可登錄未來成交');
        if(!/^[A-Z0-9][A-Z0-9._-]{0,29}$/.test(x.symbol))throw new Error('請填有效標的代號');
        if(![x.amount,x.qty].every(n=>Number.isFinite(n)&&n>0))throw new Error('請填有效金額與數量');
        if(sell&&!(Number.isFinite(x.price)&&x.price>0))throw new Error('賣出需填實際成交價');
        if(!sell&&!(x.price>0))x.price=x.amount/x.qty;
        const settlement=sell?(field35('iv_settled').checked?field35('iv_settlement').value:null):x.date;
        if(sell&&field35('iv_settled').checked&&(!settlement||settlement<x.date||settlement>today35()))throw new Error('請填成交日至今天之間的實際入帳日；未入帳請取消勾選');
        if(sell&&(field35('iv_fees').value===''||field35('iv_tax').value===''))throw new Error('請填券商手續費與交易稅，沒有請填 0');
        if(sell&&(![x.fees,x.tax].every(n=>Number.isFinite(n)&&n>=0)||Math.abs(x.amount-(x.qty*x.price-x.fees-x.tax))>1))throw new Error('請核對淨額＝成交總額－手續費－交易稅，或按「計算扣費後淨額」');
        if(!Number.isInteger(x.sequence)||x.sequence<1)throw new Error('同日成交順序需為正整數');
        tradeBusy=true;btn.disabled=true;btn.textContent='同步中…';field35('iv_error').textContent='';
        const {error}=await c.rpc('save_investment_trade_v2',{
          p_id:context.pref.id||null,p_finance_entry_id:context.pref.finance_entry_id||null,p_trade_date:x.date,p_symbol:x.symbol,
          p_name:field35('iv_name').value.trim()||x.symbol,p_strategy:field35('iv_strategy').value,p_amount:x.amount,p_quantity:x.qty,p_trade_price:x.price,p_notes:field35('iv_note').value.trim(),
          p_plan_id:sell?null:context.pref.plan_id||context.pref.planId||null,p_side:x.side,p_fees:sell?x.fees:Math.max(0,x.amount-x.qty*x.price),p_tax:sell?x.tax:0,p_settlement_date:settlement,p_trade_sequence:x.sequence,p_expected_updated_at:context.pref.updated_at||null,p_request_id:context.requestId
        });
        if(error)throw error;
        window.mpInvalidateQueries?.();tradeBusy=false;closeTrade35();
        toast35(sell?'賣出已儲存，持倉及損益已重算':'買入已儲存，持倉已重算');
        if(!sell)await syncMarket35();
        if(typeof render==='function')await render();else await portfolio();
      }catch(e){if(field35('iv_error'))field35('iv_error').textContent='儲存失敗：'+(e.message||e);else alert(e.message||e)}finally{tradeBusy=false;if(btn){btn.disabled=false;btn.textContent='儲存並同步持倉'}}
    };
    window.mpInvEditTrade=async id=>{
      try{const {data,error}=await c.from('investment_transactions').select('*').eq('user_id',u.id).eq('id',id).maybeSingle();if(error)throw error;if(!data)throw new Error('交易已不存在');await window.openInvestmentBuy(data)}catch(e){alert('讀取交易失敗：'+e.message)}
    };
    window.mpInvConfirmSettlement=async id=>{
      await window.mpInvEditTrade(id);
      if(tradeContext?.pref.id!==id)return;
      field35('iv_settled').checked=true;field35('iv_settlement').value=today35();window.mpInvSettlement();field35('iv_settlement').focus();
    };
    window.mpInvDeleteTrade=async id=>{
      try{
        const {data,error}=await c.from('investment_transactions').select('*').eq('user_id',u.id).eq('id',id).maybeSingle();if(error)throw error;if(!data)throw new Error('交易已不存在');
        if(!confirm(`刪除 ${data.trade_date} ${data.symbol} ${data.side==='sell'?'賣出':'買入'} ${Number(data.quantity)} 股？\n將同步移除金流並重算後續持股與已實現損益；若導致超賣，整筆取消。`))return;
        const r=await c.rpc('delete_investment_trade_v2',{p_id:id,p_expected_updated_at:data.updated_at});if(r.error)throw r.error;
        window.mpInvalidateQueries?.();if(typeof render==='function')await render();else await portfolio();toast35('交易已刪除，持倉與損益已重算');
      }catch(e){alert('刪除失敗：'+e.message)}
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
    let investmentViewMonth=null,investmentRenderRevision=0;
    async function portfolio35(){
      const app=document.getElementById('app');if(!app)return;
      const revision=++investmentRenderRevision,userId=u?.id;
      try{
        const m=month35();
        const [holdings,allTrades,all,pays,cards,statements,reconciliations]=await Promise.all([readMoneyTable('portfolio','updated_at'),readMoneyTable('investment_transactions','trade_date'),readMoneyTable('finance_entries','entry_date'),readMoneyTable('credit_card_payments','payment_date'),readMoneyTable('credit_cards','created_at'),readMoneyTable('credit_card_statements','cycle_end'),readMoneyTable('cash_reconciliations','balance_date'),loadEmergencyGoal()]);
        const trades=allTrades.filter(t=>t.trade_date.slice(0,7)===m),linked=new Set(allTrades.map(t=>String(t.finance_entry_id||'')));
        const legacy=all.filter(x=>x.entry_type==='investment'&&!linked.has(String(x.id)));
        const pending=allTrades.filter(t=>t.side==='sell'&&!t.settlement_date);
        const realized=allTrades.filter(t=>t.side==='sell').reduce((sum,t)=>sum+Number(t.realized_pnl||0),0);
        const saleCash=all.filter(t=>t.entry_type==='investment_sale'&&String(t.entry_date).startsWith(m)).reduce((sum,t)=>sum+Number(t.amount||0),0);
        const {data:prices,error:priceError}=holdings.length?await c.from('market_prices').select('*').in('symbol',holdings.map(h=>h.symbol)).order('price_date',{ascending:false}):{data:[],error:null};
        if(priceError)throw priceError;
        const priceMap=new Map();(prices||[]).forEach(p=>{if(!priceMap.has(p.symbol.toUpperCase()))priceMap.set(p.symbol.toUpperCase(),p)});
        let totalCost=0,totalValue=0,latestDate='';
        const holdingRows=holdings.filter(h=>Number(h.quantity)>0).map(h=>{
          const qty=Number(h.quantity),cost=qty*Number(h.avg_cost||0),mp=priceMap.get(h.symbol.toUpperCase()),price=Number(mp?.close_price??h.current_price??0),date=String(mp?.price_date||h.as_of_date||'').slice(0,10),val=qty*price,pnl=val-cost,pct=cost?pnl/cost*100:0;
          totalCost+=cost;totalValue+=val;if(date>latestDate)latestDate=date;
          return `<tr><td><b>${esc35(h.symbol)}</b><br><small>${esc35(h.name||'')}</small></td><td>${qty.toLocaleString()}</td><td>${decimal35(h.avg_cost)}</td><td>${price?decimal35(price):'—'}<br><small>${date||'尚無行情'}</small></td><td>${price?money35(val):'—'}</td><td class="${pnl>=0?'up':'down'}">${price?money35(pnl)+'<br><small>'+pct.toFixed(2)+'%</small>':'—'}</td><td><div class="actions"><button class="btn main" onclick="openInvestmentSell('${h.id}')">賣出</button><button class="btn ghost" onclick="editHolding('${h.id}')">持倉設定</button></div></td></tr>`;
        }).join('');
        const pnl=totalValue-totalCost;
        const finance=MPFinanceModel.ledger({month:m,entries:all,payments:pays,cards,statements,reconciliations});
        const coreTarget=MPFinanceModel.rolling(finance,getBudgetProfile(),getEmergencyGoalCached()).core;
        if(revision!==investmentRenderRevision||u?.id!==userId)return;
        const months=[...new Set([m,...allTrades.map(t=>t.trade_date.slice(0,7)),...legacy.map(t=>String(t.entry_date).slice(0,7))])].sort().reverse();
        if(!investmentViewMonth||(!months.includes(investmentViewMonth)&&investmentViewMonth!=='all'))investmentViewMonth=m;
        window.mpInvRenderHistory=(month=investmentViewMonth,page=0)=>{
          if(u?.id!==userId)return;investmentViewMonth=month;
          const rows=[...allTrades.map(t=>({...t,legacy:false})),...legacy.map(t=>({...t,trade_date:t.entry_date,legacy:true,side:'buy'}))].filter(t=>month==='all'||t.trade_date.startsWith(month)).sort((a,b)=>b.trade_date.localeCompare(a.trade_date)||(Number(b.trade_sequence)||1)-(Number(a.trade_sequence)||1)||String(b.created_at).localeCompare(String(a.created_at)));
          const pages=Math.max(1,Math.ceil(rows.length/8));page=Math.max(0,Math.min(pages-1,Number(page)||0));
          field35('mp-inv-history').innerHTML=rows.slice(page*8,page*8+8).map(t=>{
            const sell=t.side==='sell',buttons=t.legacy?`<button class="btn ghost" onclick="mpInvRepairLegacy('${t.id}')">補成交資料</button><button class="btn danger-btn" onclick="mpInvDeleteLegacy('${t.id}')">刪除</button>`:`<button class="btn ghost" onclick="mpInvEditTrade('${t.id}')">${sell&&!t.settlement_date?'確認入帳／編輯':'編輯'}</button><button class="btn danger-btn" onclick="mpInvDeleteTrade('${t.id}')">刪除</button>`;
            return `<article class="mp-trade-row"><div><span class="pill ${sell?'watch':'buy'}">${sell?'賣出':'買入'}</span><b>${esc35(t.symbol||t.category)}</b><small>${esc35(t.trade_date)}${!t.legacy?' · 同日順序 '+(Number(t.trade_sequence)||1):''}</small><p>${t.legacy?'尚未建立持倉，請補成交資料':Number(t.quantity).toLocaleString()+' 股／單位 · 成交 '+decimal35(t.trade_price)}</p>${sell?`<p>成本 ${money35(t.cost_basis)} · 已實現損益 <b class="${Number(t.realized_pnl)>=0?'up':'down'}">${money35(t.realized_pnl)}</b></p><small>手續費 ${decimal35(t.fees)} · 交易稅 ${decimal35(t.tax)} · ${t.settlement_date?'入帳 '+esc35(t.settlement_date):'交割款待入帳'}</small>`:''}</div><div><strong>${sell?'淨收 ':'投入 '}${money35(t.amount)}</strong><div class="actions">${buttons}</div></div></article>`;
          }).join('')||'<p class="empty">這個月份尚無買賣紀錄。</p>';
          field35('mp-inv-pager').innerHTML=`<span>${rows.length} 筆 · ${page+1} / ${pages}</span><button class="btn ghost" ${page===0?'disabled':''} onclick="mpInvRenderHistory('${month}',${page-1})">上一頁</button><button class="btn ghost" ${page===pages-1?'disabled':''} onclick="mpInvRenderHistory('${month}',${page+1})">下一頁</button>`;
        };
        app.innerHTML=`<section class="card"><div class="split"><div><div class="section-kicker">INVESTMENT</div><h2>持倉與買賣</h2><p class="tiny">記錄已成交交易；計畫不等於成交。賣出後，持股與損益一起更新。</p></div><div class="actions"><button class="btn main" onclick="openInvestmentBuy()">＋ 記錄買入</button><button class="btn ghost" onclick="openInvestmentSell()">－ 記錄賣出</button></div></div></section>
        <section class="grid g4" style="margin-top:14px"><div class="metric"><div class="label">目前持倉市值</div><div class="num">${money35(totalValue)}</div><div class="tiny">剩餘成本 ${money35(totalCost)}</div></div><div class="metric"><div class="label">持倉未實現損益</div><div class="num ${pnl>=0?'up':'down'}">${money35(pnl)}</div><div class="tiny">未含配息</div></div><div class="metric"><div class="label">累計賣出已實現損益</div><div class="num ${realized>=0?'up':'down'}">${money35(realized)}</div><div class="tiny">含實際賣出費稅；移動平均成本</div></div><div class="metric"><div class="label">賣出待入帳款</div><div class="num">${money35(pending.reduce((s,t)=>s+Number(t.amount),0))}</div><div class="tiny">屬於資產；尚不可用於日常花費</div></div></section>
        ${pending.length?`<section class="card" style="margin-top:14px"><h3>確認交割款入帳</h3><p class="tiny">以銀行／券商實際入帳日為準；確認後才增加現金。</p>${pending.map(t=>`<div class="mp-trade-pending"><div><b>${esc35(t.symbol)} · ${money35(t.amount)}</b><small>${esc35(t.trade_date)} 賣出 ${Number(t.quantity).toLocaleString()} 股／單位</small></div><button class="btn main" onclick="mpInvConfirmSettlement('${t.id}')">確認入帳</button></div>`).join('')}</section>`:''}
        <section class="card" style="margin-top:14px"><div class="split"><div><div class="section-kicker">PORTFOLIO</div><h3>目前持倉</h3><div class="tiny">已實現損益採系統移動平均成本，可能與券商指定批次不同。</div></div><button class="btn ghost" onclick="addHolding()">＋ 舊持倉</button></div><div class="scroll"><table class="table"><tr><th>標的</th><th>數量</th><th>均價</th><th>行情</th><th>市值</th><th>未實現損益</th><th>操作</th></tr>${holdingRows||'<tr><td colspan="7" class="empty">目前沒有持股；賣出紀錄與已實現損益仍保留。</td></tr>'}</table></div>${holdings.some(h=>Number(h.quantity)===0)?`<details><summary>已出清部位設定</summary>${holdings.filter(h=>Number(h.quantity)===0).map(h=>`<div class="mp-trade-pending"><span>${esc35(h.symbol)} ${esc35(h.name||'')} · 0 股</span><button class="btn ghost" onclick="editHolding('${h.id}')">期初部位／備註</button></div>`).join('')}</details>`:''}</section>
        <section class="card" style="margin-top:14px"><div class="split"><div><div class="section-kicker">INVESTMENT LEDGER</div><h3>買賣紀錄</h3><p class="tiny">修改或刪除後會重算後續成本與損益，已出清交易也可查看。</p></div><select aria-label="交易月份" onchange="mpInvRenderHistory(this.value)"><option value="all" ${investmentViewMonth==='all'?'selected':''}>全部月份</option>${months.map(x=>`<option value="${x}" ${investmentViewMonth===x?'selected':''}>${x}</option>`).join('')}</select></div><div id="mp-inv-history"></div><div id="mp-inv-pager" class="actions"></div></section>
        <section class="month-plan" style="margin-top:14px"><div class="card"><h3>${m} 投資與現金安排</h3><div class="smart-grid"><div class="smart-card"><div class="title">接下來可追加上限</div><div class="value">${money35(coreTarget)}</div></div><div class="smart-card"><div class="title">本月已買入</div><div class="value">${money35(trades.filter(t=>t.side==='buy').reduce((sum,t)=>sum+Number(t.amount),0))}</div></div><div class="smart-card"><div class="title">本月賣出款已入帳</div><div class="value">${money35(saleCash)}</div></div></div><p class="tiny">未入帳交割款不提高可追加上限；賣出後不要求補回買入額度。</p></div></section>
        <section class="card mp35-market" style="margin-top:14px"><div class="split"><div><div class="section-kicker">OFFICIAL CLOSE · TWSE / TPEX</div><h3>官方盤後行情</h3><div class="tiny">${latestDate?'持倉行情截至 '+latestDate:'尚無持倉行情'}</div></div><button id="mp-inv-sync" class="btn ghost" onclick="mpInvSyncPrices()">更新官方價格</button></div></section>`;
        window.mpInvRenderHistory();
      }catch(e){if(revision===investmentRenderRevision&&u?.id===userId)app.innerHTML=`<section class="card"><h3>投資組合載入失敗</h3><p>${esc35(e.message||e)}</p></section>`}
    }
    window.mpInvestmentPortfolio = portfolio35;
    window.portfolio = portfolio35;
    try {
      portfolio = portfolio35;
    } catch (_) {}
    const css = `.mp-trade-dialog{width:min(760px,100%);max-height:90dvh;overflow:auto}.mp-trade-dialog [hidden]{display:none!important}.mp-trade-dialog input,.mp-trade-dialog select{min-width:0;width:100%;font-size:16px}.mp-trade-dialog .field{min-width:0}.mp-trade-check{display:flex;align-items:center;gap:8px;margin:12px 0}.mp-trade-check input{width:auto}.mp-trade-row{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #e2e8f0;padding:16px 0}.mp-trade-row>div{min-width:0;overflow-wrap:anywhere}.mp-trade-row .pill{margin-right:8px}.mp-trade-row small,.mp-trade-pending small{display:block;color:#64748b;margin-top:6px}.mp-trade-row p{font-size:12px;margin:7px 0}.mp-trade-pending{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #edf0f4}@media(max-width:680px){.mp-trade-dialog .row3,.mp-trade-dialog .row{display:grid;grid-template-columns:minmax(0,1fr)}.mp-trade-row{flex-direction:column;gap:8px}.mp-trade-pending{flex-wrap:wrap}.mp-trade-dialog{padding:16px}} .mp35-txn{grid-template-columns:64px 100px minmax(220px,1fr) minmax(190px,auto)!important;align-items:center}.mp35-legacy{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:10px}.mp35-market{border-color:#bfdbfe;background:linear-gradient(135deg,#f8fbff,#fff)}@media(max-width:720px){.mp35-txn{grid-template-columns:52px 72px 1fr!important}.mp35-txn>.amt{grid-column:2/-1;text-align:left!important}.mp35-txn>.amt .actions{justify-content:flex-start!important}.mp35-market .split{align-items:flex-start}.mp35-market .btn{flex:0 0 auto}}`, st = document.createElement('style');
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

