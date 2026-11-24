/* La oficina: motor isométrico, agentes y sus paneles */
const GMAIL_READ_SCOPE='https://www.googleapis.com/auth/gmail.modify';
const Office=(()=>{
'use strict';
/* ---------- Motor isométrico ---------- */
const N=12, TW=64, TH=32, TZ=38, WH=2.4, DOOR_Y=9;
const DIRS=[[0,1],[1,0],[0,-1],[-1,0]];
const FV=[[-32,16],[32,16],[32,-16],[-32,-16]];
const iso=(x,y,z=0)=>[(x-y)*TW/2,(x+y)*TH/2-z*TZ];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
const _rgb={};
function hexRgb(h){ if(_rgb[h])return _rgb[h]; if(h.startsWith('rgb')) return _rgb[h]=h.match(/[\d.]+/g).slice(0,3).map(Number); let s=h.replace('#',''); if(s.length===3)s=s.split('').map(c=>c+c).join(''); const n=parseInt(s,16); return _rgb[h]=[(n>>16)&255,(n>>8)&255,n&255]; }
const _sh={};
function shade(h,f){ const k=h+'|'+f; if(_sh[k])return _sh[k]; const [r,g,b]=hexRgb(h); const m=f<0?0:255,a=Math.abs(f); return _sh[k]=`rgb(${Math.round(r+(m-r)*a)},${Math.round(g+(m-g)*a)},${Math.round(b+(m-b)*a)})`; }
function mix(a,b,t){ const A=hexRgb(a),B=hexRgb(b); return `rgb(${Math.round(A[0]+(B[0]-A[0])*t)},${Math.round(A[1]+(B[1]-A[1])*t)},${Math.round(A[2]+(B[2]-A[2])*t)})`; }
function poly(c,pts,fill,stroke,lw){ c.beginPath(); c.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]); c.closePath(); if(fill){c.fillStyle=fill;c.fill();} if(stroke){c.strokeStyle=stroke;c.lineWidth=lw||1;c.stroke();} }
function box(c,x,y,z,w,d,h,col){
  const A=iso(x,y,z+h),B=iso(x+w,y,z+h),C=iso(x+w,y+d,z+h),D=iso(x,y+d,z+h),E=iso(x+w,y,z),F=iso(x+w,y+d,z),G=iso(x,y+d,z);
  poly(c,[B,C,F,E],shade(col,-0.14)); poly(c,[D,C,F,G],shade(col,-0.28)); poly(c,[A,B,C,D],col);
  c.strokeStyle='rgba(20,18,30,.22)'; c.lineWidth=.6; c.beginPath(); c.moveTo(D[0],D[1]); c.lineTo(C[0],C[1]); c.lineTo(B[0],B[1]); c.moveTo(C[0],C[1]); c.lineTo(F[0],F[1]); c.stroke();
}
function rr(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function qp(q,s,t){ const tx=q[0][0]+(q[1][0]-q[0][0])*s, ty=q[0][1]+(q[1][1]-q[0][1])*s, bx=q[3][0]+(q[2][0]-q[3][0])*s, by=q[3][1]+(q[2][1]-q[3][1])*s; return [tx+(bx-tx)*t, ty+(by-ty)*t]; }
function subq(q,s0,t0,s1,t1){ return [qp(q,s0,t0),qp(q,s1,t0),qp(q,s1,t1),qp(q,s0,t1)]; }
function mapPt(r,u,v){ switch(r){case 0:return[u,v];case 1:return[v,1-u];case 2:return[1-u,1-v];default:return[1-v,u];} }
function Rig(o){ this.o=o; this.parts=[]; }
Rig.prototype.box=function(u,v,z,w,d,h,col){ const o=this.o,a=mapPt(o.r,u,v),b=mapPt(o.r,u+w,v+d); const x0=o.x+Math.min(a[0],b[0]),x1=o.x+Math.max(a[0],b[0]),y0=o.y+Math.min(a[1],b[1]),y1=o.y+Math.max(a[1],b[1]); this.parts.push({b:{x0,x1,y0,y1,z0:z,z1:z+h},f:c=>box(c,x0,y0,z,x1-x0,y1-y0,h,col)}); };
Rig.prototype.at=function(u,v,z,w,h,fn){ const o=this.o,p=mapPt(o.r,u,v),X=o.x+p[0],Y=o.y+p[1]; this.parts.push({b:{x0:X-w/2,x1:X+w/2,y0:Y-w/2,y1:Y+w/2,z0:z,z1:z+h},f:c=>fn(c,X,Y,z)}); };
Rig.prototype.face=function(v,u0,u1,z0,z1,fn){ const o=this.o; if(o.r>1) return; const a=mapPt(o.r,u0,v),b=mapPt(o.r,u1,v); const A=[o.x+a[0],o.y+a[1]],B=[o.x+b[0],o.y+b[1]]; const q=[iso(A[0],A[1],z1),iso(B[0],B[1],z1),iso(B[0],B[1],z0),iso(A[0],A[1],z0)]; this.parts.push({b:{x0:Math.min(A[0],B[0]),x1:Math.max(A[0],B[0]),y0:Math.min(A[1],B[1]),y1:Math.max(A[1],B[1]),z0,z1},f:c=>fn(c,q)}); };
function sbox(b){ return [(b.x0-b.y1)*TW/2,(b.x1-b.y0)*TW/2,(b.x0+b.y0)*TH/2-b.z1*TZ,(b.x1+b.y1)*TH/2-b.z0*TZ]; }
function cmpB(a,b){ const E=1e-4; if(a.x0>=b.x1-E) return 1; if(b.x0>=a.x1-E) return -1; if(a.y0>=b.y1-E) return 1; if(b.y0>=a.y1-E) return -1; if(a.z0>=b.z1-E) return 1; if(b.z0>=a.z1-E) return -1; return (a.x0+a.x1+a.y0+a.y1+a.z0+a.z1)>(b.x0+b.x1+b.y0+b.y1+b.z0+b.z1)?1:-1; }
function depthSort(parts){ const n=parts.length; if(n<2) return parts; const sb=parts.map(p=>sbox(p.b)); const before=Array.from({length:n},()=>[]);
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){ const A=sb[i],B=sb[j]; if(A[1]<=B[0]||B[1]<=A[0]||A[3]<=B[2]||B[3]<=A[2]) continue; if(cmpB(parts[i].b,parts[j].b)>0) before[i].push(j); else before[j].push(i); }
  const out=[],st=new Uint8Array(n); const visit=i=>{ if(st[i]) return; st[i]=1; for(const j of before[i]) visit(j); st[i]=2; out.push(parts[i]); }; for(let i=0;i<n;i++) visit(i); return out; }

/* ---------- Catálogo de la oficina ---------- */
const CAT={
  desk:{h:1.25,use:'sit'}, board:{h:1.5,act:'ajustes',lbl:'Pizarra · ajustes del proyecto'}, server:{h:1.8,act:'sync',lbl:'Servidor · sincronizar con el Maestro'},
  printer:{h:.85}, coffee:{h:1.25,use:'front',lbl:'Cafetera'}, cooler:{h:1.15,use:'front',lbl:'Agua'}, sofa:{h:.75},
  shelf:{h:1.84,act:'biblio',lbl:'Biblioteca · bibliografía'}, arcade:{h:1.65,act:'juego',lbl:'Arcade · minijuego'},
  plant:{h:.9}, monstera:{h:1.35}, lamp:{h:1.65}, rug:{h:0,floor:true},
  trophy:{h:1.55,act:'tomo',lbl:'Vitrina · Tomo II'}, jukebox:{h:1.5,act:'rocola',lbl:'Rocola · música'}, mailbox:{h:1.12,act:'cartero',lbl:'Buzón · correos del revisor'},
};
let objs=[], seq=1; const byId={};
function add(t,x,y,r,c,extra){ const o=Object.assign({id:seq++,t,x,y,r:r||0,c:c||null,occ:null,owner:null},extra||{}); objs.push(o); byId[o.id]=o; return o; }
const objAt=(x,y)=>objs.find(o=>o.x===x&&o.y===y&&!CAT[o.t].floor)||null;
const rugAt=(x,y)=>objs.find(o=>o.x===x&&o.y===y&&CAT[o.t].floor)||null;
const inB=(x,y)=>x>=0&&y>=0&&x<N&&y<N;
const walkable=(x,y)=>inB(x,y)&&!objAt(x,y);
function frontTile(o){ const f=mapPt(o.r,.5,1.5); return {x:o.x+Math.floor(f[0]),y:o.y+Math.floor(f[1])}; }
function seatPos(o){ const s=mapPt(o.r,.5,.72); return [o.x+s[0],o.y+s[1]]; }
const tileOf=p=>({x:clamp(Math.floor(p.x),0,N-1),y:clamp(Math.floor(p.y),0,N-1)});

/* ---------- Agentes ---------- */
const AGENTS=[
  {k:'peche', n:'Peche', role:'Curriculista · tu escritorio', desk:[6,8,2], col:'#164a98', look:{skin:'#e2ae86',hair:'#2b1d16',hs:0,shirt:'#164a98',pants:'#2f3542'}},
  {k:'cartero', n:'Cartero', role:'Lee los correos del revisor y sube los adjuntos a Drive', desk:[2,10,2], col:'#2e86ab', look:{skin:'#c98c62',hair:'#161616',hs:0,shirt:'#2e86ab',pants:'#34466b'}},
  {k:'corrector', n:'Corrector', role:'Atiende los comentarios del revisor', desk:[4,4,2], col:'#d6424a', look:{skin:'#f3cdb0',hair:'#6b4423',hs:2,shirt:'#d6424a',pants:'#2f3542'}},
  {k:'programa', n:'Programadora', role:'Programas de curso nuevos', desk:[5,4,2], col:'#7b5ea7', look:{skin:'#a46f48',hair:'#2b1d16',hs:1,shirt:'#7b5ea7',pants:'#5a4636'}},
  {k:'ficha', n:'Fichero', role:'Fichas de curso nuevas', desk:[6,4,2], col:'#23a596', look:{skin:'#e2ae86',hair:'#7d808c',hs:3,shirt:'#23a596',pants:'#3f3f46'}},
  {k:'recepcion', n:'Recepcionista', role:'Recibe el esbozo del experto (XLSX)', desk:[3,10,2], col:'#f2a541', look:{skin:'#f6dccb',hair:'#a8642c',hs:1,shirt:'#f2a541',pants:'#34466b'}},
  {k:'carreras', n:'Registrador', role:'Lleva los datos de cada curso', desk:[7,4,2], col:'#3fa66f', look:{skin:'#c98c62',hair:'#4a2f22',hs:0,shirt:'#3fa66f',pants:'#34466b'}},
  {k:'disenador', n:'Diseñador', role:'Dibuja la malla curricular en draw.io', desk:[2,7,3], col:'#3a3a46', look:{skin:'#e7b896',hair:'#d9d2c3',hs:3,shirt:'#2b2b33',pants:'#6a5a48'}},
  {k:'biblio', n:'Bibliotecaria', role:'Bibliografía de los cursos', desk:[2,3,3], col:'#e86a92', look:{skin:'#76503a',hair:'#161616',hs:2,shirt:'#e86a92',pants:'#2f3542'}},
];
let SLOTS=[];
let people=[];
const personByK=k=>people.find(p=>p.k===k);

function defaultLayout(){ const L=[]; const a=(t,x,y,r,c,owner)=>L.push({t,x,y,r:r||0,c:c||null,owner:owner||null});
  a('board',2,0); a('coffee',4,0); a('cooler',5,0); a('plant',6,0); a('trophy',7,0); a('printer',8,0); a('server',9,0); a('server',10,0); a('arcade',11,0);
  a('monstera',0,0,1); a('shelf',0,2,1); a('shelf',0,3,1); a('shelf',0,4,1); a('lamp',0,6,1); a('plant',0,1,1);
  a('plant',3,4); a('plant',8,4); a('mailbox',1,11); a('plant',4,11); a('jukebox',11,9);
  for(let x=9;x<=10;x++) for(let y=5;y<=7;y++) a('rug',x,y,0,'#2f9c8a');
  a('sofa',9,5,0,'#c9663d'); a('sofa',10,5,0,'#c9663d'); a('lamp',11,5); a('plant',11,7);
  a('monstera',11,11); a('plant',8,11); a('plant',8,8);
  for(let x=4;x<=7;x++) for(let y=7;y<=9;y++) a('rug',x,y,0,'#5b6fb8');
  AGENTS.forEach(g=>a('desk',g.desk[0],g.desk[1],g.desk[2],g.col,g.k));
  return L; }
function officeCfg(){ try{ return JSON.parse(localStorage.getItem('dcd_office')||'{}')||{}; }catch(e){ return {}; } }
function saveOfficeCfg(c){ try{ localStorage.setItem('dcd_office',JSON.stringify(c)); }catch(e){} try{ autoBackup(); }catch(e){} }
function firstFree(x0,y0){ for(let r=0;r<N;r++) for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){ const x=x0+dx,y=y0+dy; if(inB(x,y)&&!objAt(x,y)&&!(x===0&&y===DOOR_Y)) return {x,y}; } return {x:x0,y:y0}; }
function recomputeSlots(){ const d=objs.find(o=>o.t==='desk'&&o.owner==='peche'); if(!d){ SLOTS=[]; return; } const s=seatPos(d); const ft=frontTile(d);
  SLOTS=[[-1,0],[1,0],[0,1],[0,-1],[-1,1],[1,1],[-1,-1],[1,-1],[-2,0],[2,0]].map(([dx,dy])=>({x:d.x+dx,y:d.y+dy})).filter(t=>walkable(t.x,t.y)&&!(t.x===ft.x&&t.y===ft.y)&&!(t.x===0&&t.y===DOOR_Y))
    .map(t=>{ const dx=s[0]-(t.x+.5), dy=s[1]-(t.y+.5); return {x:t.x,y:t.y,f:Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?0:2)}; }); }
function buildScene(){
  objs=[]; seq=1; for(const k in byId) delete byId[k];
  let L=officeCfg().layout; if(!Array.isArray(L)||!L.length) L=defaultLayout();
  L.forEach(o=>{ if(CAT[o.t]&&inB(o.x,o.y)&&!(CAT[o.t].floor?rugAt(o.x,o.y):objAt(o.x,o.y))) add(o.t,o.x,o.y,o.r,o.c,{owner:o.owner||null}); });
  AGENTS.forEach(g=>{ if(!objs.some(o=>o.t==='desk'&&o.owner===g.k)){ const f=firstFree(g.desk[0],g.desk[1]); add('desk',f.x,f.y,g.desk[2],g.col,{owner:g.k}); } });
  ['jukebox','arcade','trophy','server','board','mailbox'].forEach(t=>{ if(!objs.some(o=>o.t===t)){ const d=defaultLayout().find(o=>o.t===t); const f=firstFree(d.x,d.y); add(t,f.x,f.y,d.r); } });
  applyChars();
  people=AGENTS.map((a,i)=>{ const d=objs.find(o=>o.t==='desk'&&o.owner===a.k); const p={id:100+i,k:a.k,name:a.n,role:a.role,look:a.look,col:a.col,desk:d.id,x:0,y:0,z:0,face:0,path:[],state:'seated',sitting:null,alpha:1,ph:0,bub:null,bubT:0,say:'',sayT:0,timer:rnd(20,80),goal:null}; sitAt(p,d); return p; });
  recomputeSlots();
}
function sitAt(p,o){ const s=seatPos(o); p.x=s[0]; p.y=s[1]; p.z=.42; p.sitting=o.id; o.occ=p.id; p.face=(o.r+2)%4; p.state='seated'; p.path=[]; }
function standUp(p){ const o=byId[p.sitting]; if(o&&o.occ===p.id) o.occ=null; p.sitting=null; p.z=0; const f=frontTile(o); p.x=f.x+.5; p.y=f.y+.5; }
function bfs(st){
  const dist=new Int16Array(N*N).fill(-1), prev=new Int16Array(N*N).fill(-1); const sx=clamp(st.x,0,N-1), sy=clamp(st.y,0,N-1); const s=sy*N+sx; dist[s]=0; const q=[s]; let h=0;
  while(h<q.length){ const c=q[h++], cx=c%N, cy=(c/N)|0; for(const [dx,dy] of DIRS){ const nx=cx+dx, ny=cy+dy; if(!walkable(nx,ny)) continue; const k=ny*N+nx; if(dist[k]>=0) continue; dist[k]=dist[c]+1; prev[k]=c; q.push(k); } }
  return {path(goal){ const out=[]; let k=goal.y*N+goal.x; if(dist[k]<0) return null; while(k!==s){ out.push([k%N+.5,((k/N)|0)+.5]); k=prev[k]; } return out.reverse(); }};
}
function goTo(p,tile,mode){ if(p.sitting!=null) standUp(p); const path=bfs(tileOf(p)).path(tile); if(!path){ return false; } p.path=path; p.state='walking'; p.goal=mode; return true; }
function goHome(p){ const o=byId[p.desk]; if(p.sitting!=null) return; const f=frontTile(o); if(!goTo(p,f,'home')){ sitAt(p,o); return; } const s=seatPos(o); p.path.push([s[0],s[1]]); }
function walk(p,dt){ let d=1.7*dt; let moved=false;
  while(d>0&&p.path.length){ const [tx,ty]=p.path[0]; const dx=tx-p.x, dy=ty-p.y, dist=Math.hypot(dx,dy);
    if(dist>1e-4){ if(Math.abs(dx)>Math.abs(dy)) p.face=dx>0?1:3; else p.face=dy>0?0:2; moved=true; }
    if(dist<=d){ p.x=tx; p.y=ty; p.path.shift(); d-=dist; } else { p.x+=dx/dist*d; p.y+=dy/dist*d; d=0; } }
  if(moved) p.ph+=dt*9; return p.path.length===0; }
function freeSlot(p){ const used=people.filter(q=>q!==p&&(q.goal==='peche'||q.atSlot)).map(q=>q.slot); return SLOTS.findIndex((s,i)=>!used.includes(i)); }

/* ---------- Estado de trabajo ---------- */
const P=()=>currentProject;
const LS={ get(k,d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }, set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} } };
const kInbox=()=>'dcd_inbox_'+(P()?.id||''), kFlows=()=>'dcd_flows_'+(P()?.id||''), kJobs=()=>'dcd_jobs_'+(P()?.id||''), kAck=()=>'dcd_ack_'+(P()?.id||'');
const inbox=()=>LS.get(kInbox(),[]), flows=()=>LS.get(kFlows(),[]), jobs=()=>LS.get(kJobs(),{});
const saveInbox=v=>LS.set(kInbox(),v), saveFlows=v=>LS.set(kFlows(),v), saveJobs=v=>LS.set(kJobs(),v);
let ack={}, mailNeedPerm=false, mailBusy=false, mailLast=0, busy={};
function courseBy(code){ return (allCourses||[]).find(c=>normCode(c['Código'])===normCode(code)); }
function setCourse(code){ const c=courseBy(code); if(!c) throw new Error(`El curso ${code} no está en la hoja Base`); currentCourse=c; currentSection=null; return c; }
const cName=c=>(c?.['Curso']||c?.['Nombre']||'').trim();
const attr=s=>String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const esc=s=>escHtml(String(s??''));

function needOf(k){
  const nI=inbox().filter(m=>m.status==='nuevo'), F=flows(), J=jobs();
  if(k==='cartero'){
    if(!gAccessToken) return {sleep:true};
    if(mailNeedPerm) return {alert:true, say:'Necesito permiso para leer tu correo', sig:'perm'};
    if(nI.length) return {alert:true, say:nI.length===1?`Llegó un correo de ${shortCode(nI[0])}`:`Llegaron ${nI.length} correos del revisor`, sig:'m:'+nI.map(m=>m.id).join(',')};
    if(mailBusy) return {say:'Revisando el correo…'};
    return {sleep:true};
  }
  if(k==='corrector'){
    const c=F.find(f=>f.stage==='comentado'); if(c) return {alert:true, visit:true, say:`${c.code} está listo para corregir`, sig:'c:'+c.id};
    const r=F.find(f=>f.stage==='corregido'); if(r) return {alert:true, say:`${r.code} espera tu revisión en Drive`, sig:'r:'+r.id};
    const l=F.find(f=>f.stage==='enviado'&&!f.learned); if(l) return {idea:true, say:'¿Le pedimos a Claude lo aprendido?'};
    return {};
  }
  if(k==='carreras'){
    const cars=projectCareers(); if(cars.length<2) return {sleep:true};
    const sin=(allCourses||[]).filter(c=>!careerOf(c['Código'])).length;
    if(sin) return {alert:true, visit:true, say:`El proyecto tiene dos carreras: ${sin===1?'falta un curso':'faltan '+sin+' cursos'} por asignar`, sig:'car:'+P().id+':'+cars.join('|')};
    return {};
  }
  if(k==='programa'||k==='ficha'){
    const j=J[k]; if(j?.stage==='subido') return {alert:true, visit:true, say:`${j.code} ya está en Drive para revisar`, sig:'j:'+k+':'+j.code+':'+(j.t||'')};
    if(j?.stage==='prompt') return {say:`Esperando la respuesta de Claude (${j.code})`};
    return {};
  }
  return {};
}
const shortCode=m=>m.code||'un curso';

/* ---------- Simulación ---------- */
function tick(dt){
  if(edit) return;
  if(JB.playing){ tick.nt=(tick.nt||0)-dt; if(tick.nt<=0){ tick.nt=1.1; const j=objs.find(o=>o.t==='jukebox'); if(j) floats.push({x:j.x+.5+rnd(-.2,.2),y:j.y+.5,z:1.7,txt:Math.random()<.5?'♪':'♫',col:['#e86a92','#5ad1c8','#ffd36b','#7b5ea7'][Math.floor(Math.random()*4)],life:2}); } }
  for(const p of people){
    if(p.bubT>0) p.bubT-=dt; if(p.sayT>0) p.sayT-=dt;
    if(p.k==='peche'){ continue; }
    const need=needOf(p.k);
    if(p.state==='seated'){
      if(need.visit && ack[p.k]!==need.sig){ const s=freeSlot(p); if(s>=0){ p.slot=s; const sl=SLOTS[s]; if(goTo(p,{x:sl.x,y:sl.y},'peche')) { p.bub='walk'; } } }
      else if(!need.alert && !need.sleep && !need.say){ p.timer-=dt; if(p.timer<=0){ p.timer=rnd(50,140); const ty=Math.random()<.6?'coffee':'cooler'; const cf=objs.find(o=>o.t===ty); if(!cf) continue; const ft=frontTile(cf); if(walkable(ft.x,ft.y)&&!people.some(q=>q!==p&&q.goal==='coffee')) goTo(p,ft,'coffee'); } }
    } else if(p.state==='walking'){
      if(walk(p,dt)){
        if(p.goal==='home'){ sitAt(p,byId[p.desk]); }
        else if(p.goal==='peche'){ p.state='standing'; p.atSlot=true; p.face=(SLOTS[p.slot]||{f:0}).f; p.goal=null; }
        else if(p.goal==='coffee'){ p.state='break'; p.timer=rnd(5,9); const cf=objAt(Math.floor(p.x),Math.floor(p.y)-1); p.face=2; p.bub='coffee'; p.bubT=3; p.goal=null; }
      }
    } else if(p.state==='break'){ p.timer-=dt; if(p.timer<=0){ p.bub='heart'; p.bubT=2; goHome(p); } }
    else if(p.state==='standing'){ if(!need.visit || ack[p.k]===need.sig){ p.atSlot=false; p.slot=null; goHome(p); } }
    // burbujas de estado
    if(need.sleep && p.state==='seated') p.icon='zz';
    else if(need.alert) p.icon='!';
    else if(need.idea) p.icon='idea';
    else p.icon=null;
    if(p.atSlot && need.say) { p.say=need.say; p.sayT=1; }
    else if(need.say && p.state==='seated'){ p.sayCycle=(p.sayCycle||0)+dt; const per=need.alert?14:24; if(p.sayCycle>per){ p.sayCycle=0; } if(p.sayCycle<5.5){ p.say=need.say; p.sayT=1; } }
  }
}

/* ---------- Dibujo ---------- */
let sel=null, GLOWS=[];
function drawPerson(c,p,wx,wy,wz,t,opt){
  opt=opt||{};
  const [sx,sy]=iso(wx,wy,wz); const L=p.look; const f=p.face|0; const front=f<2; const dir=(f===1||f===2)?1:-1;
  const sit=!!opt.sit, moving=!!opt.moving, ph=p.ph||0;
  const sw=moving?Math.sin(ph)*2.6:0, bob=moving?Math.abs(Math.cos(ph))*1.2:0;
  const nod=opt.sleep?Math.sin(t*1.5)*0.8+2.2:0;
  c.save(); c.globalAlpha*=(p.alpha==null?1:p.alpha); c.lineCap='round'; c.lineJoin='round';
  if(opt.sel){ const g=iso(wx,wy,0); c.strokeStyle='#ff6a3d'; c.lineWidth=2.2; c.beginPath(); c.ellipse(g[0],g[1],14,7,0,0,Math.PI*2); c.stroke(); }
  if(!sit){ c.fillStyle='rgba(40,28,18,.2)'; c.beginPath(); c.ellipse(sx,sy,8.5,4,0,0,Math.PI*2); c.fill(); }
  let hip;
  if(sit){ hip=sy-1; const fv=FV[f]; c.strokeStyle=L.pants; c.lineWidth=4.3; for(const o of [-2.3,2.3]){ c.beginPath(); c.moveTo(sx+o,hip); const kx=sx+o+fv[0]*.27, ky=hip+fv[1]*.27; c.lineTo(kx,ky); c.lineTo(kx,ky+10); c.stroke(); } }
  else { hip=sy-11-bob; c.strokeStyle=L.pants; c.lineWidth=4.2;
    c.beginPath(); c.moveTo(sx-2.3,hip); c.lineTo(sx-2.3+sw*dir,sy-2); c.stroke(); c.beginPath(); c.moveTo(sx+2.3,hip); c.lineTo(sx+2.3-sw*dir,sy-2); c.stroke();
    c.fillStyle='#2a2522'; c.beginPath(); c.ellipse(sx-2.3+sw*dir+dir*.8,sy-1.3,2.4,1.5,0,0,Math.PI*2); c.fill(); c.beginPath(); c.ellipse(sx+2.3-sw*dir+dir*.8,sy-1.3,2.4,1.5,0,0,Math.PI*2); c.fill(); }
  const ty=hip-15.5, hx=sx, hy=ty-7.2+nod;
  if(L.hs===1&&front){ c.fillStyle=L.hair; rr(c,hx-7.6,hy-2,15.2,15,6); c.fill(); }
  c.fillStyle=L.shirt; rr(c,sx-6.6,ty,13.2,17,5); c.fill();
  c.fillStyle=shade(L.shirt,-0.16); c.save(); rr(c,sx-6.6,ty,13.2,17,5); c.clip(); c.fillRect(dir>0?sx-6.6:sx+2.6,ty,4,17); c.restore();
  c.lineWidth=3.6;
  if(opt.typing){ const fv=FV[f]; const w=Math.sin(t*16+p.id*2)*1.1;
    for(const o of [-5.6,5.6]){ c.strokeStyle=shade(L.shirt,-0.1); c.beginPath(); c.moveTo(sx+o,ty+3.5); const ex=sx+o*.55+fv[0]*.2, ey=ty+9+fv[1]*.2+(o>0?w:-w); c.lineTo(ex,ey); c.stroke(); c.fillStyle=L.skin; c.beginPath(); c.arc(ex,ey,1.9,0,Math.PI*2); c.fill(); } }
  else if(opt.wave){ c.strokeStyle=shade(L.shirt,-0.1); c.beginPath(); c.moveTo(sx-6,ty+3.5); c.lineTo(sx-6.6,ty+13); c.stroke(); const a=Math.sin(t*8)*.35; const ex=sx+9+Math.sin(a)*3, ey=ty-6; c.beginPath(); c.moveTo(sx+6,ty+3.5); c.lineTo(ex,ey); c.stroke(); c.fillStyle=L.skin; c.beginPath(); c.arc(ex,ey,2.1,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(sx-6.6,ty+14,1.9,0,Math.PI*2); c.fill(); }
  else { for(const o of [-1,1]){ const s=moving?-o*sw*dir*.9:0; c.strokeStyle=shade(L.shirt,-0.1); c.beginPath(); c.moveTo(sx+o*6,ty+3.5); const ex=sx+o*6.6+s, ey=ty+13; c.lineTo(ex,ey); c.stroke(); c.fillStyle=L.skin; c.beginPath(); c.arc(ex,ey+1,1.9,0,Math.PI*2); c.fill(); } }
  c.fillStyle=shade(L.skin,-0.12); c.fillRect(hx-2,hy+4-nod,4,4.5);
  c.fillStyle=L.skin; c.beginPath(); c.arc(hx,hy,7,0,Math.PI*2); c.fill();
  if(front){ const ex=hx+dir*1.7;
    if(opt.sleep){ c.strokeStyle='#2b2420'; c.lineWidth=1; c.beginPath(); c.moveTo(ex-3.2,hy+1); c.lineTo(ex-1.2,hy+1); c.moveTo(ex+1.2,hy+1); c.lineTo(ex+3.2,hy+1); c.stroke(); }
    else { c.fillStyle='#2b2420'; c.beginPath(); c.arc(ex-2.2,hy+.9,.95,0,Math.PI*2); c.arc(ex+2.2,hy+.9,.95,0,Math.PI*2); c.fill(); }
    c.fillStyle='rgba(232,110,110,.28)'; c.beginPath(); c.arc(ex-3.6,hy+3,1.4,0,Math.PI*2); c.arc(ex+3.6,hy+3,1.4,0,Math.PI*2); c.fill();
    if(L.hs!==3){ c.fillStyle=L.hair; c.beginPath(); c.moveTo(hx-7.4,hy-.5); c.arc(hx,hy-.5,7.4,Math.PI,0); c.quadraticCurveTo(hx+dir*2,hy-3.2,hx-dir*4,hy-1.6); c.closePath(); c.fill(); c.beginPath(); c.ellipse(hx-dir*5.4,hy+.6,2.4,4.2,0,0,Math.PI*2); c.fill(); }
    else { c.fillStyle=L.hair; c.globalAlpha*=.6; c.beginPath(); c.arc(hx,hy-.6,7.1,Math.PI*1.05,Math.PI*1.95); c.lineTo(hx,hy-3); c.closePath(); c.fill(); c.globalAlpha/=.6; }
  } else { if(L.hs===1){ c.fillStyle=L.hair; rr(c,hx-7.6,hy-2,15.2,15,6); c.fill(); } c.fillStyle=L.hs===3?mix(L.hair,L.skin,.45):L.hair; c.beginPath(); c.arc(hx,hy-.2,7.3,0,Math.PI*2); c.fill(); }
  if(L.hs===2){ c.fillStyle=L.hair; c.beginPath(); c.arc(hx-dir*1.2,hy-8,3.3,0,Math.PI*2); c.fill(); }
  if(p.k==='cartero'){ c.fillStyle='#1f3b5c'; c.beginPath(); c.ellipse(hx,hy-4.5,8,3.2,0,Math.PI,0); c.fill(); c.fillRect(hx-7.6,hy-5,15.2,2.2); c.fillRect(hx+(front?dir*2:0)-4,hy-4,8,2); }
  c.restore();
  p._sx=sx; p._sy=sit?iso(wx,wy,0)[1]:sy; p._hy=hy-8;
}
function screenFace(c,q,on,t,seed){
  poly(c,q,on?'#123a5c':'#1b1f27');
  if(on){ const cols=['#5ad1c8','#ffd36b','#ff8a65','#9ecbff']; c.lineWidth=1.1; for(let i=0;i<5;i++){ const yy=.2+i*.14, ind=.1+(i%3)*.06; const len=.2+((Math.sin(seed*3.1+i*1.7+Math.floor(t*1.6))+1)/2)*.5; const a=qp(q,ind,yy), b=qp(q,Math.min(.92,ind+len),yy); c.strokeStyle=cols[(i+seed)%4]; c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.stroke(); } }
  else { const a=qp(q,.15,.25), b=qp(q,.4,.25); c.strokeStyle='rgba(255,255,255,.12)'; c.lineWidth=1.4; c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.stroke(); }
}
function leaves(c,X,Y,z,t,seed,big){
  const [sx,sy]=iso(X,Y,z); const n=big?8:6; const greens=big?['#2f7d4f','#3c9460','#286b44']:['#4a9f5c','#5cb46d','#3e8a50'];
  c.strokeStyle='#3b6e3e'; c.lineWidth=1.2;
  for(let i=0;i<n;i++){ const a=(i/n)*Math.PI*2+seed, sway=Math.sin(t*1.4+i+seed)*.08; const r=big?14:9.5, lx=sx+Math.cos(a+sway)*r, ly=sy-(big?18:12)+Math.sin(a)*r*.42-(i%3)*(big?5:3.5);
    c.beginPath(); c.moveTo(sx,sy-2); c.quadraticCurveTo((sx+lx)/2,ly-6,lx,ly); c.stroke(); c.fillStyle=greens[i%3]; c.beginPath(); c.ellipse(lx,ly,big?8.5:5.5,big?5:3.4,a+sway,0,Math.PI*2); c.fill(); }
  c.fillStyle=greens[0]; c.beginPath(); c.ellipse(sx,sy-(big?24:16),big?7:4.5,big?4.5:3,0,0,Math.PI*2); c.fill();
}
let finalsRatio=0, unreadN=0;
const DRAW={
  desk(R,o,t,P2){
    const metal='#3a3f4b', wood='#c99460';
    for(const [u,v] of [[.08,.08],[.86,.08],[.08,.44],[.86,.44]]) R.box(u,v,0,.06,.06,.66,metal);
    R.box(.62,.1,.18,.26,.38,.48,'#b07d4f'); R.box(.04,.04,.66,.92,.52,.06,wood);
    R.box(.12,.32,.72,.1,.1,.11,'#f2efe9'); R.box(.44,.15,.72,.12,.08,.1,'#2a2e38'); R.box(.2,.12,.82,.6,.06,.38,'#262a33');
    const on=P2&&P2.icon!=='zz';
    R.face(.18,.23,.77,.85,1.17,(c,q)=>screenFace(c,q,on,t,o.id%4));
    R.box(.3,.36,.72,.4,.12,.02,'#e7e9ef');
    if(o.owner==='peche'){ R.box(.7,.3,.72,.1,.1,.12,'#ff6a3d'); R.box(.08,.18,.72,.2,.26,.05,'#f4f1ea'); }
    const cc=o.c||'#3f6fb5';
    R.box(.4,.66,.02,.2,.2,.05,'#2a2e38'); R.box(.47,.73,.07,.06,.06,.33,'#2a2e38'); R.box(.28,.56,.4,.44,.36,.07,cc); R.box(.28,.9,.47,.44,.06,.44,cc);
    if(P2) R.at(.5,.72,.42,.3,1.05,(c,X,Y,z)=>drawPerson(c,P2,X,Y,z,t,{sit:true,typing:on,sleep:!on,sel:sel&&sel.k==='p'&&sel.id===P2.id}));
    if(on){ const g=mapPt(o.r,.5,.2); GLOWS.push({x:o.x+g[0],y:o.y+g[1],z:1,r:26,c:'120,190,255',a:.35}); }
  },
  sofa(R,o){ const c1=o.c||'#4f8a72'; R.box(.06,.12,0,.88,.82,.3,shade(c1,-0.12)); R.box(.06,.12,.3,.88,.22,.42,c1); R.box(.06,.34,.3,.13,.6,.18,c1); R.box(.81,.34,.3,.13,.6,.18,c1); R.box(.19,.34,.3,.62,.6,.09,shade(c1,0.18)); },
  coffee(R){ R.box(.08,.1,0,.84,.6,.68,'#ece6dc'); R.box(.06,.08,.68,.88,.64,.05,'#3d4350'); R.box(.2,.14,.73,.44,.34,.48,'#2c313b'); R.face(.48,.26,.58,.96,1.13,(c,q)=>{ poly(c,q,'#14171d'); const l=qp(q,.8,.3); c.fillStyle='#ff5a4a'; c.beginPath(); c.arc(l[0],l[1],1.3,0,Math.PI*2); c.fill(); }); R.box(.3,.48,.73,.24,.12,.03,'#6a7180'); R.box(.36,.5,.76,.1,.08,.1,'#ffffff'); R.box(.7,.3,.73,.11,.11,.12,'#d9573b'); R.box(.7,.5,.73,.11,.11,.12,'#ffffff'); },
  cooler(R){ R.box(.28,.28,0,.44,.44,.72,'#e9edf3'); R.face(.72,.36,.64,.38,.58,(c,q)=>poly(c,q,'#cfd6e0')); R.at(.5,.5,.72,.36,.44,(c,X,Y,z)=>{ c.save(); c.globalAlpha*=.82; box(c,X-.17,Y-.17,z,.34,.34,.38,'#86c8f0'); box(c,X-.06,Y-.06,z+.38,.12,.12,.05,'#5aa9de'); c.restore(); }); },
  plant(R,o,t){ R.box(.3,.3,0,.4,.4,.32,'#c4683f'); R.box(.33,.33,.32,.34,.34,.01,'#5a3d2a'); R.at(.5,.5,.33,.6,.6,(c,X,Y,z)=>leaves(c,X,Y,z,t,o.id,false)); },
  monstera(R,o,t){ R.box(.27,.27,0,.46,.46,.42,'#ebe5d8'); R.box(.3,.3,.42,.4,.4,.01,'#5a3d2a'); R.at(.5,.5,.43,.8,1,(c,X,Y,z)=>leaves(c,X,Y,z,t,o.id,true)); },
  shelf(R,o){ const wd='#8b5e3c'; R.box(.06,.12,0,.88,.05,1.8,shade(wd,-0.1)); R.box(.06,.12,0,.06,.36,1.8,wd); R.box(.88,.12,0,.06,.36,1.8,wd); for(const z of [0,.6,1.2,1.76]) R.box(.12,.17,z,.76,.31,.04,wd);
    if(o.r<2){ const bc=['#d9573b','#2f6fb5','#e0a030','#2f9c8a','#7a5bb0','#f2efe9','#3a3f4b']; let s=o.id*7; const rn=()=>{ s=(s*9301+49297)%233280; return s/233280; }; for(const z of [.04,.64,1.24]){ let u=.14; while(u<.8){ const w=.05+rn()*.035, h=.28+rn()*.16; if(rn()<.12){u+=w;continue;} R.box(u,.2,z,Math.min(w,.86-u),.24,h,bc[Math.floor(rn()*bc.length)]); u+=w+.008; } } } },
  arcade(R,o,t){ R.box(.16,.12,0,.68,.6,1.62,'#2d2f6e'); R.box(.16,.72,.82,.68,.18,.1,'#1c1e2b');
    R.face(.72,.22,.78,1.0,1.42,(c,q)=>{ poly(c,q,'#0d0f1e'); const hue=(t*60+o.id*40)%360; const a=qp(q,.5+Math.sin(t*2)*.25,.55); c.fillStyle=`hsl(${hue},90%,65%)`; c.beginPath(); c.arc(a[0],a[1],2.6,0,Math.PI*2); c.fill(); c.fillStyle='#ffd36b'; for(let i=0;i<4;i++){ const b=qp(q,.15+i*.2,.2+((i+Math.floor(t*3))%3)*.08); c.fillRect(b[0]-1.2,b[1]-1.2,2.4,2.4);} });
    R.face(.72,.18,.82,1.46,1.6,(c,q)=>{ poly(c,q,'#ff6a3d'); const a=qp(q,.5,.5); c.fillStyle='#fff3c4'; c.font='bold 5px "Chakra Petch",monospace'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('ARCADE',a[0],a[1]); });
    const g=mapPt(o.r,.5,.8); GLOWS.push({x:o.x+g[0],y:o.y+g[1],z:1.2,r:34,c:'255,120,200',a:.4}); },
  lamp(R,o){ R.box(.38,.38,0,.24,.24,.04,'#2b2f38'); R.box(.48,.48,.04,.04,.04,1.36,'#2b2f38'); R.box(.32,.32,1.36,.36,.36,.26,'#f3d27b'); GLOWS.push({x:o.x+.5,y:o.y+.5,z:1.45,r:70,c:'255,205,120',a:.55,lamp:true}); },
  server(R,o,t){ R.box(.14,.14,0,.72,.7,1.8,'#22262f'); R.face(.84,.2,.8,.1,1.72,(c,q)=>{ poly(c,q,'#181b22'); const sp=syncing?4:1; for(let r=0;r<9;r++){ const s=subq(q,.08,.05+r*.105,.92,.13+r*.105); poly(c,s,'#2a2f3a'); for(let k=0;k<4;k++){ const on=Math.sin(t*(3+k)*sp+r*1.7+k*2.1+o.id)>.1; const pt=qp(q,.62+k*.07,.09+r*.105); c.fillStyle=on?(k===3?'#ffb340':'#3ee08f'):'#264032'; c.fillRect(pt[0]-.9,pt[1]-.9,1.8,1.8);} } }); GLOWS.push({x:o.x+.5,y:o.y+.9,z:.9,r:22,c:'80,240,150',a:.25}); },
  board(R){ R.box(.12,.46,0,.05,.08,1.5,'#9aa1ad'); R.box(.83,.46,0,.05,.08,1.5,'#9aa1ad'); R.box(.08,.46,.62,.84,.06,.88,'#c9ced8');
    R.face(.52,.12,.88,.66,1.46,(c,q)=>{ poly(c,q,'#f8f9fb'); c.lineWidth=1.1; const lines=[[.08,.2,.5,.2,'#2f6fb5'],[.08,.32,.38,.32,'#2f6fb5'],[.08,.44,.45,.44,'#2f6fb5'],[.1,.62,.3,.85,'#d9573b'],[.3,.85,.45,.6,'#d9573b']]; for(const [a,b,c2,d,col] of lines){ const A=qp(q,a,b),B=qp(q,c2,d); c.strokeStyle=col; c.beginPath(); c.moveTo(A[0],A[1]); c.lineTo(B[0],B[1]); c.stroke(); } poly(c,subq(q,.58,.14,.74,.38),'#ffd36b'); poly(c,subq(q,.77,.2,.92,.42),'#9fe0c9'); poly(c,subq(q,.6,.5,.78,.74),'#ffb3c1'); });
    R.box(.1,.52,.62,.8,.06,.03,'#9aa1ad'); },
  printer(R){ R.box(.16,.16,0,.68,.62,.5,'#5d6474'); R.box(.14,.14,.5,.72,.66,.28,'#e6e9ef'); R.box(.24,.2,.78,.52,.4,.03,'#cfd4dd'); R.box(.28,.62,.62,.44,.16,.02,'#ffffff'); },
  trophy(R,o,t){
    const gold=finalsRatio>=1?'#f2c230':finalsRatio>=.5?'#c9ced8':'#c98c4a';
    R.box(.16,.16,0,.68,.68,.62,'#6e4a2f'); R.box(.12,.12,.62,.76,.76,.05,'#8b5e3c');
    R.face(.84,.24,.76,.14,.5,(c,q)=>{ poly(c,q,'#5a3c26'); const a=qp(q,.5,.5); c.fillStyle='#ffe9a8'; c.font='bold 6px "Chakra Petch",monospace'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('TOMO II',a[0],a[1]); });
    R.at(.5,.5,.67,.5,.88,(c,X,Y,z)=>{ const [sx,sy]=iso(X,Y,z); c.save(); c.fillStyle=shade(gold,-0.25); c.fillRect(sx-7,sy-5,14,5); c.fillStyle=gold; c.fillRect(sx-2.5,sy-14,5,9);
      c.beginPath(); c.moveTo(sx-11,sy-31); c.lineTo(sx+11,sy-31); c.quadraticCurveTo(sx+10,sy-14,sx,sy-13); c.quadraticCurveTo(sx-10,sy-14,sx-11,sy-31); c.fill();
      c.strokeStyle=gold; c.lineWidth=2.2; c.beginPath(); c.arc(sx-11,sy-25,4.5,Math.PI*.5,Math.PI*1.5); c.stroke(); c.beginPath(); c.arc(sx+11,sy-25,4.5,-Math.PI*.5,Math.PI*.5); c.stroke();
      c.fillStyle='rgba(255,255,255,.55)'; c.fillRect(sx-6,sy-29,2.4,10);
      const tw=(Math.sin(t*2.2)+1)/2; c.fillStyle=`rgba(255,255,255,${.4+tw*.6})`; c.beginPath(); c.arc(sx+7,sy-33,1.4+tw,0,Math.PI*2); c.fill(); c.restore(); });
    GLOWS.push({x:o.x+.5,y:o.y+.5,z:1.2,r:30,c:'255,214,90',a:.35});
  },
  mailbox(R,o,t){
    R.box(.45,.45,0,.1,.1,.72,'#3a3f4b'); R.box(.22,.28,.72,.56,.44,.34,'#d6424a'); R.box(.2,.26,1.06,.6,.48,.04,shade('#d6424a',0.15));
    R.face(.72,.3,.7,.78,1.0,(c,q)=>{ poly(c,q,'#b8323a'); const a=qp(q,.2,.4),b=qp(q,.8,.4); c.strokeStyle='#1c2131'; c.lineWidth=1.6; c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.stroke(); });
    const up=unreadN>0; R.at(.86,.5,.8,.1,.6,(c,X,Y,z)=>{ const [sx,sy]=iso(X,Y,z); c.strokeStyle='#2b2f38'; c.lineWidth=1.4; c.beginPath(); c.moveTo(sx,sy); c.lineTo(sx,sy-(up?20:10)); c.stroke(); c.fillStyle=up?'#ffd23f':'#9aa1ad'; const wv=up?Math.sin(t*6)*1.5:0; c.beginPath(); c.moveTo(sx,sy-(up?20:10)); c.lineTo(sx+9,sy-(up?17:8)+wv); c.lineTo(sx,sy-(up?14:5)); c.fill(); });
  },
  jukebox(R,o,t){ const on=JB.playing; const body='#7a2e3a';
    R.box(.16,.2,0,.68,.56,1.05,body); R.box(.12,.16,1.05,.76,.64,.06,'#e0a030');
    R.at(.5,.48,1.1,.7,.4,(c,X,Y,z)=>{ const [sx,sy]=iso(X,Y,z); c.fillStyle='#e0a030'; c.beginPath(); c.ellipse(sx,sy-2,20,12,0,Math.PI,0); c.fill(); c.fillStyle=on?`hsl(${(t*80)%360},85%,65%)`:'#5a3c26'; c.beginPath(); c.ellipse(sx,sy-3,14,8,0,Math.PI,0); c.fill(); });
    R.face(.76,.22,.78,.12,.98,(c,q)=>{ poly(c,q,'#5a1f29'); poly(c,subq(q,.15,.08,.85,.4),on?'#ffd36b':'#6b5a3a'); for(let i=0;i<5;i++){ const a=qp(q,.2+i*.15,.6); c.fillStyle=on?`hsl(${(t*120+i*60)%360},90%,62%)`:'#3a2a20'; c.beginPath(); c.arc(a[0],a[1],1.8,0,Math.PI*2); c.fill(); } const g=qp(q,.5,.83); c.fillStyle='#1c1c1c'; c.beginPath(); c.arc(g[0],g[1],3.2,0,Math.PI*2); c.fill(); });
    if(on) GLOWS.push({x:o.x+.5,y:o.y+.8,z:.9,r:40,c:'255,140,200',a:.5}); },
  rug(){},
};
function objBounds(o){ return {x0:o.x,x1:o.x+1,y0:o.y,y1:o.y+1,z0:0,z1:Math.max(.05,CAT[o.t].h)}; }
function drawObj(c,o,t){ const R=new Rig(o); const P2=o.occ!=null?people.find(p=>p.id===o.occ&&p.sitting===o.id):null; DRAW[o.t](R,o,t,P2); for(const p of depthSort(R.parts)) p.f(c); }
function drawRug(c,o){ const col=o.c; const same=(x,y)=>{ const r=rugAt(x,y); return r&&r.c===o.c; }; const {x,y}=o, e=.06;
  const x0=same(x-1,y)?0:e, x1=same(x+1,y)?1:1-e, y0=same(x,y-1)?0:e, y1=same(x,y+1)?1:1-e;
  poly(c,[iso(x+x0,y+y0,.005),iso(x+x1,y+y0,.005),iso(x+x1,y+y1,.005),iso(x+x0,y+y1,.005)],col); }

const cv=document.getElementById('of-cv'), ctx=cv.getContext('2d');
let W=0,H=0,DPR=1; const cam={x:0,y:0,z:1}; let camFitted=false;
function resize(){ DPR=Math.min(2,window.devicePixelRatio||1); W=cv.clientWidth; H=cv.clientHeight; cv.width=Math.round(W*DPR); cv.height=Math.round(H*DPR); }
function fitCam(){ const roomW=N*TW+80, roomH=N*TH+WH*TZ+60; const panelW=(!panel.hidden&&W>720)?380:0; const top=96, bottom=76; const z=clamp(W<600?Math.min(W/(roomW*.78),(H-top-bottom)/roomH):Math.min((W-panelW-32)/roomW,(H-top-bottom)/roomH),.35,1.6); cam.z=z; const [cx,cy]=iso(N/2,N/2,WH*.45); cam.x=(W-panelW)/2-cx*z; cam.y=top+(H-top-bottom)/2-cy*z+10; }
function skyColors(mod){ const h=mod/60; const keys=[[0,'#0f1530','#1f2a52'],[5.5,'#1d2550','#4a4c86'],[6.8,'#f6b38a','#ffd9b0'],[8.5,'#8fcbec','#dff0f7'],[16,'#93cdea','#e3f1f6'],[17.6,'#f39a6b','#ffd2a1'],[18.8,'#3b3a72','#8a5f8f'],[20,'#121a3a','#24305c'],[24,'#0f1530','#1f2a52']];
  for(let i=0;i<keys.length-1;i++){ const a=keys[i],b=keys[i+1]; if(h>=a[0]&&h<=b[0]){ const t=(h-a[0])/(b[0]-a[0]); return [mix(a[1],b[1],t),mix(a[2],b[2],t)]; } } return ['#8fcbec','#dff0f7']; }
function darkness(mod){ const h=mod/60; if(h>=7.5&&h<=17.5) return 0; if(h>17.5&&h<20) return (h-17.5)/2.5*.32; if(h<7.5&&h>5.5) return (7.5-h)/2*.32; return .32; }
function wallQuadY(x0,x1,z0,z1){ return [iso(x0,0,z1),iso(x1,0,z1),iso(x1,0,z0),iso(x0,0,z0)]; }
function wallQuadX(y0,y1,z0,z1){ return [iso(0,y0,z1),iso(0,y1,z1),iso(0,y1,z0),iso(0,y0,z0)]; }
function withPlaneX(c,y,z,fn){ const [ox,oy]=iso(0,y,z); c.save(); c.transform(32/40,-16/40,0,1,ox,oy); fn(); c.restore(); }
function withPlaneY(c,x,z,fn){ const [ox,oy]=iso(x,0,z); c.save(); c.transform(32/40,16/40,0,1,ox,oy); fn(); c.restore(); }
function drawWindow(c,q,sky,mod){ const g=c.createLinearGradient(q[0][0],q[0][1],q[3][0],q[3][1]); g.addColorStop(0,sky[0]); g.addColorStop(1,sky[1]); poly(c,q,g);
  if(darkness(mod)>.15){ c.fillStyle='rgba(255,255,255,.8)'; for(let i=0;i<5;i++){ const s=qp(q,((i*37)%100)/100*.9+.05,((i*53)%100)/100*.8+.1); c.fillRect(s[0],s[1],1,1); } }
  else { c.fillStyle='rgba(120,150,180,.35)'; for(let i=0;i<4;i++){ const h=.35+((i*41)%30)/100; poly(c,subq(q,i*.25+.02,1-h,i*.25+.2,1)); c.fill(); } }
  poly(c,q,null,'#fbfaf6',2.4); const a=qp(q,.5,0),b=qp(q,.5,1),m1=qp(q,0,.45),m2=qp(q,1,.45); c.strokeStyle='#fbfaf6'; c.lineWidth=1.6; c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.moveTo(m1[0],m1[1]); c.lineTo(m2[0],m2[1]); c.stroke(); }
function drawWalls(c,mod){
  const sky=skyColors(mod);
  box(c,0,-.18,0,N,.18,WH,'#efe9de'); box(c,-.18,-.18,0,.18,N+.18,WH,'#f6f1e8');
  poly(c,wallQuadY(0,N,0,.12),'#d6cdbd'); poly(c,wallQuadX(0,N,0,.12),'#ddd4c4');
  poly(c,wallQuadY(0,N,1.02,1.08),'#ff6a3d'); poly(c,wallQuadX(0,N,1.02,1.08),'#ff6a3d');
  for(const [a,b] of [[1.2,3.2],[5.5,7.5],[10.3,11.7]]) drawWindow(c,wallQuadY(a,b,1.15,2.15),sky,mod);
  drawWindow(c,wallQuadX(5.4,7.6,1.15,2.15),sky,mod);
  const dq=wallQuadX(DOOR_Y,DOOR_Y+1,0,1.75); poly(c,dq,'#3a3227'); poly(c,subq(dq,.1,.07,.9,1),'#6a5643'); const kn=qp(dq,.78,.55); c.fillStyle='#e6c56c'; c.beginPath(); c.arc(kn[0],kn[1],1.6,0,Math.PI*2); c.fill(); poly(c,dq,null,'#2b251d',1.5);
  poly(c,wallQuadX(DOOR_Y+.1,DOOR_Y+.9,1.85,2.08),'#1e9e66');
  withPlaneX(c,DOOR_Y+.5,1.965,()=>{ c.fillStyle='#fff'; c.font='bold 7px "Chakra Petch",monospace'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('PROYECTOS',0,0); });
  const now=new Date(); const mins=now.getMinutes(), hrs=now.getHours()%12+mins/60;
  withPlaneY(c,4.35,1.75,()=>{ c.fillStyle='#fffdf8'; c.strokeStyle='#2b2f38'; c.lineWidth=2; c.beginPath(); c.arc(0,0,11,0,Math.PI*2); c.fill(); c.stroke(); c.lineCap='round';
    for(let i=0;i<12;i++){ const a=i/12*Math.PI*2; c.lineWidth=i%3===0?1.6:.8; c.beginPath(); c.moveTo(Math.sin(a)*8.6,-Math.cos(a)*8.6); c.lineTo(Math.sin(a)*10,-Math.cos(a)*10); c.stroke(); }
    const ha=hrs/12*Math.PI*2, ma=mins/60*Math.PI*2; c.lineWidth=2; c.beginPath(); c.moveTo(0,0); c.lineTo(Math.sin(ha)*5.5,-Math.cos(ha)*5.5); c.stroke(); c.lineWidth=1.3; c.beginPath(); c.moveTo(0,0); c.lineTo(Math.sin(ma)*8,-Math.cos(ma)*8); c.stroke(); c.fillStyle='#ff6a3d'; c.beginPath(); c.arc(0,0,1.5,0,Math.PI*2); c.fill(); });
  const sig=((P()?.sigla||P()?.name||'DCD')+'').trim().slice(0,10);
  withPlaneX(c,8.25,1.6,()=>{ c.fillStyle='#1c2131'; c.font='800 13px "Bricolage Grotesque",sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('oficina',0,-8); c.fillStyle='#ff6a3d'; c.font='800 11px "Bricolage Grotesque",sans-serif'; c.fillText(sig.toLowerCase(),0,8); });
  withPlaneX(c,1.3,1.62,()=>{ c.fillStyle='#164a98'; c.fillRect(-16,-11,32,22); c.fillStyle='#fff'; c.font='800 7px "Chakra Petch",monospace'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('DCD',0,-3); c.fillStyle='#ffd36b'; c.fillRect(-10,4,20,2); });
}
function drawFloor(c){ box(c,0,0,-.35,N,N,.35,'#8a6648');
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const h=((x*73+y*151)%7)/7; poly(c,[iso(x,y),iso(x+1,y),iso(x+1,y+1),iso(x,y+1)],mix('#e2bf92','#d6b080',h)); c.strokeStyle='rgba(120,80,40,.13)'; c.lineWidth=.7; c.beginPath(); for(const k of [1/3,2/3]){ const a=iso(x,y+k),b=iso(x+1,y+k); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); } c.stroke(); }
  c.strokeStyle='rgba(120,80,40,.22)'; c.lineWidth=.8; c.beginPath(); for(let i=0;i<=N;i++){ let a=iso(i,0),b=iso(i,N); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); a=iso(0,i); b=iso(N,i); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); } c.stroke();
  poly(c,[iso(.08,DOOR_Y+.12,.004),iso(.7,DOOR_Y+.12,.004),iso(.7,DOOR_Y+.88,.004),iso(.08,DOOR_Y+.88,.004)],'#6d6a60'); }
function tileMark(c,x,y,col,fill){ const q=[iso(x,y,.01),iso(x+1,y,.01),iso(x+1,y+1,.01),iso(x,y+1,.01)]; if(fill) poly(c,q,fill); poly(c,q,null,col,2); }
function drawIcon(c,p,t){
  const x=p._sx, y=p._hy-4; const ic=p.icon; if(!ic) return;
  c.save();
  if(ic==='!'){ const b=Math.abs(Math.sin(t*4))*3; c.fillStyle='#ff6a3d'; c.strokeStyle='#fff'; c.lineWidth=2; c.beginPath(); c.arc(x,y-12-b,8,0,Math.PI*2); c.fill(); c.stroke(); c.fillStyle='#fff'; c.font='900 12px "Nunito Sans",sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('!',x,y-11.5-b); }
  else if(ic==='zz'){ c.fillStyle='#5a6377'; c.textAlign='center'; for(let i=0;i<3;i++){ const ph=((t*.6+i/3)%1); c.globalAlpha=Math.sin(ph*Math.PI); c.font=`800 ${8+ph*6}px "Bricolage Grotesque",sans-serif`; c.fillText('z',x+6+ph*10,y-6-ph*18); } }
  else if(ic==='idea'){ c.fillStyle='#fff'; c.strokeStyle='rgba(28,33,49,.25)'; rr(c,x-11,y-26,22,19,7); c.fill(); c.stroke(); c.fillStyle='#ffd23f'; c.beginPath(); c.arc(x,y-18,4.6,0,Math.PI*2); c.fill(); c.fillStyle='#9aa1ad'; c.fillRect(x-2,y-13.5,4,3); }
  c.restore();
}
function drawSmall(c,p){ if(!(p.bubT>0)||!p.bub||p.bub==='walk') return; const x=p._sx, y=p._hy-6; c.save(); c.globalAlpha=Math.min(1,p.bubT*2); c.fillStyle='#fff'; c.strokeStyle='rgba(28,33,49,.25)'; rr(c,x-11,y-25,22,19,7); c.fill(); c.stroke(); const cx=x, cy=y-15.5;
  if(p.bub==='coffee'){ c.fillStyle='#8a5a3c'; rr(c,cx-5,cy-3,8,8,2); c.fill(); c.strokeStyle='#8a5a3c'; c.lineWidth=1.5; c.beginPath(); c.arc(cx+3.5,cy+1,2.4,-Math.PI/2,Math.PI/2); c.stroke(); }
  else if(p.bub==='heart'){ c.fillStyle='#ff5d73'; c.beginPath(); c.moveTo(cx,cy+5); c.bezierCurveTo(cx-9,cy-1,cx-4,cy-8,cx,cy-3); c.bezierCurveTo(cx+4,cy-8,cx+9,cy-1,cx,cy+5); c.fill(); }
  else if(p.bub==='ok'){ c.strokeStyle='#1e9e66'; c.lineWidth=2.4; c.beginPath(); c.moveTo(cx-5,cy); c.lineTo(cx-1,cy+4); c.lineTo(cx+6,cy-4); c.stroke(); }
  c.restore(); }
function wrapText(c,txt,maxW){ const words=String(txt).split(/\s+/); const lines=[]; let cur=''; for(const w of words){ const t2=cur?cur+' '+w:w; if(c.measureText(t2).width>maxW&&cur){ lines.push(cur); cur=w; } else cur=t2; } if(cur) lines.push(cur); return lines.slice(0,3); }
function drawSay(c,p){ if(!(p.sayT>0)||!p.say) return; c.save(); c.font='700 10px "Nunito Sans",sans-serif'; const lines=wrapText(c,p.say,120); const w=Math.max(...lines.map(l=>c.measureText(l).width))+16, h=lines.length*13+10; const x=p._sx, y=p._hy-(p.icon==='!'?26:8);
  c.fillStyle='#fff'; c.strokeStyle='rgba(28,33,49,.28)'; c.lineWidth=1; rr(c,x-w/2,y-h-6,w,h,8); c.fill(); c.stroke(); c.beginPath(); c.moveTo(x-4,y-6.5); c.lineTo(x,y-1); c.lineTo(x+4,y-6.5); c.fill();
  c.fillStyle='#1c2131'; c.textAlign='center'; c.textBaseline='top'; lines.forEach((l,i)=>c.fillText(l,x,y-h-1+i*13)); c.restore(); }
function label(c,x,y,txt){ c.save(); c.font='700 10px "Nunito Sans",sans-serif'; const w=c.measureText(txt).width+14; c.fillStyle='rgba(28,33,49,.88)'; rr(c,x-w/2,y-17,w,17,8); c.fill(); c.fillStyle='#fff'; c.textAlign='center'; c.textBaseline='middle'; c.fillText(txt,x,y-8.5); c.restore(); }
let hover=null, hoverPerson=null, syncing=false;
// Paredes, piso y alfombras se dibujan una vez en una capa aparte y se reusan
// mientras no cambien la cámara, el minuto, el tamaño de la ventana ni las alfombras
const bgLayer={cv:document.createElement('canvas'), key:'', glows:[]};
function drawStatic(mod){
  const rugs=objs.filter(o=>CAT[o.t].floor).map(o=>o.x+','+o.y+','+o.c).join('|');
  const key=[W,H,DPR,cam.x,cam.y,cam.z,mod,P()?.id,P()?.sigla,P()?.name,rugs,document.fonts?.status].join(';');
  if(key!==bgLayer.key){ const b=bgLayer.cv; b.width=cv.width; b.height=cv.height; const c=b.getContext('2d');
    c.setTransform(DPR*cam.z,0,0,DPR*cam.z,DPR*cam.x,DPR*cam.y); const g0=GLOWS.length;
    drawWalls(c,mod); drawFloor(c); for(const o of objs) if(CAT[o.t].floor) drawRug(c,o);
    bgLayer.glows=GLOWS.slice(g0); GLOWS.length=g0; bgLayer.key=key; }
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(bgLayer.cv,0,0); ctx.restore(); GLOWS.push(...bgLayer.glows);
}
function render(t){
  const now=new Date(); const mod=now.getHours()*60+now.getMinutes();
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const sky=skyColors(mod); const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,sky[0]); g.addColorStop(1,sky[1]); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.fillStyle=`rgba(255,255,255,${.35-darkness(mod)*.8})`; for(let i=0;i<4;i++){ const cx=((t*8+i*W/3.2)%(W+300))-150, cy=60+i*45+(i%2)*30; ctx.beginPath(); ctx.ellipse(cx,cy,70,16,0,0,Math.PI*2); ctx.ellipse(cx+40,cy-8,40,14,0,0,Math.PI*2); ctx.fill(); }
  ctx.setTransform(DPR*cam.z,0,0,DPR*cam.z,DPR*cam.x,DPR*cam.y);
  GLOWS=[]; drawStatic(mod);
  if(edit){ ctx.strokeStyle='rgba(28,33,49,.16)'; ctx.lineWidth=1; for(let i=0;i<=N;i++){ let a=iso(i,0,.01),b=iso(i,N,.01); ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.stroke(); a=iso(0,i,.01); b=iso(N,i,.01); ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.stroke(); }
    const so=byId[edit.sel]; if(so) tileMark(ctx,so.x,so.y,'#ff6a3d','rgba(255,106,61,.18)');
    if(hover&&inB(hover.x,hover.y)){ const t=edit.mode==='place'?edit.type:edit.mode==='move'&&so?so.t:null; if(t){ const ok=canPlaceAt(t,hover.x,hover.y,edit.mode==='move'?so:null); tileMark(ctx,hover.x,hover.y,ok?'#1f9e8f':'#d6424a',ok?'rgba(31,158,143,.15)':'rgba(214,66,74,.18)'); } else tileMark(ctx,hover.x,hover.y,'rgba(28,33,49,.35)'); } }
  else if(hover&&inB(hover.x,hover.y)&&!hoverPerson){ const o=objAt(hover.x,hover.y); if(o&&(CAT[o.t].act||o.t==='desk')) tileMark(ctx,o.x,o.y,'rgba(255,106,61,.8)','rgba(255,106,61,.1)'); }
  const items=[]; for(const o of objs){ if(CAT[o.t].floor) continue; items.push({b:objBounds(o),f:c=>drawObj(c,o,t)}); }
  for(const p of people){ if(p.sitting!=null) continue; const r=.14; items.push({b:{x0:p.x-r,x1:p.x+r,y0:p.y-r,y1:p.y+r,z0:0,z1:1.15},f:c=>drawPerson(c,p,p.x,p.y,0,t,{moving:p.path.length>0,wave:p.atSlot,sel:sel&&sel.id===p.id})}); }
  for(const it of depthSort(items)) it.f(ctx);
  if(edit&&hover&&inB(hover.x,hover.y)){ const so=byId[edit.sel]; const g=edit.mode==='place'?{id:-1,t:edit.type,x:hover.x,y:hover.y,r:edit.rot,c:edit.color,occ:null}:edit.mode==='move'&&so?{id:-1,t:so.t,x:hover.x,y:hover.y,r:so.r,c:so.c,occ:null,owner:so.owner}:null;
    if(g){ ctx.save(); ctx.globalAlpha=.6; const g0=GLOWS.length; if(CAT[g.t].floor) poly(ctx,[iso(g.x+.06,g.y+.06,.01),iso(g.x+.94,g.y+.06,.01),iso(g.x+.94,g.y+.94,.01),iso(g.x+.06,g.y+.94,.01)],g.c||'#2f9c8a'); else drawObj(ctx,g,t); GLOWS.length=g0; ctx.restore(); } }
  for(const p of people){ if(p._sx==null) continue; drawIcon(ctx,p,t); drawSmall(ctx,p); drawSay(ctx,p); }
  if(hoverPerson&&hoverPerson._sx!=null&&!(hoverPerson.sayT>0)) label(ctx,hoverPerson._sx,hoverPerson._hy-(hoverPerson.icon?24:4),hoverPerson.name);
  else if(hover&&!hoverPerson){ const o=inB(hover.x,hover.y)?objAt(hover.x,hover.y):null; if(o&&CAT[o.t].lbl&&CAT[o.t].act){ const [sx,sy]=iso(o.x+.5,o.y+.5,CAT[o.t].h+.25); label(ctx,sx,sy,CAT[o.t].lbl); } }
  for(const f of floats){ const [sx,sy]=iso(f.x,f.y,f.z); const k=1-f.life/2; ctx.save(); ctx.globalAlpha=Math.min(1,f.life*1.5); ctx.font='700 11px "Chakra Petch",monospace'; ctx.textAlign='center'; ctx.lineWidth=3; ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.strokeText(f.txt,sx,sy-k*22); ctx.fillStyle=f.col; ctx.fillText(f.txt,sx,sy-k*22); ctx.restore(); }
  const d=darkness(mod);
  if(d>0.01){ ctx.setTransform(DPR,0,0,DPR,0,0); ctx.fillStyle=`rgba(14,18,48,${d})`; ctx.fillRect(0,0,W,H); ctx.setTransform(DPR*cam.z,0,0,DPR*cam.z,DPR*cam.x,DPR*cam.y); ctx.save(); ctx.globalCompositeOperation='lighter';
    for(const gl of GLOWS){ const [sx,sy]=iso(gl.x,gl.y,gl.z); const gr=ctx.createRadialGradient(sx,sy,0,sx,sy,gl.r); gr.addColorStop(0,`rgba(${gl.c},${gl.a*d*2})`); gr.addColorStop(1,`rgba(${gl.c},0)`); ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(sx,sy,gl.r,0,Math.PI*2); ctx.fill(); } ctx.restore(); }
}
const floats=[]; function floatTxt(x,y,txt,col){ floats.push({x,y,z:1.6,txt,col:col||'#1e9e66',life:2}); }

/* ---------- Entrada ---------- */
function screenToWorld(mx,my){ const wx=(mx-cam.x)/cam.z, wy=(my-cam.y)/cam.z; return {x:(wx/(TW/2)+wy/(TH/2))/2, y:(wy/(TH/2)-wx/(TW/2))/2}; }
function screenToTile(mx,my){ const wx=(mx-cam.x)/cam.z, wy=(my-cam.y)/cam.z; const x=(wx/(TW/2)+wy/(TH/2))/2, y=(wy/(TH/2)-wx/(TW/2))/2; return {x:Math.floor(x),y:Math.floor(y)}; }
function personAtScreen(mx,my){ let best=null,bk=-1e9; for(const p of people){ if(p._sx==null) continue; const sx=cam.x+p._sx*cam.z, sy=cam.y+p._sy*cam.z, hy=cam.y+(p._hy-2)*cam.z; if(mx>sx-11*cam.z&&mx<sx+11*cam.z&&my>hy&&my<sy+3*cam.z){ const k=p.x+p.y+(p.sitting!=null?.5:0); if(k>bk){bk=k;best=p;} } } return best; }
// Tocar un mueble alto también sirve tocando su parte de arriba
function objAtScreen(mx,my){ for(let dz=0;dz<=1.6;dz+=.2){ const t=screenToTile(mx,my+dz*TZ*cam.z); const o=inB(t.x,t.y)?objAt(t.x,t.y):null; if(o&&(CAT[o.t].act||o.t==='desk')&&CAT[o.t].h>=dz) return o; } const w=screenToWorld(mx,my); if(w.x<.3&&w.x>-2.4){ const yw=w.y-Math.min(0,w.x); if(yw>=DOOR_Y&&yw<=DOOR_Y+1) return {t:'door'}; } return null; }
const pointers=new Map(); let drag=null, pinch=null;
cv.addEventListener('pointerdown',e=>{ cv.setPointerCapture(e.pointerId); pointers.set(e.pointerId,{x:e.clientX,y:e.clientY}); if(pointers.size===1) drag={sx:e.clientX,sy:e.clientY,cx:cam.x,cy:cam.y,moved:false}; else if(pointers.size===2){ const [a,b]=[...pointers.values()]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:cam.z,mx:(a.x+b.x)/2,my:(a.y+b.y)/2,cx:cam.x,cy:cam.y}; drag=null; } });
cv.addEventListener('pointermove',e=>{ const r=cv.getBoundingClientRect(); const mx=e.clientX-r.left,my=e.clientY-r.top; if(pointers.has(e.pointerId)) pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch&&pointers.size===2){ const [a,b]=[...pointers.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y); const nz=clamp(pinch.z*d/pinch.d,.35,2.6); cam.x=pinch.mx-(pinch.mx-pinch.cx)*nz/pinch.z; cam.y=pinch.my-(pinch.my-pinch.cy)*nz/pinch.z; cam.z=nz; return; }
  if(drag){ const dx=e.clientX-drag.sx, dy=e.clientY-drag.sy; if(!drag.moved&&Math.hypot(dx,dy)>6){ drag.moved=true; cv.classList.add('dragging'); } if(drag.moved){ cam.x=drag.cx+dx; cam.y=drag.cy+dy; } }
  if(edit){ hoverPerson=null; hover=screenToTile(mx,my); return; }
  hoverPerson=personAtScreen(mx,my); const o=hoverPerson?null:objAtScreen(mx,my); hover=o&&o.x!=null?{x:o.x,y:o.y}:null; cv.classList.toggle('pointing',!!(hoverPerson||o)); });
function endPointer(e){ const was=drag; pointers.delete(e.pointerId); if(pointers.size<2) pinch=null; cv.classList.remove('dragging'); if(was&&!was.moved&&pointers.size===0){ const r=cv.getBoundingClientRect(); click(e.clientX-r.left,e.clientY-r.top); } if(pointers.size===0) drag=null; }
cv.addEventListener('pointerup',endPointer); cv.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);drag=null;pinch=null;});
cv.addEventListener('pointerleave',()=>{ if(!pointers.size){ hover=null; hoverPerson=null; } });
cv.addEventListener('wheel',e=>{ e.preventDefault(); const r=cv.getBoundingClientRect(); const mx=e.clientX-r.left,my=e.clientY-r.top; const nz=clamp(cam.z*Math.exp(-e.deltaY*.0015),.35,2.6); cam.x=mx-(mx-cam.x)*nz/cam.z; cam.y=my-(my-cam.y)*nz/cam.z; cam.z=nz; },{passive:false});
function click(mx,my){
  if(edit){ editClick(mx,my); return; }
  const p=personAtScreen(mx,my); if(p){ openAgent(p.k); return; }
  const o=objAtScreen(mx,my); if(!o){ closePanel(); return; }
  if(o.t==='door'){ showHome(); return; }
  if(o.t==='desk'){ openAgent(o.owner); return; }
  const a=CAT[o.t].act; if(a) act(a);
}
function act(a){
  if(a==='sync') return doSync();
  if(a==='juego') return gameOpen();
  if(a==='cartero') return openAgent('cartero');
  if(a==='biblio') return openAgent('biblio');
  if(a==='rocola'){ jbBox(); return openPanel('rocola'); }
  openPanel(a);
}

/* ---------- Panel ---------- */
const panel=document.getElementById('of-panel');
let panelKey=null;
function openAgent(k){
  const p=personByK(k); if(!p) return; sel={id:p.id};
  const need=needOf(k); if(need.sig) ack[k]=need.sig; LS.set(kAck(),ack);
  if(p.atSlot){ p.atSlot=false; p.slot=null; p.bub='ok'; p.bubT=1.5; goHome(p); }
  openPanel(k);
}
function openPanel(k){ if(edit&&k!=='decorar'){ edit=null; saveLayout(); resettle(); cv.classList.remove('editing'); } panelKey=k; panel.hidden=false; renderPanel(); paintTools(); }
function closePanel(){ panelKey=null; panel.hidden=true; sel=null; paintTools(); }
function avatar(k){ const a=AGENTS.find(x=>x.k===k); if(!a) return ''; return `<canvas data-av="${k}" width="120" height="136" aria-hidden="true"></canvas>`; }
function paintAvatars(){ panel.querySelectorAll('canvas[data-av]').forEach(cn=>{ const a=AGENTS.find(x=>x.k===cn.dataset.av); const c=cn.getContext('2d'); c.clearRect(0,0,120,136); c.save(); c.scale(2,2); c.translate(30,62); drawPerson(c,{id:1,k:a.k,look:a.look,face:0,ph:0},0,0,0,performance.now()/1000,{}); c.restore(); }); }
function head(k,title,sub,say){ const ag=AGENTS.find(x=>x.k===k); if(ag) title=ag.n; return `<button class="of-close" onclick="Office.closePanel()" aria-label="Cerrar">×</button><div class="of-ph">${ag?`<button class="of-avbtn" onclick="Office.charOpen('${k}')" title="Editar a ${attr(ag.n)}" aria-label="Editar a ${attr(ag.n)}">${avatar(k)}</button>`:avatar(k)}<div><h3>${esc(title)}</h3><div class="sub">${esc(sub)}</div></div></div>${say?`<div class="of-say">${say}</div>`:''}`; }
// Cambia el HTML solo si es distinto: evita repintar cada segundo y cerrar menús abiertos
function setHTML(el,html){ if(el&&el._h!==html){ el.innerHTML=html; el._h=html; } }
function renderPanel(soft){
  const k=panelKey; if(!k) return;
  const f={personajes:panelPersonajes,decorar:panelDecorar,rocola:panelRocola,carreras:panelCarreras,disenador:panelDisenador,peche:panelPeche,cartero:panelCartero,corrector:panelCorrector,programa:()=>panelNuevo('programa'),ficha:()=>panelNuevo('ficha'),recepcion:panelRecepcion,biblio:panelBiblio,ajustes:panelAjustes,tomo:panelTomo}[k];
  if(!f) return; const keepScroll=panel.scrollTop; const vals={}; panel.querySelectorAll('input[id],textarea[id],select[id]').forEach(el=>{ if(el.type==='file') return; vals[el.id]=el.type==='checkbox'?el.checked:el.value; }); const act=document.activeElement&&panel.contains(document.activeElement)?document.activeElement.id:'';
  const html=f(); if(soft&&html===panel._h) return; panel.innerHTML=html; panel._h=html; Object.entries(vals).forEach(([id,v])=>{ const el=document.getElementById(id); if(!el||!panel.contains(el)) return; if(el.type==='checkbox') el.checked=v; else el.value=v; if(el.dataset.pick) filterPick(el.dataset.pick,el.value); });
  if(act){ const el=document.getElementById(act); if(el) el.focus(); } panel.scrollTop=keepScroll; paintAvatars(); paintDecorPreviews(); wireDrops();
}
function refresh(){ if(!panel.hidden) renderPanel(); paintHud(); paintTools(); }

/* Selector de cursos */
const pickCb={};
function chips(c){ const s=savedForCourse(c); const st=courseStage(s); const v=(()=>{ try{ return localStorage.getItem('dcd_ver_'+c['Código'])||''; }catch(e){ return ''; } })(); return `${st.ficha?'✓ficha':'○ficha'} · ${st.programa?'✓programa':'○programa'}${v?' · '+v:''}`; }
function picker(id, cb, filter){
  pickCb[id]=cb; const list=(allCourses||[]).filter(filter||(()=>true));
  if(!(allCourses||[]).length) return `<div class="of-note">Cargando los cursos de la hoja Base…</div>`;
  return `<input class="of-in" id="pkq-${id}" data-pick="${id}" placeholder="Buscar por código o nombre" aria-label="Buscar curso" oninput="Office.filterPick('${id}',this.value)"><div class="of-pick" id="pk-${id}">${list.map(c=>`<button data-c="${attr(c['Código'])}" data-s="${attr(normTxt(c['Código']+' '+cName(c)))}" onclick="Office.pick('${id}',this.dataset.c)"><span class="c">${esc(c['Código'])}</span><span class="nm">${esc(cName(c))}</span><span class="ch">${chips(c)}</span></button>`).join('')||'<div class="of-note" style="padding:10px">No hay cursos que mostrar.</div>'}</div>`;
}
function filterPick(id,q){ const n=normTxt(q); document.querySelectorAll(`#pk-${id} button`).forEach(b=>{ b.style.display=!n||b.dataset.s.includes(n)?'':'none'; }); }
function pick(id,code){ const cb=pickCb[id]; if(cb) cb(code); }

/* ---------- Utilidades de Google ---------- */
function copyText(t){ let ok=false; const ta=document.createElement('textarea'); ta.value=t; ta.setAttribute('readonly',''); ta.style.cssText='position:fixed;left:-9999px;opacity:0'; document.body.appendChild(ta); ta.select(); try{ ok=document.execCommand('copy'); }catch(e){} ta.remove(); if(!ok&&navigator.clipboard){ navigator.clipboard.writeText(t).catch(()=>{}); ok=true; } return ok; }
function openClaude(){ window.open(getClaudeUrl(),'_blank','noopener'); }
const DOCX='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
function needGoogle(after){ if(!gAccessToken){ toast('Conectá tu cuenta de Google primero',''); googleSignIn(after); return true; } return false; }
function ensureDrive(after){ if(needGoogle(after)) return false; if(localStorage.getItem('dcd_drive_ok')!=='1'){ toast('Google pide permiso para tus carpetas de Drive. Aceptá y sigo solo.',''); requestDriveScope(after); return false; } return true; }
let mailTokenClient=null;
function requestMail(after){ if(!window.google?.accounts?.oauth2){ toast('Google Identity Services no cargó aún. Intentá de nuevo.','error'); return; }
  if(!mailTokenClient) mailTokenClient=google.accounts.oauth2.initTokenClient({client_id:GOOGLE_CLIENT_ID, scope:SHEETS_SCOPE+' '+DRIVE_SCOPE+' '+GMAIL_SCOPE+' '+GMAIL_READ_SCOPE, include_granted_scopes:true, callback:onTokenReceived});
  afterTokenFn=after; mailTokenClient.requestAccessToken(gUserInfo?.email?{prompt:'',hint:gUserInfo.email}:{prompt:''}); }
const mailReadOk=()=>localStorage.getItem('dcd_gmailr_ok')==='1';
const mailWriteOk=()=>localStorage.getItem('dcd_gmail_ok')==='1'||mailReadOk();
async function gmail(path,opts={}){ const r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/'+path,Object.assign({},opts,{headers:Object.assign({Authorization:'Bearer '+gAccessToken},opts.body?{'Content-Type':'application/json'}:{})}));
  if(!r.ok){ const e=await r.json().catch(()=>({})); const err=new Error(e.error?.message||('Gmail '+r.status)); err.status=r.status; err.gscope=r.status===403&&/scope|insufficient|permission/i.test(err.message); throw err; } return r.json(); }
function b64urlBytes(s){ const bin=atob(String(s).replace(/-/g,'+').replace(/_/g,'/')); const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u; }
const b64urlText=s=>new TextDecoder().decode(b64urlBytes(s));
async function driveBlob(id){ const r=await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`,{headers:{Authorization:'Bearer '+gAccessToken}}); if(!r.ok){ const e=await r.json().catch(()=>({})); const err=new Error(e.error?.message||('Drive '+r.status)); err.status=r.status; err.scope=r.status===403&&/scope|insufficient|permission/i.test(err.message); throw err; } return r.blob(); }
async function driveReplace(id,blob,name){ const bnd='dcd'+Math.random().toString(36).slice(2); const body=new Blob([`--${bnd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,JSON.stringify({name}),`\r\n--${bnd}\r\nContent-Type: ${DOCX}\r\n\r\n`,blob,`\r\n--${bnd}--`]);
  return driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink`,{method:'PATCH',headers:{'Content-Type':`multipart/related; boundary=${bnd}`},body}); }
async function driveMeta(id){ return driveFetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,webViewLink&supportsAllDrives=true`); }
const docLink=(id,link)=>link||`https://docs.google.com/document/d/${id}/edit`;
function saveBlob(blob,name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); }
function folderOf(kind){ const p=P(); return driveFolderId(kind==='ficha'?p.folderFichas:p.folderProgramas); }
// Corre una tarea con manejo uniforme de permisos vencidos
async function run(key, fn, retry){
  if(busy[key]) return; busy[key]=true; refresh();
  try{ await fn(); }
  catch(e){ console.error(e);
    if(e.status===401){ gAccessToken=null; try{ localStorage.removeItem('dcd_gtoken'); }catch(_){} toast('La sesión de Google venció. Volvé a conectar y repetí el paso.','error'); renderNavAuth(); }
    else if(e.gscope){ try{ localStorage.removeItem('dcd_gmailr_ok'); localStorage.removeItem('dcd_gmail_ok'); }catch(_){} toast('Gmail pide permiso de nuevo. Aceptá y repetí el paso.',''); requestMail(retry||null); }
    else if(e.scope){ try{ localStorage.removeItem('dcd_drive_ok'); }catch(_){} toast('Drive pide permiso de nuevo. Aceptá y repetí el paso.',''); requestDriveScope(retry||null); }
    else toast(e.message||String(e),'error'); }
  busy[key]=false; refresh();
}
// Aplica los campos leídos (de un Word o de Claude) y escribe la fila del curso en el Maestro
function applyItems(items, skip){
  const sid=P().sheetId, code=currentCourse['Código']; maestroData[sid]=maestroData[sid]||{}; maestroData[sid][code]=maestroData[sid][code]||{};
  let n=0; items.forEach(it=>{ if(!it.secId||it.value==null||!String(it.value).trim()) return; if(skip&&skip.includes(it.secId)) return; maestroData[sid][code][it.secId]=it.value; n++; });
  localStorage.setItem('dcd_maestro',JSON.stringify(maestroData)); autoBackup(); return n;
}
async function writeMaestro(){ if(!gAccessToken) throw new Error('Conectá Google para escribir en el Maestro'); await writeCourseToMaestro(extractSheetId(P().url), currentCourse['Código'], buildMaestroColMap(currentSaved()), currentCourse); }
async function syncFromBlob(blob, skip){ const d=parseFichaDocx(await readDocxXml(blob)); const items=fichaDocxToItems(d).filter(i=>i.secId); const n=applyItems(items, skip); await writeMaestro(); return n; }
function setVersion(v){ try{ const old=courseVersion(); const io=VERSIONES.indexOf(old), iv=VERSIONES.indexOf(v); if(iv>io&&io>=0&&!versionSnap(old)) saveVersionSnap(old,currentSaved()); rememberVersion(currentCourse['Código'],v); }catch(e){} }
function mailCfg(){ const p=P(), pp=(typeof gmPrefs==='function'?gmPrefs():{})||{}, g=(typeof gmGlobal==='function'?gmGlobal():{})||{}; return { prefix:(p.mailPrefix??pp.prefix??p.sigla??'').trim(), prog:(p.mailProg||'Programa de curso').trim(), ficha:(p.mailFicha||'Ficha de curso').trim(), to:(p.mailTo||pp.to||g.to||'').trim(), name:(p.mailName||pp.name||g.name||'Ralph').trim(), cc:(p.mailCc||pp.cc||'').trim() }; }
function fmtAddr(list){ return String(list||'').split(',').map(a=>a.trim()).filter(Boolean).map(a=>{ const m=a.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/); return m&&m[1].trim()?`${mimeWord(m[1].trim())} <${m[2]}>`:a; }).join(', '); }
async function makeDraft({to,cc,subject,body,fname,blob,threadId,inReply,refs}){
  let raw=buildMime({to:fmtAddr(to),cc:fmtAddr(cc),subject,body,fname,fileB64:await blobB64(blob)});
  if(inReply) raw=raw.replace('MIME-Version: 1.0',`In-Reply-To: ${inReply}\r\nReferences: ${((refs||'')+' '+inReply).trim()}\r\nMIME-Version: 1.0`);
  const msg={raw:b64url(utf8B64(raw))}; if(threadId) msg.threadId=threadId;
  const d=await gmail('drafts',{method:'POST',body:JSON.stringify({message:msg})});
  return {link:`https://mail.google.com/mail/u/0/#drafts?compose=${encodeURIComponent(d.message?.id||'')}`, id:d.id||''};
}
async function dropDraft(id){ if(!id) return; try{ const r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts/'+id,{method:'DELETE',headers:{Authorization:'Bearer '+gAccessToken}}); return r.ok; }catch(e){ return false; } }
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hhmm=t=>new Date(t).toLocaleTimeString('es-CR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
// Google Docs guarda los cambios de un .docx con unos segundos de retraso: antes de leerlo se espera a que Drive termine.
// También detecta si el documento se convirtió a Google Docs (copia aparte) y usa esa copia, que es la que tiene los cambios.
async function freshDoc(fileId, since, code){
  const F='id,name,modifiedTime,webViewLink,parents';
  let meta=await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=${F}&supportsAllDrives=true`);
  try{
    const par=(meta.parents||[])[0];
    if(par){ const q=encodeURIComponent(`'${par}' in parents and trashed=false and mimeType='application/vnd.google-apps.document'`);
      const out=await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=50&supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives`);
      const base=normTxt(meta.name.replace(/\.docx$/i,'')); const re=codeRe(code);
      const g=(out.files||[]).find(x=>(re?re.test(String(x.name).toUpperCase()):true) && normTxt(x.name).replace(/\.docx$/,'')===base && Date.parse(x.modifiedTime)>Date.parse(meta.modifiedTime));
      if(g){ toast(`Encontré tu copia en Google Docs de ${code}: uso esa y actualizo el .docx con ella`,'');
        const r=await fetch(`https://www.googleapis.com/drive/v3/files/${g.id}/export?mimeType=${encodeURIComponent(DOCX)}`,{headers:{Authorization:'Bearer '+gAccessToken}});
        if(r.ok){ const blob=await r.blob(); const up=await driveReplace(fileId, blob, meta.name); return {meta:Object.assign(meta,up,{modifiedTime:new Date().toISOString()}), blob, fromCopy:g.name}; } } }
  }catch(e){ if(e.status===401||e.scope) throw e; }
  // Si se guardó hace poco, se espera a que deje de cambiar (Docs sigue guardando)
  let t=Date.parse(meta.modifiedTime);
  if(Date.now()-t<90000){ toast('Esperando a que Google Docs termine de guardar tus cambios…',''); let stable=0;
    for(let i=0;i<15&&stable<2;i++){ await sleep(5000); const m2=await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=${F}&supportsAllDrives=true`); if(m2.modifiedTime===meta.modifiedTime) stable++; else { stable=0; meta=m2; } } t=Date.parse(meta.modifiedTime); }
  if(since && t<since-2000){
    if(!confirm(`En Drive no veo cambios en ${code} desde ${hhmm(since)} (último guardado: ${hhmm(t)}).\n\nSi lo editaste en Google Docs, cerrá esa pestaña para que termine de guardar, esperá unos segundos y volvé a intentar.\n\n¿Seguir de todos modos con la versión que está ahora en Drive?`)) throw new Error('Listo, no envié nada. Cerrá la pestaña de Google Docs y volvé a tocar el botón.');
  }
  return {meta, blob:await driveBlob(fileId)};
}

/* ---------- Cartero ---------- */
function codeRe(code){ const parts=(String(code||'').toUpperCase().match(/[A-Z]+|\d+/g)||[]).map(x=>/^\d+$/.test(x)?'0*'+String(parseInt(x,10)):x); return parts.length?new RegExp('(^|[^A-Z0-9])'+parts.join('[\\s_-]*')+'(?![0-9])','i'):null; }
function findCourseIn(txt){ const T=String(txt||'').toUpperCase(); const hits=(allCourses||[]).filter(c=>{ const re=codeRe(c['Código']); return re&&re.test(T); }); hits.sort((a,b)=>String(b['Código']).length-String(a['Código']).length); return hits[0]||null; }
function stripQuoted(t){ const L=String(t||'').replace(/\r/g,'').split('\n'); const out=[]; for(const l of L){ if(/^\s*>/.test(l)) continue; if(/^\s*(El|On)\s.+(escribi[oó]|wrote)\s*:?\s*$/i.test(l)) break; if(/^\s*-{2,}\s*(Original|Mensaje original|Forwarded)/i.test(l)) break; if(/^\s*(De|From)\s*:\s.+/i.test(l)&&out.length) break; out.push(l); } return out.join('\n').trim(); }
function mailQuery(){ const m=mailCfg(); const labs=[m.prog,m.ficha].filter(Boolean).map(l=>`subject:("${l}")`).join(' '); return `is:unread has:attachment ${m.prefix?`subject:("${m.prefix}") `:''}{${labs}}`; }
function parseMail(full){
  const H=n=>((full.payload?.headers)||[]).find(h=>h.name.toLowerCase()===n)?.value||'';
  const subject=H('subject'), from=H('from'), rfc=H('message-id'), refs=H('references');
  let text='', html=''; const atts=[];
  (function walkP(p){ if(!p) return; if(p.filename&&p.body?.attachmentId){ if(/\.docx$/i.test(p.filename)) atts.push({id:p.body.attachmentId,filename:p.filename,size:p.body.size||0}); }
    else if(p.mimeType==='text/plain'&&p.body?.data&&!text) text=b64urlText(p.body.data); else if(p.mimeType==='text/html'&&p.body?.data&&!html) html=b64urlText(p.body.data); (p.parts||[]).forEach(walkP); })(full.payload);
  if(!text&&html) text=html.replace(/<br\s*\/?>/gi,'\n').replace(/<\/(p|div)>/gi,'\n').replace(/<blockquote[\s\S]*$/i,'').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&');
  if(!atts.length) return null;
  const m=mailCfg(); const att=atts[0];
  const kind=(normTxt(subject).includes(normTxt(m.ficha))||/\bficha\b/i.test(att.filename))?'ficha':'programa';
  const c=findCourseIn(subject)||findCourseIn(att.filename);
  const body=stripQuoted(text); const nb=normTxt(body);
  const final=/\bfinal\b/.test(nb);
  const ram=parseInt((att.filename.match(/RAM\s*[-_ ]?(\d)/i)||[])[1]||'0',10)||0;
  const next=final?'Final':('PRL'+Math.min(3,Math.max(2,(ram||1)+1)));
  return {id:full.id, threadId:full.threadId, subject, from, rfc, refs, date:parseInt(full.internalDate||Date.now(),10), kind, code:c?c['Código']:'', att, final, ram, next, snippet:(body||full.snippet||'').slice(0,260), status:'nuevo'};
}
async function checkMail(silent){
  if(!P()) return; if(!gAccessToken){ if(!silent) needGoogle(()=>checkMail()); return; }
  if(!mailReadOk()){ mailNeedPerm=true; if(!silent){ requestMail(()=>checkMail()); } refresh(); return; }
  if(mailBusy) return; mailBusy=true; mailNeedPerm=false; refresh();
  try{
    const list=await gmail('messages?maxResults=25&q='+encodeURIComponent(mailQuery()));
    const I=inbox(); let nuevos=0;
    for(const m of (list.messages||[])){ if(I.some(x=>x.id===m.id)) continue; const full=await gmail(`messages/${m.id}?format=full`); const it=parseMail(full); if(it){ I.push(it); nuevos++; } }
    saveInbox(I); mailLast=Date.now();
    if(!silent) toast(nuevos?`El Cartero trajo ${nuevos} correo${nuevos>1?'s':''} nuevo${nuevos>1?'s':''}`:'No hay correos nuevos del revisor', nuevos?'success':'');
    const ca=personByK('cartero'); if(ca&&nuevos){ ca.bub='ok'; ca.bubT=2; }
  }catch(e){ if(e.gscope){ mailNeedPerm=true; try{ localStorage.removeItem('dcd_gmailr_ok'); }catch(_){} } else if(!silent) toast('No pude revisar el correo: '+e.message,'error'); }
  mailBusy=false; refresh();
}
function processMail(id){ return run('mail:'+id, async()=>{
  const I=inbox(); const it=I.find(x=>x.id===id); if(!it) return;
  if(!it.code) throw new Error('No encontré el código del curso en el asunto ni en el adjunto. Elegilo en la lista del correo.');
  if(!ensureDrive(()=>processMail(id))) return;
  const folder=folderOf(it.kind); if(!folder) throw new Error(`El proyecto no tiene la carpeta de ${it.kind==='ficha'?'fichas':'programas'} en Drive. Agregala en la pizarra (Ajustes).`);
  setCourse(it.code);
  const att=await gmail(`messages/${it.id}/attachments/${it.att.id}`); const blob=new Blob([b64urlBytes(att.data)],{type:DOCX});
  const r=await driveUploadDocx(blob, it.att.filename, folder, it.kind);
  await gmail(`messages/${it.id}/modify`,{method:'POST',body:JSON.stringify({removeLabelIds:['UNREAD']})});
  if(it.kind==='programa') setVersion(it.next);
  const F=flows(); const base={id:'f'+Date.now().toString(36), kind:it.kind, code:it.code, ram:it.ram, next:it.next, msgId:it.id, threadId:it.threadId, rfc:it.rfc, refs:it.refs, subject:it.subject, from:it.from, fileId:r.file.id, fileName:r.file.name, link:r.file.webViewLink||'', created:Date.now()};
  if(it.final){ const n=await syncFromBlob(blob); F.push(Object.assign(base,{stage:'final', learned:true})); toast(`✓ ${it.code} quedó en versión Final: subido a Drive y ${n} campos al Maestro`,'success'); floatTxt(7.5,.5,'+1 Final','#c9a000'); }
  else { F.push(Object.assign(base,{stage:'comentado'})); toast(`✓ ${it.code}: el documento con comentarios ya está en Drive. El Corrector te espera.`,'success'); }
  saveFlows(F); it.status='subido'; it.flow=base.id; saveInbox(I);
  const ca=personByK('cartero'); if(ca){ ca.bub='ok'; ca.bubT=2; }
}, ()=>processMail(id)); }
async function processAll(){ for(const m of inbox().filter(x=>x.status==='nuevo'&&x.code)) await processMail(m.id); }
function setMailCourse(id,code){ const I=inbox(); const it=I.find(x=>x.id===id); if(it){ it.code=code; saveInbox(I); refresh(); } }
function setMailKind(id,v){ const I=inbox(); const it=I.find(x=>x.id===id); if(!it) return; if(v==='final'){ it.final=true; it.next='Final'; } else { it.final=false; it.next='PRL'+Math.min(3,Math.max(2,(it.ram||1)+1)); if(/^PRL[23]$/.test(v)) it.next=v; } saveInbox(I); refresh(); }
function dismissMail(id){ const I=inbox(); const it=I.find(x=>x.id===id); if(it){ it.status='ignorado'; saveInbox(I); refresh(); } }
function panelCartero(){
  const I=inbox(); const nuevos=I.filter(m=>m.status==='nuevo'); const hist=I.filter(m=>m.status!=='nuevo').slice(-4).reverse(); const m=mailCfg();
  let say;
  if(!gAccessToken) say='Conectá tu cuenta de Google y me pongo a revisar el correo.';
  else if(!mailReadOk()) say='Para leer los correos del revisor necesito un permiso nuevo de Gmail: leer y marcar como leído. Solo busco los correos del proyecto.';
  else if(mailBusy) say='Estoy revisando el correo…';
  else if(nuevos.length) say=`Traigo ${nuevos.length} correo${nuevos.length>1?'s':''}. Ya leí el texto y decidí si es revisión o versión final. Confirmá y lo subo a Drive tal cual viene.`;
  else say=`No hay correos nuevos. Busco los no leídos con adjunto y con «${esc(m.prefix||'—')}» y «${esc(m.prog)}» o «${esc(m.ficha)}» en el asunto.`;
  const opts=(it)=>`<select class="of-in" style="width:auto;padding:4px 8px;font-size:12px" onchange="Office.setMailKind('${it.id}',this.value)" aria-label="Qué hacer con el correo"><option value="PRL2"${!it.final&&it.next==='PRL2'?' selected':''}>Revisión → PRL2</option><option value="PRL3"${!it.final&&it.next==='PRL3'?' selected':''}>Revisión → PRL3</option><option value="final"${it.final?' selected':''}>Versión final</option></select>`;
  const card=it=>{ const c=courseBy(it.code); const b=busy['mail:'+it.id];
    return `<div class="of-item"><div class="t">${it.final?'<span class="of-tag fin">FINAL</span>':`<span class="of-tag rev">REVISIÓN${it.ram?' · RAM'+it.ram:''}</span>`}<span class="of-tag">${it.kind==='ficha'?'Ficha':'Programa'}</span> ${esc(it.code||'¿curso?')} ${esc(cName(c))}</div>
      <div class="m">${esc(it.subject)}<br>📎 ${esc(it.att.filename)}</div>
      ${it.snippet?`<div class="m" style="font-style:italic">«${esc(it.snippet.slice(0,160))}${it.snippet.length>160?'…':''}»</div>`:''}
      ${it.code?'':`<div class="of-warn">No reconocí el curso. Elegilo:</div><select class="of-in" onchange="Office.setMailCourse('${it.id}',this.value)"><option value="">Elegir curso…</option>${(allCourses||[]).map(x=>`<option value="${attr(x['Código'])}">${esc(x['Código'])} ${esc(cName(x))}</option>`).join('')}</select>`}
      <div class="of-row">${opts(it)}<button class="of-btn pri sm" ${b||!it.code?'disabled':''} onclick="Office.processMail('${it.id}')">${b?'Subiendo…':it.final?'Subir y cerrar como Final':'Subir a Drive'}</button><button class="of-btn sm" onclick="Office.dismissMail('${it.id}')" title="No es de este proyecto">Ignorar</button></div></div>`; };
  return head('cartero','Cartero','Correo del proyecto', say)
    + `<div class="of-row">${!gAccessToken?`<button class="of-btn pri" onclick="googleSignIn(()=>Office.checkMail())">Conectar Google</button>`:!mailReadOk()?`<button class="of-btn pri" onclick="Office.requestMail(()=>Office.checkMail())">Dar permiso de Gmail</button>`:`<button class="of-btn ink" ${mailBusy?'disabled':''} onclick="Office.checkMail()">Revisar el correo ahora</button>`}${nuevos.filter(x=>x.code).length>1?`<button class="of-btn pri" onclick="Office.processAll()">Subir todos</button>`:''}</div>`
    + (nuevos.length?`<div class="of-sec"><h4>Correos nuevos</h4>${nuevos.map(card).join('')}</div>`:'')
    + `<div class="of-note">Reglas: si el texto del correo dice «final», el documento sube como versión Final y actualiza el Maestro. Si no, es una revisión: un adjunto RAM1 lleva a PRL2 y uno RAM2 a PRL3. ${mailLast?'Última revisión: '+new Date(mailLast).toLocaleTimeString('es-CR',{hour:'2-digit',minute:'2-digit'})+'.':''}</div>`
    + (hist.length?`<div class="of-sec"><h4>Ya atendidos</h4>${hist.map(it=>`<div class="of-item"><div class="t">${esc(it.code)} · ${it.status==='ignorado'?'ignorado':it.final?'Final':it.next}</div><div class="m">${esc(it.att.filename)}</div></div>`).join('')}</div>`:'');
}

/* ---------- Corrector ---------- */
const FIX_PROMPT=f=>`Usá la skill pc-correcciones para atender los comentarios del revisor en el ${f.kind==='ficha'?'documento de la ficha':'programa'} de curso ${f.code} que te adjunto.

Devolveme el .docx corregido con el mismo formato de la plantilla, con los cambios resaltados en amarillo y los comentarios en su lugar.`;
const LEARN_PROMPT=f=>`Revisá las correcciones que hicimos en el ${f.kind==='ficha'?'documento de la ficha':'programa'} de curso ${f.code}: los comentarios del revisor y lo que cambiamos (resaltado en amarillo).

Decime qué aprendiste de estas correcciones: los patrones que se repiten, no los casos sueltos. Después proponé cómo mejorar las skills pc-* (la ficha, el programa completo y la sección que corresponda) para no repetir estos errores, con el texto exacto de cada regla nueva o cambiada listo para pegar en la skill.`;
function fixCopy(id){ const f=flows().find(x=>x.id===id); if(!f) return; const ok=copyText(FIX_PROMPT(f)); openClaude(); toast(ok?'✓ Instrucciones copiadas. Pegalas en Claude y adjuntá el documento que se está descargando.':'No pude copiar; abrí el panel y copiá el texto a mano', ok?'success':'error');
  run('dl:'+id, async()=>{ if(!ensureDrive(null)) return; const blob=await driveBlob(f.fileId); saveBlob(blob, f.fileName||(f.code+'.docx')); const F=flows(); const x=F.find(y=>y.id===id); if(x){ x.copied=true; saveFlows(F); } }); }
function fixDownload(id){ const f=flows().find(x=>x.id===id); if(!f) return; run('dl:'+id, async()=>{ if(!ensureDrive(()=>fixDownload(id))) return; saveBlob(await driveBlob(f.fileId), f.fileName||(f.code+'.docx')); }, ()=>fixDownload(id)); }
function fixUpload(id,file){ if(!file) return; run('up:'+id, async()=>{
  if(!/\.docx$/i.test(file.name)) throw new Error('Subí el Word (.docx) corregido');
  if(!ensureDrive(null)) return;
  const F=flows(); const f=F.find(x=>x.id===id); setCourse(f.code);
  const name=wordFileName(f.kind, f.next);
  const r=await driveReplace(f.fileId, file, name);
  f.fileName=r.name; f.link=r.webViewLink||f.link; f.stage='corregido'; f.fixedAt=Date.now(); saveFlows(F);
  toast(`✓ ${f.code}: el documento corregido reemplazó al de Drive (${r.name})`,'success');
}); }
function fixReview(id){ const f=flows().find(x=>x.id===id); if(!f) return; window.open(docLink(f.fileId,f.link),'_blank','noopener'); const F=flows(); const x=F.find(y=>y.id===id); if(x){ x.opened=true; x.openedAt=x.openedAt||Date.now(); saveFlows(F); refresh(); } }
function fixDone(id, redo){ run('done:'+id, async()=>{
  if(!ensureDrive(()=>fixDone(id,redo))) return;
  if(!mailWriteOk()){ toast('Gmail pide permiso para crear el borrador. Aceptá y sigo solo.',''); requestMail(()=>fixDone(id,redo)); return; }
  let F=flows(); let f=F.find(x=>x.id===id); setCourse(f.code);
  const {meta, blob}=await freshDoc(f.fileId, redo?0:(f.openedAt||f.fixedAt), f.code);
  const n=await syncFromBlob(blob);
  if(redo&&f.draftId) await dropDraft(f.draftId);
  const m=mailCfg(); const quien=m.name||'Ralph';
  const docTxt=f.kind==='ficha'?'la ficha de curso corregida':'el programa de curso corregido';
  const body=`Buen día, ${quien}. Muchísimas gracias. Le comparto ${docTxt} para su revisión, quedo atento a sus comentarios.\nSaludos cordiales,`;
  const subject=/^re:/i.test(f.subject)?f.subject:'Re: '+f.subject;
  const dr=await makeDraft({to:f.from, cc:m.cc, subject, body, fname:meta.name, blob, threadId:f.threadId, inReply:f.rfc, refs:f.refs}); const link=dr.link;
  F=flows(); f=F.find(x=>x.id===id); f.stage='enviado'; f.draft=link; f.draftId=dr.id; f.sentAt=Date.now(); f.savedAt=Date.parse(meta.modifiedTime)||Date.now(); f.fileName=meta.name; saveFlows(F);
  toast(`✓ Maestro actualizado (${n} campos) y respuesta lista en Gmail con la versión guardada a las ${hhmm(f.savedAt)}${redo?'. El borrador anterior se borró':''}`,'success'); floatTxt(9.5,.5,'Maestro ✓');
  window.open(link,'_blank','noopener');
}, ()=>fixDone(id)); }
function learnCopy(id){ const F=flows(); const f=F.find(x=>x.id===id); if(!f) return; const ok=copyText(LEARN_PROMPT(f)); openClaude(); f.learned=true; saveFlows(F); toast(ok?'✓ Prompt de aprendizaje copiado. Pegalo en la misma conversación de Claude.':'No pude copiar el texto', ok?'success':'error'); refresh(); }
function flowArchive(id){ const F=flows(); const f=F.find(x=>x.id===id); if(f){ f.stage=f.stage==='enviado'||f.stage==='final'?f.stage:'archivado'; f.archived=true; f.learned=true; saveFlows(F); refresh(); } }
function panelCorrector(){
  const F=flows().filter(f=>!f.archived&&f.stage!=='final'); const act=F.filter(f=>f.stage!=='enviado'); const sent=F.filter(f=>f.stage==='enviado');
  const say=act.length?`Tengo ${act.length===1?'un documento':act.length+' documentos'} con comentarios del revisor. Te guío paso a paso.`:sent.some(f=>!f.learned)?'Ya respondimos al revisor. Si querés, le pedimos a Claude que resuma lo aprendido para mejorar las skills.':'Sin correcciones pendientes. Cuando el Cartero suba un documento con comentarios, te aviso.';
  const card=f=>{ const c=courseBy(f.code); const st=['comentado','corregido','enviado'].indexOf(f.stage); const B=k=>busy[k+':'+f.id];
    const dn=[!!f.copied||st>=1, st>=1, st>=1&&!!f.opened, st>=2]; const now=dn.indexOf(false);
    const li=(i,lbl,sm,btns)=>`<li class="${dn[i]?'done':now===i?'now':''}"><span class="n">${i+1}</span><div class="lbl">${lbl}${sm?`<small>${sm}</small>`:''}${btns?`<div class="of-row">${btns}</div>`:''}</div></li>`;
    return `<div class="of-item"><div class="t"><span class="of-tag rev">${esc(f.next)}</span><span class="of-tag">${f.kind==='ficha'?'Ficha':'Programa'}</span> ${esc(f.code)} ${esc(cName(c))}</div><div class="m">📄 ${esc(f.fileName||'')}</div>
      <ol class="of-steps">
        ${li(0,'Corregir con Claude','Copio las instrucciones, abro Claude y descargo el documento con los comentarios para que lo adjuntés.',`<button class="of-btn pri sm" onclick="Office.fixCopy('${f.id}')">Copiar instrucciones y abrir Claude</button><button class="of-btn sm" ${B('dl')?'disabled':''} onclick="Office.fixDownload('${f.id}')">Solo descargar</button>`)}
        ${li(1,'Subir el Word corregido',st>=1?'Listo: ya reemplazó al de Drive. Podés subir otro si Claude lo vuelve a corregir.':'Lo subo a Drive en el mismo archivo, con el nombre de la versión '+f.next+'.',`<label class="of-drop" data-drop="${f.id}">${B('up')?'Subiendo…':'Soltá aquí el .docx o tocá para elegirlo'}<input type="file" accept=".docx" onchange="Office.fixUpload('${f.id}',this.files[0]);this.value=''"></label>`)}
        ${li(2,'Revisar en Google Docs','Corregí ahí lo que haga falta. La app ya no edita el texto.',st>=1?`<button class="of-btn sm ink" onclick="Office.fixReview('${f.id}')">Abrir en Drive</button>`:'')}
        ${li(3,'Está revisado','Primero cerrá la pestaña de Google Docs para que guarde tus últimos cambios. Espero a que Drive termine, actualizo el Maestro y dejo en Gmail la respuesta al revisor con el documento adjunto.',st>=1?`<button class="of-btn pri sm" ${B('done')?'disabled':''} onclick="Office.fixDone('${f.id}')">${B('done')?'Trabajando…':'Está revisado'}</button>`:'')}
      </ol><div class="of-row" style="justify-content:flex-end"><button class="of-btn sm" onclick="Office.flowArchive('${f.id}')">Archivar</button></div></div>`; };
  return head('corrector','Corrector','Comentarios del revisor', say)
    + (act.length?`<div class="of-sec"><h4>En corrección</h4>${act.map(card).join('')}</div>`:'')
    + (sent.length?`<div class="of-sec"><h4>Respondidos</h4>${sent.slice(-5).reverse().map(f=>`<div class="of-item"><div class="t">${esc(f.code)} · ${esc(f.next)} <span class="of-tag fin">respuesta en Gmail</span></div><div class="m">${f.draft?`<a href="${attr(f.draft)}" target="_blank" rel="noopener">Abrir el borrador</a> · `:''}<a href="${attr(docLink(f.fileId,f.link))}" target="_blank" rel="noopener">Ver en Drive</a>${f.savedAt?`<br>Adjunto: versión guardada a las ${hhmm(f.savedAt)}`:''}</div><div class="of-row"><button class="of-btn sm" ${busy['done:'+f.id]?'disabled':''} onclick="Office.fixDone('${f.id}',true)" title="Borra el borrador anterior, vuelve a leer Drive, actualiza el Maestro y crea la respuesta de nuevo">${busy['done:'+f.id]?'Trabajando…':'Rehacer con lo último de Drive'}</button><button class="of-btn sm ${f.learned?'':'pri'}" onclick="Office.learnCopy('${f.id}')">${f.learned?'Copiar de nuevo lo aprendido':'¿Qué aprendimos? Copiar prompt'}</button><button class="of-btn sm" onclick="Office.flowArchive('${f.id}')">Archivar</button></div></div>`).join('')}</div>`:'');
}
function wireDrops(){ panel.querySelectorAll('[data-drop]').forEach(el=>{ const id=el.dataset.drop; el.ondragover=e=>{ e.preventDefault(); el.classList.add('over'); }; el.ondragleave=()=>el.classList.remove('over'); el.ondrop=e=>{ e.preventDefault(); el.classList.remove('over'); const f=e.dataTransfer.files[0]; if(el.dataset.kind) nuevoFile(el.dataset.kind,f); else fixUpload(id,f); }; }); }

/* ---------- Programadora y Fichero ---------- */
function nuevoPick(kind,code){ panel.innerHTML=''; const J=jobs(); J[kind]={code,stage:'prompt',t:Date.now()}; saveJobs(J); refresh(); }
function nuevoPrompt(kind){ const j=jobs()[kind]; if(!j) return; try{ setCourse(j.code); }catch(e){ toast(e.message,'error'); return; } const txt=kind==='programa'?buildProgramaPrompt():buildFichaPrompt(); const ok=copyText(txt); openClaude(); toast(ok?'✓ Prompt copiado. Pegalo en Claude y traé el JSON que te devuelva.':'No pude copiar el prompt', ok?'success':'error'); const J=jobs(); J[kind].copied=true; saveJobs(J); refresh(); }
function nuevoImport(kind){ const ta=document.getElementById('of-json-'+kind); const text=(ta?.value||pendingJSON[kind]||'').trim(); pendingJSON[kind]=text; run('imp:'+kind, async()=>{
  if(!text) throw new Error('Pegá la respuesta de Claude primero');
  if(!ensureDrive(()=>nuevoImport(kind))) { pendingJSON[kind]=text; return; }
  const J=jobs(); const j=J[kind]; setCourse(j.code);
  const data=extractJSONBlock(text);
  if(data.codigo&&normCode(data.codigo)!==normCode(j.code)) throw new Error(`La respuesta es de ${data.codigo}, no de ${j.code}`);
  const items=kind==='ficha'?fichaToItems(data):programaToItems(data);
  if(!items.filter(i=>i.secId).length) throw new Error('El bloque no trae campos para importar');
  const n=applyItems(items); await writeMaestro();
  if(kind==='programa'&&!localStorage.getItem('dcd_ver_'+j.code)) setVersion('PRL1');
  const r=await uploadKind(kind);
  j.stage='subido'; j.fileId=r.file.id; j.link=r.file.webViewLink||''; j.t=Date.now(); j.fields=n; saveJobs(J); pendingJSON[kind]='';
  toast(`✓ ${j.code}: ${n} campos al Maestro y ${kind==='ficha'?'la ficha':'el programa'} en Drive`,'success'); floatTxt(9.5,.5,'Maestro ✓');
}, ()=>nuevoImport(kind)); }
const pendingJSON={};
async function nuevoFile(kind,file){ if(!file) return; const t=await file.text().catch(()=>''); const ta=document.getElementById('of-json-'+kind); if(ta){ ta.value=t; pendingJSON[kind]=t; } }
async function uploadKind(kind){
  const folder=folderOf(kind); if(!folder) throw new Error(`El proyecto no tiene la carpeta de ${kind==='ficha'?'fichas':'programas'} en Drive. Agregala en la pizarra (Ajustes).`);
  const o=headlessWordOpts();
  try{ const fromM=await savedFromMaestroRow(); if(fromM){ const m=Object.assign({},o.saved); Object.entries(fromM).forEach(([k,v])=>{ if(String(v||'').trim()&&!String(m[k]||'').trim()) m[k]=v; }); o.saved=m; } }catch(e){}
  const blob=await buildDocx(kind,{escuela:o.escuela,carrera:o.carrera,carrera2:o.carrera2,saved:o.saved,highlight:o.highlight});
  return driveUploadDocx(blob, wordFileName(kind,o.ver), folder, kind);
}
function nuevoOpen(kind){ const j=jobs()[kind]; if(j?.fileId) window.open(docLink(j.fileId,j.link),'_blank','noopener'); const J=jobs(); if(J[kind]){ J[kind].opened=true; J[kind].openedAt=J[kind].openedAt||Date.now(); saveJobs(J); refresh(); } }
function nuevoMail(kind, redo){ run('mail:'+kind, async()=>{
  if(!ensureDrive(()=>nuevoMail(kind,redo))) return;
  if(!mailWriteOk()){ toast('Gmail pide permiso para crear el borrador. Aceptá y sigo solo.',''); requestMail(()=>nuevoMail(kind,redo)); return; }
  let J=jobs(); let j=J[kind]; const c=setCourse(j.code); const m=mailCfg();
  const toEl=document.getElementById('of-to-'+kind); const to=(toEl?.value||m.to).trim();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to.split(',')[0].trim())) throw new Error('Escribí el correo del revisor');
  if(to!==P().mailTo){ P().mailTo=to; saveProjects(); }
  const {meta, blob}=await freshDoc(j.fileId, redo?0:(j.openedAt||j.t), j.code);
  const n=await syncFromBlob(blob);
  if(redo&&j.draftId) await dropDraft(j.draftId);
  let body=gmBodyText(m.name); if(kind==='ficha') body=body.replace('el programa de curso en mención','la ficha de curso en mención');
  const subject=`${m.prefix?m.prefix+' | ':''}${kind==='ficha'?m.ficha:m.prog} ${j.code} ${cName(c)}`.trim();
  const dr=await makeDraft({to, cc:m.cc, subject, body, fname:meta.name, blob}); const link=dr.link;
  if(!redo){ gmRot++; try{ localStorage.setItem('dcd_mail_rot',String(gmRot)); }catch(e){} }
  J=jobs(); j=J[kind]; j.stage='enviado'; j.draft=link; j.draftId=dr.id; j.savedAt=Date.parse(meta.modifiedTime)||Date.now(); saveJobs(J);
  toast(`✓ Maestro al día (${n} campos) y correo nuevo listo en Gmail con la versión guardada a las ${hhmm(j.savedAt)}`,'success'); window.open(link,'_blank','noopener');
}, ()=>nuevoMail(kind)); }
function nuevoReset(kind){ panel.innerHTML=''; const J=jobs(); delete J[kind]; saveJobs(J); pendingJSON[kind]=''; refresh(); }
function panelNuevo(kind){
  const isP=kind==='programa'; const j=jobs()[kind]; const who=isP?'Programadora':'Fichero'; const B=k=>busy[k+':'+kind];
  if(!j) return head(kind,who,isP?'Programas de curso nuevos':'Fichas de curso nuevas', isP?'Elegí el curso y te doy el prompt del programa completo. Conviene que la ficha ya esté aprobada.':'Elegí el curso y te doy el prompt de la ficha. Antes, la Recepcionista tiene que recibir el esbozo del experto (XLSX).')
    + `<div class="of-sec"><h4>Elegí un curso</h4>${picker('nv-'+kind, code=>nuevoPick(kind,code), c=>{ const st=courseStage(savedForCourse(c)); return isP?!st.programa:!st.ficha; })}<div class="of-note">Se muestran los cursos que todavía no tienen ${isP?'programa':'ficha'}. <a href="#" onclick="Office.showAllPick('${kind}');return false">Ver todos</a></div></div>`;
  const c=courseBy(j.code); const s=c?savedForCourse(c):{}; const st=['prompt','subido','enviado'].indexOf(j.stage);
  let warn='';
  if(isP){ try{ const miss=fichaMissing(s); if(miss.length) warn=`La ficha todavía no tiene: ${esc(miss.join(', '))}. Claude trabajará con lo que haya.`; }catch(e){} }
  else if(!s._esbozo) warn='Este curso todavía no tiene el esbozo del experto. Pasá primero por la Recepcionista para subir el XLSX.';
  const dn=[!!j.copied||st>=1, st>=1, st>=1&&!!j.opened, st>=2]; const now=dn.indexOf(false);
  const li=(i,lbl,sm,body)=>`<li class="${dn[i]?'done':now===i?'now':''}"><span class="n">${i+1}</span><div class="lbl">${lbl}${sm?`<small>${sm}</small>`:''}${body?`<div>${body}</div>`:''}</div></li>`;
  return head(kind,who,isP?'Programa nuevo':'Ficha nueva', j.stage==='subido'?`${esc(j.code)} ya está en Drive. Revisalo en Google Docs y avisame cuando esté listo para enviarlo.`:j.stage==='enviado'?'Listo. El correo para el revisor quedó en tus borradores de Gmail.':`Trabajemos ${isP?'el programa':'la ficha'} de ${esc(j.code)}.`)
    + `<div class="of-item"><div class="t">${esc(j.code)} ${esc(cName(c))}</div><div class="m">${c?chips(c):''}</div>${warn?`<div class="of-warn">${warn}${!isP&&!s._esbozo?` <a href="#" onclick="Office.openPanel('recepcion');return false">Ir a la Recepcionista</a>`:''}</div>`:''}
      <ol class="of-steps">
        ${li(0,'Copiar el prompt y abrir Claude','',`<div class="of-row"><button class="of-btn pri sm" onclick="Office.nuevoPrompt('${kind}')">${j.copied?'Copiar de nuevo':'Copiar prompt y abrir Claude'}</button></div>`)}
        ${li(1,'Pegar la respuesta de Claude','Pegá el bloque JSON. Lo guardo en el Maestro y genero el Word en Drive.',st===0?`<textarea class="of-ta" id="of-json-${kind}" placeholder="Pegá aquí la respuesta completa o solo el bloque JSON">${esc(pendingJSON[kind]||'')}</textarea><label class="of-drop" data-drop="x" data-kind="${kind}" style="padding:8px">o soltá un archivo .json o .txt<input type="file" accept=".json,.txt,.md" onchange="Office.nuevoFile('${kind}',this.files[0]);this.value=''"></label><div class="of-row"><button class="of-btn ink sm" ${B('imp')?'disabled':''} onclick="Office.nuevoImport('${kind}')">${B('imp')?'Guardando y subiendo…':'Guardar en el Maestro y subir a Drive'}</button></div>`:'')}
        ${li(2,'Revisar en Google Docs','La app ya no edita el texto: corregí en Drive.',st>=1?`<div class="of-row"><button class="of-btn ink sm" onclick="Office.nuevoOpen('${kind}')">Abrir en Drive</button></div>`:'')}
        ${li(3,'Todo listo','Cerrá la pestaña de Google Docs para que guarde tus últimos cambios. Espero a que Drive termine, actualizo el Maestro y preparo un correo nuevo para el revisor.',st===1?`<label class="of-lb" for="of-to-${kind}">Para</label><input class="of-in" id="of-to-${kind}" value="${attr(mailCfg().to)}" placeholder="correo del revisor"><div class="of-row"><button class="of-btn pri sm" ${B('mail')?'disabled':''} onclick="Office.nuevoMail('${kind}')">${B('mail')?'Trabajando…':'Está revisado, preparar correo'}</button></div>`:st===2&&j.draft?`<div class="of-note" style="margin-top:2px">Se adjuntó la versión guardada en Drive a las ${j.savedAt?hhmm(j.savedAt):'—'}.</div><div class="of-row"><a class="of-btn sm" href="${attr(j.draft)}" target="_blank" rel="noopener">Abrir el borrador</a><button class="of-btn sm" ${B('mail')?'disabled':''} onclick="Office.nuevoMail('${kind}',true)" title="Borra el borrador anterior y crea otro con lo último de Drive">Rehacer con lo último de Drive</button></div>`:'')}
      </ol></div>
      <div class="of-row"><button class="of-btn sm" onclick="Office.nuevoReset('${kind}')">${j.stage==='enviado'?'Terminar y elegir otro curso':'Cambiar de curso'}</button></div>`;
}
function showAllPick(kind){ const el=panel.querySelector('.of-sec'); if(!el) return; el.innerHTML=`<h4>Todos los cursos</h4>${picker('nva-'+kind, code=>nuevoPick(kind,code))}`; }

/* ---------- Recepcionista ---------- */
function recepPick(code){ try{ setCourse(code); }catch(e){ toast(e.message,'error'); return; }
  window.__ofHook=(items)=>{ run('esb', async()=>{ const n=applyItems(items); toast(`✓ Esbozo de ${currentCourse['Código']} guardado (${n} campos)`,'success'); if(gAccessToken){ await writeMaestro(); toast('✓ Esbozo también en el Maestro','success'); } const r=personByK('recepcion'); if(r){ r.bub='ok'; r.bubT=2; } }); };
  openEsbozo(); }
function panelRecepcion(){
  const list=(allCourses||[]); const con=list.filter(c=>savedForCourse(c)._esbozo).length;
  return head('recepcion','Recepcionista','Esbozos del experto', `Traeme el Excel del experto (una hoja por curso). Elegí el curso, cargo el XLSX, busco su hoja y guardo temario, evaluación, bibliografía e insumos en el Maestro. Así el Fichero ya puede hacer la ficha.`)
    + `<div class="of-note">${con} de ${list.length} cursos ya tienen esbozo. ${esbozoWB?`Tengo cargado <strong>${esc(esbozoFileName)}</strong>: para otro curso del mismo Excel no hace falta subirlo de nuevo.`:''}</div>`
    + `<div class="of-sec"><h4>Elegí el curso</h4>${picker('rc', recepPick)}</div>`;
}

/* ---------- Bibliotecaria ---------- */
let biblioCode='';
function biblioPick(code){ biblioCode=code; panel.innerHTML=''; refresh(); }
// Guarda la bibliografía de un curso en el Maestro y, si se pide, también en su programa de Drive
async function biblioApply(code, ob, co, upd){
  setCourse(code);
  const sid=P().sheetId; maestroData[sid]=maestroData[sid]||{}; const s=maestroData[sid][code]=maestroData[sid][code]||{};
  let fileId=''; try{ fileId=localStorage.getItem(driveFileKey('programa'))||''; }catch(e){}
  if(upd&&folderOf('programa')){ const f=await driveFindCourseFile(folderOf('programa'),'programa'); if(f){ fileId=f.id; await syncFromBlob(await driveBlob(f.id),['biblio_ob','biblio_co']); } }
  s.biblio_ob=ob; s.biblio_co=co; localStorage.setItem('dcd_maestro',JSON.stringify(maestroData)); autoBackup();
  await writeMaestro();
  if(upd&&fileId&&hasProgramSection(currentSaved())){ await uploadKind('programa'); return 'drive'; }
  return 'maestro';
}
function biblioSave(){ const ob=document.getElementById('of-bob').value.trim(), co=document.getElementById('of-bco').value.trim(), upd=document.getElementById('of-bdrv').checked; run('bib', async()=>{
  if(needGoogle(null)) return; if(upd&&!ensureDrive(null)) return;
  const code=biblioCode; const w=await biblioApply(code, ob, co, upd);
  toast(w==='drive'?`✓ Bibliografía de ${code} en el Maestro y en el programa de Drive`:`✓ Bibliografía de ${code} guardada en el Maestro`,'success');
  const b=personByK('biblio'); if(b){ b.bub='ok'; b.bubT=2; }
}); }

/* Varios cursos a la vez, con un JSON */
let bibImp=null;   // {items:[{code,name,ob,co,status,on}], sinCurso, mode, err, prog}
const bibKey=x=>String(x||'').replace(/[\s-]+/g,'').toUpperCase();
function bibLines(v){ const arr=Array.isArray(v)?v:String(v||'').split(/\n+/);
  const out=[]; arr.forEach(x=>{ let t=String(typeof x==='object'&&x?(x.referencia||x.apa||x.texto||''):x||'').replace(/\s+/g,' ').trim(); t=t.replace(/^(\d+[.)]|[-–•*·])\s+/,''); if(t&&!out.includes(t)) out.push(t); }); return out; }
function bibPick(o,keys){ for(const k of keys){ if(o[k]!=null) return o[k]; } const lk=Object.keys(o).find(k=>keys.includes(normTxt(k).replace(/\s+/g,'_'))); return lk?o[lk]:undefined; }
function bibParse(txt){
  let t=String(txt||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'');
  const data=JSON.parse(t);
  let list=Array.isArray(data)?data:Array.isArray(data.cursos)?data.cursos:Array.isArray(data.courses)?data.courses:null;
  if(!list&&data&&typeof data==='object') list=Object.entries(data).filter(([k,v])=>v&&typeof v==='object'&&!Array.isArray(v)).map(([k,v])=>Object.assign({codigo:k},v));
  if(!list) throw new Error('No encontré la lista de cursos. Revisá que tenga la forma del ejemplo.');
  const items=list.map(o=>{
    const code=String(bibPick(o,['codigo','código','code','Código','curso_codigo'])||'').trim();
    const name=String(bibPick(o,['nombre','name','curso','Nombre'])||'').trim();
    const ob=bibLines(bibPick(o,['obligatoria','bibliografia_obligatoria','obligatorias','required'])), co=bibLines(bibPick(o,['complementaria','bibliografia_complementaria','complementarias','optional']));
    let c=code?(allCourses||[]).find(x=>bibKey(x['Código'])===bibKey(code)):null;
    if(!c&&name) c=(allCourses||[]).find(x=>normTxt(cName(x))===normTxt(name));
    return {code:c?c['Código']:code, name:c?cName(c):name, ob, co, found:!!c, on:!!c&&(ob.length+co.length>0)};
  });
  return {items, sinCurso:bibLines(data.sin_curso||[]).length};
}
function bibMerge(oldTxt, add, mode){ if(mode==='replace') return add.join('\n'); const cur=bibLines(oldTxt); add.forEach(x=>{ if(!cur.some(y=>normTxt(y)===normTxt(x))) cur.push(x); }); return cur.join('\n'); }
function bibStatus(it){ if(!it.found) return ['no','No está en la hoja Base']; if(!it.ob.length&&!it.co.length) return ['no','Sin referencias'];
  const s=savedForCourse(courseBy(it.code)); const mode=bibImp?.mode||'replace';
  const nob=bibMerge(s.biblio_ob,it.ob,mode), nco=bibMerge(s.biblio_co,it.co,mode);
  if(nob===String(s.biblio_ob||'').trim()&&nco===String(s.biblio_co||'').trim()) return ['igual','Ya está igual'];
  return String(s.biblio_ob||s.biblio_co||'').trim()?['cambia','Cambia lo que tiene']:['nuevo','Nueva']; }
function biblioCheck(){ const t=document.getElementById('of-bjson')?.value||''; if(!t.trim()){ toast('Pegá el JSON o elegí el archivo','error'); return; }
  try{ const r=bibParse(t); bibImp={items:r.items, sinCurso:r.sinCurso, mode:bibImp?.mode||'replace'}; bibImp.items.forEach(it=>{ if(bibStatus(it)[0]==='igual') it.on=false; }); }
  catch(e){ bibImp={items:[], err:/JSON|token|Unexpected/i.test(e.message)?'El texto no es un JSON válido. Copiá la respuesta completa de Claude, desde la primera llave hasta la última.':e.message, mode:bibImp?.mode||'replace'}; }
  refresh(); }
function biblioFile(inp){ const f=inp.files&&inp.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ const ta=document.getElementById('of-bjson'); if(ta) ta.value=String(r.result||''); biblioCheck(); }; r.readAsText(f); inp.value=''; }
function biblioToggle(i,on){ if(bibImp&&bibImp.items[i]) bibImp.items[i].on=on; refresh(); }
function biblioMode(m){ if(bibImp){ bibImp.mode=m; bibImp.items.forEach(it=>{ if(it.found) it.on=bibStatus(it)[0]!=='igual'&&(it.ob.length+it.co.length>0); }); } refresh(); }
function biblioReset(){ bibImp=null; const ta=document.getElementById('of-bjson'); if(ta) ta.value=''; refresh(); }
function biblioPrompt(){
  const list=orderedCourses().map(({c})=>`${c['Código']} · ${cName(c)}`).join('\n');
  const ej=orderedCourses().slice(0,1).map(({c})=>({codigo:c['Código'],nombre:cName(c),obligatoria:['Apellido, N. (Año). Título del libro (ed.). Editorial.'],complementaria:[]}));
  return `Necesito ordenar la bibliografía de los cursos del plan «${P()?.name||''}» en un JSON para importarla en mi app.

Te paso las referencias al final de este mensaje o en los archivos adjuntos. Organizalas por curso usando exactamente estos códigos:
${list}

Reglas:
- Usá solo las referencias que te paso. No inventés libros ni completés datos que no aparezcan.
- Cada referencia va completa en formato APA 7, como un solo texto, sin numeración ni viñetas.
- Separá la bibliografía obligatoria de la complementaria. Si no se indica, dejala como obligatoria.
- Si una referencia no corresponde a ningún código de la lista, ponela en "sin_curso".
- Respondé solo con el JSON, sin texto antes ni después.

Formato:
${JSON.stringify({cursos:ej.length?ej:[{codigo:'SOFT-01',nombre:'Nombre del curso',obligatoria:['Apellido, N. (Año). Título del libro (ed.). Editorial.'],complementaria:[]}], sin_curso:[]},null,2)}

REFERENCIAS:
[pegá aquí la bibliografía]`;
}
function biblioCopyPrompt(){ copyText(biblioPrompt()); toast('✓ Prompt copiado. Pegalo en Claude junto con la bibliografía','success'); }
function biblioExport(){ const cursos=orderedCourses().map(({c})=>{ const s=savedForCourse(c); return {codigo:c['Código'], nombre:cName(c), obligatoria:bibLines(s.biblio_ob), complementaria:bibLines(s.biblio_co)}; });
  saveBlob(new Blob([JSON.stringify({cursos},null,2)],{type:'application/json'}), `Bibliografía ${P()?.name||''}.json`.replace(/[\\/:*?"<>|]+/g,'')); }
function biblioImport(){ const sel=(bibImp?.items||[]).filter(it=>it.on&&it.found); if(!sel.length){ toast('Marcá al menos un curso','error'); return; }
  const upd=!!document.getElementById('of-bidrv')?.checked;
  run('bibimp', async()=>{
    if(needGoogle(null)) return; if(upd&&!ensureDrive(null)) return;
    const mode=bibImp.mode, errs=[]; let n=0, d=0;
    for(const it of sel){ bibImp.prog=`Guardando ${n+1} de ${sel.length}: ${it.code}`; refresh();
      try{ const s=savedForCourse(courseBy(it.code)); const w=await biblioApply(it.code, bibMerge(s.biblio_ob,it.ob,mode), bibMerge(s.biblio_co,it.co,mode), upd); n++; if(w==='drive') d++; it.on=false; it.done=true; }
      catch(e){ if(e.status===401||e.scope) throw e; errs.push(`${it.code}: ${e.message}`); } }
    bibImp.prog=''; bibImp.result={n, d, errs};
    toast(errs.length?`Guardé ${n} de ${sel.length} cursos. Revisá los que fallaron.`:`✓ Bibliografía de ${n} curso${n===1?'':'s'} en el Maestro`, errs.length?'error':'success');
    const b=personByK('biblio'); if(b){ b.bub='ok'; b.bubT=2; }
  });
}
function biblioBulkSection(){
  const I=bibImp, B=busy.bibimp;
  let h=`<div class="of-sec"><h4>Varios cursos a la vez</h4>
    <div class="of-note" style="margin-top:0">Copiá el prompt, pegalo en Claude con toda la bibliografía y pegá aquí el JSON que te devuelva.</div>
    <div class="of-row"><button class="of-btn pri sm" onclick="Office.biblioCopyPrompt()">Copiar el prompt para Claude</button><button class="of-btn sm" onclick="Office.biblioExport()" title="Sirve de ejemplo y de respaldo">Descargar la actual (JSON)</button></div>
    <label class="of-lb" for="of-bjson">JSON de Claude</label><textarea class="of-ta" id="of-bjson" placeholder='{ "cursos": [ { "codigo": "SOFT-01", "obligatoria": ["…"], "complementaria": [] } ] }'></textarea>
    <div class="of-row"><button class="of-btn sm" onclick="Office.biblioCheck()">Revisar</button><button class="of-btn sm" onclick="this.nextElementSibling.click()">Abrir un archivo .json</button><input type="file" accept=".json,application/json,.txt" hidden onchange="Office.biblioFile(this)">${I?`<button class="of-btn sm" onclick="Office.biblioReset()">Limpiar</button>`:''}</div>`;
  if(I&&I.err) h+=`<div class="of-warn">${esc(I.err)}</div>`;
  if(I&&I.items.length){
    const sel=I.items.filter(it=>it.on&&it.found).length;
    h+=`<div class="of-row"><button class="of-btn sm ${I.mode==='replace'?'ink':''}" aria-pressed="${I.mode==='replace'}" onclick="Office.biblioMode('replace')">Reemplazar lo que hay</button><button class="of-btn sm ${I.mode==='add'?'ink':''}" aria-pressed="${I.mode==='add'}" onclick="Office.biblioMode('add')">Agregar sin repetir</button></div>
      <div style="margin-top:8px">${I.items.map((it,i)=>{ const [st,lbl]=it.done?['ok','Guardada']:bibStatus(it); return `<label class="of-item" style="display:flex;gap:10px;align-items:flex-start;cursor:${it.found?'pointer':'default'};${it.found?'':'opacity:.6'}"><input type="checkbox" ${it.on?'checked':''} ${it.found&&!it.done?'':'disabled'} onchange="Office.biblioToggle(${i},this.checked)" style="margin-top:3px"><span style="flex:1;min-width:0"><span class="t" style="display:block">${esc(it.code||'(sin código)')} ${esc(it.name)}</span><span class="m">${it.ob.length} obligatoria${it.ob.length===1?'':'s'} y ${it.co.length} complementaria${it.co.length===1?'':'s'} · ${lbl}</span></span></label>`; }).join('')}</div>
      ${I.sinCurso?`<div class="of-note">${I.sinCurso===1?'Una referencia quedó':I.sinCurso+' referencias quedaron'} sin curso en el JSON. Esas no se importan.</div>`:''}
      <label style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;margin-top:10px"><input type="checkbox" id="of-bidrv" checked> <span>Actualizar también los programas en Drive. Antes leo cada documento para no perder lo que corregiste ahí.</span></label>
      <div class="of-row"><button class="of-btn pri" ${B||!sel?'disabled':''} onclick="Office.biblioImport()">${B?esc(I.prog||'Guardando…'):`Importar ${sel} curso${sel===1?'':'s'}`}</button></div>`;
    if(I.result) h+=`<div class="of-note">✓ ${I.result.n} curso${I.result.n===1?'':'s'} en el Maestro${I.result.d?`, ${I.result.d} también en Drive`:''}.${I.result.errs.length?'<br>⚠ '+I.result.errs.map(esc).join('<br>⚠ '):''}</div>`;
  }
  return h+'</div>';
}
function panelBiblio(){
  if(!biblioCode) return head('biblio','Bibliotecaria','Bibliografía de los cursos','Puedo cargar la bibliografía de un curso o de todos a la vez. Las referencias van en APA, una por línea.')+biblioBulkSection()+`<div class="of-sec"><h4>Un solo curso</h4>${picker('bb', biblioPick)}</div>`;
  const c=courseBy(biblioCode); const s=c?savedForCourse(c):{};
  return head('biblio','Bibliotecaria','Bibliografía', `Referencias de <strong>${esc(biblioCode)}</strong> ${esc(cName(c))}. Una por línea.`)
    + `<label class="of-lb" for="of-bob">Bibliografía obligatoria</label><textarea class="of-ta" id="of-bob" style="font-family:inherit">${esc(s.biblio_ob||'')}</textarea>
       <label class="of-lb" for="of-bco">Bibliografía complementaria</label><textarea class="of-ta" id="of-bco" style="font-family:inherit">${esc(s.biblio_co||'')}</textarea>
       <label style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;margin-top:10px"><input type="checkbox" id="of-bdrv" checked> <span>Actualizar también el programa en Drive. Antes leo el documento de Drive para no perder lo que corregiste ahí.</span></label>
       <div class="of-row"><button class="of-btn pri" ${busy.bib?'disabled':''} onclick="Office.biblioSave()">${busy.bib?'Guardando…':'Guardar en el Maestro'}</button><button class="of-btn" onclick="Office.biblioPick('')">Otro curso</button></div>`;
}

/* ---------- Diseñador: malla curricular en draw.io ---------- */
// Motor: columnas por cuatrimestre, flechas por los pasillos (nunca sobre una cajita) y un carril propio para cada flecha
const MALLA_FILL=[['#e8f1fd','#6c8ebf'],['#e7f5ea','#5d9b6a'],['#f3ecfa','#8f6db5'],['#fff4d6','#c9a227'],['#fde9e4','#c66b55'],['#e3f4f3','#3f9a92'],['#fbe9f1','#c0628a'],['#eef0f3','#7b8594'],['#f1f6dc','#8aa23a'],['#e6eefc','#4e6fc7']];
const MALLA_EDGE=['#2f6fd0','#d0532f','#2e9c6a','#8a4fc0','#c99512','#13958c','#c33f7a','#5b6b80','#7c9a18','#b8562b','#3d4fb8','#a0306f'];
function mallaCfg(){ try{ return Object.assign({car:'',orient:'LR',color:'area',edges:'color',cred:true}, JSON.parse(localStorage.getItem('dcd_malla')||'{}')); }catch(e){ return {car:'',orient:'LR',color:'area',edges:'color',cred:true}; } }
function mallaSave(c){ try{ localStorage.setItem('dcd_malla',JSON.stringify(c)); }catch(e){} }
const mTok=t=>String(t||'').toUpperCase().split(/[,;\/]|\sY\s/).map(x=>x.trim()).filter(Boolean);
function mallaSiglas(){ const s=new Set(); (allCourses||[]).forEach(c=>mTok(c['Carrera']).forEach(x=>s.add(x))); return [...s].sort(); }
function mallaCourses(car){
  const all=(allCourses||[]).filter(c=>String(c['Código']||'').trim());
  const pick=all.filter(c=>{ if(!car) return true; const t=mTok(c['Carrera']); return !t.length || t.includes(car); });
  const codes=pick.map(c=>String(c['Código']).trim()); const allCodes=all.map(c=>String(c['Código']).trim());
  const rx=code=>new RegExp('(^|[^A-Z0-9-])'+code.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![0-9A-Z])');
  let fuera=0;
  const list=pick.map(c=>{ const req=String(c['Requisitos']||'').toUpperCase(); const lv=coursePeriod(c, savedForCourse(c));
    const pre=codes.filter(k=>k!==c['Código'] && rx(k).test(req));
    fuera+=allCodes.filter(k=>!codes.includes(k) && rx(k).test(req)).length;
    return {id:String(c['Código']).trim(), name:cName(c), level:lv==null?98:lv, credits:String(c['Créditos']||'').trim(), pre, area:String(savedForCourse(c)._area||'').trim()}; });
  return {list, fuera};
}
function mallaLayout(courses, o){
  const LR=o.orient!=='TB';
  const BA=LR?190:96, BC=LR?84:170;          // tamaño de la caja: a lo largo de los cuatrimestres y a lo ancho
  const byL={}; courses.forEach(c=>(byL[c.level]=byL[c.level]||[]).push(c));
  const levels=Object.keys(byL).map(Number).sort((a,b)=>a-b); const colOf={}, rowOf={};
  levels.forEach((lv,k)=>{ byL[lv].sort((a,b)=>a.id.localeCompare(b.id,'es',{numeric:true})); byL[lv].forEach((c,i)=>{ colOf[c.id]=k; rowOf[c.id]=i; }); });
  // Orden de cada columna por baricentro (menos cruces)
  const succ={}; courses.forEach(c=>c.pre.forEach(p=>(succ[p]=succ[p]||[]).push(c.id)));
  for(let it=0;it<4;it++){
    const seq=it%2?levels.slice().reverse():levels;
    seq.forEach(lv=>{ const L=byL[lv]; const nb=c=>{ const ns=(it%2?(succ[c.id]||[]):c.pre).filter(x=>rowOf[x]!=null); return ns.length?ns.reduce((s,x)=>s+rowOf[x],0)/ns.length:rowOf[c.id]; };
      const key=new Map(L.map(c=>[c.id,nb(c)])); L.sort((a,b)=>key.get(a.id)-key.get(b.id)||rowOf[a.id]-rowOf[b.id]); L.forEach((c,i)=>rowOf[c.id]=i); });
  }
  const nCols=levels.length, nRows=Math.max(1,...levels.map(l=>byL[l].length));
  // Aristas válidas
  const E=[]; courses.forEach(t=>t.pre.forEach(s=>{ if(colOf[s]!=null) E.push({s, t:t.id}); }));
  // Puertos: salidas por la derecha (o abajo) y entradas por la izquierda (o arriba), repartidos
  const outs={}, ins={}; E.forEach(e=>{ (outs[e.s]=outs[e.s]||[]).push(e); (ins[e.t]=ins[e.t]||[]).push(e); });
  Object.values(outs).forEach(a=>{ a.sort((x,y)=>(colOf[x.t]-colOf[y.t])*0 + (rowOf[x.t]-rowOf[y.t]) || colOf[x.t]-colOf[y.t]); a.forEach((e,i)=>e.fs=(i+1)/(a.length+1)); });
  Object.values(ins).forEach(a=>{ a.sort((x,y)=>(rowOf[x.s]-rowOf[y.s]) || colOf[y.s]-colOf[x.s]); a.forEach((e,i)=>e.ft=(i+1)/(a.length+1)); });
  // Una entrada no puede quedar a la misma altura que una salida de la cajita de enfrente (los tramos se encimarían)
  const boxAt={}; courses.forEach(c=>boxAt[colOf[c.id]+':'+rowOf[c.id]]=c.id);
  Object.entries(ins).forEach(([t,a])=>{ const facing=boxAt[(colOf[t]-1)+':'+rowOf[t]]; const S=(outs[facing]||[]).map(e=>e.fs); if(!S.length) return;
    const used=[]; a.forEach(e=>{ let best=e.ft, bd=1e9; for(let f=0.12; f<=0.881; f+=0.02){ if(S.some(x=>Math.abs(x-f)<0.09)||used.some(x=>Math.abs(x-f)<0.09)) continue; const d=Math.abs(f-e.ft); if(d<bd){ bd=d; best=f; } } e.ft=best; used.push(best); }); });
  // Topología en unidades abstractas: fila r ocupa [r, r+.6], pasillo r (entre r y r+1) en r+.8
  const rowU=(r,f)=>r+0.6*f, corU=r=>r+0.8, chU=k=>k+0.8;
  const chSeg={}, coSeg={};
  E.forEach(e=>{ const a=colOf[e.s], b=colOf[e.t], i=rowOf[e.s], j=rowOf[e.t]; const sy=rowU(i,e.fs), ty=rowU(j,e.ft);
    e.ca=a; e.cb=b-1;
    if(e.cb===a){ e.direct=true; (chSeg[a]=chSeg[a]||[]).push({e, lo:Math.min(sy,ty), hi:Math.max(sy,ty), key:'a'}); }
    else { const r=j>=i?i:i-1; e.cor=r; const cy=corU(r);
      (chSeg[a]=chSeg[a]||[]).push({e, lo:Math.min(sy,cy), hi:Math.max(sy,cy), key:'a'});
      (chSeg[e.cb]=chSeg[e.cb]||[]).push({e, lo:Math.min(cy,ty), hi:Math.max(cy,ty), key:'b'});
      const x1=chU(a), x2=chU(e.cb); (coSeg[r]=coSeg[r]||[]).push({e, lo:Math.min(x1,x2), hi:Math.max(x1,x2), key:'c'}); } });
  // Carriles: coloreo de intervalos (dos segmentos que se traslapan nunca comparten carril)
  const lanes=(segs)=>{ segs.sort((p,q)=>p.lo-q.lo||q.hi-p.hi); const ends=[]; segs.forEach(s=>{ let l=ends.findIndex(x=>x<s.lo-0.02); if(l<0){ l=ends.length; ends.push(0); } ends[l]=s.hi; s.lane=l; }); return ends.length; };
  const chN={}, coN={}; Object.entries(chSeg).forEach(([k,s])=>chN[k]=lanes(s)); Object.entries(coSeg).forEach(([k,s])=>coN[k]=lanes(s));
  const STEP=11;
  const chW=k=>Math.max(LR?70:56, 34+((chN[k]||0)-1)*STEP), coW=r=>Math.max(LR?26:40, 22+((coN[r]||0)-1)*STEP);
  // Coordenadas reales
  const M=40, HEAD=LR?44:0, HEADC=LR?0:150;
  const colStart=[]; let u=M+(LR?0:HEADC)+chW(-1); for(let k=0;k<nCols;k++){ colStart[k]=u; u+=BA+chW(k); } const totalA=u+M;
  const rowStart=[]; let v=M+HEAD+coW(-1); for(let r=0;r<nRows;r++){ rowStart[r]=v; v+=BC+coW(r); } const totalC=v+M;
  const chX=(k,l)=>{ const base=k<0?colStart[0]-chW(-1):colStart[k]+BA; const n=chN[k]||1; return base+(chW(k)-(n-1)*STEP)/2+l*STEP; };
  const coY=(r,l)=>{ const base=r<0?rowStart[0]-coW(-1):rowStart[r]+BC; const n=coN[r]||1; return base+(coW(r)-(n-1)*STEP)/2+l*STEP; };
  const P=(a,c)=>LR?{x:a,y:c}:{x:c,y:a};
  const nodes=courses.map(c=>{ const k=colOf[c.id], r=rowOf[c.id]; const p=P(colStart[k], rowStart[r]); return Object.assign({}, c, {x:p.x,y:p.y,w:LR?BA:BC,h:LR?BC:BA,k}); });
  const nodeBy=Object.fromEntries(nodes.map(n=>[n.id,n]));
  const laneOf=(e,key,segs)=>segs.find(s=>s.e===e&&s.key===key).lane;
  const srcIdx={}; let si=0; nodes.forEach(n=>{ if(outs[n.id]) srcIdx[n.id]=si++; });
  const edges=E.map(e=>{ const a=e.ca, sa=colStart[colOf[e.s]]+BA, ta=colStart[colOf[e.t]];
    const sc=rowStart[rowOf[e.s]]+BC*e.fs, tc=rowStart[rowOf[e.t]]+BC*e.ft;
    const xa=chX(a, laneOf(e,'a',chSeg[a]));
    let pts;
    if(e.direct) pts=[[xa,sc],[xa,tc]];
    else { const yc=coY(e.cor, laneOf(e,'c',coSeg[e.cor])); const xb=chX(e.cb, laneOf(e,'b',chSeg[e.cb])); pts=[[xa,sc],[xa,yc],[xb,yc],[xb,tc]]; }
    return {s:e.s, t:e.t, fs:e.fs, ft:e.ft, start:P(sa,sc), end:P(ta,tc), pts:pts.map(([aa,cc])=>P(aa,cc)), col:MALLA_EDGE[srcIdx[e.s]%MALLA_EDGE.length]}; });
  const heads=levels.map((lv,k)=>{ const p=LR?{x:colStart[k], y:M, w:BA, h:30}:{x:M, y:colStart[k]+BA/2-15, w:HEADC-20, h:30}; return Object.assign(p,{label:lv===98?'Sin ubicación':periodLabel(lv), k}); });
  const W=LR?totalA:totalC, H=LR?totalC:totalA;
  return {nodes, edges, heads, W, H, LR, nodeBy, nLevels:nCols};
}
// Color de cada caja: por área de conocimiento (del Maestro), por cuatrimestre o uno solo
function mallaPaint(g,o){
  const areas=[...new Set(g.nodes.map(n=>n.area).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  const SIN=['#f1f1f1','#9a9a9a'];
  g.fillOf = n => o.color==='area' ? (n.area ? MALLA_FILL[areas.indexOf(n.area)%MALLA_FILL.length] : SIN) : o.color==='nivel' ? MALLA_FILL[n.k%MALLA_FILL.length] : MALLA_FILL[0];
  g.legend=[];
  if (o.color==='area' && areas.length){
    const items=areas.map(a=>({label:a, c:MALLA_FILL[areas.indexOf(a)%MALLA_FILL.length]})); if (g.nodes.some(n=>!n.area)) items.push({label:'Sin área de conocimiento', c:SIN});
    let x=40, y=g.H-10; const maxW=Math.max(g.W-40, 600);
    items.forEach(it=>{ const w=Math.min(360, 46+it.label.length*7.2); if (x+w>maxW){ x=40; y+=34; } g.legend.push(Object.assign(it,{x,y,w})); x+=w+14; });
    g.H=y+54; g.W=Math.max(g.W, maxW+40);
  }
  return areas;
}
function mallaXML(g,o){
  const X=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const uid=()=>Math.random().toString(36).slice(2,10)+Math.random().toString(36).slice(2,10);
  const pf=uid(); let id=2; const cid={};
  let out=`<mxCell id="${pf}-0"/><mxCell id="${pf}-1" parent="${pf}-0"/>`;
  g.heads.forEach(h=>{ out+=`<mxCell id="${pf}-${id++}" value="${X(h.label)}" style="text;html=1;align=center;verticalAlign=middle;fontStyle=1;fontSize=15;fontColor=#1c2131;strokeColor=none;fillColor=none;" vertex="1" parent="${pf}-1"><mxGeometry x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" as="geometry"/></mxCell>`; });
  (g.legend||[]).forEach(l=>{ out+=`<mxCell id="${pf}-${id++}" value="" style="rounded=1;arcSize=20;fillColor=${l.c[0]};strokeColor=${l.c[1]};strokeWidth=1.5;" vertex="1" parent="${pf}-1"><mxGeometry x="${l.x}" y="${l.y+4}" width="22" height="18" as="geometry"/></mxCell><mxCell id="${pf}-${id++}" value="${X(l.label)}" style="text;html=1;align=left;verticalAlign=middle;fontSize=13;fontColor=#1c2131;strokeColor=none;fillColor=none;" vertex="1" parent="${pf}-1"><mxGeometry x="${l.x+30}" y="${l.y}" width="${l.w-30}" height="26" as="geometry"/></mxCell>`; });
  g.nodes.forEach(n=>{ const [f,s]=g.fillOf(n); cid[n.id]=`${pf}-${id++}`;
    const lab=`<div><b style="font-size:14px">${X(n.id)}</b></div><div style="font-size:12.5px">${X(n.name)}</div>`+(o.cred&&n.credits?`<div style="font-size:11px;color:#5a6377">${X(n.credits)} créditos</div>`:'');
    out+=`<mxCell id="${cid[n.id]}" value="${X(lab)}" style="rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=${f};strokeColor=${s};strokeWidth=1.5;fontSize=13;fontColor=#1c2131;verticalAlign=middle;align=center;" vertex="1" parent="${pf}-1"><mxGeometry x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" as="geometry"/></mxCell>`; });
  g.edges.forEach(e=>{ const sc=o.edges==='color'?e.col:'#5a6377';
    const ex=g.LR?`exitX=1;exitY=${e.fs.toFixed(4)};entryX=0;entryY=${e.ft.toFixed(4)};`:`exitX=${e.fs.toFixed(4)};exitY=1;entryX=${e.ft.toFixed(4)};entryY=0;`;
    out+=`<mxCell id="${pf}-${id++}" style="edgeStyle=none;rounded=1;arcSize=10;html=1;endArrow=block;endFill=1;endSize=6;strokeWidth=1.6;strokeColor=${sc};${ex}exitDx=0;exitDy=0;entryDx=0;entryDy=0;" edge="1" parent="${pf}-1" source="${cid[e.s]}" target="${cid[e.t]}"><mxGeometry relative="1" as="geometry"><Array as="points">${e.pts.map(p=>`<mxPoint x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}"/>`).join('')}</Array></mxGeometry></mxCell>`; });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net"><diagram name="${X(o.title||'Malla curricular')}" id="${uid()}"><mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${Math.ceil(g.W)}" pageHeight="${Math.ceil(g.H)}" math="0" shadow="0"><root>${out}</root></mxGraphModel></diagram></mxfile>`;
}
function mallaSVG(g,o){
  const X=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(g.W)} ${Math.ceil(g.H)}" width="${Math.ceil(g.W)}" height="${Math.ceil(g.H)}" font-family="Nunito Sans,Segoe UI,sans-serif"><rect width="100%" height="100%" fill="#fffdf8"/><defs>`;
  const cols=[...new Set(g.edges.map(e=>o.edges==='color'?e.col:'#5a6377'))];
  cols.forEach((c,i)=>s+=`<marker id="m${i}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10Z" fill="${c}"/></marker>`); s+='</defs>';
  g.heads.forEach(h=>s+=`<text x="${h.x+h.w/2}" y="${h.y+h.h/2+5}" text-anchor="middle" font-weight="800" font-size="15" fill="#1c2131">${X(h.label)}</text>`);
  g.edges.forEach(e=>{ const c=o.edges==='color'?e.col:'#5a6377'; const pts=[e.start,...e.pts,e.end].map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    s+=`<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linejoin="round" marker-end="url(#m${cols.indexOf(c)})"/>`; });
  (g.legend||[]).forEach(l=>{ s+=`<rect x="${l.x}" y="${l.y+4}" width="22" height="18" rx="4" fill="${l.c[0]}" stroke="${l.c[1]}" stroke-width="1.5"/><text x="${l.x+30}" y="${l.y+18}" font-size="13" fill="#1c2131">${X(l.label)}</text>`; });
  g.nodes.forEach(n=>{ const [f,st]=g.fillOf(n);
    s+=`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="10" fill="${f}" stroke="${st}" stroke-width="1.5"/>`;
    const cx=n.x+n.w/2; const words=X(n.name).split(' '); const lines=[]; let cur=''; const maxc=g.LR?24:20;
    words.forEach(w=>{ if((cur+' '+w).trim().length>maxc){ lines.push(cur.trim()); cur=w; } else cur+=' '+w; }); if(cur.trim()) lines.push(cur.trim());
    const L=lines.slice(0,3); const tot=1+L.length+(o.cred&&n.credits?1:0); let y=n.y+n.h/2-(tot-1)*7.5+4;
    s+=`<text x="${cx}" y="${y}" text-anchor="middle" font-weight="800" font-size="13" fill="#1c2131">${X(n.id)}</text>`; y+=15;
    L.forEach(l=>{ s+=`<text x="${cx}" y="${y}" text-anchor="middle" font-size="11.5" fill="#1c2131">${l}</text>`; y+=14; });
    if(o.cred&&n.credits) s+=`<text x="${cx}" y="${y}" text-anchor="middle" font-size="10.5" fill="#5a6377">${X(n.credits)} créditos</text>`; });
  return s+'</svg>';
}
let mallaLast=null;
function mallaRun(){ const o=mallaCfg(); const sig=mallaSiglas(); if(o.car&&!sig.includes(o.car)) o.car='';
  const {list,fuera}=mallaCourses(o.car); if(!list.length){ mallaLast=null; return null; }
  o.title=`Malla ${o.car||P()?.name||''}`.trim(); const g=mallaLayout(list,o); const areas=mallaPaint(g,o); mallaLast={g,o,xml:mallaXML(g,o),svg:mallaSVG(g,o),fuera,n:list.length,areas,sinArea:list.filter(c=>!c.area).length}; return mallaLast; }
function dzSet(k,v){ const o=mallaCfg(); o[k]=v; mallaSave(o); refresh(); }
function dzFile(){ const o=mallaCfg(); return `Malla curricular ${o.car||P()?.name||''}`.trim().replace(/[\\/:*?"<>|]+/g,'')+'.drawio'; }
function dzDownload(){ const m=mallaLast||mallaRun(); if(!m) return; const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([m.xml],{type:'application/xml'})); a.download=dzFile(); a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); toast('✓ Malla descargada: abrila en draw.io','success'); const p=personByK('disenador'); if(p){ p.bub='ok'; p.bubT=2; } }
async function dzCopy(){ const m=mallaLast||mallaRun(); if(!m) return; try{ await navigator.clipboard.writeText(m.xml); toast('✓ XML copiado. En draw.io: Extras → Editar diagrama','success'); }catch(e){ toast('No pude copiar. Usá «Descargar .drawio»','error'); } }
function dzBig(){ const m=mallaLast||mallaRun(); if(!m) return; const w=window.open('','_blank'); if(!w){ toast('El navegador bloqueó la ventana nueva','error'); return; } w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(m.o.title)}</title><body style="margin:0;background:#eef3f6;padding:20px">${m.svg}</body>`); w.document.close(); }
function panelDisenador(){
  const all=allCourses||[]; if(!all.length) return head('disenador','Diseñador','Malla curricular en draw.io','Estoy esperando que carguen los cursos de la hoja Base.');
  const o=mallaCfg(); const sig=mallaSiglas(); if(o.car&&!sig.includes(o.car)) o.car='';
  const m=mallaRun();
  const btn=(k,v,l)=>`<button class="of-btn sm ${o[k]===v?'ink':''}" aria-pressed="${o[k]===v}" onclick="Office.dzSet('${k}',${typeof v==='string'?`'${v}'`:v})">${esc(l)}</button>`;
  const lv=m?m.g.nLevels:0, ne=m?m.g.edges.length:0;
  return head('disenador','Diseñador','Malla curricular en draw.io', m?`Armé la malla con ${m.n} cursos en ${lv} columnas y ${ne} flechas de requisitos. Cada flecha va por los pasillos entre las cajitas, en su propio carril.`:'No encontré cursos para esa carrera en la hoja Base.')
    + (sig.length>1?`<div class="of-sec"><h4>Carrera</h4><div class="of-row">${btn('car','','Todas')}${sig.map(s=>btn('car',s,s)).join('')}</div><div class="of-note">Sale de la columna «Carrera» de Base. Un curso de las dos carreras aparece en ambas mallas.</div></div>`:'')
    + `<div class="of-sec"><h4>Estilo</h4>
        <div class="of-row">${btn('orient','LR','→ Horizontal')}${btn('orient','TB','↓ Vertical')}</div>
        <div class="of-row">${btn('color','area','Por área de conocimiento')}${btn('color','nivel','Por cuatrimestre')}${btn('color','uno','Un solo color')}</div>
        ${o.color==='area'&&m?(m.areas.length?`<div class="of-note">${m.areas.length===1?'Una área':m.areas.length+' áreas'} de conocimiento, tomadas de la columna «Area Conocimiento» del Maestro.${m.sinArea?` ${m.sinArea===1?'Un curso no tiene':m.sinArea+' cursos no tienen'} área y ${m.sinArea===1?'queda':'quedan'} en gris.`:''}</div>`:'<div class="of-note">El Maestro todavía no tiene la columna «Area Conocimiento» llena para estos cursos, así que todo queda en gris. Tocá «Sincronizar Maestro» en tu escritorio si ya la llenaste.</div>'):''}
        <div class="of-row">${btn('edges','color','Flechas de colores')}${btn('edges','gris','Flechas grises')}${btn('cred',!o.cred,o.cred?'Quitar créditos':'Mostrar créditos')}</div></div>`
    + (m?`<div class="of-sec"><h4>Vista previa</h4><div style="background:#fffdf8;border:1px solid var(--o-line);border-radius:10px;overflow:auto;max-height:340px;cursor:zoom-in" onclick="Office.dzBig()" title="Abrir en grande">${m.svg.replace(/width="\d+" height="\d+"/,'style="width:100%;height:auto;display:block"')}</div>
        ${m.fuera?`<div class="of-note">${m.fuera===1?'Un requisito apunta':m.fuera+' requisitos apuntan'} a cursos de la otra carrera y no se dibuja${m.fuera===1?'':'n'}.</div>`:''}
        <div class="of-row"><button class="of-btn pri" onclick="Office.dzDownload()">Descargar .drawio</button><button class="of-btn" onclick="Office.dzCopy()">Copiar XML</button><button class="of-btn" onclick="Office.dzBig()">Ver en grande</button></div>
        <div class="of-note">Si movés cajitas en draw.io, las flechas conservan su recorrido; para rehacerlo, generá la malla otra vez desde aquí.</div></div>`:'');
}

/* ---------- Registrador: carrera de cada curso ---------- */
function comunOf(code){ try{ return JSON.parse(localStorage.getItem('dcd_comun_'+code)||'null'); }catch(e){ return null; } }
function careerOf(code){ const cars=projectCareers(); const com=comunOf(code); if(!com) return ''; if(com.on&&cars.includes(String(com.carrera2||'').trim())) return 'both'; if(com.carrera1===cars[1]&&!com.on) return 'c2'; if(com.carrera1===cars[0]&&!com.on) return 'c1'; if(com.on) return 'both'; return ''; }
function setCareer(code,v){ const cars=projectCareers(); if(cars.length<2) return; const val={on:v==='both', carrera1:v==='c2'?cars[1]:cars[0], carrera2:v==='both'?cars[1]:''}; try{ localStorage.setItem('dcd_comun_'+code, JSON.stringify(val)); }catch(e){} try{ rememberCareer(code); autoBackup(); }catch(e){} }
function careerSet(code,v){ setCareer(code,v); refresh(); }
function careerAll(v){ (allCourses||[]).forEach(c=>setCareer(c['Código'],v)); toast('✓ Todos los cursos asignados','success'); const r=personByK('carreras'); if(r){ r.bub='ok'; r.bubT=2; } refresh(); }
function careerAbbr(name,i){ const sg=projectSiglas()[i]; if(sg) return sg; const a=String(name||'').split(/\s+/).filter(w=>/^[A-ZÁÉÍÓÚÑ]/.test(w)).map(w=>w[0]).join('').slice(0,5); return a||('Carrera '+(i+1)); }
/* ---------- Registrador: cambiar el nombre de un curso en todo lado ---------- */
let renCode='', renBusy=false, renLast=null;
const reEsc=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// El nombre completo, sin tocar nombres más largos que lo contengan (p. ej. «… 1» no toca «… 10»)
function renRe(old){ return new RegExp('(?<![\\p{L}\\p{N}])'+String(old).trim().split(/\s+/).map(reEsc).join('\\s+')+'(?![\\p{L}\\p{N}])','gu'); }
function renStr(v,re,nw){ let n=0; const r=String(v).replace(re,()=>{ n++; return nw; }); return {v:r,n}; }
// Reemplaza en texto y también dentro de los campos guardados como JSON (datos generales, cronograma…)
function renText(v,re,nw){
  if(typeof v!=='string') return {v,n:0};
  const t=v.trim();
  if(t[0]==='{'||t[0]==='['){ try{ const o=JSON.parse(t); let n=0;
    const walk=x=>{ if(typeof x==='string'){ const r=renStr(x,re,nw); n+=r.n; return r.v; } if(Array.isArray(x)) return x.map(walk); if(x&&typeof x==='object'){ const y={}; for(const [k,w] of Object.entries(x)) y[k]=walk(w); return y; } return x; };
    const o2=walk(o); return n?{v:JSON.stringify(o2),n}:{v,n:0}; }catch(e){} }
  return renStr(v,re,nw);
}
function renCount(re){ const md=maestroData[P()?.sheetId]||{}; let n=0; const cursos=new Set();
  for(const [cd,s] of Object.entries(md)) for(const v of Object.values(s||{})){ const k=renText(v,re,'·').n; if(k){ n+=k; cursos.add(cd); } }
  (allCourses||[]).forEach(c=>Object.values(c).forEach(v=>{ const k=renText(v,re,'·').n; if(k){ n+=k; cursos.add(c['Código']); } }));
  return {n, cursos:cursos.size}; }
function renPick(code){ renCode=code||''; renLast=null; refresh(); const c=courseBy(code); const ec=document.getElementById('of-renc'); if(ec) ec.value=c?c['Código']:''; const el=document.getElementById('of-ren'); if(el){ el.value=c?cName(c):''; el.focus(); el.select(); el.scrollIntoView({block:'center',behavior:'smooth'}); } }
const sheetRef=t=>`'${String(t).replace(/'/g,"''")}'`;
// Todas las hojas del libro de Google: Base, Maestro, Rasgos de Perfil y las demás (las fórmulas no se tocan)
async function renSheets(sid,re,nw){
  const meta=await sheetsReq(`/${sid}?fields=sheets.properties(title,sheetType)`);
  const titles=(meta.sheets||[]).filter(x=>(x.properties.sheetType||'GRID')==='GRID').map(x=>x.properties.title);
  if(!titles.length) return {cells:0, hojas:[]};
  const out=await sheetsReq(`/${sid}/values:batchGet?${titles.map(t=>'ranges='+encodeURIComponent(sheetRef(t))).join('&')}&valueRenderOption=FORMULA`);
  const data=[], hojas=new Set();
  (out.valueRanges||[]).forEach((vr,i)=>{ const t=titles[i];
    (vr.values||[]).forEach((row,r)=>row.forEach((cell,ci)=>{ if(typeof cell!=='string'||cell.startsWith('=')) return; const x=renStr(cell,re,nw); if(x.n){ data.push({range:`${sheetRef(t)}!${colLetter(ci)}${r+1}`, values:[[x.v]]}); hojas.add(t); } })); });
  for(let i=0;i<data.length;i+=400) await sheetsReq(`/${sid}/values:batchUpdate`,'POST',{valueInputOption:'RAW', data:data.slice(i,i+400)});
  return {cells:data.length, hojas:[...hojas]};
}
// Los Word del curso en las carpetas de fichas y de programas: cambia «from» por «to» en el nombre del archivo
async function renDrive(code,from,to,isName){
  const san=x=>String(x).replace(/[\\/:*?"<>|]+/g,'').replace(/\s+/g,' ').trim();
  const so=isName?san(from):String(from), sn=isName?san(to):String(to), cd=normCode(code); const p=P();
  const folders=[...new Set([driveFolderId(p.folderFichas),driveFolderId(p.folderProgramas)].filter(Boolean))];
  const done=[];
  for(const fid of folders){
    const q=encodeURIComponent(`'${fid}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`); let files=[], tok='';
    do{ const o=await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives${tok?'&pageToken='+tok:''}`); files=files.concat(o.files||[]); tok=o.nextPageToken||''; } while(tok);
    for(const f of files){ const n=String(f.name||''); if(!n.includes(so)||!(driveNameFits(n,'ficha',cd)||driveNameFits(n,'programa',cd))) continue;
      const name=n.split(so).join(sn);
      await driveFetch(`https://www.googleapis.com/drive/v3/files/${f.id}?supportsAllDrives=true&fields=id,name`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});
      done.push(name); }
  }
  const F=flows(); let ch=false; F.forEach(f=>{ if(f.fileName&&String(f.fileName).includes(so)){ f.fileName=String(f.fileName).split(so).join(sn); ch=true; } }); if(ch) saveFlows(F);
  return done;
}
// El código completo, sin tocar códigos más largos (SOFT-01 no toca SOFT-010 ni SOFT-01-C1)
function renCodeRe(code){ return new RegExp('(?<![\\p{L}\\p{N}])'+reEsc(String(code).trim())+'(?![\\p{L}\\p{N}]|-[\\p{L}\\p{N}])','gu'); }
const CODE_OK=/^[A-ZÁÉÍÓÚÑ]{2,8}-?\d{1,4}(-?[A-Z0-9]{1,4})?$/;
// Reemplaza en todo lo guardado de este proyecto y en la hoja Base cargada
function renLocal(re,nw,res){ const md=maestroData[P().sheetId]||{}; const cur=new Set();
  for(const [cd,s] of Object.entries(md)) for(const key of Object.keys(s||{})){ const r=renText(s[key],re,nw); if(r.n){ s[key]=r.v; res.loc+=r.n; cur.add(cd); } }
  (allCourses||[]).forEach(x=>Object.keys(x).forEach(key=>{ const r=renText(x[key],re,nw); if(r.n){ x[key]=r.v; res.loc+=r.n; cur.add(x['Código']); } }));
  cur.forEach(x=>res.cursos.add(x)); }
// Lo que la app guarda con el código como llave
function renCodeKeys(old,nw){ const sid=P().sheetId, pid=P().id; const md=maestroData[sid]||{};
  if(md[old]){ md[nw]=md[old]; delete md[old]; }
  const moves=[]; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i)||'';
    if(k==='dcd_ver_'+old||k==='dcd_comun_'+old) moves.push([k,k.slice(0,-old.length)+nw,false]);   // se copian: un curso común puede estar en otro proyecto
    else if(k.startsWith('dcd_drivefile_')&&k.endsWith('_'+pid+'_'+old)) moves.push([k,k.slice(0,-old.length)+nw,true]);
    else if(k.startsWith(`dcd_vsnap_${pid}_${old}_`)) moves.push([k,`dcd_vsnap_${pid}_${nw}_`+k.slice(`dcd_vsnap_${pid}_${old}_`.length),true]); }
  moves.forEach(([a,b,mv])=>{ try{ localStorage.setItem(b,localStorage.getItem(a)); if(mv) localStorage.removeItem(a); }catch(e){} });
  const same=x=>normCode(x)===normCode(old);
  (P().rasgosGrupos||[]).forEach(g=>{ g.cursos=(g.cursos||[]).map(x=>same(x)?nw:x); }); saveProjects();
  const F=flows(); F.forEach(f=>{ if(same(f.code)) f.code=nw; }); saveFlows(F);
  const I=inbox(); I.forEach(m=>{ if(same(m.code)) m.code=nw; }); saveInbox(I);
  const J=jobs(); Object.values(J).forEach(j=>{ if(j&&same(j.code)) j.code=nw; }); saveJobs(J);
  if(same(biblioCode)) biblioCode=nw;
}
async function renApply(){
  if(renBusy) return; const c=courseBy(renCode); if(!c) return;
  const oldCode=String(c['Código']).trim(), oldName=cName(c);
  const nwCode=String(document.getElementById('of-renc')?.value||'').replace(/\s+/g,'').toUpperCase();
  const nwName=String(document.getElementById('of-ren')?.value||'').replace(/\s+/g,' ').trim();
  const doCode=nwCode&&nwCode!==oldCode, doName=nwName&&nwName!==oldName;
  if(!nwCode){ toast('Escribí el código','error'); return; }
  if(!nwName){ toast('Escribí el nombre','error'); return; }
  if(!doCode&&!doName){ toast('El código y el nombre son iguales a los de ahora',''); return; }
  if(doCode&&!CODE_OK.test(nwCode)){ toast('El código no parece válido. Ejemplo: SOFT-201','error'); return; }
  if(doCode){ const o=(allCourses||[]).find(x=>x!==c&&normCode(x['Código'])===normCode(nwCode)); if(o){ toast(`El código ${nwCode} ya lo tiene «${cName(o)}»`,'error'); return; } }
  if(doName){ if(!oldName){ toast('Este curso no tiene nombre en la hoja Base','error'); return; } const o=(allCourses||[]).find(x=>x!==c&&normTxt(cName(x))===normTxt(nwName)); if(o){ toast(`Ese nombre ya lo tiene ${o['Código']}`,'error'); return; } }
  if(needGoogle(()=>renApply())) return;
  const reC=doCode?renCodeRe(oldCode):null, reN=doName?renRe(oldName):null;
  const kc=reC?renCount(reC):{n:0,cursos:0}, kn=reN?renCount(reN):{n:0,cursos:0};
  const que=[doCode?`el código ${oldCode} por ${nwCode}`:'', doName?`«${oldName}» por «${nwName}»`:''].filter(Boolean).join(' y ');
  if(!confirm(`¿Cambiar ${que} en todo lado?\n\nEn la app aparece${doCode&&doName?'n':''} ${kc.n+kn.n} ${kc.n+kn.n===1?'vez':'veces'}. También reviso todas las hojas del libro de Google y los Word del curso en Drive.`)) return;
  renBusy=true; refresh();
  const res={oldCode, nwCode:doCode?nwCode:oldCode, oldName, nwName:doName?nwName:oldName, doCode, doName, loc:0, cursos:new Set(), cells:0, hojas:new Set(), drive:[], sheetErr:'', driveErr:'', driveSkip:false};
  const sid=extractSheetId(P().url), driveOn=localStorage.getItem('dcd_drive_ok')==='1' && (P().folderFichas||P().folderProgramas);
  try{
    if(doCode){
      renLocal(reC,nwCode,res); c['Código']=nwCode; renCodeKeys(oldCode,nwCode); renCode=nwCode;
      try{ const r=await renSheets(sid,reC,nwCode); res.cells+=r.cells; r.hojas.forEach(h=>res.hojas.add(h)); }catch(e){ res.sheetErr=e.message; }
      if(driveOn){ try{ res.drive.push(...await renDrive(oldCode,oldCode,nwCode,false)); }catch(e){ res.driveErr=e.message; } }
    }
    if(doName){
      renLocal(reN,nwName,res); if('Nombre' in c) c['Nombre']=nwName; if('Curso' in c || !('Nombre' in c)) c['Curso']=nwName;
      if(!res.sheetErr){ try{ const r=await renSheets(sid,reN,nwName); res.cells+=r.cells; r.hojas.forEach(h=>res.hojas.add(h)); }catch(e){ res.sheetErr=e.message; } }
      if(driveOn&&!res.driveErr){ try{ res.drive.push(...await renDrive(c['Código'],oldName,nwName,true)); }catch(e){ res.driveErr=e.message; } }
    }
    if(!driveOn) res.driveSkip=true;
    localStorage.setItem('dcd_maestro',JSON.stringify(maestroData)); try{ autoBackup(); }catch(e){}
  } finally { renBusy=false; }
  res.cursos=res.cursos.size; res.hojas=[...res.hojas]; res.drive=[...new Set(res.drive)];
  renLast=res; const r=personByK('carreras'); if(r){ r.bub=res.sheetErr?null:'ok'; r.bubT=2; }
  toast(res.sheetErr?'El cambio quedó en la app, pero no pude escribir en el libro de Google':`✓ ${res.nwCode} ${res.nwName}`, res.sheetErr?'error':'success');
  try{ if(typeof renderCourseNav==='function') renderCourseNav(); }catch(e){}
  refresh();
}
function renSection(){
  const c=renCode?courseBy(renCode):null;
  let h=`<div class="of-sec"><h4>Cambiar el código o el nombre de un curso</h4>`;
  if(!c) h+=`<div class="of-note" style="margin-top:0">Elegí el curso. El cambio llega a todos los lugares donde aparece el anterior, dentro y fuera de la app.</div>`+picker('ren',code=>renPick(code));
  else h+=`<div class="of-item"><div class="t">${esc(c['Código'])} ${esc(cName(c))}</div></div>
      <div style="display:grid;grid-template-columns:120px 1fr;gap:0 8px">
        <div><label class="of-lb" for="of-renc">Código</label><input class="of-in" id="of-renc" value="${attr(c['Código'])}" style="text-transform:uppercase" onkeydown="if(event.key==='Enter')Office.renApply()"></div>
        <div><label class="of-lb" for="of-ren">Nombre</label><input class="of-in" id="of-ren" value="${attr(cName(c))}" onkeydown="if(event.key==='Enter')Office.renApply()"></div></div>
      <div class="of-row"><button class="of-btn pri" ${renBusy?'disabled':''} onclick="Office.renApply()">${renBusy?'Cambiando…':'Cambiar en todo lado'}</button><button class="of-btn" onclick="Office.renPick('')">Otro curso</button></div>
      <div class="of-note">Cambia la hoja Base y el Maestro junto con las demás hojas del libro. También se reemplaza dentro de lo guardado de cualquier curso, por ejemplo en los requisitos.</div>`;
  const L=renLast;
  if(L){ const lines=[`✓ ${L.doCode?`<strong>${esc(L.oldCode)}</strong> ahora es <strong>${esc(L.nwCode)}</strong>.`:''}${L.doName?` «${esc(L.oldName)}» ahora se llama «${esc(L.nwName)}».`:''}`,
      `En la app: ${L.loc} ${L.loc===1?'cambio':'cambios'} en ${L.cursos} curso${L.cursos===1?'':'s'}.`,
      L.sheetErr?`⚠ Libro de Google: ${esc(L.sheetErr)}. Probá otra vez con «Cambiar en todo lado».`:`En el libro de Google: ${L.cells} celda${L.cells===1?'':'s'}${L.hojas.length?` (${esc(L.hojas.join(', '))})`:''}.`,
      L.driveErr?`⚠ Drive: ${esc(L.driveErr)}`:L.driveSkip?'Drive: los Word toman el cambio la próxima vez que los subás.':`En Drive: ${L.drive.length?L.drive.map(esc).join('<br>'):'ningún Word llevaba el dato anterior'}.`];
    h+=`<div class="of-note">${lines.join('<br>')}</div>`; }
  return h+'</div>';
}
/* ---------- Registrador: versión de cada curso ---------- */
function curVer(code){ try{ return (localStorage.getItem('dcd_ver_'+code)||'').trim()||'PRL1'; }catch(e){ return 'PRL1'; } }
function verSet(code,v){ const c=courseBy(code); if(!c) return; const prev=currentCourse; currentCourse=c; try{ setVersion(v); }finally{ currentCourse=prev; } try{ if(prev&&normCode(prev['Código'])===normCode(code)&&typeof refreshVersionUI==='function') refreshVersionUI(); }catch(e){}
  toast(`✓ ${c['Código']} en versión ${v}`,'success'); try{ if(typeof renderCourseNav==='function') renderCourseNav(); }catch(e){} refresh(); }
function verSel(code){ const cur=curVer(code); return `<select class="of-in" style="width:auto;padding:4px 8px;font-size:12px" aria-label="Versión de ${attr(code)}" title="Versión del programa" onchange="Office.verSet('${attr(code)}',this.value)">${VERSIONES.map(v=>`<option${v===cur?' selected':''}>${v}</option>`).join('')}</select>`; }
const renBtn=code=>`<button class="of-btn sm" onclick="Office.renPick('${attr(code)}')" title="Cambiar el código o el nombre de ${attr(code)}">✎ Código y nombre</button>`;
function panelCarreras(){
  const cars=projectCareers();
  if(cars.length<2) return head('carreras','Registrador','Datos de cada curso','Estoy dormido porque el proyecto tiene una sola carrera. Si agregás una segunda carrera al proyecto, me despierto y te ayudo a decidir de cuál carrera es cada curso (o si es de las dos). Mientras tanto, sí te ayudo con la versión y el nombre de cada curso.')
    + `<div class="of-row"><button class="of-btn pri" onclick="openProjectModal(currentProject.id)">Agregar la segunda carrera</button></div>` + renSection()
    + `<div class="of-sec"><h4>Versión de cada curso</h4>${(allCourses||[]).length?(allCourses||[]).map(c=>{ const code=c['Código']; return `<div class="of-item"><div class="t">${esc(code)} ${esc(cName(c))}</div><div class="of-row">${verSel(code)}${renBtn(code)}</div></div>`; }).join(''):'<div class="of-note">Cargando los cursos…</div>'}</div>`
    + `<div class="of-note">La versión se escribe también en la columna «Estado» de la hoja Base. PRL2 y PRL3 resaltan en el Word lo diferente a la versión anterior; la Final queda sin resaltar.</div>`;
  let ab=cars.map(careerAbbr); if(ab[0]===ab[1]) ab=['Carrera 1','Carrera 2'];
  const all=allCourses||[]; const sin=all.filter(c=>!careerOf(c['Código'])).length;
  const seg=(code,cur)=>[['c1',ab[0]],['c2',ab[1]],['both','Las dos']].map(([v,l])=>`<button class="of-btn sm ${cur===v?'ink':''}" aria-pressed="${cur===v}" onclick="Office.careerSet('${attr(code)}','${v}')" title="${attr(v==='both'?cars.join(' y '):cars[v==='c1'?0:1])}">${esc(l)}</button>`).join('');
  return head('carreras','Registrador','Datos de cada curso', sin?`Hay ${sin} curso${sin>1?'s':''} sin asignar. Elegí si cada uno es de una carrera o de las dos. Con «Las dos», el encabezado del Word lleva ambas carreras.`:'Todos los cursos tienen carrera. Podés cambiarla cuando quieras.')
    + `<div class="of-item"><div class="m" style="margin:0"><strong>${esc(ab[0])}</strong>: ${esc(cars[0])}<br><strong>${esc(ab[1])}</strong>: ${esc(cars[1])}</div><div class="of-row"><span class="of-note" style="margin:0;align-self:center">Asignar todos a</span>${[['c1',ab[0]],['c2',ab[1]],['both','Las dos']].map(([v,l])=>`<button class="of-btn sm" onclick="Office.careerAll('${v}')">${esc(l)}</button>`).join('')}</div></div>`
    + renSection()
    + `<div class="of-sec"><h4>Carrera y versión de cada curso</h4>${all.length?all.map(c=>{ const code=c['Código']; const cur=careerOf(code); return `<div class="of-item"><div class="t">${cur?'':'<span class="of-tag rev">SIN ASIGNAR</span>'}${esc(code)} ${esc(cName(c))}</div><div class="of-row">${seg(code,cur)}${verSel(code)}${renBtn(code)}</div></div>`; }).join(''):'<div class="of-note">Cargando los cursos…</div>'}</div>`
    + `<div class="of-note">${projectSiglas().every(Boolean)?`Cada cambio se escribe también en la columna «Carrera» de la hoja Base (${esc(projectSiglas().join(', '))}).`:'Para que la carrera quede escrita en la columna «Carrera» de la hoja Base, poné las siglas de cada carrera en <a href="#" onclick="openProjectModal(currentProject.id);return false">Editar proyecto</a>.'} El encabezado del Word cambia la próxima vez que se genere o se suba a Drive.</div>`;
}

/* ---------- Peche, Ajustes y Tomo ---------- */
function todoList(){
  const L=[]; const nI=inbox().filter(m=>m.status==='nuevo').length; if(nI) L.push(['cartero',`${nI} correo${nI>1?'s':''} del revisor por subir`]);
  flows().filter(f=>!f.archived&&(f.stage==='comentado'||f.stage==='corregido')).forEach(f=>L.push(['corrector',`${f.code}: ${f.stage==='comentado'?'corregir los comentarios':'revisar en Drive y responder'}`]));
  const J=jobs(); ['programa','ficha'].forEach(k=>{ if(J[k]&&J[k].stage!=='enviado') L.push([k,`${J[k].code}: ${k==='programa'?'programa':'ficha'} ${J[k].stage==='subido'?'en Drive, por revisar':'esperando la respuesta de Claude'}`]); });
  if(!gAccessToken) L.unshift(['peche','Conectar tu cuenta de Google']);
  return L;
}
let classicPick='';
function panelPeche(){
  const L=todoList();
  return head('peche','Peche','Tu escritorio', L.length?'Esto es lo que tenés pendiente:':'Todo al día. Los agentes te avisan cuando haya algo.')
    + (L.length?`<div>${L.map(([k,t])=>`<div class="of-item" style="cursor:pointer" onclick="Office.openPanel('${k}')"><div class="t">${esc(t)}</div><div class="m">${esc(AGENTS.find(a=>a.k===k)?.n||'')} →</div></div>`).join('')}</div>`:'')
    + `<div class="of-sec"><h4>Otras herramientas</h4><div class="of-row"><button class="of-btn sm" onclick="document.getElementById('bulk-file-input').click()">Importar varias fichas (.docx)</button><button class="of-btn sm" onclick="Office.openPanel('tomo')">Tomo II</button><button class="of-btn sm" onclick="Office.doSync()">Sincronizar Maestro</button></div></div>`
    + `<div class="of-sec"><h4>Abrir un curso en la vista clásica</h4><div class="of-note" style="margin-top:0">Para descargar el Word, ver el cronograma o cualquier otra opción de la vista de siempre.</div>${picker('cl', code=>{ const c=courseBy(code); if(c){ closePanel(); showCourseWork(c); } })}</div>`;
}
function saveProjects(){ localStorage.setItem('dcd_projects',JSON.stringify(projects)); autoBackup(); }
function ajustesSave(){ const p=P(); const g=id=>document.getElementById(id).value.trim(); p.mailPrefix=g('of-mp'); p.mailProg=g('of-mprog')||'Programa de curso'; p.mailFicha=g('of-mfi')||'Ficha de curso'; p.mailTo=g('of-mto'); p.mailName=g('of-mna')||'Ralph'; p.mailCc=g('of-mcc'); saveProjects(); toast('✓ Ajustes del correo guardados','success'); refresh(); }
function panelAjustes(){
  const m=mailCfg(); const ex=`${m.prefix?m.prefix+' | ':''}${m.prog} SOFT-201 Nombre del curso`;
  return `<button class="of-close" onclick="Office.closePanel()" aria-label="Cerrar">×</button><div class="of-ph"><div><h3>Ajustes del proyecto</h3><div class="sub">${esc(P()?.name||'')}</div></div></div>
    <div class="of-sec"><h4>Encabezados de los correos</h4>
      <label class="of-lb" for="of-mp">Siglas del asunto</label><input class="of-in" id="of-mp" value="${attr(m.prefix)}" placeholder="Por ejemplo: BISOFT">
      <label class="of-lb" for="of-mprog">Texto de los programas</label><input class="of-in" id="of-mprog" value="${attr(m.prog)}">
      <label class="of-lb" for="of-mfi">Texto de las fichas</label><input class="of-in" id="of-mfi" value="${attr(m.ficha)}">
      <div class="of-note">Asunto de ejemplo: <strong>${esc(ex)}</strong></div>
      <label class="of-lb" for="of-mto">Correo del revisor</label><input class="of-in" id="of-mto" value="${attr(m.to)}" placeholder="revisor@ucenfotec.ac.cr">
      <label class="of-lb" for="of-mna">Nombre en el saludo</label><input class="of-in" id="of-mna" value="${attr(m.name)}">
      <label class="of-lb" for="of-mcc">Con copia (opcional)</label><input class="of-in" id="of-mcc" value="${attr(m.cc)}">
      <div class="of-row"><button class="of-btn pri" onclick="Office.ajustesSave()">Guardar</button></div></div>
    <div class="of-sec"><h4>Proyecto</h4><div class="of-note" style="margin-top:0">Carpetas de Drive: ${P()?.folderFichas?'fichas ✓':'fichas ✗'} · ${P()?.folderProgramas?'programas ✓':'programas ✗'}</div>
      <div class="of-row"><button class="of-btn sm pri" onclick="Office.closePanel();openSetupWizard(currentProject.id)">Revisar la configuración</button><button class="of-btn sm" onclick="openProjectModal(currentProject.id)">Editar proyecto y carpetas</button><button class="of-btn sm" onclick="Office.classic()">Vista clásica</button></div></div>`;
}
function panelTomo(){
  const all=allCourses||[]; const fin=all.filter(isFinalCourse); const np=all.filter(c=>courseStage(savedForCourse(c)).programa).length;
  const pct=all.length?Math.round(fin.length/all.length*100):0;
  return `<button class="of-close" onclick="Office.closePanel()" aria-label="Cerrar">×</button><div class="of-ph"><div><h3>Tomo II</h3><div class="sub">El trofeo del proyecto</div></div></div>
    <div class="of-say">${fin.length===all.length&&all.length?'¡Todos los programas están en versión Final! El trofeo es de oro.':`${fin.length} de ${all.length} programas en versión Final (${pct} %). El trofeo pasa a plata a la mitad y a oro con todos.`}</div>
    <div class="of-note">${np} programas con contenido. El Tomo II junta todos los programas en un Word, ordenados por cuatrimestre.</div>
    <div class="of-row"><button class="of-btn pri" onclick="openTomoExport()">Descargar el Tomo II</button></div>
    ${fin.length?`<div class="of-sec"><h4>En versión Final</h4>${fin.map(c=>`<div class="of-item"><div class="t">🏆 ${esc(c['Código'])} ${esc(cName(c))}</div></div>`).join('')}</div>`:''}`;
}
async function doSync(){ if(needGoogle(()=>doSync())) return; syncing=true; floatTxt(9.5,.5,'Sincronizando…','#2f6fb5'); try{ await syncSheets(); floatTxt(9.5,.5,'Maestro ✓'); }catch(e){} syncing=false; refresh(); }

/* ---------- HUD ---------- */
const tools=document.getElementById('of-tools');
function paintTools(){
  const badge=k=>{ const n=needOf(k); return n.alert?'<span class="bdg">!</span>':''; };
  setHTML(tools, AGENTS.map(a=>`<button class="of-tool${panelKey===a.k?' on':''}" onclick="Office.openAgent('${a.k}')" title="${attr(a.n+' · '+a.role)}"><span class="dot" style="background:${a.col}"></span><span class="l">${a.n}</span>${a.k==='peche'?'':badge(a.k)}</button>`).join('')
    +`<span class="of-sep"></span>
    <button class="of-tool x${panelKey==='tomo'?' on':''}" onclick="Office.openPanel('tomo')" title="Tomo II"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v4a5 5 0 0 1-10 0Z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/></svg><span class="l">Tomo II</span></button>
    <button class="of-tool x${panelKey==='rocola'?' on':''}" onclick="Office.openRocola()" title="Rocola: música de YouTube"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg><span class="l">Rocola</span></button>
    <button class="of-tool x${panelKey==='decorar'?' on':''}" onclick="Office.editToggle()" title="Decorar la oficina"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l4-1 10-10-3-3L5 16z"/><path d="M13 7l3 3"/></svg><span class="l">Decorar</span></button>
    <button class="of-tool x" onclick="Office.gameOpen()" title="Arcade"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3" y="7" width="18" height="11" rx="4"/><path d="M8 10.5v4M6 12.5h4M15.5 11.5h.01M17.5 13.5h.01"/></svg><span class="l">Jugar</span></button>
    <button class="of-tool x${panelKey==='ajustes'?' on':''}" onclick="Office.openPanel('ajustes')" title="Ajustes del proyecto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg><span class="l">Ajustes</span></button>
    <button class="of-tool x" onclick="Office.classic()" title="Vista clásica de la app"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16M10 10v9"/></svg><span class="l">Clásica</span></button>
    <button class="of-tool x" onclick="showHome()" title="Volver a los proyectos"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/></svg><span class="l">Salir</span></button>`);
}
function paintHud(){
  const p=P(); if(!p) return; document.getElementById('of-title').textContent=p.name||'Oficina';
  const s=document.getElementById('of-estado'); const e=estadoOf(p); if(document.activeElement!==s){ setHTML(s,ESTADOS.map(x=>`<option${x.v===e.v?' selected':''}>${x.v}</option>`).join('')); s.value=e.v; } s.className='est-pill '+e.c;
  const all=allCourses||[]; const nf=all.filter(c=>courseStage(savedForCourse(c)).ficha).length, np=all.filter(c=>courseStage(savedForCourse(c)).programa).length, fin=all.filter(isFinalCourse).length;
  finalsRatio=all.length?fin/all.length:0; unreadN=inbox().filter(m=>m.status==='nuevo').length;
  document.getElementById('of-sf').textContent=all.length?`${nf}/${all.length}`:'—'; document.getElementById('of-sp').textContent=all.length?`${np}/${all.length}`:'—'; document.getElementById('of-sfin').textContent=all.length?String(fin):'—'; document.getElementById('of-smail').textContent=String(unreadN);
  setHTML(document.getElementById('of-auth'),gAccessToken?`<span class="of-pill" title="${attr(gUserInfo?.email||'')}"><i></i>${esc((gUserInfo?.name||gUserInfo?.email||'Google').split(' ')[0])}</span>`:`<button class="of-btn pri sm" onclick="googleSignIn(()=>Office.enter(true))">Conectar Google</button>`);
}
function tickClock(){ const d=new Date(); document.getElementById('of-clock').textContent=d.toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long'})+' · '+d.toLocaleTimeString('es-CR',{hour:'2-digit',minute:'2-digit'}); }

/* ---------- Bucle ---------- */
let running=false, last=0, hudT=0;
function frame(ts){ if(!running) return; const t=ts/1000; const dt=Math.min(.1,last?t-last:0); last=t; tick(dt); for(let i=floats.length-1;i>=0;i--){ floats[i].life-=dt; if(floats[i].life<=0) floats.splice(i,1); } hudT-=dt; if(hudT<=0){ hudT=1; tickClock(); paintHud(); paintTools(); if(!panel.hidden&&['peche','tomo'].includes(panelKey)&&!panel.contains(document.activeElement)) renderPanel(true); }
  if(Date.now()-mailLast>5*60*1000&&!mailBusy&&gAccessToken&&mailReadOk()&&(allCourses||[]).length){ mailLast=Date.now(); checkMail(true); }
  render(t); requestAnimationFrame(frame); }
let scenePid=null;
async function enter(force){
  if(!P()) return;
  document.body.classList.add('office-on');
  if(scenePid!==P().id||force){ scenePid=P().id; buildScene(); ack=LS.get(kAck(),{}); mailLast=0; biblioCode=''; closePanel(); }
  resize(); fitCam(); paintHud(); paintTools(); tickClock();
  if(!running){ running=true; last=0; requestAnimationFrame(frame); }
  // Espera los cursos y revisa el correo una vez
  for(let i=0;i<60&&!(allCourses||[]).length;i++) await new Promise(r=>setTimeout(r,500));
  refresh(); if(gAccessToken&&mailReadOk()) checkMail(true); else if(gAccessToken) { mailNeedPerm=true; refresh(); }
}
function leave(){ running=false; document.body.classList.remove('office-on'); window.__ofHook=null; }
function classic(){ try{ localStorage.setItem('dcd_view','classic'); }catch(e){} leave(); showScreen('project'); }
window.addEventListener('resize',()=>{ if(running){ resize(); fitCam(); } });

/* ---------- Personajes: nombre y apariencia de cada agente ---------- */
const AGENT_DEF=AGENTS.map(a=>({k:a.k, n:a.n, look:Object.assign({},a.look)}));
const HAIRS=[[0,'Corto'],[1,'Largo'],[2,'Moño'],[3,'Rapado']];
const LOOK_PAL={
  skin:['#f6dccb','#f3cdb0','#e7b896','#e2ae86','#c98c62','#a46f48','#76503a','#4e3326'],
  hair:['#161616','#2b1d16','#4a2f22','#6b4423','#a8642c','#d9a441','#d9d2c3','#7d808c','#b0476a','#2e86ab'],
  shirt:['#164a98','#2e86ab','#d6424a','#7b5ea7','#23a596','#f2a541','#3fa66f','#e86a92','#2b2b33','#f4f1ea'],
  pants:['#2f3542','#34466b','#3f3f46','#5a4636','#6a5a48','#1f3b5c','#7d808c','#e9e2d3']};
const LOOK_LBL={skin:'Piel',hair:'Cabello',shirt:'Camisa',pants:'Pantalón'};
const HEX=/^#[0-9a-f]{6}$/i;
let charSel='peche';
// Lo guardado manda sobre lo de fábrica; un valor dañado vuelve al original
function applyChars(){ const ch=officeCfg().chars||{};
  AGENTS.forEach(a=>{ const d=AGENT_DEF.find(x=>x.k===a.k); const o=(ch[a.k]&&typeof ch[a.k]==='object')?ch[a.k]:{}; const L=Object.assign({},d.look);
    Object.entries(o.look||{}).forEach(([k,v])=>{ if(k==='hs'){ if([0,1,2,3].includes(+v)) L.hs=+v; } else if(k in LOOK_PAL && HEX.test(String(v))) L[k]=String(v); });
    a.n=String(o.n||'').replace(/\s+/g,' ').trim().slice(0,24)||d.n; a.look=L;
    const p=people.find(q=>q.k===a.k); if(p){ p.look=L; p.name=a.n; } }); }
function charPatch(k,fn){ const c=officeCfg(); c.chars=(c.chars&&typeof c.chars==='object')?c.chars:{}; const cur=Object.assign({look:{}},c.chars[k]||{}); fn(cur); c.chars[k]=cur; saveOfficeCfg(c); applyChars(); }
function charOpen(k){ if(AGENTS.some(a=>a.k===k)) charSel=k; openPanel('personajes'); charFillName(); }
function charPick(k){ charSel=k; renderPanel(); charFillName(); }
function charFillName(){ const el=document.getElementById('of-chn'); const a=AGENTS.find(x=>x.k===charSel); if(el&&a) el.value=a.n; }
function charLook(part,val){ if(part==='hs'){ val=+val; if(![0,1,2,3].includes(val)) return; } else if(!(part in LOOK_PAL)||!HEX.test(String(val))) return;
  charPatch(charSel,o=>{ o.look=Object.assign({},o.look,{[part]:val}); }); refresh(); }
function charName(){ const el=document.getElementById('of-chn'); if(!el) return; const v=el.value.replace(/\s+/g,' ').trim().slice(0,24);
  charPatch(charSel,o=>{ o.n=v; }); refresh(); charFillName(); toast(v?`✓ Ahora se llama ${v}`:'✓ Volvió a su nombre original','success'); }
function charRandom(){ const r=l=>l[Math.floor(Math.random()*l.length)];
  charPatch(charSel,o=>{ o.look={skin:r(LOOK_PAL.skin),hair:r(LOOK_PAL.hair),shirt:r(LOOK_PAL.shirt),pants:r(LOOK_PAL.pants),hs:r(HAIRS)[0]}; }); refresh(); }
function charReset(){ const c=officeCfg(); if(c.chars) delete c.chars[charSel]; saveOfficeCfg(c); applyChars(); refresh(); charFillName(); toast('✓ Personaje como al inicio','success'); }
function panelPersonajes(){
  const a=AGENTS.find(x=>x.k===charSel)||AGENTS[0]; const d=AGENT_DEF.find(x=>x.k===a.k); const L=a.look;
  const sw=part=>`<div class="of-sw">${LOOK_PAL[part].map(c=>`<button style="background:${c}" class="${c.toLowerCase()===String(L[part]).toLowerCase()?'on':''}" aria-label="${LOOK_LBL[part]} ${c}" onclick="Office.charLook('${part}','${c}')"></button>`).join('')}<input type="color" value="${attr(L[part])}" aria-label="Otro color de ${LOOK_LBL[part].toLowerCase()}" title="Otro color" onchange="Office.charLook('${part}',this.value)"></div>`;
  return `<button class="of-close" onclick="Office.closePanel()" aria-label="Cerrar">×</button><div class="of-ph"><div><h3>Personajes</h3><div class="sub">Se guardan en tu navegador y en tu respaldo de Drive</div></div></div>
    <div class="of-chars">${AGENTS.map(x=>`<button class="${x.k===a.k?'on':''}" aria-pressed="${x.k===a.k}" onclick="Office.charPick('${x.k}')" title="${attr(x.n)}" aria-label="${attr(x.n)}">${avatar(x.k)}</button>`).join('')}</div>
    <div class="of-chbig">${avatar(a.k)}</div>
    <div class="of-note" style="text-align:center;margin-top:0">${esc(a.role)}</div>
    <div class="of-sec"><h4>Nombre</h4><div class="of-row" style="margin-top:0"><input class="of-in" id="of-chn" maxlength="24" value="${attr(a.n)}" placeholder="${attr(d.n)}" aria-label="Nombre del personaje" onkeydown="if(event.key==='Enter')Office.charName()" style="flex:1"><button class="of-btn sm pri" onclick="Office.charName()">Guardar</button></div></div>
    <div class="of-sec"><h4>Peinado</h4><div class="of-row" style="margin-top:0">${HAIRS.map(([v,n])=>`<button class="of-btn sm ${L.hs===v?'ink':''}" aria-pressed="${L.hs===v}" onclick="Office.charLook('hs',${v})">${n}</button>`).join('')}</div></div>
    ${['skin','hair','shirt','pants'].map(part=>`<div class="of-sec"><h4>${LOOK_LBL[part]}</h4>${sw(part)}</div>`).join('')}
    <div class="of-row" style="margin-top:14px"><button class="of-btn" onclick="Office.charRandom()">🎲 Al azar</button><button class="of-btn sm" onclick="Office.charReset()">Como al inicio</button></div>`;
}
/* ---------- Decorar la oficina ---------- */
const DECOR=[ // lo que se puede agregar y quitar
  {t:'rug',n:'Alfombra'},{t:'plant',n:'Planta'},{t:'monstera',n:'Monstera'},{t:'lamp',n:'Lámpara'},{t:'sofa',n:'Sillón'},
  {t:'shelf',n:'Librero'},{t:'printer',n:'Impresora'},{t:'cooler',n:'Agua'},{t:'coffee',n:'Cafetera'}];
const TNAME={rug:'Alfombra',plant:'Planta',monstera:'Monstera',lamp:'Lámpara',sofa:'Sillón',shelf:'Librero',printer:'Impresora',cooler:'Agua',coffee:'Cafetera',desk:'Escritorio',board:'Pizarra',trophy:'Vitrina del Tomo II',server:'Servidor',arcade:'Arcade',mailbox:'Buzón',jukebox:'Rocola'};
const PALETTE={rug:['#2f9c8a','#5b6fb8','#d9573b','#e0a030','#b0476a','#7b5ea7','#3f3f46','#e9e2d3'],sofa:['#c9663d','#4f8a72','#5b6fb8','#b0476a','#3f3f46','#e0a030'],desk:['#164a98','#2e86ab','#d6424a','#7b5ea7','#23a596','#f2a541','#3fa66f','#e86a92','#3f3f46']};
let edit=null; // {mode:'select'|'place'|'move', type, sel, rot, color}
const canDelete=o=>DECOR.some(d=>d.t===o.t);
function approachTiles(){ return objs.filter(o=>o.t==='desk').map(o=>{ const f=frontTile(o); return f.x+','+f.y; }); }
function canPlaceAt(t,x,y,self){ if(!inB(x,y)) return false; if(CAT[t].floor){ const r=rugAt(x,y); return !r||r===self; }
  if(x===0&&y===DOOR_Y) return false; const o=objAt(x,y); if(o&&o!==self) return false;
  if(approachTiles().includes(x+','+y)&&!(self&&self.t==='desk')) return false;
  if(people.some(p=>p.sitting==null&&Math.floor(p.x)===x&&Math.floor(p.y)===y)) return false; return true; }
function saveLayout(){ const c=officeCfg(); c.layout=objs.map(o=>({t:o.t,x:o.x,y:o.y,r:o.r,c:o.c,owner:o.owner||null})); saveOfficeCfg(c); }
function resettle(){ for(const p of people){ const d=byId[p.desk]; if(p.sitting!=null) sitAt(p,d); else if(p.state==='walking'||p.state==='break'||p.state==='standing'){ p.atSlot=false; p.slot=null; p.path=[]; sitAt(p,d); } } recomputeSlots(); }
function editStart(){ edit={mode:'select',type:null,sel:null,rot:0,color:null}; for(const p of people){ if(p.sitting==null){ p.atSlot=false; p.slot=null; sitAt(p,byId[p.desk]); } } openPanel('decorar'); cv.classList.add('editing'); }
function editEnd(){ if(!edit) return; edit=null; saveLayout(); resettle(); cv.classList.remove('editing'); closePanel(); toast('✓ Oficina guardada'+(gAccessToken?' (también en tu respaldo de Drive)':''),'success'); }
function editPick(t){ if(!edit) return; edit.mode='place'; edit.type=t; edit.sel=null; edit.rot=0; edit.color=PALETTE[t]?PALETTE[t][0]:null; renderPanel(); }
function editCancel(){ if(!edit) return; edit.mode='select'; edit.type=null; renderPanel(); }
function editClick(mx,my){ const t=screenToTile(mx,my);
  if(edit.mode==='place'){ if(!canPlaceAt(edit.type,t.x,t.y)){ toast('Esa casilla está ocupada o la necesita alguien para pasar','error'); return; } add(edit.type,t.x,t.y,edit.rot,edit.color); saveLayout(); recomputeSlots(); floatTxt(t.x+.5,t.y+.5,'+','#1f9e8f'); return; }
  if(edit.mode==='move'){ const o=byId[edit.sel]; if(!o) { edit.mode='select'; return; } if(!canPlaceAt(o.t,t.x,t.y,o)){ toast('No se puede poner ahí','error'); return; } o.x=t.x; o.y=t.y; const p=people.find(q=>q.desk===o.id); if(p) sitAt(p,o); edit.mode='select'; saveLayout(); recomputeSlots(); renderPanel(); return; }
  // seleccionar: primero un mueble (también tocando su parte alta), si no, la alfombra
  let o=null; for(let dz=0;dz<=1.6&&!o;dz+=.2){ const q=screenToTile(mx,my+dz*TZ*cam.z); const c=inB(q.x,q.y)?objAt(q.x,q.y):null; if(c&&CAT[c.t].h>=dz) o=c; }
  if(!o) o=inB(t.x,t.y)?rugAt(t.x,t.y):null;
  edit.sel=o?o.id:null; renderPanel(); }
function editRotate(){ if(!edit) return; if(edit.mode==='place'){ edit.rot=(edit.rot+1)%4; return; } const o=byId[edit.sel]; if(!o) return; o.r=(o.r+1)%4; const p=people.find(q=>q.desk===o.id); if(p) sitAt(p,o); saveLayout(); recomputeSlots(); }
function editMove(){ if(edit&&byId[edit.sel]){ edit.mode='move'; renderPanel(); } }
function editColor(col){ if(!edit) return; if(edit.mode==='place'){ edit.color=col; renderPanel(); return; } const o=byId[edit.sel]; if(!o) return; o.c=col; saveLayout(); renderPanel(); }
function editDelete(){ const o=edit&&byId[edit.sel]; if(!o||!canDelete(o)) return; objs=objs.filter(q=>q!==o); delete byId[o.id]; edit.sel=null; saveLayout(); recomputeSlots(); renderPanel(); }
function editReset(){ if(!confirm('¿Volver a la oficina original? Se pierden los muebles que agregaste y los cambios de lugar.')) return; const c=officeCfg(); delete c.layout; saveOfficeCfg(c); buildScene(); edit={mode:'select',type:null,sel:null,rot:0,color:null}; renderPanel(); }
function swatches(list,cur,fn){ return `<div class="of-sw">${list.map(c=>`<button style="background:${c}" class="${c===cur?'on':''}" aria-label="Color ${c}" onclick="Office.${fn}('${c}')"></button>`).join('')}</div>`; }
function panelDecorar(){
  const o=edit&&byId[edit.sel]; const colorable=t=>PALETTE[t];
  let body=`<div class="of-sec" style="border-top:0;margin-top:6px;padding-top:0"><h4>Agregar</h4><div class="of-cat">${DECOR.map(d=>`<button class="${edit?.mode==='place'&&edit.type===d.t?'on':''}" onclick="Office.editPick('${d.t}')"><canvas data-dprev="${d.t}" width="96" height="84" aria-hidden="true"></canvas><span>${d.n}</span></button>`).join('')}</div></div>`;
  if(edit?.mode==='place'){ body+=`<div class="of-item"><div class="t">Colocando: ${esc(TNAME[edit.type])}</div><div class="m">Tocá una casilla libre del piso. Podés poner varios seguidos.</div>${colorable(edit.type)?swatches(PALETTE[edit.type],edit.color,'editColor'):''}<div class="of-row"><button class="of-btn sm" onclick="Office.editRotate();Office.refresh()">↻ Girar (R)</button><button class="of-btn sm" onclick="Office.editCancel()">Listo con este</button></div></div>`; }
  else if(o){ body+=`<div class="of-item"><div class="t">${esc(TNAME[o.t]||o.t)}${o.owner?' de '+esc(AGENTS.find(a=>a.k===o.owner)?.n||''):''}</div>${edit.mode==='move'?'<div class="of-warn">Tocá la casilla nueva.</div>':''}${colorable(o.t)?swatches(PALETTE[o.t],o.c,'editColor'):''}<div class="of-row"><button class="of-btn sm" onclick="Office.editRotate()">↻ Girar (R)</button><button class="of-btn sm ${edit.mode==='move'?'ink':''}" onclick="Office.editMove()">✥ Mover</button>${canDelete(o)?`<button class="of-btn sm" onclick="Office.editDelete()">Quitar</button>`:''}</div>${canDelete(o)?'':'<div class="of-note">Los escritorios de los agentes y los objetos con función se pueden mover y girar, pero no quitar.</div>'}</div>`; }
  else body+=`<div class="of-note">Tocá un mueble o una alfombra para girarlo, moverlo, cambiarle el color o quitarlo.</div>`;
  return `<button class="of-close" onclick="Office.editEnd()" aria-label="Terminar">×</button><div class="of-ph"><div><h3>Decorar la oficina</h3><div class="sub">Se guarda en tu navegador y en tu respaldo de Drive</div></div></div>${body}
    <div class="of-sec"><h4>Personajes</h4><div class="of-chars">${AGENTS.map(a=>`<button onclick="Office.charOpen('${a.k}')" title="Editar a ${attr(a.n)}" aria-label="Editar a ${attr(a.n)}">${avatar(a.k)}</button>`).join('')}</div></div>
    <div class="of-row" style="margin-top:14px"><button class="of-btn pri" onclick="Office.editEnd()">Listo</button><button class="of-btn sm" onclick="Office.editReset()">Volver a la original</button></div>`;
}
function paintDecorPreviews(){ panel.querySelectorAll('canvas[data-dprev]').forEach(cn=>{ const t=cn.dataset.dprev; const c=cn.getContext('2d'); c.clearRect(0,0,96,84); c.save(); c.scale(1.5,1.5); c.translate(32,34); const o={id:7,t,x:-.5,y:-.5,r:0,c:PALETTE[t]?PALETTE[t][0]:null,occ:null}; if(CAT[t].floor){ poly(c,[iso(-.5,-.5),iso(.5,-.5),iso(.5,.5),iso(-.5,.5)],o.c); } else { const g0=GLOWS.length; drawObj(c,o,1); GLOWS.length=g0; } c.restore(); }); }

/* ---------- Rocola (YouTube) ---------- */
const DEFAULT_STATIONS=[{n:'Lofi Girl · beats para estudiar',u:'https://www.youtube.com/watch?v=jfKfPfyJRdk'},{n:'Lofi Girl · synthwave',u:'https://www.youtube.com/watch?v=4xDzrJKXOOY'},{n:'Chillhop · jazz y lofi',u:'https://www.youtube.com/watch?v=5yx6BWlEVcY'}];
const JB={player:null,ready:false,playing:false,title:'',url:'',err:'',vol:60,show:false,apiP:null};
function ytParse(u){ u=String(u||'').trim(); const id=(u.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/|\/shorts\/)([\w-]{11})/)||[])[1]||(/^[\w-]{11}$/.test(u)?u:''); const list=(u.match(/[?&]list=([\w-]+)/)||[])[1]||''; return {id,list}; }
function stations(){ const s=officeCfg().stations; return Array.isArray(s)&&s.length?s:DEFAULT_STATIONS.slice(); }
function saveStations(s){ const c=officeCfg(); c.stations=s; saveOfficeCfg(c); }
function ytApi(){ if(window.YT&&YT.Player) return Promise.resolve(); if(JB.apiP) return JB.apiP; JB.apiP=new Promise((res,rej)=>{ const prev=window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady=()=>{ if(prev) try{prev();}catch(e){} res(); }; const s=document.createElement('script'); s.src='https://www.youtube.com/iframe_api'; s.onerror=()=>{ JB.apiP=null; rej(new Error('No se pudo cargar YouTube')); }; document.head.appendChild(s); }); return JB.apiP; }
function jbBox(){ let b=document.getElementById('of-yt'); if(b) return b; b=document.createElement('div'); b.id='of-yt'; b.className='of-card'; b.hidden=true;
  b.innerHTML=`<div class="of-yt-head"><span class="of-yt-t" id="of-yt-t">Rocola</span><button onclick="Office.jbToggle()" id="of-yt-pp" aria-label="Pausar o reproducir">❚❚</button><button onclick="Office.jbShow()" aria-label="Agrandar o achicar el video" title="Agrandar o achicar el video">▭</button><button onclick="Office.jbStop()" aria-label="Apagar la música" title="Apagar">×</button></div><div class="of-yt-v" id="of-yt-v"><div id="of-yt-frame"></div></div>`;
  document.body.appendChild(b); return b; }
function jbPaint(){ const b=document.getElementById('of-yt'); if(!b) return; b.hidden=!JB.url; b.classList.toggle('big',JB.show); const t=document.getElementById('of-yt-t'); if(t) t.textContent=(JB.playing?'♪ ':'')+(JB.title||'Rocola'); const pp=document.getElementById('of-yt-pp'); if(pp) pp.textContent=JB.playing?'❚❚':'▶'; if(panelKey==='rocola') renderPanel(); }
async function jbPlay(url){ const {id,list}=ytParse(url); if(!id&&!list){ toast('Ese enlace no parece de YouTube','error'); return; }
  JB.url=url; JB.err=''; JB.title='Cargando…'; jbBox(); jbPaint();
  try{ await ytApi(); }catch(e){ JB.err='No se pudo cargar el reproductor de YouTube (revisá la conexión).'; jbPaint(); return; }
  const vars={autoplay:1,playsinline:1,rel:0,modestbranding:1}; if(list) Object.assign(vars,{listType:'playlist',list}); if(/^https?:/.test(location.protocol)) vars.origin=location.origin;
  if(JB.player&&JB.ready){ if(id) JB.player.loadVideoById(id); else JB.player.loadPlaylist({list,listType:'playlist'}); JB.player.setVolume(JB.vol); return; }
  JB.player=new YT.Player('of-yt-frame',{width:'100%',height:'100%',videoId:id||undefined,playerVars:vars,events:{
    onReady:e=>{ JB.ready=true; e.target.setVolume(JB.vol); e.target.playVideo(); },
    onStateChange:e=>{ JB.playing=e.data===1; if(e.data===1||e.data===5){ try{ JB.title=e.target.getVideoData().title||JB.title; }catch(_){} } jbPaint(); },
    onError:e=>{ JB.playing=false; JB.err=[101,150,153].includes(e.data)?'YouTube no deja reproducir este video dentro de la app. Si abriste la app como archivo desde tu computadora, abrila desde una dirección web; si no, probá otro directo.':'YouTube no pudo reproducir ese enlace.'; JB.title='Sin reproducir'; jbPaint(); } }});
}
function jbToggle(){ if(!JB.player||!JB.ready) return; if(JB.playing) JB.player.pauseVideo(); else JB.player.playVideo(); }
function jbStop(){ try{ JB.player&&JB.ready&&JB.player.stopVideo(); }catch(e){} JB.playing=false; JB.url=''; JB.title=''; jbPaint(); }
function jbShow(){ JB.show=!JB.show; jbPaint(); }
function jbVol(v){ JB.vol=+v; try{ JB.player&&JB.ready&&JB.player.setVolume(JB.vol); }catch(e){} const c=officeCfg(); c.vol=JB.vol; saveOfficeCfg(c); }
function jbAdd(){ const u=document.getElementById('of-jb-url').value.trim(), n=document.getElementById('of-jb-name').value.trim(); if(!ytParse(u).id&&!ytParse(u).list){ toast('Pegá un enlace de YouTube','error'); return; } const s=stations(); s.unshift({n:n||'Mi estación',u}); saveStations(s); document.getElementById('of-jb-url').value=''; document.getElementById('of-jb-name').value=''; jbPlay(u); renderPanel(); }
function jbPlayInput(){ const u=document.getElementById('of-jb-url').value.trim(); if(u) jbPlay(u); }
function jbDel(i){ const s=stations(); s.splice(i,1); saveStations(s); renderPanel(); }
function jbPlayIdx(i){ const s=stations()[i]; if(s) jbPlay(s.u); }
function panelRocola(){ const S=stations();
  return `<button class="of-close" onclick="Office.closePanel()" aria-label="Cerrar">×</button><div class="of-ph"><div><h3>Rocola</h3><div class="sub">Música de YouTube para la oficina</div></div></div>
    <div class="of-say">${JB.url?`${JB.playing?'Sonando':'En pausa'}: <strong>${esc(JB.title)}</strong>`:'Elegí una estación o pegá un enlace de YouTube (un video, un directo o una lista).'}</div>
    ${JB.err?`<div class="of-warn">${esc(JB.err)}${JB.url?` <a href="${attr(JB.url)}" target="_blank" rel="noopener">Abrir en YouTube</a>`:''}</div>`:''}
    ${JB.url?`<div class="of-row"><button class="of-btn ink sm" onclick="Office.jbToggle()">${JB.playing?'❚❚ Pausar':'▶ Reproducir'}</button><button class="of-btn sm" onclick="Office.jbShow()">${JB.show?'Video pequeño':'Video grande'}</button><button class="of-btn sm" onclick="Office.jbStop()">Apagar</button></div>`:''}
    <label class="of-lb" for="of-jb-vol">Volumen</label><input type="range" id="of-jb-vol" min="0" max="100" value="${JB.vol}" oninput="Office.jbVol(this.value)" style="width:100%">
    <div class="of-sec"><h4>Estaciones</h4>${S.map((s,i)=>`<div class="of-item" style="display:flex;gap:8px;align-items:center;padding:8px 10px"><button class="of-btn sm ${JB.url===s.u?'pri':''}" onclick="Office.jbPlayIdx(${i})" aria-label="Reproducir ${attr(s.n)}">▶</button><div style="flex:1;min-width:0"><div class="t" style="font-size:13px">${esc(s.n)}</div><div class="m" style="margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.u)}</div></div><button class="of-btn sm" onclick="Office.jbDel(${i})" aria-label="Quitar estación">×</button></div>`).join('')}</div>
    <div class="of-sec"><h4>Agregar un enlace</h4><input class="of-in" id="of-jb-url" placeholder="https://www.youtube.com/watch?v=…"><input class="of-in" id="of-jb-name" placeholder="Nombre (opcional)" style="margin-top:6px"><div class="of-row"><button class="of-btn pri sm" onclick="Office.jbAdd()">Guardar y reproducir</button><button class="of-btn sm" onclick="Office.jbPlayInput()">Solo reproducir</button></div></div>
    <div class="of-note">YouTube pide que el video quede visible; por eso aparece un reproductor pequeño abajo a la izquierda. La música sigue aunque cambiés de pantalla.</div>`;
}

/* ---------- Arcade: menú, pausa y cuatro juegos ---------- */
const GW=360, GH=480;
const G={on:false, view:'menu', paused:false, mode:'cafe', gen:0};
try{ G.mode=localStorage.getItem('dcd_game_mode')||'cafe'; }catch(e){}
const GAMES={
  cafe:{t:'Café y comentarios', p:'Mové la taza con el mouse, el dedo o las flechas. Atrapá cafés y documentos aprobados; esquivá los comentarios rojos.', k:'dcd_game_best', col:'#ff6a3d', d:'Atrapá cafés y documentos aprobados.'},
  jump:{t:'Toggle Jump', p:'Tocá la pantalla o la barra espaciadora para invertir la gravedad y saltar entre el piso y el techo.', k:'dcd_game_best_jump', col:'#5ad1c8', d:'Invertí la gravedad y esquivá los comentarios.'},
  doodle:{t:'Doodle Jump', p:'Peche salta solo. Movelo con las flechas, con el mouse o tocando a la izquierda o a la derecha. Los resortes lo lanzan más alto y las plataformas cafés se rompen.', k:'dcd_game_best_doodle', col:'#3fa66f', d:'Subí de plataforma en plataforma sin caer.'},
  pac:{t:'Pac-Man', p:'Movete con las flechas o deslizando el dedo. Comé todos los puntos; con un café grande los comentarios se vuelven azules y te los podés comer.', k:'dcd_game_best_pac', col:'#ffd23f', d:'Comé los puntos y escapá de los comentarios.'},
};
const gEl=id=>document.getElementById(id);
function bestOf(m){ try{ return parseInt(localStorage.getItem(GAMES[m].k)||'0',10)||0; }catch(e){ return 0; } }
function gameOpen(){ gEl('of-game').classList.add('on'); gameMenu(); }
function gameClose(){ gEl('of-game').classList.remove('on'); G.on=false; G.gen++; }
function gameMenu(){ G.on=false; G.gen++; G.view='menu'; G.paused=false;
  gEl('of-gmenu-v').hidden=false; gEl('of-gplay').hidden=true; gEl('of-gt').textContent='Arcade';
  gEl('of-gmenu-v').innerHTML=Object.entries(GAMES).map(([k,g])=>`<button class="of-gcard" onclick="Office.gameMode('${k}')"><canvas data-gprev="${k}" width="120" height="90" aria-hidden="true"></canvas><span><b>${g.t}</b><small>${g.d}</small><em>Récord ${bestOf(k)}</em></span></button>`).join('');
  gEl('of-gmenu-v').querySelectorAll('canvas[data-gprev]').forEach(cv=>drawPreview(cv.getContext('2d'),cv.dataset.gprev));
  paintGameBar(); }
function gameMode(m){ G.mode=m; try{ localStorage.setItem('dcd_game_mode',m); }catch(e){} gameStart(); }
function gameStart(){ const I=GAMES[G.mode]||GAMES.cafe; G.view='play';
  gEl('of-gmenu-v').hidden=true; gEl('of-gplay').hidden=false; gEl('of-gt').textContent=I.t; gEl('of-gp').textContent=I.p;
  const cvg=gEl('of-gcv'); Object.assign(G,{on:true,paused:false,over:false,c:cvg.getContext('2d'),t:0,last:0,score:0,keys:{},s:{}});
  G.best=bestOf(G.mode); INIT[G.mode](); paintGameBar();
  const gen=++G.gen; requestAnimationFrame(ts=>gameFrame(ts,gen)); }
function gamePause(v){ if(G.view!=='play'||G.over) return; G.paused=v===undefined?!G.paused:!!v; G.last=0; paintGameBar(); if(G.paused) drawPaused(); }
function paintGameBar(){ const play=G.view==='play'; gEl('of-gpause').hidden=!play||G.over; gEl('of-grestart').hidden=!play; gEl('of-gback').hidden=!play;
  gEl('of-gpause').innerHTML=G.paused?'▶ Reanudar':'❚❚ Pausa'; gEl('of-gpause').classList.toggle('pri',G.paused);
  gEl('of-gscore').textContent=play?G.score+' puntos':''; gEl('of-gbest').textContent=play?'Récord '+G.best:''; }
function gameFrame(ts,gen){ if(!G.on||gen!==G.gen) return; const t=ts/1000; const dt=G.last?Math.min(.05,t-G.last):0; G.last=t;
  if(!G.paused&&!G.over){ G.t+=dt; FRAME[G.mode](dt); gEl('of-gscore').textContent=G.score+' puntos'; if(G.over) gameOver(); }
  requestAnimationFrame(ts2=>gameFrame(ts2,gen)); }
function gameOver(){ const I=GAMES[G.mode]; if(G.score>G.best){ G.best=G.score; try{ localStorage.setItem(I.k,String(G.best)); }catch(e){} }
  const c=G.c; c.save(); c.fillStyle='rgba(10,12,30,.62)'; c.fillRect(0,0,GW,GH); c.fillStyle='#fff'; c.textAlign='center'; c.font='800 26px "Bricolage Grotesque",sans-serif'; c.fillText(G.won?'¡Nivel superado!':'¡Fin del turno!',GW/2,214); c.font='600 15px "Nunito Sans",sans-serif'; c.fillText(`${G.score} puntos · récord ${G.best}`,GW/2,242); c.font='600 13px "Nunito Sans",sans-serif'; c.fillText('Tocá para jugar de nuevo',GW/2,272); c.restore(); paintGameBar(); }
function drawPaused(){ const c=G.c; c.save(); c.fillStyle='rgba(10,12,30,.55)'; c.fillRect(0,0,GW,GH); c.fillStyle='#fff'; c.textAlign='center'; c.font='800 28px "Bricolage Grotesque",sans-serif'; c.fillText('En pausa',GW/2,226); c.font='600 13px "Nunito Sans",sans-serif'; c.fillText('Tocá «Reanudar» o la tecla P',GW/2,252); c.restore(); }
function bg(c,a,b){ const g=c.createLinearGradient(0,0,0,GH); g.addColorStop(0,a); g.addColorStop(1,b); c.fillStyle=g; c.fillRect(0,0,GW,GH); }
function drawCup(c){ c.fillStyle='#fffdf8'; rr(c,-10,-10,20,20,4); c.fill(); c.fillStyle='#8a5a3c'; c.fillRect(-8,-7,16,4); c.strokeStyle='#fffdf8'; c.lineWidth=3; c.beginPath(); c.arc(11,0,5,-Math.PI/2,Math.PI/2); c.stroke(); }
function drawBug(c,w,h){ c.fillStyle='#d6424a'; rr(c,-w/2,-h/2,w,h,6); c.fill(); c.fillStyle='#fff'; c.font='900 13px "Nunito Sans",sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('!',0,0); }
function drawPeche(c,flip){ const run=Math.sin(G.t*18)*4; c.save(); if(flip) c.scale(1,-1); c.fillStyle='#2f3542'; c.fillRect(-6+run*.5,4,4,8); c.fillRect(2-run*.5,4,4,8);
  c.fillStyle='#164a98'; rr(c,-8,-8,16,14,4); c.fill(); c.fillStyle='#e2ae86'; c.beginPath(); c.arc(0,-13,6,0,Math.PI*2); c.fill(); c.fillStyle='#2b1d16'; c.beginPath(); c.arc(0,-15,6,Math.PI,0); c.fill(); c.fillStyle='#2b2420'; c.fillRect(2,-13,2,2); c.restore(); }
function drawPreview(c,k){ c.save(); const g=c.createLinearGradient(0,0,0,90); g.addColorStop(0,'#1d2550'); g.addColorStop(1,'#3b3a72'); c.fillStyle=g; c.fillRect(0,0,120,90);
  if(k==='cafe'){ c.translate(40,30); drawCup(c); c.translate(40,20); drawBug(c,22,16); c.setTransform(1,0,0,1,0,0); c.fillStyle='#ff6a3d'; rr(c,35,72,50,10,5); c.fill(); }
  else if(k==='jump'){ c.fillStyle='#efe9de'; c.fillRect(0,0,120,18); c.fillStyle='#e2bf92'; c.fillRect(0,72,120,18); c.fillStyle='#ff6a3d'; c.fillRect(0,18,120,2); c.fillRect(0,70,120,2); c.translate(30,60); drawPeche(c); c.setTransform(1,0,0,1,0,0); c.translate(80,36); drawBug(c,18,32); }
  else if(k==='doodle'){ c.fillStyle='#fdf8ec'; c.fillRect(0,0,120,90); c.strokeStyle='rgba(80,120,180,.18)'; for(let x=0;x<120;x+=10){ c.beginPath(); c.moveTo(x,0); c.lineTo(x,90); c.stroke(); } for(let y=0;y<90;y+=10){ c.beginPath(); c.moveTo(0,y); c.lineTo(120,y); c.stroke(); } c.fillStyle='#3fa66f'; [[15,70],[60,48],[25,25]].forEach(([x,y])=>{ rr(c,x,y,36,7,3); c.fill(); }); c.translate(78,36); drawPeche(c); }
  else { c.fillStyle='#0b0f2a'; c.fillRect(0,0,120,90); c.strokeStyle='#3d6bff'; c.lineWidth=3; c.strokeRect(6,6,108,78); c.strokeRect(30,30,60,30); c.fillStyle='#ffd23f'; c.beginPath(); c.moveTo(22,72); c.arc(22,72,9,.6,Math.PI*2-.6); c.closePath(); c.fill(); c.fillStyle='#fff'; for(let x=40;x<110;x+=12){ c.fillRect(x,71,3,3); } c.fillStyle='#d6424a'; c.beginPath(); c.arc(98,18,8,Math.PI,0); c.lineTo(106,26); c.lineTo(90,26); c.fill(); }
  c.restore(); }

/* Café y comentarios */
const INIT={}, FRAME={};
INIT.cafe=()=>{ Object.assign(G.s,{x:180,items:[],lives:3,spawn:0}); };
FRAME.cafe=(dt)=>{ const S=G.s, c=G.c; if(G.keys.ArrowLeft) S.x-=320*dt; if(G.keys.ArrowRight) S.x+=320*dt; S.x=clamp(S.x,30,GW-30);
  S.spawn-=dt; const speed=1+G.t/40; if(S.spawn<=0){ S.spawn=Math.max(.28,.9-G.t/80); const r=Math.random(); S.items.push({x:rnd(20,GW-20),y:-20,k:r<.5?'cafe':r<.75?'doc':'bug',v:rnd(110,170)*speed}); }
  for(const it of S.items){ it.y+=it.v*dt; if(it.y>GH-62&&it.y<GH-30&&Math.abs(it.x-S.x)<34&&!it.hit){ it.hit=true; if(it.k==='bug') S.lives--; else G.score+=it.k==='doc'?3:1; } }
  S.items=S.items.filter(it=>!it.hit&&it.y<GH+20);
  bg(c,'#1d2550','#3b3a72'); c.fillStyle='rgba(255,255,255,.6)'; for(let i=0;i<30;i++) c.fillRect((i*97)%GW,(i*53+G.t*10*(i%3+1))%GH,1.5,1.5);
  for(const it of S.items){ c.save(); c.translate(it.x,it.y); if(it.k==='cafe') drawCup(c); else if(it.k==='doc'){ c.fillStyle='#fff'; c.fillRect(-10,-13,20,26); c.fillStyle='#ffd23f'; c.fillRect(-7,-8,14,3); c.fillRect(-7,-2,10,3); c.strokeStyle='#1e9e66'; c.lineWidth=3; c.beginPath(); c.moveTo(-5,6); c.lineTo(-1,10); c.lineTo(7,2); c.stroke(); } else drawBug(c,26,18); c.restore(); }
  c.fillStyle='#ff6a3d'; rr(c,S.x-30,GH-46,60,14,7); c.fill(); c.fillStyle='#c9482a'; c.fillRect(S.x-24,GH-32,48,6);
  c.fillStyle='#fff'; c.font='700 14px "Chakra Petch",monospace'; c.textAlign='left'; c.fillText('♥'.repeat(Math.max(0,S.lives)),12,24);
  if(S.lives<=0) G.over=true; };

/* Toggle Jump */
const JF=400, JC=80, PS=22, PX=78;
INIT.jump=()=>{ Object.assign(G.s,{py:JF-PS,vy:0,grav:1,dist:0,coffees:0,items:[],parts:[],spawn:.8}); };
function jumpToggle(){ const S=G.s; const onSurf=(S.grav>0&&S.py>=JF-PS-.5)||(S.grav<0&&S.py<=JC+.5); if(onSurf){ S.grav*=-1; S.vy=S.grav*-120; for(let i=0;i<8;i++) S.parts.push({x:PX+PS/2,y:S.py+(S.grav>0?0:PS),vx:rnd(-80,20),vy:rnd(-60,60),l:.4}); } }
FRAME.jump=(dt)=>{ const S=G.s, c=G.c; const speed=170+G.t*7; S.dist+=speed*dt;
  S.vy+=S.grav*2200*dt; S.py+=S.vy*dt; if(S.py>JF-PS){ S.py=JF-PS; S.vy=0; } if(S.py<JC){ S.py=JC; S.vy=0; }
  S.spawn-=dt; if(S.spawn<=0){ S.spawn=Math.max(.55,1.25-G.t/60)*rnd(.8,1.25); const top=Math.random()<.5; const h=rnd(46,Math.min(150,70+G.t*2.2)); S.items.push({k:'bug',x:GW+20,w:rnd(22,34),h,top}); if(Math.random()<.55) S.items.push({k:'cafe',x:GW+20+rnd(70,120),y:rnd(JC+40,JF-40)}); }
  for(const it of S.items) it.x-=speed*dt; S.items=S.items.filter(it=>it.x>-60&&!it.hit);
  for(const it of S.items){ if(it.k==='bug'){ const y0=it.top?JC:JF-it.h, y1=it.top?JC+it.h:JF; if(PX+PS-3>it.x-it.w/2&&PX+3<it.x+it.w/2&&S.py+PS-3>y0&&S.py+3<y1) G.over=true; } else if(Math.abs(it.x-(PX+PS/2))<20&&Math.abs(it.y-(S.py+PS/2))<22){ it.hit=true; S.coffees++; } }
  G.score=Math.floor(S.dist/40)+S.coffees*5;
  bg(c,'#1d2550','#3b3a72'); c.fillStyle='rgba(255,255,255,.55)'; for(let i=0;i<34;i++){ const sx=(((i*97-S.dist*.15*(i%3+1))%GW)+GW)%GW; c.fillRect(sx,(i*53)%GH,1.5,1.5); }
  c.fillStyle='#e2bf92'; c.fillRect(0,JF,GW,GH-JF); c.fillStyle='#c99460'; for(let x=-(S.dist%32);x<GW;x+=32) c.fillRect(x,JF,2,GH-JF); c.fillStyle='#ff6a3d'; c.fillRect(0,JF,GW,4);
  c.fillStyle='#efe9de'; c.fillRect(0,0,GW,JC); c.fillStyle='#d6cdbd'; for(let x=-(S.dist%48);x<GW;x+=48) c.fillRect(x,0,2,JC); c.fillStyle='#ff6a3d'; c.fillRect(0,JC-4,GW,4);
  for(const it of S.items){ c.save(); if(it.k==='bug'){ const y0=it.top?JC:JF-it.h; c.translate(it.x,y0+it.h/2); drawBug(c,it.w,it.h); } else { c.translate(it.x,it.y); drawCup(c); } c.restore(); }
  for(const pa of S.parts){ pa.l-=dt; pa.x+=pa.vx*dt; pa.y+=pa.vy*dt; } S.parts=S.parts.filter(pa=>pa.l>0); c.fillStyle='rgba(255,255,255,.7)'; for(const pa of S.parts) c.fillRect(pa.x,pa.y,3,3);
  c.save(); c.translate(PX+PS/2,S.py+PS/2); drawPeche(c,S.grav<0); c.restore();
  c.fillStyle='#1c2131'; c.font='700 13px "Chakra Petch",monospace'; c.textAlign='left'; c.fillText(`${Math.floor(S.dist/40)} m · ☕ ${S.coffees}`,12,JC-14);
  if(G.t<2.5){ c.fillStyle='rgba(255,255,255,.9)'; c.font='700 14px "Nunito Sans",sans-serif'; c.textAlign='center'; c.fillText('Tocá para invertir la gravedad',GW/2,240); } };

/* Doodle Jump */
const DPW=58, DPH=10;
function doodlePlat(y,lvl){ const r=Math.random(); const type= lvl>400&&r<.16?'break': lvl>200&&r<.34?'move':'normal'; return {x:rnd(4,GW-DPW-4),y,type,vx:type==='move'?rnd(50,90)*(Math.random()<.5?-1:1):0,spring:type==='normal'&&Math.random()<.09,gone:false}; }
INIT.doodle=()=>{ const S=G.s; Object.assign(S,{x:GW/2,y:GH-80,vx:0,vy:-650,plats:[],height:0,face:1,target:null});
  S.plats.push({x:GW/2-DPW/2,y:GH-40,type:'normal',vx:0,spring:false,gone:false}); let y=GH-40; while(y>-40){ y-=rnd(55,85); S.plats.push(doodlePlat(y,0)); } };
FRAME.doodle=(dt)=>{ const S=G.s, c=G.c;
  let ax=0; if(G.keys.ArrowLeft) ax=-1; if(G.keys.ArrowRight) ax=1;
  if(S.target!=null&&!ax){ const d=S.target-S.x; ax=Math.abs(d)>6?Math.sign(d):0; }
  S.vx=ax*300; if(ax) S.face=ax; S.x+=S.vx*dt; if(S.x<-14) S.x=GW+14; if(S.x>GW+14) S.x=-14;
  S.vy+=1500*dt; const oy=S.y; S.y+=S.vy*dt;
  if(S.vy>0){ for(const p of S.plats){ if(p.gone) continue; if(oy+14<=p.y&&S.y+14>=p.y&&S.x+10>p.x&&S.x-10<p.x+DPW){ if(p.type==='break'){ p.gone=true; p.fall=0; continue; } S.vy=p.spring&&Math.abs(S.x-(p.x+DPW/2))<18?-1050:-650; S.y=p.y-14; break; } } }
  for(const p of S.plats){ if(p.type==='move'){ p.x+=p.vx*dt; if(p.x<2||p.x>GW-DPW-2) p.vx*=-1; } if(p.gone) p.fall=(p.fall||0)+dt*300; }
  if(S.y<GH*.42){ const d=GH*.42-S.y; S.y+=d; S.height+=d; for(const p of S.plats) p.y+=d; }
  S.plats=S.plats.filter(p=>p.y<GH+30&&!(p.gone&&p.fall>200));
  let top=Math.min(...S.plats.map(p=>p.y)); const gap=Math.min(115,62+S.height/90);
  while(top>-30){ top-=rnd(gap*.7,gap); S.plats.push(doodlePlat(top,S.height/10)); }
  G.score=Math.floor(S.height/10);
  if(S.y>GH+30) G.over=true;
  c.fillStyle='#fdf8ec'; c.fillRect(0,0,GW,GH); c.strokeStyle='rgba(80,120,180,.16)'; c.lineWidth=1; const off=S.height%20;
  for(let x=0;x<GW;x+=20){ c.beginPath(); c.moveTo(x,0); c.lineTo(x,GH); c.stroke(); } for(let y=off;y<GH;y+=20){ c.beginPath(); c.moveTo(0,y); c.lineTo(GW,y); c.stroke(); }
  for(const p of S.plats){ c.save(); c.translate(0,p.fall||0); c.fillStyle=p.type==='break'?'#a8642c':p.type==='move'?'#2e86ab':'#3fa66f'; rr(c,p.x,p.y,DPW,DPH,4); c.fill(); c.strokeStyle='rgba(0,0,0,.25)'; c.stroke();
    if(p.type==='break'){ c.strokeStyle='#5a3d2a'; c.beginPath(); c.moveTo(p.x+DPW/2,p.y); c.lineTo(p.x+DPW/2-4,p.y+DPH); c.stroke(); }
    if(p.spring){ c.fillStyle='#9aa1ad'; c.fillRect(p.x+DPW/2-6,p.y-8,12,8); c.fillStyle='#d6424a'; c.fillRect(p.x+DPW/2-8,p.y-10,16,3); } c.restore(); }
  c.save(); c.translate(S.x,S.y); if(S.face<0) c.scale(-1,1); drawPeche(c); c.restore();
  c.fillStyle='#1c2131'; c.font='700 15px "Chakra Petch",monospace'; c.textAlign='left'; c.fillText(`${G.score} m`,12,24); };

/* Pac-Man */
const PMAP=["###############","#......#......#","#o##.#.#.#.##o#","#.............#","#.##.#####.##.#","#....#...#....#","####.#.#.#.####","#......#......#","#.#.##...##.#.#","#.#....#....#.#","#...##.#.##...#","##.#...P...#.##","#..#.#####.#..#","#o...........o#","#.####.#.####.#","#......#......#","###############"];
const PT=24, POY=44, PDIR={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1],a:[-1,0],d:[1,0],w:[0,-1],s:[0,1]};
const pWall=(x,y)=>y<0||y>=PMAP.length||x<0||x>=15||PMAP[y][x]==='#';
function pacLevel(keepScore){ const S=G.s; S.dots=new Set(); S.power=new Set();
  PMAP.forEach((r,y)=>[...r].forEach((ch,x)=>{ if(ch==='.') S.dots.add(x+','+y); if(ch==='o') S.power.add(x+','+y); }));
  pacReset(); }
function pacReset(){ const S=G.s; S.pac={x:7,y:11,dx:0,dy:0,nx:0,ny:0,mv:0};
  const cols=['#d6424a','#ff9ad5','#5ad1c8','#ffb340']; S.ghosts=[[6,8],[7,8],[8,8],[7,7]].slice(0,Math.min(4,2+S.level)).map(([x,y],i)=>({x,y,dx:0,dy:-1,mv:0,col:cols[i],wait:i*2.2,eaten:0}));
  S.fright=0; S.ready=1.4; }
INIT.pac=()=>{ Object.assign(G.s,{lives:3,level:1,mouth:0}); pacLevel(); };
function pacOpen(x,y,dx,dy){ return !pWall(x+dx,y+dy); }
// Movimiento por casillas: decide en el centro de cada casilla y avanza con interpolación
function pacMove(o,speed,dt,decide,arrive){
  if(o.mv===0) decide(o);
  if(!(o.dx||o.dy)) return;
  o.mv+=speed*dt;
  while(o.mv>=1){ o.x+=o.dx; o.y+=o.dy; o.mv-=1; if(arrive) arrive(o); decide(o); if(!(o.dx||o.dy)){ o.mv=0; break; } }
}
FRAME.pac=(dt)=>{ const S=G.s, c=G.c, p=S.pac;
  if(S.ready>0) S.ready-=dt;
  else {
    const spd=6+S.level*.3;
    if((p.nx||p.ny)&&p.nx===-p.dx&&p.ny===-p.dy&&p.mv>0){ p.x+=p.dx; p.y+=p.dy; p.mv=1-p.mv; p.dx=p.nx; p.dy=p.ny; }
    const decideP=o=>{ if((o.nx||o.ny)&&pacOpen(o.x,o.y,o.nx,o.ny)){ o.dx=o.nx; o.dy=o.ny; } else if(!pacOpen(o.x,o.y,o.dx,o.dy)){ o.dx=0; o.dy=0; } };
    const arriveP=o=>{ const k=o.x+','+o.y; if(S.dots.delete(k)) G.score+=10; if(S.power.delete(k)){ G.score+=50; S.fright=7; } };
    pacMove(p,spd,dt,decideP,arriveP);
    if(S.fright>0) S.fright-=dt;
    for(const g of S.ghosts){
      if(g.wait>0){ g.wait-=dt; continue; }
      if(g.eaten>0){ g.eaten-=dt; if(g.eaten<=0){ g.x=7; g.y=8; g.mv=0; g.dx=0; g.dy=-1; } continue; }
      const gs=(S.fright>0?3.4:4.6+S.level*.35);
      const chooseG=o=>{ const opts=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>pacOpen(o.x,o.y,dx,dy)&&!(dx===-o.dx&&dy===-o.dy)); const all=opts.length?opts:[[-o.dx,-o.dy]];
        let pick; if(S.fright>0||Math.random()<.22) pick=all[Math.floor(Math.random()*all.length)]; else pick=all.slice().sort((a,b)=>Math.hypot(o.x+a[0]-p.x,o.y+a[1]-p.y)-Math.hypot(o.x+b[0]-p.x,o.y+b[1]-p.y))[0]; o.dx=pick[0]; o.dy=pick[1]; };
      pacMove(g,gs,dt,chooseG);
    }
    // choques (posición interpolada)
    const pp={x:p.x+p.dx*p.mv,y:p.y+p.dy*p.mv};
    for(const g of S.ghosts){ if(g.wait>0||g.eaten>0) continue; const gp={x:g.x+g.dx*g.mv,y:g.y+g.dy*g.mv};
      if(Math.hypot(gp.x-pp.x,gp.y-pp.y)<.6){ if(S.fright>0){ g.eaten=3; g.x=-5; G.score+=200; } else { S.lives--; if(S.lives<=0){ G.over=true; } else pacReset(); return; } } }
    if(!S.dots.size&&!S.power.size){ S.level++; G.score+=500; pacLevel(); }
  }
  S.mouth+=dt*10;
  c.fillStyle='#0b0f2a'; c.fillRect(0,0,GW,GH);
  for(let y=0;y<PMAP.length;y++) for(let x=0;x<15;x++){ if(PMAP[y][x]!=='#') continue; c.fillStyle='#1b2a7a'; c.fillRect(x*PT,POY+y*PT,PT,PT); c.strokeStyle='#3d6bff'; c.lineWidth=2;
    if(!pWall(x,y-1)){ c.beginPath(); c.moveTo(x*PT,POY+y*PT+1); c.lineTo(x*PT+PT,POY+y*PT+1); c.stroke(); } if(!pWall(x,y+1)){ c.beginPath(); c.moveTo(x*PT,POY+y*PT+PT-1); c.lineTo(x*PT+PT,POY+y*PT+PT-1); c.stroke(); }
    if(!pWall(x-1,y)){ c.beginPath(); c.moveTo(x*PT+1,POY+y*PT); c.lineTo(x*PT+1,POY+y*PT+PT); c.stroke(); } if(!pWall(x+1,y)){ c.beginPath(); c.moveTo(x*PT+PT-1,POY+y*PT); c.lineTo(x*PT+PT-1,POY+y*PT+PT); c.stroke(); } }
  c.fillStyle='#ffe9c4'; S.dots.forEach(k=>{ const [x,y]=k.split(',').map(Number); c.fillRect(x*PT+PT/2-2,POY+y*PT+PT/2-2,4,4); });
  S.power.forEach(k=>{ const [x,y]=k.split(',').map(Number); c.save(); c.translate(x*PT+PT/2,POY+y*PT+PT/2); c.scale(.55,.55); if(Math.sin(G.t*6)>-.5) drawCup(c); c.restore(); });
  const pxy=o=>[(o.x+o.dx*o.mv)*PT+PT/2,POY+(o.y+o.dy*o.mv)*PT+PT/2];
  for(const g of S.ghosts){ if(g.eaten>0) continue; const [gx,gy]=pxy(g); const fr=S.fright>0; const blink=fr&&S.fright<2&&Math.sin(G.t*14)>0;
    c.fillStyle=fr?(blink?'#fff':'#3d6bff'):g.col; c.beginPath(); c.arc(gx,gy-2,9,Math.PI,0); c.lineTo(gx+9,gy+9); for(let i=0;i<4;i++) c.lineTo(gx+9-i*6-3,gy+(i%2?9:5)); c.lineTo(gx-9,gy+9); c.closePath(); c.fill();
    c.fillStyle='#fff'; c.beginPath(); c.arc(gx-3.5,gy-3,2.6,0,Math.PI*2); c.arc(gx+3.5,gy-3,2.6,0,Math.PI*2); c.fill(); c.fillStyle='#1c2131'; c.beginPath(); c.arc(gx-3.5+g.dx*1.2,gy-3+g.dy*1.2,1.2,0,Math.PI*2); c.arc(gx+3.5+g.dx*1.2,gy-3+g.dy*1.2,1.2,0,Math.PI*2); c.fill(); }
  const [px,py]=pxy(p); const ang=p.dx>0?0:p.dx<0?Math.PI:p.dy>0?Math.PI/2:p.dy<0?-Math.PI/2:0; const m=(Math.sin(S.mouth)+1)/2*.6+.08;
  c.fillStyle='#ffd23f'; c.beginPath(); c.moveTo(px,py); c.arc(px,py,10,ang+m,ang+Math.PI*2-m); c.closePath(); c.fill();
  c.fillStyle='#fff'; c.font='700 14px "Chakra Petch",monospace'; c.textAlign='left'; c.fillText(`Nivel ${S.level}`,10,26); c.textAlign='right'; c.fillStyle='#ffd23f'; c.fillText('●'.repeat(Math.max(0,S.lives)),GW-10,26);
  if(S.ready>0){ c.fillStyle='#ffd23f'; c.textAlign='center'; c.font='800 18px "Bricolage Grotesque",sans-serif'; c.fillText('¡Listos!',GW/2,POY+9*PT+18); } };

(function(){ const cvg=gEl('of-gcv'); let sw=null;
  cvg.addEventListener('pointermove',e=>{ if(!G.on) return; const r=cvg.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width*GW; if(G.mode==='cafe') G.s.x=clamp(x,30,GW-30); if(G.mode==='doodle'&&e.pointerType==='mouse') G.s.target=x; });
  cvg.addEventListener('pointerdown',e=>{ e.preventDefault(); if(G.view!=='play') return; if(G.over){ gameStart(); return; } if(G.paused){ gamePause(false); return; }
    const r=cvg.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width*GW;
    if(G.mode==='jump') jumpToggle(); else if(G.mode==='cafe') G.s.x=clamp(x,30,GW-30); else if(G.mode==='doodle') G.s.target=x; else if(G.mode==='pac') sw={x:e.clientX,y:e.clientY}; });
  cvg.addEventListener('pointerup',e=>{ if(G.mode==='doodle'&&e.pointerType!=='mouse') G.s.target=null; if(G.mode==='pac'&&sw){ const dx=e.clientX-sw.x, dy=e.clientY-sw.y; if(Math.hypot(dx,dy)>14){ const d=Math.abs(dx)>Math.abs(dy)?[Math.sign(dx),0]:[0,Math.sign(dy)]; G.s.pac.nx=d[0]; G.s.pac.ny=d[1]; } sw=null; } });
  window.addEventListener('keydown',e=>{ if(!gEl('of-game').classList.contains('on')) return;
    if(e.key==='Escape'){ if(G.view==='play') gameMenu(); else gameClose(); e.preventDefault(); return; }
    if(G.view!=='play') return;
    if(e.key==='p'||e.key==='P'){ gamePause(); e.preventDefault(); return; }
    if(G.over&&(e.key===' '||e.key==='Enter')){ gameStart(); e.preventDefault(); return; }
    if(G.paused) return;
    if(G.mode==='jump'&&(e.key===' '||e.key==='ArrowUp'||e.key==='ArrowDown')){ jumpToggle(); e.preventDefault(); return; }
    if(G.mode==='pac'&&PDIR[e.key]){ G.s.pac.nx=PDIR[e.key][0]; G.s.pac.ny=PDIR[e.key][1]; e.preventDefault(); return; }
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){ G.keys[e.key]=true; e.preventDefault(); } });
  window.addEventListener('keyup',e=>{ G.keys[e.key]=false; });
  window.addEventListener('blur',()=>{ if(G.on&&G.view==='play'&&!G.over) gamePause(true); });
  document.addEventListener('visibilitychange',()=>{ if(document.hidden&&G.on&&G.view==='play'&&!G.over) gamePause(true); });
  gEl('of-game').addEventListener('click',e=>{ if(e.target===e.currentTarget) gameClose(); });
  window.addEventListener('keydown',e=>{ if(e.key==='Escape'&&running&&!panel.hidden&&!document.querySelector('.overlay.active')&&!gEl('of-game').classList.contains('on')){ if(edit&&edit.mode!=='select'){ edit.mode='select'; edit.type=null; renderPanel(); } else if(edit) editEnd(); else closePanel(); } });
  window.addEventListener('keydown',e=>{ if(!edit||!running) return; const tg=e.target; if(tg&&/INPUT|TEXTAREA|SELECT/.test(tg.tagName)) return; if(e.key==='r'||e.key==='R'){ editRotate(); renderPanel(); e.preventDefault(); } if(e.key==='Delete'||e.key==='Backspace'){ editDelete(); e.preventDefault(); } });
  try{ const v=officeCfg().vol; if(v!=null) JB.vol=+v; }catch(e){}
})();

return {enter,leave,classic,openAgent,openPanel,closePanel,paintHud,refresh,filterPick,pick,showAllPick,checkMail,requestMail,processMail,processAll,setMailCourse,setMailKind,dismissMail,
  fixCopy,fixDownload,fixUpload,fixReview,fixDone,learnCopy,flowArchive,nuevoPrompt,nuevoImport,nuevoFile,nuevoOpen,nuevoMail,nuevoReset,biblioPick,biblioSave,biblioCheck,biblioFile,biblioToggle,biblioMode,biblioReset,biblioCopyPrompt,biblioExport,biblioImport,careerSet,careerAll,renPick,renApply,verSet,charOpen,charPick,charLook,charName,charRandom,charReset,dzSet,dzDownload,dzCopy,dzBig,ajustesSave,doSync,gameOpen,gameClose,gameStart,gameMode,gameMenu,gamePause,editStart,editEnd,editPick,editCancel,editRotate,editMove,editColor,editDelete,editReset,editToggle:()=>{ if(edit) editEnd(); else editStart(); },reloadLayout:()=>{ if(running&&!edit){ buildScene(); } else scenePid=null; },openRocola:()=>{ jbBox(); openPanel('rocola'); },jbPlay,jbToggle,jbStop,jbShow,jbVol,jbAdd,jbPlayInput,jbDel,jbPlayIdx,
  _t:{tileScreen:(x,y)=>{ const [sx,sy]=iso(x+.5,y+.5,0); const r=cv.getBoundingClientRect(); return [r.left+cam.x+sx*cam.z, r.top+cam.y+sy*cam.z]; }, objsAt:(x,y)=>objs.filter(o=>o.x===x&&o.y===y).map(o=>o.t+':'+o.c), parseMail,stripQuoted,findCourseIn,needOf,people:()=>people,inbox,flows,jobs}};
})();
// Los flujos de la oficina reciben los campos que antes iban al panel de revisión
(function(){ const orig=renderReviewItems; renderReviewItems=function(items,title){ if(window.__ofHook){ const h=window.__ofHook; window.__ofHook=null; return h(items,title); } return orig(items,title); }; })();
