/* Conversión entre filas del Maestro y campos de la app */
/* ══════════════════════════════════════════════════════
   CONVERSIÓN FILA DEL MAESTRO ⇄ CAMPOS DE LA APP
══════════════════════════════════════════════════════ */
const RUBRIC_SEP = ' | ';
// Rúbrica cualitativa (método tradicional): criterio completo + "de manera …".
// Niveles 1 y 4 son antónimos del mismo par; 2 y 3 toman un grado intermedio.
const RUB_PARES = {
  profundidad: ['escueta','profunda'],      // documenta, describe, explica, argumenta, analiza
  coherencia:  ['incoherente','coherente'], // organiza, integra, relaciona, estructura, diseña
  suficiencia: ['insuficiente','suficiente'],// identifica, define, determina, selecciona, compara
  adecuacion:  ['inadecuada','adecuada'],   // aplica, utiliza, emplea, implementa, ejecuta
  pertinencia: ['inapropiada','apropiada']  // resto
};
const RUB_MID2=['básica','incipiente','limitada'], RUB_MID3=['aceptable','regular','parcial'];
function rubPairFor(crit){
  const v=String(crit||'').trim().split(/\s+/)[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if (/^(documenta|describe|explica|argumenta|analiza|examina|interpreta|fundamenta|sustenta|investiga|elabora|presenta|expone|defiende|sintetiza|discute)/.test(v)) return RUB_PARES.profundidad;
  if (/^(organiza|integra|estructura|disena|modela|vincula|articula|clasifica|planifica|incorpora)/.test(v)) return RUB_PARES.coherencia;
  if (/^(identifica|define|determina|selecciona|compara|contrasta|delimita|especifica|extrae|prioriza)/.test(v)) return RUB_PARES.suficiencia;
  if (/^(aplica|utiliza|emplea|implementa|ejecuta|programa|desarrolla|codifica|despliega|automatiza|entrena|optimiza)/.test(v)) return RUB_PARES.adecuacion;
  return RUB_PARES.pertinencia;
}
function qualitativeLevels(crit, k=0){
  let c=String(crit||'').trim().replace(/[.;:\s]+$/,'');
  if (!c) return ['','','',''];
  const [lo,hi]=rubPairFor(c);
  const m2=RUB_MID2[k%RUB_MID2.length], m3=RUB_MID3[(k+1)%RUB_MID3.length];
  const join=adj=>`${c} de manera ${adj}.`;
  return [join(lo), join(m2), join(m3), join(hi)];
}
// Los niveles numéricos ("de 0 a 4 de los 10…") ya no se usan: se reemplazan por los cualitativos
function isNumericLevels(niv){ return (niv||[]).some(t=>/\b\d+\s*(a|o|y)\s*\d+\s+de\s+l[oa]s\s+\d+|\bl[oa]s\s+\d+\s+\w+|\b\d+\s+de\s+l[oa]s\s+\d+/i.test(String(t))); }
const RUB_ADJ_ALL = [...new Set([...Object.values(RUB_PARES).flat(), ...RUB_MID2, ...RUB_MID3])];
function rubCritClean(c){ return String(c||'').trim().replace(/[.;:\s]+$/,''); }
function rubLevelText(crit, adj){ const c=rubCritClean(crit); return c ? `${c} de manera ${String(adj||'').trim()}.` : ''; }
function rubAdjDefaults(crit, k=0){ const [lo,hi]=rubPairFor(rubCritClean(crit)); return [lo, RUB_MID2[k%RUB_MID2.length], RUB_MID3[(k+1)%RUB_MID3.length], hi]; }
// Adjetivos de una fila: los guardados, los que se leen de los niveles ("… de manera X.") o los sugeridos
function rubAdjOf(rk, crit, k){
  if (rk && Array.isArray(rk.adj) && rk.adj.length===4 && rk.adj.every(a=>String(a||'').trim())) return rk.adj.map(a=>String(a).trim());
  const niv=(rk&&rk.niveles)||[];
  if (niv.length>=4 && !isNumericLevels(niv)){
    const ex=niv.slice(0,4).map(t=>{ const m=String(t||'').match(/de manera\s+([^.]+?)\s*\.?\s*$/i); return m?m[1].trim():''; });
    if (ex.every(Boolean)) return ex;
  }
  return rubAdjDefaults(crit, k);
}
// Siempre: el criterio de desempeño textual + "de manera" + adjetivo
function rubricLevelsFor(rk, critText, k){
  const crit = critText || rk?.criterio || '';
  return rubAdjOf(rk, crit, k).map(a=>rubLevelText(crit, a));
}
function rubricToText(rubrica){ return (rubrica||[]).map(r=>[r.titulo||r.criterio||'', ...(r.niveles||[]).slice(0,4)].join(RUBRIC_SEP)).join('\n'); }
function textToRubric(t){
  return String(t||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{ const p=l.split(/\s\|\s/); return {titulo:(p[0]||'').trim(), criterio:'', niveles:p.slice(1,5).map(x=>x.trim())}; });
}
function maestroRowToSaved(headers, row){
  const g = col => { const i=headers.indexOf(col); return i>=0 ? String(row[i]||'').replace(/\r\n/g,'\n').trim() : ''; };
  const o = {};
  // Descripción: una parte por línea
  const desc = g('Descripción');
  if (desc){
    const ls = desc.split('\n').map(x=>x.trim()).filter(Boolean);
    const rest=[];
    ls.forEach(l=>{
      if (/^la importancia/i.test(l)) o.descripcion_import = l;
      else if (/^en el curso/i.test(l)) o.descripcion_en_curso = l;
      else if (/^este curso se relaciona/i.test(l)) o.descripcion_rasgos = l;
      else if (/^las principales tem[aá]ticas/i.test(l)) {/* se genera sola */}
      else rest.push(l);
    });
    if (rest.length) o.descripcion_objeto = rest.join(' ');
  }
  ['Competencia','RA1','CD1','E1','RA2','CD2','E2','RA3','CD3','E3'].forEach(c=>{ const v=g(c); if(v) o[c==='Competencia'?'competencia':c.toLowerCase()] = v; });
  // Temario
  const mods=[];
  for (let i=1;i<=7;i++){
    const m=g(`Modulo${i}`); if(!m) continue;
    const subs=g(`Subtemas ${i}`).split('\n').map(cleanItem).filter(Boolean);
    mods.push(`Módulo ${i}. ${stripModPrefix(m)}`+(subs.length?'\n'+subs.map(x=>'- '+x).join('\n'):''));
  }
  if (mods.length) o.modulos = mods.join('\n\n');
  const met=g('Metodologías'); if(met) o.metodologias=met;
  const est=g('Estrategias de Aprendizaje'); if(est) o.estrategias=est;
  const tip=g('Tipo_Evaluacion_EN'); if(tip && /evaluaci[oó]n\s+diagn/i.test(tip)) o.eva_tipo=tip;
  // Tabla de evaluación
  const ev=[];
  for (let i=1;i<=3;i++){ const n=g(`Eva_Tabla${i}`); if(!n) continue; const c=parseInt(g(`Cantidad_Eva_${i}`))||1; const p=parseInt(g(`Porcen_Tabla${i}`))||0; ev.push(`${n} (${c}) | ${p}%`); }
  if (ev.length) o.eva_tabla = ev.join('\n');
  [1,2,3].forEach(i=>{ const d=g(`Eva_Descrip_${i}`); if(d) o[`eva_desc${i}`]=d; });
  // Rúbricas
  const rub=[1,2,3].map(i=>({nombre:g(`Eva_Tabla${i}`), rubrica:textToRubric(g(`Eva_Rubric_${i}`))})).filter(r=>r.rubrica.length);
  if (rub.length) o._rubricas = JSON.stringify(rub);
  const r=g('Recursos'); if(r) o.recursos=r;
  const bo=g('Bibliografia_Obligatoria'); if(bo) o.biblio_ob=bo;
  const bc=g('Bibliografia_Complementaria'); if(bc) o.biblio_co=bc;
  const cg=g('Competencia General'); if(cg) o._comp_general=cg;
  const ct=g('Competencia Transversal'); if(ct) o._comp_transversal=ct;
  // Competencias de la carrera (columnas nuevas del Maestro): área de conocimiento, eje curricular y ejes transversales
  const gN = name => { const k=normTxt(name).replace(/[\s_]+/g,''); const i=headers.findIndex(h=>normTxt(h).replace(/[\s_]+/g,'')===k); return i>=0 ? String(row[i]||'').replace(/\r\n/g,'\n').trim() : ''; };
  const pairs = (nom, comp) => { const ns=nom.split('|').map(x=>x.trim()); const cs=comp.split('|').map(x=>x.trim()); const n=Math.max(ns.length, cs.length); const out=[]; for(let i=0;i<n;i++){ const a=(ns[i]||'').replace(/[.\s]+$/,''), c=cs[i]||''; if(a||c) out.push(a&&c ? `${a}. ${c}` : (a||c)); } return out.join('\n'); };
  const aN=gN('Area Conocimiento'), aC=gN('Competencia_Area_Conocimiento');
  const eN=gN('Eje Curricular'), eC=gN('Competencia_Eje_Curricular');
  const tN=gN('Eje Transversal'), tC=gN('Competencia_Transversal');
  if (aN||aC) o._comp_general = pairs(aN, aC);
  if (aN) o._area = aN.split('|')[0].replace(/[.\s]+$/,'').trim();   // para pintar la malla por área
  if (eN||eC) o._comp_curricular = pairs(eN, eC);
  if (tN||tC) o._comp_transversal = pairs(tN, tC);
  // Rasgos del perfil (columnas del Maestro; se crean aparte, en la hoja "Rasgos de Perfil")
  const rD=gN('Rasgo Declarativo'), rP=gN('Rasgo Procedimental'), rA=gN('Rasgo Actitudinal');
  if (rD||rP||rA){ o._rasgos_m = JSON.stringify([rD,rP,rA]); o.descripcion_rasgos = rasgosSentence([rD,rP,rA]); }
  // Datos generales
  const dm={}; ['Nombre','Créditos','Lectivas','Teoria','Lab','Practica','Independiente','Total','Ubicación','Requisitos'].forEach(c=>{ const v=g(c); if(v) dm[c]=v; });
  if (Object.keys(dm).length) o._datos_m = JSON.stringify(dm);
  // Cronograma
  const sch={}; let any=false;
  for (let s=1;s<=14;s++){
    const mod=g(`Cronograma_Modulo_${s}`), sub=g(`Cronograma_Subtema_${s}`), note=s>=2?g(`Actividades_EN_${s}`):'';
    if (mod||sub||note){ sch[s]={mod:'', modName:mod, sub, actName:'', verb:'', note}; any=true; }
  }
  if (any) o.cronograma = JSON.stringify(sch);
  return o;
}

async function importFromMaestro(sheetId) {
  const { headers, rows, codeIdx } = await readMaestro(sheetId);
  if (!rows.length) return 0;
  if (!maestroData[sheetId]) maestroData[sheetId] = {};
  let imported = 0;
  rows.forEach(row => {
    const code = (row[codeIdx] || '').trim();
    if (!code) return;
    if (!maestroData[sheetId][code]) maestroData[sheetId][code] = {};
    const local = maestroData[sheetId][code];
    const conv = maestroRowToSaved(headers, row);
    // Reparar campos que la versión anterior importaba mal
    if (local.eva_tabla && !parseEvaTablaText(local.eva_tabla).length && conv.eva_tabla) local.eva_tabla = '';
    if (local.descripcion_objeto && local.descripcion_objeto === local.descripcion_import) {
      ['descripcion_objeto','descripcion_import','descripcion_en_curso','descripcion_rasgos'].forEach(k=>{ if(conv[k]!==undefined || local[k]===local.descripcion_objeto) local[k]=''; });
    }
    if (local.modulos && !/m[oó]dulo\s+2/i.test(local.modulos) && /m[oó]dulo\s+2/i.test(conv.modulos||'')) local.modulos = '';
    Object.entries(conv).forEach(([k,v]) => {
      if (!v) return;
      if (/^_comp_/.test(k) || k==='_rasgos_m' || k==='_area' || (k==='descripcion_rasgos' && conv._rasgos_m)) { if (local[k]!==v){ local[k]=v; imported++; } return; }   // lo define el Maestro
      if (!String(local[k]||'').trim()) { local[k] = v; imported++; }
    });
  });
  localStorage.setItem('dcd_maestro', JSON.stringify(maestroData));
  return imported;
}

// ── WRITE course data to Maestro ──────────────────────
async function writeCourseToMaestro(sheetId, courseCode, colMap, course = currentCourse) {
  let maestro = await readMaestro(sheetId);

  // Find target row number (1-based; row 1 = headers)
  let targetRow = -1;
  for (let i = 0; i < maestro.rows.length; i++) {
    if ((maestro.rows[i][maestro.codeIdx] || '').trim() === courseCode) {
      targetRow = i + 2; break;
    }
  }

  // Row doesn't exist yet — create it
  if (targetRow === -1) {
    await ensureCourseRow(sheetId, course, maestro);
    maestro = await readMaestro(sheetId); // re-read after append
    for (let i = 0; i < maestro.rows.length; i++) {
      if ((maestro.rows[i][maestro.codeIdx] || '').trim() === courseCode) {
        targetRow = i + 2; break;
      }
    }
    if (targetRow === -1) throw new Error('No se pudo localizar la fila después de crearla.');
  }

  // Build batchUpdate payload
  const data = [];
  for (const [col, value] of Object.entries(colMap)) {
    if (!col || value == null || value === '') continue;
    const colIdx = maestro.headers.indexOf(col);
    if (colIdx === -1) continue;
    data.push({ range: `Maestro!${colIdxToLetter(colIdx)}${targetRow}`, values: [[value]] });
  }
  if (!data.length) throw new Error('No hay columnas reconocidas para actualizar.');

  await sheetsReq(`/${sheetId}/values:batchUpdate`, 'POST', {
    valueInputOption: 'RAW',
    data
  });
}

// ── CSV parser (fallback, public sheets only) ─────────
function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h.replace(/^"|"$/g, '').trim()] = (vals[i] || '').replace(/^"|"$/g, '').trim(); });
    return obj;
  }).filter(r => r['Curso'] || r['Nombre']);
}
function parseCSVLine(line) {
  const res=[]; let cur='',inQ=false;
  for(let i=0;i<line.length;i++){
    if(line[i]==='"'){if(inQ&&line[i+1]==='"'){cur+='"';i++;}else inQ=!inQ;}
    else if(line[i]===','&&!inQ){res.push(cur);cur='';}
    else cur+=line[i];
  }
  res.push(cur); return res;
}
