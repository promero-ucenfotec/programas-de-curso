/* Respaldo de la app en Google Drive */
/* ══════════════════════════════════════════════════════
   GOOGLE DRIVE BACKUP
   Uses drive.file scope — only accesses files THIS app
   created. Stores one file: "dcd_backup.json" in Drive root.
══════════════════════════════════════════════════════ */
const DRIVE_BACKUP_NAME = 'dcd_backup.json';
let driveBackupFileId = null;

async function driveReq(path, method='GET', body=null, isUpload=false) {
  if (!gAccessToken) return null;
  const base = isUpload
    ? 'https://www.googleapis.com/upload/drive/v3'
    : 'https://www.googleapis.com/drive/v3';
  const headers = { Authorization: 'Bearer '+gAccessToken };
  if (!isUpload && body) headers['Content-Type'] = 'application/json';
  const opts = { method, headers };
  if (body) opts.body = isUpload ? body : JSON.stringify(body);
  const r = await fetch(base+path, opts);
  if (!r.ok) return null;
  return r.json();
}

async function findBackupFile() {
  const res = await driveReq(`/files?q=name='${DRIVE_BACKUP_NAME}' and trashed=false&fields=files(id,name,modifiedTime)`);
  return res?.files?.[0] || null;
}

async function loadFromDrive() {
  if (!gAccessToken) return false;
  loadFromDrive._busy = true;
  try {
    const res = await driveReq(`/files?q=name='${DRIVE_BACKUP_NAME}' and trashed=false&fields=files(id,name,modifiedTime)`);
    if (res) driveBackupChecked = true;
    const file = res?.files?.[0] || null;
    if (!file) return false;
    driveBackupFileId = file.id;
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
      headers: { Authorization: 'Bearer '+gAccessToken }
    });
    if (!r.ok) return false;
    const backup = await r.json();
    // Proyectos: manda Drive, pero un campo vacío en Drive no borra lo que hay aquí (por ejemplo, las siglas del correo)
    if (backup.projects?.length) {
      const loc = {}; (projects||[]).forEach(p=>{ if (p&&p.id) loc[p.id]=p; });
      const merged = backup.projects.map(dp=>{ const lp=loc[dp.id]; if(!lp) return dp; const o=Object.assign({}, lp, dp);
        Object.keys(lp).forEach(k=>{ const dv=dp[k]; if ((dv===undefined||dv===null||dv==='') && lp[k]!==undefined && lp[k]!=='') o[k]=lp[k]; }); return o; });
      (projects||[]).forEach(lp=>{ if (lp&&lp.id&&!backup.projects.some(dp=>dp.id===lp.id)) merged.push(lp); });
      projects = merged;
      if (currentProject) currentProject = projects.find(x=>x.id===currentProject.id) || currentProject;
      localStorage.setItem('dcd_projects', JSON.stringify(projects));
    }
    // Ajustes que vivían solo en esta compu (versiones, carreras, correo, Word): se recuperan si aquí no están
    if (backup.local && typeof backup.local==='object') {
      Object.entries(backup.local).forEach(([k,v])=>{ try{ if (LOCAL_BACKUP_RX.test(k) && localStorage.getItem(k)===null && typeof v==='string') localStorage.setItem(k, v); }catch(e){} });
    }
    if (backup.customPrompts && Object.keys(backup.customPrompts).length) {
      customPrompts = backup.customPrompts;
      localStorage.setItem('dcd_prompts', JSON.stringify(customPrompts));
    }
    if (backup.office && typeof backup.office==='object') {
      try{ localStorage.setItem('dcd_office', JSON.stringify(backup.office)); }catch(e){}
      if (typeof Office!=='undefined' && Office.reloadLayout) Office.reloadLayout();
    }
    if (backup.maestroData) {
      // Deep merge — don't overwrite local data with empty Drive data
      Object.entries(backup.maestroData).forEach(([sid, courses]) => {
        if (!maestroData[sid]) maestroData[sid] = {};
        Object.entries(courses).forEach(([code, secs]) => {
          if (!maestroData[sid][code]) maestroData[sid][code] = {};
          Object.entries(secs).forEach(([secId, val]) => {
            if (val && !maestroData[sid][code][secId]) maestroData[sid][code][secId] = val;
          });
        });
      });
      localStorage.setItem('dcd_maestro', JSON.stringify(maestroData));
    }
    toast(`✓ Datos restaurados desde Drive (${new Date(file.modifiedTime).toLocaleDateString('es-CR')})`, 'success');
    driveReady = true; if (autoBackup._pending) autoBackup();
    return true;
  } catch(e) { return false; }
  finally { loadFromDrive._busy = false; if (!driveReady && driveBackupChecked) { driveReady = true; if (autoBackup._pending) autoBackup(); } }
}
let driveBackupChecked = false;   // true cuando Drive respondió (haya o no respaldo)
// Claves locales que también viajan en el respaldo de Drive
const LOCAL_BACKUP_RX = /^dcd_(ver_|vsnap_|comun_|word_|mail)/;
function localBackupBlob(){ const o={}; try{ for (let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if (LOCAL_BACKUP_RX.test(k)) o[k]=localStorage.getItem(k); } }catch(e){} return o; }

async function saveToDrive() {
  if (!gAccessToken) return;
  if (!driveReady) { autoBackup._pending = true; if (!loadFromDrive._busy) { driveLoadedOnce = true; loadFromDrive(); } return; }
  autoBackup._pending = false;
  const backup = {
    version: 2,
    savedAt: new Date().toISOString(),
    projects,
    customPrompts,
    maestroData,
    office: (()=>{ try{ return JSON.parse(localStorage.getItem('dcd_office')||'null'); }catch(e){ return null; } })(),
    local: localBackupBlob()
  };
  const json = JSON.stringify(backup);
  const blob = new Blob([json], { type: 'application/json' });

  try {
    if (!driveBackupFileId) {
      // Check if file exists from a previous session
      const existing = await findBackupFile();
      driveBackupFileId = existing?.id || null;
    }

    if (driveBackupFileId) {
      // Update existing file
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${driveBackupFileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer '+gAccessToken, 'Content-Type': 'application/json' },
        body: blob
      });
    } else {
      // Create new file
      const meta = { name: DRIVE_BACKUP_NAME, mimeType: 'application/json' };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(meta)], {type:'application/json'}));
      form.append('file', blob);
      const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: 'Bearer '+gAccessToken },
        body: form
      });
      const created = await r.json();
      driveBackupFileId = created.id;
    }
    // Show subtle indicator
    const lbl = document.getElementById('save-lbl');
    if (lbl) { lbl.textContent = '☁ Respaldo en Drive'; lbl.classList.add('show'); setTimeout(()=>lbl.classList.remove('show'),2000); }
  } catch(e) { console.warn('Drive backup failed:', e); }
}

// Auto-backup every time local data changes
function autoBackup() {
  clearTimeout(autoBackup._t);
  autoBackup._t = setTimeout(saveToDrive, 2000); // debounce 2s
}

function googleSignOut() {
  if (gAccessToken) google.accounts.oauth2.revoke(gAccessToken, ()=>{});
  gAccessToken = null;
  gUserInfo = null;
  clearTimeout(tokenTimer);
  localStorage.removeItem('dcd_gtoken');
  localStorage.removeItem('dcd_gtoken_exp');
  localStorage.removeItem('dcd_guser');
  renderNavAuth();
  updateSheetsStatusAll();
  toast('Sesión de Google cerrada','');
}

function renderNavAuth() {
  const nav = document.getElementById('nav-auth');
  const prompt = document.getElementById('google-prompt');
  const initial = escHtml(((gUserInfo?.given_name||gUserInfo?.name||gUserInfo?.email||'?')[0]||'?').toUpperCase());
  const avatar = gUserInfo?.picture
    ? `<img src="${escHtml(gUserInfo.picture)}" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createTextNode('${initial}'))">`
    : initial;
  if (gUserInfo && gAccessToken) {
    nav.innerHTML = `
      <div class="auth-user" title="${escHtml(gUserInfo.email||'')}">
        <div class="auth-avatar">${avatar}</div>
        <span>${escHtml(gUserInfo.name||gUserInfo.email||'')}</span>
        <span class="auth-sign-out" onclick="googleSignOut()" title="Cerrar sesión y olvidar esta cuenta">Salir</span>
      </div>`;
    if (prompt) prompt.style.display='none';
  } else if (gUserInfo) {
    // Usuario recordado: un clic para reconectar, sin elegir cuenta ni dar permisos de nuevo
    nav.innerHTML = `
      <div class="auth-user" title="${escHtml(gUserInfo.email||'')}">
        <div class="auth-avatar">${avatar}</div>
        <button class="btn-google" onclick="googleSignIn()">Continuar como ${escHtml(userFirstName())}</button>
        <span class="auth-sign-out" onclick="googleSignOut()" title="Olvidar esta cuenta">Otra cuenta</span>
      </div>`;
    if (prompt) prompt.style.display=loginSkipped()?'none':'flex';
  } else {
    nav.innerHTML = `<button class="btn-google" onclick="googleSignIn()">
      <svg viewBox="0 0 24 24" width="17" height="17"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      Conectar Google
    </button>`;
    if (prompt) prompt.style.display=loginSkipped()?'none':'flex';
  }
  try{ renderLobby(); paintHello(); }catch(e){}
}

function activeScreenId(){ return document.querySelector('.screen.active')?.id || ''; }
function reconnectGoogle(){ googleSignIn(); }
function updateSheetsStatusAll() {
  const connected = !!(gAccessToken && gUserInfo);
  // Pastillas de estado: sin conexión se vuelven un botón para reconectar ahí mismo
  ['sheets-status','course-sheets-status'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    el.classList.toggle('reconnect', !connected);
    el.title = connected ? '' : 'Reconectar con Google sin salir de esta pantalla';
    el.onclick = connected ? null : reconnectGoogle;
  });
  // Aviso fijo en cualquier pantalla que no sea el inicio
  let bar=document.getElementById('auth-banner');
  if(!bar){ bar=document.createElement('div'); bar.id='auth-banner'; document.body.appendChild(bar); }
  const showBar = !connected && activeScreenId() && activeScreenId()!=='screen-home';
  bar.style.display = showBar ? 'flex' : 'none';
  if (showBar) bar.innerHTML = `<span>La sesión de Google se desconectó. Lo que tenés en pantalla sigue guardado.</span><button class="btn btn-primary btn-sm" onclick="reconnectGoogle()">${gUserInfo?'Reconectar como '+escHtml(userFirstName()):'Conectar con Google'}</button>`;
  // project screen
  const dot = document.getElementById('sheets-dot');
  const txt = document.getElementById('sheets-status-txt');
  if (dot) dot.className = 'sheets-dot'+(connected?' connected':'');
  if (txt) txt.textContent = connected ? ('Conectado · '+gUserInfo.email) : '⟳ Reconectar Google';
  // course screen
  const cdot = document.getElementById('course-sheets-dot');
  const ctxt = document.getElementById('course-sheets-txt');
  if (cdot) cdot.className = 'sheets-dot'+(connected?' connected':'');
  if (ctxt) ctxt.textContent = connected ? '✓ Sheets conectado' : '⟳ Reconectar Google';
  const pbtn = document.getElementById('push-btn');
  if (pbtn) pbtn.title = connected ? '' : 'Inicia sesión con Google para escribir en Sheets';
}
