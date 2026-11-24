/* Flujo con Claude (ficha y programa completo) */
/* ══════════════════════════════════════════════════════
   FLUJO CON CLAUDE (ficha y programa completo)
   1. Arma un prompt con los datos del curso que invoca la
      skill maestra (pc-ficha o pc-programa-completo).
   2. Importa el bloque JSON de la respuesta y muestra cada
      campo para revisarlo antes de aplicarlo.
══════════════════════════════════════════════════════ */
let claudeMode = null;
const CLAUDE_URL_DEFAULT = 'https://claude.ai/new';

function getClaudeUrl(){
  try { return localStorage.getItem('dcd_claude_url') || CLAUDE_URL_DEFAULT; } catch(e){ return CLAUDE_URL_DEFAULT; }
}
function saveClaudeUrl(v){
  try { localStorage.setItem('dcd_claude_url', (v||'').trim() || CLAUDE_URL_DEFAULT); } catch(e){}
}
function currentSaved(){
  const sid=currentProject?.sheetId; const code=currentCourse?.['Código']||'';
  return maestroData[sid]?.[code]||{};
}
function safeJSON(str, fallback){ try { return JSON.parse(str); } catch(e){ return fallback; } }
function cleanItem(x){ return String(x??'').replace(/^\s*(?:[-•·*▪]|\d+[.)])\s+/,'').trim(); }
function cleanList(arr){ return (Array.isArray(arr)?arr:(arr?String(arr).split('\n'):[])).map(cleanItem).filter(Boolean); }
function stripModPrefix(t){ return String(t||'').replace(/^(m[oó]dulo)\s+\d+[.:]?\s*/i,'').trim(); }

// ── Datos del curso para el prompt ─────────────────────
const SKIP_COURSE_KEYS = /^(Sesion_|Cronograma_|Actividades_EN_|Eva_|Porcen_|Cantidad_|Bibliografia|Metodolog|Estrategias|Recursos|Descripci|Tipo_Evaluacion)/i;
function courseDataLines(course){
  const lines=[];
  const cars=projectCareers();
  if(cars.length) lines.push(`- Carrera: ${cars.join(' / ')}`);
  if(currentProject?.nivel) lines.push(`- Nivel: ${currentProject.nivel}`);
  if(currentProject?.name) lines.push(`- Proyecto: ${currentProject.name}`);
  Object.entries(course||{}).forEach(([k,v])=>{
    const val=String(v??'').trim();
    if(!val || val.length>600) return;
    if(SKIP_COURSE_KEYS.test(k)) return;
    if(/^(Modulo\d|Subtemas\s*\d|RA\d|CD\d|E\d|Competencia)$/i.test(k)) return;
    lines.push(`- ${k}: ${val.replace(/\s*\n\s*/g,' · ')}`);
  });
  return lines.join('\n');
}
function currentTemarioText(course, saved){
  if(saved.modulos?.trim()) return saved.modulos.trim();
  const out=[];
  for(let i=1;i<=7;i++){
    const m=course?.[`Modulo${i}`]; if(!m) continue;
    const subs=String(course[`Subtemas ${i}`]||course[`Subtemas${i}`]||'').split('\n').map(cleanItem).filter(Boolean);
    out.push(`Módulo ${i}. ${stripModPrefix(m)}`+(subs.length?'\n'+subs.map(x=>'- '+x).join('\n'):''));
  }
  return out.join('\n\n');
}
function activityName(saved,n){ return (saved[`e${n}`]||'').split('\n')[0].trim(); }
function cuadroText(saved){
  const blocks=[];
  [1,2,3].forEach(n=>{
    if(!saved[`ra${n}`] && !saved[`cd${n}`] && !saved[`e${n}`]) return;
    const evLines=(saved[`e${n}`]||'').split('\n').slice(1).map(cleanItem).filter(Boolean);
    blocks.push(
`Actividad ${n}: ${activityName(saved,n)||'(sin nombre)'}
RA ${n}: ${saved[`ra${n}`]||'(pendiente)'}
Criterios de desempeño:
${cleanList(saved[`cd${n}`]).map(x=>'- '+x).join('\n')||'(pendientes)'}
Evidencias:
${evLines.map(x=>'- '+x).join('\n')||'(pendientes)'}`);
  });
  return blocks.join('\n\n');
}
function evaTablaText(saved){
  const rows=parseEvaTablaText(saved.eva_tabla||'');
  const notes=safeJSON(saved._notas_eva||'[]',[]);
  return rows.map(r=>{
    const n=notes.find(x=>(x.nombre||'').toLowerCase()===r.name.toLowerCase());
    return `- ${r.name} (${r.count}) — ${r.pct}%`+(n?.nota?` · Nota: ${n.nota}`:'');
  }).join('\n');
}

const FICHA_SCHEMA = (code,name)=>`{
  "tipo": "ficha",
  "codigo": "${code}",
  "curso": "${name}",
  "hilo_conductor": {"nucleo": "", "objeto_estudio": "", "producto_principal": "", "uso_ia": ""},
  "temario": [{"modulo": "Nombre del módulo, sin el prefijo 'Módulo N.'", "subtemas": ["", ""]}],
  "cambios_temario": [{"original": "", "ajustado": "", "regla": ""}],
  "actividades": [
    {"nombre": "", "cantidad": 1, "porcentaje": 40, "nota": "qué hacen los estudiantes, en una línea",
     "ra": "", "criterios": ["", ""], "evidencias": ["", ""]}
  ],
  "competencia": "",
  "verbo_competencia": "verbo elegido y por qué, en una línea"
}`;

const PROGRAMA_SCHEMA = (code)=>`{
  "tipo": "programa",
  "codigo": "${code}",
  "descripcion": {"objeto_estudio": "", "importancia": "", "en_el_curso": "", "rasgos_perfil": "vacío: los rasgos se crean aparte"},
  "metodologias": ["seis textos, en el orden fijo de la skill"],
  "estrategias_aprendizaje": ["un texto por actividad, en el orden del cuadro"],
  "tipos_evaluacion": {"diagnostica": "", "formativa": "", "sumativa": ""},
  "actividades": [
    {"nombre": "nombre exacto de la ficha", "evidencias": ["de 1 a 3"], "descripcion": "un solo párrafo: qué es, cómo se hace, qué se entrega, modalidad y al final la oración: Esta estrategia de evaluación requiere el uso de aplicaciones como [software]. Sin la oración de la rúbrica (la agrega la app)",
     "rubrica": [{"criterio": "criterio copiado de la ficha", "titulo": "frase nominal de 2 a 4 palabras", "niveles": ["criterio + de manera (antónimo bajo)", "criterio + de manera (grado básico)", "criterio + de manera (grado aceptable)", "criterio + de manera (antónimo alto)"]}]}
  ],
  "tabla_evaluacion": [{"nombre": "nombre exacto del cuadro de competencia", "cantidad": 3, "porcentaje": 40}],
  "recursos_didacticos": [""],
  "cronograma": [{"sesion": 1, "modulo": 1, "actividades": []}, {"sesion": 2, "modulo": 1, "actividades": [""]}]
}`;

function buildFichaPrompt(){
  const c=currentCourse||{}; const s=currentSaved();
  const code=c['Código']||''; const name=c['Curso']||c['Nombre']||'';
  const temario=currentTemarioText(c,s);
  const parts=[];
  parts.push(`Usá la skill pc-ficha para crear la ficha del curso ${code} ${name}.`);
  parts.push(`DATOS DEL CURSO\n${courseDataLines(c)}`);
  parts.push(temario
    ? `TEMARIO ACTUAL (revisalo y ajustalo con las reglas de la skill)\n${temario}`
    : `TEMARIO ACTUAL\nNo hay temario cargado. Proponé uno a partir del nombre del curso y de la carrera, con las reglas de la skill.`);
  if(s.competencia?.trim()) parts.push(`COMPETENCIA EXISTENTE (conservá su intención y ajustala)\n${s.competencia.trim()}`);
  const tabla=evaTablaText(s);
  if(tabla) parts.push(`ACTIVIDADES DE EVALUACIÓN PREVISTAS (respetá nombres, cantidades y porcentajes salvo que incumplan una regla)\n${tabla}`);
  const cuadro=cuadroText(s);
  if(cuadro) parts.push(`CUADRO DE COMPETENCIA EXISTENTE (mejoralo con las reglas de la skill)\n${cuadro}`);
  const esb=esbozoPromptBlock(s,'ficha'); if(esb) parts.push(esb);
  const ccF=carreraCompBlock(s); if(ccF) parts.push(ccF);
  { const nc=nameChecks(s); if(nc.length) parts.push('AVISOS SOBRE LO QUE YA EXISTE (corregilos en la ficha)\n'+nc.map(x=>'- '+x).join('\n')); }
  parts.push(`INSTRUCCIONES DE ENTREGA
1. Ejecutá todas las fases de la skill sin detenerte y mostrame la ficha completa, legible, para revisarla.
2. Al final de la respuesta agregá UN SOLO bloque \`\`\`json con exactamente esta estructura. La app Asistente Curricular lo importa, así que no escribas comentarios ni texto fuera de los valores:
${FICHA_SCHEMA(code,name)}
3. Reglas del bloque: tres actividades en el orden del cuadro (la primera es el proyecto con 15 criterios; las otras dos llevan 8 criterios); porcentajes enteros que suman 100; cada elemento de una lista va sin viñetas ni numeración; los textos del bloque son idénticos a los de la ficha mostrada.`);
  return parts.join('\n\n');
}


// Metodologías de los cursos anteriores para variar la redacción entre programas
function prevMetodologias(max=2){ return prevField('metodologias', max); }
function prevField(field, max=2){
  if (!currentProject || !currentCourse) return [];
  const code=currentCourse['Código'];
  const list=orderedCourses().map(x=>x.c);
  const idx=list.findIndex(c=>c['Código']===code);
  const has=c=>c['Código']!==code && String(savedForCourse(c)[field]||'').trim();
  const before=list.slice(0, idx<0?list.length:idx).reverse().filter(has);
  const after=idx<0?[]:list.slice(idx+1).filter(has);
  return before.concat(after).slice(0,max).map(c=>({code:c['Código'], name:(c['Curso']||c['Nombre']||'').trim(), text:String(savedForCourse(c)[field]).trim()}));
}
function metodologiasVariationBlock(){
  const prev=prevMetodologias(2);
  if (!prev.length) return '';
  return `METODOLOGÍAS DE OTROS PROGRAMAS DE ESTA CARRERA (solo para variar la redacción; no se copian)
${prev.map(p=>`— ${p.code} ${p.name}\n${p.text}`).join('\n\n')}

Instrucción de variación: conservá las reglas y el estilo de la skill, pero redactá cada metodología con detalles sutilmente distintos a los de estos cursos, sobre todo en lo que se repite entre programas:
- La acción del docente cambia: si arriba dice "permite que el docente exponga", aquí usá "demuestre", "ilustre", "ejemplifique", "presente" o "explique"; en la guía del docente alterná "retroalimente el desarrollo de", "dé seguimiento a" o "asesore" ("asesore las estrategias de evaluación realizadas en el curso"); nunca "acompañe" ni "oriente".
- El verbo conector de cada metodología no coincide con el que usó la misma metodología arriba (permite, fomenta, posibilita, propicia, favorece, facilita, promueve).
- Alterná el cierre ("para que", "de manera que", "de forma que") y la acción de los estudiantes ("distribuyan con sus pares" → "se organicen en equipos", "elaboren" → "diseñen" o "desarrollen").
- Mantené una sola acción por metodología, el mismo registro formal y la misma longitud.`;
}
function tiposVariationBlock(){
  const prev=prevField('eva_tipo', 2);
  if (!prev.length) return '';
  return `TIPOS DE EVALUACIÓN DE OTROS PROGRAMAS DE ESTA CARRERA (solo para variar la redacción; no se copian)
${prev.map(p=>`— ${p.code} ${p.name}\n${p.text}`).join('\n\n')}

Instrucción de variación: conservá las estructuras fijas de cada tipo (diagnóstica: "Al inicio de cada lección, el docente…"; formativa: "Durante el curso, se promueve…"; sumativa: "En este curso, los estudiantes ponen en práctica lo aprendido en…"), pero redactá con detalles sutilmente distintos a los de estos cursos:
- El verbo de la definición cambia: si arriba dice "consiste en", aquí usá "radica en", "se define como" o "es"; lo mismo en la formativa y la sumativa.
- La definición usa otro sustantivo núcleo: "la exploración inicial" → "el reconocimiento inicial" o "la identificación previa"; "el seguimiento continuo" → "el acompañamiento permanente" o "la valoración constante"; "la medición del logro" → "la valoración final" o "la constatación del logro".
- La acción del docente en la diagnóstica cambia ("plantea" → "propone", "presenta" o "formula") y también el verbo de la utilidad ("facilita" → "permite", "orienta" o "favorece").
- En la formativa, elegí otras dos actividades formativas o el otro conector ("con el propósito de" ↔ "para").
- Mantené el mismo registro formal, los verbos nominalizados y la misma longitud.`;
}
function buildProgramaPrompt(){
  const c=currentCourse||{}; const s=currentSaved();
  const code=c['Código']||''; const name=c['Curso']||c['Nombre']||'';
  const hilo=safeJSON(s._hilo||'null',null);
  const parts=[];
  parts.push(`Usá la skill pc-programa-completo para completar el programa del curso ${code} ${name} a partir de la ficha aprobada que sigue. No modifiques la ficha: el temario, la competencia, los resultados de aprendizaje, los criterios, las evidencias y los nombres de las actividades se usan tal cual. La única excepción son las evidencias: si una actividad no las trae, creá de 1 a 3, breves, que nombren lo que el estudiante entrega al docente.`);
  parts.push(`DATOS DEL CURSO\n${courseDataLines(c)}`);
  if(hilo) parts.push(`HILO CONDUCTOR\n- Núcleo del curso: ${hilo.nucleo||''}\n- Objeto de estudio: ${hilo.objeto_estudio||''}\n- Producto principal: ${hilo.producto_principal||''}\n- Uso de la inteligencia artificial: ${hilo.uso_ia||''}`);
  const esbP=esbozoPromptBlock(s,'programa'); if(esbP) parts.push(esbP);
  const varM=metodologiasVariationBlock(); if(varM) parts.push(varM);
  parts.push(rasgosPromptBlock());
  { const cc=carreraCompBlock(); if(cc) parts.push(cc); }
  { const rb=repeatedBlock(); if(rb) parts.push(rb); }
  { const nc=nameChecks(s); if(nc.length) parts.push('AVISOS DE LA APP (corregilos y mencionalos en "observaciones")\n'+nc.map(x=>'- '+x).join('\n')); }
  const varT=tiposVariationBlock(); if(varT) parts.push(varT);
  parts.push(`FICHA APROBADA\n\nCOMPETENCIA DEL CURSO (versión vigente: es la que se parafrasea en "En el curso…", aunque una ficha anterior diga otra)\n${s.competencia||'(pendiente)'}\n\nCONTENIDOS TEMÁTICOS\n${currentTemarioText(c,s)||'(pendientes)'}\n\nCUADRO DE COMPETENCIA\n${cuadroText(s)||'(pendiente)'}\n\nTABLA DE EVALUACIÓN\n${evaTablaText(s)||'(pendiente: proponé 40 % para el proyecto y 30 % para cada una de las otras dos)'}`);
  parts.push(`INSTRUCCIONES DE ENTREGA
1. Ejecutá todas las fases de la skill sin detenerte y mostrame el programa completo, legible, para revisarlo.
2. Al final de la respuesta agregá UN SOLO bloque \`\`\`json con exactamente esta estructura. La app Asistente Curricular lo importa, así que no escribas comentarios ni texto fuera de los valores:
${PROGRAMA_SCHEMA(code)}
3. Reglas del bloque: "actividades" lleva las tres actividades en el orden del cuadro, cada una con sus evidencias (las de la ficha, o las que creaste si no tenía) y la rúbrica de todos sus criterios (en "titulo" va solo el título corto del criterio); "cronograma" lleva las sesiones 1 a 14 (la 15 es fija), "modulo" es el número del módulo y "actividades" contiene solo las líneas propias de la sesión (inicio o cierre de entregas), sin las dos líneas fijas de lectura y participación; cada elemento de una lista va sin viñetas ni numeración. No busques ni propongas bibliografía: esa sección la completa el curriculista por aparte.`);
  return parts.join('\n\n');
}

function fichaMissing(s){
  const miss=[];
  if(!s.modulos?.trim()) miss.push('temario');
  if(!s.competencia?.trim()) miss.push('competencia');
  [1,2,3].forEach(n=>{ if(!s[`ra${n}`]?.trim()||!s[`cd${n}`]?.trim()) miss.push(`RA ${n} con criterios`); });
  return miss;
}

function openClaudeFlow(mode){
  if(!currentCourse||!currentProject){ toast('Abrí un curso primero','error'); return; }
  claudeMode=mode;
  const c=currentCourse; const code=c['Código']||''; const name=c['Curso']||c['Nombre']||'';
  const stepPrompt=document.getElementById('cl-step-prompt');
  const warn=document.getElementById('cl-warn');
  warn.style.display='none'; warn.textContent='';
  document.getElementById('cl-response').value='';
  document.getElementById('cl-url').value=getClaudeUrl();
  if(mode==='ficha'){
    document.getElementById('cl-title').textContent='1 · Hacer la ficha con Claude';
    document.getElementById('cl-sub').textContent=`${code} · ${name}. Claude revisa el temario, redacta los tres resultados de aprendizaje con sus criterios y evidencias, y cierra con la competencia.`;
    document.getElementById('cl-prompt').value=buildFichaPrompt();
    stepPrompt.style.display=''; document.getElementById('cl-num2').textContent='2';
  } else if(mode==='programa'){
    document.getElementById('cl-title').textContent='2 · Programa completo con Claude';
    document.getElementById('cl-sub').textContent=`${code} · ${name}. Claude toma la ficha aprobada y redacta el resto del programa: descripción, metodologías, evaluación con rúbricas, recursos y cronograma.`;
    const miss=fichaMissing(currentSaved());
    if(miss.length){ warn.textContent=`La ficha de este curso todavía no tiene: ${miss.join(', ')}. Conviene hacer y aplicar la ficha primero; si seguís, Claude trabajará con lo que haya.`; warn.style.display='block'; }
    document.getElementById('cl-prompt').value=buildProgramaPrompt();
    stepPrompt.style.display=''; document.getElementById('cl-num2').textContent='2';
  } else {
    document.getElementById('cl-title').textContent='Pegar respuesta de Claude';
    document.getElementById('cl-sub').textContent=`${code} · ${name}. Sirve para fichas y programas completos.`;
    stepPrompt.style.display='none'; document.getElementById('cl-num2').textContent='1';
  }
  document.getElementById('modal-claude').classList.add('active');
}
function closeClaudeFlow(){ document.getElementById('modal-claude')?.classList.remove('active'); }

function copyClaudePrompt(openAfter){
  const ta=document.getElementById('cl-prompt');
  const text=ta.value;
  let ok=false;
  try { ta.focus(); ta.select(); ok=document.execCommand('copy'); } catch(e){}
  if(!ok && navigator.clipboard){ navigator.clipboard.writeText(text).catch(()=>{}); ok=true; }
  ta.setSelectionRange(0,0); ta.blur();
  toast(ok?'✓ Prompt copiado. Pegalo en Claude (Ctrl+V)':'No se pudo copiar; seleccioná el texto y copialo a mano', ok?'success':'error');
  if(openAfter) window.open(getClaudeUrl(),'_blank','noopener');
}

// ── Importación ────────────────────────────────────────
function extractJSONBlock(text){
  const blocks=[...String(text).matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(m=>m[1].trim()).filter(b=>b.startsWith('{'));
  let raw=blocks.length?blocks[blocks.length-1]:null;
  if(!raw){ const a=text.indexOf('{'), b=text.lastIndexOf('}'); if(a>=0&&b>a) raw=text.slice(a,b+1); }
  if(!raw) throw new Error('No encontré un bloque JSON en la respuesta.');
  try { return JSON.parse(raw); } catch(e1){
    const fixed=raw.replace(/,\s*([}\]])/g,'$1').replace(/[“”]/g,'"');
    try { return JSON.parse(fixed); } catch(e2){ throw new Error('El bloque JSON tiene un error de formato: '+e1.message); }
  }
}

function importClaudeResponse(){
  const text=document.getElementById('cl-response').value.trim();
  if(!text){ toast('Pegá la respuesta de Claude primero','error'); return; }
  let data;
  try { data=extractJSONBlock(text); } catch(e){ toast(e.message,'error'); return; }
  const code=currentCourse?.['Código']||'';
  if(data.codigo && code && String(data.codigo).trim().toUpperCase()!==code.trim().toUpperCase()){
    if(!confirm(`La respuesta es del curso ${data.codigo}, pero tenés abierto ${code}. ¿Importarla igual en ${code}?`)) return;
  }
  const tipo=(data.tipo||'').toLowerCase() || (data.temario||data.competencia?'ficha':(data.metodologias?'programa':''));
  let items;
  if(tipo==='ficha') items=fichaToItems(data);
  else if(tipo==='programa') items=programaToItems(data);
  else { toast('No reconozco el tipo de respuesta (ficha o programa)','error'); return; }
  if(!items.length){ toast('El bloque no trae campos para importar','error'); return; }
  closeClaudeFlow();
  renderReviewItems(items, tipo==='ficha'
    ? 'Ficha generada por Claude — revisá y aplicá cada campo'
    : 'Programa completo generado por Claude — revisá y aplicá cada campo');
}

function fichaToItems(d){
  const items=[];
  const mods=(d.temario||[]).map((m,i)=>{
    const subs=cleanList(m.subtemas);
    return `Módulo ${i+1}. ${stripModPrefix(m.modulo||m.nombre||'')}`+(subs.length?'\n'+subs.map(x=>'- '+x).join('\n'):'');
  });
  if(d.hilo_conductor){
    const h=d.hilo_conductor;
    items.push({label:'Hilo conductor', secId:'_hilo', value:JSON.stringify(h),
      preview:`Núcleo: ${h.nucleo||''}\nObjeto de estudio: ${h.objeto_estudio||''}\nProducto principal: ${h.producto_principal||''}\nUso de la IA: ${h.uso_ia||''}`, icon:'🧭'});
  }
  if(mods.length) items.push({label:'Módulos y subtemas', secId:'modulos', value:mods.join('\n\n'), icon:'📚'});
  if((d.cambios_temario||[]).length){
    items.push({label:'Cambios al temario (solo lectura)', secId:null,
      preview:d.cambios_temario.map(x=>`${x.original||'—'} → ${x.ajustado||'—'}${x.regla?' ('+x.regla+')':''}`).join('\n'), icon:'✎'});
  }
  if(d.competencia) items.push({label:'Competencia del curso', secId:'competencia', value:String(d.competencia).trim(), preview:String(d.competencia).trim()+(d.verbo_competencia?`\n\nVerbo: ${d.verbo_competencia}`:''), icon:'🏆'});
  const acts=(d.actividades||[]).slice(0,3);
  acts.forEach((a,i)=>{
    const n=i+1;
    if(a.ra) items.push({label:`RA ${n} · ${a.nombre||''}`, secId:`ra${n}`, value:String(a.ra).trim(), icon:'🎯'});
    const cds=cleanList(a.criterios);
    if(cds.length) items.push({label:`CD ${n} (${cds.length} criterios)`, secId:`cd${n}`, value:cds.join('\n'), icon:'📋'});
    const evs=cleanList(a.evidencias);
    if(a.nombre||evs.length) items.push({label:`Evidencia ${n}`, secId:`e${n}`, value:[String(a.nombre||'').trim(),...evs].join('\n'), icon:'📎'});
  });
  if(acts.length){
    const tabla=acts.map(a=>`${String(a.nombre||'').trim()} (${parseInt(a.cantidad)||1}) | ${parseInt(a.porcentaje)||0}%`).join('\n');
    const total=acts.reduce((t,a)=>t+(parseInt(a.porcentaje)||0),0);
    items.push({label:`Tabla de evaluaciones${total!==100?' ⚠ suma '+total+'%':''}`, secId:'eva_tabla', value:tabla,
      preview:acts.map(a=>`${a.nombre} (${a.cantidad||1}) — ${a.porcentaje}%${a.nota?' · '+a.nota:''}`).join('\n'), icon:'📊'});
    const notas=acts.filter(a=>a.nota).map(a=>({nombre:String(a.nombre||'').trim(), nota:a.nota}));
    if(notas.length) items.push({label:'Notas de diseño de las actividades', secId:'_notas_eva', value:JSON.stringify(notas),
      preview:notas.map(x=>`${x.nombre}: ${x.nota}`).join('\n'), icon:'🗒'});
  }
  return items;
}

function programaToItems(d){
  const items=[];
  const ds=d.descripcion||{};
  if(ds.objeto_estudio) items.push({label:'Objeto de estudio', secId:'descripcion_objeto', value:ds.objeto_estudio.trim(), icon:'📖'});
  if(ds.importancia)    items.push({label:'Importancia', secId:'descripcion_import', value:ds.importancia.trim(), icon:'⭐'});
  if(ds.en_el_curso)    items.push({label:'En el curso…', secId:'descripcion_en_curso', value:ds.en_el_curso.trim(), icon:'🎯'});
  { const g=rasgosGroupFor(currentCourse?.['Código']);
    if (maestroRasgos(currentSaved())) {/* los rasgos vienen del Maestro */}
    else if (g && String(g.texto||'').trim()) items.push({label:`Rasgos de perfil (del grupo «${g.nombre}»)`, secId:'descripcion_rasgos', value:String(g.texto).trim(), icon:'👤'});
    else if(ds.rasgos_perfil && !maestroRasgos(currentSaved()) && !/^vac[ií]o/i.test(String(ds.rasgos_perfil).trim())) items.push({label:'Rasgos de perfil', secId:'descripcion_rasgos', value:ds.rasgos_perfil.trim(), icon:'👤'}); }
  const met=cleanList(d.metodologias);
  if(met.length) items.push({label:`Metodologías (${met.length})`, secId:'metodologias', value:met.join('\n'), icon:'🧠'});
  const est=cleanList(d.estrategias_aprendizaje);
  if(est.length) items.push({label:`Estrategias de aprendizaje (${est.length})`, secId:'estrategias', value:est.join('\n'), icon:'🎲'});
  const te=d.tipos_evaluacion||{};
  const teTxt=[te.diagnostica&&`Evaluación diagnóstica: ${te.diagnostica.trim()}`, te.formativa&&`Evaluación formativa: ${te.formativa.trim()}`, te.sumativa&&`Evaluación sumativa: ${te.sumativa.trim()}`].filter(Boolean).join('\n');
  if(teTxt) items.push({label:'Tipos de evaluación', secId:'eva_tipo', value:teTxt, icon:'🔍'});
  const acts=(d.actividades||[]).slice(0,3);
  const sv=currentSaved();
  acts.forEach((a,i)=>{ const evs=cleanList(a.evidencias); if(!evs.length) return;
    const cur=String(sv[`e${i+1}`]||'').split('\n').map(x=>x.trim()).filter(Boolean);
    const curEv=cur.slice(1).map(cleanItem).filter(Boolean);
    if(curEv.join('|')===evs.join('|')) return;
    const nm=cur[0]||a.nombre||'';
    items.push({label:`Evidencias ${i+1} · ${nm}${curEv.length?' (cambian las de la ficha)':' (nuevas: la ficha no las traía)'}`, secId:`e${i+1}`, value:[nm,...evs].join('\n'), icon:'📎'}); });
  acts.forEach((a,i)=>{ if(a.descripcion) items.push({label:`Descripción evaluación ${i+1} · ${a.nombre||''}`, secId:`eva_desc${i+1}`, value:a.descripcion.trim(), icon:'📝'}); });
  const rub=acts.map(a=>({nombre:a.nombre||'', rubrica:(a.rubrica||[]).map(r=>({criterio:r.criterio||'', titulo:r.titulo||'', niveles:cleanList(r.niveles)}))})).filter(a=>a.rubrica.length);
  if(rub.length){
    items.push({label:'Rúbricas (se guardan para la exportación)', secId:'_rubricas', value:JSON.stringify(rub),
      preview:rub.map(a=>`${a.nombre} — ${a.rubrica.length} criterios, ${a.rubrica.length*4} puntos\n`+a.rubrica.map(r=>`• ${r.titulo||r.criterio}\n   4: ${r.niveles[3]||''}`).join('\n')).join('\n\n'), icon:'▦'});
  }
  const tev=(d.tabla_evaluacion||[]).filter(r=>r&&String(r.nombre||'').trim());
  if(tev.length){ const txt=tev.map(r=>`${String(r.nombre).trim()} (${parseInt(r.cantidad)||1}) | ${parseInt(r.porcentaje)||0}%`).join('\n');
    if(txt!==String(sv.eva_tabla||'').trim()) items.push({label:'Tabla de evaluación (nombres del cuadro y entregas del cronograma)', secId:'eva_tabla', value:txt, icon:'📊'}); }
  { const em=evaTablaMismatch(sv); if(em && !tev.length) items.push({label:'⚠ '+em+' Corregí la tabla de evaluación antes de descargar el Word.', secId:'', value:'', icon:'⚠️'}); }
  const rec=cleanList(d.recursos_didacticos);
  if(rec.length) items.push({label:'Recursos didácticos', secId:'recursos', value:rec.join('\n'), icon:'🛠️'});
  const bo=cleanList(d.bibliografia?.obligatoria), bc=cleanList(d.bibliografia?.complementaria);
  if(bo.length) items.push({label:'Bibliografía obligatoria (verificar)', secId:'biblio_ob', value:bo.join('\n'), icon:'📕'});
  if(bc.length) items.push({label:'Bibliografía complementaria (verificar)', secId:'biblio_co', value:bc.join('\n'), icon:'📗'});
  if((d.cronograma||[]).length){
    const mods=splitModulos(currentSaved().modulos||'');
    const sch={};
    d.cronograma.forEach(r=>{
      const s=parseInt(r.sesion); if(!(s>=1&&s<=14)) return;
      const mi=parseInt(r.modulo)||'';
      const mod=mods[(mi||1)-1];
      const subs=cleanList(r.subtemas);
      // Sesión 1 sin líneas propias: la plantilla ya trae la inducción
      sch[s]={mod:mi?String(mi):'', modName:mod?mod.name:(mi?`Módulo ${mi}`:''), sub:subs.join('\n'), actName:'', verb:'', note:s===1?'':cleanList(r.actividades).join('\n')};
    });
    const prev=Object.keys(sch).sort((a,b)=>a-b).map(s=>`S${s} · ${sch[s].modName||'—'}${sch[s].note?'\n   '+sch[s].note.replace(/\n/g,'\n   '):''}`).join('\n');
    const warns=checkCronograma(sch, parseEvaTablaText(currentSaved().eva_tabla||''));
    items.push({label:`Cronograma (${Object.keys(sch).length} sesiones)${warns.length?` ⚠ ${warns.length} regla${warns.length>1?'s':''} sin cumplir`:' ✓ reglas cumplidas'}`, secId:'cronograma', value:JSON.stringify(sch),
      preview:(warns.length?'⚠ '+warns.join('\n⚠ ')+'\n\n':'')+prev, icon:'📅'});
  }
  return items;
}

// Reglas del cronograma: una actividad por semana desde la 2, entregas seguidas sin
// intercalar, duración fija en las actividades que no son el proyecto.
function checkCronograma(sch, evaRows){
  const warn=[]; const norm=t=>String(t||'').toLowerCase().trim();
  const actOf = line => { const m=String(line).match(/^([^:]{2,120}):/); if(!m) return null; return m[1].replace(/\(\s*\d+\s*%\s*\)/,'').trim(); };
  const closes = line => /\(\s*\d+\s*%\s*\)\s*:/.test(line) || /\b(finaliza|realiza)\b/i.test(line);
  let open=null, start=0, lastClosed=null; const durs={}; const pctSum={}; const closeAt={};
  for (let k=2;k<=14;k++){
    const lines=String(sch[k]?.note||'').split('\n').map(x=>x.trim()).filter(Boolean);
    const acts=[...new Set(lines.map(actOf).filter(Boolean).map(norm))];
    if (!acts.length){ warn.push(k===2?'La sesión 2 no inicia ni entrega ninguna actividad':`La sesión ${k} no tiene actividad`); continue; }
    if (acts.length>1){ warn.push(`La sesión ${k} tiene más de una actividad`); }
    const a=acts[0];
    if (open && open!==a){ warn.push(`En la sesión ${k} empieza otra actividad sin haber entregado ${open}`); open=null; }
    if (!open){ if(lastClosed===a) warn.push(`En la sesión ${k} empieza otra entrega de ${a} justo después de la anterior (falta otra actividad en medio para la retroalimentación)`); open=a; start=k; }
    lines.forEach(l=>{ const m=l.match(/\((\d+)\s*%\)/); if(m && norm(actOf(l))===a) pctSum[a]=(pctSum[a]||0)+parseInt(m[1]); });
    if (lines.some(closes)){ (durs[a]=durs[a]||[]).push(k-start+1); (closeAt[a]=closeAt[a]||[]).push(k); open=null; lastClosed=a; }
  }
  if (open) warn.push(`La última entrega de ${open} no se cierra antes de la sesión 15`);
  Object.entries(durs).forEach(([a,ds])=>{ const big=ds.filter(d=>d>3); if(big.length) warn.push(`Una entrega de ${a} dura ${Math.max(...big)} semanas (máximo 3)`); });
  const totalEnt=Object.values(durs).reduce((t,ds)=>t+ds.length,0);
  if (totalEnt>8) warn.push(`El cronograma tiene ${totalEnt} entregas (máximo 8)`);
  const proj = norm(evaRows[0]?.name);
  // El proyecto: siempre 3 avances, uno en cada tercio del curso
  const pc=closeAt[proj]||[];
  if (proj && pc.length && pc.length!==3) warn.push(`El proyecto tiene ${pc.length} avances (siempre van 3)`);
  if (pc.length===3){
    const ok = pc[0]<=6 && pc[1]>=7 && pc[1]<=10 && pc[2]>=11;
    if (!ok) warn.push(`Los avances del proyecto cierran en las sesiones ${pc.join(', ')}: deben repartirse a lo largo del curso (uno hasta la sesión 6, otro entre la 7 y la 10 y el último entre la 11 y la 14)`);
  }
  Object.entries(durs).forEach(([a,ds])=>{ if(a!==proj && new Set(ds).size>1) warn.push(`Las entregas de ${a} no duran lo mismo (${ds.join(', ')} semanas)`); });
  evaRows.forEach(r=>{ const got=pctSum[norm(r.name)]; if(got!==undefined && got!==r.pct) warn.push(`Los porcentajes de ${r.name} en el cronograma suman ${got}% y en la tabla ${r.pct}%`); });
  return warn;
}

function renderReviewItems(items, title){
  const panel=document.getElementById('ficha-result');
  const fields=document.getElementById('ficha-fields');
  document.getElementById('ficha-result-title-txt').textContent=title;
  fields.innerHTML='';
  items.forEach(item=>{
    const div=document.createElement('div');
    div.className='ficha-field'+(item.secId?'':' ro');
    div.innerHTML=`
      <div class="ficha-field-lbl">
        <span>${item.icon||''} ${escHtml(item.label)}</span>
        ${item.secId?`<button class="ficha-apply-btn">✓ Aplicar</button>`:''}
      </div>
      <div class="ficha-field-val">${escHtml(item.preview||item.value)}</div>`;
    if(item.secId){
      div.dataset.secId=item.secId;
      div.dataset.value=item.value;
      div.querySelector('.ficha-apply-btn').onclick=function(){ applyFichaField(item.secId,this); };
    }
    fields.appendChild(div);
  });
  panel.classList.add('visible');
  panel.scrollIntoView({behavior:'smooth',block:'start'});
}

document.getElementById('modal-claude').addEventListener('click',e=>{if(e.target===e.currentTarget)closeClaudeFlow();});
