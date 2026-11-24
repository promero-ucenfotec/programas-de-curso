/* Escritura del curso en el Maestro */
/* ══════════════════════════════════════════════════════
   PUSH TO MAESTRO (Google Sheets API write)
══════════════════════════════════════════════════════ */
async function pushToMaestro(){
  const sid=currentProject?.sheetId;
  const code=currentCourse?.['Código']||'';
  const saved=maestroData[sid]?.[code]||{};

  if(!Object.keys(saved).length){toast('No hay datos guardados para este curso','error');return;}
  if(!gAccessToken){toast('Inicia sesión con Google para escribir en Sheets','error');return;}

  const btn=document.getElementById('push-btn');
  btn.innerHTML='<span class="ic" aria-hidden="true">⟳</span> Guardando en Sheets…';btn.disabled=true;

  try{
    const sheetId=extractSheetId(currentProject.url);
    const colMap = buildMaestroColMap(saved);

    await writeCourseToMaestro(sheetId, code, colMap);
    toast(`✓ "${code}" guardado en Maestro (${Object.keys(colMap).length} columnas)`,'success');
    if (currentProject.folderFichas || currentProject.folderProgramas){
      btn.innerHTML='<span class="ic" aria-hidden="true">⟳</span> Subiendo Word a Drive…';
      await uploadCourseWords();
    }

    const lbl=document.getElementById('save-lbl');
    lbl.textContent='✓ Sincronizado con Sheets';
    lbl.classList.add('show');
    setTimeout(()=>{lbl.classList.remove('show');lbl.textContent='✓ Guardado';},3000);

  }catch(err){
    toast('Error: '+err.message,'error');
  }
  btn.innerHTML='<span class="ic" aria-hidden="true">↑</span> Guardar en Maestro';btn.disabled=false;
}

/* ══════════════════════════════════════════════════════
   BUILD MAESTRO COLUMN MAP
   Transforms the local store (section-keyed) into the
   exact column structure the Maestro sheet expects.
══════════════════════════════════════════════════════ */
function buildMaestroColMap(saved) {
  const colMap = {};

  // ── Descripción (5 parts joined, with auto-generated temáticas sentence) ──
  // Order: objeto → importancia → en_curso → temáticas+evaluaciones → rasgos
  const descObj    = saved.descripcion_objeto   || '';
  const descImp    = saved.descripcion_import   || '';
  const descCurso  = saved.descripcion_en_curso || '';
  const descRasgos = courseRasgos(currentCourse?.['Código']||'', saved) || '';

  // Auto-generate: "Las principales temáticas por abordar son [...]. Las estrategias de evaluación son [...]."
  const tematicasSentence = buildTematicasSentence(saved);

  const descParts = [descObj, descImp, descCurso, tematicasSentence, descRasgos].filter(Boolean);
  if (descParts.length) colMap['Descripción'] = descParts.join('\n');

  // ── Competencia ───────────────────────────────────
  if (saved.competencia) colMap['Competencia'] = saved.competencia;

  // ── RA / CD / E (1-3) ─────────────────────────────
  [1,2,3].forEach(n => {
    if (saved[`ra${n}`]) colMap[`RA${n}`] = saved[`ra${n}`];
    if (saved[`cd${n}`]) colMap[`CD${n}`] = saved[`cd${n}`];
    if (saved[`e${n}`])  colMap[`E${n}`]  = saved[`e${n}`];
  });

  // ── Módulos → Modulo1…7 + Subtemas 1…7 ───────────
  // saved.modulos is a big text block:
  // "Módulo 1. Nombre\n- subtema\n- subtema\n\nMódulo 2..."
  if (saved.modulos) {
    const mods = splitModulos(saved.modulos);
    mods.forEach((m, i) => {
      const n = i + 1;
      if (n > 7) return;
      colMap[`Modulo${n}`]    = m.name;
      colMap[`Subtemas ${n}`] = m.subtemas.join('\n');
    });
  }

  // ── Metodologías / Estrategias ────────────────────
  if (saved.metodologias) colMap['Metodologías'] = saved.metodologias;
  if (saved.estrategias)  colMap['Estrategias de Aprendizaje'] = saved.estrategias;

  // ── Tipos de evaluación ───────────────────────────
  if (saved.eva_tipo || saved.eva_tabla) {
    colMap['Tipo_Evaluacion_EN'] = saved.eva_tipo || saved.eva_tabla || '';
  }

  // ── Tabla de evaluaciones ─────────────────────────
  // saved.eva_tabla: free-form text OR structured from ficha
  // We parse it to fill Eva_Tabla1/2/3, Cantidad, Porcen, Distri
  const evaRows = parseEvaTablaText(saved.eva_tabla || '');
  evaRows.forEach((row, i) => {
    const n = i + 1;
    if (n > 3) return;
    colMap[`Eva_Tabla${n}`]    = row.name;
    colMap[`Cantidad_Eva_${n}`] = String(row.count);
    colMap[`Porcen_Tabla${n}`]  = `${row.pct}%`;            // texto: "40%"
    colMap[`Eva_Distri_${n}`]   = buildDistriText(row);     // "40% total" / "30%, 10% cada uno"
  });

  // ── Descripciones de evaluación ───────────────────
  [1,2,3].forEach(n => {
    if (saved[`eva_desc${n}`]) colMap[`Eva_Descrip_${n}`] = saved[`eva_desc${n}`];
  });

  // ── Rúbricas y competencias del área ──────────────
  safeJSON(saved._rubricas||'[]',[]).forEach((r,i)=>{ if(i<3 && r.rubrica?.length) colMap[`Eva_Rubric_${i+1}`] = rubricToText(r.rubrica); });
  if (saved._comp_general) colMap['Competencia General'] = saved._comp_general;
  if (saved._comp_transversal) colMap['Competencia Transversal'] = saved._comp_transversal;

  // ── Recursos / Bibliografía ───────────────────────
  if (saved.recursos)   colMap['Recursos'] = saved.recursos;
  if (saved.biblio_ob)  colMap['Bibliografia_Obligatoria'] = saved.biblio_ob;
  if (saved.biblio_co)  colMap['Bibliografia_Complementaria'] = saved.biblio_co;

  // ── Cronograma → Sesion_N, Cronograma_Modulo_N, etc ─
  if (saved.cronograma) {
    try {
      const sch = JSON.parse(saved.cronograma);
      for (let s = 1; s <= 14; s++) {
        const d = sch[s] || {};
        colMap[`Sesion_${s}`] = String(s);
        // Use modName (full name) if available, else mod index
        const cronModName = d.modName || d.mod || '';
        if (cronModName) colMap[`Cronograma_Modulo_${s}`]  = cronModName;
        if (d.sub)       colMap[`Cronograma_Subtema_${s}`] = d.sub;
        if (s >= 2 && d.note) colMap[`Actividades_EN_${s}`] = d.note;
      }
    } catch(e) {}
  }

  // Sanitize all values: fix _NL_ artifacts, collapse multiple newlines
  Object.keys(colMap).forEach(k => {
    if (typeof colMap[k] === 'string') {
      colMap[k] = colMap[k]
        .replace(/_NL_/g, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/\n{2,}/g, '\n');
    }
  });

  return colMap;
}

// ── Build "Las principales temáticas..." sentence ─────
function buildTematicasSentence(saved) {
  // Use manual override if set
  if (saved._tematicas_override) {
    const ov = saved._tematicas_override;
    return tematicasFromLines((ov.mods||'').trim().split('\n').filter(Boolean), (ov.evas||'').trim().split('\n').filter(Boolean));
  }

  // Auto-generate from saved data
  const mods = saved.modulos ? splitModulos(saved.modulos) : [];
  // Las estrategias salen del cuadro de competencia (nombres exactos); la tabla solo si el cuadro no las trae
  const cuadro = [1,2,3].map(n=>activityName(saved,n)).filter(Boolean);
  const evaRows = cuadro.length ? cuadro.map(name=>({name})) : parseEvaTablaText(saved.eva_tabla || '');
  if (!mods.length && !evaRows.length) return '';

  let sentence = '';
  if (mods.length) {
    const modNames = mods.map(m => withArticles(lowerFirst(m.name.replace(/^(m[oó]dulo|module)\s+\d+[.:]?\s*/i,'').trim())));
    sentence += 'Las principales temáticas por abordar son ' + listY(modNames) + '.';
  }
  if (evaRows.length) {
    const evaList = evaRows.map(r => /^(el|la|los|las)\s/i.test(r.name) ? lowerFirst(r.name) : articleFor(lowerFirst(r.name)) + ' ' + lowerFirst(r.name));
    if (sentence) sentence += ' ';
    sentence += 'Las estrategias de evaluación son ' + listY(evaList) + '.';
  }
  return sentence;
}

// ── Artículos en las listas de temas y actividades ──
// "análisis del problema" → "el análisis del problema"; "especificación y calidad" → "la especificación y la calidad"
function lowerFirst(t){ t=String(t||'').trim(); if(!t) return t; const w=t.split(/\s+/)[0]; return /^[A-ZÁÉÍÓÚÑ]{2,}$/.test(w) ? t : t[0].toLowerCase()+t.slice(1); }
const MASC_A = /^(sistema|problema|programa|tema|esquema|diagrama|mapa|d[ií]a|clima|idioma|dilema|paradigma|teorema|axioma|lema|planeta|aroma|drama|enigma|prisma|s[ií]ntoma|panorama)s?$/i;
const FEM_IS = /^(s[ií]ntesis|tesis|crisis|hip[oó]tesis|di[aá]lisis|par[aá]lisis|praxis|dosis|metamorfosis|g[eé]nesis)$/i;
function nounGender(word){
  const w=String(word||'').toLowerCase();
  if (MASC_A.test(w)) return 'm';
  if (FEM_IS.test(w)) return 'f';
  if (/(ci[oó]n|si[oó]n|dad|tad|tud|umbre|ie|ncia|ura|eza|[ií]a)s?$/.test(w) || /(ciones|siones|dades)$/.test(w)) return 'f';
  if (/as?$/.test(w)) return 'f';
  return 'm';
}
function isPlural(word){ const w=String(word||'').toLowerCase(); return /s$/.test(w) && !/(is|us)$/.test(w); }
function articleFor(phrase, indefinite=false){
  const w=String(phrase||'').trim().split(/\s+/)[0]||'';
  const g=nounGender(w.replace(/(es|s)$/i, m=> isPlural(w)?'':m)) ; const pl=isPlural(w);
  if (indefinite && !pl) return g==='f'?'una':'un';
  return pl ? (g==='f'?'las':'los') : (g==='f'?'la':'el');
}
function withArticles(phrase){
  let t=String(phrase||'').trim(); if(!t) return t;
  if (!/^(el|la|los|las|un|una|lo)\s/i.test(t)) t = articleFor(t)+' '+t;
  // Sustantivos abstractos coordinados con "y" también llevan su artículo
  return t.replace(/\sy\s(?!(el|la|los|las|un|una)\s)([a-záéíóúñ]+(ci[oó]n|si[oó]n|dad|miento|aje|cia|ura|ismo|ía)s?)\b/gi, (m,_a,word)=>` y ${articleFor(word)} ${word}`);
}
function tematicasFromLines(modLines, evaLines){
  const mods=modLines.map(x=>withArticles(lowerFirst(String(x).trim()))).filter(Boolean);
  const evas=evaLines.map(x=>String(x).trim()).filter(Boolean).map(x=>/^(el|la|los|las|un|una)\s/i.test(x)?lowerFirst(x):articleFor(lowerFirst(x))+' '+lowerFirst(x));
  let s='';
  if(mods.length) s+='Las principales temáticas por abordar son '+listY(mods)+'.';
  if(evas.length){ if(s) s+=' '; s+='Las estrategias de evaluación son '+listY(evas)+'.'; }
  return s;
}
function listY(arr){ if(arr.length<=1) return arr.join(''); return arr.slice(0,-1).join(', ')+' y '+arr[arr.length-1]; }

// Join array as "a, b, c, así como d" (Spanish list)
function listToSpanish(arr) {
  if (!arr.length) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} y ${arr[1]}`;
  const last = arr[arr.length - 1];
  const rest = arr.slice(0, -1);
  return `${rest.join(', ')}, así como ${last}`;
}

// ── Split modulos text block into [{name, subtemas}] ──
function splitModulos(text) {
  const mods = [];
  let current = null;
  const lines = text.split('\n');
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    // Module header: starts with "Módulo N" or "Module N"
    const mMatch = l.match(/^(m[oó]dulo|module)\s+(\d+)[.:]?\s*(.*)/i);
    if (mMatch) {
      if (current) mods.push(current);
      // Reconstruct canonical name
      const num = mMatch[2];
      const rest = mMatch[3].trim();
      current = { name: `Módulo ${num}. ${rest}`, subtemas: [] };
      continue;
    }
    if (current) {
      const sub = l.replace(/^[-•·]\s*/, '').trim();
      if (sub) current.subtemas.push(sub);
    }
  }
  if (current) mods.push(current);
  return mods;
}

// ── Parse eva_tabla text → [{name, count, pct}] ───────
// Accepts formats like:
//   "Data-driven marketing campaign (1) — 40%"
//   "Case study (3) | 30%"
//   "Tareas | 30%"   (count=1 implied if missing)
function parseEvaTablaText(text) {
  if (!text) return [];
  const rows = [];
  const lines = text.split('\n').filter(l => l.trim());
  for (const raw of lines) {
    const l = raw.trim();
    const pctMatch = l.match(/(\d+)%/);
    if (!pctMatch) continue;
    const pct = parseInt(pctMatch[1]);
    // Remove percentage and separators
    const namepart = l.replace(/[|—–-]?\s*\d+%\s*/g, '').trim();
    const countMatch = namepart.match(/\((\d+)\)/);
    const count = countMatch ? parseInt(countMatch[1]) : 1;
    const name = namepart.replace(/\s*\(\d+\).*/, '').trim();
    if (name) rows.push({ name, count, pct });
  }
  return rows;
}

// ── Build Eva_Distri text ──────────────────────────────
// "40% total"  /  "30%, 15% cada uno"  /  "30%, 10% cada uno"
function buildDistriText(row) {
  if (row.count <= 1) return `${row.pct}% total`;
  const each = Math.round(row.pct / row.count);
  return `${row.pct}%, ${each}% cada uno`;
}

function copyPrompt(){
  const text=document.getElementById('prompt-box').innerText;
  navigator.clipboard.writeText(text).then(()=>{
    const btn=document.getElementById('copy-btn');
    btn.innerHTML='<span class="ic" aria-hidden="true">✓</span> Copiado';btn.classList.add('copied');
    setTimeout(()=>{btn.innerHTML='<span class="ic" aria-hidden="true">⎘</span> Copiar';btn.classList.remove('copied');},2000);
  });
}
