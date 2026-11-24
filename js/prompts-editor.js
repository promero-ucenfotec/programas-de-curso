/* Editor de prompts */
/* ══════════════════════════════════════════════════════
   PROMPT EDITOR
══════════════════════════════════════════════════════ */
// Prompt metadata — label + key mapping
// Solo prompts generales: las secciones con skill (pc-*) se piden con un puntero a la skill
const PROMPT_META = [
  {key:'biblio',           label:'Bibliografía',               icon:'📕'},
];

let peCurrentKey = null;

function openPromptEditor() {
  const list = document.getElementById('pe-list');
  list.innerHTML = '';
  PROMPT_META.forEach(pm => {
    const div = document.createElement('div');
    const isCustom = !!customPrompts[pm.key];
    div.className = 'pe-item' + (isCustom ? ' custom' : '');
    div.innerHTML = `<span class="pe-item-icon"><span class="ic" aria-hidden="true">•</span></span><span class="pe-item-name">${pm.label}</span><span class="pe-item-mod">editado</span>`;
    div.onclick = () => selectPromptKey(pm, div);
    list.appendChild(div);
  });
  if(window.__renderIcons) window.__renderIcons();
  document.getElementById('modal-prompts').classList.add('active');
}

function closePromptEditor() {
  document.getElementById('modal-prompts').classList.remove('active');
  peCurrentKey = null;
}

function selectPromptKey(pm, el) {
  document.querySelectorAll('.pe-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  peCurrentKey = pm.key;
  document.getElementById('pe-label').textContent = pm.label;

  // Get current effective prompt — custom or generate default with placeholder course
  const fakeCourse = { Curso: '[NOMBRE DEL CURSO]', Nombre: '[NOMBRE DEL CURSO]', Créditos:'3', Lectivas:'3', Teoria:'1', Lab:'1', Practica:'1' };
  const fakeSaved = {
    descripcion_objeto:'[Objeto de estudio]',
    competencia:'[Competencia]',
    ra1:'[RA1]', ra2:'[RA2]', ra3:'[RA3]',
    e1:'[Evidencia 1]', e2:'[Evidencia 2]', e3:'[Evidencia 3]',
    modulos:'[Módulos]'
  };

  let defaultText = '';
  try { defaultText = buildPrompt(pm.key, fakeCourse, fakeSaved, pm.key+'1'); } catch(e) {}

  const ta = document.getElementById('pe-textarea');
  ta.value = customPrompts[pm.key] || defaultText;
}

function saveCurrentPrompt() {
  if (!peCurrentKey) { toast('Selecciona una sección primero','error'); return; }
  const val = document.getElementById('pe-textarea').value.trim();
  if (val) {
    customPrompts[peCurrentKey] = val;
  } else {
    delete customPrompts[peCurrentKey]; // blank = restore default
  }
  localStorage.setItem('dcd_prompts', JSON.stringify(customPrompts));
  autoBackup();
  // Refresh list UI
  document.querySelectorAll('.pe-item').forEach((el, i) => {
    const pm = PROMPT_META[i];
    if (pm) {
      const isCustom = !!customPrompts[pm.key];
      el.classList.toggle('custom', isCustom);
    }
  });
  toast('✓ Prompt guardado para todas las secciones de este tipo','success');
}

function resetCurrentPrompt() {
  if (!peCurrentKey) return;
  delete customPrompts[peCurrentKey];
  localStorage.setItem('dcd_prompts', JSON.stringify(customPrompts));
  autoBackup();
  // Re-select to refresh textarea
  const activeEl = document.querySelector('.pe-item.active');
  const pm = PROMPT_META.find(p => p.key === peCurrentKey);
  if (pm && activeEl) { activeEl.classList.remove('custom'); selectPromptKey(pm, activeEl); }
  toast('✓ Prompt restaurado al original','success');
}
