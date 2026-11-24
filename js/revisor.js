/* Comentarios del revisor */
/* ══════════════════════════════════════════════════════
   COMENTARIOS DEL REVISOR
   Lee los comentarios de un Word revisado, los ubica en su sección,
   arma el prompt de corrección y aplica la sección corregida.
   La versión revisada queda como base para resaltar en amarillo
   lo que cambió al descargar el Word.
══════════════════════════════════════════════════════ */
let revData=null;
const REV_SKILL = id => /^descripcion/.test(id)?'pc-descripcion' : id==='competencia'?'pc-competencia' : /^(ra|cd|e)\d$/.test(id)?'pc-cuadro-competencia' : id==='modulos'?'pc-inicio' : id==='metodologias'?'pc-metodologias' : /^(estrategias|eva_|_rubricas)/.test(id)?'pc-estrategias-evaluacion' : id==='recursos'?'pc-recursos-didacticos' : 'pc-programa-completo';
const REV_HEAD_LBL = [
  [/^descripci[oó]n del curso/i,'Descripción del curso'],[/^cuadro de competencia/i,'Cuadro de competencia'],[/^contenidos? tem/i,'Contenidos temáticos'],
  [/^metodolog/i,'Metodologías'],[/^estrategias de aprendizaje/i,'Estrategias de aprendizaje'],[/^sistema de evaluaci/i,'Sistema de evaluación'],
  [/^recursos did/i,'Recursos didácticos'],[/^bibliograf/i,'Bibliografía'],[/^cronograma/i,'Cronograma']];
function revKey(kind){ return `dcd_${kind}_${currentProject?.sheetId||''}_${currentCourse?.['Código']||''}`; }
function revBase(){ return safeJSON(localStorage.getItem(revKey('revbase'))||'null', null); }
function revSecMeta(id){
  const s=ALL_SECS.find(x=>x.id===id); if(s) return {label:s.label, icon:s.icon};
  return {label:id, icon:'💬'};
}
function openRevision(){
  if(!currentCourse||!currentProject){ toast('Abrí un curso primero','error'); return; }
  if(!revData || revData.code!==currentCourse['Código']) revData=safeJSON(localStorage.getItem(revKey('rev'))||'null',null);
  if(revData){ document.getElementById('modal-revision').classList.add('active'); renderRevision(); }
  else document.getElementById('rev-file-input').click();
}
function closeRevision(){ document.getElementById('modal-revision')?.classList.remove('active'); }
async function loadRevisionFile(input){
  const file=input.files[0]; input.value=''; if(!file) return;
  try{
    if(!window.JSZip) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
    const zip=await JSZip.loadAsync(await file.arrayBuffer());
    const docXml=await zip.file('word/document.xml')?.async('string');
    if(!docXml) throw new Error('el archivo no parece un .docx válido');
    const cXml=await zip.file('word/comments.xml')?.async('string');
    if(!cXml){ toast('Este Word no tiene comentarios del revisor','error'); return; }
    const d=parseFichaDocx(docXml);
    const code=currentCourse['Código']||'';
    if(d.codigo && code && normCode(d.codigo)!==normCode(code) && !confirm(`El Word es de ${d.codigo}, pero tenés abierto ${code}. ¿Usarlo igual?`)) return;
    revData=parseRevision(docXml, cXml, file.name, fichaDocxToItems(d));
    try{ localStorage.setItem(revKey('rev'), JSON.stringify(revData)); }catch(e){}
    document.getElementById('modal-revision').classList.add('active');
    renderRevision();
  }catch(e){ toast('No se pudo leer el Word: '+e.message,'error'); }
}
function parseRevision(docXml, cXml, fileName, items){
  const P=new DOMParser();
  const cdoc=P.parseFromString(cXml,'text/xml');
  const cm={}; const order=[];
  wEls(cdoc,'comment').forEach(c=>{
    const id=c.getAttributeNS(W_NS,'id'); if(id==null) return;
    cm[id]={id, author:c.getAttributeNS(W_NS,'author')||'', date:(c.getAttributeNS(W_NS,'date')||'').slice(0,10), text:wParas(c).join('\n'), anchor:'', context:'', heading:'', offset:-1};
  });
  const doc=P.parseFromString(docXml,'text/xml'); const body=wEls(doc,'body')[0];
  const active=new Set(); let heading='';
  wEls(body,'p').forEach(p=>{
    const praw=wText(p); const ptxt=praw.replace(/\s+/g,' ').trim(); let pos=0;
    if(p.parentNode===body && ptxt.length<80){ const h=REV_HEAD_LBL.find(([re])=>re.test(ptxt)); if(h) heading=h[1]; }
    const walk=n=>{
      for(const ch of Array.from(n.childNodes)){
        if(ch.nodeType!==1) continue;
        const ln=ch.localName; const id=ch.getAttributeNS?ch.getAttributeNS(W_NS,'id'):null;
        if(ln==='commentRangeStart' && cm[id]){ active.add(id); if(!order.includes(id)) order.push(id); if(!cm[id].context){ cm[id].context=praw; cm[id].offset=pos; cm[id].heading=heading; } }
        else if(ln==='commentRangeEnd') active.delete(id);
        else if(ln==='commentReference' && cm[id]){ if(!order.includes(id)) order.push(id); if(!cm[id].context){ cm[id].context=praw; cm[id].offset=pos; cm[id].heading=heading; } }
        else if(ln==='t'){ const t=ch.textContent; pos+=t.length; active.forEach(a=>{ cm[a].anchor+=t; }); }
        else if(ln!=='pPr' && ln!=='rPr') walk(ch);
      }
    };
    walk(p);
    active.forEach(a=>{ if(cm[a].anchor && !/\s$/.test(cm[a].anchor)) cm[a].anchor+=' '; });
  });
  Object.keys(cm).forEach(id=>{ if(!order.includes(id)) order.push(id); });
  // Ubicar cada comentario en su sección
  const cands=(items||[]).filter(it=>it.secId && !/^_notas/.test(it.secId));
  const prim=cands.filter(it=>!it.secId.startsWith('_')), sec2=cands.filter(it=>it.secId.startsWith('_'));
  const inV=(it,x)=>x && normTxt(it.value).includes(x);
  // Por posición: qué sección ocupa el punto exacto del comentario dentro del párrafo
  const byOffset=(c,list)=>{
    if(c.offset<0 || !c.context) return null;
    const spans=[];
    list.forEach(it=>{
      let strs=[String(it.value)]; const j=/^[\[{]/.test(strs[0].trim())?safeJSON(strs[0],null):null;
      if(j){ strs=[]; const w=x=>{ if(typeof x==='string') strs.push(x); else if(x&&typeof x==='object') Object.values(x).forEach(w); }; w(j); }
      strs.flatMap(x=>x.split('\n')).map(cleanItem).filter(l=>l.length>=8).forEach(l=>{
        const key=l.slice(0,50); let i=c.context.indexOf(key);
        while(i>=0){ spans.push({it, a:i, b:i+l.length}); i=c.context.indexOf(key,i+1); }
      });
    });
    if(!spans.length) return null;
    // En el párrafo de una actividad de evaluación, el comentario es de su descripción
    const ev=spans.find(x=>/^eva_desc/.test(x.it.secId)); if(ev) return ev.it;
    const inside=spans.filter(x=>c.offset>=x.a && c.offset<x.b).sort((x,y)=>(x.b-x.a)-(y.b-y.a));
    if(inside.length) return inside[0].it;
    const near=spans.slice().sort((x,y)=>Math.min(Math.abs(c.offset-x.a),Math.abs(c.offset-x.b))-Math.min(Math.abs(c.offset-y.a),Math.abs(c.offset-y.b)));
    return near[0].it;
  };
  const locate=c=>{
    const o=byOffset(c,prim) || byOffset(c,sec2); if(o) return o;
    const a=normTxt(c.anchor), ctx=normTxt(c.context);
    const pick=list=>{
      const hits=list.filter(it=>a.length>=3 && inV(it,a));
      if(hits.length>1 && ctx){ const best=hits.find(it=>{ const v=normTxt(it.value); return ctx.includes(v.slice(0,60)) || v.includes(ctx.slice(0,60)); }); if(best) return best; }
      if(hits.length) return hits[0];
      if(ctx.length>=12) return list.find(it=>inV(it,ctx.slice(0,80)));
      return null;
    };
    return pick(prim) || pick(sec2);
  };
  const groups={}; const gOrder=[];
  order.forEach(id=>{
    const c=cm[id]; if(!c || !c.text.trim()) return;
    c.anchor=c.anchor.replace(/\s+/g,' ').trim();
    const it=locate(c);
    let key, secId=null, label, icon;
    if(it){ secId=it.secId; key=secId; ({label,icon}=revSecMeta(secId)); }
    else { key='h:'+(c.heading||'Otra parte'); label=c.heading||'Otra parte del documento'; icon='💬'; }
    if(!groups[key]){ groups[key]={key, secId, label, icon, reviewed:it?it.value:'', comments:[]}; gOrder.push(key); }
    groups[key].comments.push({author:c.author, date:c.date, text:c.text.trim(), anchor:c.anchor, context:c.context, offset:c.offset, sentence:revSentence(c.context, c.offset)});
  });
  // Orden del índice del programa
  const pos=k=>{ const i=ALL_SECS.findIndex(s=>s.id===k); return i<0?999:i; };
  gOrder.sort((x,y)=>pos(x)-pos(y));
  const vm=String(fileName).match(/\(([A-Z]{2,4}\d+)\)\s*\.docx$/i);
  // Base para resaltar los cambios: lo que vio el revisor
  const base={};
  (items||[]).forEach(it=>{ if(it.secId) base[it.secId]=it.value; });
  const s=currentSaved(); ALL_SECS.forEach(x=>{ if(base[x.id]==null && s[x.id]) base[x.id]=s[x.id]; });
  if(base._rubricas==null && s._rubricas) base._rubricas=s._rubricas;
  try{ localStorage.setItem(revKey('revbase'), JSON.stringify({file:fileName, version:vm?vm[1].toUpperCase():'', date:new Date().toISOString().slice(0,10), values:base})); }catch(e){}
  return {code:currentCourse['Código']||'', file:fileName, version:vm?vm[1].toUpperCase():'', groups:gOrder.map(k=>groups[k]), done:{}};
}
// Oración del párrafo donde cae el comentario
function revSentence(txt, off){
  txt=String(txt||''); if(!txt) return '';
  if(off<0) return txt.slice(0,300);
  let a=0; const re=/[.!?:]\s+/g; let m;
  while((m=re.exec(txt)) && m.index+m[0].length<=off) a=m.index+m[0].length;
  re.lastIndex=Math.max(off,a); const n=re.exec(txt);
  return txt.slice(a, n?n.index+1:txt.length).trim();
}
function revCurrent(g){ const s=currentSaved(); return (g.secId && String(s[g.secId]||'').trim()) || g.reviewed || ''; }
function revIsJSON(g){ return g.secId==='cronograma' || g.secId==='_rubricas'; }
function revHighlight(c){
  const q=escHtml(c.context||'');
  if(c.context && c.offset>=0){
    const i=c.offset, L=Math.max(c.anchor.length,0);
    const a=Math.max(0,i-110), b=Math.min(c.context.length,i+L+110);
    const mid = L>=3 ? '<mark>'+escHtml(c.context.slice(i,i+L))+'</mark>' : '<mark>▼</mark>'+escHtml(c.context.slice(i,i+L));
    return (a>0?'…':'')+escHtml(c.context.slice(a,i))+mid+escHtml(c.context.slice(i+L,b))+(b<c.context.length?'…':'');
  }
  if(c.anchor && c.context && c.context.includes(c.anchor) && c.context.length>c.anchor.length+10){
    const i=c.context.indexOf(c.anchor); const a=Math.max(0,i-90), b=Math.min(c.context.length,i+c.anchor.length+90);
    return (a>0?'…':'')+escHtml(c.context.slice(a,i))+'<mark>'+escHtml(c.anchor)+'</mark>'+escHtml(c.context.slice(i+c.anchor.length,b))+(b<c.context.length?'…':'');
  }
  return c.anchor?'<mark>'+escHtml(c.anchor)+'</mark>':q.slice(0,240);
}
function renderRevision(){
  const total=revData.groups.reduce((t,g)=>t+g.comments.length,0);
  const authors=[...new Set(revData.groups.flatMap(g=>g.comments.map(c=>c.author)).filter(Boolean))];
  const nDone=revData.groups.filter(g=>revData.done[g.key]).length;
  document.getElementById('rev-top').innerHTML=`<span><b>${escHtml(revData.file)}</b></span><span>· ${total} comentario${total===1?'':'s'}${authors.length?' de '+escHtml(authors.join(', ')):''}</span><span>· ${revData.groups.length} parte${revData.groups.length===1?'':'s'} del programa</span><span>· ${nDone} corregida${nDone===1?'':'s'}</span>`;
  const list=document.getElementById('rev-list');
  list.innerHTML=revData.groups.map((g,i)=>`
    <div class="rev-card${revData.done[g.key]?' done':''}">
      <div class="rev-head"><span>${g.icon}</span><span class="rev-sec">${escHtml(g.label)}</span><span class="rev-cnt">${g.comments.length} comentario${g.comments.length===1?'':'s'}${revData.done[g.key]?' · ✓ corregida':''}</span>
        ${g.secId?`<button class="btn btn-quiet btn-xs" onclick="revGoTo(${i})">Ver sección</button>`:''}</div>
      ${g.comments.map(c=>`<div class="rev-c"><div class="rev-q">${revHighlight(c)}</div><div class="rev-t">${escHtml(c.text)}</div><div class="rev-a">${escHtml(c.author)}${c.date?' · '+c.date:''}</div></div>`).join('')}
      <div class="rev-acts">
        <button class="btn btn-ghost btn-xs" onclick="revCopyPrompt(${i},false)"><span class="ic" aria-hidden="true">⎘</span> Copiar prompt de corrección</button>
        <button class="btn btn-ghost btn-xs" onclick="revCopyPrompt(${i},true)">Copiar y abrir Claude</button>
      </div>
      ${g.secId?`<textarea id="rev-ta-${i}" placeholder="Pegá aquí la respuesta de Claude (la app toma el bloque con la sección corregida)"></textarea>
      <div class="rev-apply"><button class="btn btn-primary btn-xs" onclick="revApply(${i})"><span class="ic" aria-hidden="true">✓</span> Aplicar a ${escHtml(g.label)}</button></div>`
      :`<div class="rev-a">Este comentario no cae en una sección editable (por ejemplo, datos generales o temáticas). Usá el prompt y corregilo donde corresponda.</div>`}
    </div>`).join('') || '<div class="rub-empty">El Word no tiene comentarios.</div>';
}
function revGoTo(i){
  const g=revData.groups[i]; const sec=ALL_SECS.find(s=>s.id===g.secId); if(!sec) return;
  closeRevision();
  const pill=Array.from(document.querySelectorAll('.spill')).find(p=>p.textContent.includes(sec.label));
  openSection(sec,pill);
}
function revCourseContext(){
  const s=currentSaved(); const out=[];
  if(s.competencia) out.push(`- Competencia: ${s.competencia.trim()}`);
  [1,2,3].forEach(n=>{ const nm=rubActName(s,n); if(s[`ra${n}`]) out.push(`- Actividad ${n} (${nm}). RA: ${s[`ra${n}`].trim()}`); });
  return out.join('\n');
}
function revObsText(g){
  return g.comments.map((c,k)=>{
    const sent=c.sentence||'';
    const where = c.anchor.length>=4 ? `Sobre «${c.anchor}»` : (sent ? `Sobre la oración «${sent}»` : 'Sobre esta parte');
    const ctx = (c.anchor.length>=4 && c.anchor.length<40 && sent && sent!==c.anchor) ? `\n   (en la oración: «${sent}»)` : '';
    return `${k+1}. ${where}: ${c.text}${ctx}`;
  }).join('\n');
}
function revPrompt(g){
  const c=currentCourse; const code=c['Código']||''; const name=c['Curso']||c['Nombre']||'';
  const ver=revData.version?` (versión ${revData.version})`:'';
  const cur=revCurrent(g);
  const fmt = g.secId==='cronograma'
    ? 'Devolvé el cronograma corregido en un solo bloque ```json con exactamente la misma estructura del texto actual.'
    : g.secId==='_rubricas'
    ? 'Devolvé las rúbricas corregidas en un solo bloque ```json con la misma estructura del texto actual. Cada nivel es el criterio de desempeño textual + "de manera" + un adjetivo (niveles 1 y 4 antónimos del mismo par; 2 básica, incipiente o limitada; 3 aceptable, regular o parcial).'
    : 'Devolvé la sección completa ya corregida en un solo bloque ```text, con el mismo formato del texto actual (una línea por elemento, sin viñetas ni numeración).';
  return `Usá la skill pc-correcciones, junto con la skill ${g.secId?REV_SKILL(g.secId):'pc-programa-completo'}, para corregir ${g.secId?`la sección "${g.label}"`:`la parte "${g.label}"`} del programa de curso ${code} ${name}${ver}, según las observaciones del revisor.

${g.secId?'TEXTO ACTUAL DE LA SECCIÓN':'TEXTO DONDE ESTÁN LOS COMENTARIOS'}
${g.secId?cur:[...new Set(g.comments.map(x=>x.sentence||x.context).filter(Boolean))].join('\n')}

OBSERVACIONES DEL REVISOR
${revObsText(g)}

CONTEXTO DEL CURSO (para mantener la coherencia)
${revCourseContext()}

INSTRUCCIONES DE ENTREGA
1. ${fmt}
2. Después del bloque, una tabla breve: observación → qué cambiaste.`;
}
function revCopyText(text, openAfter){
  const ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select();
  let ok=false; try{ ok=document.execCommand('copy'); }catch(e){}
  document.body.removeChild(ta);
  if(!ok && navigator.clipboard){ navigator.clipboard.writeText(text).catch(()=>{}); ok=true; }
  toast(ok?'✓ Prompt copiado. Pegalo en Claude (Ctrl+V)':'No se pudo copiar', ok?'success':'error');
  if(openAfter) window.open(getClaudeUrl(),'_blank','noopener');
}
function revCopyPrompt(i, openAfter){ revCopyText(revPrompt(revData.groups[i]), openAfter); }
function revExtract(text, json){
  const t=String(text||'').trim(); if(!t) return '';
  if(json){ const o=extractJSONBlock(t); return JSON.stringify(o); }
  const blocks=[...t.matchAll(/```[a-zA-Z]*\s*\n?([\s\S]*?)```/g)].map(m=>m[1].trim()).filter(Boolean);
  return (blocks.length?blocks[0]:t).split('\n').map(l=>l.trimEnd()).join('\n').trim();
}
function revApply(i){
  const g=revData.groups[i]; const ta=document.getElementById('rev-ta-'+i);
  let val; try{ val=revExtract(ta.value, revIsJSON(g)); }catch(e){ toast(e.message,'error'); return; }
  if(!val){ toast('Pegá primero la respuesta de Claude','error'); return; }
  if(g.secId==='_rubricas'){ const arr=safeJSON(val,null); if(!Array.isArray(arr)){ toast('Las rúbricas deben venir como una lista JSON','error'); return; } }
  setSavedValue(g.secId, val);
  revData.done[g.key]=true; try{ localStorage.setItem(revKey('rev'), JSON.stringify(revData)); }catch(e){}
  renderSecGrid(); updateProgress(); renderRevision();
  toast(`✓ "${g.label}" corregida. Al descargar el Word, lo nuevo sale resaltado en amarillo`,'success');
}
function revPromptAll(){
  const c=currentCourse; const code=c['Código']||''; const name=c['Curso']||c['Nombre']||'';
  const ver=revData.version?` (versión ${revData.version})`:'';
  const edit=revData.groups.filter(g=>g.secId && !revData.done[g.key]);
  const other=revData.groups.filter(g=>!g.secId);
  const secs=edit.map(g=>`### ${g.label} (seccion: "${g.secId}", skill ${REV_SKILL(g.secId)})
TEXTO ACTUAL
${revCurrent(g)}
OBSERVACIONES
${revObsText(g)}`).join('\n\n');
  const oth=other.length?`\n\nOTRAS OBSERVACIONES (no son de una sección editable; si afectan alguna de las anteriores, aplicalas ahí)\n${other.map(g=>`- ${g.label}: `+g.comments.map(x=>`${x.anchor?'«'+x.anchor+'» ':''}${x.text}`).join(' / ')).join('\n')}`:'';
  return `Usá la skill pc-correcciones, junto con la skill pc-* que se indica en cada sección, para corregir el programa de curso ${code} ${name}${ver} según las observaciones del revisor.

CONTEXTO DEL CURSO
${revCourseContext()}

SECCIONES CON OBSERVACIONES
${secs}${oth}

INSTRUCCIONES DE ENTREGA
1. Mostrame primero una tabla breve: sección → observación → qué cambiaste.
2. Al final, UN SOLO bloque \`\`\`json con esta estructura (la app lo importa): {"correcciones":[{"seccion":"id exacto de la sección","texto":"sección completa corregida, con el mismo formato del texto actual; una línea por elemento con \\n; el cronograma y las rúbricas como JSON en texto"}]}`;
}
function revImportAll(){
  const t=document.getElementById('rev-all-ta').value.trim();
  if(!t){ toast('Pegá primero la respuesta de Claude','error'); return; }
  let o; try{ o=extractJSONBlock(t); }catch(e){ toast(e.message,'error'); return; }
  const list=(o.correcciones||[]).filter(x=>x && x.seccion && x.texto!=null);
  if(!list.length){ toast('La respuesta no trae correcciones','error'); return; }
  const items=list.map(x=>{ const m=revSecMeta(x.seccion); const v=typeof x.texto==='string'?x.texto:JSON.stringify(x.texto); return {label:m.label, secId:x.seccion, value:v.trim(), icon:m.icon}; }).filter(it=>ALL_SECS.some(s=>s.id===it.secId)||it.secId==='_rubricas');
  list.forEach(x=>{ const g=revData.groups.find(g=>g.secId===x.seccion); if(g) revData.done[g.key]=true; });
  try{ localStorage.setItem(revKey('rev'), JSON.stringify(revData)); }catch(e){}
  closeRevision();
  renderReviewItems(items, `Correcciones de Claude según el revisor — revisá y aplicá cada sección (o "Aplicar todo")`);
}
function revForget(){
  if(!confirm('¿Quitar los comentarios cargados y la versión revisada? Ya no se resaltarán los cambios en el Word.')) return;
  try{ localStorage.removeItem(revKey('rev')); localStorage.removeItem(revKey('revbase')); }catch(e){}
  revData=null; closeRevision(); toast('Listo: se quitaron los comentarios');
}

/* ── Resaltado en amarillo de lo que cambió desde la versión revisada ── */
function revPieces(v){
  const str=String(v??''); let strs=[];
  const j=/^[\[{]/.test(str.trim()) ? safeJSON(str,null) : null;
  const walk=x=>{ if(x==null) return; if(typeof x==='string') strs.push(x); else if(Array.isArray(x)) x.forEach(walk); else if(typeof x==='object') Object.values(x).forEach(walk); };
  if(j) walk(j); else strs=[str];
  const out=[];
  strs.forEach(s0=>s0.split('\n').forEach(l=>{ cleanItem(l).split(/\s\|\s/).forEach(seg=>seg.split(/(?<=[.;:!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡"“«])/).forEach(x=>{ x=x.trim().replace(/[.;:]+$/,'').trim(); if(x.length>=12) out.push(x); })); }));
  return out;
}
function changedPieces(base, saved){
  const res=[]; const keys=new Set([...Object.keys(base||{}), ...ALL_SECS.map(s=>s.id)]);
  keys.forEach(k=>{
    if(k.startsWith('_') && k!=='_rubricas') return;
    const a=base?.[k], b=saved?.[k];
    if(b==null || !String(b).trim() || normTxt(a||'')===normTxt(b)) return;
    const old=new Set(revPieces(a||'').map(normTxt));
    revPieces(b).forEach(p=>{ if(!old.has(normTxt(p))) res.push(p); });
  });
  return [...new Set(res)].sort((x,y)=>y.length-x.length);
}
function revChangedKeys(base, saved){ return Object.keys(saved||{}).filter(k=>(!k.startsWith('_')||k==='_rubricas') && base && k in base && normTxt(base[k]||'')!==normTxt(saved[k]||'')); }
function setHighlight(r){
  const doc=r.ownerDocument; let rp=wChild(r,'rPr'); if(!rp){ rp=wEl(doc,'rPr'); r.insertBefore(rp,r.firstChild); }
  let h=wChild(rp,'highlight');
  if(!h){ h=wEl(doc,'highlight'); const ref=Array.from(rp.childNodes).find(n=>['u','effect','bdr','shd','fitText','vertAlign','rtl','cs','em','lang','eastAsianLayout','specVanish','oMath','rPrChange'].includes(n.localName))||null; rp.insertBefore(h,ref); }
  wAttr(h,'val','yellow');
}
function highlightPieces(root, pieces){
  if(!pieces.length) return 0; let count=0;
  wEls(root,'p').forEach(p=>{
    const runs=wEls(p,'r').filter(r=>wEls(r,'t').length);
    if(!runs.length) return;
    let full=''; const spans=[];
    runs.forEach(r=>{ const t=wEls(r,'t').map(x=>x.textContent).join(''); spans.push({r,s:full.length,e:full.length+t.length,t}); full+=t; });
    const rg=[];
    pieces.forEach(pc=>{ let i=full.indexOf(pc); while(i>=0){ rg.push([i,i+pc.length]); i=full.indexOf(pc,i+pc.length); } });
    if(!rg.length) return;
    rg.sort((a,b)=>a[0]-b[0]); const m=[];
    rg.forEach(x=>{ const l=m[m.length-1]; if(l && x[0]<=l[1]) l[1]=Math.max(l[1],x[1]); else m.push(x.slice()); });
    count+=m.length;
    const inR=(a,b)=>m.some(([x,y])=>a>=x&&b<=y);
    spans.forEach(sp=>{
      if(!m.some(([x,y])=>x<sp.e&&y>sp.s)) return;
      const simple=Array.from(sp.r.childNodes).filter(n=>n.nodeType===1).every(n=>n.localName==='rPr'||n.localName==='t') && wEls(sp.r,'t').length===1;
      const pts=[sp.s,sp.e]; m.forEach(([a,b])=>{ if(a>sp.s&&a<sp.e) pts.push(a); if(b>sp.s&&b<sp.e) pts.push(b); });
      const cuts=[...new Set(pts)].sort((a,b)=>a-b);
      if(cuts.length===2 || !simple){ setHighlight(sp.r); return; }
      for(let q=0;q<cuts.length-1;q++){
        const a=cuts[q], b=cuts[q+1]; const nr=sp.r.cloneNode(true); const tEl=wEls(nr,'t')[0];
        tEl.textContent=sp.t.slice(a-sp.s,b-sp.s); tEl.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');
        if(inR(a,b)) setHighlight(nr);
        sp.r.parentNode.insertBefore(nr, sp.r);
      }
      sp.r.parentNode.removeChild(sp.r);
    });
  });
  return count;
}
document.getElementById('modal-revision').addEventListener('click',e=>{if(e.target===e.currentTarget)closeRevision();});
document.getElementById('modal-revision').addEventListener('keydown',e=>{if(e.key==='Escape')closeRevision();});
