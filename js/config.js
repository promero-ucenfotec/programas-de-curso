/* Configuración de Google y estado global de la app */
/* ══════════════════════════════════════════════════════
   GOOGLE OAUTH CONFIG
   ─────────────────────────────────────────────────────
   Para activar la escritura en Sheets debes:
   1. Ir a https://console.cloud.google.com
   2. Crear un proyecto → Habilitar "Google Sheets API"
   3. Crear credenciales → OAuth 2.0 → Tipo: Aplicación web
   4. Agregar origen autorizado: el dominio donde sirves este HTML
      (o http://localhost:PORT para pruebas)
   5. Reemplazar el CLIENT_ID de abajo con el tuyo.
══════════════════════════════════════════════════════ */
const GOOGLE_CLIENT_ID = '204310820162-phq4d7grasopg952prts474vdl9vepfl.apps.googleusercontent.com';
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.compose';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const SHEETS_SCOPE = 'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

/* ══════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════ */
let projects = [];
let currentProject = null;
let currentCourse = null;
let currentSection = null;
let allCourses = [];
let maestroData = {};
let gAccessToken = null;
let gUserInfo = null;
let customPrompts = {};  // { promptKey: overrideText }

try { projects = JSON.parse(localStorage.getItem('dcd_projects')||'[]'); } catch(e){}
try { maestroData = JSON.parse(localStorage.getItem('dcd_maestro')||'{}'); } catch(e){}
try { gAccessToken = localStorage.getItem('dcd_gtoken')||null; } catch(e){}
try { gUserInfo = JSON.parse(localStorage.getItem('dcd_guser')||'null'); } catch(e){}
// Perfil guardado sin nombre ni correo (versión anterior): se descarta
if (gUserInfo && !gUserInfo.email && !gUserInfo.name) { gUserInfo = null; try{localStorage.removeItem('dcd_guser');}catch(e){} }
// El token de Google dura una hora: si ya venció, se descarta pero se recuerda al usuario
try {
  const exp = parseInt(localStorage.getItem('dcd_gtoken_exp')||'0');
  if (gAccessToken && (!exp || Date.now() > exp - 60000)) { gAccessToken = null; localStorage.removeItem('dcd_gtoken'); }
} catch(e){}
try { customPrompts = JSON.parse(localStorage.getItem('dcd_prompts')||'{}'); } catch(e){}
