/* Editor de rúbricas */
/* Icons are inline text glyphs — no render hook needed */

/* ══════════════════════════════════════════════════════
   EDITOR DE RÚBRICAS
   Cada nivel = criterio de desempeño textual + "de manera" + adjetivo.
   Se guardan el título y los cuatro adjetivos; el texto se arma siempre
   con el criterio vigente del cuadro de competencia.
══════════════════════════════════════════════════════ */
let rubEdit=null;
const RUB_LV_LBL=['No logra (1)','Logra parcialmente (2)','Logra (3)','Excede (4)'];
function rubActName(s,n){ return (String(s[`e${n}`]||'').split('\n')[0]||'').trim() || `Actividad ${n}`; }
function rubLoad(){
  const s=currentSaved(); const rub=safeJSON(s._rubricas||'[]',[]);
  return [1,2,3].map(n=>{
    const nombre=rubActName(s,n); const crit=lines(s[`cd${n}`]);
    const rr=(rub.find(x=>(x.nombre||'').toLowerCase()===nombre.toLowerCase()) || rub[n-1] || {}).rubrica || [];
    const nRows=Math.max(crit.length, crit.length?0:rr.length);
    const rows=[];
    for(let k=0;k<nRows;k++){
      const rk=rr[k]||{}; const c=crit[k]||rk.criterio||'';
      const changed = !!(rk.criterio && rk.titulo && normTxt(rubCritClean(rk.criterio))!==normTxt(rubCritClean(c)));
      rows.push({criterio:c, titulo:rk.titulo||'', adj:rubAdjOf(rk,c,k), changed});
    }
    return {nombre, rows};
  });
}
function openRubricEditor(){
  rubEdit={act:(rubEdit&&rubEdit.act)||0, data:rubLoad()};
  document.getElementById('rub-adj-list').innerHTML=RUB_ADJ_ALL.map(a=>`<option value="${a}">`).join('');
  renderRubricEditor();
  const panel=document.getElementById('rubric-panel'); panel.style.display='block';
  setTimeout(()=>document.getElementById('sec-nav').scrollIntoView({behavior:'smooth',block:'start'}),50);
}
function renderRubricEditor(){
  const tabs=document.getElementById('rub-tabs');
  tabs.innerHTML=rubEdit.data.map((a,i)=>`<button class="rub-tab${i===rubEdit.act?' on':''}" role="tab" aria-selected="${i===rubEdit.act}" onclick="rubTab(${i})">${i+1}. ${escHtml(a.nombre)} · ${a.rows.length} criterios</button>`).join('');
  const a=rubEdit.data[rubEdit.act]; const box=document.getElementById('rub-rows');
  if(!a.rows.length){ box.innerHTML=`<div class="rub-empty">Esta actividad todavía no tiene criterios de desempeño. Cargalos en "CD ${rubEdit.act+1}" o con la ficha, y aquí aparecen sus filas.</div>`; return; }
  box.innerHTML=a.rows.map((r,k)=>`
    <div class="rub-row" data-k="${k}">
      <div class="rub-crit"><span class="rub-n">${k+1}</span><span>${escHtml(rubCritClean(r.criterio))}</span></div>
      ${r.changed?'<div class="rub-warn">El criterio cambió: revisá que el título siga correspondiendo.</div>':''}
      <input class="rub-tit" placeholder="Título del criterio (frase nominal de 2 a 4 palabras)" value="${escHtml(r.titulo)}" oninput="rubSet(${k},'t',this.value)">
      <div class="rub-lvs">${r.adj.map((x,j)=>`<div class="rub-lv"><label>${RUB_LV_LBL[j]}</label><input list="rub-adj-list" value="${escHtml(x)}" aria-label="${RUB_LV_LBL[j]}: adjetivo" oninput="rubSet(${k},${j},this.value)"></div>`).join('')}</div>
      <div class="rub-prev" id="rub-prev-${k}">${rubPrevHtml(r)}</div>
    </div>`).join('');
}
function rubPrevHtml(r){ return `Nivel 4: ${escHtml(rubCritClean(r.criterio))} de manera <b>${escHtml(r.adj[3]||'')}</b>.`; }
function rubTab(i){ rubEdit.act=i; renderRubricEditor(); }
function rubSet(k,j,v){
  const r=rubEdit.data[rubEdit.act].rows[k]; if(!r) return;
  if(j==='t') r.titulo=v; else r.adj[j]=v.trim();
  const pv=document.getElementById('rub-prev-'+k); if(pv) pv.innerHTML=rubPrevHtml(r);
}
function rubSuggestAdj(){
  const a=rubEdit.data[rubEdit.act]; a.rows.forEach((r,k)=>{ r.adj=rubAdjDefaults(r.criterio,k); });
  renderRubricEditor(); toast('Adjetivos sugeridos según el verbo de cada criterio');
}
function saveRubricas(){
  if(!currentCourse||!currentProject||!rubEdit) return;
  if(rubEdit.data.some(a=>a.rows.some(r=>r.adj.some(x=>!x)))){ toast('Hay niveles sin adjetivo','error'); return; }
  const out=rubEdit.data.filter(a=>a.rows.length).map(a=>({nombre:a.nombre, rubrica:a.rows.map(r=>({criterio:rubCritClean(r.criterio)+'.', titulo:r.titulo.trim(), adj:r.adj.slice(), niveles:r.adj.map(x=>rubLevelText(r.criterio,x))}))}));
  setSavedValue('_rubricas', JSON.stringify(out));
  renderSecGrid(); updateProgress();
  toast('✓ Rúbricas guardadas','success');
}
function setSavedValue(secId, value){
  const sid=currentProject.sheetId; const code=currentCourse['Código']||'';
  if(!maestroData[sid]) maestroData[sid]={};
  if(!maestroData[sid][code]) maestroData[sid][code]={};
  maestroData[sid][code][secId]=value;
  localStorage.setItem('dcd_maestro',JSON.stringify(maestroData));
  autoBackup();
  if(currentSection?.id===secId && !currentSection.isRubric && !currentSection.isSchedule) document.getElementById('result-ta').value=value;
}
