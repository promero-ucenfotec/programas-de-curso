/* Rasgos del perfil por grupo de cursos */
/* ══════════════════════════════════════════════════════
   RASGOS DEL PERFIL POR GRUPO DE CURSOS
══════════════════════════════════════════════════════ */
let rgDraft=[];
function openRasgosGrupos(){
  if(!currentProject){ toast('Abrí un proyecto primero','error'); return; }
  rgDraft = JSON.parse(JSON.stringify(currentProject.rasgosGrupos||[]));
  if(!rgDraft.length) rgDraft.push({id:Date.now().toString(36), nombre:'', texto:'', cursos:[]});
  renderRasgosGrupos();
  document.getElementById('modal-rasgos').classList.add('active');
}
function closeRasgosGrupos(){ document.getElementById('modal-rasgos').classList.remove('active'); }
function addRasgosGrupo(){ rgSync(); rgDraft.push({id:Date.now().toString(36), nombre:'', texto:'', cursos:[]}); renderRasgosGrupos(); }
function delRasgosGrupo(i){ rgSync(); rgDraft.splice(i,1); renderRasgosGrupos(); }
function rgSync(){
  document.querySelectorAll('#rg-list .rg-card').forEach((card,i)=>{
    const g=rgDraft[i]; if(!g) return;
    g.nombre=card.querySelector('.rg-name').value.trim();
    g.texto=card.querySelector('textarea').value.trim();
    g.cursos=[...card.querySelectorAll('.rg-course input:checked')].map(x=>x.value);
  });
}
function rgCopyFrom(i, code){
  if(!code) return; rgSync();
  const s=savedForCourse((allCourses||[]).find(c=>c['Código']===code)||{});
  if(s.descripcion_rasgos){ rgDraft[i].texto=String(s.descripcion_rasgos).trim(); if(!rgDraft[i].cursos.includes(code)) rgDraft[i].cursos.push(code); }
  else toast('Ese curso todavía no tiene rasgos guardados','error');
  renderRasgosGrupos();
}
function renderRasgosGrupos(){
  const list=document.getElementById('rg-list');
  const courses=orderedCourses().map(x=>x.c);
  const owner={}; rgDraft.forEach((g,i)=>(g.cursos||[]).forEach(c=>owner[c]=i));
  const withRasgos=courses.filter(c=>String(savedForCourse(c).descripcion_rasgos||'').trim());
  list.innerHTML = rgDraft.map((g,i)=>`
    <div class="rg-card">
      <div class="rg-top">
        <div class="fg"><label>Nombre del grupo</label><input class="rg-name" value="${escHtml(g.nombre||'')}" placeholder="Ej.: Ingeniería del software, Inteligencia artificial, Fundamentos"></div>
        <button class="btn btn-quiet btn-sm" onclick="delRasgosGrupo(${i})" title="Eliminar grupo">Eliminar</button>
      </div>
      <textarea placeholder="Este curso se relaciona con los siguientes rasgos del perfil profesional: “…”, “…” y “…”.">${escHtml(g.texto||'')}</textarea>
      <div class="rg-tools">${withRasgos.length?`Copiar los rasgos de <select onchange="rgCopyFrom(${i}, this.value)"><option value="">un curso…</option>${withRasgos.map(c=>`<option value="${escHtml(c['Código'])}">${escHtml(c['Código']+' '+(c['Curso']||c['Nombre']||''))}</option>`).join('')}</select>`:''}</div>
      <div class="rg-courses">${courses.map(c=>{ const code=c['Código']; const o=owner[code]; const mine=o===i; const taken=o!==undefined&&!mine;
        return `<label class="rg-course${taken?' taken':''}" title="${taken?'Ya está en otro grupo':escHtml(c['Curso']||c['Nombre']||'')}"><input type="checkbox" value="${escHtml(code)}" ${mine?'checked':''} ${taken?'disabled':''}>${escHtml(code)}</label>`; }).join('') || '<span style="font-size:13px;color:var(--ink-3)">Cargá los cursos del proyecto para asignarlos.</span>'}</div>
    </div>`).join('');
}
function saveRasgosGrupos(){
  rgSync();
  const groups=rgDraft.filter(g=>g.nombre||g.texto||g.cursos.length);
  if(groups.some(g=>!g.nombre)){ toast('Poné un nombre a cada grupo','error'); return; }
  currentProject.rasgosGrupos=groups;
  const pi=projects.findIndex(p=>p.id===currentProject.id); if(pi>=0) projects[pi].rasgosGrupos=groups;
  localStorage.setItem('dcd_projects',JSON.stringify(projects));
  // Cada curso del grupo queda con los rasgos del grupo
  const sid=currentProject.sheetId; let n=0;
  groups.forEach(g=>{ if(!String(g.texto||'').trim()) return; g.cursos.forEach(code=>{ maestroData[sid]=maestroData[sid]||{}; maestroData[sid][code]=maestroData[sid][code]||{}; maestroData[sid][code].descripcion_rasgos=g.texto.trim(); n++; }); });
  localStorage.setItem('dcd_maestro',JSON.stringify(maestroData));
  autoBackup(); closeRasgosGrupos();
  toast(`✓ ${groups.length} grupo(s) guardado(s); ${n} curso(s) con rasgos del grupo`,'success');
}
document.getElementById('modal-rasgos').addEventListener('click',e=>{if(e.target===e.currentTarget)closeRasgosGrupos();});
// Bloque para Claude: rasgos del grupo (textuales) o rasgos ya usados en cursos afines
// Competencias de la carrera a las que aporta el curso (columnas del Maestro)
function carreraCompBlock(s){
  s=s||currentSaved();
  const L=t=>String(t||'').split('\n').map(cleanItem).filter(Boolean);
  const a=L(s._comp_general), e=L(s._comp_curricular), t=L(s._comp_transversal);
  if(!a.length && !e.length && !t.length) return '';
  const out=['COMPETENCIAS DE LA CARRERA A LAS QUE APORTA EL CURSO (del Maestro; van textuales en el cuadro de competencia, no las reescribas)'];
  if(a.length) out.push(`Área de conocimiento:\n${a.map(x=>'- '+x).join('\n')}`);
  if(e.length) out.push(`Eje curricular:\n${e.map(x=>'- '+x).join('\n')}`);
  if(t.length) out.push(`Ejes transversales:\n${t.map(x=>'- '+x).join('\n')}`);
  out.push(`Cómo usarlas:
- La competencia del curso es un paso concreto hacia la competencia del área de conocimiento: comparte su campo y su tipo de producto, en un nivel más específico, sin copiar su redacción.
- El eje curricular se ve en el curso: al menos un resultado de aprendizaje o varios criterios de desempeño lo trabajan de forma explícita${e.length?` (${e.map(x=>x.split('.')[0]).join(', ')})`:''}.
- Los ejes transversales se reflejan en el rasgo actitudinal del perfil y en alguna metodología, sin nombrarlos de forma literal.`);
  return out.join('\n');
}
// Recursos institucionales fijos del programa (además de la biblioteca y Google Workspace de la plantilla)
const RECURSOS_FIJOS = [
  {re:/^las aulas de la universidad/i, texto:'Las aulas de la Universidad cuentan con el equipo audiovisual y la conectividad que requieren las sesiones presenciales y el trabajo colaborativo de los estudiantes.'},
  {re:/^los laboratorios de inform[aá]tica/i, texto:'Los laboratorios de informática de la Universidad ofrecen a los estudiantes y docentes equipos de cómputo con el software especializado que requieren las actividades del curso.'},
  {re:/^la plataforma elibro|^elibro/i, texto:'La plataforma eLibro brinda a la comunidad universitaria el acceso en línea a libros y documentos académicos para la consulta de la bibliografía del curso.'},
];
const RECURSOS_FIJOS_RE = /^(aulas$|laboratorios de inform[aá]tica$|e-?libro$|la biblioteca de la universidad)|google workspace for education/i;
// Frases de 5 o más palabras que se repiten en varias secciones del programa
const REP_SECS = ['descripcion_objeto','descripcion_import','descripcion_en_curso','descripcion_rasgos','competencia','ra1','ra2','ra3','metodologias','estrategias','eva_tipo','eva_desc1','eva_desc2','eva_desc3','recursos'];
const REP_FIJAS = /^(esta estrategia de evaluacion|la metodologia de|la importancia de esta asignatura|este curso se relaciona|en el curso|permite que en este curso|consulta posibles dudas|segun indicaciones del docente|de manera que los estudiantes|de forma que los estudiantes|para que los estudiantes|la evaluacion (diagnostica|formativa|sumativa)|esta actividad se compone|requiere el uso de aplicaciones|se realiza de (manera|forma))/;
// Fórmulas fijas de la plantilla que sí se repiten a propósito
const REP_FRAG = ['estrategia de evaluacion','se realiza de','de forma individual','de manera grupal','documento escrito contiene','requiere el uso','uso de aplicaciones','la metodologia de','consulta posibles dudas','indicaciones del docente','esta actividad se compone','importancia de esta asignatura','rasgos del perfil','en este curso los estudiantes','entregables en los que'];
function repeatedPhrases(saved, minSecs=3){
  saved=saved||currentSaved();
  const W=t=>normTxt(String(t||'')
      .replace(/Se realiza de (forma|manera) \S+\.?/gi,' | ')
      .replace(/Esta (estrategia|actividad) de evaluaci[oó]n (requiere el uso de aplicaciones como [^.]*|utiliza la siguiente r[uú]brica:?)\.?/gi,' | '))
    .replace(/[^a-z0-9ñ\s]/g,' | ').split(/\s+/).filter(Boolean);
  const protect=[1,2,3].map(n=>normTxt((String(saved[`e${n}`]||'').split('\n')[0]||''))).concat([normTxt(currentCourse?.['Curso']||'')]).filter(x=>x.length>3);
  const where={}; const N=5;
  REP_SECS.forEach(id=>{
    const w=W(saved[id]||''); const seen=new Set();
    for(let i=0;i+N<=w.length;i++){ const sl=w.slice(i,i+N); if(sl.includes('|')) continue; const g=sl.join(' '); if(seen.has(g)) continue; seen.add(g); (where[g]=where[g]||new Set()).add(id); }
  });
  const STOP=new Set(['de','la','el','los','las','y','en','del','para','con','a','un','una','que','se','su','sus','al','por']);
  let cand=Object.entries(where).filter(([g,set])=>set.size>=minSecs)
    .filter(([g])=>!REP_FIJAS.test(g) && !REP_FRAG.some(f=>g.includes(f)) && !protect.some(pr=>pr.includes(g)) && g.split(' ').filter(x=>!STOP.has(x)).length>=3);
  // Unir n-gramas vecinos en frases más largas con las mismas secciones
  const out=[];
  cand.sort((a,b)=>b[1].size-a[1].size);
  cand.forEach(([g,set])=>{
    const key=[...set].sort().join(',');
    const hit=out.find(o=>o.key===key && (o.text.includes(g.split(' ').slice(0,4).join(' ')) || o.text.includes(g.split(' ').slice(1).join(' '))));
    if(hit){ const a=hit.text.split(' '), b=g.split(' ');
      if(!hit.text.includes(g)){ if(a.slice(-(N-1)).join(' ')===b.slice(0,N-1).join(' ')) hit.text=a.concat(b.slice(-1)).join(' '); else if(b.slice(-(N-1)).join(' ')===a.slice(0,N-1).join(' ')) hit.text=[b[0]].concat(a).join(' '); }
    } else out.push({text:g, key, secs:[...set]});
  });
  const lbl=id=>(ALL_SECS.find(x=>x.id===id)||{label:id}).label;
  // Unir frases de las mismas secciones que se solapan (fin de una = inicio de otra)
  let merged=true;
  while(merged){ merged=false;
    for(const a of out){ for(const b of out){ if(a===b||a.key!==b.key||a.dead||b.dead) continue;
      const A=a.text.split(' '), B=b.text.split(' ');
      if(a.text.includes(b.text)){ b.dead=true; merged=true; continue; }
      for(let k=Math.min(A.length,B.length)-1;k>=2;k--){ if(A.slice(-k).join(' ')===B.slice(0,k).join(' ')){ a.text=A.concat(B.slice(k)).join(' '); b.dead=true; merged=true; break; } }
    } }
  }
  // Mostrar la frase con sus tildes, tal como está escrita en la primera sección
  const orig=(o)=>{ const txt=String(saved[o.secs[0]]||''); const ws=txt.split(/\s+/); const target=o.text.split(' ');
    const clean=w=>normTxt(w).replace(/[^a-z0-9ñ]/g,'');
    for(let i=0;i+target.length<=ws.length;i++){ if(target.every((t,j)=>clean(ws[i+j])===t)) return ws.slice(i,i+target.length).join(' ').replace(/[.,;:]+$/,''); }
    return o.text; };
  return out.filter(o=>!o.dead).sort((a,b)=>b.secs.length-a.secs.length || b.text.length-a.text.length).slice(0,8).map(o=>({frase:orig(o), secciones:o.secs.map(lbl)}));
}
// Nombre del proyecto que repite el curso y módulos que mezclan infinitivos con sustantivos
// La tabla de evaluación (Maestro) debe tener las mismas actividades que el cuadro de competencia
function evaTablaMismatch(s){
  s=s||{}; const N=x=>normTxt(String(x||'')).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const acts=[1,2,3].map(n=>activityName(s,n)).filter(Boolean); const rows=parseEvaTablaText(s.eva_tabla||'');
  if(!acts.length||!rows.length) return '';
  const bad=rows.filter(r=>!acts.some(a=>N(a)===N(r.name)));
  if(!bad.length && rows.length===acts.length) return '';
  return `La tabla de evaluación no coincide con el cuadro de competencia: la tabla dice ${rows.map(r=>'«'+r.name+'»').join(', ')} y el cuadro dice ${acts.map(a=>'«'+a+'»').join(', ')}. Puede venir de otro curso en el Maestro.`;
}
function nameChecks(s){
  s=s||(currentCourse?savedForCourse(currentCourse):{});
  const out=[]; const N=x=>normTxt(String(x||'')).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const course=N(currentCourse?.['Curso']||currentCourse?.['Nombre']||'').replace(/\b(i|ii|iii|iv|\d+)$/,'').trim();
  const proj=String(s.e1||'').split('\n')[0].trim(); const pn=N(proj);
  { const em=evaTablaMismatch(s); if(em) out.push(em+' Usá los nombres del cuadro y sacá la cantidad de entregas del cronograma; devolvé la tabla corregida en "tabla_evaluacion".'); }
  if(pn){
    if(/^desarrollo de\b/.test(pn)) out.push(`El nombre del proyecto («${proj}») empieza con "Desarrollo de": nombrá el producto o modelo que se entrega.`);
    else if(course && course.length>3 && pn.includes(course)) out.push(`El nombre del proyecto («${proj}») repite el nombre del curso: nombrá el producto o modelo que se entrega.`);
  }
  // Recursos didácticos que nombran las evaluaciones del curso
  const acts=[1,2,3].map(n=>String(s['e'+n]||'').split('\n')[0].trim()).filter(x=>x.length>3);
  const recHits=acts.filter(a=>N(s.recursos||'').includes(N(a)));
  if(recHits.length) out.push(`Los recursos didácticos nombran evaluaciones del curso (${recHits.map(a=>'«'+a+'»').join(', ')}): cada recurso describe lo que permite en el curso, sin aludir a las evaluaciones.`);
  const mods=splitModulos(s.modulos||'').map(m=>m.name.replace(/^M[oó]dulo\s+\d+\.\s*/,'').trim()).filter(Boolean);
  const inf=mods.filter(m=>/^[A-ZÁÉÍÓÚa-záéíóúñ]+(ar|er|ir)\b/i.test(m.split(/\s+/)[0]) && !/^(introducci|fundament)/i.test(m));
  if(inf.length && inf.length<mods.length) out.push(`Los módulos mezclan infinitivos con sustantivos (${inf.map(m=>'«'+m.split(/\s+/).slice(0,3).join(' ')+'…»').join(', ')}): usá la misma forma en todos ("Modelado para…").`);
  return out;
}
function repeatedBlock(saved){
  const r=repeatedPhrases(saved); if(!r.length) return '';
  return 'FRASES QUE SE REPITEN EN VARIAS SECCIONES (dilas de otra manera en cada sección, o quitalas si sobran)\n'+r.map(x=>`- «${x.frase}» → ${x.secciones.join(', ')}`).join('\n');
}
function rasgosPromptBlock(){
  const code=currentCourse?.['Código'];
  const cur=courseRasgos(code, currentSaved());
  return 'RASGOS DEL PERFIL: no los redactes. Se crean aparte (skill pc-rasgos-perfil) y la app los toma del Maestro; dejá "rasgos_perfil" vacío.'
    + (cur ? `\nRasgos vigentes de este curso (solo para que el resto del programa no los repita):\n${cur}` : '');
}
function rasgosPromptBlockGrupo(){
  const code=currentCourse?.['Código']; const g=rasgosGroupFor(code);
  if (g && String(g.texto||'').trim()) return `RASGOS DEL PERFIL DEL GRUPO «${g.nombre}» (este curso pertenece a ese grupo: copiá estos rasgos textuales en "rasgos_perfil", sin cambiar nada)\n${String(g.texto).trim()}`;
  const seen=new Set(); const others=[];
  orderedCourses().map(x=>x.c).forEach(c=>{ if(c['Código']===code) return; const t=String(savedForCourse(c).descripcion_rasgos||'').trim(); if(t && !seen.has(t)){ seen.add(t); others.push(`— ${c['Código']} ${c['Curso']||c['Nombre']||''}\n${t}`); } });
  if (!others.length) return 'RASGOS DEL PERFIL: redactalos para el grupo de cursos afines a este (no exclusivos de este curso), de modo que sirvan igual para los cursos de la misma área.';
  return `RASGOS DEL PERFIL YA USADOS EN OTROS CURSOS DE ESTA CARRERA\n${others.slice(0,4).join('\n\n')}\n\nSi este curso es afín a alguno de esos (misma área o agrupación), reutilizá sus rasgos textuales. Si no, redactá rasgos para el grupo de cursos afines a este, no exclusivos de este curso.`;
}
function rasgosGroupFor(code, p=currentProject){
  const n=String(code||'').replace(/[\s-]+/g,'').toUpperCase();
  return (p?.rasgosGrupos||[]).find(g=>(g.cursos||[]).some(c=>String(c).replace(/[\s-]+/g,'').toUpperCase()===n)) || null;
}
// "Este curso se relaciona con…: “a”, “b” y “c”." con cada rasgo en minúscula y sin punto final
function rasgoLower(r){ r=String(r||'').trim().replace(/^[“"']+|[”"'.;\s]+$/g,''); return r ? r.charAt(0).toLocaleLowerCase('es')+r.slice(1) : ''; }
function rasgosSentence(list){
  const l=(list||[]).map(rasgoLower).filter(Boolean); if(!l.length) return '';
  const q=l.map(x=>`“${x}”`);
  return `Este curso se relaciona con los siguientes rasgos del perfil profesional: ${q.length>1?q.slice(0,-1).join(', ')+' y '+q[q.length-1]:q[0]}.`;
}
function maestroRasgos(saved){ const a=safeJSON(saved?._rasgos_m||'null',null); return Array.isArray(a)&&a.some(x=>String(x||'').trim()) ? a : null; }
function courseRasgos(code, saved){
  const m=maestroRasgos(saved); if (m) return rasgosSentence(m);
  const g=rasgosGroupFor(code);
  return (g && String(g.texto||'').trim()) || String(saved?.descripcion_rasgos||'').trim();
}
function courseNameByCode(code){
  const norm=x=>String(x||'').replace(/[\s-]+/g,'').toUpperCase();
  const n=norm(code), same=x=>norm(x)===n;
  const c=(allCourses||[]).find(x=>same(x['Código']));
  if (c) return { code:String(c['Código']).trim(), name:String(c['Curso']||c['Nombre']||'').trim() };
  // Respaldo: datos guardados de cualquier proyecto (por ejemplo, cursos comunes)
  for (const courses of Object.values(maestroData||{})){
    for (const [k,s] of Object.entries(courses||{})){
      if (!same(k)) continue;
      const d=safeJSON(s._datos||'{}',{}), m=safeJSON(s._datos_m||'{}',{});
      const nm=String(d['Nombre']||m['Nombre']||'').trim(); if (nm) return { code:k, name:nm };
    }
  }
  return null;
}
function expandRequisitos(text){
  const t=String(text||'').trim();
  if (!t || /^(no aplica|ninguno|n\/a|-+)$/i.test(t)) return t;
  const parts=t.split(/\s*[,;\n]\s*|\s+y\s+(?=[A-Z]{2,6}-?\d)/).map(x=>x.trim()).filter(Boolean);
  return parts.map(p=>{
    const m=p.match(/^([A-Za-z]{2,6}-?\s?\d{1,4}[A-Za-z]?)(.*)$/);
    if (!m) return p;
    const code=m[1].replace(/\s+/g,'').toUpperCase(), rest=m[2].trim();
    if (rest) return `${code} ${rest.replace(/^[-–:·]\s*/,'')}`;   // ya trae el nombre
    const f=courseNameByCode(code);
    return f && f.name ? `${f.code} ${f.name}` : code;
  }).join('\n');
}
function courseDatos(course, saved){
  const fd = safeJSON(saved._datos||'{}',{});
  const dm = safeJSON(saved._datos_m||'{}',{});
  const c = Object.assign({}, dm, Object.fromEntries(Object.entries(course||{}).filter(([k,v])=>String(v??'').trim())));
  const pick=(...vals)=>vals.map(v=>String(v??'').trim()).find(Boolean)||'';
  const num=v=>String(v??'').trim().replace(/^(-?\d+)[.,]0+$/,'$1');
  const lect=num(pick(c['Horas Docencia'],c['Horas Clase'],c['Lectivas'])), teo=num(pick(c['Horas teoría'],c['Teoria'])), lab=num(pick(c['Horas laboratorio'],c['Lab'])), pra=num(pick(c['Horas práctica'],c['Practica'])), ind=num(pick(c['Horas Independiente'],c['Independiente'])), tot=num(pick(c['Total de horas'],c['Total']));
  const distBase = lect ? [`Horas lectivas: ${lect}`, `(Teoría: ${teo||0}, laboratorio: ${lab||0} y práctica: ${pra||0})`, `Horas de trabajo independiente: ${ind||''}`, `Total de horas: ${tot||''}`].join('\n') : '';
  return {
    'Código': pick(c['Código'], fd['Código']),
    'Nombre': pick(c['Curso'], c['Nombre'], fd['Nombre']),
    'Créditos': num(pick(c['Créditos'], fd['Créditos'])),
    'Duración': pick(c['Duración'], fd['Duración'], '15 semanas'),
    'Distribución de horas por semana': pick(fd['Distribución de horas por semana'], distBase),
    'Modalidad': pick(c['Modalidad'], fd['Modalidad'], 'Presencial'),
    'Naturaleza': pick(c['Naturaleza'], fd['Naturaleza'], 'Teórico – Práctico'),
    'Ubicación': pick(fd['Ubicación'], c['Ubicación'], c['Periodo']),
    'Requisitos': expandRequisitos(pick(c['Requisitos'], fd['Requisitos'], 'No aplica')),
    'Correquisitos': expandRequisitos(pick(c['Correquisitos'], fd['Correquisitos'], 'No aplica')),
    'Nivel': pick(currentProject?.nivel, c['Nivel'], fd['Nivel']),
    'Profesor': pick(fd['Profesor'], 'Por definir'),
    'Sede': pick(c['Sede'], fd['Sede'], 'Central'),
    _escuela: pick(currentProject?.escuela, fd._escuela),
    _carrera: pick(fd._carrera, currentProject?.career),
  };
}

// Línea del software de cada actividad: "Esta estrategia de evaluación requiere el uso de aplicaciones como …"
const SOFT_LINE_RE = /\s*Esta (?:estrategia|actividad) de evaluaci[oó]n requiere el uso de[^\n]*/i;
function splitSoftLine(desc){
  let main=String(desc||'').replace(/\s*Esta (estrategia|actividad) de evaluaci[oó]n utiliza la siguiente r[uú]brica:?\s*/i,' ');
  const m=main.match(SOFT_LINE_RE); const soft=m?m[0].trim():'';
  if(m) main=main.replace(SOFT_LINE_RE,' ');
  return { main: main.replace(/\s+/g,' ').trim(), soft };
}
async function buildDocx(mode, opts){
  if (!window.JSZip) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  const zip = await JSZip.loadAsync(b64ToBytes(PLANTILLA_DOCX_B64));
  const xmlStr = await zip.file('word/document.xml').async('string');
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
  const body = wEls(doc,'body')[0];
  const s = opts.saved || currentSaved(); const c = opts.course || currentCourse||{};
  const prog = mode==='programa';
  const datos = courseDatos(c, s);
  const find = (re, from=0)=>{ const b=bodyBlocks(body); for(let i=from;i<b.length;i++){ if(b[i].localName==='p' && re.test(pText(b[i]))) return b[i]; } return null; };
  const after = (node)=>{ let n=node.nextSibling; while(n && n.nodeType!==1) n=n.nextSibling; return n; };
  const between = (startNode, stopRe)=>{ const out=[]; let n=after(startNode); while(n && !(n.localName==='p' && stopRe.test(pText(n)))){ out.push(n); n=after(n);} return out; };
  const tables = wKids(body,'tbl');

  // 1. Encabezado: escuela y carrera
  const hdrCell = cellsOf(rowsOf(tables[0])[0]).find(tc=>cellParas(tc).some(p=>pText(p)));
  if (hdrCell){
    const hp=cellParas(hdrCell).filter(p=>pText(p));
    if (opts.escuela && hp[1]) fillPara(hp[1], opts.escuela);
    if (opts.carrera && hp[2]) fillPara(hp[2], opts.carrera);
    // Curso común: la segunda carrera va en su propia línea, con el mismo formato
    if (opts.carrera2 && hp[2]){
      const p2 = hp[2].cloneNode(true);
      hp[2].parentNode.insertBefore(p2, hp[2].nextSibling);
      fillPara(p2, opts.carrera2);
    }
  }
  // 2. Título
  const title = Array.from(body.childNodes).find(n=>n.localName==='p' && /Heading2/.test(new XMLSerializer().serializeToString(wChild(n,'pPr')||doc.createElement('x'))));
  if (title) fillPara(title, `${datos['Código']} ${datos['Nombre']}`.trim());

  // 3. Datos generales
  const tDatos = tables.find(t=>/^c[oó]digo$/i.test(wText(cellsOf(rowsOf(t)[0])[0]).trim()));
  if (tDatos) rowsOf(tDatos).forEach(tr=>{
    const cs=cellsOf(tr); if(cs.length<2) return;
    const k=wText(cs[0]).replace(/\s+/g,' ').trim();
    if (k in datos){
      setCell(cs[1], String(datos[k]).split('\n'));
      // Requisitos con nombre completo: alineados a la izquierda para que no se estiren
      if (/^(co)?rrequisitos$|^requisitos$/i.test(k)) cellParas(cs[1]).forEach(p=>{
        let pPr=wChild(p,'pPr'); if(!pPr){ pPr=wEl(doc,'pPr'); p.insertBefore(pPr,p.firstChild); }
        let jc=wChild(pPr,'jc'); if(!jc){ jc=wEl(doc,'jc'); const ref=Array.from(pPr.childNodes).find(n=>['textDirection','textAlignment','textboxTightWrap','outlineLvl','divId','cnfStyle','rPr','sectPr','pPrChange'].includes(n.localName))||null; pPr.insertBefore(jc,ref); }
        wAttr(jc,'val','left');
      });
    }
  });
  if (tDatos) tableFmtAll(tDatos, '24');

  // 4. Descripción (solo programa)
  const hDesc = find(/^descripci[oó]n del curso$/i);
  const protoNormal = find(/^en el presente curso, se utilizan/i);
  if (hDesc && prog){
    const p1=[s.descripcion_objeto, s.descripcion_import, s.descripcion_en_curso, buildTematicasSentence(s)].map(x=>String(x||'').trim()).filter(Boolean).join(' ');
    // Todo en un solo párrafo, rasgos incluidos (como en las versiones revisadas)
    const paras=[[p1, courseRasgos(c['Código'], s)].filter(Boolean).join(' ')].filter(Boolean);
    let ref=after(hDesc);
    paras.forEach(t=>body.insertBefore(clonePara(protoNormal, t), ref));
  }

  // 5. Cuadro de competencia
  const tCuadro = tables.find(t=>/competencias?\s+gen[eé]ricas/i.test(wText(rowsOf(t)[0])));
  if (tCuadro){
    const rows=rowsOf(tCuadro);
    const iComp=rows.findIndex(r=>cellsOf(r).length===1 && /^competencia\s+espec[ií]fica/i.test(wText(r).trim()));
    if (iComp>=0 && rows[iComp+1]){
      const compRow=rows[iComp+1];
      setCell(cellsOf(compRow)[0], [String(s.competencia||'').trim()]);
      // La disposición ya no va en el cuadro de competencia: si la plantilla trae la fila, se quita
      rows.filter(r=>cellsOf(r).length===1 && /^disposici[oó]n/i.test(wText(r).trim())).forEach(r=>r.parentNode.removeChild(r));
    }
    // Competencia general y transversales (si el Maestro las trae)
    const boldLead = t => { const m=String(t).match(/^([^.]{2,80}\.)\s*(.*)$/); return m?[{text:m[1],bold:true},{text:' '+m[2],bold:false}]:[{text:t,bold:false}]; };
    const rowsG=rowsOf(tCuadro);
    const iGen=rowsG.findIndex(r=>cellsOf(r).length===1 && /^competencia\s+general$/i.test(wText(r).trim()));
    const genList=String(s._comp_general||'').split('\n').map(cleanItem).filter(Boolean);
    if (iGen>=0 && rowsG[iGen+1] && genList.length) setCell(cellsOf(rowsG[iGen+1])[0], genList, {segs:boldLead});
    // Transversales y curricular: cada eje en su viñeta, debajo de su etiqueta
    const tvRow=rowsG.find(r=>cellsOf(r).length===1 && /^transversales?:/i.test(wText(r).trim()));
    const fillEjes=(labelRe, list)=>{
      if (!tvRow || !list.length) return;
      const ps=cellParas(cellsOf(tvRow)[0]);
      const iL=ps.findIndex(p=>labelRe.test(pText(p).trim())); if (iL<0) return;
      const item=ps.slice(iL+1).find(p=>wEls(p,'numPr').length); if (!item) return;
      const rp=protoRPr(item);
      list.forEach(t=>item.parentNode.insertBefore(tableFmt(clonePara(item, boldLead(t), rp)), item));
      item.parentNode.removeChild(item);
    };
    fillEjes(/^transversales?:/i, String(s._comp_transversal||'').split('\n').map(cleanItem).filter(Boolean));
    fillEjes(/^curricular(es)?:/i, String(s._comp_curricular||'').split('\n').map(cleanItem).filter(Boolean));
    // Ejes sin definir: "Eje. Por definir" en lugar del texto de plantilla
    wEls(tCuadro,'p').forEach(p=>{ if(/^eje\.\s*competencia$/i.test(pText(p).trim())) fillPara(p, boldLead('Eje. Por definir'), protoRPr(p)); });
    const rows2=rowsOf(tCuadro);
    const iHead=rows2.findIndex(r=>cellsOf(r).length>=3 && /^resultados?\s+de\s+aprendizaje$/i.test(wText(cellsOf(r)[0]).trim()));
    const raRows=rows2.slice(iHead+1).filter(r=>cellsOf(r).length>=3);
    const evaRowsC=parseEvaTablaText(s.eva_tabla||'');
    raRows.forEach((tr,i)=>{
      const n=i+1, cs=cellsOf(tr);
      const critProto=cellParas(cs[1])[0];
      setCell(cs[0], [String(s[`ra${n}`]||'').trim()]);
      setCell(cs[1], lines(s[`cd${n}`]));
      const ev=String(s[`e${n}`]||'').split('\n').map(x=>x.trim()).filter(Boolean);
      const actName = ev[0] || evaRowsC[i]?.name || '';
      const items = ev.slice(1).map(cleanItem);
      const nameProto=cellParas(cs[2])[0];
      const nameRPr=setBold(protoRPr(nameProto),true);
      const itemRPr=protoRPr(critProto);
      setCell(cs[2], actName?[actName,...items]:[], {
        protoFor:j=>j===0?nameProto:critProto,
        rprFor:j=>j===0?nameRPr:itemRPr });
    });
  }

  // 6. Contenidos temáticos
  const hTem = find(/^contenidos?\s+tem[aá]ticos?$/i);
  if (hTem){
    const old = between(hTem, /^metodolog[ií]a de ense/i);
    const modProto = old.find(p=>/^m[oó]dulo\s+\d/i.test(pText(p)));
    const subProto = old.find(p=>p!==modProto && wEls(p,'numPr').length);
    const mods = splitModulos(s.modulos||'');
    if (modProto && subProto && mods.length){
      const mp=modProto.cloneNode(true), sp=subProto.cloneNode(true);
      const mrp=protoRPr(modProto), srp=protoRPr(subProto);
      const ref=old[0];
      mods.forEach(m=>{
        body.insertBefore(clonePara(mp, m.name, mrp), ref);
        let last=null; m.subtemas.forEach(x=>{ last=clonePara(sp, x, srp); body.insertBefore(last, ref); });
        if (last) spaceAfter(last, '200');   // espacio después del último subtema de cada módulo
      });
      old.forEach(p=>p.parentNode.removeChild(p));
    }
  }

  // 7. Metodologías y estrategias (listas con su viñeta de plantilla)
  const fillListAfter = (introRe, texts)=>{
    const intro=find(introRe); if(!intro) return;
    const ph=after(intro); if(!ph || ph.localName!=='p') return;
    const parent=ph.parentNode; const nextNode=after(ph);
    replaceParas(ph, [ph], texts);
    // Los nuevos párrafos quedan entre intro y nextNode: sin espacio entre ellos
    const items=[]; let n=after(intro); while(n && n!==nextNode){ if(n.localName==='p') items.push(n); n=after(n); }
    items.slice(0,-1).forEach(noSpaceAfter);
  };
  if (prog){
    fillListAfter(/^en el presente curso, se utilizan/i, lines(s.metodologias));
    fillListAfter(/^las estrategias de aprendizaje que se emplean/i, lines(s.estrategias));
    // Tipos de evaluación
    const tipos={}; String(s.eva_tipo||'').split('\n').forEach(l=>{ const m=l.match(/^evaluaci[oó]n\s+(diagn[oó]stica|formativa|sumativa)\s*:\s*(.*)$/i); if(m) tipos[m[1].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')]=m[2].trim(); });
    [['diagnostica',/^evaluaci[oó]n diagn[oó]stica:?$/i],['formativa',/^evaluaci[oó]n formativa:?$/i],['sumativa',/^evaluaci[oó]n sumativa:?$/i]].forEach(([k,re])=>{
      const p=find(re); if(!p||!tipos[k]) return;
      const label=pText(p).replace(/:?$/,':');
      fillPara(p, [{text:label,bold:true},{text:' '+tipos[k],bold:false}]);
    });
  }

  // 8. Tabla de estrategias de evaluación
  const evaRows = parseEvaTablaText(s.eva_tabla||'');
  const notas = safeJSON(s._notas_eva||'[]',[]);
  const tEva = tables.find(t=>/estrategias?\s+de\s+evaluaci[oó]n/i.test(wText(cellsOf(rowsOf(t)[0])[0])) && /porcentaje/i.test(wText(rowsOf(t)[0])));
  if (tEva && evaRows.length){
    const rs=rowsOf(tEva); const totalRow=rs[rs.length-1]; const body1=rs.slice(1,-1); const proto=body1[0].cloneNode(true);
    body1.forEach(r=>r.parentNode.removeChild(r));
    evaRows.forEach(r=>{
      const tr=proto.cloneNode(true); const cs=cellsOf(tr);
      const nota = !prog ? (notas.find(x=>(x.nombre||'').toLowerCase()===r.name.toLowerCase())?.nota||'') : '';
      setCell(cs[0], [`${r.name} (${r.count||1})${nota?` (${nota})`:''}`]);
      setCell(cs[1], [`${r.pct}%`]);
      totalRow.parentNode.insertBefore(tr, totalRow);
    });
    setCell(cellsOf(totalRow)[1], [`${evaRows.reduce((t,r)=>t+r.pct,0)}%`]);
  }
  if (tEva) tableFmtAll(tEva, '24');

  // 9. Descripción de cada actividad + rúbrica
  const rub = safeJSON(s._rubricas||'[]',[]);
  const tRubs = tables.filter(t=>/^criterios de desempe/i.test(wText(cellsOf(rowsOf(t)[0])[0]).trim()) && cellsOf(rowsOf(t)[0]).length>=5);
  tRubs.forEach((t,i)=>{
    const n=i+1; const r=evaRows[i];
    let prev=t.previousSibling; while(prev && prev.nodeType!==1) prev=prev.previousSibling;
    const name = r?.name || (String(s[`e${n}`]||'').split('\n')[0]||'').trim();
    if (prev && prev.localName==='p'){
      const desc = prog ? String(s[`eva_desc${n}`]||'').trim().replace(new RegExp('^'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*(\\([^)]*\\))?\\.?\\s*','i'),'')
        .replace(/\s*Esta (estrategia|actividad) de evaluaci[oó]n utiliza la siguiente r[uú]brica:?\s*$/i,'') : '';
      const sp = splitSoftLine(desc);
      // Un solo párrafo: descripción + "requiere el uso de aplicaciones como…" + "utiliza la siguiente rúbrica:"
      const tail = [sp.main, sp.soft, 'Esta estrategia de evaluación utiliza la siguiente rúbrica:'].filter(Boolean).join(' ');
      fillPara(prev, [{text:`${name} (${distLabel(r, s)}).`,bold:true},{text:' '+tail,bold:false}]);
    }
    const crit = lines(s[`cd${n}`]);
    const rr = (rub.find(x=>(x.nombre||'').toLowerCase()===name.toLowerCase()) || rub[i] || {}).rubrica || [];
    const rs=rowsOf(t); const head=rs[0]; const totalRow=rs[rs.length-2]; const retro=rs[rs.length-1];
    const critRows=rs.slice(1,-2); const proto=critRows[0].cloneNode(true);
    critRows.forEach(x=>x.parentNode.removeChild(x));
    const nCrit = Math.max(crit.length, rr.length) || 1;
    for (let k=0;k<nCrit;k++){
      const tr=proto.cloneNode(true); const cs=cellsOf(tr);
      if (prog){
        const rk=rr[k]||{};
        setCell(cs[0], [rk.titulo || rk.criterio || crit[k] || '']);
        const lv = rubricLevelsFor(rk, crit[k], k);
        for (let j=1;j<=4 && j<cs.length;j++) setCell(cs[j], [ lv[j-1]||'' ]);
      } else {
        cs.forEach(tc=>setCell(tc,['']));
      }
      totalRow.parentNode.insertBefore(tr, totalRow);
    }
    const tc0=cellsOf(totalRow)[0]; fillPara(cellParas(tc0)[0], `Total de puntos: ${nCrit*4}`);
  });

  // 10. Recursos y bibliografía
  if (prog){
    const intro=find(/^para promover el aprendizaje de los estudiantes/i);
    const ph=intro && after(intro);
    if (ph && ph.localName==='p' && !pText(ph)) replaceParas(ph,[ph], lines(s.recursos).filter(t=>!RECURSOS_FIJOS_RE.test(t)));
    // Recursos institucionales (aulas, laboratorios y eLibro): si Claude no escribió la versión adaptada al curso, se usa el texto fijo antes de la biblioteca
    const bib=find(/^la biblioteca de la universidad/i);
    if (bib){
      const rp=protoRPr(bib);
      RECURSOS_FIJOS.forEach(r=>{ if(!find(r.re)) bib.parentNode.insertBefore(clonePara(bib, r.texto, rp), bib); });
    }
    const fillAfterLabel=(re, texts)=>{ const lab=find(re); const ph=lab&&after(lab); if(ph&&ph.localName==='p'&&!pText(ph)) replaceParas(ph,[ph],texts); };
    const orTBD=t=>{ const l=lines(t); return l.length?l:['[TBD]']; };
    fillAfterLabel(/^bibliograf[ií]a obligatoria$/i, orTBD(s.biblio_ob));
    fillAfterLabel(/^bibliograf[ií]a complementaria$/i, orTBD(s.biblio_co));
  }

  // 11. Cronograma (sesiones 1 a 14)
  const tCron = tables.find(t=>/^sesi[oó]n$/i.test(wText(cellsOf(rowsOf(t)[0])[0]).trim()));
  if (tCron){
    const rs=rowsOf(tCron);
    const sch = prog ? safeJSON(s.cronograma||'{}',{}) : {};
    const mods = splitModulos(s.modulos||'');
    const modKey = k => { const d=sch[k]||{}; return String(d.mod||d.modName||''); };
    const modProtoAll = (cellParas(cellsOf(rs[1])[1])[0]).cloneNode(true);
    for (let k=1;k<=14 && k<rs.length;k++){
      const cs=cellsOf(rs[k]); if(cs.length<3) continue;
      const d=sch[k]||{};
      if (!prog){
        // Ficha: la columna de módulo queda exactamente como en la plantilla
        const ps=cellParas(cs[2]); const fixedN = k===1?5:2;
        const fixed=ps.slice(0,fixedN).map(p=>pText(p)).filter(Boolean);
        setCell(cs[2], fixed, { protoPara:ps[0] });
        continue;
      }
      // Columna de módulo con fusión vertical por módulo
      const tcPr=wChild(cs[1],'tcPr')||cs[1].insertBefore(wEl(doc,'tcPr'),cs[1].firstChild);
      const vm=wChild(tcPr,'vMerge'); if(vm) tcPr.removeChild(vm);
      const key=modKey(k), prevKey=k>1?modKey(k-1):null, nextKey=k<14?modKey(k+1):null;
      const modProto=modProtoAll;
      const emptyP=stripNum(modProto.cloneNode(true));
      const vmAt = ()=>{ let n=tcPr.firstChild; while(n && ['cnfStyle','tcW','gridSpan','hMerge'].includes(n.localName)) n=n.nextSibling; return n; };
      if (key && key===prevKey){
        const v=wEl(doc,'vMerge'); tcPr.insertBefore(v, vmAt());
        setCell(cs[1], [''], {protoPara:emptyP});
      } else {
        if (key && key===nextKey){ const v=wEl(doc,'vMerge'); wAttr(v,'val','restart'); tcPr.insertBefore(v, vmAt()); }
        const mi=parseInt(d.mod)||0;
        const keyName = t => stripModPrefix(String(t||'')).toLowerCase().replace(/\s+/g,' ').trim();
        const numIn = t => { const x=String(t||'').match(/m[oó]dulo\s+(\d+)/i); return x?parseInt(x[1]):0; };
        const m = mi ? mods[mi-1] : (mods.find(x=>keyName(x.name)===keyName(d.modName||d.mod)) || mods[numIn(d.modName||d.mod)-1]);
        const modName = (m?m.name:'') || d.modName || (mi?'':String(d.mod||''));
        // Solo el nombre del módulo: los subtemas ya no van en el cronograma (observación del revisor)
        if (modName){
          const titleP=stripNum(modProto.cloneNode(true));
          setCell(cs[1], [modName], { protoFor:()=>titleP, rprFor:()=>setBold(protoRPr(modProto), true) });
        } else setCell(cs[1], [''], {protoPara:emptyP});
      }
      // Actividades: líneas fijas de la plantilla + líneas propias de la sesión
      const ps=cellParas(cs[2]); const fixedN = k===1?5:2;
      const fixed=ps.slice(0,fixedN).map(p=>pText(p)).filter(Boolean);
      // La sesión 1 queda solo con las líneas fijas: la plantilla ya trae la inducción estudiantil
      const own = k===1 ? [] : String(d.note||'').split('\n').map(cleanItem).filter(Boolean);
      const proto=ps[0];
      setCell(cs[2], [...fixed, ...own], { protoPara:proto, segs:(t,j)=> j<fixed.length ? t : labelSegs(t) });
    }
  }

  // Títulos numerados vacíos (dejaban un "10." en blanco entre Bibliografía y Cronograma)
  wEls(body,'p').filter(p=>{
    const st=wEls(p,'pStyle')[0]; const sv=st&&(st.getAttribute('w:val')||'');
    return /^(Heading|Ttulo|Titulo)/i.test(sv) && wEls(p,'numPr').length && !pText(p).trim();
  }).forEach(p=>p.parentNode&&p.parentNode.removeChild(p));
  if (opts.highlight && opts.highlight.length) highlightPieces(body, opts.highlight);
  if (opts.returnDoc) return { zip, doc };
  const out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + new XMLSerializer().serializeToString(doc).replace(/^<\?xml[^>]*\?>\s*/,'');
  zip.file('word/document.xml', out);
  return zip.generateAsync({type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression:'DEFLATE'});
}
