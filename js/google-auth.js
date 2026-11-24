/* Inicio de sesión con Google (OAuth) */
/* ══════════════════════════════════════════════════════
   GOOGLE IDENTITY SERVICES (OAuth)
══════════════════════════════════════════════════════ */
let tokenClient = null;

function initGoogleAuth() {
  if (!window.google?.accounts?.oauth2) {
    // Library not yet loaded, retry
    setTimeout(initGoogleAuth, 500);
    return;
  }
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SHEETS_SCOPE,
    include_granted_scopes: true,   // conserva Drive y Gmail si ya se habían aceptado
    callback: onTokenReceived,
  });
  renderNavAuth();
  if (gAccessToken) scheduleTokenExpiry();
}

let afterTokenFn = null;   // acción que se reanuda cuando vuelve el token
let driveLoadedOnce = false;
let driveReady = false;        // no se sube el respaldo hasta haber leído el de Drive (evita pisarlo con datos viejos)
// Con un token guardado de una sesión anterior, el respaldo de Drive se lee al abrir la app
function googleSignIn(after) {
  if (!tokenClient) { toast('Google Identity Services no cargó aún. Intenta de nuevo.','error'); return; }
  if (typeof after === 'function') afterTokenFn = after;
  // Si ya te conoce, no vuelve a pedir permisos ni a elegir cuenta
  const opts = gUserInfo?.email ? { prompt: '', hint: gUserInfo.email } : { prompt: '' };
  tokenClient.requestAccessToken(opts);
}

function userFirstName(){
  const u=gUserInfo||{};
  return u.given_name || (u.name||'').split(' ')[0] || (u.email||'').split('@')[0] || '';
}

let tokenTimer=null;
function scheduleTokenExpiry(){
  clearTimeout(tokenTimer);
  const exp=parseInt(localStorage.getItem('dcd_gtoken_exp')||'0');
  if(!exp) return;
  tokenTimer=setTimeout(()=>{
    gAccessToken=null; localStorage.removeItem('dcd_gtoken');
    renderNavAuth(); updateSheetsStatusAll();
    toast('La sesión de Google venció. Tocá "Reconectar" (arriba) para seguir donde estabas.','');
  }, Math.max(0, exp-Date.now()-60000));
}

function onTokenReceived(resp) {
  if (resp.error) { toast('Error al autenticar: '+resp.error,'error'); return; }
  gAccessToken = resp.access_token;
  localStorage.setItem('dcd_gtoken', gAccessToken);
  if (/gmail\.compose/.test(resp.scope||'')) localStorage.setItem('dcd_gmail_ok','1');
  if (resp.scope!==undefined){ if (/gmail\.modify/.test(resp.scope||'')) localStorage.setItem('dcd_gmailr_ok','1'); else localStorage.removeItem('dcd_gmailr_ok'); }
  // El permiso de Drive se revisa en cada token: si el token nuevo no lo trae, se vuelve a pedir antes de subir
  if (resp.scope!==undefined){ if (/auth\/drive(\s|$)/.test(resp.scope||'')) localStorage.setItem('dcd_drive_ok','1'); else localStorage.removeItem('dcd_drive_ok'); }
  localStorage.setItem('dcd_gtoken_exp', String(Date.now() + (parseInt(resp.expires_in)||3600)*1000));
  scheduleTokenExpiry();
  // Fetch user profile
  fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: 'Bearer '+gAccessToken }
  }).then(r=>r.ok?r.json():{}).catch(()=>({})).then(info=>{
    if (info && (info.email || info.name)) gUserInfo = info;
    else gUserInfo = gUserInfo || { name: 'Cuenta de Google' };
    localStorage.setItem('dcd_guser', JSON.stringify(gUserInfo));
    renderNavAuth();
    toast('✓ Conectado como '+(gUserInfo.name||gUserInfo.email),'success');
    updateSheetsStatusAll();
    // Acción pendiente (por ejemplo, el borrador de Gmail): se reanuda sin volver al inicio
    const fn = afterTokenFn; afterTokenFn = null;
    if (fn) { try { fn(); } catch(e){ console.error(e); } }
    // Si los cursos no cargaron por la sesión vencida, se vuelven a leer aquí mismo
    if ((activeScreenId()==='screen-project'||activeScreenId()==='screen-office') && !(allCourses||[]).length && currentProject) { try { loadCourses().then(()=>{ if((typeof Office!=='undefined')) Office.refresh(); }); } catch(e){} }
    if (activeScreenId()==='screen-office' && (typeof Office!=='undefined')) Office.refresh();
    // El respaldo de Drive se carga solo la primera vez; al reconectar no toca lo que estás editando
    if (!driveLoadedOnce) {
      driveLoadedOnce = true;
      loadFromDrive().then(loaded => { if (loaded && activeScreenId()==='screen-home') renderProjects(); });
    }
  });
}
