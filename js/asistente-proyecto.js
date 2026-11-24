/* Asistente para configurar un proyecto paso a paso (nuevo o existente) */
/* ══════════════════════════════════════════════════════
   ASISTENTE DE CONFIGURACIÓN DEL PROYECTO
   Pasos: Google → carrera → libro de Sheets → carpetas de Drive
   → correo del revisor → resumen. Revisa cada parte y ofrece
   crear o arreglar lo que falte.
══════════════════════════════════════════════════════ */
// Columnas que la app lee de la hoja Base (las dos primeras son indispensables)
const BASE_HEADERS=['Código','Curso','Créditos','Horas Docencia','Horas teoría','Horas laboratorio','Horas práctica','Horas Independiente','Total de horas','Periodo','Requisitos','Correquisitos','Carrera','Estado'];
const WZ_STEPS=[
  {k:'google', n:'Google'},
  {k:'carrera', n:'Carrera'},
  {k:'sheet', n:'Libro de Sheets'},
  {k:'drive', n:'Carpetas'},
  {k:'correo', n:'Correo'},
  {k:'listo', n:'Listo'}];
const WZ_FIELDS=['name','estado','career','career2','sigla1','sigla2','nivel','escuela','url','folderFichas','folderProgramas','mailTo','mailName','mailPrefix'];
let WZ=null;   // {pid, step, d:{…}, sheet, folders:{ficha,programa}, busy, parent, createdSheetId, sheetMode, driveMode}

function wzDraftKey(){ return 'dcd_wizard_draft'; }
function wzSaveDraft(){ if(!WZ||WZ.pid) return; try{ localStorage.setItem(wzDraftKey(), JSON.stringify({step:WZ.step,d:WZ.d,createdSheetId:WZ.createdSheetId||'',sheetMode:WZ.sheetMode,driveMode:WZ.driveMode,parent:WZ.parent||''})); }catch(e){} }
function wzClearDraft(){ try{ localStorage.removeItem(wzDraftKey()); }catch(e){} }

function openSetupWizard(pid){
  const p=pid?projects.find(x=>x.id===pid):null;
  WZ={pid:p?p.id:null, step:0, d:{}, sheet:null, folders:{}, busy:'', parent:'', createdSheetId:'', sheetMode:'', driveMode:''};
  WZ_FIELDS.forEach(k=>WZ.d[k]=p?String(p[k]||''):'');
  if(!p){ WZ.d.estado='En desarrollo'; WZ.d.mailName='Ralph';
    let dr=null; try{ dr=JSON.parse(localStorage.getItem(wzDraftKey())||'null'); }catch(e){}
    if(dr&&dr.d&&Object.values(dr.d).some(v=>String(v||'').trim())){ Object.assign(WZ.d, dr.d); WZ.step=Math.min(dr.step||0, WZ_STEPS.length-1); WZ.createdSheetId=dr.createdSheetId||''; WZ.sheetMode=dr.sheetMode||''; WZ.driveMode=dr.driveMode||''; WZ.parent=dr.parent||''; WZ.resumed=true; } }
  else { WZ.sheetMode=p.url?'link':''; WZ.driveMode=(p.folderFichas||p.folderProgramas)?'link':''; }
  try{ closeModal(); }catch(e){}
  document.getElementById('modal-wizard').classList.add('active');
  wzRender();
  if(gAccessToken && WZ.d.url) wzCheckSheet(true);
  if(gAccessToken && (WZ.d.folderFichas||WZ.d.folderProgramas)) wzCheckFolders(true);
}
function closeSetupWizard(){ const m=document.getElementById('modal-wizard'); if(m) m.classList.remove('active'); wzSaveDraft(); }
function wzSet(k,v){ if(!WZ) return; WZ.d[k]=v; if(k==='url'){ WZ.sheet=null; } if(k==='folderFichas') delete WZ.folders.ficha; if(k==='folderProgramas') delete WZ.folders.programa; wzSaveDraft(); }
function wzGo(i){ if(!WZ) return; if(i>WZ.step){ const why=wzBlock(WZ.step); if(why){ toast(why,'error'); return; } } WZ.step=Math.max(0,Math.min(WZ_STEPS.length-1,i)); wzSaveDraft(); wzRender(); document.querySelector('#modal-wizard .wz-body')?.scrollTo(0,0); }
// Lo que impide avanzar desde un paso
function wzBlock(i){
  const k=WZ_STEPS[i].k, d=WZ.d;
  if(k==='google' && !gAccessToken) return 'Conectá tu cuenta de Google para seguir';
  if(k==='carrera'){ if(!d.name.trim()) return 'Escribí un nombre corto para el proyecto'; if(!d.career.trim()) return 'Escribí el nombre completo de la carrera';
    if(d.career2.trim() && !(d.sigla1.trim()&&d.sigla2.trim())) return 'Con dos carreras, poné las siglas de cada una'; }
  if(k==='sheet' && !extractSheetId(d.url)) return 'Creá el libro o pegá el enlace de uno que ya tengás';
  return '';
}
const wzDriveOk=()=>localStorage.getItem('dcd_drive_ok')==='1';
function wzAfterAuth(){ if(WZ) wzRender(); }

/* ---------- Libro de Google Sheets ---------- */
async function wzCreateSheet(){
  if(!gAccessToken){ googleSignIn(()=>wzCreateSheet()); return; }
  WZ.busy='sheet'; wzRender();
  try{
    const row=hs=>[{values:hs.map(h=>({userEnteredValue:{stringValue:h}, userEnteredFormat:{textFormat:{bold:true}, backgroundColor:{red:.93,green:.95,blue:.99}}}))}];
    const sheet=(title,hs)=>({properties:{title, gridProperties:{frozenRowCount:1, columnCount:Math.max(26,hs.length)}}, data:[{startRow:0,startColumn:0,rowData:row(hs)}]});
    const out=await sheetsReq('', 'POST', {properties:{title:`${WZ.d.name.trim()||'Proyecto'} · Programas de curso`}, sheets:[sheet('Base',BASE_HEADERS), sheet('Maestro',MAESTRO_HEADERS)]});
    WZ.d.url=out.spreadsheetUrl||`https://docs.google.com/spreadsheets/d/${out.spreadsheetId}/edit`; WZ.createdSheetId=out.spreadsheetId; WZ.sheetMode='new';
    toast('✓ Libro creado con las hojas Base y Maestro','success');
    WZ.busy=''; wzSaveDraft(); await wzCheckSheet(true);
  }catch(e){ WZ.busy=''; toast('No pude crear el libro: '+e.message,'error'); wzRender(); }
}
async function wzCheckSheet(quiet){
  const sid=extractSheetId(WZ.d.url); if(!sid){ WZ.sheet={err:'Ese enlace no parece de Google Sheets'}; wzRender(); return; }
  if(!gAccessToken){ WZ.sheet={err:'Conectá Google para revisar el libro'}; wzRender(); return; }
  WZ.busy='check'; wzRender();
  try{
    const meta=await sheetsReq(`/${sid}?fields=properties.title,sheets.properties(sheetId,title,gridProperties.columnCount)`);
    const sh=(meta.sheets||[]).map(s=>s.properties); const base=sh.find(s=>s.title==='Base'), maestro=sh.find(s=>s.title==='Maestro');
    const r={title:meta.properties?.title||'', base:!!base, maestro:!!maestro, baseId:base?.sheetId, baseCols:base?.gridProperties?.columnCount||0, headers:[], courses:0, missingReq:[], missingRec:[]};
    if(base){
      const v=(await sheetsReq(`/${sid}/values/${encodeURIComponent('Base!A1:ZZ')}`)).values||[];
      r.headers=(v[0]||[]).map(h=>String(h||'').trim());
      const has=h=>r.headers.some(x=>normH(x)===normH(h));
      r.missingReq=['Código'].filter(h=>!has(h)); if(!has('Curso')&&!has('Nombre')) r.missingReq.push('Curso');
      const ci=r.headers.findIndex(h=>normH(h)==='codigo'); r.courses=ci<0?0:v.slice(1).filter(x=>String(x[ci]||'').trim()).length;
      r.missingRec=BASE_HEADERS.filter(h=>!r.missingReq.includes(h)&&h!=='Curso'&&!has(h)&&!(h==='Periodo'&&(has('Cuatrimestre')||has('Ubicación')))&&!(h==='Horas Docencia'&&(has('Horas Clase')||has('Lectivas'))));
      if(!WZ.d.career2.trim()) r.missingRec=r.missingRec.filter(h=>h!=='Carrera');
    }
    WZ.sheet=r;
  }catch(e){ WZ.sheet={err:/not found|404/i.test(e.message)?'No encontré ese libro. Revisá el enlace.':/permission|403/i.test(e.message)?'Tu cuenta no tiene permiso de edición en ese libro.':e.message}; }
  WZ.busy=''; wzRender(); if(!quiet&&WZ.sheet&&!WZ.sheet.err) toast('✓ Libro revisado','success');
}
// Crea lo que falte: la hoja Base, sus columnas y la hoja Maestro
async function wzFixSheet(){
  const sid=extractSheetId(WZ.d.url); const r=WZ.sheet; if(!sid||!r||r.err) return;
  WZ.busy='fix'; wzRender();
  try{
    if(!r.base){
      await sheetsReq(`/${sid}:batchUpdate`,'POST',{requests:[{addSheet:{properties:{title:'Base',gridProperties:{frozenRowCount:1,columnCount:Math.max(26,BASE_HEADERS.length)}}}}]});
      await sheetsReq(`/${sid}/values/${encodeURIComponent('Base!A1')}?valueInputOption=RAW`,'PUT',{values:[BASE_HEADERS]});
    } else {
      const add=[...r.missingReq, ...r.missingRec]; if(add.length){
        const need=r.headers.length+add.length;
        if(need>r.baseCols) await sheetsReq(`/${sid}:batchUpdate`,'POST',{requests:[{appendDimension:{sheetId:r.baseId,dimension:'COLUMNS',length:need-r.baseCols}}]});
        await sheetsReq(`/${sid}/values/${encodeURIComponent('Base!'+colLetter(r.headers.length)+'1')}?valueInputOption=RAW`,'PUT',{values:[add]});
      }
    }
    if(!r.maestro) await ensureMaestroSheet(sid);
    toast('✓ El libro quedó listo','success');
  }catch(e){ toast('No pude arreglar el libro: '+e.message,'error'); }
  WZ.busy=''; await wzCheckSheet(true);
}

/* ---------- Carpetas de Drive ---------- */
function wzNeedDrive(after){ if(!gAccessToken){ googleSignIn(after); return true; } if(!wzDriveOk()){ requestDriveScope(after); return true; } return false; }
async function wzCreateFolders(){
  if(wzNeedDrive(()=>wzCreateFolders())) return;
  const pl=String(WZ.parent||'').trim(); const parent=pl?driveFolderId(pl):'root';
  if(pl&&!parent){ toast('El enlace de la carpeta principal no parece una carpeta de Drive','error'); return; }
  WZ.busy='folders'; wzRender();
  const mk=(name,par)=>driveFetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name,webViewLink',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder',parents:[par]})});
  try{
    const proj=await mk(WZ.d.name.trim()||'Proyecto', parent);
    const fi=await mk('Fichas', proj.id), pr=await mk('Programas', proj.id);
    WZ.d.folderFichas=fi.webViewLink||`https://drive.google.com/drive/folders/${fi.id}`;
    WZ.d.folderProgramas=pr.webViewLink||`https://drive.google.com/drive/folders/${pr.id}`;
    WZ.driveMode='new'; WZ.projFolder=proj.webViewLink||`https://drive.google.com/drive/folders/${proj.id}`;
    // El libro que creó el asistente se guarda también en la carpeta del proyecto
    if(WZ.createdSheetId){ try{ const f=await driveFetch(`https://www.googleapis.com/drive/v3/files/${WZ.createdSheetId}?fields=parents&supportsAllDrives=true`);
      await driveFetch(`https://www.googleapis.com/drive/v3/files/${WZ.createdSheetId}?addParents=${proj.id}${(f.parents||[]).length?'&removeParents='+f.parents.join(','):''}&supportsAllDrives=true&fields=id`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{}'}); }catch(e){ console.warn('Mover libro:',e); } }
    toast('✓ Carpetas creadas','success');
  }catch(e){ toast('No pude crear las carpetas: '+e.message,'error'); }
  WZ.busy=''; wzSaveDraft(); await wzCheckFolders(true);
}
async function wzCheckFolders(quiet){
  if(!gAccessToken){ wzRender(); return; }
  WZ.busy='checkf'; wzRender();
  for(const [kind,key] of [['ficha','folderFichas'],['programa','folderProgramas']]){
    const link=String(WZ.d[key]||'').trim(); if(!link){ delete WZ.folders[kind]; continue; }
    const id=driveFolderId(link); if(!id){ WZ.folders[kind]={err:'No parece un enlace de carpeta de Drive'}; continue; }
    try{ const f=await driveFetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType,trashed,capabilities(canAddChildren)&supportsAllDrives=true`);
      WZ.folders[kind]= f.mimeType!=='application/vnd.google-apps.folder'?{err:'Ese enlace es de un archivo, no de una carpeta'}: f.trashed?{err:'La carpeta está en la papelera'}: f.capabilities&&f.capabilities.canAddChildren===false?{err:`No podés agregar archivos en «${f.name}»`}:{ok:true,name:f.name};
    }catch(e){ WZ.folders[kind]={err:e.status===404?(wzDriveOk()?'No encontré esa carpeta o no tenés acceso':'Falta el permiso de Drive para revisarla'):e.message}; }
  }
  WZ.busy=''; wzRender(); if(!quiet) toast('✓ Carpetas revisadas','success');
}

/* ---------- Guardar ---------- */
function wzFinish(){
  const why=[0,1,2].map(wzBlock).find(Boolean); if(why){ toast(why,'error'); return; }
  const v={}; WZ_FIELDS.forEach(k=>v[k]=String(WZ.d[k]||'').trim());
  v.sheetId=extractSheetId(v.url);
  let id=WZ.pid;
  if(id){ const p=projects.find(x=>x.id===id); Object.assign(p,v); }
  else { id=Date.now().toString(); projects.push(Object.assign({id},v,{created:Date.now()})); }
  localStorage.setItem('dcd_projects',JSON.stringify(projects)); try{ autoBackup(); }catch(e){}
  const isNew=!WZ.pid; wzClearDraft(); WZ=null;
  document.getElementById('modal-wizard').classList.remove('active');
  renderProjects();
  if(isNew){ toast(`✓ Proyecto "${v.name}" listo`,'success'); setTimeout(()=>showProject(id),300); }
  else { toast(`✓ Proyecto "${v.name}" actualizado`,'success'); if(currentProject&&currentProject.id===id){ try{ document.getElementById('proj-name-disp').textContent=v.name; paintProjectEstado(); }catch(e){} try{ Office.refresh(); }catch(e){} } }
}

/* ---------- Pantalla ---------- */
function wzStatus(state,txt){ const ic={ok:'✓',warn:'!',err:'✕',todo:'○',busy:'⟳'}[state]||'○'; return `<div class="wz-st ${state}"><span class="wz-ic" aria-hidden="true">${ic}</span><span>${txt}</span></div>`; }
function wzField(k,label,ph,hint,attrs){ return `<div class="fg"><label for="wz-${k}">${label}</label><input type="text" id="wz-${k}" value="${escHtml(WZ.d[k]||'')}" placeholder="${escHtml(ph||'')}" oninput="wzSet('${k}',this.value)" ${attrs||''}>${hint?`<small>${hint}</small>`:''}</div>`; }
function wzSheetSummary(){
  const r=WZ.sheet, B=WZ.busy;
  if(B==='check'||B==='fix') return wzStatus('busy','Revisando el libro…');
  if(!r) return extractSheetId(WZ.d.url)?wzStatus('todo','Todavía no lo revisé'):'';
  if(r.err) return wzStatus('err',escHtml(r.err));
  const miss=[...r.missingReq,...r.missingRec];
  return `<div class="wz-checks">
    ${wzStatus('ok',`Tengo acceso a «${escHtml(r.title)}»`)}
    ${r.base?wzStatus(r.missingReq.length?'err':'ok',r.missingReq.length?`A la hoja Base le faltan columnas indispensables: ${escHtml(r.missingReq.join(' y '))}`:`Hoja Base con ${r.courses===1?'1 curso':r.courses+' cursos'}`):wzStatus('err','Falta la hoja Base')}
    ${r.base&&r.missingRec.length?wzStatus('warn',`Columnas sugeridas que faltan en Base: ${escHtml(r.missingRec.join(', '))}`):''}
    ${wzStatus(r.maestro?'ok':'warn',r.maestro?'Hoja Maestro lista':'Falta la hoja Maestro (la creo yo)')}
    ${r.base&&!r.courses&&!r.missingReq.length?wzStatus('warn','La hoja Base todavía no tiene cursos. Pegá ahí la malla: un curso por fila con su código y su nombre.'):''}
  </div>
  ${(!r.base||miss.length||!r.maestro)?`<button class="btn btn-primary btn-sm" onclick="wzFixSheet()">Arreglar el libro</button>`:''}`;
}
function wzFolderLine(kind,lbl){ const f=WZ.folders[kind]; const link=WZ.d[kind==='ficha'?'folderFichas':'folderProgramas'];
  if(!link) return wzStatus('todo',`Sin carpeta de ${lbl}`);
  if(WZ.busy==='checkf'||WZ.busy==='folders') return wzStatus('busy',`Revisando la carpeta de ${lbl}…`);
  if(!f) return wzStatus('todo',`Carpeta de ${lbl} sin revisar`);
  return f.err?wzStatus('err',`${lbl[0].toUpperCase()+lbl.slice(1)}: ${escHtml(f.err)}`):wzStatus('ok',`Carpeta de ${lbl}: «${escHtml(f.name)}»`); }
function wzStepBody(k){
  const d=WZ.d, B=WZ.busy;
  if(k==='google'){
    return `<h3>${WZ.pid?'Revisemos la configuración':'Configuremos el proyecto'}</h3>
      <p class="wz-lead">${WZ.pid?'Paso a paso reviso que todo esté conectado y te ofrezco arreglar lo que falte.':'En unos minutos queda listo para trabajar desde la oficina. Te voy guiando y creo por vos lo que haga falta.'}</p>
      ${WZ.resumed?`<div class="wz-note">Seguís donde te quedaste la última vez. <a href="#" onclick="wzRestart();return false">Empezar de cero</a></div>`:''}
      <div class="wz-map">${WZ_STEPS.slice(1,-1).map((s,i)=>`<div><b>${i+1}</b>${escHtml(s.n)}</div>`).join('')}</div>
      <h4>Tu cuenta de Google</h4>
      <div class="wz-checks">
        ${gAccessToken?wzStatus('ok',`Conectado${gUserInfo?.email?' como '+escHtml(gUserInfo.email):''}`):wzStatus('err','Sin conectar')}
        ${gAccessToken?(wzDriveOk()?wzStatus('ok','Permiso para tus carpetas de Drive'):wzStatus('warn','Falta el permiso para tus carpetas de Drive (lo necesito para guardar los Word)')):''}
      </div>
      <div class="wz-row">${!gAccessToken?`<button class="btn btn-primary btn-sm" onclick="googleSignIn(wzAfterAuth)">Conectar Google</button>`:''}${gAccessToken&&!wzDriveOk()?`<button class="btn btn-ghost btn-sm" onclick="requestDriveScope(wzAfterAuth)">Dar permiso de Drive</button>`:''}</div>
      <p class="wz-small">El correo del revisor se conecta después, desde el Cartero de la oficina.</p>`;
  }
  if(k==='carrera'){
    const two=!!(d.career2.trim()||WZ.two);
    return `<h3>La carrera</h3><p class="wz-lead">Estos datos van en el encabezado de cada Word.</p>
      ${wzField('name','Nombre corto del proyecto','Ej.: MISOFT, BIA, BAE I','Es el que ves en la pantalla de inicio y en la oficina.')}
      ${wzField('career','Nombre completo de la carrera','Ej.: Maestría Profesional en Ingeniería del Software')}
      <div class="wz-two">${wzField('nivel','Nivel','Ej.: Maestría profesional','Tal como va en la tabla de datos generales.')}${wzField('escuela','Escuela','Ej.: Escuela de Ingeniería del Software')}</div>
      ${two?`<div class="wz-box">${wzField('career2','Segunda carrera','Ej.: Maestría Profesional en Inteligencia Artificial','Para planes con dos énfasis que comparten cursos.')}
        <div class="wz-two">${wzField('sigla1','Siglas de la primera','Ej.: MISOFT','Como van en la columna «Carrera» de la hoja Base.')}${wzField('sigla2','Siglas de la segunda','Ej.: MISIA')}</div></div>`
      :`<button class="btn btn-quiet btn-sm" onclick="WZ.two=true;wzRender()">+ El plan tiene una segunda carrera</button>`}`;
  }
  if(k==='sheet'){
    const m=WZ.sheetMode;
    return `<h3>El libro de Google Sheets</h3><p class="wz-lead">Ahí viven los cursos. La hoja <b>Base</b> trae la malla (un curso por fila) y la hoja <b>Maestro</b> guarda cada programa.</p>
      <div class="wz-choices">
        <button class="wz-choice ${m==='new'?'on':''}" onclick="WZ.sheetMode='new';wzRender()"><b>Crear un libro nuevo</b><span>Lo creo con las dos hojas y sus columnas.</span></button>
        <button class="wz-choice ${m==='link'?'on':''}" onclick="WZ.sheetMode='link';wzRender()"><b>Ya tengo uno</b><span>Pegás el enlace y reviso que esté completo.</span></button>
      </div>
      ${m==='new'?(WZ.createdSheetId?`<div class="wz-note">Libro creado. <a href="${escHtml(d.url)}" target="_blank" rel="noopener">Abrilo</a> y pegá la malla en la hoja Base.</div>`:`<button class="btn btn-primary btn-sm" ${B?'disabled':''} onclick="wzCreateSheet()">${B==='sheet'?'Creando…':'Crear el libro'}</button>`):''}
      ${m==='link'?`<div class="fg"><label for="wz-url">Enlace del libro</label><div class="wz-row" style="margin:0"><input type="text" id="wz-url" value="${escHtml(d.url)}" placeholder="https://docs.google.com/spreadsheets/d/…" oninput="wzSet('url',this.value)" onchange="wzCheckSheet(true)" style="flex:1"><button class="btn btn-ghost btn-sm" onclick="wzCheckSheet()">Revisar</button></div></div>`:''}
      ${m?wzSheetSummary():''}`;
  }
  if(k==='drive'){
    const m=WZ.driveMode;
    return `<h3>Las carpetas de Drive</h3><p class="wz-lead">Cada Word se guarda en su carpeta como documento de Google. Lo que corregís ahí se actualiza en el Maestro.</p>
      ${gAccessToken&&!wzDriveOk()?`<div class="wz-note warn">Primero necesito permiso para tus carpetas de Drive. <a href="#" onclick="requestDriveScope(()=>wzCheckFolders(true));return false">Darlo ahora</a></div>`:''}
      <div class="wz-choices">
        <button class="wz-choice ${m==='new'?'on':''}" onclick="WZ.driveMode='new';wzRender()"><b>Crear las carpetas</b><span>Una carpeta del proyecto con «Fichas» y «Programas» adentro.</span></button>
        <button class="wz-choice ${m==='link'?'on':''}" onclick="WZ.driveMode='link';wzRender()"><b>Ya las tengo</b><span>Pegás los enlaces y reviso que puedas guardar ahí.</span></button>
      </div>
      ${m==='new'?(WZ.projFolder?`<div class="wz-note">Carpetas creadas. <a href="${escHtml(WZ.projFolder)}" target="_blank" rel="noopener">Ver en Drive</a></div>`:`<div class="fg"><label for="wz-parent">Dónde crearlas <span class="wz-opt">(opcional)</span></label><input type="text" id="wz-parent" value="${escHtml(WZ.parent||'')}" placeholder="Enlace de una carpeta; si lo dejás vacío, van en Mi unidad" oninput="WZ.parent=this.value"></div>
        <button class="btn btn-primary btn-sm" ${B?'disabled':''} onclick="wzCreateFolders()">${B==='folders'?'Creando…':'Crear las carpetas'}</button>`):''}
      ${m==='link'?`<div class="fg"><label for="wz-folderFichas">Carpeta de fichas</label><input type="text" id="wz-folderFichas" value="${escHtml(d.folderFichas)}" placeholder="https://drive.google.com/drive/folders/…" oninput="wzSet('folderFichas',this.value)"></div>
        <div class="fg"><label for="wz-folderProgramas">Carpeta de programas</label><input type="text" id="wz-folderProgramas" value="${escHtml(d.folderProgramas)}" placeholder="https://drive.google.com/drive/folders/…" oninput="wzSet('folderProgramas',this.value)"></div>
        <button class="btn btn-ghost btn-sm" onclick="wzCheckFolders()">Revisar las carpetas</button>`:''}
      ${(d.folderFichas||d.folderProgramas)?`<div class="wz-checks">${wzFolderLine('ficha','fichas')}${wzFolderLine('programa','programas')}</div>`:''}
      <p class="wz-small">Podés saltarte este paso y agregarlas después, pero sin carpetas los Word solo se descargan.</p>`;
  }
  if(k==='correo'){
    return `<h3>El correo del revisor</h3><p class="wz-lead">Lo uso para armar los borradores de Gmail y para reconocer sus respuestas.</p>
      <div class="wz-two">${wzField('mailTo','Correo del revisor','revisor@ucenfotec.ac.cr','','type="email"')}${wzField('mailName','Nombre en el saludo','Ralph')}</div>
      ${wzField('mailPrefix','Siglas del asunto','Ej.: '+(d.sigla1||d.name||'MISOFT'),'El asunto queda así: '+escHtml((d.mailPrefix||d.sigla1||d.name||'SIGLAS')+' | Programa de curso SOFT-201 Nombre del curso'))}
      <p class="wz-small">Es opcional: lo podés cambiar cuando quieras en Ajustes de la oficina.</p>`;
  }
  // listo
  const r=WZ.sheet, f=WZ.folders;
  const sheetSt=!extractSheetId(d.url)?['err','Falta el libro de Google Sheets']:!r?['todo','Libro de Sheets sin revisar']:r.err?['err',escHtml(r.err)]:(!r.base||r.missingReq.length)?['err','A la hoja Base le falta lo indispensable']:(!r.maestro||r.missingRec.length)?['warn','Libro listo, con columnas sugeridas pendientes']:['ok',`Libro listo con ${r.courses===1?'1 curso':r.courses+' cursos'}`];
  const fold=k2=>f[k2]?.ok;
  return `<h3>${WZ.pid?'Todo revisado':'¡Casi listo!'}</h3><p class="wz-lead">Este es el estado del proyecto. Tocá cualquier línea para volver a ese paso.</p>
    <div class="wz-checks wz-sum">
      <a href="#" onclick="wzGo(0);return false">${wzStatus(gAccessToken?(wzDriveOk()?'ok':'warn'):'err', gAccessToken?(wzDriveOk()?'Google conectado con permiso de Drive':'Google conectado, sin permiso de Drive'):'Google sin conectar')}</a>
      <a href="#" onclick="wzGo(1);return false">${wzStatus(d.name&&d.career?'ok':'err', d.name&&d.career?`${escHtml(d.name)} · ${escHtml(d.career)}${d.career2?' y '+escHtml(d.career2):''}`:'Faltan los datos de la carrera')}</a>
      <a href="#" onclick="wzGo(2);return false">${wzStatus(sheetSt[0],sheetSt[1])}</a>
      <a href="#" onclick="wzGo(3);return false">${wzStatus(fold('ficha')&&fold('programa')?'ok':'warn', fold('ficha')&&fold('programa')?'Carpetas de fichas y de programas listas':'Carpetas de Drive pendientes (opcional)')}</a>
      <a href="#" onclick="wzGo(4);return false">${wzStatus(d.mailTo?'ok':'warn', d.mailTo?`Correo del revisor: ${escHtml(d.mailTo)}`:'Correo del revisor pendiente (opcional)')}</a>
    </div>
    ${!WZ.pid?`<p class="wz-small">Al crear el proyecto se abre la oficina. Si la hoja Base tiene cursos, cada agente ya puede trabajar con ellos.</p>`:''}`;
}
function wzRestart(){ wzClearDraft(); const pid=WZ?.pid||null; WZ=null; openSetupWizard(pid); }
function wzRender(){
  if(!WZ) return; const box=document.getElementById('wz-content'); if(!box) return;
  const i=WZ.step, last=i===WZ_STEPS.length-1;
  const keep=document.activeElement&&box.contains(document.activeElement)?document.activeElement.id:'';
  box.innerHTML=`<button class="wz-x" onclick="closeSetupWizard()" aria-label="Cerrar">×</button>
    <ol class="wz-steps">${WZ_STEPS.map((s,j)=>`<li class="${j<i?'done':j===i?'on':''}"><button onclick="wzGo(${j})" ${j>i+1?'disabled':''}><span>${j<i?'✓':j+1}</span>${escHtml(s.n)}</button></li>`).join('')}</ol>
    <div class="wz-body">${wzStepBody(WZ_STEPS[i].k)}</div>
    <div class="wz-foot">${i>0?`<button class="btn btn-ghost" onclick="wzGo(${i-1})">← Atrás</button>`:'<span></span>'}
      ${last?`<button class="btn btn-primary" onclick="wzFinish()">${WZ.pid?'Guardar cambios':'Crear el proyecto →'}</button>`:`<button class="btn btn-primary" onclick="wzGo(${i+1})">${['drive','correo'].includes(WZ_STEPS[i].k)?'Siguiente (o saltar) →':'Siguiente →'}</button>`}</div>`;
  if(keep){ const el=document.getElementById(keep); if(el){ el.focus(); try{ const n=el.value.length; el.setSelectionRange(n,n); }catch(e){} } }
}
