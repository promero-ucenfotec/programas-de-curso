/* Constructor del cronograma */
/* ══════════════════════════════════════════════════════
   SCHEDULE BUILDER
══════════════════════════════════════════════════════ */
// Returns "(X%)" label for Finaliza/Realiza verbs based on eva_tabla
function getPctLabel(actName, verb) {
  if (!['Finaliza','Realiza','Entrega'].includes(verb)) return '';
  const sid = currentProject?.sheetId;
  const code = currentCourse?.['Código']||'';
  const saved = maestroData[sid]?.[code]||{};
  const rows = parseEvaTablaText(saved.eva_tabla||'');
  // Find matching row (name substring match)
  const row = rows.find(r => actName.toLowerCase().includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(actName.toLowerCase()));
  if (!row) return '';
  if (row.count > 1) {
    const each = Math.round(row.pct / row.count);
    return `(${each}%)`;
  }
  return `(${row.pct}%)`;
}

function buildSchedule(){
  const sid=currentProject?.sheetId;
  const code=currentCourse?.['Código']||'';
  const saved=maestroData[sid]?.[code]||{};
  const sch=JSON.parse(saved.cronograma||'{}');

  const acts=[];
  ['e1','e2','e3'].forEach(ek=>{if(saved[ek])acts.push(saved[ek].split('\n')[0].trim());});

  // Build module list from: saved modulos text > course sheet data
  const mods=[];
  const sid2=currentProject?.sheetId;
  const code2=currentCourse?.['Código']||'';
  const saved2=maestroData[sid2]?.[code2]||{};

  if(saved2.modulos){
    // Parse from the modulos text block (most complete source)
    const parsedMods = splitModulos(saved2.modulos);
    parsedMods.forEach((m,i)=>mods.push({n:i+1, name:m.name, subtemas:m.subtemas}));
  }

  // Fallback: read from course Base sheet columns
  if(!mods.length){
    for(let i=1;i<=7;i++){
      const k=`Modulo${i}`;
      if(currentCourse?.[k]) mods.push({n:i, name:currentCourse[k], subtemas:[]});
    }
  }
  if(!mods.length) mods.push({n:1, name:'Módulo 1', subtemas:[]});

  const cont=document.getElementById('sch-rows');
  cont.innerHTML='';

  for(let s=1;s<=14;s++){
    const d=sch[s]||{};
    const row=document.createElement('div');row.className='sch-row';

    const modOpts=mods.map(m=>`<option value="${m.n}" data-name="${escAttr(m.name)}" data-subs="${escAttr((m.subtemas||[]).join('\n'))}" ${d.mod==m.n?'selected':''}>${m.name.slice(0,55)}</option>`).join('');
    const actOpts=acts.map(a=>`<option value="${a}" ${d.actName===a?'selected':''}>${a.slice(0,34)}</option>`).join('');
    const verbOpts=['Inicia','Continúa','Finaliza','Entrega','Realiza'].map(v=>`<option value="${v}" ${d.verb===v?'selected':''}>${v}</option>`).join('');

    row.innerHTML=`
      <div class="sch-sess">S${s}</div>
      <div class="sch-drop">
        <select id="sm${s}" class="sch-sel"><option value="">— Módulo —</option>${modOpts}</select>
        <textarea id="ss${s}" class="sch-ta" placeholder="Subtemas de la sesión…" rows="2">${d.sub||''}</textarea>
      </div>
      <div class="sch-drop">
        ${s>=2?`<select id="sa${s}" class="sch-sel"><option value="">— Actividad —</option>${actOpts}<option value="__study__">Estudio independiente</option></select>
        <select id="sv${s}" class="sch-sel"><option value="">— Verbo —</option>${verbOpts}</select>`
        :`<div style="font-size:11px;color:var(--ink4);padding-top:8px">Primera sesión — sin actividad</div>`}
      </div>
      <div>
        <textarea id="sn${s}" class="sch-ta" placeholder="Texto para el cronograma…" rows="3">${d.note||''}</textarea>
      </div>`;
    cont.appendChild(row);

    // Auto-fill for ALL sessions (s=1 gets modSel, s>=2 also gets activity)
    setTimeout(()=>{
      const modSel=document.getElementById('sm'+s);
      const subTA=document.getElementById('ss'+s);
      if(modSel) modSel.addEventListener('change',function(){
        const opt=this.options[this.selectedIndex];
        const subs=(opt&&opt.dataset&&opt.dataset.subs?opt.dataset.subs:'').replace(/_NL_/g,'\n');
        if(subs && subTA && !subTA.value) subTA.value=subs;
      });

      if(s>=2){
        const auto=()=>{
          const a=document.getElementById('sa'+s)?document.getElementById('sa'+s).value:'';
          const v=document.getElementById('sv'+s)?document.getElementById('sv'+s).value:'';
          const n=document.getElementById('sn'+s);
          if(!a||!v||!n||n.value) return;
          const pctLabel=getPctLabel(a,v);
          const actLabel=pctLabel?a+' '+pctLabel:a;
          n.value=a==='__study__'
            ?'Durante las horas de estudio independiente, el estudiante realiza las actividades según las indicaciones del docente.'
            :actLabel+': El estudiante '+v.toLowerCase()+' el desarrollo de '+a.toLowerCase()+' y consulta al docente ante cualquier duda.\nDurante las horas de estudio independiente, el estudiante realiza las actividades según las indicaciones del docente.';
        };
        const sa=document.getElementById('sa'+s);
        const sv=document.getElementById('sv'+s);
        if(sa) sa.addEventListener('change',auto);
        if(sv) sv.addEventListener('change',auto);
      }
    },80);
  }
}

function saveSchedule(){
  const data={};
  for(let s=1;s<=14;s++){
    const modEl=document.getElementById(`sm${s}`);
    const modOpt=modEl?.options[modEl.selectedIndex];
    data[s]={
      mod:modEl?.value||'',
      modName:modOpt?.dataset?.name||modOpt?.text||'',
      sub:document.getElementById(`ss${s}`)?.value||'',
      actName:document.getElementById(`sa${s}`)?.value||'',
      verb:document.getElementById(`sv${s}`)?.value||'',
      note:document.getElementById(`sn${s}`)?.value||''
    };
  }
  const sid=currentProject?.sheetId;
  const code=currentCourse?.['Código']||'';
  if(!maestroData[sid])maestroData[sid]={};
  if(!maestroData[sid][code])maestroData[sid][code]={};
  maestroData[sid][code].cronograma=JSON.stringify(data);
  localStorage.setItem('dcd_maestro',JSON.stringify(maestroData));
  autoBackup();
  renderSecGrid();updateProgress();
  toast('✓ Cronograma guardado','success');
}

function clearSchedule(){
  for(let s=1;s<=14;s++){
    ['sm','ss','sa','sv','sn'].forEach(p=>{
      const el=document.getElementById(`${p}${s}`);
      if(el){if(el.nodeName==='SELECT')el.value='';else el.value='';}
    });
  }
}
