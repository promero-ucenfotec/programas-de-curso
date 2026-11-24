/* Editor de temáticas */
/* ══════════════════════════════════════════════════════
   TEMÁTICAS EDITOR
══════════════════════════════════════════════════════ */
function openTematicasEditor() {
  const sid = currentProject?.sheetId;
  const code = currentCourse?.['Código']||'';
  const saved = maestroData[sid]?.[code]||{};

  // Populate from saved override or auto-generate
  const override = saved._tematicas_override;
  let modLines, evaLines;

  if (override) {
    modLines = override.mods || '';
    evaLines = override.evas || '';
  } else {
    // Auto-generate from data
    const mods = saved.modulos ? splitModulos(saved.modulos) : [];
    modLines = mods.map(m => lowerFirst(m.name.replace(/^(m[oó]dulo|module)\s+\d+[.:]?\s*/i,'').trim())).join('\n');
    const evaRows = parseEvaTablaText(saved.eva_tabla||'');
    evaLines = evaRows.map(r => lowerFirst(r.name)).join('\n');
  }

  document.getElementById('te-modulos').value = modLines;
  document.getElementById('te-evas').value = evaLines;
  updateTematicasPreview();

  document.getElementById('te-modulos').addEventListener('input', updateTematicasPreview);
  document.getElementById('te-evas').addEventListener('input', updateTematicasPreview);

  document.getElementById('modal-tematicas').classList.add('active');
}

function updateTematicasPreview() {
  const modLines = document.getElementById('te-modulos').value.trim().split('\n').filter(Boolean);
  const evaLines = document.getElementById('te-evas').value.trim().split('\n').filter(Boolean);
  const preview = tematicasFromLines(modLines, evaLines);
  document.getElementById('te-preview').textContent = preview || '(vacío)';
}

function resetTematicas() {
  const sid = currentProject?.sheetId;
  const code = currentCourse?.['Código']||'';
  const saved = maestroData[sid]?.[code]||{};
  const mods = saved.modulos ? splitModulos(saved.modulos) : [];
  document.getElementById('te-modulos').value = mods.map(m =>
    lowerFirst(m.name.replace(/^(m[oó]dulo|module)\s+\d+[.:]?\s*/i,'').trim())
  ).join('\n');
  const evaRows = parseEvaTablaText(saved.eva_tabla||'');
  document.getElementById('te-evas').value = evaRows.map(r => lowerFirst(r.name)).join('\n');
  updateTematicasPreview();
}

function saveTematicas() {
  const sid = currentProject?.sheetId;
  const code = currentCourse?.['Código']||'';
  if (!maestroData[sid]) maestroData[sid] = {};
  if (!maestroData[sid][code]) maestroData[sid][code] = {};
  maestroData[sid][code]._tematicas_override = {
    mods: document.getElementById('te-modulos').value.trim(),
    evas: document.getElementById('te-evas').value.trim()
  };
  localStorage.setItem('dcd_maestro', JSON.stringify(maestroData));
  autoBackup();
  closeTematicasEditor();
  updateProgress(); // refresh preview in hero
  toast('✓ Oración de temáticas guardada', 'success');
}

function closeTematicasEditor() {
  document.getElementById('modal-tematicas').classList.remove('active');
  // Remove listeners to avoid duplicates
  const m = document.getElementById('te-modulos');
  const e = document.getElementById('te-evas');
  m.replaceWith(m.cloneNode(true));
  e.replaceWith(e.cloneNode(true));
}

function closeFicha() {
  document.getElementById('ficha-result').classList.remove('visible');
  fichaExtracted = {};
}
