/* Descarga en Word con la plantilla institucional */
/* ══════════════════════════════════════════════════════
   DESCARGA EN WORD CON LA PLANTILLA INSTITUCIONAL
   Usa la plantilla .docx original incrustada abajo y solo
   reemplaza el contenido de sus espacios, clonando los
   párrafos y las filas que ya trae para conservar el formato.
══════════════════════════════════════════════════════ */
function b64ToBytes(b64){ const bin=atob(b64); const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u; }
function wEl(doc, tag){ return doc.createElementNS(W_NS, 'w:'+tag); }
function wAttr(el, name, val){ el.setAttributeNS(W_NS, 'w:'+name, val); }
function wChild(node, tag){ return Array.from(node.childNodes).find(n=>n.localName===tag)||null; }
function bodyBlocks(body){ return Array.from(body.childNodes).filter(n=>n.nodeType===1 && (n.localName==='p'||n.localName==='tbl')); }
function pText(p){ return wText(p).replace(/\s+/g,' ').trim(); }

// Quita marcas de revisión visuales de una propiedad de texto clonada
function cleanRPr(rPr){
  if(!rPr) return rPr;
  ['highlight','shd'].forEach(t=>Array.from(rPr.childNodes).filter(n=>n.localName===t).forEach(n=>rPr.removeChild(n)));
  return rPr;
}
function setBold(rPr, on){
  ['b','bCs'].forEach(t=>Array.from(rPr.childNodes).filter(n=>n.localName===t).forEach(n=>rPr.removeChild(n)));
  if(on){ ['b','bCs'].forEach(t=>{ const e=wEl(rPr.ownerDocument,t); wAttr(e,'val','1'); rPr.insertBefore(e, rPr.firstChild); }); }
  return rPr;
}
function protoRPr(p){
  const r = wEls(p,'r').find(r=>wChild(r,'t')) || wEls(p,'r')[0];
  const rp = r && wChild(r,'rPr');
  return rp ? cleanRPr(rp.cloneNode(true)) : wEl(p.ownerDocument,'rPr');
}
function makeRun(doc, rPrProto, text, bold){
  const r=wEl(doc,'r'); const rp=rPrProto.cloneNode(true);
  if(bold!==undefined) setBold(rp,bold);
  r.appendChild(rp);
  const t=wEl(doc,'t'); t.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve'); t.textContent=text; r.appendChild(t);
  return r;
}
// Reemplaza el contenido de un párrafo conservando su pPr. segs: [{text,bold}]
function fillPara(p, segs, rPrProto){
  const doc=p.ownerDocument; const rp = rPrProto || protoRPr(p);
  Array.from(p.childNodes).forEach(n=>{ if(n.localName!=='pPr') p.removeChild(n); });
  const pPr=wChild(p,'pPr'); if(pPr){ const prp=wChild(pPr,'rPr'); if(prp) cleanRPr(prp); }
  (typeof segs==='string'?[{text:segs}]:segs).forEach(s=>{ if(s.text) p.appendChild(makeRun(doc, rp, s.text, s.bold)); });
  return p;
}
function clonePara(proto, segs, rPrProto){ return fillPara(proto.cloneNode(true), segs, rPrProto || protoRPr(proto)); }
function stripNum(p){ const pPr=wChild(p,'pPr'); if(pPr){ const n=wChild(pPr,'numPr'); if(n) pPr.removeChild(n); const ind=wChild(pPr,'ind'); if(ind) pPr.removeChild(ind);} return p; }
// "Etiqueta: resto" → negrita hasta los dos puntos
function labelSegs(line){
  const m=String(line).match(/^([^:]{2,90}:)\s*(.*)$/);
  return m ? [{text:m[1],bold:true},{text:m[2]?' '+m[2]:'',bold:false}] : [{text:line,bold:false}];
}
// Sustituye una lista de párrafos (desde proto) por textos nuevos
function replaceParas(protoPara, oldParas, texts, mapSegs){
  const parent=protoPara.parentNode; const rp=protoRPr(protoPara);
  if(!texts.length){ oldParas.slice(1).forEach(p=>p.parentNode&&p.parentNode.removeChild(p)); fillPara(oldParas[0]||protoPara, '', rp); return; }
  const anchor=oldParas[0]||protoPara;
  texts.forEach(t=>parent.insertBefore(clonePara(protoPara, mapSegs?mapSegs(t):t, rp), anchor));
  oldParas.forEach(p=>p.parentNode&&p.parentNode.removeChild(p));
}
function cellParas(tc){ return wKids(tc,'p'); }
// Texto de tablas: Arial 10, interlineado 1.15
const RPR_AFTER_SZ = ['highlight','u','effect','bdr','shd','fitText','vertAlign','rtl','cs','em','lang','eastAsianLayout','specVanish','oMath'];
const PPR_AFTER_SPACING = ['ind','contextualSpacing','mirrorIndents','suppressOverlap','jc','textDirection','textAlignment','textboxTightWrap','outlineLvl','divId','cnfStyle','rPr','sectPr','pPrChange'];
function tableRPr(rPr, sz='20'){
  const doc=rPr.ownerDocument;
  Array.from(rPr.childNodes).filter(n=>['rFonts','sz','szCs'].includes(n.localName)).forEach(n=>rPr.removeChild(n));
  const f=wEl(doc,'rFonts'); ['ascii','hAnsi','cs','eastAsia'].forEach(a=>wAttr(f,a,'Arial'));
  const st=wChild(rPr,'rStyle'); rPr.insertBefore(f, st?st.nextSibling:rPr.firstChild);
  const ref=Array.from(rPr.childNodes).find(n=>RPR_AFTER_SZ.includes(n.localName))||null;
  ['sz','szCs'].forEach(t=>{ const e=wEl(doc,t); wAttr(e,'val',sz); rPr.insertBefore(e, ref); });
  return rPr;
}
function tableFmt(p, sz='20'){
  const doc=p.ownerDocument;
  let pPr=wChild(p,'pPr'); if(!pPr){ pPr=wEl(doc,'pPr'); p.insertBefore(pPr,p.firstChild); }
  let sp=wChild(pPr,'spacing');
  if(!sp){ sp=wEl(doc,'spacing'); const ref=Array.from(pPr.childNodes).find(n=>PPR_AFTER_SPACING.includes(n.localName))||null; pPr.insertBefore(sp,ref); }
  wAttr(sp,'line','276'); wAttr(sp,'lineRule','auto');
  let mrp=wChild(pPr,'rPr'); if(!mrp){ mrp=wEl(doc,'rPr'); const ref=Array.from(pPr.childNodes).find(n=>['sectPr','pPrChange'].includes(n.localName))||null; pPr.insertBefore(mrp,ref); }
  tableRPr(mrp, sz);
  wKids(p,'r').forEach(r=>{ let rp=wChild(r,'rPr'); if(!rp){ rp=wEl(doc,'rPr'); r.insertBefore(rp,r.firstChild);} tableRPr(rp, sz); });
  return p;
}
// Tablas que van en Arial 12 (datos generales y estrategias de evaluación)
function tableFmtAll(tbl, sz){ wEls(tbl,'p').forEach(p=>tableFmt(p, sz)); }
// Párrafos de lista sin espacio después (el último conserva el de la plantilla)
function spaceAfter(p, val){
  const doc=p.ownerDocument;
  let pPr=wChild(p,'pPr'); if(!pPr){ pPr=wEl(doc,'pPr'); p.insertBefore(pPr,p.firstChild); }
  let sp=wChild(pPr,'spacing');
  if(!sp){ sp=wEl(doc,'spacing'); const ref=Array.from(pPr.childNodes).find(n=>PPR_AFTER_SPACING.includes(n.localName))||null; pPr.insertBefore(sp,ref); }
  wAttr(sp,'after',val);
  let cs=wChild(pPr,'contextualSpacing'); if(cs) pPr.removeChild(cs);
}
function noSpaceAfter(p){
  const doc=p.ownerDocument;
  let pPr=wChild(p,'pPr'); if(!pPr){ pPr=wEl(doc,'pPr'); p.insertBefore(pPr,p.firstChild); }
  let sp=wChild(pPr,'spacing');
  if(!sp){ sp=wEl(doc,'spacing'); const ref=Array.from(pPr.childNodes).find(n=>PPR_AFTER_SPACING.includes(n.localName))||null; pPr.insertBefore(sp,ref); }
  wAttr(sp,'after','0');
  let cs=wChild(pPr,'contextualSpacing'); if(cs) pPr.removeChild(cs);
}
function setCell(tc, texts, opts={}){
  const ps=cellParas(tc); const proto=(opts.protoPara||ps[0]).cloneNode(true);
  const rp=protoRPr(opts.protoPara||ps[0]);
  ps.forEach(p=>tc.removeChild(p));
  const list=texts.length?texts:[''];
  list.forEach((t,i)=>{
    const segs = opts.segs ? opts.segs(t,i) : t;
    const pr = (opts.protoFor && opts.protoFor(i)) || proto;
    tc.appendChild(tableFmt(clonePara(pr, segs, opts.rprFor?opts.rprFor(i):rp)));
  });
}
function rowsOf(tbl){ return wKids(tbl,'tr'); }
function cellsOf(tr){ return wKids(tr,'tc'); }
function lines(t){ return String(t||'').split('\n').map(cleanItem).filter(Boolean); }
function femenino(name){ const w=String(name||'').trim().split(/\s+/)[0].toLowerCase(); return /(a|as|ción|ciones|dad|dades|sis)$/.test(w); }
function distLabel(r, saved){
  if(!r) return '';
  const n=r.count||1;
  if(n<=1 || r.pct % n) return `${r.pct}%`;            // 50 % en 3 avances: no se reparte igual
  // Si el cronograma trae porcentajes distintos por entrega (15, 15 y 20), solo el total
  const sch=safeJSON((saved||currentSaved()).cronograma||'{}',{});
  const nm=normTxt(r.name); const pcts=[];
  Object.values(sch).forEach(d=>String(d?.note||'').split('\n').forEach(l=>{ const m=l.match(/^(.+?)\s*\((\d+)\s*%\)/); if(m && normTxt(m[1])===nm) pcts.push(+m[2]); }));
  if (pcts.length && new Set(pcts).size>1) return `${r.pct}%`;
  return `${r.pct}%, ${r.pct/n}% cada ${femenino(r.name)?'una':'uno'}`;
}

// Requisitos: "SOFT-200, SOFT-201" → un curso por línea con su código y nombre completo
// Rasgos del perfil por grupo de cursos (los cursos afines comparten los mismos rasgos)
