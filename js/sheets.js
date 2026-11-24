/* Lectura y escritura en Google Sheets (Base y Maestro) */
/* ══════════════════════════════════════════════════════
   GOOGLE SHEETS API — AUTHENTICATED READ & WRITE
   Works with any Sheet where the user is owner/editor.
   No public sharing required.
══════════════════════════════════════════════════════ */

// Full Maestro header row (exact column order)
const MAESTRO_HEADERS = [
  'Código','Nombre','Créditos','Lectivas','Teoria','Lab','Practica','Independiente','Total','Ubicación','Requisitos',
  'Descripción','Competencia','RA1','CD1','E1','RA2','CD2','E2','RA3','CD3','E3',
  'Modulo1','Subtemas 1','Modulo2','Subtemas 2','Modulo3','Subtemas 3','Modulo4','Subtemas 4',
  'Modulo5','Subtemas 5','Modulo6','Subtemas 6','Modulo7','Subtemas 7',
  'Metodologías','Estrategias de Aprendizaje','Tipo_Evaluacion_EN',
  'Eva_Tabla1','Cantidad_Eva_1','Porcen_Tabla1','Eva_Tabla2','Cantidad_Eva_2','Porcen_Tabla2',
  'Eva_Tabla3','Cantidad_Eva_3','Porcen_Tabla3',
  'Eva_Distri_1','Eva_Descrip_1','Eva_Rubric_1','Eva_Distri_2','Eva_Descrip_2','Eva_Rubric_2',
  'Eva_Distri_3','Eva_Descrip_3','Eva_Rubric_3',
  'Recursos','Bibliografia_Obligatoria','Bibliografia_Complementaria',
  'Sesion_1','Cronograma_Modulo_1','Cronograma_Subtema_1',
  'Sesion_2','Cronograma_Modulo_2','Cronograma_Subtema_2','Actividades_EN_2',
  'Sesion_3','Cronograma_Modulo_3','Cronograma_Subtema_3','Actividades_EN_3',
  'Sesion_4','Cronograma_Modulo_4','Cronograma_Subtema_4','Actividades_EN_4',
  'Sesion_5','Cronograma_Modulo_5','Cronograma_Subtema_5','Actividades_EN_5',
  'Sesion_6','Cronograma_Modulo_6','Cronograma_Subtema_6','Actividades_EN_6',
  'Sesion_7','Cronograma_Modulo_7','Cronograma_Subtema_7','Actividades_EN_7',
  'Sesion_8','Cronograma_Modulo_8','Cronograma_Subtema_8','Actividades_EN_8',
  'Sesion_9','Cronograma_Modulo_9','Cronograma_Subtema_9','Actividades_EN_9',
  'Sesion_10','Cronograma_Modulo_10','Cronograma_Subtema_10','Actividades_EN_10',
  'Sesion_11','Cronograma_Modulo_11','Cronograma_Subtema_11','Actividades_EN_11',
  'Sesion_12','Cronograma_Modulo_12','Cronograma_Subtema_12','Actividades_EN_12',
  'Sesion_13','Cronograma_Modulo_13','Cronograma_Subtema_13','Actividades_EN_13',
  'Sesion_14','Cronograma_Modulo_14','Cronograma_Subtema_14','Actividades_EN_14',
];

// Section id → Maestro column name
const SEC_TO_COL = {
  descripcion_objeto:'Descripción', descripcion_import:'Descripción',
  descripcion_en_curso:'Descripción', descripcion_rasgos:'Descripción',
  competencia:'Competencia',
  ra1:'RA1', cd1:'CD1', e1:'E1',
  ra2:'RA2', cd2:'CD2', e2:'E2',
  ra3:'RA3', cd3:'CD3', e3:'E3',
  modulos:'Modulo1', metodologias:'Metodologías',
  estrategias:'Estrategias de Aprendizaje',
  eva_tabla:'Tipo_Evaluacion_EN', eva_tipo:'Tipo_Evaluacion_EN',
  eva_desc1:'Eva_Descrip_1', eva_desc2:'Eva_Descrip_2', eva_desc3:'Eva_Descrip_3',
  recursos:'Recursos',
  biblio_ob:'Bibliografia_Obligatoria', biblio_co:'Bibliografia_Complementaria',
};

// ── Utilities ────────────────────────────────────────
function extractSheetId(url) {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

function colIdxToLetter(idx) {
  let letter = '';
  idx++;
  while (idx > 0) {
    const rem = (idx - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    idx = Math.floor((idx - 1) / 26);
  }
  return letter;
}

// Central authenticated request helper
async function sheetsReq(path, method = 'GET', body = null) {
  if (!gAccessToken) throw new Error('Inicia sesión con Google primero.');
  const opts = {
    method,
    headers: { Authorization: 'Bearer ' + gAccessToken, 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch('https://sheets.googleapis.com/v4/spreadsheets' + path, opts);
  if (r.status === 401) {
    gAccessToken = null;
    localStorage.removeItem('dcd_gtoken');
    renderNavAuth(); updateSheetsStatusAll();
    throw new Error('Tu sesión de Google venció. Tocá "Reconectar" (arriba) y volvé a intentarlo.');
  }
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error?.message || `Error Sheets API (${r.status})`);
  }
  return r.json();
}

// ── READ Base — authenticated (works on private sheets) ─
// La hoja Base trae el período en "Cuatrimestre" (a veces como 1.0); se pasa a "Periodo"
function normalizeBaseRows(rows){
  (rows||[]).forEach(r=>{
    Object.keys(r).forEach(k=>{ const v=String(r[k]??'').trim(); if(/^-?\d+[.,]0+$/.test(v)) r[k]=v.replace(/[.,]0+$/,''); });
    if (!String(r['Horas Docencia']||'').trim() && String(r['Horas Clase']||'').trim()) r['Horas Docencia']=r['Horas Clase'];
    const v=String(r['Periodo']||r['Cuatrimestre']||r['Ubicación']||'').trim().replace(/^(\d+)[.,]0+$/,'$1');
    r['Periodo']=v;
  });
  return rows;
}
async function fetchBase(url) {
  const id = extractSheetId(url);
  if (!id) throw new Error('URL inválida de Google Sheets.');
  if (gAccessToken) {
    const data = await sheetsReq(`/${id}/values/Base`);
    return normalizeBaseRows(sheetsValuesToObjects(data.values || []));
  }
  // Not signed in → try public CSV fallback
  const r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=Base`);
  if (!r.ok) throw new Error(`No se pudo acceder. Inicia sesión con Google para usar Sheets privados.`);
  return normalizeBaseRows(parseCSV(await r.text()));
}

function sheetsValuesToObjects(values) {
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (row[i] || '').trim(); });
    return obj;
  }).filter(r => r['Curso'] || r['Nombre']);
}

// ── GET sheet names ──────────────────────────────────
async function getSheetNames(sheetId) {
  const data = await sheetsReq(`/${sheetId}?fields=sheets.properties.title`);
  return (data.sheets || []).map(s => s.properties.title);
}

// ── ENSURE Maestro sheet exists (create if not) ───────
async function ensureMaestroSheet(sheetId) {
  const names = await getSheetNames(sheetId);
  if (names.includes('Maestro')) return;
  // Create sheet tab
  await sheetsReq(`/${sheetId}:batchUpdate`, 'POST', {
    requests: [{ addSheet: { properties: { title: 'Maestro' } } }]
  });
  // Write header row
  await sheetsReq(`/${sheetId}/values/Maestro!A1?valueInputOption=RAW`, 'PUT', {
    values: [MAESTRO_HEADERS]
  });
  toast('✓ Hoja "Maestro" creada con todos los encabezados', 'success');
}

// ── READ Maestro → { headers, rows, codeIdx } ─────────
async function readMaestro(sheetId) {
  await ensureMaestroSheet(sheetId);
  const data = await sheetsReq(`/${sheetId}/values/Maestro`);
  const values = data.values || [];
  if (!values.length) {
    // Empty after creation edge case — write headers
    await sheetsReq(`/${sheetId}/values/Maestro!A1?valueInputOption=RAW`, 'PUT', {
      values: [MAESTRO_HEADERS]
    });
    return { headers: MAESTRO_HEADERS, rows: [], codeIdx: 0 };
  }
  const headers = values[0];
  const rows = values.slice(1);
  const codeIdx = Math.max(headers.indexOf('Código'), 0);
  return { headers, rows, codeIdx };
}

// ── ADD course row to Maestro if missing ──────────────
async function ensureCourseRow(sheetId, course, maestro) {
  const { headers, rows, codeIdx } = maestro;
  const code = (course['Código'] || '').trim();
  if (!code) return;
  if (rows.some(r => (r[codeIdx] || '').trim() === code)) return; // already there

  // Build row from Base sheet data
  const newRow = new Array(headers.length).fill('');
  const baseMap = {
    'Código':       course['Código'] || '',
    'Nombre':       course['Curso'] || course['Nombre'] || '',
    'Créditos':     course['Créditos'] || '',
    'Lectivas':     course['Horas Docencia'] || course['Horas Clase'] || course['Lectivas'] || '',
    'Teoria':       course['Horas teoría'] || course['Teoria'] || '',
    'Lab':          course['Horas laboratorio'] || course['Lab'] || '',
    'Practica':     course['Horas práctica'] || course['Practica'] || '',
    'Independiente':course['Horas Independiente'] || course['Independiente'] || '',
    'Total':        course['Total de horas'] || course['Total'] || '',
    'Ubicación':    course['Periodo'] || course['Cuatrimestre'] || course['Ubicación'] || '',
    'Requisitos':   course['Requisitos'] ? expandRequisitos(course['Requisitos']).replace(/\n/g,'; ') : '',
  };
  Object.entries(baseMap).forEach(([col, val]) => {
    const idx = headers.indexOf(col);
    if (idx !== -1) newRow[idx] = val;
  });

  await sheetsReq(`/${sheetId}/values/Maestro:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, 'POST', {
    values: [newRow]
  });
  toast(`✓ Fila para "${code}" añadida en Maestro`, 'success');
}

// ── IMPORT existing Maestro data → local store ─────────
