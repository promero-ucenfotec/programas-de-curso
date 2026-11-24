/* Lector estructurado de fichas CENFOTEC */
/* ══════════════════════════════════════════════════════
   LECTOR ESTRUCTURADO DE FICHAS (.docx, formato CENFOTEC)
   Lee las tablas del documento: datos generales, cuadro de
   competencia (RA, criterios, evidencias), temario y tabla
   de estrategias de evaluación con sus notas de diseño.
══════════════════════════════════════════════════════ */
const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
function wEls(node, tag){ return Array.from(node.getElementsByTagNameNS(W_NS, tag)); }
function wKids(node, tag){ return Array.from(node.childNodes).filter(n=>n.localName===tag); }
function wText(node){ return wEls(node,'t').map(t=>t.textContent).join(''); }
function wParas(node){ return wEls(node,'p').map(p=>wText(p).replace(/\s+/g,' ').trim()).filter(Boolean); }

async function readDocxXml(file){
  if (!window.JSZip) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const f = zip.file('word/document.xml');
  if (!f) throw new Error('El archivo no parece un .docx válido');
  return f.async('string');
}

function parseFichaDocx(xmlStr){
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
  const body = wEls(doc,'body')[0];
  const out = { datos:{}, cuadro:[], evaRows:[], mods:[] };
  if (!body) return out;
  const blocks = Array.from(body.childNodes).filter(n=>n.localName==='p'||n.localName==='tbl');

  blocks.forEach(b=>{
    if (b.localName!=='tbl') return;
    const rows = wKids(b,'tr').map(tr=>wKids(tr,'tc').map(tc=>wParas(tc)));
    if (!rows.length) return;
    const head = (rows[0][0]||[]).join(' ');

    // Encabezado institucional: Universidad / Escuela / Carrera
    if (/^universidad/i.test(wText(b).trim())){
      const ps = rows[0].flat();
      const iU = ps.findIndex(x=>/^universidad/i.test(x));
      if (iU>=0){ if(ps[iU+1]) out.datos._escuela = ps[iU+1]; if(ps[iU+2]) out.datos._carrera = ps[iU+2]; }
      return;
    }
    // Datos generales: filas de dos celdas, la primera es "Código"
    if (/^c[oó]digo$/i.test(head) && rows[0].length===2){
      rows.forEach(r=>{ if(r.length>=2 && r[0].length) out.datos[r[0].join(' ')] = r[1].join('\n'); });
      return;
    }
    // Cuadro de competencia
    if (/competencias?\s+gen[eé]ricas/i.test(head) || rows.some(r=>/competencia\s+espec[ií]fica/i.test((r[0]||[]).join(' ')))){
      let inRA = false;
      rows.forEach((r,i)=>{
        const first = (r[0]||[]).join(' ');
        if (r.length===1 && /^competencia\s+espec[ií]fica/i.test(first)){
          const nxt = rows[i+1]; if (nxt && nxt.length===1) out.competencia = (nxt[0]||[]).join(' ').trim();
        }
        if (r.length===1 && /^disposici[oó]n\s*:/i.test(first)) out.disposicion = first.replace(/^disposici[oó]n\s*:\s*/i,'').trim();
        if (r.length===1 && /^competencia\s+general/i.test(first)){
          const nxt = rows[i+1]; const v=(nxt&&nxt[0]||[]).join(' ').trim();
          if (v && !/^[áa]rea de conocimiento\.\s*competencia$/i.test(v)) out.competenciaGeneral = v;
        }
        if (r.length>=3 && /^resultados?\s+de\s+aprendizaje$/i.test(first.trim()) && /^criterios?\s+de\s+desempe/i.test((r[1]||[]).join(' ').trim())){ inRA = true; return; }
        if (inRA && r.length>=2 && first){
          const ev = r[2]||[];
          out.cuadro.push({ ra:first.trim(), criterios:(r[1]||[]).map(cleanItem).filter(Boolean),
            actividad:(ev[0]||'').trim(), evidencias:ev.slice(1).map(cleanItem).filter(Boolean) });
        }
      });
      return;
    }
    // Tabla de estrategias de evaluación
    if (/estrategias?\s+de\s+evaluaci[oó]n/i.test(head) && /porcentaje/i.test((rows[0][1]||[]).join(' '))){
      rows.slice(1).forEach(r=>{
        const name=(r[0]||[]).join(' ').trim(); const pctTxt=(r[1]||[]).join(' ');
        if (!name || /^total$/i.test(name)) return;
        const pm = pctTxt.match(/(\d+)\s*%/); if (!pm) return;
        const m = name.match(/^(.+?)\s*\((\d+)\)\s*(.*)$/);
        let nm=name, count=1, nota='';
        if (m){ nm=m[1].trim(); count=parseInt(m[2]); nota=m[3].trim().replace(/^\(/,'').replace(/\)$/,'').trim(); }
        out.evaRows.push({ name:nm, count, pct:parseInt(pm[1]), nota });
      });
    }
  });

  // Temario: párrafos de cuerpo entre "Contenidos temáticos" y la siguiente sección
  let inTem=false, cur=null;
  for (const b of blocks){
    if (b.localName!=='p') { if(inTem && cur) continue; else continue; }
    const t = wText(b).replace(/\s+/g,' ').trim();
    if (!t) continue;
    if (/^contenidos?\s+tem[aá]ticos?$/i.test(t)){ inTem=true; continue; }
    if (!inTem) continue;
    if (/^(metodolog[ií]a|estrategias de aprendizaje|sistema de evaluaci[oó]n|recursos did[aá]cticos|bibliograf[ií]a|cronograma)/i.test(t) && t.length<70) break;
    const mm = t.match(/^m[oó]dulo\s+(\d+)\s*[.:]\s*(.+)$/i);
    if (mm){ cur={name:`Módulo ${mm[1]}. ${mm[2].trim()}`, subtemas:[]}; out.mods.push(cur); continue; }
    if (cur) cur.subtemas.push(cleanItem(t));
  }

  parseProgramaExtras(blocks, out);

  // Código y nombre
  out.codigo = (out.datos['Código']||'').trim();
  out.nombre = (out.datos['Nombre']||'').trim();
  if (!out.codigo){
    const p = blocks.filter(b=>b.localName==='p').map(b=>wText(b).trim()).find(t=>/^[A-Z]{2,6}-\d{2,4}\b/.test(t));
    if (p){ out.codigo = p.match(/^([A-Z]{2,6}-\d{2,4})/)[1]; out.nombre = out.nombre || p.replace(out.codigo,'').trim(); }
  }
  return out;
}

// ── Secciones del programa completo (si el .docx las trae) ──
function parseProgramaExtras(blocks, out){
  const P = b => b.localName==='p' ? wText(b).replace(/\s+/g,' ').trim() : '';
  const isHead = (b, re) => b.localName==='p' && re.test(P(b)) && P(b).length<80;
  const idx = re => blocks.findIndex(b=>isHead(b,re));
  const sliceBetween = (startRe, stopRe) => { const i=idx(startRe); if(i<0) return []; const out=[]; for(let k=i+1;k<blocks.length;k++){ if(stopRe && isHead(blocks[k],stopRe)) break; out.push(blocks[k]); } return out; };
  const SECT = /^(descripci[oó]n del curso|cuadro de competencia|contenidos? tem[aá]ticos?|metodolog[ií]a de ense|estrategias de aprendizaje|sistema de evaluaci[oó]n|recursos did[aá]cticos|bibliograf[ií]a|cronograma)$/i;
  const pr = out.programa = {};

  // Descripción: un solo párrafo (o varios) hasta el cuadro de competencia
  const desc = sliceBetween(/^descripci[oó]n del curso$/i, SECT).map(P).filter(Boolean).join(' ');
  if (desc){
    const cut = (txt, re) => { const m=txt.search(re); return m<0?[txt,'']:[txt.slice(0,m).trim(), txt.slice(m).trim()]; };
    let rest=desc, objeto, imp, enc, tem, ras;
    [rest, ras] = cut(rest, /Este curso se relaciona con los siguientes rasgos/i);
    [rest, tem] = cut(rest, /Las principales tem[aá]ticas por abordar/i);
    [rest, enc] = cut(rest, /En el curso\s*["“]/i);
    [objeto, imp] = cut(rest, /La importancia de esta asignatura/i);
    pr.descripcion = { objeto, imp, enc, ras };
  }
  // Listas con frase de entrada fija
  const listAfter = (introRe) => { const i=blocks.findIndex(b=>b.localName==='p'&&introRe.test(P(b))); if(i<0) return []; const o=[]; for(let k=i+1;k<blocks.length;k++){ const b=blocks[k]; if(b.localName!=='p') break; const t=P(b); if(!t) continue; if(SECT.test(t)||/^(el curso se caracteriza|el sistema de evaluaci)/i.test(t)) break; o.push(cleanItem(t)); } return o; };
  pr.metodologias = listAfter(/^en el presente curso, se utilizan/i);
  pr.estrategias  = listAfter(/^las estrategias de aprendizaje que se emplean/i);
  pr.tipos = blocks.filter(b=>b.localName==='p' && /^evaluaci[oó]n (diagn[oó]stica|formativa|sumativa)\s*:/i.test(P(b))).map(P);
  // Recursos: sin los dos recursos institucionales fijos de la plantilla
  pr.recursos = listAfter(/^para promover el aprendizaje de los estudiantes/i)
    .filter(t=>!RECURSOS_FIJOS_RE.test(t));
  // Bibliografía
  const bib = (labRe) => { const i=blocks.findIndex(b=>b.localName==='p'&&labRe.test(P(b))); if(i<0) return []; const o=[]; for(let k=i+1;k<blocks.length;k++){ const b=blocks[k]; if(b.localName!=='p') break; const t=P(b); if(!t) continue; if(/^bibliograf[ií]a (obligatoria|complementaria)$/i.test(t)||SECT.test(t)) break; if(!/^\[?tbd\]?$/i.test(t)) o.push(cleanItem(t)); } return o; };
  pr.biblio_ob = bib(/^bibliograf[ií]a obligatoria$/i);
  pr.biblio_co = bib(/^bibliograf[ií]a complementaria$/i);
  // Descripción de cada actividad + rúbrica (el párrafo justo antes de cada tabla de rúbrica)
  pr.actividades = [];
  blocks.forEach((b,i)=>{
    if (b.localName!=='tbl') return;
    const rows = wKids(b,'tr').map(tr=>wKids(tr,'tc').map(tc=>wParas(tc).join(' ')));
    if (!rows.length || !/^criterios de desempe/i.test(rows[0][0]||'') || rows[0].length<5) return;
    const HEAD_RE=/^(.+?)\s*\(([^)]*%[^)]*)\)\.\s*([\s\S]*)$/;
    const ps=[]; let k=i-1;
    while(k>=0 && blocks[k].localName==='p' && ps.length<4){ const t=P(blocks[k]); k--; if(!t) continue; ps.unshift(t); if(HEAD_RE.test(t)) break; }
    let dtxt='', extra=[];
    if (ps.length && HEAD_RE.test(ps[0])){ dtxt=ps[0]; extra=ps.slice(1); } else { dtxt=ps[ps.length-1]||''; }
    const m = dtxt.match(HEAD_RE);
    const nombre = m ? m[1].trim() : '';
    const sp = splitSoftLine([(m ? m[3] : dtxt), ...extra].join(' '));
    const descripcion = sp.main + (sp.soft ? '\n'+sp.soft : '');
    const rubrica = rows.slice(1).filter(r=>r.length>=5 && r[0] && !/^total/i.test(r[0])).map(r=>({titulo:r[0], niveles:r.slice(1,5)}));
    pr.actividades.push({ nombre, descripcion, rubrica });
  });
  // Cronograma
  const tCron = blocks.find(b=>b.localName==='tbl' && /^sesi[oó]n$/i.test((wParas(wKids(wKids(b,'tr')[0],'tc')[0])[0]||'')));
  if (tCron){
    const sch={}; let curMod=null;
    const modsList = out.mods||[];
    wKids(tCron,'tr').slice(1).forEach(tr=>{
      const cs=wKids(tr,'tc'); if(cs.length<3) return;
      const ses=parseInt(wParas(cs[0])[0]); if(!(ses>=1&&ses<=14)) return;
      const modPs=wParas(cs[1]);
      if (modPs.length){ const mm=modPs[0].match(/^m[oó]dulo\s+(\d+)\s*[.:]\s*(.*)$/i); curMod = mm ? {n:mm[1], name:mm[2].trim()} : {n:'', name:modPs[0]}; }
      const lines=wParas(cs[2]); const fixedN = ses===1?5:2;
      const own=lines.slice(fixedN).map(cleanItem).filter(Boolean);
      sch[ses]={ mod:curMod?String(curMod.n):'', modName:curMod?curMod.name:'', sub:'', actName:'', verb:'', note:own.join('\n') };
    });
    if (Object.keys(sch).length) pr.cronograma = sch;
  }
  if (!pr.descripcion && !pr.metodologias.length && !pr.actividades.length) out.programa = null;
}
