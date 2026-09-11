import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

export const read = file => readFileSync(new URL('../'+file, import.meta.url), 'utf8');
export const plain = value => JSON.parse(JSON.stringify(value));
export function harness(now='2026-09-18T04:00:00Z') {
  const elements=new Map(), events=new Map(), timers=[], alerts=[], writes=[], snapshots=[];
  const db={credit_cards:[], finance_entries:[], credit_card_payments:[], investment_transactions:[]};
  let failTable=null;
  function element() {
    return {value:'',innerHTML:'',textContent:'',style:{},dataset:{},options:[],children:[],
      classList:{toggle(){},add(){},remove(){}},
      replaceChildren(){this.options=[];this.children=[];this.value=''},
      appendChild(e){this.children.push(e);this.options.push(e);if(this.options.length===1)this.value=e.value;return e},
      remove(){},focus(){},closest(){return null},querySelector(){return null}};
  }
  const document={body:element(),head:element(),createElement:element,
    getElementById:id=>elements.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],
    addEventListener:(type,fn)=>{if(!events.has(type))events.set(type,[]);events.get(type).push(fn)}};
  const app=element();elements.set('app',app);
  class Query {
    constructor(table){this.table=table;this.filters=[];this.action='select'}
    select(){return this} order(){return this} limit(){return this}
    eq(key,val){this.filters.push(row=>String(row[key])===String(val));return this}
    insert(row){this.action='insert';this.row=row;return this}
    upsert(row){this.action='upsert';this.row=row;return this}
    update(row){this.action='update';this.row=row;return this}
    delete(){this.action='delete';return this}
    maybeSingle(){this.single=true;return this}
    range(start,end){this.start=start;this.end=end;return this}
    then(resolve,reject){return Promise.resolve().then(()=>{
      if(failTable===this.table)return {data:null,error:{message:'test read failure'}};
      const rows=db[this.table]||[],match=row=>this.filters.every(f=>f(row));
      let data=rows.filter(match);
      if(this.action==='select'&&this.start!=null)data=data.slice(this.start,this.end+1);
      if(this.action==='upsert'){
        const existing=rows.find(x=>x.user_id===this.row.user_id);
        if(existing){Object.assign(existing,plain(this.row));data=[existing]}
        else{const inserted={id:String(rows.length+1),...plain(this.row)};rows.push(inserted);db[this.table]=rows;data=[inserted]}
      }else if(this.action==='insert'){
        const inserted=(Array.isArray(this.row)?this.row:[this.row]).map(row=>({id:String(rows.length+1),...plain(row)}));
        rows.push(...inserted);db[this.table]=rows;data=inserted;
      }else if(this.action==='update')data.forEach(row=>Object.assign(row,plain(this.row)));
      else if(this.action==='delete')db[this.table]=rows.filter(row=>!match(row));
      if(this.action!=='select')writes.push({table:this.table,action:this.action,row:plain(this.row||{}),ids:data.map(x=>x.id)});
      return {data:this.single?plain(data[0]||null):plain(data),error:null};
    }).then(resolve,reject)}
  }
  const prompts=[];
  class Clock extends Date { constructor(...args){super(...(args.length?args:[now]))} static now(){return +new Date(now)} }
  const ctx=createContext({document,Date:Clock,Intl,console,performance,
    u:{id:'test-user'},c:{from:table=>new Query(table)},
    alert:message=>alerts.push(message),prompt:()=>prompts.shift()??null,confirm:()=>true,
    setTimeout:fn=>{timers.push(fn);return timers.length},requestAnimationFrame:fn=>{timers.push(fn)},
    MutationObserver:class{observe(){}},
    q:async table=>plain((db[table]||[]).filter(x=>x.user_id==='test-user')),
    currentMonthEntries:async()=>plain(db.finance_entries.filter(x=>x.user_id==='test-user')),
    plannedLivingTotal:()=>20000,monthly:async()=>{},render:async()=>{},v7Toast:()=>{},
    moneyEngine:async month=>({month}),monthKey:month=>month.slice(0,7),
    persistMonthSnapshot:async month=>snapshots.push(month)});
  ctx.window=ctx;ctx.$=document.getElementById;
  function load(file){runInContext(read(file),ctx,{filename:file})}
  function loadFinance(){const html=read('index.html');runInContext(html.slice(html.lastIndexOf('async function addFinanceEntry(){'),html.indexOf('let investmentReturnTab=')),ctx)}
  function field(id,value){const e=element();e.value=value;elements.set(id,e);return e}
  ctx.readMoneyTable=async(table)=>{const result=await ctx.c.from(table).select('*').eq('user_id',ctx.u.id);if(result.error)throw new Error(result.error.message);return result.data};
  ctx.esc=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  ctx.money=value=>'NT$'+Math.round(+value||0).toLocaleString();
  load('src/card-model.js');load('src/card-service.js');load('src/finance-model.js');load('src/finance-view.js');
  return {ctx,db,app,elements,events,timers,alerts,writes,prompts,snapshots,field,load,loadFinance,
    fail:table=>{failTable=table}};
}
export function card(id='1',issuer='台新',name='玫瑰卡') {
  return {id,user_id:'test-user',issuer,card_name:name,status:'active',statement_day:17,due_day:2,credit_limit:20000};
}

export function fillPayment(h,{amount=300,date='2026-09-18',cycle='2026-09-17',cardId='1',note=''}={}) {
  for(const [key,value] of Object.entries({amount,date,cycle,card:'card:'+cardId,note}))h.field('mppay-'+key,String(value));
}
