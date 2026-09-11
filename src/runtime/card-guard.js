window.MILLIONPROJECT_CARD_GUARD_VERSION='cardguard-source-1';
(()=>{
  if(window.__MP_CARDGUARD33)return; window.__MP_CARDGUARD33=true;
  const localYmd=(d=new Date())=>MPCardModel.today(d);
  const short=value=>{const p=MPCardModel.parts(value);return p.month+'/'+p.day};
  const futureMsg='實際金流不能使用未來日期。若是尚未發生的固定帳單，請先放在「固定責任／預算」，實際付款時再記錄。';
  const css='#mpcc-cycle-preview{margin-top:10px;padding:11px 13px;border:1px solid #dbe7ff;background:#f4f8ff;border-radius:13px;color:#334155;font-size:12px;line-height:1.55}#mpcc-cycle-preview b{color:#1d4ed8}#mpcc-cycle-preview.warn{border-color:#fed7aa;background:#fff7ed;color:#9a3412}#mpcc-cycle-preview.warn b{color:#c2410c}';
  const st=document.createElement('style');st.id='mp-cardguard-style';st.textContent=css;document.head.appendChild(st);
  async function preview(){
    const dateEl=document.getElementById('mpcc-date'),cardEl=document.getElementById('mpcc-card');if(!dateEl||!cardEl)return;
    const today=localYmd();dateEl.max=today;
    let box=document.getElementById('mpcc-cycle-preview');if(!box){box=document.createElement('div');box.id='mpcc-cycle-preview';const form=dateEl.closest('.entry-form');if(form)form.insertAdjacentElement('afterend',box);else dateEl.parentElement?.appendChild(box)}
    const d=dateEl.value,issuer=cardEl.value;if(!d||!issuer){box.textContent='選擇日期與卡片後，這裡會顯示帳單歸屬。';return}
    let card;try{card=MPCardModel.resolve(issuer,await mpLoadCards())}catch(e){box.textContent=e.message;return}
    if(document.getElementById('mpcc-date')!==dateEl||dateEl.value!==d||cardEl.value!==issuer)return;
    if(!card){box.textContent='找不到這張卡的結帳設定。';return}
    let ce,due;try{ce=MPCardModel.cycleEnd(d,card.statement_day);due=MPCardModel.shiftMonth(ce,1,card.due_day)}catch(e){box.textContent=e.message;return}
    const isFuture=d>today;
    box.classList.toggle('warn',isFuture);
    box.innerHTML=(isFuture?'<b>未來日期：</b>這筆目前不屬於已發生支出。<br>':'')+'<b>帳單歸屬：</b>'+short(ce)+' 結帳 → '+short(due)+' 繳款'+(isFuture?'<br>實際發生後再記錄，月支出與信用卡帳單才會一致。':'');
  }
  function setDateGuards(){const today=localYmd();['mpcc-date','mp31-date','mp28-date'].forEach(id=>{const el=document.getElementById(id);if(el)el.max=today});preview()}
  const oldCardSpend=window.mpAddCardSpend;if(typeof oldCardSpend==='function'&&!oldCardSpend.__mpGuard33){const w=async function(){const d=document.getElementById('mpcc-date')?.value;if(d&&d>localYmd())return alert(futureMsg);return oldCardSpend.apply(this,arguments)};w.__mpGuard33=true;window.mpAddCardSpend=w}
  const oldQuickSave=window.mp31Save;if(typeof oldQuickSave==='function'&&!oldQuickSave.__mpGuard33){const w=async function(){const d=document.getElementById('mp31-date')?.value;if(d&&d>localYmd())return alert(futureMsg);return oldQuickSave.apply(this,arguments)};w.__mpGuard33=true;window.mp31Save=w}
  document.addEventListener('change',e=>{if(e.target?.id==='mpcc-date'||e.target?.id==='mpcc-card')preview()},true);
  // Root replacements and quick-modal insertion are sufficient. Do not observe
  // the preview's own text changes: that used to schedule an endless refresh.
  let scheduled=false;
  const obs=new MutationObserver(()=>{
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;setDateGuards()});
  });
  const app=document.getElementById('app');if(app)obs.observe(app,{childList:true});
  obs.observe(document.body,{childList:true});
  setTimeout(setDateGuards,100);
})();
