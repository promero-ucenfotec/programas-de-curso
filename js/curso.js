/* Índice de secciones del curso y guardado local */
/* ══════════════════════════════════════════════════════
   SECTION GRID
══════════════════════════════════════════════════════ */
// Nombres más claros en el índice (el resto de la app usa sec.label)
const SEC_NICE={cd1:'Criterios del RA 1',cd2:'Criterios del RA 2',cd3:'Criterios del RA 3',e1:'Evidencias del RA 1',e2:'Evidencias del RA 2',e3:'Evidencias del RA 3',
  modulos:'Temario (módulos y subtemas)',estrategias:'Estrategias de aprendizaje',eva_tabla:'Tabla de evaluaciones',eva_tipo:'Tipos de evaluación',
  eva_desc1:'Descripción de la evaluación 1',eva_desc2:'Descripción de la evaluación 2',eva_desc3:'Descripción de la evaluación 3',
  recursos:'Recursos didácticos',biblio_ob:'Bibliografía obligatoria',biblio_co:'Bibliografía complementaria',cronograma:'Cronograma (14 sesiones)'};
const secNice=sec=>SEC_NICE[sec.id]||sec.label;
const catNice=cat=>cat.label.replace(/^\d+\.\s*/,'');
function secHas(saved, sec){ return sec.isRubric ? !!(saved._rubricas?.trim() || saved.cd1?.trim()) : !!(String(saved[sec.id]||'').trim()); }
let collapsedCats=new Set();
function togglePendientes(on){ document.getElementById('sec-grid')?.classList.toggle('only-pend', !!on); }
function toggleCat(i){ collapsedCats.has(i)?collapsedCats.delete(i):collapsedCats.add(i); renderSecGrid(); }
function renderSecGrid(){
  const grid=document.getElementById('sec-grid');
  const sid=currentProject.sheetId;
  const code=currentCourse?.['Código']||'';
  const saved=maestroData[sid]?.[code]||{};
  grid.innerHTML='';
  let tot=0, ok=0;
  CATS.forEach((cat,ci)=>{
    const n=cat.secs.filter(s=>secHas(saved,s)).length; tot+=cat.secs.length; ok+=n;
    const done=n===cat.secs.length;
    const div=document.createElement('div');div.className='sec-cat'+(collapsedCats.has(ci)?' collapsed':'')+(done?' all-done':'');
    div.innerHTML=`<button class="sec-cat-lbl" onclick="toggleCat(${ci})" aria-expanded="${!collapsedCats.has(ci)}"><span><span class="cat-chev" aria-hidden="true">▾</span>${escHtml(catNice(cat))}</span><span class="cat-n${done?' done':''}">${n}/${cat.secs.length}</span></button><div class="sec-pills"></div>`;
    const pills=div.querySelector('.sec-pills');
    cat.secs.forEach(sec=>{
      const hasData=secHas(saved,sec);
      const pill=document.createElement('button');
      pill.className=`spill${hasData?' has-data':''}${currentSection?.id===sec.id?' active':''}`;
      pill.dataset.sec=sec.id;
      pill.title = hasData ? String(sec.isRubric?'Rúbricas listas':saved[sec.id]).slice(0,180) : 'Pendiente';
      pill.innerHTML=`<span class="st-dot" aria-hidden="true">${hasData?'✓':''}</span><span class="sp-lbl">${escHtml(secNice(sec))}</span><span class="sp-tag">pendiente</span>`;
      pill.addEventListener('click',()=>openSection(sec,pill));
      pills.appendChild(pill);
    });
    grid.appendChild(div);
  });
  togglePendientes(document.getElementById('si-pend')?.checked);
  const pct=tot?Math.round(ok/tot*100):0;
  const c=document.getElementById('si-count'); if(c) c.textContent=`${ok} de ${tot}`;
  const b=document.getElementById('si-bar'); if(b) b.style.width=pct+'%';
  renderProgramMap(saved);
  updateSecNav();
  if(window.__renderIcons) window.__renderIcons();
}
function renderProgramMap(saved){
  const el=document.getElementById('prog-map'); if(!el) return;
  const next=ALL_SECS.find(s=>!secHas(saved,s));
  const total=ALL_SECS.length, ok=ALL_SECS.filter(s=>secHas(saved,s)).length;
  const snip=(sec)=>{ if(sec.isRubric) return ''; const v=String(saved[sec.id]||'').replace(/\s+/g,' ').trim(); return v?escHtml(v.slice(0,70))+(v.length>70?'…':''):''; };
  el.innerHTML=`<div class="pm-top"><div><h3>Mapa del programa</h3><p>${ok===total?'Todas las secciones tienen contenido. Abrí cualquiera para revisarla o descargá el Word.':`Llevás ${ok} de ${total} secciones. Tocá cualquier sección para abrirla; las grises están pendientes.`}</p></div>
    ${next?`<button class="btn btn-primary btn-sm" onclick="openSectionById('${next.id}')">Seguir con ${escHtml(secNice(next))} →</button>`:`<button class="btn btn-primary btn-sm" onclick="openWordExport()">Descargar en Word →</button>`}</div>
    <div class="pm-grid">${CATS.map(cat=>{ const n=cat.secs.filter(s=>secHas(saved,s)).length; return `<div class="pm-card${n===cat.secs.length?' done':''}"><h4>${escHtml(catNice(cat))}<span>${n}/${cat.secs.length}</span></h4><div class="pm-items">${
      cat.secs.map(s=>{ const h=secHas(saved,s); const sn=h?snip(s):''; return `<button class="pm-item${h?' ok':''}" onclick="openSectionById('${s.id}')" title="${h?escHtml(String(saved[s.id]||'').slice(0,200)):'Pendiente'}"><span class="st-dot" aria-hidden="true">${h?'✓':''}</span><span class="pm-prev">${escHtml(secNice(s))}${h?'':'<small>pendiente</small>'}</span></button>`; }).join('')
    }</div></div>`; }).join('')}</div>`;
}
function openSectionById(id){
  const sec=ALL_SECS.find(s=>s.id===id); if(!sec) return;
  const ci=CATS.findIndex(c=>c.secs.includes(sec)); if(collapsedCats.delete(ci)) renderSecGrid();
  openSection(sec, document.querySelector(`.spill[data-sec="${id}"]`));
}
function stepSection(d){
  const i=ALL_SECS.findIndex(s=>s.id===currentSection?.id); const t=ALL_SECS[i+d]; if(t) openSectionById(t.id);
}
function closeSection(){
  currentSection=null;
  document.getElementById('work-panel').classList.remove('visible');
  document.getElementById('schedule-panel').style.display='none';
  document.getElementById('rubric-panel').style.display='none';
  document.querySelectorAll('.spill').forEach(p=>p.classList.remove('active'));
  updateSecNav();
  document.querySelector('.course-work')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function updateSecNav(){
  const main=document.querySelector('.course-main'); if(!main) return;
  main.classList.toggle('has-open', !!currentSection);
  if(!currentSection) return;
  const i=ALL_SECS.findIndex(s=>s.id===currentSection.id);
  const cat=CATS.find(c=>c.secs.some(s=>s.id===currentSection.id));
  document.getElementById('sn-crumb').innerHTML=`${escHtml(cat?catNice(cat):'')} › <strong>${escHtml(secNice(currentSection))}</strong> · ${i+1} de ${ALL_SECS.length}`;
  document.getElementById('sn-prev').disabled=i<=0;
  document.getElementById('sn-next').disabled=i>=ALL_SECS.length-1;
}

function openSection(sec,pillEl){
  currentSection=sec;
  document.querySelectorAll('.spill').forEach(p=>p.classList.remove('active'));
  if(pillEl) pillEl.classList.add('active');
  updateSecNav();

  document.getElementById('rubric-panel').style.display='none';
  if(sec.isRubric){
    document.getElementById('work-panel').classList.remove('visible');
    document.getElementById('schedule-panel').style.display='none';
    openRubricEditor();
    return;
  }
  if(sec.isSchedule){
    document.getElementById('work-panel').classList.remove('visible');
    document.getElementById('schedule-panel').style.display='block';
    buildSchedule();
    setTimeout(()=>document.getElementById('sec-nav').scrollIntoView({behavior:'smooth',block:'start'}),50);
    return;
  }
  document.getElementById('schedule-panel').style.display='none';

  const sid=currentProject.sheetId;
  const code=currentCourse?.['Código']||'';
  const saved=maestroData[sid]?.[code]||{};

  document.getElementById('wp-ico').textContent=sec.icon;
  document.getElementById('wp-ico').style.background='var(--blue-50)';document.getElementById('wp-ico').style.color='var(--blue)';
  document.getElementById('wp-title').textContent=sec.label;
  document.getElementById('wp-sub').textContent=CATS.find(c=>c.secs.includes(sec))?.label||'';
  document.getElementById('result-ta').value=saved[sec.id]||'';

  const prompt=buildPrompt(sec.pkey,currentCourse,saved,sec.id);
  const box=document.getElementById('prompt-box');
  const esc=prompt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  box.innerHTML=esc.replace(/\[([^\]]+)\]/g,'<span class="ph">[$1]</span>');

  // Related
  const strip=document.getElementById('rel-strip');
  const chips=document.getElementById('rel-chips');
  if(sec.related?.length){
    chips.innerHTML='';
    sec.related.forEach(rid=>{
      const rs=ALL_SECS.find(s=>s.id===rid);if(!rs)return;
      const val=saved[rid];
      const chip=document.createElement('span');chip.className='rel-chip';
      chip.textContent=`${rs.icon} ${rs.label}: ${val?(val.slice(0,36)+(val.length>36?'…':'')):'(pendiente)'}`;
      chip.title=val||'Sin datos aún';
      chips.appendChild(chip);
    });
    strip.style.display='flex';
  } else strip.style.display='none';

  const panel=document.getElementById('work-panel');
  panel.classList.add('visible');
  setTimeout(()=>document.getElementById('sec-nav').scrollIntoView({behavior:'smooth',block:'start'}),50);
}

/* ══════════════════════════════════════════════════════
   SAVE LOCAL
══════════════════════════════════════════════════════ */
function saveSection(){
  if(!currentSection||!currentCourse||!currentProject)return;
  const val=document.getElementById('result-ta').value.trim();
  if(!val){toast('Pega el resultado primero','error');return;}
  const sid=currentProject.sheetId;
  const code=currentCourse['Código']||'';
  if(!maestroData[sid])maestroData[sid]={};
  if(!maestroData[sid][code])maestroData[sid][code]={};
  maestroData[sid][code][currentSection.id]=val;
  localStorage.setItem('dcd_maestro',JSON.stringify(maestroData));
  autoBackup();
  renderSecGrid();
  updateProgress();
  const lbl=document.getElementById('save-lbl');
  lbl.classList.add('show');
  setTimeout(()=>lbl.classList.remove('show'),2500);
  toast(`✓ "${currentSection.label}" guardado localmente`,'success');
}

/* ── Estado de cada curso y navegación rápida ── */
function courseStage(saved){
  saved=saved||{};
  const ficha = fichaMissing(saved).length===0;
  const programa = ficha && ['metodologias','estrategias','eva_desc1','cronograma'].every(k=>String(saved[k]||'').trim());
  return {ficha, programa};
}
function orderedCourses(){
  const col=new Intl.Collator('es',{numeric:true});
  return (allCourses||[]).map(c=>({c, per:coursePeriod(c, savedForCourse(c))}))
    .sort((a,b)=>((a.per??999)-(b.per??999)) || col.compare(a.c['Código']||'', b.c['Código']||''));
}
let cnavSel=0;
function renderCourseNav(){
  const list=document.getElementById('cnav-list'); if(!list||!currentProject) return;
  const q=(document.getElementById('cnav-search').value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const all=orderedCourses();
  const items=all.filter(({c})=>!q || ((c['Código']||'')+' '+(c['Curso']||c['Nombre']||'')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(q));
  let html='', last, idx=0; const curCode=currentCourse?.['Código'];
  items.forEach(({c,per})=>{
    if(per!==last){ html+=`<div class="cnav-group">${escHtml(periodLabel(per))}</div>`; last=per; }
    const st=courseStage(savedForCourse(c)); const code=c['Código']||'';
    const fin=isFinalCourse(c);
    html+=`<button class="cnav-item${fin?' is-final':''}${code===curCode?' active':''}${q&&idx===cnavSel?' kb':''}" data-code="${escHtml(code)}" title="${escHtml(c['Curso']||c['Nombre']||'')}"><span class="c">${escHtml(code)}</span><span class="n">${escHtml(c['Curso']||c['Nombre']||'')}</span><span class="cnav-dots">${fin?'<span class="chip final" style="font-size:10px;padding:0 6px">Final</span>':''}<span class="sdot${st.ficha?' on':''}" title="Ficha"></span><span class="sdot${st.programa?' on':''}" title="Programa"></span></span></button>`;
    idx++;
  });
  list.innerHTML = html || '<div style="padding:16px;font-size:13px;color:var(--ink-3)">Ningún curso coincide.</div>';
  list.querySelectorAll('.cnav-item').forEach(b=>b.onclick=()=>{ const c=allCourses.find(x=>x['Código']===b.dataset.code); if(c){ toggleCourseNav(false); showCourseWork(c);} });
  const nf=all.filter(x=>courseStage(savedForCourse(x.c)).ficha).length, np=all.filter(x=>courseStage(savedForCourse(x.c)).programa).length;
  document.getElementById('cnav-stats').textContent=`${nf} de ${all.length} fichas · ${np} de ${all.length} programas · ↑↓ y Enter para elegir`;
  document.getElementById('cnav-title').textContent=currentProject.name||'Cursos';
  list.querySelectorAll('.cnav-item.kb').forEach(b=>{ b.style.outline='2px solid var(--blue)'; b.scrollIntoView({block:'nearest'}); });
}
function cnavKey(e){
  const n=document.querySelectorAll('#cnav-list .cnav-item').length;
  if(e.key==='ArrowDown'){ cnavSel=Math.min(n-1,cnavSel+1); e.preventDefault(); renderCourseNav(); }
  else if(e.key==='ArrowUp'){ cnavSel=Math.max(0,cnavSel-1); e.preventDefault(); renderCourseNav(); }
  else if(e.key==='Enter'){ const b=document.querySelectorAll('#cnav-list .cnav-item')[e.target.value?cnavSel:0]; if(b) b.click(); }
  else if(e.key==='Escape'){ toggleCourseNav(false); }
  else cnavSel=0;
}
function toggleCourseNav(force){
  const nav=document.getElementById('cnav'); const open = force===undefined ? !nav.classList.contains('open') : force;
  if(open && !(allCourses||[]).length){ toast('Abrí un proyecto para ver sus cursos','error'); return; }
  nav.classList.toggle('open',open); document.getElementById('cnav-backdrop').classList.toggle('open',open);
  if(open){ const sb=document.getElementById('cnav-search'); sb.value=''; cnavSel=0; renderCourseNav(); setTimeout(()=>sb.focus(),60); setTimeout(()=>document.querySelector('#cnav-list .cnav-item.active')?.scrollIntoView({block:'center'}),80); }
}
function gotoSibling(d){
  const all=orderedCourses(); const i=all.findIndex(x=>x.c['Código']===currentCourse?.['Código']);
  const t=all[i+d]; if(t) showCourseWork(t.c);
}
function updateCourseRoute(){
  const r=document.getElementById('course-route'); if(!r||!currentCourse) return;
  const st=courseStage(currentSaved());
  const next = !st.ficha ? 'ficha' : !st.programa ? 'programa' : 'word';
  const step=(k,n,label,done)=>`<div class="route-step${done?' done':''}${next===k?' next':''}"><span class="rs-n">${done?'✓':n}</span>${label}</div>`;
  const hints={ficha:['Siguiente paso: generá la ficha con Claude o subí la ficha aprobada.','openClaudeFlow(\'ficha\')','Hacer la ficha'],
               programa:['Siguiente paso: la ficha está lista; generá el programa completo.','openClaudeFlow(\'programa\')','Programa completo'],
               word:['El programa está completo: guardalo en el Maestro y descargalo en Word.','openWordExport()','Descargar en Word']};
  const h=hints[next];
  r.innerHTML = step('ficha',1,'Ficha',st.ficha)+'<span class="route-sep"></span>'+step('programa',2,'Programa',st.programa)+'<span class="route-sep"></span>'+step('word',3,'Word',false)
    + `<div class="route-hint">${h[0]}<button class="btn btn-primary btn-sm" onclick="${h[1]}">${h[2]} →</button></div>`;
  ['ab-ficha','ab-prog','ab-word'].forEach((id,i)=>document.getElementById(id)?.classList.toggle('next-act', ['ficha','programa','word'][i]===next));
  const all=orderedCourses(); const i=all.findIndex(x=>x.c['Código']===currentCourse['Código']);
  const pv=document.getElementById('nav-prev'), nx=document.getElementById('nav-next');
  pv.disabled=i<=0; nx.disabled=i<0||i>=all.length-1;
  pv.title = i>0 ? `Anterior: ${all[i-1].c['Código']} ${all[i-1].c['Curso']||''} (Alt + ↑)` : 'Primer curso';
  nx.title = i>=0&&i<all.length-1 ? `Siguiente: ${all[i+1].c['Código']} ${all[i+1].c['Curso']||''} (Alt + ↓)` : 'Último curso';
}
document.addEventListener('keydown',e=>{
  const onCourse=document.getElementById('screen-course')?.classList.contains('active');
  const onProject=document.getElementById('screen-project')?.classList.contains('active');
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k' && (onCourse||onProject)){ e.preventDefault(); toggleCourseNav(); }
  if(e.altKey && onCourse && (e.key==='ArrowDown'||e.key==='ArrowUp')){ e.preventDefault(); gotoSibling(e.key==='ArrowDown'?1:-1); }
  if(e.key==='Escape' && document.getElementById('cnav')?.classList.contains('open')) toggleCourseNav(false);
});

function updateProgress(){
  updateCourseRoute();
  if(document.getElementById('cnav')?.classList.contains('open')) renderCourseNav();
  const sid=currentProject?.sheetId;
  const code=currentCourse?.['Código']||'';
  const saved=maestroData[sid]?.[code]||{};
  const filled=ALL_SECS.filter(s=>saved[s.id]?.trim()).length;
  const total=ALL_SECS.length;
  const pct=Math.round(filled/total*100);
  document.getElementById('prog-bar').style.width=pct+'%';
  document.getElementById('prog-lbl').textContent=filled+' de '+total+' secciones completadas ('+pct+'%)';
  // Show tematicas preview in hero
  const prev=document.getElementById('tematicas-preview');
  if(prev){
    const sentence=buildTematicasSentence(saved);
    prev.textContent=sentence||'';
  }
}
