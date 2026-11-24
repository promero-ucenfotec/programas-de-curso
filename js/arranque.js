/* Arranque de la app */
// Se ejecuta cuando ya cargaron todos los archivos de la app
// Con un token guardado de una sesión anterior, el respaldo de Drive se lee al abrir la app
if (gAccessToken) { driveLoadedOnce = true; setTimeout(()=>{ loadFromDrive().then(l=>{ if (l && activeScreenId()==='screen-home') renderProjects(); }); }, 0); }

document.getElementById('modal-add').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal();});
document.getElementById('modal-prompts').addEventListener('click',e=>{if(e.target===e.currentTarget)closePromptEditor();});
document.getElementById('modal-tematicas').addEventListener('click',e=>{if(e.target===e.currentTarget)closeTematicasEditor();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closePromptEditor();closeTematicasEditor();closeClaudeFlow();closeBulkModal();closeGmailDraft();closeRasgosGrupos();closeWordExport();closeRevision();}});

renderProjects();
try{ renderNavAuth(); }catch(e){}
initGoogleAuth();

// Al saltar a una sección, el margen se ajusta a la altura real de la barra de herramientas del curso
try{ const ct=document.querySelector('.course-tools'); if(ct&&window.ResizeObserver) new ResizeObserver(()=>document.documentElement.style.setProperty('--tools-h',ct.offsetHeight+'px')).observe(ct); }catch(e){}

// Asistente de configuración: Escape o clic fuera lo cierran (el avance queda guardado)
document.getElementById('modal-wizard').addEventListener('click',e=>{ if(e.target===e.currentTarget) closeSetupWizard(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape' && document.getElementById('modal-wizard').classList.contains('active')) closeSetupWizard(); });
