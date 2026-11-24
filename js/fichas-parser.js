/* Lector de fichas en .docx */
/* ══════════════════════════════════════════════════════
   FICHA DOCX PARSER
   Extrae: competencia específica, módulos+subtemas,
   sistema de evaluación (tabla de estrategias)
══════════════════════════════════════════════════════ */

let fichaExtracted = {}; // { competencia, modulos, eva_tabla, e1, e2, e3 }

async function uploadFichaLegacy(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = ''; // reset so same file can be re-uploaded

  document.getElementById('ficha-loading').classList.add('active');
  document.getElementById('ficha-hint').style.display = 'none';
  document.getElementById('ficha-result').classList.remove('visible');

  try {
    const text = await extractDocxText(file);
    fichaExtracted = parseFicha(text);
    renderFichaResult(fichaExtracted);
  } catch(e) {
    toast('Error leyendo el .docx: ' + e.message, 'error');
  }

  document.getElementById('ficha-loading').classList.remove('active');
  document.getElementById('ficha-hint').style.display = '';
}

// ── Extract raw text from docx (uses JSZip via CDN) ──
async function extractDocxText(file) {
  // Load JSZip dynamically if not present
  if (!window.JSZip) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  }
  const ab = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(ab);
  const xmlStr = await zip.file('word/document.xml').async('string');
  return xmlToText(xmlStr);
}

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

function xmlToText(xml) {
  // Extract text runs preserving paragraph breaks
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const paras = doc.querySelectorAll('p');
  const lines = [];
  paras.forEach(p => {
    const runs = p.querySelectorAll('t');
    let line = '';
    runs.forEach(r => { line += r.textContent; });
    lines.push(line);
  });
  return lines.join('\n');
}

// ── Parse extracted text into sections ───────────────
function parseFicha(text) {
  const result = {};
  const lines = text.split('\n');

  // ── 1. COMPETENCIA ESPECÍFICA ─────────────────────
  // Appears after "Competencia específica" label
  const compIdx = lines.findIndex(l =>
    /competencia\s+espec[íi]fica/i.test(l)
  );
  if (compIdx !== -1) {
    // Take the next non-empty line(s) until hitting another header
    let comp = '';
    for (let i = compIdx + 1; i < Math.min(compIdx + 8, lines.length); i++) {
      const l = lines[i].trim();
      if (!l) continue;
      // Stop if we hit another section header
      if (/^(disposici[oó]n|resultado|criterio|módulo|contenido|metodolog|estrategia|sistema|recursos|bibliograf|cronograma)/i.test(l)) break;
      comp += (comp ? ' ' : '') + l;
      // If it ends with a period and is long enough, it's complete
      if (comp.length > 80 && /\.\s*$/.test(comp)) break;
    }
    if (comp) result.competencia = comp.trim();
  }

  // ── 2. MÓDULOS Y SUBTEMAS ─────────────────────────
  const mods = [];
  let currentMod = null;
  let inContentSection = false;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();

    // Detect content section start
    if (/contenidos?\s+tem[áa]ticos?/i.test(l)) { inContentSection = true; continue; }
    if (!inContentSection) continue;
    // Stop at next major section
    if (/^(metodolog|estrategia|sistema\s+de\s+eval|recursos|bibliograf|cronograma)/i.test(l) && l.length < 60) break;

    // Module header: "Módulo N." or "MÓDULO N."
    const modMatch = l.match(/^m[oó]dulo\s+(\d+)[.\:]\s*(.+)/i);
    if (modMatch) {
      if (currentMod) mods.push(currentMod);
      currentMod = { name: `Módulo ${modMatch[1]}. ${modMatch[2].trim()}`, subtemas: [] };
      continue;
    }

    // Subtema: starts with - or • or is a non-empty line inside a module
    if (currentMod) {
      const sub = l.replace(/^[-•·]\s*/, '').trim();
      if (sub && sub.length > 3 && !/^m[oó]dulo/i.test(sub)) {
        currentMod.subtemas.push(sub);
      }
    }
  }
  if (currentMod) mods.push(currentMod);

  if (mods.length) {
    // Format for modulos section (one big text block)
    result.modulos = mods.map(m =>
      `${m.name}\n${m.subtemas.map(s => `- ${s}`).join('\n')}`
    ).join('\n');

    // Also store individual module names for section pills
    mods.forEach((m, i) => {
      result[`mod${i+1}_name`] = m.name;
      result[`mod${i+1}_subs`] = m.subtemas.join('\n');
    });
    result._mods = mods;
  }

  // ── 3. SISTEMA DE EVALUACIÓN (tabla) ─────────────
  // In docx XML each table cell is a separate paragraph, so name and % are on
  // consecutive lines. We look for the header row then pair name+pct rows.
  const evaRows = [];
  let inEvaTable = false;
  let pendingName = null;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();

    // Detect table header: line contains "Estrategias de evaluación" followed soon by "Porcentaje"
    if (/estrategias?\s+de\s+evaluaci[oó]n/i.test(l)) {
      // Check next few lines for "Porcentaje"
      const lookahead = lines.slice(i+1, i+5).join(' ');
      if (/porcentaje/i.test(lookahead)) { inEvaTable = true; i += 1; continue; }
    }
    if (!inEvaTable) continue;
    if (/^total/i.test(l) && l.length < 20) { inEvaTable = false; break; }
    if (/^porcentaje/i.test(l)) continue; // skip header cell

    const pctMatch = l.match(/^(\d+)%$/);
    if (pctMatch) {
      // This line IS the percentage — pair with pending name
      if (pendingName) {
        const parsed = parseEvaRow(pendingName, pctMatch[1] + '%');
        if (parsed) evaRows.push(parsed);
        pendingName = null;
      }
    } else if (l && !/^\s*$/.test(l)) {
      // Non-empty, non-percentage line → it's a name (possibly with count+desc)
      // But also handle inline "Name | XX%" format
      const inlinePct = l.match(/(\d+)%/);
      if (inlinePct) {
        const namepart = l.replace(/\|?\s*\d+%\s*\|?/,'').trim();
        const parsed = parseEvaRow(namepart, inlinePct[1]+'%');
        if (parsed) evaRows.push(parsed);
        pendingName = null;
      } else {
        pendingName = l;
      }
    }
  }

  if (evaRows.length) {
    // Build tabla text
    result.eva_tabla = evaRows.map(r =>
      `${r.name}${r.count ? ' ('+r.count+')' : ''} | ${r.pct}`
    ).join('\n');

    // Map to e1/e2/e3 evidence fields
    evaRows.forEach((r, i) => {
      if (i < 3) {
        result[`e${i+1}`] = r.evText;
        result[`_eva${i+1}`] = r;
      }
    });
    result._evaRows = evaRows;
  }

  return result;
}

function parseEvaRow(namepart, pct) {
  if (!namepart) return null;
  // Pattern: "Name (count) (description...)"
  // Or just: "Name"
  const countMatch = namepart.match(/^(.+?)\s*\((\d+)\)/);
  let name, count = null, desc = '';

  if (countMatch) {
    name = countMatch[1].trim();
    count = countMatch[2];
    // Description is everything after (count) in parens
    const rest = namepart.slice(countMatch[0].length).trim();
    const descMatch = rest.match(/^\s*\(([^)]+)\)/);
    if (descMatch) desc = descMatch[1].trim();
  } else {
    name = namepart.replace(/\|/g,'').trim();
  }

  if (!name) return null;

  // Evidence text for the E column: "Name\nEntregable escrito"
  const evText = count
    ? `${name}\nDocumento técnico escrito.`
    : `${name}\nDocumento técnico escrito.`;

  return { name, count, desc, pct, evText, full: namepart };
}

// ── Render ficha result panel ─────────────────────────
function renderFichaResult(data) {
  const panel = document.getElementById('ficha-result');
  document.getElementById('ficha-result-title-txt').textContent = 'Datos extraídos de la ficha — revisá y aplicá cada sección';
  const fields = document.getElementById('ficha-fields');
  fields.innerHTML = '';

  const items = [];

  if (data.competencia) {
    items.push({
      label: 'Competencia específica',
      secId: 'competencia',
      value: data.competencia,
      icon: '🏆'
    });
  }

  if (data.modulos) {
    items.push({
      label: 'Módulos y subtemas',
      secId: 'modulos',
      value: data.modulos,
      icon: '📚'
    });
  }

  if (data._evaRows?.length) {
    // Build eva_tabla text in the format parseEvaTablaText expects
    const tableText = data._evaRows.map(r =>
      `${r.name}${r.count && r.count>1 ? ' ('+r.count+')' : ''} | ${r.pct}`
    ).join('\n');

    // Preview shows human-readable distribution
    const tablePreview = data._evaRows.map(r => {
      const each = r.count > 1 ? ` · ${Math.round(parseInt(r.pct)/r.count)}% c/u` : '';
      return `${r.name}${r.count>1?' ('+r.count+')':''} — ${r.pct}${each}${r.desc?' · '+r.desc:''}`;
    }).join('\n');

    items.push({
      label: 'Tabla de evaluaciones',
      secId: 'eva_tabla',
      value: tableText,
      preview: tablePreview,
      icon: '📊'
    });

    // Individual evidences E1/E2/E3
    data._evaRows.forEach((r, i) => {
      if (i >= 3) return;
      items.push({
        label: `Evidencia ${i+1}: ${r.name}`,
        secId: `e${i+1}`,
        value: `${r.name}\nDocumento técnico escrito.${r.desc ? '\n\nDescripción breve para el prompt: ' + r.desc : ''}`,
        icon: '📎'
      });
    });
  }

  if (!items.length) {
    fields.innerHTML = '<p style="color:var(--ink3);font-size:14px;">No se encontraron datos reconocibles en la ficha. Verifica que el .docx tenga la estructura estándar de CENFOTEC.</p>';
    panel.classList.add('visible');
    return;
  }

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'ficha-field';
    div.innerHTML = `
      <div class="ficha-field-lbl">
        <span>${item.icon} ${item.label}</span>
        <button class="ficha-apply-btn" onclick="applyFichaField('${item.secId}', this)">✓ Aplicar</button>
      </div>
      <div class="ficha-field-val">${escHtml(item.preview || item.value)}</div>`;
    div.dataset.secId = item.secId;
    div.dataset.value = item.value;
    fields.appendChild(div);
  });

  panel.classList.add('visible');
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function escHtml(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escAttr(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/\n/g,'_NL_').replace(/\r/g,'');
}

function applyFichaField(secId, btn) {
  const field = btn.closest('.ficha-field');
  const value = field.dataset.value;
  if (!value || !currentCourse || !currentProject) return;

  const sid = currentProject.sheetId;
  const code = currentCourse['Código'] || '';
  if (!maestroData[sid]) maestroData[sid] = {};
  if (!maestroData[sid][code]) maestroData[sid][code] = {};
  maestroData[sid][code][secId] = value;
  localStorage.setItem('dcd_maestro', JSON.stringify(maestroData));
  autoBackup();

  btn.textContent = '✓ Aplicado';
  btn.style.background = 'var(--emerald)';
  btn.style.color = '#fff';
  btn.disabled = true;

  renderSecGrid();
  updateProgress();
  if (!btn.dataset.bulk) toast(`✓ "${secId}" guardado`, 'success');

  // If the section is currently open, update the textarea
  if (currentSection?.id === secId) {
    document.getElementById('result-ta').value = value;
  }
}

function applyAllFicha() {
  document.querySelectorAll('.ficha-field').forEach(field => {
    const btn = field.querySelector('.ficha-apply-btn');
    if (!btn) return;
    if (!btn.disabled) { btn.dataset.bulk = '1'; applyFichaField(field.dataset.secId, btn); }
  });
  toast('✓ Todos los campos aplicados', 'success');
}
