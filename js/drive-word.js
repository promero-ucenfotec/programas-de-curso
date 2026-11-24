/* Word en las carpetas de Drive del proyecto */
/* ══════════════════════════════════════════════════════
   WORD EN LAS CARPETAS DE DRIVE DEL PROYECTO
   Al guardar en Maestro: ficha → carpeta de fichas, programa → carpeta
   de programas. Si el curso ya tiene su Word ahí, se actualiza el mismo
   archivo (Drive guarda las versiones anteriores) y toma el nombre nuevo.
══════════════════════════════════════════════════════ */
let driveTokenClient=null;
function driveFolderId(url){
  const u=String(url||'').trim(); if(!u) return '';
  let m=u.match(/\/folders\/([A-Za-z0-9_-]{10,})/) || u.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  if(m) return m[1];
  return /^[A-Za-z0-9_-]{20,}$/.test(u) ? u : '';
}
function requestDriveScope(after){
  if (!window.google?.accounts?.oauth2){ toast('Google Identity Services no cargó aún. Intentá de nuevo.','error'); return; }
  if (!driveTokenClient){
    driveTokenClient = google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: SHEETS_SCOPE+' '+DRIVE_SCOPE, include_granted_scopes: true, callback: onTokenReceived });
  }
  afterTokenFn = after;
  driveTokenClient.requestAccessToken(gUserInfo?.email ? { prompt:'', hint: gUserInfo.email } : { prompt:'' });
}
// Opciones del Word sin abrir la ventana de descarga (las mismas que recuerda la app)
function headlessWordOpts(){
  const s=currentSaved(); const d=courseDatos(currentCourse,s);
  let pref={}; try{ pref=JSON.parse(localStorage.getItem('dcd_word_'+currentProject.id)||'{}'); }catch(e){}
  const cars=projectCareers();
  let com=null; try{ com=JSON.parse(localStorage.getItem('dcd_comun_'+(currentCourse['Código']||''))||'null'); }catch(e){}
  const carrera = cars.length>1 ? ([com?.carrera1, pref.carrera, d._carrera].find(x=>x && cars.includes(x)) || cars[0]) : (cars[0] || d._carrera || pref.carrera || '');
  let carrera2 = com?.on ? String(com.carrera2||'').trim() : ''; if (carrera2===carrera) carrera2='';
  const ver=courseVersion();
  const escuela = currentProject.escuela || d._escuela || pref.escuela || '';
  const rb=versionBase(ver);
  const highlight = rb ? changedPieces(rb.values, s) : null;
  if (hasProgramSection(s)) saveVersionSnap(ver, s);
  return { escuela, carrera, carrera2, saved:s, highlight, ver };
}
function driveFileKey(kind){ return `dcd_drivefile_${kind}_${currentProject?.id||''}_${currentCourse?.['Código']||''}`; }
async function driveFetch(url, opts={}){
  const r=await fetch(url, Object.assign({}, opts, { headers: Object.assign({ Authorization:'Bearer '+gAccessToken }, opts.headers||{}) }));
  if (!r.ok){
    const e=await r.json().catch(()=>({})); const msg=e.error?.message||r.statusText;
    const err=new Error(msg); err.status=r.status; err.scope=/scope|insufficient|permission/i.test(msg)&&r.status===403; throw err;
  }
  return r.json();
}
// ¿El nombre de este archivo es el Word de ESTE curso y de este tipo (ficha o programa)?
function driveNameFits(name, kind, code){
  const n=String(name||'');
  const parts=(String(code||'').toUpperCase().match(/[A-Z]+|\d+/g)||[]).map(x=>/^\d+$/.test(x)?'0*'+String(parseInt(x,10)):x);
  const codeRe = parts.length ? new RegExp('(^|[^A-Z0-9])'+parts.join('[\\s_-]*')+'(?![0-9])','i') : null;
  const hit = codeRe ? codeRe.test(n.toUpperCase()) : normCode(n).includes(code);
  if (!hit) return false;
  const isFicha=/\bficha\b/i.test(n);
  return kind==='ficha' ? isFicha : !isFicha;
}
async function driveFindCourseFile(folderId, kind){
  const code=normCode(currentCourse['Código']);
  // 1) El último archivo que subió la app para este curso, si sigue en la carpeta y su nombre corresponde
  //    (nunca se reutiliza el id si el archivo es de otro curso o del otro tipo: así una ficha no pisa un programa)
  let known=''; try{ known=localStorage.getItem(driveFileKey(kind))||''; }catch(e){}
  if (known){
    try{ const f=await driveFetch(`https://www.googleapis.com/drive/v3/files/${known}?fields=id,name,parents,trashed&supportsAllDrives=true`); if(!f.trashed && (f.parents||[]).includes(folderId) && driveNameFits(f.name, kind, code)) return f; }catch(e){}
    try{ localStorage.removeItem(driveFileKey(kind)); }catch(e){}
  }
  // 2) Un Word del curso en la carpeta (cualquier versión y cualquier nombre que lleve el código)
  const q=encodeURIComponent(`'${folderId}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`);
  let files=[], tok='';
  do{
    const out=await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name,mimeType,modifiedTime)&pageSize=1000&orderBy=modifiedTime desc&supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives${tok?'&pageToken='+tok:''}`);
    files=files.concat(out.files||[]); tok=out.nextPageToken||'';
  } while(tok);
  // "SOFT-201" coincide con "SOFT-201", "SOFT 201", "SOFT_201" o "Programa SOFT-201…", pero no con "SOFT-2010"
  const DOCXM='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const cands=files.filter(f=>{
    const n=String(f.name||'');
    if(!(/\.docx$/i.test(n) || f.mimeType===DOCXM)) return false;
    return driveNameFits(n, kind, code);
  });
  driveLastScan={folderId, total:files.length, cands:cands.map(f=>f.name)};
  return cands[0] || null;
}
let driveLastScan=null;
async function driveUploadDocx(blob, fname, folderId, kind){
  const DOCX='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const existing=await driveFindCourseFile(folderId, kind);
  const meta = existing ? { name: fname } : { name: fname, parents:[folderId], mimeType: DOCX };
  const bnd='dcd'+Math.random().toString(36).slice(2);
  const body=new Blob([`--${bnd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`, JSON.stringify(meta), `\r\n--${bnd}\r\nContent-Type: ${DOCX}\r\n\r\n`, blob, `\r\n--${bnd}--`]);
  const url = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink`;
  const f=await driveFetch(url, { method: existing?'PATCH':'POST', headers:{ 'Content-Type':`multipart/related; boundary=${bnd}` }, body });
  try{ localStorage.setItem(driveFileKey(kind), f.id); }catch(e){}
  return { file:f, updated:!!existing, oldName: existing?.name||'' };
}
// Secciones propias del programa (además de la ficha)
const PROG_SECS=['descripcion_objeto','descripcion_import','descripcion_en_curso','metodologias','estrategias','eva_tipo','eva_desc1','eva_desc2','eva_desc3','recursos','cronograma','biblio_ob','biblio_co'];
function hasProgramSection(s){ return PROG_SECS.some(k=>String(s?.[k]||'').trim()); }
async function uploadCourseWords(){
  if (!currentProject || !currentCourse) return;
  const p=currentProject; const s=currentSaved(); const st=courseStage(s);
  const jobs=[];
  if (p.folderFichas && st.ficha) jobs.push({kind:'ficha', mode:'ficha', folder:driveFolderId(p.folderFichas), lbl:'la ficha'});
  if (p.folderProgramas && hasProgramSection(s)) jobs.push({kind:'programa', mode:'programa', folder:driveFolderId(p.folderProgramas), lbl:'el programa'});
  if (!jobs.length){
    toast('El curso todavía no tiene ninguna sección del programa ni la ficha completa; no se subió el Word a Drive','');
    return;
  }
  let driveOk=false; try{ driveOk=localStorage.getItem('dcd_drive_ok')==='1'; }catch(e){}
  if (!driveOk){ toast('Google pide permiso para escribir en tus carpetas de Drive. Aceptá y el Word se sube solo.',''); requestDriveScope(uploadCourseWords); return; }
  const o=headlessWordOpts(); const done=[];
  // Lo que falte en la app se completa con el Maestro, para que el Word de Drive nunca quede con secciones vacías
  try{ const fromM=await savedFromMaestroRow(); if(fromM){ const m=Object.assign({},o.saved); Object.entries(fromM).forEach(([k,v])=>{ if(String(v||'').trim() && !String(m[k]||'').trim()) m[k]=v; }); o.saved=m; } }catch(e){}
  for (const j of jobs){
    try{
      const blob=await buildDocx(j.mode, {escuela:o.escuela, carrera:o.carrera, carrera2:o.carrera2, saved:o.saved, highlight:o.highlight});
      const fname=wordFileName(j.mode, o.ver);
      const r=await driveUploadDocx(blob, fname, j.folder, j.kind);
      done.push(`${r.updated?'actualicé':'subí'} ${j.lbl}`);
    }catch(e){
      if (e.status===401 || e.scope){
        try{ localStorage.removeItem('dcd_drive_ok'); }catch(_){}
        toast('Drive pide permiso de nuevo. Aceptá en la ventana de Google y el Word se sube solo.','');
        requestDriveScope(uploadCourseWords); return;
      }
      if (e.status===404){ toast(`No encuentro la carpeta de ${j.kind==='ficha'?'fichas':'programas'}. Revisá el enlace del proyecto y que tu cuenta tenga acceso.`,'error'); continue; }
      toast(`No se pudo subir ${j.lbl} a Drive: ${e.message}`,'error');
    }
  }
  if (done.length) toast(`✓ En Drive: ${done.join(' y ')} (${o.ver})`,'success');
}

window.__renderIcons = function(){};
