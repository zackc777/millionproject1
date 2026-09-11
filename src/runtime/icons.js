
window.MILLIONPROJECT_ICONS_VERSION='icons-32-svg';
(()=>{
  if(window.__MP_ICONS32)return;
  window.__MP_ICONS32=true;

  const SVG={
    o:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/></svg>`,
    m:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z"/><path d="M7 10h10M7 14h6"/><path d="M8 3v3M16 3v3"/></svg>`,
    c:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6 15h4"/></svg>`,
    p:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16"/><path d="M7 15l3.5-4 3 2 4.5-6"/><path d="M15.5 7H18v2.5"/></svg>`,
    r:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/><path d="M8 10.5h5M10.5 8v5"/></svg>`,
    d:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>`,
    l:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22z"/></svg>`,
    s:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1-2.9 2.9-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21h-4v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1-2.9-2.9.1-.1a1.6 1.6 0 0 0 .3-1.8A1.6 1.6 0 0 0 3.1 14H3v-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1 2.9-2.9.1.1A1.6 1.6 0 0 0 9 4.6a1.6 1.6 0 0 0 1-1.5V3h4v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1 2.9 2.9-.1.1A1.6 1.6 0 0 0 19.4 9a1.6 1.6 0 0 0 1.5 1H21v4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>`,
    quick:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L5 13h6l-1 9 9-13h-6z"/></svg>`,
    more:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>`
  };

  const css=`
    .mp-nav-icon,.mp-mobile-icon,.mp-quick-icon{
      display:inline-grid;place-items:center;flex:0 0 auto;color:currentColor;
    }
    .mp-nav-icon{width:20px;height:20px;border-radius:7px}
    .mp-mobile-icon{width:18px;height:18px;margin:1px 0}
    .mp-quick-icon{width:18px;height:18px}
    .mp-nav-icon svg,.mp-mobile-icon svg,.mp-quick-icon svg{
      width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.8;
      stroke-linecap:round;stroke-linejoin:round;
    }
    #mp-shell28-side .mp-s28-nav{
      display:flex!important;align-items:center;gap:10px!important;
      transition:background-color .12s ease,color .12s ease,transform .12s ease;
    }
    #mp-shell28-side .mp-s28-nav:hover{background:#f6f8fb}
    #mp-shell28-side .mp-s28-nav.active .mp-nav-icon{
      background:#dbeafe;box-shadow:inset 0 0 0 1px rgba(37,99,235,.08);
    }
    #mp-shell28-side .mp-s28-nav.active{font-weight:900}
    #mp-shell28-side .mp-s28-quick{
      display:flex!important;align-items:center;justify-content:center;gap:9px;
      box-shadow:0 8px 18px rgba(15,23,42,.10);
      transition:transform .12s ease,box-shadow .12s ease,background-color .12s ease;
    }
    #mp-shell28-side .mp-s28-quick:hover{
      transform:translateY(-1px);box-shadow:0 10px 22px rgba(15,23,42,.14);background:#111b2d;
    }
    #mp-shell28-mobile button{
      display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:1px;
    }
    #mp-shell28-mobile button br{display:none}
    #mp-shell28-mobile button>b{font-size:9px!important;line-height:1;color:#94a3b8;font-weight:800}
    #mp-shell28-mobile button.active>b{color:#2563eb}
    #mp-shell28-mobile button.active .mp-mobile-icon{color:#2563eb}
    #mp-shell28-mobile .mp-mobile-label{font-size:9px;line-height:1.1;font-weight:850}
    #mp-shell28-fab{font-size:0!important;transition:transform .12s ease,box-shadow .12s ease}
    #mp-shell28-fab .mp-quick-icon{width:22px;height:22px}
    #mp-shell28-fab:active{transform:scale(.96)}
    .mp-s28-head .btn.main,.mp-s28-head button.main{
      display:inline-flex;align-items:center;justify-content:center;gap:7px;
    }
    .brandx .mp-s28-logo{box-shadow:0 8px 18px rgba(79,70,229,.18)}
  `;
  if(!document.getElementById('mp-icons32-style')){
    const st=document.createElement('style');
    st.id='mp-icons32-style';
    st.textContent=css;
    document.head.appendChild(st);
  }

  function span(cls,key){
    const s=document.createElement('span');
    s.className=cls;
    s.setAttribute('aria-hidden','true');
    s.innerHTML=SVG[key]||'';
    return s;
  }

  function apply(){
    const side=document.getElementById('mp-shell28-side');
    if(side){
      side.querySelectorAll('.mp-s28-nav[data-s28]').forEach(btn=>{
        const key=btn.dataset.s28;
        if(!btn.querySelector('.mp-nav-icon')) btn.prepend(span('mp-nav-icon',key));
      });
      const q=side.querySelector('.mp-s28-quick');
      if(q && !q.querySelector('.mp-quick-icon')) q.prepend(span('mp-quick-icon','quick'));
    }

    const mobile=document.getElementById('mp-shell28-mobile');
    if(mobile){
      mobile.querySelectorAll('button[data-s28]').forEach(btn=>{
        const key=btn.dataset.s28;
        if(!btn.querySelector('.mp-mobile-icon')){
          const icon=span('mp-mobile-icon',key);
          const number=btn.querySelector('b');
          if(number) number.after(icon); else btn.prepend(icon);
          const nodes=[...btn.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE && n.textContent.trim());
          nodes.forEach(n=>{
            const label=document.createElement('span');
            label.className='mp-mobile-label';
            label.textContent=n.textContent.trim();
            n.replaceWith(label);
          });
        }
      });
      const more=[...mobile.querySelectorAll('button')].find(b=>!b.dataset.s28);
      if(more && !more.querySelector('.mp-mobile-icon')){
        more.innerHTML='';
        more.appendChild(span('mp-mobile-icon','more'));
        const label=document.createElement('span');
        label.className='mp-mobile-label';
        label.textContent='更多';
        more.appendChild(label);
      }
    }

    const fab=document.getElementById('mp-shell28-fab');
    if(fab && !fab.querySelector('.mp-quick-icon')){
      fab.textContent='';
      fab.appendChild(span('mp-quick-icon','quick'));
      fab.setAttribute('aria-label','快速操作');
      fab.title='快速操作';
    }

    const head=document.querySelector('.mp-s28-head');
    if(head){
      const q=head.querySelector('.btn.main,button.main');
      if(q && !q.querySelector('.mp-quick-icon')) q.prepend(span('mp-quick-icon','quick'));
    }
  }

  [40,120,320,900].forEach(ms=>setTimeout(apply,ms));
})();
