/* Navegación, proyectos y carga de cursos */
/* ══════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════ */
function showScreen(id) {
  if (id!=='office' && (typeof Office!=='undefined')) { try{ Office.leave(); }catch(e){} }
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
  window.scrollTo(0,0);
  try { updateSheetsStatusAll(); } catch(e){}
}
function showHome(){ showScreen('home'); renderProjects(); }
function showProject(pid){
  currentProject = projects.find(p=>p.id===pid);
  if(!currentProject) return;
  document.getElementById('proj-name-disp').textContent = currentProject.name;
  document.getElementById('proj-url-disp').textContent = (currentProject.url||'').slice(0,55)+'…';
  paintProjectEstado();
  let view='office'; try{ view=localStorage.getItem('dcd_view')||'office'; }catch(e){}
  if (pid!==showProject._last) allCourses=[];
  showProject._last=pid;
  showScreen(view==='classic'?'project':'office');
  updateSheetsStatusAll();
  loadCourses().then(()=>{ if((typeof Office!=='undefined')) Office.refresh(); });
  if (view!=='classic' && (typeof Office!=='undefined')) Office.enter();
}
function openOffice(){ try{ localStorage.setItem('dcd_view','office'); }catch(e){} showScreen('office'); Office.enter(); }
function showCourseWork(course){
  currentCourse = course;
  currentSection = null;
  const name = course['Curso']||course['Nombre']||'';
  const code = course['Código']||'';
  document.getElementById('topbar-course').innerHTML = `<span class="tbc-code">${escHtml(code)}</span><span class="tbc-name">${escHtml(name)}</span>`;
  document.getElementById('ci-code').textContent = code;
  document.getElementById('ci-name').textContent = name;
  const meta = document.getElementById('ci-meta');
  meta.innerHTML=[
    coursePeriod(course,currentSaved())!=null?`<span class="mpill"><span class="mp-k">Ubicación</span> ${escHtml(periodLabel(coursePeriod(course,currentSaved())))}</span>`:'',
    course['Créditos']?`<span class="mpill"><span class="mp-k">Créditos</span> ${escHtml(String(course['Créditos']))}</span>`:'',
    (course['Horas Docencia']||course['Lectivas'])?`<span class="mpill"><span class="mp-k">Horas</span> ${escHtml(String(course['Horas Docencia']||course['Lectivas']))}</span>`:'',
    `<span class="mpill" title="Versión del programa: PRL2 y PRL3 resaltan en el Word lo diferente a la versión anterior; Final queda sin resaltar"><span class="mp-k">Versión</span> <select id="ci-ver" onchange="setCourseVersion(this.value)">${verOptions(courseVersion())}</select></span>`,
    course['Requisitos']?`<span class="mpill" title="${escHtml(course['Requisitos'])}"><span class="mp-k">Requisitos</span> ${escHtml((course['Requisitos']||'').length>34?(course['Requisitos']||'').slice(0,34)+'…':(course['Requisitos']||''))}</span>`:'',
  ].join('');
  document.getElementById('back-proj-btn').onclick=()=>showProject(currentProject.id);
  renderSecGrid();
  updateProgress();
  document.getElementById('work-panel').classList.remove('visible');
  document.getElementById('schedule-panel').style.display='none';
  updateSheetsStatusAll();
  showScreen('course');
  { const em=evaTablaMismatch(currentSaved()); if(em) setTimeout(()=>toast('⚠ '+em,'error'),400); }
}

/* ══════════════════════════════════════════════════════
   PROJECTS
══════════════════════════════════════════════════════ */
function renderProjects(){
  const grid = document.getElementById('projects-grid');
  grid.innerHTML = '';
  paintHello();
  projects.forEach(p=>{
    const md=Object.entries(maestroData[p.sheetId]||{});
    const nf=md.filter(([,s])=>courseStage(s).ficha).length, np=md.filter(([,s])=>courseStage(s).programa).length;
    const nfin=md.filter(([code])=>{ try{ return (localStorage.getItem('dcd_ver_'+code)||'')==='Final'; }catch(e){ return false; } }).length;
    const total=Math.max(p.nCourses||0, nf, np, 6);
    const est=estadoOf(p);
    const card=document.createElement('div');
    card.className='hm-bld'; card.tabIndex=0; card.setAttribute('role','button');
    card.setAttribute('aria-label',`Abrir ${p.name}: ${np} programas y ${nf} fichas de ${total} cursos`);
    card.innerHTML = buildingSVG(p, total, nf, np, est)
      + `<div class="hm-card hm-plate">
          <div class="hm-tools"><button onclick="event.stopPropagation();openProjectModal('${p.id}')" title="Editar proyecto" aria-label="Editar proyecto">✎</button><button class="danger" onclick="event.stopPropagation();delProject('${p.id}')" title="Eliminar proyecto" aria-label="Eliminar proyecto">×</button></div>
          <h3>${escHtml(p.name)}</h3>
          <div class="hm-car">${p.career?escHtml(p.career)+(p.career2?' · '+escHtml(p.career2):''):'Sin nombre de carrera (editá el proyecto)'}</div>
          <div class="hm-chips"><span class="hm-est ${est.c}">${est.v}</span><span class="hm-chip"><b>${nf}</b> fichas</span><span class="hm-chip"><b>${np}</b> programas</span>${nfin?`<span class="hm-chip">🏆 <b>${nfin}</b></span>`:''}</div>
          <div class="hm-open"><span>${p.nivel?escHtml(p.nivel):(p.created?'Desde '+new Date(p.created).toLocaleDateString('es-CR',{month:'short',year:'numeric'}):'')}</span><span>Entrar →</span></div>
        </div>`;
    card.addEventListener('keydown',e=>{ if(e.target!==card) return; if(e.key==='Enter'||e.key===' '){ e.preventDefault(); showProject(p.id); } });
    card.addEventListener('click',()=>showProject(p.id));
    grid.appendChild(card);
  });
  const add=document.createElement('button');
  add.className='hm-lot'; add.type='button';
  add.innerHTML=`<svg viewBox="0 0 160 110" aria-hidden="true"><path d="M80 100 150 65 80 30 10 65Z" fill="#c9e3b8" stroke="#8fbf7c" stroke-width="2" stroke-dasharray="6 5"/><rect x="76" y="34" width="6" height="40" rx="2" fill="#8a6a4a"/><rect x="52" y="18" width="54" height="28" rx="5" fill="#fffdf8" stroke="#1c2131" stroke-opacity=".2"/><text x="79" y="37" text-anchor="middle" font-family="Chakra Petch" font-weight="700" font-size="17" fill="#ff6a3d">+</text><path d="M30 70l8-4 8 4-8 4Z" fill="#ff6a3d"/><path d="M118 74l8-4 8 4-8 4Z" fill="#ff6a3d"/></svg><span>Lote disponible: nuevo proyecto</span>`;
  add.onclick=()=>openProjectModal(null);
  grid.appendChild(add);
  if(window.__renderIcons) window.__renderIcons();
}
function paintHello(){
  const h=new Date().getHours(); const sal=h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches';
  const n=userFirstName(); const el=document.getElementById('hm-hello'); if(el) el.textContent = n?`${sal}, ${n}`:sal;
  const d=document.getElementById('hm-date'); if(d) d.textContent=new Date().toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long'})+' · '+(projects.length===1?'1 proyecto':projects.length+' proyectos');
}
// Edificio isométrico: cada ventana es un curso (apagada, celeste con ficha, amarilla con programa)
function buildingSVG(p, total, nf, np, est){
  const per=5, floors=Math.max(2,Math.min(6,Math.ceil(total/per)));
  const U=26, FH=30, W=3, D=2, cx=125, base=196;
  const P=(x,y,z)=>[cx+(x-y)*U, base-(W+D)*U*0.5+(x+y)*U*0.5 - z];
  const pt=a=>a.map(v=>v.toFixed(1)).join(',');
  const poly=(pts,fill,extra='')=>`<polygon points="${pts.map(pt).join(' ')}" fill="${fill}" ${extra}/>`;
  const H=floors*FH+10, top=base-(W+D)*U*0.5;
  const acc={'est-dev':'#ff6a3d','est-ent':'#1f9e8f','est-apr':'#1e9e66'}[est.c]||'#ff6a3d';
  const vb=Math.ceil(H+70);
  let o=`<svg viewBox="0 ${200-vb-30} 250 ${vb+40}" role="img" aria-hidden="true">`;
  // césped y camino
  o+=poly([P(-1.2,-1.2,0),P(W+1.2,-1.2,0),P(W+1.2,D+1.2,0),P(-1.2,D+1.2,0)],'#a7d494');
  o+=poly([P(W*0.45,D,0),P(W*0.45+0.7,D,0),P(W*0.45+0.7,D+1.2,0),P(W*0.45,D+1.2,0)],'#e8d9b8');
  // caras
  o+=poly([P(0,D,0),P(W,D,0),P(W,D,H),P(0,D,H)],'#f4ead8');          // izquierda (frente)
  o+=poly([P(W,0,0),P(W,D,0),P(W,D,H),P(W,0,H)],'#ddd0b8');          // derecha
  o+=poly([P(0,0,H),P(W,0,H),P(W,D,H),P(0,D,H)],'#ebe3d2');          // techo
  o+=poly([P(0,D,H-4),P(W,D,H-4),P(W,D,H),P(0,D,H)],acc);            // franja
  o+=poly([P(W,0,H-4),P(W,D,H-4),P(W,D,H),P(W,0,H)],acc,'opacity=".8"');
  // ventanas
  const lit=i=> i<np?2:(i<nf?1:0); const col=['#7d93ad','#a8dcff','#ffd66b'];
  let k=0; const wins=[];
  for(let f=0; f<floors; f++){
    const z0=8+f*FH;
    for(let c=0;c<W;c++){ wins.push(['L',c,z0]); }
    for(let c=0;c<D;c++){ wins.push(['R',c,z0]); }
  }
  // la puerta ocupa la ventana central de abajo
  wins.forEach(([side,c,z0])=>{
    if(side==='L' && c===1 && z0===8){ o+=poly([P(1.3,D,0),P(1.7,D,0),P(1.7,D,22),P(1.3,D,22)],'#7a4e2e'); return; }
    const st=k<total?lit(k):-1; k++;
    const fill=st<0?'#cbbfa7':col[st];
    const pts= side==='L' ? [P(c+0.22,D,z0+4),P(c+0.78,D,z0+4),P(c+0.78,D,z0+20),P(c+0.22,D,z0+20)]
                           : [P(W,c+0.22,z0+4),P(W,c+0.78,z0+4),P(W,c+0.78,z0+20),P(W,c+0.22,z0+20)];
    o+=poly(pts,fill,`class="${st===2?'win2':''}" stroke="#fffdf8" stroke-width="1.5"`);
  });
  // letrero del techo y bandera
  const sig=escHtml(String(p.sigla1||p.name||'').trim().slice(0,8).toUpperCase());
  const s1=P(0.35,0.9,H), s2=P(2.2,0.9,H);
  o+=`<polygon points="${pt(s1)} ${pt(s2)} ${pt([s2[0],s2[1]-20])} ${pt([s1[0],s1[1]-20])}" fill="#1c2131"/>`;
  const mx=(s1[0]+s2[0])/2, my=(s1[1]+s2[1])/2-6;
  o+=`<text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" text-anchor="middle" font-family="Chakra Petch,monospace" font-weight="700" font-size="12" fill="#fffdf8" transform="rotate(26.57 ${mx.toFixed(1)} ${my.toFixed(1)})">${sig}</text>`;
  const fp=P(W-0.35,0.4,H);
  o+=`<rect x="${(fp[0]-1).toFixed(1)}" y="${(fp[1]-34).toFixed(1)}" width="2.2" height="34" fill="#5a6377"/><path class="hm-flag" d="M${(fp[0]+1).toFixed(1)} ${(fp[1]-34).toFixed(1)}h18l-5 6 5 6h-18Z" fill="${acc}"/>`;
  // arbolito
  const t=P(-0.6,D+0.5,0);
  o+=`<ellipse cx="${t[0].toFixed(1)}" cy="${(t[1]+2).toFixed(1)}" rx="11" ry="4" fill="rgba(28,33,49,.15)"/><rect x="${(t[0]-2).toFixed(1)}" y="${(t[1]-14).toFixed(1)}" width="4" height="15" fill="#8a6a4a"/><circle cx="${t[0].toFixed(1)}" cy="${(t[1]-22).toFixed(1)}" r="12" fill="#3a9a5b"/><circle cx="${(t[0]-6).toFixed(1)}" cy="${(t[1]-16).toFixed(1)}" r="7" fill="#4bb46c"/>`;
  return o+'</svg>';
}
function loginSkipped(){ try{ return sessionStorage.getItem('dcd_skip_login')==='1'; }catch(e){ return false; } }
function skipLogin(){ try{ sessionStorage.setItem('dcd_skip_login','1'); }catch(e){} const pr=document.getElementById('google-prompt'); if(pr) pr.style.display='none'; }
function renderLobby(){
  const box=document.getElementById('lb-actions'); if(!box) return;
  const G='<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';
  const h=new Date().getHours(); const sal=h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches';
  if (gUserInfo){
    const n=userFirstName();
    document.getElementById('lb-kicker').textContent='De vuelta en el vestíbulo';
    document.getElementById('lb-title').textContent=`${sal}, ${n||'de nuevo'}`;
    document.getElementById('lb-text').textContent='El equipo ya está en sus escritorios. Tu sesión de Google venció; con un clic volvés a entrar sin dar permisos otra vez.';
    const ini=escHtml(((n||gUserInfo.email||'?')[0]||'?').toUpperCase());
    const av=gUserInfo.picture?`<img src="${escHtml(gUserInfo.picture)}" alt="" referrerpolicy="no-referrer">`:ini;
    box.innerHTML=`<div class="lb-who"><div class="auth-avatar">${av}</div><div><strong>${escHtml(gUserInfo.name||n)}</strong><div style="font-size:12px;color:var(--o-muted)">${escHtml(gUserInfo.email||'')}</div></div></div>
      <button class="btn-google" onclick="googleSignIn()">${G} Continuar como ${escHtml(n||'yo')}</button>
      <button class="lb-alt" onclick="googleSignOut()">Entrar con otra cuenta</button>`;
  } else {
    document.getElementById('lb-kicker').textContent='Vestíbulo';
    document.getElementById('lb-title').textContent='Bienvenido a la oficina';
    document.getElementById('lb-text').textContent='Entrá con tu cuenta de Google para que el equipo lea la hoja Base, escriba en el Maestro y respalde tu trabajo en Drive.';
    box.innerHTML=`<button class="btn-google" onclick="googleSignIn()">${G} Iniciar sesión con Google</button>`;
  }
}
let editingProjectId=null;
const PROJ_FIELDS={name:'in-name',estado:'in-estado',career:'in-career',career2:'in-career2',sigla1:'in-sigla1',sigla2:'in-sigla2',nivel:'in-nivel',escuela:'in-escuela',url:'in-url',folderFichas:'in-fold-fichas',folderProgramas:'in-fold-prog'};
const ESTADOS=[{v:'En desarrollo',c:'est-dev'},{v:'Entregado',c:'est-ent'},{v:'Aprobado',c:'est-apr'}];
const estadoOf=p=>ESTADOS.find(e=>e.v===p?.estado)||ESTADOS[0];
function setProjectEstado(v){
  if(!currentProject) return; currentProject.estado=v;
  localStorage.setItem('dcd_projects',JSON.stringify(projects)); autoBackup();
  paintProjectEstado(); toast(`Proyecto ${v.toLowerCase()}`,'success');
}
function paintProjectEstado(){
  const s=document.getElementById('proj-estado'); if(!s||!currentProject) return;
  const e=estadoOf(currentProject);
  s.innerHTML=ESTADOS.map(x=>`<option${x.v===e.v?' selected':''}>${x.v}</option>`).join('');
  s.className='est-pill '+e.c;
}
function openProjectModal(pid){
  editingProjectId=pid||null;
  const p=pid?projects.find(x=>x.id===pid):null;
  Object.entries(PROJ_FIELDS).forEach(([k,id])=>{ document.getElementById(id).value = p ? (p[k]||'') : ''; });
  document.getElementById('in-estado').value = estadoOf(p).v;
  document.getElementById('proj-modal-title').textContent = p ? 'Editar proyecto' : 'Nuevo proyecto';
  document.getElementById('proj-modal-btn').innerHTML = p ? 'Guardar cambios' : 'Crear proyecto <span class="ic" aria-hidden="true">→</span>';
  document.getElementById('modal-add').classList.add('active');
}
function saveProjectModal(){
  const v={}; Object.entries(PROJ_FIELDS).forEach(([k,id])=>v[k]=document.getElementById(id).value.trim());
  if(!v.name||!v.url){toast('Completa nombre y URL','error');return;}
  if(!extractSheetId(v.url)){toast('URL inválida de Google Sheets','error');return;}
  if(v.folderFichas && !driveFolderId(v.folderFichas)){toast('El enlace de la carpeta de fichas no parece una carpeta de Google Drive','error');return;}
  if(v.folderProgramas && !driveFolderId(v.folderProgramas)){toast('El enlace de la carpeta de programas no parece una carpeta de Google Drive','error');return;}
  if(editingProjectId){
    const p=projects.find(x=>x.id===editingProjectId);
    Object.assign(p, v, {sheetId:extractSheetId(v.url)});
    localStorage.setItem('dcd_projects',JSON.stringify(projects));
    autoBackup(); closeModal(); renderProjects();
    if(currentProject && currentProject.id===p.id){
      document.getElementById('proj-name-disp').textContent = p.name;
      document.getElementById('proj-url-disp').textContent = (p.url||'').slice(0,55)+'…';
      paintProjectEstado();
    }
    toast(`✓ Proyecto "${p.name}" actualizado`,'success');
    return;
  }
  const id=Date.now().toString();
  projects.push(Object.assign({id},v,{sheetId:extractSheetId(v.url),created:Date.now()}));
  localStorage.setItem('dcd_projects',JSON.stringify(projects));
  autoBackup();
  closeModal();
  renderProjects();
  toast(`✓ Proyecto "${v.name}" creado`,'success');
  setTimeout(()=>showProject(id),350);
}
function createProject(){ editingProjectId=null; saveProjectModal(); }
/* ── Hoja Base: versión del programa y carrera de cada curso ── */
const BASE_VER_HEADER='Estado';
const BASE_VER_ALIASES=['estado','version'];   // la versión del programa va en la columna «Estado» de Base (M)
const baseVerOf=c=>String(c?.['Estado']??c?.['Versión']??c?.['Version']??'').trim();
const normH=h=>String(h||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
function projectSiglas(p=currentProject){ return [p?.sigla1, p?.sigla2].map(x=>String(x||'').trim()); }
function careerCodeOf(code){ const cars=projectCareers(); let com=null; try{ com=JSON.parse(localStorage.getItem('dcd_comun_'+code)||'null'); }catch(e){} if(!com||cars.length<2) return ''; if(com.on) return 'both'; if(com.carrera1===cars[1]) return 'c2'; if(com.carrera1===cars[0]) return 'c1'; return ''; }
function careerToBase(code){ const sg=projectSiglas(); const v=careerCodeOf(code); if(!v||!sg[0]||!sg[1]) return null; return v==='both'?`${sg[0]}, ${sg[1]}`:(v==='c2'?sg[1]:sg[0]); }
function careerFromBase(txt){ const sg=projectSiglas().map(x=>x.toUpperCase()); if(!sg[0]||!sg[1]) return ''; const t=String(txt||'').toUpperCase().split(/[,;\/]|\sY\s/).map(x=>x.trim()).filter(Boolean); const a=t.includes(sg[0]), b=t.includes(sg[1]); return a&&b?'both':a?'c1':b?'c2':''; }
let baseQueue=[]; let baseTimer=null;
function baseEnqueue(code, header, value){
  const sid=extractSheetId(currentProject?.url||''); if(!sid||!code) return;
  baseQueue=baseQueue.filter(u=>!(u.sid===sid&&u.code===code&&u.header===header)); baseQueue.push({sid,code,header,value:String(value??'')});
  const c=(allCourses||[]).find(x=>x['Código']===code); if(c) c[header]=String(value??'');
  clearTimeout(baseTimer); baseTimer=setTimeout(baseFlush, 900);
}
async function baseFlush(){
  if(!gAccessToken||!baseQueue.length) return;
  const q=baseQueue; baseQueue=[];
  const bySid={}; q.forEach(u=>(bySid[u.sid]=bySid[u.sid]||[]).push(u));
  for (const [sid,ups] of Object.entries(bySid)){
    try{
      const vals=(await sheetsReq(`/${sid}/values/Base`)).values||[]; if(!vals.length) continue;
      const hdr=vals[0].slice(); const ci=hdr.findIndex(h=>normH(h)==='codigo'); if(ci<0) continue;
      const data=[]; const missing=new Set();
      ups.forEach(u=>{
        const want=u.header===BASE_VER_HEADER?BASE_VER_ALIASES:[normH(u.header)];
        let col=-1; for(const w of want){ col=hdr.findIndex(h=>normH(h)===w); if(col>=0) break; }
        if(col<0){ missing.add(u.header); return; }
        const ri=vals.findIndex((r,i)=>i>0&&String(r[ci]||'').trim()===u.code); if(ri<0) return;
        data.push({range:`Base!${colLetter(col)}${ri+1}`, values:[[u.value]]});
      });
      if(missing.size) toast(`La hoja Base no tiene la columna «${[...missing].join('», «')}». Agregala y lo vuelvo a escribir.`,'error');
      if(data.length){ await sheetsReq(`/${sid}/values:batchUpdate`,'POST',{valueInputOption:'RAW', data}); const lbl=document.getElementById('save-lbl'); if(lbl){ lbl.textContent='✓ Base actualizada'; lbl.classList.add('show'); setTimeout(()=>lbl.classList.remove('show'),1800); } }
    }catch(e){ console.warn('Base:',e); baseQueue=baseQueue.concat(ups); toast('No pude escribir en la hoja Base: '+e.message,'error'); }
  }
}
function colLetter(i){ let s=''; i++; while(i>0){ const m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=Math.floor((i-1)/26); } return s; }
// Guarda la versión del curso aquí y en la última columna de Base
function rememberVersion(code, v){ v=String(v||'').trim(); if(!code||!v) return; let old=''; try{ old=localStorage.getItem('dcd_ver_'+code)||''; localStorage.setItem('dcd_ver_'+code, v); }catch(e){}
  const c=(allCourses||[]).find(x=>x['Código']===code); if(old!==v || (c && baseVerOf(c)!==v)) baseEnqueue(code, BASE_VER_HEADER, v); try{ autoBackup(); }catch(e){} }
function rememberCareer(code){ const v=careerToBase(code); if(v===null) return; const c=(allCourses||[]).find(x=>x['Código']===code); if(c && String(c['Carrera']||'').trim()===v) return; baseEnqueue(code,'Carrera',v); }
// Al cargar Base: lo que dice la hoja manda; lo que solo está aquí se sube a la hoja
function syncBaseMeta(){
  const cars=projectCareers(); const sg=projectSiglas();
  (allCourses||[]).forEach(c=>{
    const code=c['Código']; if(!code) return;
    const bv=baseVerOf(c); let lv=''; try{ lv=localStorage.getItem('dcd_ver_'+code)||''; }catch(e){}
    if(bv){ if(bv!==lv) try{ localStorage.setItem('dcd_ver_'+code, bv); }catch(e){} } else if(lv) baseEnqueue(code, BASE_VER_HEADER, lv);
    if(cars.length>=2 && sg[0] && sg[1]){
      const bc=careerFromBase(c['Carrera']);
      if(bc){ const val={on:bc==='both', carrera1:bc==='c2'?cars[1]:cars[0], carrera2:bc==='both'?cars[1]:''}; try{ localStorage.setItem('dcd_comun_'+code, JSON.stringify(val)); }catch(e){} }
      else rememberCareer(code);
    }
  });
}
function projectCareers(p=currentProject){ return [p?.career, p?.career2].map(x=>String(x||'').trim()).filter(Boolean); }
function delProject(id){
  if(!confirm('¿Eliminar este proyecto?')) return;
  projects=projects.filter(p=>p.id!==id);
  localStorage.setItem('dcd_projects',JSON.stringify(projects));
  renderProjects();
  toast('Proyecto eliminado','');
}
function closeModal(){ document.getElementById('modal-add').classList.remove('active'); }

/* ══════════════════════════════════════════════════════
   LOAD COURSES
══════════════════════════════════════════════════════ */
async function loadCourses(){
  const cont=document.getElementById('courses-container');
  cont.innerHTML=`<div class="loading-state"><div class="spinner"></div><p>Conectando con Google Sheets…</p></div>`;
  document.getElementById('config-hint').style.display='none';
  document.getElementById('period-tabs').innerHTML='';
  try{
    allCourses=await fetchBase(currentProject.url);
    if(!allCourses.length){cont.innerHTML=`<div class="err-card">No se encontraron cursos en la hoja "Base". Verifica el nombre.</div>`;return;}
    try{ syncBaseMeta(); }catch(e){ console.warn(e); }
    if (currentProject && currentProject.nCourses!==allCourses.length){ currentProject.nCourses=allCourses.length; try{ localStorage.setItem('dcd_projects',JSON.stringify(projects)); autoBackup(); }catch(e){} }
    document.getElementById('course-count').textContent=`${allCourses.length} cursos encontrados`;

    // If authenticated, import existing Maestro data into local store
    if(gAccessToken){
      try{
        const sheetId=extractSheetId(currentProject.url);
        const n=await importFromMaestro(sheetId);
        if(n>0) toast(`✓ ${n} campos importados desde Maestro`,'success');
      }catch(e){ /* Maestro may not exist yet, that's fine */ }
    }

    const periods=[...new Set(allCourses.map(c=>coursePeriod(c, savedForCourse(c))))].sort((a,b)=>(a??999)-(b??999));
    renderPeriodTabs(periods);
    renderTable(allCourses);
  }catch(err){
    document.getElementById('config-hint').style.display='block';
    cont.innerHTML=`<div class="err-card">⚠️ ${err.message}</div>`;
    document.getElementById('course-count').textContent='Error';
  }
}
function renderPeriodTabs(periods){
  const tabs=document.getElementById('period-tabs');
  tabs.innerHTML=`<button class="ptab active" onclick="filterP('all',this)">Todos</button>`;
  periods.forEach(p=>{
    const b=document.createElement('button');
    b.className='ptab';b.textContent=periodLabel(p);
    b.onclick=function(){filterP(p,this);};
    tabs.appendChild(b);
  });
}
function filterP(period,btn){
  document.querySelectorAll('.ptab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  curPeriod=period;
  renderTable(period==='all'?allCourses:allCourses.filter(c=>coursePeriod(c, savedForCourse(c))===period));
}
let curPeriod='all', showFinals=false;
function isFinalCourse(c){ try{ return (localStorage.getItem('dcd_ver_'+(c?.['Código']||''))||'').trim()==='Final'; }catch(e){ return false; } }
function toggleFinals(){ showFinals=!showFinals; renderTable(curPeriod==='all'?allCourses:allCourses.filter(c=>coursePeriod(c, savedForCourse(c))===curPeriod)); }
function renderTable(courses){
  const cont=document.getElementById('courses-container');
  const sid=currentProject.sheetId;
  const wrap=document.createElement('div');wrap.className='ct-wrap';
  const table=document.createElement('table');table.className='ctable';
  table.innerHTML=`<thead><tr><th>Código</th><th>Nombre del curso</th><th>Créditos</th><th>Período</th><th>Estado</th><th></th></tr></thead>`;
  const tbody=document.createElement('tbody');
  // Los programas en versión Final van al final, atenuados y plegados
  const finals=courses.filter(isFinalCourse); const open=courses.filter(c=>!isFinalCourse(c));
  const rows=open.concat(showFinals?finals:[]);
  rows.forEach(c=>{
    const code=c['Código']||'';
    const fin=isFinalCourse(c);
    const saved=maestroData[sid]?.[code]||{};
    const filled=ALL_SECS.filter(s=>saved[s.id]?.trim()).length;
    const pct=Math.round(filled/ALL_SECS.length*100);
    const st=courseStage(saved);
    let badge=`<div class="st-cell"><span class="chip${st.ficha?' on':''}">${st.ficha?'✓':'○'} Ficha</span><span class="chip${st.programa?' on':''}">${st.programa?'✓':'○'} Programa</span><span class="mini-prog" title="${filled} de ${ALL_SECS.length} secciones"><span style="width:${pct}%"></span></span>${fin?'<span class="chip final">✓ Final</span>':''}</div>`;
    const tr=document.createElement('tr'); if(fin) tr.className='is-final';
    tr.innerHTML=`<td class="td-code">${code}</td><td class="td-name">${c['Curso']||c['Nombre']||''}</td><td class="td-m">${c['Créditos']||''}</td><td class="td-m">${escHtml(periodLabel(coursePeriod(c,saved)))}</td><td>${badge}</td><td><div class="row-actions"><button class="mini-btn" data-act="ficha" title="Generar la ficha con Claude">1 · Ficha</button><button class="mini-btn" data-act="programa" title="Generar el programa completo con Claude">2 · Programa</button><button class="work-btn">Trabajar <span class="ic" aria-hidden="true">→</span></button></div></td>`;
    tr.querySelector('.work-btn').onclick=e=>{e.stopPropagation();showCourseWork(c);};
    tr.querySelectorAll('.mini-btn').forEach(b=>b.onclick=e=>{e.stopPropagation();showCourseWork(c);openClaudeFlow(b.dataset.act);});
    tr.onclick=()=>showCourseWork(c);
    tbody.appendChild(tr);
  });
  if(window.__renderIcons) window.__renderIcons();
  table.appendChild(tbody);wrap.appendChild(table);
  if(finals.length){
    const tg=document.createElement('button'); tg.className='final-toggle';
    tg.innerHTML=`<span class="ic" aria-hidden="true">${showFinals?'▾':'▸'}</span> ${showFinals?'Ocultar':'Mostrar'} los programas en versión Final (${finals.length})`;
    tg.onclick=toggleFinals;
    if(showFinals) wrap.insertBefore(tg, table); else wrap.appendChild(tg);
  }
  cont.innerHTML='';
  const all=allCourses||[]; const nf=all.filter(c=>courseStage(savedForCourse(c)).ficha).length, np=all.filter(c=>courseStage(savedForCourse(c)).programa).length;
  const sum=document.createElement('div'); sum.className='proj-summary';
  const pctOf=n=>all.length?Math.round(n/all.length*100):0;
  sum.innerHTML=`<div class="ps-meter"><div class="ps-top"><span>Fichas listas</span><strong>${nf} de ${all.length}</strong></div><div class="ps-bar"><span style="width:${pctOf(nf)}%"></span></div></div><div class="ps-meter"><div class="ps-top"><span>Programas listos</span><strong>${np} de ${all.length}</strong></div><div class="ps-bar prog"><span style="width:${pctOf(np)}%"></span></div></div><div class="ps-tip">Para saltar a cualquier curso desde adentro, usá <span class="kbd">Ctrl K</span>.</div>`;
  cont.appendChild(sum); cont.appendChild(wrap);
}
async function syncSheets(){
  const btn=document.getElementById('sync-btn');
  btn.innerHTML='<span class="ic" aria-hidden="true">⟳</span> Sincronizando…';
  await loadCourses();
  btn.innerHTML='<span class="ic" aria-hidden="true">⟳</span> Sincronizar';
  toast('✓ Base y Maestro actualizados','success');
}
