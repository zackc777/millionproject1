
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
      const cards=await mpLoadCards();
      selects.forEach(sel=>mpFillCardOptions(sel,cards));
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
