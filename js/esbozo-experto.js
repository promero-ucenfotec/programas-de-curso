/* Esbozo del experto (Excel) */
/* ══════════════════════════════════════════════════════
   ESBOZO DEL EXPERTO (Excel, una hoja por curso)
══════════════════════════════════════════════════════ */
let esbozoWB=null, esbozoFileName='';
const normTxt = t => String(t??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
async function ensureXLSX(){ if(!window.XLSX) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); }
function openEsbozo(){
  if(!currentCourse){ toast('Abrí un curso primero','error'); return; }
  document.getElementById('modal-esbozo').classList.add('active');
  if(esbozoWB) fillEsbozoSheets(); else document.getElementById('esbozo-file-input').click();
}
function closeEsbozo(){ document.getElementById('modal-esbozo').classList.remove('active'); }
async function loadEsbozoFile(input){
  const file=input.files[0]; input.value=''; if(!file) return;
  try{
    await ensureXLSX();
    esbozoWB = XLSX.read(await file.arrayBuffer(), {type:'array'});
    esbozoFileName = file.name;
    fillEsbozoSheets();
  }catch(e){ toast('No se pudo leer el Excel: '+e.message,'error'); }
}
function sheetRows(name){ const ws=esbozoWB.Sheets[name]; if(!ws||!ws['!ref']) return []; const rg=XLSX.utils.decode_range(ws['!ref']); rg.s.r=0; rg.s.c=0; return XLSX.utils.sheet_to_json(ws, {header:1, raw:true, defval:'', range:rg, blankrows:true}); }
function sheetCourseName(rows){ const r=rows.find(r=>/^nombre del curso/i.test(String(r[1]||'').trim())); return r?String(r[2]||'').trim():''; }
function fillEsbozoSheets(){
  document.getElementById('esb-file').textContent = esbozoFileName || 'Excel cargado';
  const sel=document.getElementById('esb-sheet');
  const code=normTxt(currentCourse['Código']), name=normTxt(currentCourse['Curso']||currentCourse['Nombre']);
  const opts=esbozoWB.SheetNames.map(n=>{ const rows=sheetRows(n); return {n, curso:sheetCourseName(rows), ok:rows.some(r=>/^1\.\s*m[oó]dulos/i.test(String(r[1]||'')))}; });
  let best = opts.find(o=>normTxt(o.n)===code) || opts.find(o=>o.curso && normTxt(o.curso)===name) || opts.find(o=>o.ok && normTxt(o.curso).includes(name)) || opts.find(o=>o.ok);
  sel.innerHTML = opts.map(o=>`<option value="${escHtml(o.n)}"${o.ok?'':' disabled'}>${escHtml(o.n)}${o.curso?' — '+escHtml(o.curso):''}${o.ok?'':' (sin formato de esbozo)'}</option>`).join('');
  if(best) sel.value=best.n;
  previewEsbozo();
}
function parseEsbozoSheet(rows){
  const B=r=>String(r[1]??'').trim(), C=r=>String(r[2]??'').trim(), D=r=>String(r[3]??'').trim(), E=r=>String(r[4]??'').trim();
  const strip=t=>String(t||'').replace(/^\s*\d+\s*[.)]\s*/,'').replace(/\.\s*$/,'').trim();
  const sec=r=>{ const m=B(r).match(/^(\d)\.\s/); return m?parseInt(m[1]):0; };
  const out={ nombre:'', requisitos:'', cuatrimestre:'', modulos:[], evaluacion:[], cronograma:[], proyecto:{contexto:'',pasos:[]}, software:[], bibliografia:{}, competencia:[] };
  let cur=0, hdr=null, bibGroup='';
  rows.forEach((r,i)=>{
    if(/^nombre del curso/i.test(B(r))){ out.nombre=C(r); return; }
    if(/^requisitos/i.test(B(r))){ out.requisitos=C(r); return; }
    if(/^cuatrimestre/i.test(B(r))){ out.cuatrimestre=C(r); return; }
    const sn=sec(r); if(sn){ cur=sn; hdr=null; return; }
    if(cur===1){
      const mm=B(r).match(/^m[oó]dulo\s+(\d+)\s*[.:]?\s*(.*)$/i);
      if(mm){ if(mm[2] && !/^x+$/i.test(mm[2])) out.modulos.push({name:mm[2].trim(), subtemas:[]}); return; }
      const st=strip(C(r)); if(st && out.modulos.length) out.modulos[out.modulos.length-1].subtemas.push(st);
    } else if(cur===2){
      if(/^nombre$/i.test(B(r))){ hdr=true; return; }
      const nm=B(r); if(!nm) return;
      let pct=r[3]; pct = typeof pct==='number' ? (pct<=1?Math.round(pct*100):Math.round(pct)) : parseInt(String(pct).replace('%',''))||0;
      out.evaluacion.push({nombre:nm, entregables:parseInt(r[2])||1, pct});
    } else if(cur===3){
      if(/^semana$/i.test(B(r))) return;
      const sem=parseInt(r[1]); if(!sem) return;
      out.cronograma.push({semana:sem, contenido:C(r), entregable:/^no hay/i.test(D(r))?'':D(r)});
    } else if(cur===4){
      if(/^contexto del proyecto/i.test(B(r))) return;
      if(B(r)) out.proyecto.contexto += (out.proyecto.contexto?' ':'')+B(r);
      const ps=strip(C(r)); if(ps) out.proyecto.pasos.push(ps);
    } else if(cur===5){
      if(/^nombre del software/i.test(B(r))) return;
      const nm=strip(B(r)); if(!nm) return;
      out.software.push({nombre:nm, url:C(r).split(/\s+/)[0]||'', descripcion:D(r).replace(/\s+/g,' ')});
    } else if(cur===6){
      const t=B(r); if(!t) return;
      if(/^bibliograf[ií]a|^est[aá]ndares$/i.test(t) && t.length<45){ bibGroup=t; return; }
      (out.bibliografia[bibGroup||'Bibliografía']=out.bibliografia[bibGroup||'Bibliografía']||[]).push(t.replace(/\s+/g,' '));
    } else if(cur===7){
      if(!hdr){ if(B(r)||C(r)||D(r)){ hdr=[B(r),C(r),D(r)]; } return; }
      [B(r),C(r),D(r)].forEach((v,k)=>{ if(v && hdr[k]) out.competencia.push({campo:hdr[k].replace(/\s+$/,''), texto:v.replace(/\s+/g,' ')}); });
    }
  });
  return out;
}
function previewEsbozo(){
  const name=document.getElementById('esb-sheet').value; const box=document.getElementById('esb-preview');
  if(!esbozoWB || !name){ box.style.display='none'; return; }
  const e=parseEsbozoSheet(sheetRows(name)); window.__esbozo=e;
  const nsub=e.modulos.reduce((t,m)=>t+m.subtemas.length,0);
  const row=(k,v)=>`<div class="tx-row"><strong>${k}</strong><span>${v}</span></div>`;
  box.innerHTML = row('Curso', escHtml(e.nombre||'—'))
    + row('Temario', `${e.modulos.length} módulos · ${nsub} subtemas`)
    + row('Evaluación', e.evaluacion.map(a=>`${escHtml(a.nombre)} (${a.entregables}) ${a.pct}%`).join(' · ')||'—')
    + row('Proyecto', `${e.proyecto.pasos.length} pasos${e.proyecto.contexto?' + contexto':''}`)
    + row('Software', e.software.map(s=>escHtml(s.nombre)).join(', ')||'—')
    + row('Bibliografía', Object.values(e.bibliografia).reduce((t,l)=>t+l.length,0)+' referencias')
    + row('Competencia', e.competencia.length?e.competencia.map(c=>escHtml(c.campo)).join(' · '):'—');
  box.style.display='';
  document.getElementById('esb-btn').disabled = !(e.modulos.length||e.evaluacion.length);
}
function importEsbozo(){
  const e=window.__esbozo; if(!e) return;
  const nameC=normTxt(currentCourse['Curso']||currentCourse['Nombre']);
  if(e.nombre && nameC && normTxt(e.nombre)!==nameC && !confirm(`La hoja es de "${e.nombre}" y tenés abierto "${currentCourse['Curso']||currentCourse['Nombre']}". ¿Importarla igual?`)) return;
  closeEsbozo();
  const items=[];
  if(e.modulos.length) items.push({label:`Temario del experto (${e.modulos.length} módulos)`, secId:'modulos',
    value:e.modulos.map((m,i)=>`Módulo ${i+1}. ${m.name}\n${m.subtemas.map(s=>'- '+s).join('\n')}`).join('\n\n'), icon:'📚'});
  if(e.evaluacion.length){ const tot=e.evaluacion.reduce((t,a)=>t+a.pct,0); const nEnt=e.evaluacion.reduce((t,a)=>t+a.entregables,0);
    items.push({label:`Sistema de evaluación${tot!==100?' ⚠ suma '+tot+'%':''}${nEnt>8?' ⚠ '+nEnt+' entregas':''}`, secId:'eva_tabla',
      value:e.evaluacion.map(a=>`${a.nombre} (${a.entregables}) | ${a.pct}%`).join('\n'), icon:'📊'}); }
  const groups=Object.entries(e.bibliografia);
  const ob=groups.filter(([g])=>/obligatoria/i.test(g)).flatMap(([,l])=>l);
  const co=groups.filter(([g])=>!/obligatoria/i.test(g)).flatMap(([,l])=>l);
  if(ob.length) items.push({label:`Bibliografía obligatoria (${ob.length})`, secId:'biblio_ob', value:ob.join('\n'), icon:'📕'});
  if(co.length) items.push({label:`Bibliografía complementaria (${co.length})`, secId:'biblio_co', value:co.join('\n'), icon:'📗'});
  const ins={ proyecto:e.proyecto, software:e.software, competencia:e.competencia, cronograma:e.cronograma, requisitos:e.requisitos, origen:esbozoFileName+' · '+document.getElementById('esb-sheet').value };
  items.push({label:'Insumos del experto para Claude (proyecto, software, competencia, cronograma)', secId:'_esbozo', value:JSON.stringify(ins),
    preview:[e.proyecto.contexto&&('Proyecto: '+e.proyecto.contexto.slice(0,220)+(e.proyecto.contexto.length>220?'…':'')),
      e.proyecto.pasos.length&&(`Pasos (${e.proyecto.pasos.length}): `+e.proyecto.pasos.slice(0,6).join(' · ')+(e.proyecto.pasos.length>6?' …':'')),
      e.software.length&&('Software: '+e.software.map(s=>s.nombre).join(', ')),
      ...e.competencia.map(c=>`${c.campo}: ${c.texto.slice(0,160)}${c.texto.length>160?'…':''}`)].filter(Boolean).join('\n'), icon:'🧩'});
  renderReviewItems(items, `Esbozo del experto — ${e.nombre||''}: revisá y aplicá (o "Aplicar todo"). Los insumos se suman a los prompts de Claude.`);
}
document.getElementById('modal-esbozo')?.addEventListener('click',ev=>{ if(ev.target===ev.currentTarget) closeEsbozo(); });
function esbozoPromptBlock(s, mode){
  const e=safeJSON(s._esbozo||'null',null); if(!e) return '';
  const L=[];
  if(mode==='ficha'){
    if(e.proyecto?.contexto) L.push(`Contexto del proyecto según el experto: ${e.proyecto.contexto}`);
    if(e.proyecto?.pasos?.length) L.push(`Pasos del proyecto según el experto (base para los 15 criterios del RA 1, en el mismo orden, sin copiarlos literalmente):\n${e.proyecto.pasos.map((p,i)=>`${i+1}. ${p}`).join('\n')}`);
    if(e.competencia?.length) L.push(`Insumos del experto para la competencia:\n${e.competencia.map(c=>`- ${c.campo}: ${c.texto}`).join('\n')}`);
  }
  if(e.software?.length) L.push(`Software que propone el experto (en ${mode==='ficha'?'la ficha':'el programa'} se usa el término genérico; los nombres van solo en recursos didácticos):\n${e.software.map(x=>`- ${x.nombre}${x.descripcion?': '+x.descripcion:''}`).join('\n')}`);
  if(mode==='programa'){
    if(e.proyecto?.contexto) L.push(`Contexto del proyecto según el experto: ${e.proyecto.contexto}`);
    if(e.cronograma?.length) L.push(`Cronograma que sugirió el experto (referencia; las reglas de la skill mandan):\n${e.cronograma.map(c=>`S${c.semana}: ${c.contenido}${c.entregable?' → '+c.entregable:''}`).join('\n')}`);
  }
  return L.length ? `ESBOZO DEL EXPERTO (respetá su intención; la redacción sigue las reglas de la skill)\n${L.join('\n\n')}` : '';
}

function fichaDocxToItems(d){
  const items=[];
  if (Object.keys(d.datos).length){
    items.push({label:'Datos generales (para la descarga en Word)', secId:'_datos', value:JSON.stringify(d.datos),
      preview:Object.entries(d.datos).map(([k,v])=>`${k.replace(/^_/,'').replace('escuela','Escuela').replace('carrera','Carrera')}: ${v.replace(/\n/g,' · ')}`).join('\n'), icon:'ℹ'});
  }
  if (d.competencia) items.push({label:'Competencia específica', secId:'competencia', value:d.competencia, icon:'🏆'});
  if (d.mods.length){
    items.push({label:`Módulos y subtemas (${d.mods.length})`, secId:'modulos',
      value:d.mods.map(m=>`${m.name}\n${m.subtemas.map(s=>'- '+s).join('\n')}`).join('\n\n'), icon:'📚'});
  }
  d.cuadro.slice(0,3).forEach((c,i)=>{
    const n=i+1;
    const act = c.actividad || d.evaRows[i]?.name || '';
    items.push({label:`RA ${n}${act?' · '+act:''}`, secId:`ra${n}`, value:c.ra, icon:'🎯'});
    if (c.criterios.length) items.push({label:`CD ${n} (${c.criterios.length} criterios)`, secId:`cd${n}`, value:c.criterios.join('\n'), icon:'📋'});
    if (act) items.push({label:`Evidencia ${n}${c.evidencias.length?'':' (solo el nombre; la ficha no trae evidencias)'}`, secId:`e${n}`, value:[act,...c.evidencias].join('\n'), icon:'📎'});
  });
  if (d.evaRows.length){
    const total=d.evaRows.reduce((t,r)=>t+r.pct,0);
    items.push({label:`Tabla de evaluaciones${total!==100?' ⚠ suma '+total+'%':''}`, secId:'eva_tabla',
      value:d.evaRows.map(r=>`${r.name} (${r.count}) | ${r.pct}%`).join('\n'),
      preview:d.evaRows.map(r=>`${r.name} (${r.count}) — ${r.pct}%${r.nota?' · '+r.nota:''}`).join('\n'), icon:'📊'});
    const notas=d.evaRows.filter(r=>r.nota).map(r=>({nombre:r.name, nota:r.nota}));
    if (notas.length) items.push({label:'Notas de diseño de las actividades', secId:'_notas_eva', value:JSON.stringify(notas),
      preview:notas.map(x=>`${x.nombre}: ${x.nota}`).join('\n'), icon:'🗒'});
  }
  const pr=d.programa;
  if (pr){
    const ds=pr.descripcion||{};
    if (ds.objeto) items.push({label:'Objeto de estudio', secId:'descripcion_objeto', value:ds.objeto, icon:'📖'});
    if (ds.imp) items.push({label:'Importancia', secId:'descripcion_import', value:ds.imp, icon:'⭐'});
    if (ds.enc) items.push({label:'En el curso…', secId:'descripcion_en_curso', value:ds.enc, icon:'🎯'});
    if (ds.ras) items.push({label:'Rasgos de perfil', secId:'descripcion_rasgos', value:ds.ras, icon:'👤'});
    if (pr.metodologias.length) items.push({label:`Metodologías (${pr.metodologias.length})`, secId:'metodologias', value:pr.metodologias.join('\n'), icon:'🧠'});
    if (pr.estrategias.length) items.push({label:`Estrategias de aprendizaje (${pr.estrategias.length})`, secId:'estrategias', value:pr.estrategias.join('\n'), icon:'🎲'});
    if (pr.tipos.length) items.push({label:'Tipos de evaluación', secId:'eva_tipo', value:pr.tipos.join('\n'), icon:'🔍'});
    pr.actividades.slice(0,3).forEach((a,i)=>{ if(a.descripcion) items.push({label:`Descripción evaluación ${i+1}${a.nombre?' · '+a.nombre:''}`, secId:`eva_desc${i+1}`, value:a.descripcion, icon:'📝'}); });
    const crits = [1,2,3].map(n=>(d.cuadro[n-1]?.criterios)||[]);
    const rub = pr.actividades.slice(0,3).map((a,i)=>({ nombre: a.nombre || d.evaRows[i]?.name || '', rubrica: a.rubrica.map((r,j)=>({criterio:crits[i][j]||'', titulo:r.titulo, niveles:r.niveles})) })).filter(a=>a.rubrica.length);
    if (rub.length) items.push({label:'Rúbricas (se guardan para la exportación)', secId:'_rubricas', value:JSON.stringify(rub),
      preview:rub.map(a=>`${a.nombre} — ${a.rubrica.length} criterios, ${a.rubrica.length*4} puntos`).join('\n'), icon:'▦'});
    if (pr.recursos.length) items.push({label:'Recursos didácticos', secId:'recursos', value:pr.recursos.join('\n'), icon:'🛠️'});
    if (pr.biblio_ob.length) items.push({label:'Bibliografía obligatoria', secId:'biblio_ob', value:pr.biblio_ob.join('\n'), icon:'📕'});
    if (pr.biblio_co.length) items.push({label:'Bibliografía complementaria', secId:'biblio_co', value:pr.biblio_co.join('\n'), icon:'📗'});
    if (pr.cronograma){
      const sch=pr.cronograma;
      items.push({label:'Cronograma (sesiones 1 a 14)', secId:'cronograma', value:JSON.stringify(sch),
        preview:Object.entries(sch).map(([k,v])=>`S${k} · Módulo ${v.mod}${v.note?' — '+v.note.split('\n').join(' / '):''}`).join('\n'), icon:'📅'});
    }
  }
  return items;
}

// ── Una ficha (pantalla del curso) ─────────────────────
async function uploadFicha(input){
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  document.getElementById('ficha-loading').classList.add('active');
  document.getElementById('ficha-hint').style.display = 'none';
  document.getElementById('ficha-result').classList.remove('visible');
  try {
    const xml = await readDocxXml(file);
    const d = parseFichaDocx(xml);
    let items = fichaDocxToItems(d);
    const code = currentCourse?.['Código']||'';
    if (d.codigo && code && d.codigo.toUpperCase()!==code.toUpperCase() &&
        !confirm(`La ficha es de ${d.codigo}, pero tenés abierto ${code}. ¿Cargarla igual en ${code}?`)) {
      items = null;
    }
    if (items && items.filter(i=>i.secId).length) {
      renderReviewItems(items, `Datos extraídos ${d.programa?'del programa':'de la ficha'} ${d.codigo||''} — revisá y aplicá cada sección (o "Aplicar todo")`);
    } else if (items) {
      // Formato desconocido: usar el lector anterior por texto
      fichaExtracted = parseFicha(xmlToText(xml));
      renderFichaResult(fichaExtracted);
    }
  } catch(e) {
    toast('Error leyendo el .docx: ' + e.message, 'error');
  }
  document.getElementById('ficha-loading').classList.remove('active');
  document.getElementById('ficha-hint').style.display = '';
}

// ── Varias fichas (pantalla del proyecto) ──────────────
let bulkFichas = [];
const normCode = c => String(c||'').toUpperCase().replace(/\s+/g,'').trim();

async function uploadFichasBulk(input){
  const files = Array.from(input.files||[]);
  input.value = '';
  if (!files.length) return;
  if (!currentProject){ toast('Abrí un proyecto primero','error'); return; }
  toast(`Leyendo ${files.length} ficha${files.length>1?'s':''}…`);
  bulkFichas = [];
  for (const f of files){
    const entry = { file:f.name, ok:false };
    try {
      const d = parseFichaDocx(await readDocxXml(f));
      if (!d.codigo){ const m=f.name.match(/([A-Z]{2,6}-\d{2,4})/i); if(m) d.codigo=m[1].toUpperCase(); }
      entry.data = d;
      entry.items = fichaDocxToItems(d).filter(i=>i.secId);
      entry.code = d.codigo;
      entry.course = (allCourses||[]).find(c=>normCode(c['Código'])===normCode(d.codigo));
      entry.ok = !!entry.items.length;
    } catch(e){ entry.error = e.message; }
    bulkFichas.push(entry);
  }
  renderBulkModal();
}

function renderBulkModal(){
  const sid = currentProject.sheetId;
  const rows = bulkFichas.map((e,i)=>{
    const existing = e.course ? Object.keys(maestroData[sid]?.[e.course['Código']]||{}).filter(k=>!k.startsWith('_')).length : 0;
    let estado, cls='';
    if (e.error){ estado=`No se pudo leer: ${escHtml(e.error)}`; cls='bk-err'; }
    else if (!e.ok){ estado='No encontré datos de ficha'; cls='bk-err'; }
    else if (!e.course){ estado=`El código ${escHtml(e.code||'?')} no está en la hoja Base`; cls='bk-warn'; }
    else estado=`${e.items.length} campos${existing?` · ya tiene ${existing} guardados`:''}`;
    const can = e.ok && e.course;
    const ra = e.data?.cuadro?.length||0, mods=e.data?.mods?.length||0, ev=e.data?.evaRows?.length||0;
    return `<tr class="${cls}">
      <td><input type="checkbox" class="bk-chk" data-i="${i}" ${can?'checked':'disabled'}></td>
      <td class="td-code">${escHtml(e.code||'—')}</td>
      <td>${escHtml(e.course?(e.course['Curso']||e.course['Nombre']||''):(e.data?.nombre||e.file))}<div class="bk-file">${escHtml(e.file)}</div></td>
      <td class="td-m">${e.data?`${mods} mód. · ${ra} RA · ${ev} eval.`:'—'}</td>
      <td class="bk-state">${estado}</td></tr>`;
  }).join('');
  document.getElementById('bk-body').innerHTML = rows;
  const n = bulkFichas.filter(e=>e.ok&&e.course).length;
  document.getElementById('bk-sub').textContent = `${bulkFichas.length} archivo${bulkFichas.length>1?'s':''} leído${bulkFichas.length>1?'s':''} · ${n} listo${n!==1?'s':''} para importar`;
  document.getElementById('bk-push').disabled = !gAccessToken;
  document.getElementById('bk-push-lbl').textContent = gAccessToken ? 'Subir también al Maestro' : 'Subir también al Maestro (iniciá sesión con Google)';
  document.getElementById('modal-bulk').classList.add('active');
}
function closeBulkModal(){ document.getElementById('modal-bulk')?.classList.remove('active'); }

async function applyBulkFichas(){
  const sid = currentProject.sheetId;
  const overwrite = document.getElementById('bk-overwrite').checked;
  const push = document.getElementById('bk-push').checked && !!gAccessToken;
  const chosen = Array.from(document.querySelectorAll('.bk-chk:checked')).map(c=>bulkFichas[+c.dataset.i]).filter(e=>e&&e.ok&&e.course);
  if (!chosen.length){ toast('No hay fichas seleccionadas','error'); return; }
  if (!maestroData[sid]) maestroData[sid] = {};
  let fields = 0;
  chosen.forEach(e=>{
    const code = e.course['Código'];
    if (!maestroData[sid][code]) maestroData[sid][code] = {};
    const local = maestroData[sid][code];
    e.items.forEach(it=>{
      if (!overwrite && local[it.secId]?.trim()) return;
      local[it.secId] = it.value; fields++;
    });
  });
  localStorage.setItem('dcd_maestro', JSON.stringify(maestroData));
  autoBackup();
  closeBulkModal();
  renderTable(allCourses);
  toast(`✓ ${chosen.length} ficha${chosen.length>1?'s':''} importada${chosen.length>1?'s':''} (${fields} campos)`, 'success');

  if (push){
    const sheetId = extractSheetId(currentProject.url);
    let ok=0; const fails=[];
    for (const e of chosen){
      const code = e.course['Código'];
      try {
        toast(`Subiendo ${code} al Maestro…`);
        await writeCourseToMaestro(sheetId, code, buildMaestroColMap(maestroData[sid][code]), e.course);
        ok++;
      } catch(err){ fails.push(`${code}: ${err.message}`); }
    }
    toast(fails.length ? `Maestro: ${ok} subidas, ${fails.length} con error (${fails[0]})` : `✓ ${ok} cursos subidos al Maestro`, fails.length?'error':'success');
  }
}
document.getElementById('modal-bulk').addEventListener('click',e=>{if(e.target===e.currentTarget)closeBulkModal();});
