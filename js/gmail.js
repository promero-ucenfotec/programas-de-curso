/* Borrador en Gmail */
/* ══════════════════════════════════════════════════════
   BORRADOR EN GMAIL (programa adjunto)
══════════════════════════════════════════════════════ */
const GM_DESEOS = ['¡Espero que todo vaya excelente!', '¡Espero que todo esté demasiado bien!'];
const GM_CIERRES = ['Cualquier comentario de mejora, quedo muy atento.', 'Cualquier retroalimentación, quedo muy atento.'];
let gmRot = 0;
try { gmRot = parseInt(localStorage.getItem('dcd_mail_rot')||'0')||0; } catch(e){}
let gmailTokenClient = null;
function gmPrefs(){ try{ return JSON.parse(localStorage.getItem('dcd_mail_'+currentProject.id)||'{}'); }catch(e){ return {}; } }
function gmGlobal(){ try{ return JSON.parse(localStorage.getItem('dcd_mail')||'{}'); }catch(e){ return {}; } }
function gmSaludo(){ const hr=new Date().getHours(); return hr<12 ? 'Buenos días' : (hr<19 ? 'Buenas tardes' : 'Buenas noches'); }
function gmBodyText(name){
  const deseo = GM_DESEOS[gmRot % GM_DESEOS.length];
  const cierre = GM_CIERRES[Math.floor(gmRot/GM_DESEOS.length) % GM_CIERRES.length];
  return `${gmSaludo()}, ${name||'Ralph'}. ${deseo}\nA continuación, le comparto el programa de curso en mención para su revisión.\n${cierre}\nSaludos cordiales,`;
}
function gmSubject(){
  const code=(currentCourse['Código']||'').trim(); const name=(currentCourse['Curso']||currentCourse['Nombre']||'').trim();
  const pre=document.getElementById('gm-prefix').value.trim();
  return `${pre?pre+' | ':''}Programa de curso ${code} ${name}`.trim();
}
let gmBodyTouched=false, gmSubjTouched=false;
function gmailRefresh(rotate){
  if (rotate===true){ gmRot++; gmBodyTouched=false; }
  if (!gmSubjTouched) document.getElementById('gm-subject').value = gmSubject();
  if (!gmBodyTouched) document.getElementById('gm-body').value = gmBodyText(document.getElementById('gm-name').value.trim());
}
function openGmailDraft(){
  if(!currentCourse||!currentProject){ toast('Abrí un curso primero','error'); return; }
  const g=gmGlobal(), pp=gmPrefs();
  document.getElementById('gm-to').value = pp.to || g.to || '';
  document.getElementById('gm-name').value = pp.name || g.name || 'Ralph';
  document.getElementById('gm-cc').value = pp.cc || '';
  document.getElementById('gm-prefix').value = pp.prefix || currentProject.sigla || (currentProject.name||'').trim();
  gmBodyTouched=false; gmSubjTouched=false;
  gmailRefresh();
  document.getElementById('gm-file').textContent = wordFileName('programa');
  document.getElementById('gm-done').style.display='none';
  document.getElementById('gm-btn').disabled=false;
  document.getElementById('modal-gmail').classList.add('active');
}
function closeGmailDraft(){ document.getElementById('modal-gmail').classList.remove('active'); }
function utf8B64(str){ const bytes=new TextEncoder().encode(str); let bin=''; for(let i=0;i<bytes.length;i+=0x8000) bin+=String.fromCharCode.apply(null, bytes.subarray(i,i+0x8000)); return btoa(bin); }
async function blobB64(blob){ const bytes=new Uint8Array(await blob.arrayBuffer()); let bin=''; for(let i=0;i<bytes.length;i+=0x8000) bin+=String.fromCharCode.apply(null, bytes.subarray(i,i+0x8000)); return btoa(bin); }
function wrap76(s){ return s.replace(/(.{76})/g,'$1\r\n'); }
function mimeWord(s){ return /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${utf8B64(s)}?=`; }
function buildMime({to, cc, subject, body, fname, fileB64}){
  const b='dcd_'+Math.random().toString(36).slice(2);
  const L=[];
  L.push(`To: ${to}`);
  if (cc) L.push(`Cc: ${cc}`);
  L.push(`Subject: ${mimeWord(subject)}`, 'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${b}"`, '');
  L.push(`--${b}`, 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', wrap76(utf8B64(body.replace(/\r?\n/g,'\r\n'))));
  L.push(`--${b}`, `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document; name="${mimeWord(fname)}"`,
    `Content-Disposition: attachment; filename="${mimeWord(fname)}"; filename*=UTF-8''${encodeURIComponent(fname)}`,
    'Content-Transfer-Encoding: base64', '', wrap76(fileB64));
  L.push(`--${b}--`, '');
  return L.join('\r\n');
}
function b64url(s){ return s.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function requestGmailScope(after){
  if (!window.google?.accounts?.oauth2){ toast('Google Identity Services no cargó aún. Intentá de nuevo.','error'); return; }
  if (!gmailTokenClient){
    gmailTokenClient = google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: SHEETS_SCOPE+' '+GMAIL_SCOPE, include_granted_scopes: true, callback: onTokenReceived });
  }
  afterTokenFn = after;
  gmailTokenClient.requestAccessToken(gUserInfo?.email ? { prompt:'', hint: gUserInfo.email } : { prompt:'' });
}
async function createGmailDraft(){
  const to=document.getElementById('gm-to').value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to.split(',')[0].trim())){ toast('Escribí el correo del destinatario','error'); document.getElementById('gm-to').focus(); return; }
  let gmailOk=false; try{ gmailOk = localStorage.getItem('dcd_gmail_ok')==='1'; }catch(e){}
  if (!gAccessToken || !gmailOk){ requestGmailScope(createGmailDraft); return; }
  const btn=document.getElementById('gm-btn'); btn.disabled=true; btn.innerHTML='Creando borrador…';
  try{
    const name=document.getElementById('gm-name').value.trim(), cc=document.getElementById('gm-cc').value.trim(), prefix=document.getElementById('gm-prefix').value.trim();
    const prefs={to, name, cc, prefix};
    try{ localStorage.setItem('dcd_mail_'+currentProject.id, JSON.stringify(prefs)); localStorage.setItem('dcd_mail', JSON.stringify({to, name})); }catch(e){}
    const { blob, fname } = await prepareWordBlob('programa');
    const raw = buildMime({ to, cc, subject: document.getElementById('gm-subject').value.trim(), body: document.getElementById('gm-body').value, fname, fileB64: await blobB64(blob) });
    const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method:'POST', headers:{ Authorization:'Bearer '+gAccessToken, 'Content-Type':'application/json' },
      body: JSON.stringify({ message: { raw: b64url(utf8B64(raw)) } })
    });
    if (r.status===401 || r.status===403){
      const e=await r.json().catch(()=>({}));
      const msg=e.error?.message||'';
      if (r.status===401 || /scope|insufficient/i.test(msg)){
        try{ localStorage.removeItem('dcd_gmail_ok'); }catch(_){}
        if (r.status===401){ gAccessToken=null; localStorage.removeItem('dcd_gtoken'); renderNavAuth(); updateSheetsStatusAll(); }
        toast('Gmail pide permiso de nuevo. Aceptá en la ventana de Google y el borrador se crea solo.','');
        requestGmailScope(createGmailDraft); return;
      }
      throw new Error(msg || 'Gmail rechazó la solicitud ('+r.status+')');
    }
    if (!r.ok){ const e=await r.json().catch(()=>({})); throw new Error(e.error?.message||('Error de Gmail ('+r.status+')')); }
    const d = await r.json();
    gmRot++; try{ localStorage.setItem('dcd_mail_rot', String(gmRot)); }catch(e){}
    const link = `https://mail.google.com/mail/u/0/#drafts?compose=${encodeURIComponent(d.message?.id||'')}`;
    const done=document.getElementById('gm-done');
    done.style.display='block';
    done.innerHTML = `✓ Borrador creado con <strong>${escHtml(fname)}</strong> adjunto. <a href="${link}" target="_blank" rel="noopener">Abrir en Gmail ↗</a>`;
    toast('✓ Borrador creado en Gmail','success');
  }catch(e){ console.error(e); toast('No se pudo crear el borrador: '+e.message,'error'); }
  btn.disabled=false; btn.innerHTML='<span class="ic" aria-hidden="true">✉</span> Crear borrador';
}
document.getElementById('modal-gmail').addEventListener('click',e=>{if(e.target===e.currentTarget)closeGmailDraft();});
document.getElementById('gm-body').addEventListener('input',()=>{gmBodyTouched=true;});
document.getElementById('gm-subject').addEventListener('input',()=>{gmSubjTouched=true;});
