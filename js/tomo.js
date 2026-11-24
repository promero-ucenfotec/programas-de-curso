/* Tomo II */
/* ══════════════════════════════════════════════════════
   TOMO II — todos los programas, agrupados por cuatrimestre
══════════════════════════════════════════════════════ */
const ORDINALES=['Primer','Segundo','Tercer','Cuarto','Quinto','Sexto','Séptimo','Octavo','Noveno','Décimo','Undécimo','Duodécimo'];
function coursePeriod(c, saved){
  const fd=safeJSON(saved?._datos||'{}',{});
  const raw=String(c?.['Periodo']||c?.['Cuatrimestre']||c?.['Ubicación']||fd['Ubicación']||'').trim();
  if(/nivel/i.test(raw)) return 0;
  if(/^elec/i.test(raw)) return 99;
  const m=raw.match(/\d+/); return m?parseInt(m[0]):null;
}
function periodLabel(n){
  if(n===0) return 'Nivelatorio';
  if(n===99) return 'Electivas';
  if(n==null) return 'Otros cursos';
  return (ORDINALES[n-1]||(n+'º'))+' cuatrimestre';
}
function savedForCourse(c){ return maestroData[currentProject?.sheetId]?.[c['Código']]||{}; }
function courseHasProgram(saved){ return !!(String(saved.competencia||'').trim() && String(saved.modulos||'').trim()); }

function openTomoExport(){
  if(!currentProject){ toast('Abrí un proyecto primero','error'); return; }
  if(!allCourses?.length){ toast('Primero se deben cargar los cursos del proyecto','error'); return; }
  let pref={}; try{ pref=JSON.parse(localStorage.getItem('dcd_tomo_'+currentProject.id)||'{}'); }catch(e){}
  const cars=projectCareers(); const sel=document.getElementById('tx-carrera-sel'); const inp=document.getElementById('tx-carrera');
  if(cars.length>1){ sel.innerHTML=cars.map(c=>`<option>${escHtml(c)}</option>`).join(''); sel.value=cars.includes(pref.carrera)?pref.carrera:cars[0]; sel.style.display=''; inp.style.display='none'; }
  else { sel.style.display='none'; inp.style.display=''; inp.value=cars[0]||pref.carrera||''; }
  document.getElementById('tx-escuela').value = currentProject.escuela || pref.escuela || '';
  const carrera = cars[0]||'[carrera]';
  document.getElementById('tx-portada').value = pref.portada || `Solicitud de apertura de la ${carrera} en modalidad presencial, con base en el artículo 27 del Reglamento General del CONESUP (TRÁMITE NUEVO)`;
  const now=new Date(); const mes=now.toLocaleDateString('es-CR',{month:'long'});
  document.getElementById('tx-fecha').value = pref.fecha || `${mes[0].toUpperCase()+mes.slice(1)}, ${now.getFullYear()}`;
  const mc=document.getElementById('tx-maestro'); mc.disabled=!gAccessToken; mc.checked=!!gAccessToken;
  // Resumen por cuatrimestre
  const groups={}; allCourses.forEach(c=>{ const k=coursePeriod(c,savedForCourse(c)); (groups[k??'x']=groups[k??'x']||[]).push(c); });
  const keys=Object.keys(groups).sort((a,b)=>(a==='x')-(b==='x')||a-b);
  document.getElementById('tx-resumen').innerHTML = keys.map(k=>{
    const cs=groups[k]; const sin=cs.filter(c=>!courseHasProgram(savedForCourse(c))).length;
    return `<div class="tx-row"><strong>${periodLabel(k==='x'?null:+k)}</strong><span>${cs.length} curso${cs.length>1?'s':''}${sin?` · <em>${sin} sin programa</em>`:''}</span></div>`;
  }).join('');
  document.getElementById('tx-progress').textContent='';
  document.getElementById('modal-tomo').classList.add('active');
}
function closeTomoExport(){ document.getElementById('modal-tomo').classList.remove('active'); }

async function downloadTomo(){
  const selC=document.getElementById('tx-carrera-sel');
  const carrera=(selC.style.display!=='none'?selC.value:document.getElementById('tx-carrera').value).trim();
  const escuela=document.getElementById('tx-escuela').value.trim();
  const portada=document.getElementById('tx-portada').value.trim();
  const fecha=document.getElementById('tx-fecha').value.trim();
  const soloCompletos=document.getElementById('tx-solo').checked;
  try{ localStorage.setItem('dcd_tomo_'+currentProject.id, JSON.stringify({carrera,escuela,portada,fecha})); }catch(e){}
  const prog=document.getElementById('tx-progress'); const btn=document.getElementById('tx-btn'); btn.disabled=true;
  try{
    // Datos del Maestro (una sola lectura)
    let mRows=null;
    if(document.getElementById('tx-maestro').checked && gAccessToken){
      prog.textContent='Leyendo la hoja Maestro…';
      try{ const {headers,rows,codeIdx}=await readMaestro(extractSheetId(currentProject.url)); mRows={}; rows.forEach(r=>{ mRows[normCode(r[codeIdx])]=maestroRowToSaved(headers,r); }); }
      catch(e){ toast('No se pudo leer el Maestro; se usan los datos de la app','error'); }
    }
    const list=allCourses.map(c=>{
      let saved=Object.assign({}, savedForCourse(c));
      const fm=mRows?.[normCode(c['Código'])]; if(fm) Object.entries(fm).forEach(([k,v])=>{ if(String(v||'').trim()) saved[k]=v; });
      return {c, saved, per:coursePeriod(c,saved)};
    }).filter(x=>!soloCompletos || courseHasProgram(x.saved));
    if(!list.length){ toast('No hay cursos con programa para incluir','error'); btn.disabled=false; return; }
    const collator=new Intl.Collator('es',{numeric:true});
    list.sort((a,b)=>((a.per??999)-(b.per??999)) || collator.compare(a.c['Código']||'', b.c['Código']||''));

    // Base: la plantilla, vaciada
    const base = await buildDocx('programa',{returnDoc:true, saved:{}, course:{}});
    const doc=base.doc, zip=base.zip; const body=wEls(doc,'body')[0];
    const sectPr=wKids(body,'sectPr')[0];
    Array.from(body.childNodes).forEach(n=>{ if(n!==sectPr) body.removeChild(n); });
    const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const el=(tag,attrs={},kids=[])=>{ const e=doc.createElementNS(W,'w:'+tag); Object.entries(attrs).forEach(([k,v])=>e.setAttributeNS(W,'w:'+k,v)); kids.forEach(k=>k&&e.appendChild(k)); return e; };
    const run=(text,{b=false,sz=null,br=null}={})=>{ const rPr=el('rPr',{},[el('rFonts',{ascii:'Arial',hAnsi:'Arial',cs:'Arial'}), b?el('b'):null, sz?el('sz',{val:String(sz)}):null, sz?el('szCs',{val:String(sz)}):null]); const r=el('r',{},[rPr]); if(br) r.appendChild(el('br',{type:br})); if(text!=null){ const t=el('t',{},[]); t.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve'); t.textContent=text; r.appendChild(t);} return r; };
    const para=(runs,{jc=null,style=null,before=null,after=null}={})=>{ const pPr=el('pPr',{},[style?el('pStyle',{val:style}):null, (before!=null||after!=null)?el('spacing',Object.assign({}, before!=null?{before:String(before)}:{}, after!=null?{after:String(after)}:{})):null, jc?el('jc',{val:jc}):null]); return el('p',{},[pPr,...runs]); };
    const add=n=>body.insertBefore(n,sectPr);
    const pageBreak=()=>add(el('p',{},[el('r',{},[el('br',{type:'page'})])]));

    // Portada
    add(para([run('UNIVERSIDAD CENFOTEC',{b:true,sz:36})],{jc:'center',before:1800,after:1200}));
    add(para([run(portada,{sz:28})],{jc:'center',after:1800}));
    add(para([run('Tomo II. Programas de los cursos',{b:true,sz:32})],{jc:'center',after:2400}));
    add(para([run(fecha,{sz:24})],{jc:'center'}));
    pageBreak();

    // Tabla de contenido (campo de Word; se actualiza al abrir)
    add(para([run('Tabla de contenido',{b:true,sz:28})],{after:240}));
    const tocP=el('p'); const fb=el('fldChar',{fldCharType:'begin',dirty:'true'});
    tocP.appendChild(el('r',{},[fb]));
    const it=el('instrText'); it.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve'); it.textContent=' TOC \\o "1-2" \\h \\z \\u ';
    tocP.appendChild(el('r',{},[it])); tocP.appendChild(el('r',{},[el('fldChar',{fldCharType:'separate'})]));
    tocP.appendChild(run('Al abrir el documento, Word pregunta si actualiza los campos: respondé que sí para ver la tabla con sus páginas (o clic derecho aquí → Actualizar campo).'));
    tocP.appendChild(el('r',{},[el('fldChar',{fldCharType:'end'})]));
    add(tocP);

    // numeración y dibujos únicos
    const numXml=await zip.file('word/numbering.xml').async('string');
    const ndoc=new DOMParser().parseFromString(numXml,'text/xml'); const nroot=ndoc.documentElement;
    let nextNum=Math.max(0,...Array.from(ndoc.getElementsByTagNameNS(W,'num')).map(n=>parseInt(n.getAttributeNS(W,'numId')||n.getAttribute('w:numId'))||0))+1;
    const absOf={}; Array.from(ndoc.getElementsByTagNameNS(W,'num')).forEach(n=>{ const a=n.getElementsByTagNameNS(W,'abstractNumId')[0]; absOf[n.getAttributeNS(W,'numId')||n.getAttribute('w:numId')]=a.getAttributeNS(W,'val')||a.getAttribute('w:val'); });
    let docPrId=1000; let bmId=1;

    let lastPer;
    for(let i=0;i<list.length;i++){
      const {c,saved,per}=list[i];
      if(per!==lastPer){
        pageBreak();
        add(para([run(periodLabel(per))],{style:'Heading1',jc:'center',before:5600}));
        lastPer=per;
      }
      prog.textContent=`Armando ${c['Código']||''} (${i+1} de ${list.length})…`;
      await new Promise(r=>setTimeout(r,0));
      const one=await buildDocx('programa',{returnDoc:true, saved, course:c, escuela, carrera});
      const b2=wEls(one.doc,'body')[0];
      // listas: cada programa reinicia su numeración
      const map={};
      Array.from(b2.getElementsByTagNameNS(W,'numId')).forEach(n=>{
        const v=n.getAttributeNS(W,'val')||n.getAttribute('w:val'); if(!v||v==='0') return;
        if(!map[v]){ const nid=String(nextNum++); map[v]=nid;
          const num=ndoc.createElementNS(W,'w:num'); num.setAttributeNS(W,'w:numId',nid);
          const an=ndoc.createElementNS(W,'w:abstractNumId'); an.setAttributeNS(W,'w:val',absOf[v]||'0'); num.appendChild(an);
          for(let l=0;l<9;l++){ const lo=ndoc.createElementNS(W,'w:lvlOverride'); lo.setAttributeNS(W,'w:ilvl',String(l)); const so=ndoc.createElementNS(W,'w:startOverride'); so.setAttributeNS(W,'w:val','1'); lo.appendChild(so); num.appendChild(lo); }
          nroot.appendChild(num); }
        n.setAttributeNS(W,'w:val',map[v]);
      });
      Array.from(b2.getElementsByTagName('*')).forEach(e=>{
        ['w14:paraId','w14:textId'].forEach(a=>e.removeAttribute(a));
        if(e.localName==='docPr') e.setAttribute('id',String(docPrId++));
        if(e.localName==='bookmarkStart'||e.localName==='bookmarkEnd'){ const idv=e.getAttributeNS(W,'id')||e.getAttribute('w:id'); e.setAttributeNS(W,'w:id',String(bmId*1000+(parseInt(idv)||0))); if(e.localName==='bookmarkStart'){ const nm=e.getAttributeNS(W,'name')||e.getAttribute('w:name'); e.setAttributeNS(W,'w:name',(nm||'_b')+'_'+bmId); } }
      });
      bmId++;
      pageBreak();
      Array.from(b2.childNodes).forEach(n=>{ if(n.nodeType===1 && n.localName!=='sectPr') add(doc.importNode(n,true)); });
    }

    // Word actualiza la tabla de contenido al abrir
    let settings=await zip.file('word/settings.xml').async('string');
    if(!/updateFields/.test(settings)){
      const m=settings.match(/<w:(hdrShapeDefaults|footnotePr|endnotePr|compat|docVars|rsids|clrSchemeMapping)\b/);
      settings = m ? settings.replace(m[0], '<w:updateFields w:val="true"/>'+m[0]) : settings.replace('</w:settings>','<w:updateFields w:val="true"/></w:settings>');
    }
    zip.file('word/settings.xml', settings);
    zip.file('word/numbering.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+new XMLSerializer().serializeToString(ndoc).replace(/^<\?xml[^>]*\?>\s*/,''));
    zip.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+new XMLSerializer().serializeToString(doc).replace(/^<\?xml[^>]*\?>\s*/,''));
    prog.textContent='Comprimiendo el documento…';
    const blob=await zip.generateAsync({type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression:'DEFLATE'});
    const fname=`Tomo_II_Programas_de_los_cursos_${currentProject.name}.docx`.replace(/[\\/:*?"<>|]+/g,'').replace(/\s+/g,'_');
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=fname; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast(`✓ Tomo II descargado con ${list.length} programas`,'success');
    closeTomoExport();
  }catch(e){ console.error(e); toast('No se pudo generar el Tomo II: '+e.message,'error'); prog.textContent=''; }
  btn.disabled=false;
}

function openWordExport(){
  if(!currentCourse||!currentProject){ toast('Abrí un curso primero','error'); return; }
  refreshVersionUI();
  const s=currentSaved(); const d=courseDatos(currentCourse,s);
  let pref={}; try{ pref=JSON.parse(localStorage.getItem('dcd_word_'+currentProject.id)||'{}'); }catch(e){}
  document.getElementById('wx-escuela').value = currentProject.escuela || d._escuela || pref.escuela || '';
  const cars=projectCareers(); const sel=document.getElementById('wx-carrera-sel'); const inp=document.getElementById('wx-carrera');
  if(cars.length>1){
    sel.innerHTML=cars.map(c=>`<option>${escHtml(c)}</option>`).join('');
    let com0=null; try{ com0=JSON.parse(localStorage.getItem('dcd_comun_'+(currentCourse['Código']||''))||'null'); }catch(e){}
    const want=[com0?.carrera1, pref.carrera, d._carrera].find(x=>x && cars.includes(x));
    sel.value = want || cars[0];
    sel.style.display=''; inp.style.display='none';
  } else {
    sel.style.display='none'; inp.style.display='';
    inp.value = cars[0] || d._carrera || pref.carrera || '';
  }
  const miss=fichaMissing(s);
  const w=document.getElementById('wx-warn');
  const reps=repeatedPhrases(s);
  const msgs=[];
  if(miss.length) msgs.push(`A este curso le falta: ${miss.join(', ')}. Esos espacios quedarán vacíos en el documento.`);
  nameChecks(s).forEach(x=>msgs.push(x));
  if(reps.length) msgs.push(`Frases que se repiten en varias partes del programa: ${reps.slice(0,4).map(x=>`«${x.frase}» (${x.secciones.length} secciones)`).join('; ')}. Conviene decirlas de otra manera.`);
  w.style.display = msgs.length?'block':'none';
  w.textContent = msgs.join(' ');
  // Curso común: lista de todas las carreras conocidas (de todos los proyectos)
  const allCars=[...new Set(projects.flatMap(p=>projectCareers(p)))];
  document.getElementById('wx-car-list').innerHTML=allCars.map(c=>`<option value="${escHtml(c)}">`).join('');
  let com=null; try{ com=JSON.parse(localStorage.getItem('dcd_comun_'+(currentCourse['Código']||''))||'null'); }catch(e){}
  document.getElementById('wx-comun').checked = !!com?.on;
  document.getElementById('wx-carrera2').value = com?.carrera2 || '';
  toggleComun();
  const mc=document.getElementById('wx-maestro'); mc.disabled=!gAccessToken; mc.checked=!!gAccessToken;
  document.getElementById('wx-maestro-lbl').textContent = gAccessToken ? 'Completar con los datos más recientes de la hoja Maestro' : 'Completar con la hoja Maestro (iniciá sesión con Google)';
  document.getElementById('modal-word').classList.add('active');
}
async function savedFromMaestroRow(){
  const sheetId=extractSheetId(currentProject.url);
  const { headers, rows, codeIdx } = await readMaestro(sheetId);
  const code=normCode(currentCourse['Código']);
  const row=rows.find(r=>normCode(r[codeIdx])===code);
  return row ? maestroRowToSaved(headers,row) : null;
}
function wordCarrera1(){
  const selC=document.getElementById('wx-carrera-sel');
  return (selC.style.display!=='none' ? selC.value : document.getElementById('wx-carrera').value).trim();
}
function toggleComun(){
  const on=document.getElementById('wx-comun').checked;
  document.getElementById('wx-car2-wrap').style.display = on ? '' : 'none';
  const in2=document.getElementById('wx-carrera2');
  if (on && !in2.value.trim()){
    // Si el proyecto ya tiene dos carreras, se propone la otra
    const other=projectCareers().find(c=>c!==wordCarrera1());
    if (other) in2.value=other;
  }
}
function closeWordExport(){ document.getElementById('modal-word')?.classList.remove('active'); }
function wordVersion(){ return courseVersion(); }
// ── Versiones del programa (PRL1, PRL2, PRL3, Final) ──
const VERSIONES=['PRL1','PRL2','PRL3','Final'];
function courseVersion(){ let v=''; try{ v=localStorage.getItem('dcd_ver_'+(currentCourse?.['Código']||''))||''; }catch(e){} return v.trim()||'PRL1'; }
function verOptions(cur){ const l=VERSIONES.includes(cur)?VERSIONES:VERSIONES.concat([cur]); return l.map(v=>`<option value="${escHtml(v)}"${v===cur?' selected':''}>${escHtml(v)}</option>`).join(''); }
function verSnapKey(v){ return `dcd_vsnap_${currentProject?.id||''}_${currentCourse?.['Código']||''}_${v}`; }
function saveVersionSnap(v, values){ try{ localStorage.setItem(verSnapKey(v), JSON.stringify({version:v, at:new Date().toISOString(), values})); }catch(e){} }
function versionSnap(v){ return safeJSON(localStorage.getItem(verSnapKey(v))||'null', null); }
// Base contra la que se resalta: la versión anterior (PRL2 → PRL1, PRL3 → PRL2). PRL1 y Final no se resaltan.
function versionBase(ver){
  ver=ver||courseVersion(); const i=VERSIONES.indexOf(ver);
  if (i<1 || ver==='Final'){
    // Versiones fuera de la lista (por ejemplo RAM1): se compara con el programa revisado si existe
    if (i<0){ const rb=revBase(); return rb?{version:rb.version||'la versión revisada', values:rb.values}:null; }
    return null;
  }
  const prev=VERSIONES[i-1]; const rb=revBase();
  if (rb && String(rb.version||'').toUpperCase()===prev.toUpperCase()) return {version:prev, values:rb.values};
  const sn=versionSnap(prev); if (sn) return {version:prev, values:sn.values};
  for (let k=i-2;k>=0;k--){ const s2=versionSnap(VERSIONES[k]); if(s2) return {version:VERSIONES[k], values:s2.values}; }
  return rb?{version:rb.version||'la versión revisada', values:rb.values}:null;
}
function setCourseVersion(v){
  if (!currentCourse) return;
  const old=courseVersion(); v=String(v||'').trim()||'PRL1';
  // Al pasar a una versión nueva sin copia de la anterior, lo que hay ahora queda como la anterior
  const io=VERSIONES.indexOf(old), iv=VERSIONES.indexOf(v);
  if (iv>io && io>=0 && !versionSnap(old)) saveVersionSnap(old, currentSaved());
  rememberVersion(currentCourse['Código']||'', v);
  refreshVersionUI();
  toast(v==='Final' ? 'Versión Final: el Word se descarga sin resaltar' : `Versión ${v}`, 'success');
}
function refreshVersionUI(){
  const v=courseVersion();
  ['ci-ver','wx-ver'].forEach(id=>{ const el=document.getElementById(id); if(el) el.innerHTML=verOptions(v); });
  const w=document.getElementById('wx-hl-wrap'); if(!w) return;
  const b=versionBase(v);
  if (b){ const n=revChangedKeys(b.values,currentSaved()).length; w.style.display='';
    document.getElementById('wx-hl-lbl').textContent=`Resaltar en amarillo lo diferente a ${b.version} (${n} sección${n===1?'':'es'} con cambios)`; }
  else w.style.display='none';
}
function wordFileName(mode, ver){
  const code=(currentCourse['Código']||'curso').trim(); const name=(currentCourse['Curso']||currentCourse['Nombre']||'').trim();
  const base = mode==='programa' ? `${code} ${name}` : `${code} ${name} Ficha`;
  return `${base} (${ver||wordVersion()}).docx`.replace(/[\\/:*?"<>|]+/g,'').replace(/\s+/g,' ').trim();
}
async function prepareWordBlob(mode){
  { const em=evaTablaMismatch(currentSaved()); if(em) toast('⚠ '+em+' La oración de las estrategias usa los nombres del cuadro; revisá la tabla de evaluación.','error'); }
  const escuela=document.getElementById('wx-escuela').value.trim();
  const carrera=wordCarrera1();
  const comun=document.getElementById('wx-comun').checked;
  let carrera2=comun ? document.getElementById('wx-carrera2').value.trim() : '';
  if (carrera2 && carrera2===carrera) carrera2='';
  try{ localStorage.setItem('dcd_word_'+currentProject.id, JSON.stringify({escuela,carrera})); }catch(e){}
  try{ localStorage.setItem('dcd_comun_'+(currentCourse['Código']||''), JSON.stringify({on:comun, carrera1:carrera, carrera2:document.getElementById('wx-carrera2').value.trim()})); }catch(e){}
  rememberVersion(currentCourse['Código']||'', wordVersion());
  if (projectCareers().length>=2) rememberCareer(currentCourse['Código']||'');
  let saved = currentSaved();
    if (document.getElementById('wx-maestro').checked && gAccessToken){
      try{
        const fromM = await savedFromMaestroRow();
        if (fromM){
          // Lo del Maestro manda; lo local completa lo que el Maestro no tenga
          saved = Object.assign({}, saved);
          Object.entries(fromM).forEach(([k,v])=>{ if(String(v||'').trim()) saved[k]=v; });
        } else toast('Este curso todavía no tiene fila en el Maestro; se usan los datos de la app');
      }catch(e){ toast('No se pudo leer el Maestro; se usan los datos de la app','error'); }
    }
  let highlight=null;
  const rb=versionBase();
  if (rb && document.getElementById('wx-hl').checked){
    // Lo corregido en la app manda sobre el Maestro
    const loc=currentSaved();
    revChangedKeys(rb.values, loc).forEach(k=>{ if(saved!==loc){ if(saved===currentSaved()) saved=Object.assign({},saved); saved[k]=loc[k]; } });
    highlight=changedPieces(rb.values, saved);
  }
  if (mode==='programa') saveVersionSnap(wordVersion(), saved);
  const blob = await buildDocx(mode, {escuela, carrera, carrera2, saved, highlight});
  return { blob, fname: wordFileName(mode) };
}
async function downloadWord(mode){
  const btns=document.querySelectorAll('#modal-word .btn-primary'); btns.forEach(b=>b.disabled=true);
  try{
    const { blob, fname } = await prepareWordBlob(mode);
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=fname; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast(`✓ ${fname} descargado`,'success');
    closeWordExport();
  }catch(e){ console.error(e); toast('No se pudo generar el Word: '+e.message,'error'); }
  btns.forEach(b=>b.disabled=false);
}
document.getElementById('modal-word').addEventListener('click',e=>{if(e.target===e.currentTarget)closeWordExport();});
