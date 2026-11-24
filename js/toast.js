/* Avisos breves */
/* ══════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════ */
function toast(msg,type=''){
  const el=document.getElementById('toast');
  el.textContent=msg;
  el.className=`toast${type?' t-'+type:''} show`;
  clearTimeout(el._t);
  el._t=setTimeout(()=>el.classList.remove('show'),3200);
}
