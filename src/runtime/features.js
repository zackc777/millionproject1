
window.MILLIONPROJECT_FEATURE_VERSION="features-23";
(()=>{
  if(window.__MP_FEATURES23) return;
  window.__MP_FEATURES23=true;

  const moneyx=n=>'NT$'+Math.round(Number(n)||0).toLocaleString('zh-TW');
  const monthNow=()=>new Date().toISOString().slice(0,7);
  const escx=s=>String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

  async function salaryAdvice(){
    const host=document.querySelector('.salary-start');
    if(!host) return;
    document.getElementById('mp-payday-advice')?.remove();
    try{
      const month=(document.getElementById('salary_month')?.value||monthNow()).slice(0,7);
      const all=typeof q==='function'?await q('finance_entries',{order:'entry_date'}):[];
      const cur=all.filter(x=>String(x.month||'').slice(0,7)===month);
      const sum=t=>cur.filter(x=>x.entry_type===t).reduce((s,x)=>s+(+x.amount||0),0);
      const income=sum('income');
      if(!(income>0)) return;
      const expense=sum('expense');
      const alreadyEmergency=cur.filter(x=>x.entry_type==='saving'&&String(x.category||'').includes('緊急')).reduce((s,x)=>s+(+x.amount||0),0);
      const st=typeof moneyEngine==='function'?await moneyEngine(month):{emergency:0};
      const plan=typeof allocation==='function'
        ? allocation(income,expense,+st.emergency||0,typeof plannedLivingTotal==='function'?plannedLivingTotal():0)
        : {emergency:Math.round(income*.2),flex:0,core:0};
      const suggest=Math.max(0,(+plan.emergency||0)-alreadyEmergency);
      const flex=Math.max(0,+plan.flex||0);
      const core=Math.max(0,+plan.core||0);

      const e=document.createElement('section');
      e.id='mp-payday-advice';
      e.className='card';
      e.style.marginTop='12px';
      e.innerHTML=`
        <div class="section-kicker">AFTER PAYDAY</div>
        <h3 style="margin:4px 0 8px">薪資入帳後，先決定「留多少」再決定「投多少」</h3>
        <div class="grid g3">
          <div class="metric"><div class="k">建議本月補預備金</div><div class="v">${moneyx(suggest)}</div></div>
          <div class="metric"><div class="k">建議保留現金彈性</div><div class="v">${moneyx(flex)}</div></div>
          <div class="metric"><div class="k">核心投資參考</div><div class="v">${moneyx(core)}</div></div>
        </div>
        <div class="status-note" style="margin-top:10px">
          <b>現金彈性不是一筆支出，也不一定要另外轉帳。</b>
          <div class="tiny">如果只是留在活存作為下月銜接／機會金，不需要再記一筆，避免重複計帳。</div>
        </div>
        <div class="actions" style="margin-top:10px">
          ${suggest>0?`<button class="btn main" id="mp-emergency-oneclick" onclick="mpApplyEmergency(${suggest},'${month}')">一鍵加入預備金 ${moneyx(suggest)}</button>`:'<span class="pill buy">本月預備金已達建議</span>'}
        </div>`;
      host.insertAdjacentElement('afterend',e);
    }catch(err){ console.warn('payday advice',err); }
  }

  window.mpApplyEmergency=async(amount,month)=>{
    if(window.__mpApplyingEmergency) return;
    try{
      if(typeof c==='undefined'||typeof u==='undefined'||!c||!u) return alert('請先登入');
      window.__mpApplyingEmergency=true;
      const btn=document.getElementById('mp-emergency-oneclick');
      if(btn){btn.disabled=true;btn.textContent='儲存中…';}
      const today=new Date().toISOString().slice(0,10);
      const date=today.slice(0,7)===month?today:month+'-01';
      const {error}=await c.from('finance_entries').insert({
        user_id:u.id,entry_date:date,month:month+'-01',entry_type:'saving',
        category:'緊急預備金',amount,
        payment_method:'銀行轉帳／現金',
        note:'[SMART_PAYDAY] 薪資後一鍵配置',
        updated_at:new Date().toISOString()
      });
      if(error) throw error;
      if(typeof syncFinanceSummaryFromEntries==='function'){
        const rows=(await q('finance_entries',{order:'entry_date'})).filter(x=>String(x.month||'').slice(0,7)===month);
        await syncFinanceSummaryFromEntries(month,rows);
      }
      if(typeof monthly==='function') await monthly();
    }catch(e){ alert('加入失敗：'+e.message); }
    finally{window.__mpApplyingEmergency=false;}
  };

  function closePlanModal(){document.getElementById('mp-plan-modal')?.remove();}
  window.mpClosePlanModal=closePlanModal;

  window.mpPlanModal=async(id)=>{
    if(typeof c==='undefined'||typeof u==='undefined'||!c||!u) return;
    closePlanModal();
    let p=null;
    if(id!=null){
      const {data,error}=await c.from('investment_plans').select('*').eq('user_id',u.id).eq('id',id).maybeSingle();
      if(error) return alert('讀取計畫失敗：'+error.message);
      p=data;
    }
    const e=document.createElement('div');
    e.id='mp-plan-modal';
    e.className='modal-backdrop';
    e.onclick=ev=>{if(ev.target===e)closePlanModal()};
    e.innerHTML=`<div class="modal">
      <div class="modal-head"><h3>${p?'編輯定期定額計畫':'＋ 新增定期定額計畫'}</h3><button class="btn ghost" onclick="mpClosePlanModal()">關閉</button></div>
      <div class="row3">
        <div class="field"><label>標的代號</label><input id="mpp-symbol" value="${escx(p?.symbol||'0050')}" placeholder="0050"></div>
        <div class="field"><label>名稱（可留白）</label><input id="mpp-name" value="${escx(p?.name||'')}"></div>
        <div class="field"><label>每月固定金額</label><input id="mpp-amount" type="number" min="1" value="${p?.monthly_amount||8000}"></div>
      </div>
      <div class="row3" style="margin-top:10px">
        <div class="field"><label>每月執行日</label><input id="mpp-day" type="number" min="1" max="28" value="${p?.execution_day||10}"></div>
        <div class="field"><label>開始月份</label><input id="mpp-start" type="month" value="${String(p?.start_month||'2026-11').slice(0,7)}"></div>
        <div class="field"><label>結束月份（可留白）</label><input id="mpp-end" type="month" value="${String(p?.end_month||'').slice(0,7)}"></div>
      </div>
      <div class="row" style="margin-top:10px">
        <div class="field"><label>狀態</label><select id="mpp-status"><option value="active" ${p?.status!=='paused'?'selected':''}>啟用</option><option value="paused" ${p?.status==='paused'?'selected':''}>暫停</option></select></div>
        <div class="field"><label>備註／策略</label><input id="mpp-notes" value="${escx(p?.notes||'')}"></div>
      </div>
      <div class="actions">
        <button class="btn main" onclick="mpSavePlan(${p?`'${p.id}'`:'null'})">儲存</button>
        ${p?`<button class="btn danger-btn" onclick="mpDeletePlan('${p.id}')">刪除計畫</button>`:''}
        <button class="btn ghost" onclick="mpClosePlanModal()">取消</button>
      </div>
    </div>`;
    document.body.appendChild(e);
  };

  window.mpAddPlan=()=>window.mpPlanModal(null);
  window.mpEditPlan=id=>window.mpPlanModal(id);

  window.mpSavePlan=async(id)=>{
    try{
      if(typeof c==='undefined'||typeof u==='undefined'||!c||!u) return;
      const symbol=(document.getElementById('mpp-symbol')?.value||'').trim().toUpperCase();
      const name=(document.getElementById('mpp-name')?.value||'').trim();
      const amount=+(document.getElementById('mpp-amount')?.value||0);
      const day=Math.max(1,Math.min(28,+(document.getElementById('mpp-day')?.value||10)));
      const start=(document.getElementById('mpp-start')?.value||'').slice(0,7);
      const end=(document.getElementById('mpp-end')?.value||'').slice(0,7);
      const status=document.getElementById('mpp-status')?.value||'active';
      const notes=(document.getElementById('mpp-notes')?.value||'').trim();
      if(!symbol) return alert('請填寫標的代號');
      if(!(amount>0)) return alert('每月金額必須大於 0');
      if(!start) return alert('請選擇開始月份');
      if(end && end<start) return alert('結束月份不能早於開始月份');
      const row={symbol,name,monthly_amount:amount,execution_day:day,start_month:start+'-01',end_month:end?end+'-01':null,strategy:'定期定額',status,notes,updated_at:new Date().toISOString()};
      let error;
      if(id!=null){
        ({error}=await c.from('investment_plans').update(row).eq('user_id',u.id).eq('id',id));
      }else{
        ({error}=await c.from('investment_plans').insert({...row,user_id:u.id}));
      }
      if(error) throw error;
      closePlanModal();
      if(typeof render==='function') await render();
    }catch(e){alert('儲存失敗：'+e.message);}
  };

  window.mpDeletePlan=async id=>{
    if(!confirm('確定刪除這個定期定額計畫？已發生的投資交易與持倉不會被刪除。')) return;
    try{
      const {error}=await c.from('investment_plans').delete().eq('user_id',u.id).eq('id',id);
      if(error) throw error;
      closePlanModal();
      if(typeof render==='function') await render();
    }catch(e){alert('刪除失敗：'+e.message);}
  };

  window.mpTogglePlan=async(id,next)=>{
    try{
      const {error}=await c.from('investment_plans').update({status:next,updated_at:new Date().toISOString()}).eq('user_id',u.id).eq('id',id);
      if(error) throw error;
      if(typeof render==='function') await render();
    }catch(e){alert('更新失敗：'+e.message);}
  };

  window.mpRunPlan=(id,symbol,gap)=>{
    if(!(gap>0)) return;
    if(typeof openInvestmentBuy!=='function') return alert('投資表單尚未載入');
    openInvestmentBuy();
    setTimeout(()=>{
      const s=document.getElementById('iv_symbol'),a=document.getElementById('iv_amount');
      if(s)s.value=symbol;
      if(a)a.value=Math.round(gap);
    },80);
  };

  async function plans(){
    const app=document.getElementById('app');
    if(!app) return;
    document.getElementById('mp-dca-plan')?.remove();
    try{
      if(typeof c==='undefined'||typeof u==='undefined'||!c||!u) return;
      const month=monthNow();
      const {data:ps,error}=await c.from('investment_plans').select('*').eq('user_id',u.id).order('created_at');
      if(error) throw error;
      const all=typeof q==='function'?await q('finance_entries',{order:'entry_date'}):[];
      const tx=all.filter(x=>String(x.month||'').slice(0,7)===month&&x.entry_type==='investment');
      const e=document.createElement('section');
      e.id='mp-dca-plan';
      e.className='card';
      e.style.marginBottom='14px';

      let body='';
      if(!(ps||[]).length){
        body='<div class="status-note">尚未建立定期定額計畫。開始月份預設為 2026-11，但標的、金額與日期都由你決定。</div>';
      }else{
        body=(ps||[]).map(p=>{
          const actual=tx.filter(x=>{
            const hay=(String(x.category||'')+' '+String(x.note||'')).toUpperCase();
            return hay.includes(String(p.symbol||'').toUpperCase());
          }).reduce((s,x)=>s+(+x.amount||0),0);
          const gap=Math.max(0,(+p.monthly_amount||0)-actual);
          const start=String(p.start_month||'').slice(0,7);
          const end=String(p.end_month||'').slice(0,7);
          const active=p.status==='active';
          const live=active&&start<=month&&(!end||end>=month);
          const ended=!!end&&end<month;
          const label=!active?'已暫停':ended?'已結束':start>month?'尚未開始':'啟用中';
          const pill=!active||ended?'watch':live?'buy':'';
          return `<div class="mp-plan-row" style="border:1px solid #e5e7eb;border-radius:14px;padding:12px;margin-top:8px">
            <div class="split">
              <div><b>${escx(p.symbol)} ${escx(p.name||'')}</b><div class="tiny">每月 ${moneyx(p.monthly_amount)} · ${p.execution_day} 日 · ${start} 開始${end?' · '+end+' 結束':''}</div></div>
              <span class="pill ${pill}">${label}</span>
            </div>
            ${live?`<div class="advice-list" style="margin-top:8px"><div class="advice-item"><span>本月已投入</span><b>${moneyx(actual)}</b></div><div class="advice-item"><span>本月還差</span><b>${moneyx(gap)}</b></div></div>`:''}
            <div class="actions">
              ${live&&gap>0?`<button class="btn main" onclick="mpRunPlan('${p.id}','${String(p.symbol).replace(/'/g,'')}',${gap})">執行本月定期定額</button>`:''}
              ${live&&gap===0?'<span class="pill buy">本月已完成</span>':''}
              <button class="btn ghost" onclick="mpEditPlan('${p.id}')">編輯</button>
              <button class="btn ghost" onclick="mpTogglePlan('${p.id}','${active?'paused':'active'}')">${active?'暫停':'啟用'}</button>
              <button class="btn danger-btn" onclick="mpDeletePlan('${p.id}')">刪除</button>
            </div>
          </div>`;
        }).join('');
      }
      e.innerHTML=`<div class="split"><div><div class="section-kicker">DOLLAR COST AVERAGING</div><h3 style="margin:4px 0">定期定額計畫</h3><div class="tiny">計畫可以隨時新增、編輯、暫停、啟用或刪除；刪除計畫不會動到既有交易與持倉。</div></div><button class="btn main" onclick="mpAddPlan()">＋ 新增計畫</button></div>${body}`;
      app.prepend(e);
    }catch(err){console.warn('dca plan',err);}
  }

  async function after(){
    let t='o';try{t=tab||'o'}catch(_){}
    if(t==='m') await salaryAdvice();
    if(t==='p') await plans();
  }
  const old=window.render;
  if(typeof old==='function'&&!old.__mpFeatures23){
    const w=async function(){const r=await old.apply(this,arguments);await after();return r};
    w.__mpFeatures23=true;window.render=w;try{render=w}catch(_){}
  }
  setTimeout(after,140);
})();

window.MILLIONPROJECT_QUALITY_VERSION="quality-24";
(()=>{
  if(window.__MP_QUALITY24)return;
  window.__MP_QUALITY24=true;

  const escx=s=>String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const BUDGET_DEFAULT={rent:3000,family:9000,telecom:899,gym:980,daily:8000,leisure:5500};
  let cloudBudgetUser=null;
  let cloudBudgetLoading=false;

  function localBudget(){
    try{return {...BUDGET_DEFAULT,...JSON.parse(localStorage.getItem('millionproject_budget_profile')||'{}')}}catch(_){return {...BUDGET_DEFAULT}}
  }
  window.__mpBudgetProfile=localBudget();

  window.mpGetBudgetProfile=()=>({...BUDGET_DEFAULT,...(window.__mpBudgetProfile||localBudget())});
  try{getBudgetProfile=window.mpGetBudgetProfile}catch(_){window.getBudgetProfile=window.mpGetBudgetProfile}

  window.mpSaveBudgetProfile=async()=>{
    const keys=['rent','family','telecom','gym','daily','leisure'],o={};
    keys.forEach(k=>o[k]=Math.max(0,+(document.getElementById('bp_'+k)?.value)||0));
    window.__mpBudgetProfile={...BUDGET_DEFAULT,...o};
    localStorage.setItem('millionproject_budget_profile',JSON.stringify(window.__mpBudgetProfile));
    try{
      if(typeof c!=='undefined'&&typeof u!=='undefined'&&c&&u){
        const {error}=await c.from('profiles').upsert({user_id:u.id,budget_profile:window.__mpBudgetProfile,updated_at:new Date().toISOString()},{onConflict:'user_id'});
        if(error)console.warn('cloud budget save',error);
      }
    }catch(e){console.warn('cloud budget save',e)}
    try{if(typeof previewAllocation==='function')previewAllocation()}catch(_){}
  };
  try{saveBudgetProfile=window.mpSaveBudgetProfile}catch(_){window.saveBudgetProfile=window.mpSaveBudgetProfile}

  async function loadCloudBudget(){
    if(cloudBudgetLoading)return;
    try{
      if(typeof c==='undefined'||typeof u==='undefined'||!c||!u)return;
      if(cloudBudgetUser===u.id)return;
      cloudBudgetLoading=true;
      const before=JSON.stringify(window.__mpBudgetProfile||{});
      const local=localBudget();
      const {data,error}=await c.from('profiles').select('budget_profile').eq('user_id',u.id).maybeSingle();
      if(error)throw error;
      const cloud=data?.budget_profile&&typeof data.budget_profile==='object'?data.budget_profile:{};
      if(Object.keys(cloud).length){
        window.__mpBudgetProfile={...BUDGET_DEFAULT,...cloud};
        localStorage.setItem('millionproject_budget_profile',JSON.stringify(window.__mpBudgetProfile));
      }else if(localStorage.getItem('millionproject_budget_profile')){
        window.__mpBudgetProfile={...BUDGET_DEFAULT,...local};
        await c.from('profiles').upsert({user_id:u.id,budget_profile:window.__mpBudgetProfile,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      }else{
        window.__mpBudgetProfile={...BUDGET_DEFAULT};
      }
      cloudBudgetUser=u.id;
      if(before!==JSON.stringify(window.__mpBudgetProfile)){
        setTimeout(()=>{try{if(typeof render==='function')render()}catch(_){}},0);
      }
    }catch(e){console.warn('cloud budget load',e)}
    finally{cloudBudgetLoading=false}
  }

  async function syncPaymentMethodOptions(){
    try{
      if(typeof c==='undefined'||typeof u==='undefined'||!c||!u)return;
      const ids=['epm','mpq-pay'];
      const selects=ids.map(id=>document.getElementById(id)).filter(Boolean);
      if(!selects.length)return;
      const {data,error}=await c.from('credit_cards').select('issuer,status').eq('user_id',u.id).order('created_at');
      if(error)throw error;
      const issuers=(data||[]).filter(x=>x.status!=='inactive').map(x=>String(x.issuer||'').trim()).filter(Boolean);
      selects.forEach(sel=>{
        const cur=sel.value;
        const base=['銀行轉帳／現金',...issuers,'證券交割','其他'];
        sel.innerHTML=[...new Set(base)].map(x=>`<option>${escx(x)}</option>`).join('');
        if(base.includes(cur))sel.value=cur;
      });
    }catch(e){console.warn('payment options',e)}
  }

  function fixMobileMore(){
    const b=document.querySelector('#mp-mobile-nav [data-mptab="more"]');
    if(b&&(!b.textContent.includes('更多')||b.textContent.includes('undefined')))b.innerHTML='<b>•••</b>更多';
  }

  function splitRationale(v){
    const s=String(v||'');
    const m=s.match(/Fact:\s*([\s\S]*?)\nAnalysis \/ Risk \/ Uncertainty:\s*([\s\S]*)/);
    return m?[m[1].trim(),m[2].trim()]:['',s];
  }

  window.mpDecisions23=async()=>{
    const app=document.getElementById('app');if(!app)return;
    const a=typeof q==='function'?await q('investment_decisions',{order:'decision_date'}):[];
    const today=new Date().toISOString().slice(0,10);
    app.innerHTML=`<section class="card">
      <div class="section-title"><div><div class="section-kicker">INVESTMENT DECISION LOG</div><h2>決策紀錄</h2><p class="muted">每筆決策都能新增、編輯、刪除與事後回顧；Fact 和 Analysis 分開保留。</p></div><span class="pill">${a.length} 筆</span></div>
      <input id="mpd-id" type="hidden">
      <div class="row3">
        <div class="field"><label>日期</label><input id="mpd-date" type="date" value="${today}"></div>
        <div class="field"><label>標的</label><input id="mpd-symbol" placeholder="例如 0050"></div>
        <div class="field"><label>判斷</label><select id="mpd-decision"><option>買</option><option>觀察</option><option>不買</option><option>資料不足</option></select></div>
      </div>
      <div class="row" style="margin-top:10px">
        <div class="field"><label>Fact｜可驗證事實</label><textarea id="mpd-fact"></textarea></div>
        <div class="field"><label>Analysis / Risk / Uncertainty</label><textarea id="mpd-analysis"></textarea></div>
      </div>
      <div class="row" style="margin-top:10px">
        <div class="field"><label>Reference｜每行一個連結</label><textarea id="mpd-ref"></textarea></div>
        <div>
          <div class="field"><label>事後結果／回顧</label><textarea id="mpd-outcome" placeholder="之後再補也可以"></textarea></div>
          <div class="field" style="margin-top:8px"><label>回顧日期（可留白）</label><input id="mpd-review" type="date"></div>
        </div>
      </div>
      <div class="actions"><button class="btn main" onclick="mpSaveDecision()">儲存決策</button><button id="mpd-cancel" class="btn ghost" style="display:none" onclick="mpCancelDecisionEdit()">取消編輯</button></div>
    </section>
    <section class="card" style="margin-top:14px"><div class="scroll"><table class="table">
      <tr><th>日期</th><th>標的</th><th>判斷</th><th>內容</th><th>回顧</th><th>操作</th></tr>
      ${a.map(z=>`<tr><td>${escx(z.decision_date||'')}</td><td><b>${escx(z.symbol||'')}</b></td><td><span class="pill ${z.decision==='買'?'buy':z.decision==='觀察'?'watch':z.decision==='不買'?'no':''}">${escx(z.decision||'')}</span></td><td class="wrap" style="white-space:pre-wrap;max-width:430px">${escx(z.rationale||'')}</td><td class="wrap">${escx(z.outcome||'待回顧')}</td><td><button class="btn ghost" onclick="mpEditDecision('${z.id}')">編輯</button> <button class="btn danger-btn" onclick="mpDeleteDecision('${z.id}')">刪除</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">尚無決策紀錄</td></tr>'}
    </table></div></section>`;
  };

  window.mpEditDecision=async id=>{
    try{
      const {data:x,error}=await c.from('investment_decisions').select('*').eq('user_id',u.id).eq('id',id).maybeSingle();
      if(error)throw error;if(!x)return;
      const [fact,analysis]=splitRationale(x.rationale);
      document.getElementById('mpd-id').value=x.id;
      document.getElementById('mpd-date').value=String(x.decision_date||'').slice(0,10);
      document.getElementById('mpd-symbol').value=x.symbol||'';
      document.getElementById('mpd-decision').value=x.decision||'觀察';
      document.getElementById('mpd-fact').value=fact;
      document.getElementById('mpd-analysis').value=analysis;
      document.getElementById('mpd-ref').value=(x.reference_urls||[]).join('\n');
      document.getElementById('mpd-outcome').value=x.outcome||'';
      document.getElementById('mpd-review').value=String(x.review_date||'').slice(0,10);
      document.getElementById('mpd-cancel').style.display='';
      window.scrollTo({top:0,behavior:'smooth'});
    }catch(e){alert('讀取失敗：'+e.message)}
  };

  window.mpCancelDecisionEdit=()=>{
    const id=document.getElementById('mpd-id');if(id)id.value='';
    ['mpd-symbol','mpd-fact','mpd-analysis','mpd-ref','mpd-outcome','mpd-review'].forEach(x=>{const e=document.getElementById(x);if(e)e.value=''});
    const d=document.getElementById('mpd-date');if(d)d.value=new Date().toISOString().slice(0,10);
    const v=document.getElementById('mpd-decision');if(v)v.value='買';
    const cxl=document.getElementById('mpd-cancel');if(cxl)cxl.style.display='none';
  };

  window.mpSaveDecision=async()=>{
    try{
      const id=document.getElementById('mpd-id')?.value||'';
      const date=document.getElementById('mpd-date')?.value;
      const symbol=(document.getElementById('mpd-symbol')?.value||'').trim().toUpperCase();
      const decision=document.getElementById('mpd-decision')?.value||'觀察';
      const fact=document.getElementById('mpd-fact')?.value||'';
      const analysis=document.getElementById('mpd-analysis')?.value||'';
      const refs=(document.getElementById('mpd-ref')?.value||'').split(/\n/).map(x=>x.trim()).filter(Boolean);
      const outcome=document.getElementById('mpd-outcome')?.value||'';
      const review=document.getElementById('mpd-review')?.value||null;
      if(!date||!symbol)return alert('請填寫日期與標的');
      const row={decision_date:date,symbol,decision,rationale:`Fact: ${fact}\nAnalysis / Risk / Uncertainty: ${analysis}`,reference_urls:refs,outcome:outcome||null,review_date:review,updated_at:new Date().toISOString()};
      let error;
      if(id)({error}=await c.from('investment_decisions').update(row).eq('user_id',u.id).eq('id',id));
      else({error}=await c.from('investment_decisions').insert({...row,user_id:u.id}));
      if(error)throw error;
      await window.mpDecisions23();
    }catch(e){alert('儲存失敗：'+e.message)}
  };

  window.mpDeleteDecision=async id=>{
    if(!confirm('確定刪除這筆決策紀錄？'))return;
    try{
      const {error}=await c.from('investment_decisions').delete().eq('user_id',u.id).eq('id',id);
      if(error)throw error;await window.mpDecisions23();
    }catch(e){alert('刪除失敗：'+e.message)}
  };

  try{decisions=window.mpDecisions23}catch(_){window.decisions=window.mpDecisions23}

  const taskMonth=()=>new Date().toISOString().slice(0,7)+'-01';
  const taskDefaults=['確認本月薪資與生活預算','檢查信用卡待繳與繳款日','補足緊急預備金／現金安全墊','執行本月定期定額','完成本月市場研究','記錄重要投資決策','完成本月投資課','完成月底複盤'];

  async function currentTasks(){
    if(typeof c==='undefined'||typeof u==='undefined'||!c||!u)return [];
    const {data,error}=await c.from('tasks').select('*').eq('user_id',u.id).eq('month',taskMonth()).order('created_at');
    if(error)throw error;return data||[];
  }
  window.mpAddTask=async()=>{try{const title=(prompt('新增本月任務','')||'').trim();if(!title)return;const priority=(prompt('優先級：P0 / P1 / P2','P1')||'P1').trim().toUpperCase();const key='custom_'+Date.now();const {error}=await c.from('tasks').insert({user_id:u.id,month:taskMonth(),task_key:key,title,priority:['P0','P1','P2'].includes(priority)?priority:'P1',status:'todo'});if(error)throw error;await refreshTaskPanel()}catch(e){alert('新增任務失敗：'+e.message)}};
  window.mpEditTask=async id=>{try{const {data:x,error}=await c.from('tasks').select('*').eq('user_id',u.id).eq('id',id).maybeSingle();if(error)throw error;if(!x)return;const title=prompt('任務名稱',x.title||'');if(title===null||!title.trim())return;const priority=prompt('優先級：P0 / P1 / P2',x.priority||'P1');if(priority===null)return;const notes=prompt('備註（可留白）',x.notes||'');if(notes===null)return;const {error:e}=await c.from('tasks').update({title:title.trim(),priority:['P0','P1','P2'].includes(String(priority).toUpperCase())?String(priority).toUpperCase():'P1',notes,updated_at:new Date().toISOString()}).eq('user_id',u.id).eq('id',id);if(e)throw e;await refreshTaskPanel()}catch(e){alert('修改任務失敗：'+e.message)}};
  window.mpDeleteTask=async id=>{if(!confirm('確定刪除這個本月任務？'))return;try{const {error}=await c.from('tasks').delete().eq('user_id',u.id).eq('id',id);if(error)throw error;await refreshTaskPanel()}catch(e){alert('刪除任務失敗：'+e.message)}};
  window.mpToggleTask=async(id,done)=>{try{const {error}=await c.from('tasks').update({status:done?'done':'todo',updated_at:new Date().toISOString()}).eq('user_id',u.id).eq('id',id);if(error)throw error;await refreshTaskPanel()}catch(e){alert('更新任務失敗：'+e.message)}};
  window.mpCreateMonthlyTaskTemplate=async()=>{try{const existing=await currentTasks();if(existing.length&&!confirm('本月已有任務，仍要補上缺少的標準任務嗎？'))return;const rows=taskDefaults.map((title,i)=>({user_id:u.id,month:taskMonth(),task_key:'standard_'+(i+1),title,priority:i<4?'P0':'P1',status:'todo'}));const {error}=await c.from('tasks').upsert(rows,{onConflict:'user_id,month,task_key',ignoreDuplicates:true});if(error)throw error;await refreshTaskPanel()}catch(e){alert('建立任務模板失敗：'+e.message)}};
  async function refreshTaskPanel(){
    let t='o';try{t=tab||'o'}catch(_){}if(t!=='o')return;
    const heading=[...document.querySelectorAll('h3')].find(x=>String(x.textContent||'').includes('本月作戰清單'));
    if(!heading)return;
    const card=heading.closest('.card');if(!card)return;
    try{
      const tasks=await currentTasks(),done=tasks.filter(x=>x.status==='done').length,month=taskMonth().slice(0,7);
      card.innerHTML=`<div class="split"><div><div class="section-kicker">MONTHLY TASKS · ${month}</div><h3 style="margin:0">本月作戰清單</h3></div><span class="pill">${done}/${tasks.length}</span></div><div class="tiny" style="margin-top:5px">任務按月份管理，不會再把 9 月清單一路帶到 11 月。</div><div style="margin-top:8px">${tasks.map(z=>`<div class="task" style="align-items:flex-start"><input type="checkbox" ${z.status==='done'?'checked':''} onchange="mpToggleTask('${z.id}',this.checked)"><div style="flex:1"><b>${escx(z.title||'')}</b><div class="tiny">${escx(z.priority||'P1')}${z.notes?' · '+escx(z.notes):''}</div></div><button class="btn ghost" style="min-height:34px;padding:6px 9px" onclick="mpEditTask('${z.id}')">編輯</button><button class="btn danger-btn" style="min-height:34px;padding:6px 9px" onclick="mpDeleteTask('${z.id}')">刪除</button></div>`).join('')||'<div class="empty">本月尚無任務。你可以建立標準模板或自己新增。</div>'}</div><div class="actions"><button class="btn main" onclick="mpAddTask()">＋ 新增任務</button><button class="btn soft" onclick="mpCreateMonthlyTaskTemplate()">建立本月標準模板</button></div>`;
      document.querySelectorAll('.pill').forEach(p=>{if(/^任務\s/.test(String(p.textContent||'')))p.textContent=`任務 ${done}/${tasks.length}`});
    }catch(e){console.warn('task panel',e)}
  }

  let learningBound=false;
  async function bindLearningProgress(){
    let t='o';try{t=tab||'o'}catch(_){}if(t!=='l'){learningBound=false;return}
    const boxes=[...document.querySelectorAll('.course-check input[type="checkbox"]')];if(!boxes.length)return;
    try{
      const {data,error}=await c.from('profiles').select('learning_progress').eq('user_id',u.id).maybeSingle();if(error)throw error;
      const prog=data?.learning_progress&&typeof data.learning_progress==='object'?data.learning_progress:{};
      const key='total_return_course';const arr=Array.isArray(prog[key])?prog[key]:[];
      boxes.forEach((b,i)=>{b.checked=!!arr[i];b.onchange=async()=>{const next=boxes.map(x=>!!x.checked);const updated={...prog,[key]:next};const {error:e}=await c.from('profiles').upsert({user_id:u.id,learning_progress:updated,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(e)console.warn('learning progress save',e)}});
      learningBound=true;
    }catch(e){console.warn('learning progress load',e)}
  }

  async function afterRender(){
    fixMobileMore();
    await loadCloudBudget();
    await syncPaymentMethodOptions();
    await refreshTaskPanel();
    await bindLearningProgress();
  }

  const old=window.render;
  if(typeof old==='function'&&!old.__mpQuality24){
    const w=async function(){const r=await old.apply(this,arguments);await afterRender();return r};
    w.__mpQuality24=true;window.render=w;try{render=w}catch(_){}
  }

  let tries=0;
  const timer=setInterval(async()=>{
    tries++;
    try{await loadCloudBudget();fixMobileMore();await syncPaymentMethodOptions()}catch(_){}
    if(cloudBudgetUser||tries>12)clearInterval(timer);
  },400);
})();
window.MILLIONPROJECT_BUDGET_UX_VERSION="budget-25";
(()=>{
  if(window.__MP_BUDGET25)return;
  window.__MP_BUDGET25=true;

  const DEFAULT={rent:3000,family:9000,telecom:899,gym:980,daily:8000,leisure:5500};
  const DEFAULT_FIXED={rent:true,family:true,telecom:true,gym:true,daily:false,leisure:false};
  const META={
    rent:{label:'房租／住宿',desc:'房租、住宿費、管理費',icon:'⌂',category:'房租／住宿'},
    family:{label:'父母／家庭',desc:'孝親、家庭固定支持',icon:'♡',category:'父母／家庭支持'},
    telecom:{label:'電信／網路',desc:'手機、網路、固定訂閱',icon:'⌁',category:'電信／網路'},
    gym:{label:'健身／健康',desc:'健身房、固定健康支出',icon:'+',category:'健身／健康'},
    daily:{label:'餐飲／交通／日常',desc:'每月可調整的生活上限',icon:'◌',category:'餐飲／交通／日常'},
    leisure:{label:'娛樂／治裝彈性',desc:'娛樂、服飾與非必要消費',icon:'◇',category:'娛樂／治裝彈性'}
  };
  const KEYS=Object.keys(META);
  const money25=n=>'NT$'+Math.round(+n||0).toLocaleString('zh-TW');
  const esc25=s=>String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#39;'}[m]));
  const selected25=()=>{try{return (typeof selectedMonth==='function'?selectedMonth():(document.getElementById('salary_month')?.value||new Date().toISOString().slice(0,7))).slice(0,7)}catch(_){return new Date().toISOString().slice(0,7)}};

  function readProfile(){
    let p={};
    try{p=typeof getBudgetProfile==='function'?getBudgetProfile():JSON.parse(localStorage.getItem('millionproject_budget_profile')||'{}')}catch(_){}
    const out={...DEFAULT,...p};
    out.__fixed={...DEFAULT_FIXED,...(p?.__fixed||{})};
    return out;
  }

  async function persistProfile(next,rerender=false){
    try{
      window.__mpBudgetProfile=next;
      localStorage.setItem('millionproject_budget_profile',JSON.stringify(next));
      if(typeof c!=='undefined'&&typeof u!=='undefined'&&c&&u){
        const {error}=await c.from('profiles').upsert({user_id:u.id,budget_profile:next,updated_at:new Date().toISOString()},{onConflict:'user_id'});
        if(error)throw error;
      }
      try{if(typeof previewAllocation==='function')previewAllocation()}catch(_){}
      if(rerender&&typeof render==='function')await render();
      return true;
    }catch(e){alert('生活預算儲存失敗：'+e.message);return false}
  }

  window.mpLifeSave=async()=>{
    const p=readProfile();
    for(const k of KEYS)p[k]=Math.max(0,+(document.getElementById('bp_'+k)?.value??p[k])||0);
    await persistProfile(p,false);
    await enhanceLifeBudget();
    if(typeof mpToast==='function')mpToast('生活預算已同步');
  };

  window.mpLifeToggle=async key=>{
    const p=readProfile();
    p.__fixed={...DEFAULT_FIXED,...(p.__fixed||{})};
    p.__fixed[key]=!p.__fixed[key];
    for(const k of KEYS)p[k]=Math.max(0,+(document.getElementById('bp_'+k)?.value??p[k])||0);
    await persistProfile(p,false);
    await enhanceLifeBudget();
  };

  function isLifeCategory(entry,key){
    const c=String(entry?.category||'');
    if(key==='rent')return /房租|住宿|管理費/.test(c);
    if(key==='family')return /父母|家庭|孝親/.test(c);
    if(key==='telecom')return /電信|網路|手機/.test(c);
    if(key==='gym')return /健身|健康/.test(c);
    if(key==='daily')return /餐飲|交通|日常/.test(c);
    if(key==='leisure')return /娛樂|治裝|服飾/.test(c);
    return false;
  }

  async function monthEntries(month){
    try{
      if(typeof q==='function')return (await q('finance_entries',{order:'entry_date'})).filter(x=>String(x.month||'').slice(0,7)===month&&x.entry_type==='expense');
    }catch(_){}
    return [];
  }

  function statusFor(entries,key,amount){
    const tagged=entries.filter(x=>String(x.note||'').includes(`[LIFE_FIXED:${key}]`)||String(x.note||'').includes(`[FIXED_AUTO:`)&&String(x.note||'').includes(`:${key}]`));
    const related=entries.filter(x=>isLifeCategory(x,key));
    const paid=(tagged.length?tagged:related).reduce((s,x)=>s+(+x.amount||0),0);
    return {paid,done:amount>0&&paid>=amount};
  }

  window.mpLifeQuickRecord=(key)=>{
    const p=readProfile(),m=META[key];
    if(!m)return;
    if(typeof mpQuickOpen==='function')return mpQuickOpen('expense',{category:m.category,amount:+p[key]||0,note:'固定生活責任',fixedKey:key});
    try{
      if(typeof mpGo==='function')mpGo('m');
      setTimeout(()=>{
        const type=document.getElementById('et');if(type){type.value='expense';type.dispatchEvent(new Event('change'))}
        const cat=document.getElementById('ec');if(cat)cat.value=m.category;
        const amt=document.getElementById('ea');if(amt)amt.value=+p[key]||0;
        const note=document.getElementById('en');if(note)note.value='固定生活責任';
        document.getElementById('ea')?.focus();
      },180);
    }catch(_){}
  };

  window.mpLifeFixedSheet=async()=>{
    document.getElementById('mp-life-fixed-sheet')?.remove();
    const p=readProfile(),month=selected25(),entries=await monthEntries(month);
    const fixed=KEYS.filter(k=>p.__fixed?.[k]&&(+p[k]||0)>0);
    const rows=fixed.map(k=>{const m=META[k],st=statusFor(entries,k,+p[k]||0);return `<div class="mp25-fixed-row"><div class="mp25-life-icon">${m.icon}</div><div style="flex:1"><b>${esc25(m.label)}</b><div class="tiny">${money25(p[k])} · ${st.done?'本月已記錄':st.paid>0?'已記 '+money25(st.paid):'尚未記錄'}</div></div>${st.done?'<span class="pill buy">完成</span>':`<button class="btn main" onclick="document.getElementById('mp-life-fixed-sheet')?.remove();mpLifeQuickRecord('${k}')">記錄</button>`}</div>`}).join('');
    const e=document.createElement('div');e.id='mp-life-fixed-sheet';e.className='mp25-sheetback';e.onclick=x=>{if(x.target===e)e.remove()};
    e.innerHTML=`<div class="mp25-sheet"><div class="split"><div><div class="section-kicker">FIXED RESPONSIBILITIES</div><h3 style="margin:3px 0">${month} 固定責任</h3><div class="tiny">只有真的支付時才記帳；預留金額不會提前算成支出。</div></div><button class="btn ghost" onclick="document.getElementById('mp-life-fixed-sheet')?.remove()">關閉</button></div><div style="margin-top:12px">${rows||'<div class="empty">目前沒有設定固定責任。</div>'}</div></div>`;
    document.body.appendChild(e);
  };

  async function enhanceLifeBudget(){
    let t='o';try{t=tab||'o'}catch(_){}if(t!=='m')return;
    const grid=document.querySelector('.finance-layout .budget-grid');
    if(!grid)return;
    const card=grid.closest('.card');if(!card)return;
    const p=readProfile(),month=selected25(),entries=await monthEntries(month);
    const fixedTotal=KEYS.filter(k=>p.__fixed?.[k]).reduce((s,k)=>s+(+p[k]||0),0);
    const flexTotal=KEYS.filter(k=>!p.__fixed?.[k]).reduce((s,k)=>s+(+p[k]||0),0);
    const total=fixedTotal+flexTotal;
    const lifeSpent=KEYS.reduce((s,k)=>s+entries.filter(x=>isLifeCategory(x,k)).reduce((a,x)=>a+(+x.amount||0),0),0);
    const left=Math.max(0,total-lifeSpent);
    const fixedDone=KEYS.filter(k=>p.__fixed?.[k]&&statusFor(entries,k,+p[k]||0).done).length;
    const fixedCount=KEYS.filter(k=>p.__fixed?.[k]&&(+p[k]||0)>0).length;

    card.classList.add('mp25-life-card');
    card.innerHTML=`
      <div class="mp25-life-head">
        <div><div class="section-kicker">STEP 2 · LIFE FIRST</div><h3>② 先保留整月生活責任</h3><div class="tiny">先決定「一定要留多少」，實際支出仍在付款發生時才記帳。</div></div>
        <div class="mp25-life-total"><span>本月預留</span><b>${money25(total)}</b></div>
      </div>
      <div class="mp25-life-summary">
        <div><span>固定責任</span><b>${money25(fixedTotal)}</b><small>${fixedCount} 個固定項目</small></div>
        <div><span>彈性預算</span><b>${money25(flexTotal)}</b><small>可調整的生活上限</small></div>
        <div><span>本月生活餘額</span><b>${money25(left)}</b><small>生活類支出已用 ${money25(lifeSpent)}</small></div>
      </div>
      <div class="mp25-life-list">
        ${KEYS.map(k=>{const m=META[k],fixed=!!p.__fixed?.[k],st=statusFor(entries,k,+p[k]||0);return `<div class="mp25-life-row">
          <div class="mp25-life-icon">${m.icon}</div>
          <div class="mp25-life-copy"><b>${esc25(m.label)}</b><span>${esc25(m.desc)}</span></div>
          <button class="mp25-mode ${fixed?'fixed':'flex'}" onclick="mpLifeToggle('${k}')">${fixed?'固定':'彈性'}</button>
          <div class="mp25-amt"><span>NT$</span><input id="bp_${k}" type="number" min="0" inputmode="numeric" value="${+p[k]||0}" onblur="mpLifeSave()"></div>
          <div class="mp25-state">${fixed?(st.done?'<span class="pill buy">本月已記</span>':st.paid>0?`<span class="pill watch">已記 ${money25(st.paid)}</span>`:'<span class="pill">待付款</span>'):'<span class="tiny">預算上限</span>'}</div>
        </div>`}).join('')}
      </div>
      <div class="mp25-life-actions">
        <button class="btn main" onclick="mpLifeSave()">儲存生活規劃</button>
        <button class="btn soft" onclick="mpLifeFixedSheet()">固定支出進度 ${fixedDone}/${fixedCount}</button>
        <span class="tiny">固定／彈性可直接切換；設定會同步到手機與電腦。</span>
      </div>`;
  }
  window.mpEnhanceLifeBudget=enhanceLifeBudget;

  const css=`
  .mp25-life-card{overflow:hidden}.mp25-life-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px}.mp25-life-head h3{margin:3px 0}.mp25-life-total{min-width:150px;text-align:right;background:#0f172a;color:#fff;border-radius:15px;padding:10px 13px}.mp25-life-total span{display:block;font-size:10px;color:#cbd5e1;font-weight:800}.mp25-life-total b{display:block;font-size:20px;margin-top:1px}
  .mp25-life-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.mp25-life-summary>div{border:1px solid #e5e7eb;border-radius:14px;padding:11px;background:#f8fafc}.mp25-life-summary span,.mp25-life-summary small{display:block;color:#64748b;font-size:10px}.mp25-life-summary b{display:block;font-size:18px;margin:2px 0}.mp25-life-summary small{line-height:1.35}
  .mp25-life-list{border:1px solid #e5e7eb;border-radius:16px;overflow:hidden}.mp25-life-row{display:grid;grid-template-columns:34px minmax(170px,1fr) 64px 145px 104px;gap:10px;align-items:center;padding:10px 12px;background:#fff;border-bottom:1px solid #edf0f4}.mp25-life-row:last-child{border-bottom:0}.mp25-life-icon{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:#eef4ff;color:#2563eb;font-weight:900}.mp25-life-copy b,.mp25-life-copy span{display:block}.mp25-life-copy span{font-size:10px;color:#7b8494;margin-top:1px}.mp25-mode{border:0;border-radius:999px;padding:6px 8px;font-size:10px;font-weight:900;cursor:pointer}.mp25-mode.fixed{background:#e0e7ff;color:#3730a3}.mp25-mode.flex{background:#f1f5f9;color:#475569}.mp25-amt{display:flex;align-items:center;border:1px solid #dfe4ec;border-radius:11px;background:#fff;overflow:hidden}.mp25-amt span{padding-left:9px;color:#94a3b8;font-size:10px;font-weight:800}.mp25-amt input{width:100%;border:0!important;box-shadow:none!important;outline:0;padding:8px 8px 8px 4px!important;min-height:36px!important;background:transparent!important;font-weight:800}.mp25-state{text-align:right}.mp25-life-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}
  .mp25-sheetback{position:fixed;inset:0;z-index:10010;background:rgba(15,23,42,.38);display:grid;place-items:center;padding:14px}.mp25-sheet{width:min(560px,100%);background:#fff;border-radius:22px;padding:16px;box-shadow:0 26px 80px rgba(15,23,42,.25);max-height:82vh;overflow:auto}.mp25-fixed-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #edf0f4}.mp25-fixed-row:last-child{border-bottom:0}
  @media(max-width:900px){.mp25-life-head{display:block}.mp25-life-total{margin-top:10px;width:100%;text-align:left}.mp25-life-summary{grid-template-columns:1fr 1fr}.mp25-life-summary>div:last-child{grid-column:1/-1}.mp25-life-row{grid-template-columns:32px minmax(0,1fr) 58px 115px;padding:10px}.mp25-state{grid-column:2/-1;text-align:left;margin-top:-4px}.mp25-life-copy span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mp25-life-actions .btn{flex:1}.mp25-sheetback{place-items:end center;padding:8px}.mp25-sheet{border-radius:22px 22px 12px 12px;max-height:88vh}}
  @media(max-width:430px){.mp25-life-summary{grid-template-columns:1fr}.mp25-life-summary>div:last-child{grid-column:auto}.mp25-life-row{grid-template-columns:30px minmax(0,1fr) 54px}.mp25-amt{grid-column:2/-1}.mp25-state{grid-column:2/-1}.mp25-mode{justify-self:end}.mp25-life-actions{display:grid;grid-template-columns:1fr 1fr}.mp25-life-actions .tiny{grid-column:1/-1}}
  `;
  const st=document.createElement('style');st.id='mp-budget25-style';st.textContent=css;document.head.appendChild(st);

  const oldRender=window.render;
  if(typeof oldRender==='function'&&!oldRender.__mpBudget25){const w=async function(){const r=await oldRender.apply(this,arguments);await enhanceLifeBudget();return r};w.__mpBudget25=true;window.render=w;try{render=w}catch(_){}}
  setTimeout(enhanceLifeBudget,180);
})();
