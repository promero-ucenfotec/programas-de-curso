/* Secciones del programa y prompts */
/* ══════════════════════════════════════════════════════
   SECTIONS CONFIG
══════════════════════════════════════════════════════ */
const CATS = [
  { label:'1. Descripción del curso', secs:[
    {id:'descripcion_objeto',   label:'Objeto de estudio',          icon:'📖', col:'Descripción',                   pkey:'objeto_estudio',         related:[]},
    {id:'descripcion_import',   label:'Importancia',                icon:'⭐', col:null,                            pkey:'importancia',            related:['descripcion_objeto']},
    {id:'descripcion_en_curso', label:'En el curso…',               icon:'🎯', col:null,                            pkey:'en_curso',               related:['descripcion_objeto','competencia']},
    {id:'descripcion_rasgos',   label:'Rasgos de perfil',           icon:'👤', col:null,                            pkey:'rasgos',                 related:['descripcion_objeto']},
  ]},
  { label:'2. Competencia', secs:[
    {id:'competencia',          label:'Competencia del curso',      icon:'🏆', col:'Competencia',                   pkey:'competencia',            related:[]},
  ]},
  { label:'3. Resultados de aprendizaje', secs:[
    {id:'ra1',label:'RA 1',icon:'1️⃣',col:'RA1',pkey:'ra',related:[]},
    {id:'cd1',label:'CD 1',icon:'📋',col:'CD1',pkey:'cd',related:['ra1']},
    {id:'e1', label:'Evidencia 1',icon:'📎',col:'E1',pkey:'ev',related:['ra1']},
    {id:'ra2',label:'RA 2',icon:'2️⃣',col:'RA2',pkey:'ra',related:[]},
    {id:'cd2',label:'CD 2',icon:'📋',col:'CD2',pkey:'cd',related:['ra2']},
    {id:'e2', label:'Evidencia 2',icon:'📎',col:'E2',pkey:'ev',related:['ra2']},
    {id:'ra3',label:'RA 3',icon:'3️⃣',col:'RA3',pkey:'ra',related:[]},
    {id:'cd3',label:'CD 3',icon:'📋',col:'CD3',pkey:'cd',related:['ra3']},
    {id:'e3', label:'Evidencia 3',icon:'📎',col:'E3',pkey:'ev',related:['ra3']},
  ]},
  { label:'4. Contenido temático', secs:[
    {id:'modulos',label:'Módulos y Subtemas',icon:'📚',col:'Modulo1',pkey:'modulos',related:[]},
  ]},
  { label:'5. Metodologías y estrategias', secs:[
    {id:'metodologias',label:'Metodologías',icon:'🧠',col:'Metodologías',pkey:'metodologias',related:['ra1','ra2','ra3','e1','e2','e3']},
    {id:'estrategias', label:'Estrategias de Aprendizaje',icon:'🎲',col:'Estrategias de Aprendizaje',pkey:'estrategias',related:['e1','e2','e3']},
  ]},
  { label:'6. Evaluación', secs:[
    {id:'eva_tabla',   label:'Tabla de Evaluaciones',       icon:'📊',col:'Tipo_Evaluacion_EN',pkey:'eva_tabla',  related:['e1','e2','e3']},
    {id:'eva_tipo',    label:'Tipos de Evaluación',         icon:'🔍',col:null,                 pkey:'eva_tipo',   related:['e1','e2','e3']},
    {id:'eva_desc1',   label:'Descripción Evaluación 1',    icon:'📝',col:'Eva_Descrip_1',      pkey:'eva_desc',   related:['ra1','e1']},
    {id:'eva_desc2',   label:'Descripción Evaluación 2',    icon:'📝',col:'Eva_Descrip_2',      pkey:'eva_desc',   related:['ra2','e2']},
    {id:'eva_desc3',   label:'Descripción Evaluación 3',    icon:'📝',col:'Eva_Descrip_3',      pkey:'eva_desc',   related:['ra3','e3']},
    {id:'_rubricas',   label:'Rúbricas',                    icon:'📐',col:null,isRubric:true,   pkey:'rubricas',   related:['cd1','cd2','cd3']},
  ]},
  { label:'7. Recursos y bibliografía', secs:[
    {id:'recursos',    label:'Recursos Didácticos',         icon:'🛠️',col:'Recursos',                    pkey:'recursos',   related:[]},
    {id:'biblio_ob',   label:'Bibliografía Obligatoria',    icon:'📕',col:'Bibliografia_Obligatoria',    pkey:'biblio',     related:[]},
    {id:'biblio_co',   label:'Bibliografía Complementaria', icon:'📗',col:'Bibliografia_Complementaria', pkey:'biblio',     related:[]},
  ]},
  { label:'8. Cronograma', secs:[
    {id:'cronograma',  label:'Cronograma 14 sesiones',      icon:'📅',col:'Sesion_1',isSchedule:true,pkey:'cronograma',related:['e1','e2','e3','modulos']},
  ]},
];
const ALL_SECS = CATS.flatMap(c=>c.secs);

// Map section id → Maestro column header (for write)
const SEC_COL_MAP = {};
ALL_SECS.forEach(s=>{ if(s.col) SEC_COL_MAP[s.id]=s.col; });
// Special: cronograma maps to multiple columns
const CRONOGRAMA_COLS = ['Sesion_1','Cronograma_Modulo_1','Cronograma_Subtema_1',
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
  'Sesion_14','Cronograma_Modulo_14','Cronograma_Subtema_14','Actividades_EN_14'];

/* ══════════════════════════════════════════════════════
   PROMPTS
══════════════════════════════════════════════════════ */
// Prompts por sección: las reglas viven en las skills pc-*; aquí solo se indica
// qué skill usar y se adjuntan los datos del curso.
const SECTION_SKILL = {
  objeto_estudio:['pc-descripcion','el OBJETO DE ESTUDIO'],
  importancia:['pc-descripcion','la IMPORTANCIA'],
  en_curso:['pc-descripcion','el párrafo "En el curso…"'],
  rasgos:['pc-rasgos-perfil','los 3 RASGOS DEL PERFIL PROFESIONAL del grupo de cursos afines'],
  competencia:['pc-competencia','la COMPETENCIA'],
  ra:['pc-cuadro-competencia','el RESULTADO DE APRENDIZAJE {n}'],
  cd:['pc-cuadro-competencia','los CRITERIOS DE DESEMPEÑO del RA {n}'],
  ev:['pc-cuadro-competencia','la actividad y las EVIDENCIAS {n}'],
  modulos:['pc-ficha','los MÓDULOS Y SUBTEMAS (temario ajustado)'],
  metodologias:['pc-metodologias','las 6 METODOLOGÍAS'],
  estrategias:['pc-estrategias-evaluacion','las ESTRATEGIAS DE APRENDIZAJE'],
  eva_tabla:['pc-estrategias-evaluacion','la TABLA DE PORCENTAJES de evaluación'],
  eva_tipo:['pc-estrategias-evaluacion','los TIPOS DE EVALUACIÓN'],
  eva_desc:['pc-estrategias-evaluacion','la DESCRIPCIÓN de la evaluación {n}'],
  rubricas:['pc-estrategias-evaluacion','las RÚBRICAS'],
  recursos:['pc-recursos-didacticos','los RECURSOS DIDÁCTICOS'],
};
function buildPrompt(pkey, course, saved, secId) {
  const c = course||{}, s = saved||{};
  const name = c['Curso']||c['Nombre']||'';
  // Prompt personalizado (solo para los generales que siguen en el editor)
  if (customPrompts[pkey] && PROMPT_META.some(p=>p.key===pkey)) {
    return customPrompts[pkey].replace(/\[NOMBRE DEL CURSO\]/g, name).replace(/\[CARRERA\]/g, projectCareers().join(' / '));
  }
  if (pkey==='cronograma') return 'Panel de cronograma integrado debajo.';
  if (pkey==='biblio') return `Propón REFERENCIAS BIBLIOGRÁFICAS en APA 7 para el curso "${name}":

OBLIGATORIA (3 referencias):
- Libros especializados del área
- Preferiblemente 2019–2025
- Con URL digital (OverDrive, eLibro, Springer, Taylor & Francis, etc.)

COMPLEMENTARIA (2 referencias):
- Obras complementarias; si son anteriores a 2015 añadir "(Classic Book)"

FORMATO: Apellido, N. (Año). Título en cursiva. Editorial. https://url

Área disciplinar: ${name}`;
  const sk = SECTION_SKILL[pkey];
  if (!sk) return '(Sin prompt definido para esta sección.)';
  const n = String(secId||'').replace(/\D/g,'') || '1';
  const what = sk[1].replace('{n}', n);
  const parts = [`Usá la skill ${sk[0]} para redactar ${what} del curso "${name}". Seguí todas las reglas de la skill y entregá solo el texto final, listo para pegar.`];
  const data = (typeof courseDataLines==='function') ? courseDataLines(c) : '';
  if (data) parts.push('DATOS DEL CURSO:\n'+data);
  const ctx = [];
  if (s.descripcion_objeto) ctx.push('OBJETO DE ESTUDIO: '+s.descripcion_objeto);
  if (s.competencia && pkey!=='competencia') ctx.push('COMPETENCIA: '+s.competencia);
  if (pkey==='rasgos') { const m=maestroRasgos(s); if (m) ctx.push('RASGOS ACTUALES EN EL MAESTRO (revisalos y mejoralos solo si incumplen alguna regla de la skill):\n1. '+(m[0]||'—')+'\n2. '+(m[1]||'—')+'\n3. '+(m[2]||'—')); }
  if (['cd','ev','eva_desc'].includes(pkey) && s['ra'+n]) ctx.push(`RA ${n}: `+s['ra'+n]);
  if (!['objeto_estudio','importancia','rasgos','competencia','ra','cd','ev'].includes(pkey)) { const cu=cuadroText(s); if (cu) ctx.push('CUADRO DE COMPETENCIA:\n'+cu); }
  if (['modulos','en_curso','metodologias','recursos'].includes(pkey)) { const t=currentTemarioText(c,s); if (t) ctx.push('TEMARIO ACTUAL:\n'+t); }
  const cur = String(s[secId]||'').trim();
  if (cur && pkey!=='rasgos') ctx.push('TEXTO ACTUAL DE LA SECCIÓN (mejoralo solo si incumple alguna regla):\n'+cur);
  if (ctx.length) parts.push(ctx.join('\n\n'));
  if (['competencia','ra','cd','rasgos'].includes(pkey)) { const cc=carreraCompBlock(s); if (cc) parts.push(cc); }
  return parts.join('\n\n');
}
