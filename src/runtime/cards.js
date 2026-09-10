
window.MILLIONPROJECT_CARD_VERSION="cards-source-1";
(()=>{
  if(window.__MP_CARDS24)return;
  window.__MP_CARDS24=true;

  const moneyx=n=>'NT$'+Math.round(Number(n)||0).toLocaleString('zh-TW');
  const escx=s=>String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const pad=n=>String(n).padStart(2,'0');
  const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const parse=s=>new Date(String(s).slice(0,10)+'T12:00:00');
  const model=MPCardModel;

  function cycleEndFor(date,day){
    return parse(model.cycleEnd(String(date).slice(0,10),day));
  }
  function prevClosed(today,day){
    return parse(model.shiftMonth(model.cycleEnd(model.today(today),day),-1,day));
  }
  function currentEnd(today,day){
    return parse(model.cycleEnd(model.today(today),day));
  }
  function dueFor(end,day){return parse(model.shiftMonth(ymd(end),1,day))}

  window.mpRecordCardPayment=async(cardId,cycleEnd,outstanding)=>{
    try{
      if(typeof c==='undefined'||typeof u==='undefined'||!c||!u)return;
      const card=model.resolve('card:'+cardId,await mpLoadCards(),{allowInactive:true});
      model.parts(cycleEnd);
      const n=+(prompt(card.issuer+' 這期實際繳款金額',String(Math.round(outstanding)))||0);
      if(!Number.isFinite(n)||!(n>0))return;
      const {error}=await c.from('credit_card_payments').insert({
        user_id:u.id,issuer:card.issuer,credit_card_id:card.id,cycle_end:cycleEnd,
        payment_date:model.today(),
        amount:n,note:'帳單付款；不重複列為消費支出'
      });
      if(error)throw error;
      window.mpInvalidateQueries?.();
      await mpCreditCards();
    }catch(e){alert('記錄失敗：'+e.message)}
  };

  window.mpEditCardPayment=async id=>{
    try{
      const {data:p,error}=await c.from('credit_card_payments').select('*').eq('user_id',u.id).eq('id',id).maybeSingle();
      if(error)throw error;if(!p)return;
      const amount=+(prompt('實際繳款金額',String(p.amount||0))||0);if(!Number.isFinite(amount)||!(amount>0))return;
      const date=prompt('繳款日期 YYYY-MM-DD',String(p.payment_date||'').slice(0,10));if(date===null||!/^\d{4}-\d{2}-\d{2}$/.test(date))return alert('日期格式錯誤');
      model.parts(date);
      const note=prompt('備註',p.note||'');if(note===null)return;
      const r=await c.from('credit_card_payments').update({amount,payment_date:date,note,updated_at:new Date().toISOString()}).eq('user_id',u.id).eq('id',id);
      if(r.error)throw r.error;window.mpInvalidateQueries?.();await mpCreditCards();
    }catch(e){alert('修改失敗：'+e.message)}
  };

  window.mpDeleteCardPayment=async id=>{
    if(!confirm('確定刪除這筆卡費繳款紀錄？這只會撤銷「已繳」紀錄，不會刪除原本的刷卡支出。'))return;
    try{
      const r=await c.from('credit_card_payments').delete().eq('user_id',u.id).eq('id',id);
      if(r.error)throw r.error;window.mpInvalidateQueries?.();await mpCreditCards();
    }catch(e){alert('刪除失敗：'+e.message)}
  };

  window.mpAddCardSpend=async()=>{
    try{
      if(typeof c==='undefined'||typeof u==='undefined'||!c||!u)return;
      const d=document.getElementById('mpcc-date')?.value;
      const issuer=document.getElementById('mpcc-card')?.value;
      const cat=document.getElementById('mpcc-cat')?.value;
      const amt=+(document.getElementById('mpcc-amt')?.value||0);
      const note=document.getElementById('mpcc-note')?.value||'';
      if(!d||!issuer||!Number.isFinite(amt)||!(amt>0))return alert('請填日期、卡片與金額');
      model.parts(d);
      const payment=await mpResolvePayment(issuer);
      if(!payment.credit_card_id)throw new Error('請選擇啟用中的卡片');
      const {error}=await c.from('finance_entries').insert({
        user_id:u.id,entry_date:d,month:d.slice(0,7)+'-01',
        entry_type:'expense',category:cat,amount:amt,
        ...payment,note,updated_at:new Date().toISOString()
      });
      if(error)throw error;
      window.mpInvalidateQueries?.();
      if(typeof syncFinanceSummaryFromEntries==='function'){
        const rows=(await q('finance_entries',{order:'entry_date'})).filter(x=>String(x.month||'').slice(0,7)===d.slice(0,7));
        await syncFinanceSummaryFromEntries(d.slice(0,7),rows);
      }
      await mpCreditCards();
    }catch(e){alert('新增失敗：'+e.message)}
  };

  function closeCardModal(){document.getElementById('mp-card-modal')?.remove()}
  window.mpCloseCardModal=closeCardModal;

  window.mpCardSettings=async id=>{
    if(typeof c==='undefined'||typeof u==='undefined'||!c||!u)return;
    closeCardModal();
    let card=null;
    if(id){
      const {data,error}=await c.from('credit_cards').select('*').eq('user_id',u.id).eq('id',id).maybeSingle();
      if(error)return alert('讀取卡片失敗：'+error.message);
      card=data;
    }
    const e=document.createElement('div');
    e.id='mp-card-modal';e.className='modal-backdrop';e.onclick=ev=>{if(ev.target===e)closeCardModal()};
    e.innerHTML=`<div class="modal">
      <div class="modal-head"><h3>${card?'編輯信用卡設定':'＋ 新增信用卡'}</h3><button class="btn ghost" onclick="mpCloseCardModal()">關閉</button></div>
      ${card?`<div class="status-note"><b>${escx(card.issuer)}</b> 是歷史刷卡紀錄的識別名稱，為避免舊帳單斷鏈，編輯時不提供改名。</div>`:''}
      <div class="row3" style="margin-top:10px">
        <div class="field"><label>銀行／識別名稱</label><input id="mpc-issuer" value="${escx(card?.issuer||'')}" ${card?'disabled':''} placeholder="例如 玉山"></div>
        <div class="field"><label>卡片名稱</label><input id="mpc-name" value="${escx(card?.card_name||'')}"></div>
        <div class="field"><label>信用額度</label><input id="mpc-limit" type="number" min="1" value="${card?.credit_limit||20000}"></div>
      </div>
      <div class="row3" style="margin-top:10px">
        <div class="field"><label>結帳日</label><input id="mpc-statement" type="number" min="1" max="31" value="${card?.statement_day||1}"></div>
        <div class="field"><label>繳款日（次月）</label><input id="mpc-due" type="number" min="1" max="31" value="${card?.due_day||1}"></div>
        <div class="field"><label>單卡每月自訂上限（0＝不設）</label><input id="mpc-cap" type="number" min="0" value="${card?.monthly_spend_cap||0}"></div>
      </div>
      <div class="field" style="margin-top:10px"><label>卡片狀態</label><select id="mpc-status"><option value="active" ${card?.status!=='inactive'?'selected':''}>啟用</option><option value="inactive" ${card?.status==='inactive'?'selected':''}>停用／已剪卡</option></select></div>
      <div class="status-note" style="margin-top:10px"><b>額度 ≠ 預算。</b><div class="tiny">信用額度只影響銀行還讓你刷多少；系統仍會用生活預算計算全卡共用的「安全可刷池」。停用卡會保留歷史與待繳帳單，但不再出現在新增刷卡選單。</div></div>
      <div class="actions">
        <button class="btn main" onclick="mpSaveCardSettings(${card?`'${card.id}'`:'null'})">儲存</button>
        ${card?`<button class="btn danger-btn" onclick="mpDeleteCard('${card.id}','${String(card.issuer).replace(/'/g,'')}')">刪除卡片</button>`:''}
        <button class="btn ghost" onclick="mpCloseCardModal()">取消</button>
      </div>
    </div>`;
    document.body.appendChild(e);
  };

  window.mpSaveCardSettings=async id=>{
    try{
      const issuer=(document.getElementById('mpc-issuer')?.value||'').trim();
      const card_name=(document.getElementById('mpc-name')?.value||'').trim();
      const credit_limit=+(document.getElementById('mpc-limit')?.value||0);
      const statement_day=model.billingDay(document.getElementById('mpc-statement')?.value);
      const due_day=model.billingDay(document.getElementById('mpc-due')?.value);
      const monthly_spend_cap=Math.max(0,+(document.getElementById('mpc-cap')?.value||0));
      const status=document.getElementById('mpc-status')?.value||'active';
      if(!issuer)return alert('請填寫銀行／識別名稱');
      if(!Number.isFinite(credit_limit)||!(credit_limit>0))return alert('信用額度必須大於 0');
      if(!Number.isFinite(monthly_spend_cap))return alert('請填寫有效的每月上限');
      const row={card_name,credit_limit,statement_day,due_day,monthly_spend_cap,status,updated_at:new Date().toISOString()};
      let error;
      if(id){
        const previous=(await mpLoadCards()).find(x=>String(x.id)===String(id));
        if(!previous)throw new Error('這張卡片已不存在，請重新整理');
        if(previous.card_name&&previous.card_name!==card_name&&previous.card_name!==previous.issuer){
          const oldRows=await c.from('finance_entries').select('payment_method,credit_card_id').eq('user_id',u.id).eq('payment_method',previous.card_name);
          if(oldRows.error)throw oldRows.error;
          if((oldRows.data||[]).some(x=>x.credit_card_id==null))throw new Error('這張卡仍有以舊名稱記錄的消費，暫時不能改名；額度、帳單日與停用仍可調整。');
        }
        ({error}=await c.from('credit_cards').update(row).eq('user_id',u.id).eq('id',id));
      }else{
        ({error}=await c.from('credit_cards').insert({...row,user_id:u.id,issuer,current_spend:0,statement_balance:0,paid_amount:0,payment_status:'normal'}));
      }
      if(error)throw error;
      window.mpInvalidateQueries?.();
      closeCardModal();
      await mpCreditCards();
    }catch(e){alert('儲存失敗：'+e.message)}
  };

  window.mpDeleteCard=async(id,issuer)=>{
    try{
      const cards=await mpLoadCards(),card=cards.find(x=>String(x.id)===String(id));
      if(!card)return;
      const {data:spends,error:e1}=await c.from('finance_entries').select('id,payment_method,credit_card_id').eq('user_id',u.id);
      if(e1)throw e1;
      const {data:payments,error:e2}=await c.from('credit_card_payments').select('id,issuer,credit_card_id').eq('user_id',u.id);
      if(e2)throw e2;
      if((spends||[]).some(x=>model.couldMatchRecord(x,card,cards))||(payments||[]).some(x=>model.couldMatchRecord(x,card,cards,'issuer'))){
        return alert('這張卡已有刷卡或繳款歷史，為避免帳單紀錄斷鏈，不能直接刪除。請把卡片狀態改成「停用／已剪卡」，系統會保留歷史但不再允許新增刷卡。');
      }
      if(!confirm('確定刪除這張尚無歷史紀錄的信用卡？'))return;
      const r=await c.from('credit_cards').delete().eq('user_id',u.id).eq('id',id);
      if(r.error)throw r.error;window.mpInvalidateQueries?.();closeCardModal();await mpCreditCards();
    }catch(e){alert('刪除失敗：'+e.message)}
  };

  window.mpCreditCards=async()=>{
    const app=document.getElementById('app');if(!app)return;
    try{
      const cards=typeof q==='function'?await q('credit_cards',{order:'created_at'}):[];
      const entries=(typeof q==='function'?await q('finance_entries',{order:'entry_date'}):[]).filter(x=>x.entry_type==='expense');
      const paymentResult=await c.from('credit_card_payments').select('*').eq('user_id',u.id).order('payment_date',{ascending:false});
      if(paymentResult.error)throw paymentResult.error;
      const pays=paymentResult.data||[];
      const today=new Date(),month=model.today(today).slice(0,7);
      const ambiguous=entries.filter(x=>x.credit_card_id==null&&model.candidates(x.payment_method,cards).length>1).length+pays.filter(x=>x.credit_card_id==null&&model.candidates(x.issuer,cards).length>1).length;
      const monthExpense=entries.filter(x=>String(x.month||'').slice(0,7)===month).reduce((s,x)=>s+(+x.amount||0),0);
      const life=typeof plannedLivingTotal==='function'?plannedLivingTotal():0;
      const safePool=Math.max(0,life-monthExpense);

      const rows=cards.map(card=>{
        const issuer=card.issuer,sd=+card.statement_day||1,dd=+card.due_day||1,limit=+card.credit_limit||0;
        const ce=currentEnd(today,sd),prev=prevClosed(today,sd),prevKey=ymd(prev),due=dueFor(prev,dd);
        const spend=entries.filter(x=>model.matchesRecord(x,card,cards));
        const current=spend.filter(x=>ymd(cycleEndFor(x.entry_date,sd))===ymd(ce)).reduce((s,x)=>s+(+x.amount||0),0);
        const prevBill=spend.filter(x=>ymd(cycleEndFor(x.entry_date,sd))===prevKey).reduce((s,x)=>s+(+x.amount||0),0);
        const paid=pays.filter(p=>model.matchesRecord(p,card,cards,'issuer')&&String(p.cycle_end||'').slice(0,10)===prevKey).reduce((s,p)=>s+(+p.amount||0),0);
        const out=Math.max(0,prevBill-paid),used=current+out,avail=Math.max(0,limit-used);
        const calSpend=spend.filter(x=>String(x.month||'').slice(0,7)===month).reduce((s,x)=>s+(+x.amount||0),0);
        const softCap=+card.monthly_spend_cap||0;
        const capRemain=softCap>0?Math.max(0,softCap-calSpend):Infinity;
        const inactive=card.status==='inactive';
        const safe=inactive?0:Math.min(avail,safePool,capRemain);
        const late=out>0&&model.today(today)>ymd(due);
        const badge=inactive?(out>0?'已停用・待繳':'已停用'):(late?'逾期待繳':out>0?'待繳':'正常');
        const badgeClass=late?'no':(out>0||inactive)?'watch':'buy';
        return `<div class="card">
          <div class="split"><div><div class="section-kicker">${escx(String(issuer).toUpperCase())}</div><h3 style="margin:3px 0">${escx(card.card_name||issuer+'信用卡')}</h3></div><span class="pill ${badgeClass}">${badge}</span></div>
          <div class="advice-list">
            <div class="advice-item"><span>本期未出帳</span><b>${moneyx(current)}</b></div>
            <div class="advice-item"><span>上期已出帳待繳</span><b>${moneyx(out)}</b></div>
            <div class="advice-item"><span>目前可用實體額度</span><b>${moneyx(avail)}</b></div>
            <div class="advice-item"><span>下一筆刷這張卡，建議最多</span><b>${moneyx(safe)}</b></div>
          </div>
          <div class="tiny" style="margin-top:9px">結帳 ${sd} 日 · ${ymd(due)} 繳款 · 額度 ${moneyx(limit)}${softCap>0?' · 自訂月上限 '+moneyx(softCap):''}</div>
          <div class="actions">
            <button class="btn ghost" onclick="mpCardSettings('${card.id}')">編輯卡片設定</button>
            ${out>0?`<button class="btn main" onclick="mpRecordCardPayment('${card.id}','${prevKey}',${out})">記錄繳卡費 ${moneyx(out)}</button>`:''}
          </div>
        </div>`;
      }).join('');

      const activeCards=cards.filter(x=>x.status!=='inactive');
      const paymentRows=pays.slice(0,8).map(p=>`<tr><td>${escx(p.issuer)}</td><td>${escx(String(p.cycle_end||'').slice(0,10))}</td><td>${escx(String(p.payment_date||'').slice(0,10))}</td><td><b>${moneyx(p.amount)}</b></td><td>${escx(p.note||'')}</td><td><button class="btn ghost" onclick="mpEditCardPayment('${p.id}')">編輯</button> <button class="btn danger-btn" onclick="mpDeleteCardPayment('${p.id}')">刪除</button></td></tr>`).join('');

      app.innerHTML=`<section class="card">
        <div class="split"><div><div class="section-kicker">CREDIT CARD CONTROL</div><h2 style="margin:4px 0">信用卡帳單週期</h2><div class="tiny">刷卡當天算支出；隔月繳卡費只結清帳單，不重複算第二次支出。</div></div><button class="btn main" onclick="mpCardSettings(null)">＋ 新增信用卡</button></div>
        <div class="status-note" style="margin-top:10px"><b>全卡共用安全可刷池：${moneyx(safePool)}</b><div class="tiny">這是一個共用池，不是每張卡各有 ${moneyx(safePool)}。銀行額度再高，也不會提高你的生活預算。</div></div>
      </section>
      ${ambiguous?`<section class="card" role="status" style="margin-top:14px">有 ${ambiguous} 筆舊紀錄的卡片名稱重複，尚未分配到個別帳單。請確認原刷卡或繳款紀錄；目前單卡可用額度可能高估。</section>`:''}
      <section class="grid g3" style="margin-top:14px">${rows||'<div class="card"><div class="empty">尚未建立信用卡</div></div>'}</section>
      <section class="card" style="margin-top:14px">
        <div class="section-kicker">NEW CARD SPEND</div><h3>記一筆刷卡</h3>
        <div class="entry-form">
          <div class="field"><label>日期</label><input id="mpcc-date" type="date" value="${model.today(today)}"></div>
          <div class="field"><label>卡片</label><select id="mpcc-card">${activeCards.map(x=>`<option value="${escx(model.token(x))}">${escx(x.issuer+' · '+(x.card_name||'信用卡'))}</option>`).join('')}</select></div>
          <div class="field"><label>分類</label><select id="mpcc-cat"><option>餐飲</option><option>交通</option><option>日常用品</option><option>娛樂</option><option>其他支出</option></select></div>
          <div class="field"><label>金額</label><input id="mpcc-amt" type="number" min="0"></div>
          <div class="field"><label>備註</label><input id="mpcc-note"></div>
          <button class="btn main" onclick="mpAddCardSpend()" ${activeCards.length?'':'disabled'}>${activeCards.length?'新增刷卡':'沒有啟用中的卡片'}</button>
        </div>
      </section>
      <section class="card" style="margin-top:14px">
        <div class="section-title"><div><div class="section-kicker">PAYMENT HISTORY</div><h3>卡費繳款紀錄</h3><div class="tiny">若輸入錯誤可以編輯或刪除；這些紀錄不會重複計入支出。</div></div></div>
        <div class="scroll"><table class="table"><tr><th>卡片</th><th>結帳週期</th><th>繳款日</th><th>金額</th><th>備註</th><th>操作</th></tr>${paymentRows||'<tr><td colspan="6" class="empty">尚無繳款紀錄</td></tr>'}</table></div>
      </section>`;
      if(typeof window.mpGo==='function')setTimeout(()=>document.querySelectorAll('[data-mptab]').forEach(b=>b.classList.toggle('active',b.dataset.mptab==='c')),0);
    }catch(e){
      app.innerHTML='<section class="card"><h3>信用卡資料載入失敗</h3><div class="tiny">'+escx(e.message||e)+'</div></section>';
    }
  };

  try{creditCards=window.mpCreditCards}catch(_){window.creditCards=window.mpCreditCards}
})();
