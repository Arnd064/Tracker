/* FlashBoard PWA v0.1 — no dependencies, no cloud, no telemetry */
'use strict';
const STORAGE_KEY='flashboard-pwa-v1';
const COLORS=['#4d79eb','#26a993','#e39a50','#9a77d8','#e36b84','#4aa1cb'];
const $=(s)=>document.querySelector(s);
const elMain=$('#main');
const dialog=$('#dialog');
let activeTab='home';
let selectedSubject=null;
let toastTimeout;
const pad=n=>String(n).padStart(2,'0');
const localDate=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const utcDate=s=>new Date(`${s}T12:00:00Z`);
const plusDays=(s,n)=>{const d=utcDate(s);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const dayDelta=(a,b)=>Math.round((utcDate(a)-utcDate(b))/86400000);
const humanDate=s=>s?utcDate(s).toLocaleDateString('fr-FR',{day:'numeric',month:'short',timeZone:'UTC'}):'Non définie';
const longDate=s=>utcDate(s).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const initial=()=>({version:1,settings:{dailyMinutes:150},subjects:[],chapters:[],exams:[],sessions:[]});
function load(){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return initial();const v=JSON.parse(raw);if(!validate(v))return initial();return v;}catch(err){console.warn('FlashBoard: storage unreadable',err);return initial();}}
function validate(v){return v&&v.version===1&&v.settings&&typeof v.settings.dailyMinutes==='number'&&Array.isArray(v.subjects)&&Array.isArray(v.chapters)&&Array.isArray(v.exams)&&Array.isArray(v.sessions);}
let db=load();
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(db));render();return true;}catch(err){toast('Stockage saturé : exporte une sauvegarde.');return false;}}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>t.classList.remove('show'),3400);}
function subjectFor(ch){return db.subjects.find(s=>s.id===ch.subjectId);}
function chapterFor(session){return db.chapters.find(c=>c.id===session.chapterId);}
function examFor(subjectId){return db.exams.filter(e=>e.subjectId===subjectId&&e.date>=localDate()).sort((a,b)=>a.date.localeCompare(b.date))[0]||null;}
function sessionToday(c){return db.sessions.some(s=>s.chapterId===c.id&&s.date===localDate());}
function score(c,reference=localDate()){
 const exam=examFor(c.subjectId);const days=exam?Math.max(0,dayDelta(exam.date,reference)):999;
 const urgency=days===0?65:days<=3?55:days<=7?43:days<=14?28:days<=30?12:0;
 const due=c.nextReview&&dayDelta(c.nextReview,reference)<=0;
 const lateness=due?Math.min(16,Math.abs(dayDelta(c.nextReview,reference))*3):0;
 const stage=c.nextReview? (due?36:-25):23;
 return stage+urgency+lateness+(Number(c.difficulty||3)*4)+(Number(c.importance||3)*3);
}
function candidates(date=localDate()){
 return db.chapters.filter(c=>!c.nextReview||c.nextReview<=date).filter(c=>date!==localDate()||!sessionToday(c)).map(c=>({c,subject:subjectFor(c),due:!!c.nextReview,score:score(c,date)})).sort((a,b)=>b.score-a.score);
}
function plan(date=localDate(),limit=db.settings.dailyMinutes){
 const options=candidates(date);const selected=[];let used=0;
 for(const item of options){const minutes=Math.max(10,Math.min(180,Number(item.c.minutes||30)));if(used+minutes<=limit){selected.push({...item,minutes});used+=minutes;}}
 return {selected,used,left:options.length-selected.length,minutes:limit};
}
function todaySessions(){return db.sessions.filter(s=>s.date===localDate());}
function minutesFor(date){return db.sessions.filter(s=>s.date===date).reduce((a,s)=>a+Number(s.minutes||0),0);}
function timeDisplay(mins){const h=Math.floor(mins/60),m=mins%60;return h?`${h}h${m?String(m).padStart(2,'0'):''}`:`${m} min`;}
function dateStatus(date){const d=dayDelta(date,localDate());return d<0?`J+${Math.abs(d)} · passé`:d===0?"Aujourd'hui":`J-${d}`;}
function empty(title,desc,act,label){return `<div class="empty"><span class="logo-line">✧</span><strong>${title}</strong><p>${desc}</p>${act?`<button class="btn" data-action="${act}">${label}</button>`:''}</div>`;}
function heading(eyebrow,title,desc){return `<section class="intro"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="muted">${desc}</p></section>`;}
function taskMarkup(item){const c=item.c,s=item.subject;return `<div class="task"><div class="task-icon">${item.due?'↻':'✎'}</div><div class="task-main"><strong>${esc(c.name)}</strong><small>${esc(s?.name||'Matière')} · ${item.due?'Révision':'Apprentissage'} · ${item.minutes} min</small></div><button class="btn tiny" data-action="review" data-id="${esc(c.id)}">Démarrer</button></div>`;}
function home(){const d=localDate(),p=plan(),done=todaySessions(),spent=minutesFor(d),completed=done.length,total=p.selected.length+completed;
 const upcoming=db.exams.filter(e=>e.date>=d).sort((a,b)=>a.date.localeCompare(b.date))[0];
 return `${heading(longDate(d),'Prêt à réviser ?','Ton programme s’adapte à tes examens et à ta progression.')}
 <div class="grid-2"><div class="card metric"><div class="muted">Temps réalisé</div><strong>${timeDisplay(spent)}</strong><small class="muted">Objectif : ${timeDisplay(db.settings.dailyMinutes)}</small></div><div class="card metric"><div class="muted">Prochain examen</div><strong>${upcoming?dateStatus(upcoming.date).split(' · ')[0]:'—'}</strong><small class="muted">${upcoming?esc(upcoming.name):'Aucun examen'}</small></div></div>
 <section class="section"><div class="section-head"><h2>Programme du jour</h2><span class="muted">${completed}/${total} sessions</span></div><div class="card">${total?`<div class="progress"><span style="width:${total?Math.min(100,Math.round(completed*100/total)):0}%"></span></div>${p.selected.map(taskMarkup).join('')}${done.map(s=>`<div class="task"><div class="task-icon" style="background:#eaf8f1;color:#16866b">✓</div><div class="task-main"><strong>${esc(chapterFor(s)?.name||'Chapitre supprimé')}</strong><small>Terminé · ${timeDisplay(s.minutes)} · ${esc(ratingLabel(s.rating))}</small></div><span class="chip good">Fait</span></div>`).join('')}`:empty('Une journée à construire','Ajoute des matières et des chapitres pour créer ton premier programme.','add-subject','Ajouter une matière')}
 ${p.left?`<p class="warning spaced">${p.left} autre(s) révision(s) éligible(s) ne rentrent pas dans ton objectif de ${timeDisplay(p.minutes)}. Tu peux augmenter ton budget dans les réglages.</p>`:''}</div></section>
 <section class="section"><div class="section-head"><h2>Accès rapides</h2></div><div class="quick"><button data-action="add-chapter">＋ Nouveau chapitre<span>Organiser une notion</span></button><button data-action="add-exam">◷ Nouvel examen<span>Définir une échéance</span></button><button data-action="open-things">↗ Ouvrir Things<span>Liste Aujourd’hui</span></button><button data-action="settings">⚙ Préférences<span>Temps et sauvegarde</span></button></div></section>
 <section class="section"><div class="note"><strong>FlashRepeat</strong><p>Après chaque séance, note si tu as réussi à retrouver le cours sans aide. FlashBoard programme alors la prochaine révision. Ces intervalles sont expérimentaux et ne remplacent pas le système d’Anki.</p></div></section>`;
}
function subjects(){const entries=db.subjects.map(s=>{const ch=db.chapters.filter(c=>c.subjectId===s.id);return `<div class="card"><div class="subject-card"><span class="subject-dot" style="background:${esc(s.color)}"></span><div class="grow"><h3>${esc(s.name)}</h3><small>${ch.length} chapitre(s) · ${ch.filter(c=>c.nextReview).length} démarré(s)</small></div><button class="btn tiny secondary" data-action="view-subject" data-id="${esc(s.id)}">Voir</button></div></div>`;});
 return `${heading('Ton programme','Matières','Une organisation par matière et par chapitre.')}
 <div class="section-head"><h2>Mes matières</h2><button class="btn tiny" data-action="add-subject">＋ Ajouter</button></div><div class="stack">${entries.length?entries.join(''):empty('Aucune matière','Crée ta première matière pour commencer.', 'add-subject','Créer une matière')}</div>`;}
function subjectDetail(){const s=db.subjects.find(s=>s.id===selectedSubject);if(!s){selectedSubject=null;return subjects();}const chapters=db.chapters.filter(c=>c.subjectId===s.id);const started=chapters.filter(c=>c.nextReview).length;
 return `<div class="section-head"><button class="btn secondary tiny" data-action="back-subjects">← Matières</button><button class="danger-link" data-action="delete-subject" data-id="${esc(s.id)}">Supprimer la matière</button></div>
 ${heading('Matière',esc(s.name),`${started}/${chapters.length} chapitres déjà révisés`)}
 <div class="section-head"><h2>Chapitres</h2><button class="btn tiny" data-action="add-chapter" data-id="${esc(s.id)}">＋ Ajouter</button></div>
 <div class="card">${chapters.length?chapters.map(c=>`<div class="task"><span class="task-icon">${c.nextReview?'↻':'✎'}</span><div class="task-main"><strong>${esc(c.name)}</strong><small>${c.nextReview?'Prochaine révision : '+humanDate(c.nextReview):'Pas encore travaillé'} · ${c.minutes} min</small></div><div class="stack" style="gap:5px"><button class="btn tiny" data-action="review" data-id="${esc(c.id)}">Réviser</button><button class="danger-link" data-action="delete-chapter" data-id="${esc(c.id)}">Supprimer</button></div></div>`).join(''):empty('Pas encore de chapitre','Ajoute les notions que tu souhaites réviser.','add-chapter','Ajouter un chapitre')}</div>`;
}
function exams(){const data=[...db.exams].sort((a,b)=>a.date.localeCompare(b.date));return `${heading('Tes échéances','Examens','Savoir où aller pour mieux répartir les révisions.')}
 <div class="section-head"><h2>Calendrier des examens</h2><button class="btn tiny" data-action="add-exam">＋ Ajouter</button></div><div class="stack">${data.length?data.map(e=>{const s=db.subjects.find(s=>s.id===e.subjectId);return `<div class="card exam-card"><div class="row start"><div><h3>${esc(e.name)}</h3><p class="muted">${esc(s?.name||'Matière supprimée')} · ${humanDate(e.date)}</p></div><span class="chip ${e.date<localDate()?'warn':'good'}">${dateStatus(e.date)}</span></div><div class="card-foot"><button class="btn danger tiny" data-action="delete-exam" data-id="${esc(e.id)}">Supprimer</button></div></div>`;}).join(''):empty('Aucun examen','Ajoute une date pour ajuster les priorités de révision.','add-exam','Ajouter un examen')}</div><p class="hint">Le prototype gère une matière par examen. Les examens pluridisciplinaires viendront dans une prochaine version.</p>`;}
function planning(){const d=localDate();let rows='';for(let i=0;i<7;i++){const day=plusDays(d,i),exams=db.exams.filter(e=>e.date===day),due=db.chapters.filter(c=>c.nextReview===day),notStarted=i===0?db.chapters.filter(c=>!c.nextReview).slice(0,3):[];rows+=`<div class="day-block"><div class="day-title"><span>${i===0?'Aujourd’hui':longDate(day)}</span><small>${due.length+notStarted.length} chapitre(s)</small></div>${exams.map(e=>`<div class="tiny-row"><strong>◷ ${esc(e.name)}</strong><span>Examen</span></div>`).join('')}${due.map(c=>`<div class="tiny-row"><span>↻ ${esc(c.name)}</span><span>Révision</span></div>`).join('')}${notStarted.map(c=>`<div class="tiny-row"><span>✎ ${esc(c.name)}</span><span>À apprendre</span></div>`).join('')}${!exams.length&&!due.length&&!notStarted.length?`<p class="muted" style="font-size:13px">Pas d’échéance définie</p>`:''}</div>`;}
 return `${heading('À venir','Planning','Les révisions à échéance et les examens de cette semaine.')}
 <div class="card">${rows}</div><div class="note section">Les chapitres en retard apparaissent dans le programme du jour. Ce planning affiche les échéances, pas encore une affectation automatique à des créneaux horaires.</div>`;}
function stats(){const dates=Array.from({length:7},(_,i)=>plusDays(localDate(),i-6));const mins=dates.map(minutesFor);const highest=Math.max(30,...mins);const total=db.sessions.reduce((a,s)=>a+Number(s.minutes||0),0);const recent=dates.reduce((a,d)=>a+minutesFor(d),0);const learned=db.chapters.filter(c=>!!c.nextReview).length;
 return `${heading('Ta progression','Suivi','Mesure les séances réellement effectuées, sans confondre durée et maîtrise.')}
 <div class="grid-2"><div class="card metric"><div class="muted">Cette semaine</div><strong>${timeDisplay(recent)}</strong><small class="muted">Temps effectivement enregistré</small></div><div class="card metric"><div class="muted">Séances effectuées</div><strong>${db.sessions.length}</strong><small class="muted">Depuis le début</small></div></div>
 <section class="section card"><h2>Temps de travail · 7 jours</h2><div class="bars">${dates.map((d,i)=>`<div class="bar-slot"><b>${mins[i]?timeDisplay(mins[i]):'—'}</b><span class="bar" style="height:${Math.max(2,Math.round(mins[i]/highest*88))}px"></span><small>${utcDate(d).toLocaleDateString('fr-FR',{weekday:'short',timeZone:'UTC'})}</small></div>`).join('')}</div></section>
 <section class="section card"><h2>Couverture du programme</h2><div class="row spaced"><strong>${learned} sur ${db.chapters.length} chapitres</strong><span class="muted">${db.chapters.length?Math.round(learned/db.chapters.length*100):0}%</span></div><div class="progress"><span style="width:${db.chapters.length?Math.round(learned/db.chapters.length*100):0}%"></span></div><p class="hint">Cette mesure représente uniquement les chapitres déjà travaillés, pas leur maîtrise.</p><div class="divider"></div><div class="row"><span>Total étudié</span><strong>${timeDisplay(total)}</strong></div></section>`;
}
function render(){elMain.innerHTML=activeTab==='home'?home():activeTab==='planning'?planning():activeTab==='subjects'?(selectedSubject?subjectDetail():subjects()):activeTab==='exams'?exams():stats();document.querySelectorAll('[data-tab]').forEach(b=>{const current=b.dataset.tab===activeTab;b.classList.toggle('active',current);b.setAttribute('aria-current',current?'page':'false');});}
function modal(title,body,options={}){dialog.innerHTML=`<div class="modal-head"><h2>${title}</h2><button class="round-btn" data-action="close" aria-label="Fermer">×</button></div>${body}`;dialog.showModal();if(options.focus)setTimeout(()=>dialog.querySelector(options.focus)?.focus(),0);}
function closeModal(){if(dialog.open)dialog.close();}
function field(label,name,type='text',extra=''){return `<div class="field"><label for="fld-${name}">${label}</label><input id="fld-${name}" name="${name}" type="${type}" ${extra} required></div>`;}
function subjectForm(){modal('Nouvelle matière',`<form data-form="subject">${field('Nom de la matière','name','text','maxlength="80" placeholder="Ex. Physiologie"')}<div class="modal-actions"><button type="button" class="btn ghost" data-action="close">Annuler</button><button class="btn" type="submit">Ajouter</button></div></form>`,{focus:'[name=name]'});}
function chapterForm(preselected){if(!db.subjects.length){toast('Crée une matière avant d’ajouter des chapitres.');subjectForm();return;}
 modal('Nouveau chapitre',`<form data-form="chapter"><div class="field"><label for="chapter-subject">Matière</label><select id="chapter-subject" name="subjectId">${db.subjects.map(s=>`<option value="${esc(s.id)}" ${s.id===preselected?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
 ${field('Nom du chapitre','name','text','maxlength="120" placeholder="Ex. Conduction nerveuse"')}
 <div class="grid-2"><div class="field"><label for="minutes">Durée estimée (min)</label><input id="minutes" type="number" name="minutes" value="30" min="10" max="180" required></div><div class="field"><label for="difficulty">Difficulté</label><select name="difficulty" id="difficulty">${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===3?'selected':''}>${n} / 5</option>`).join('')}</select></div></div><div class="field"><label for="importance">Importance à l'examen</label><select name="importance" id="importance">${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===3?'selected':''}>${n} / 5</option>`).join('')}</select></div>
 <div class="modal-actions"><button type="button" class="btn ghost" data-action="close">Annuler</button><button class="btn" type="submit">Ajouter</button></div></form>`,{focus:'[name=name]'});
}
function examForm(){if(!db.subjects.length){toast('Ajoute d’abord une matière.');subjectForm();return;}
 modal('Nouvel examen',`<form data-form="exam">${field('Nom de l’examen','name','text','maxlength="100" placeholder="Ex. Partiel de physiologie"')}
 <div class="field"><label for="exam-subject">Matière concernée</label><select name="subjectId" id="exam-subject">${db.subjects.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select></div>
 ${field('Date de l’examen','date','date',`min="${localDate()}" value="${plusDays(localDate(),14)}"`)}
 <div class="modal-actions"><button type="button" class="btn ghost" data-action="close">Annuler</button><button class="btn" type="submit">Ajouter</button></div></form>`);
}
function ratingLabel(s){return ({again:'À revoir',hard:'Difficile',good:'Correct',easy:'Facile'})[s]||s;}
function reviewForm(chapterId){const c=db.chapters.find(c=>c.id===chapterId);if(!c)return;const s=subjectFor(c);modal(`Séance · ${esc(c.name)}`,`<p class="muted spaced">${esc(s?.name||'Matière')} · Rappel actif : essaie de retrouver les notions de mémoire avant de consulter le cours.</p><form data-form="review" data-id="${esc(c.id)}">
 <div class="field"><label for="review-minutes">Temps réellement travaillé (minutes)</label><input id="review-minutes" type="number" name="minutes" min="1" max="360" value="${c.minutes}" required></div>
 <label style="font-weight:750;font-size:13px">Comment s’est passée la révision ?</label><div class="rating-grid"><button type="submit" name="rating" value="again">À revoir<small>Je n’ai pas retrouvé l’essentiel</small></button><button type="submit" name="rating" value="hard">Difficile<small>Nombreuses hésitations</small></button><button type="submit" name="rating" value="good">Correct<small>L’essentiel sans aide</small></button><button type="submit" name="rating" value="easy">Facile<small>Restitution rapide et juste</small></button></div>
 <p class="hint">Cette évaluation ajuste la prochaine révision du chapitre dans FlashBoard ; elle ne modifie pas tes cartes Anki.</p></form>`);}
function settings(){modal('Réglages et sauvegarde',`<form data-form="settings"><div class="field"><label for="goal">Objectif de travail quotidien (minutes)</label><input type="number" id="goal" min="15" max="720" step="15" name="dailyMinutes" value="${db.settings.dailyMinutes}" required></div><div class="modal-actions"><button type="button" class="btn ghost" data-action="close">Annuler</button><button type="submit" class="btn">Enregistrer</button></div></form>
 <div class="divider"></div><h3>Sauvegarde locale</h3><p class="help spaced">Les données sont enregistrées uniquement dans le stockage de cette application web sur cet appareil. Une suppression des données du site ou de l’application peut les effacer. Exporte régulièrement une sauvegarde.</p>
 <div class="flex spaced"><button class="btn secondary tiny" data-action="export">↧ Exporter en JSON</button><label class="btn ghost tiny" for="import-file">↥ Restaurer JSON</label><input id="import-file" style="display:none" type="file" accept="application/json,.json"></div>
 <div class="divider"></div><h3>Démonstration</h3><p class="help spaced">Pour explorer l'application avec quelques matières fictives (uniquement si elle est vide).</p><button class="btn ghost tiny spaced" data-action="demo">Charger la démonstration</button>`);}
function reviewSchedule(rating,count,day){const base=[1,3,7,14,30,60,90];const easy=[3,7,14,30,60,90,120];let delay=1,n=count||0;
 if(rating==='again'){n=0;delay=1;}else if(rating==='hard'){delay=Math.max(1,Math.floor(base[Math.min(n,base.length-1)]/2));}else if(rating==='good'){delay=base[Math.min(n,base.length-1)];n++;}else{delay=easy[Math.min(n,easy.length-1)];n++;}
 return {nextReview:plusDays(day,delay),count:n};}
function handleForm(e){const form=e.target;if(!form.dataset.form)return;e.preventDefault();const data=new FormData(form);const kind=form.dataset.form;
 if(kind==='subject'){const name=String(data.get('name')||'').trim();if(!name)return;db.subjects.push({id:id(),name,color:COLORS[db.subjects.length%COLORS.length]});activeTab='subjects';selectedSubject=null;}
 if(kind==='chapter'){const name=String(data.get('name')||'').trim(),subjectId=String(data.get('subjectId')||'');if(!name||!db.subjects.some(s=>s.id===subjectId))return;db.chapters.push({id:id(),subjectId,name,minutes:Number(data.get('minutes')),difficulty:Number(data.get('difficulty')),importance:Number(data.get('importance')),nextReview:null,lastReview:null,count:0});activeTab='subjects';selectedSubject=subjectId;}
 if(kind==='exam'){const name=String(data.get('name')||'').trim(),subjectId=String(data.get('subjectId')||''),date=String(data.get('date')||'');if(!name||!db.subjects.some(s=>s.id===subjectId)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date))return;db.exams.push({id:id(),name,subjectId,date});activeTab='exams';}
 if(kind==='settings'){const v=Number(data.get('dailyMinutes'));if(!Number.isFinite(v)||v<15||v>720)return;db.settings.dailyMinutes=v;}
 if(kind==='review'){const c=db.chapters.find(c=>c.id===form.dataset.id);if(!c)return;const submitter=e.submitter;const rating=submitter?.value||'good';if(!['again','hard','good','easy'].includes(rating))return;const mins=Number(data.get('minutes'));if(!Number.isFinite(mins)||mins<1||mins>360)return;const day=localDate();const schedule=reviewSchedule(rating,c.count,day);c.lastReview=day;c.nextReview=schedule.nextReview;c.count=schedule.count;db.sessions.push({id:id(),chapterId:c.id,date:day,minutes:mins,rating});activeTab='home';}
 closeModal();save();toast('Enregistré sur cet appareil.');}
function demo(){if(db.subjects.length||db.chapters.length||db.exams.length){toast('La démo ne peut être chargée que dans une application vide.');return;}const s=['Physiologie','Anatomie','Biochimie'].map((name,i)=>({id:id(),name,color:COLORS[i]}));db.subjects=s;let names=[['Membranes cellulaires','Système cardiovasculaire','Transmission nerveuse'],['Système musculaire','Articulations'],['Métabolisme énergétique','Enzymes']];for(let i=0;i<s.length;i++)for(let j=0;j<names[i].length;j++)db.chapters.push({id:id(),subjectId:s[i].id,name:names[i][j],minutes:25+10*j,difficulty:2+j,importance:3,nextReview:null,lastReview:null,count:0});db.exams=[{id:id(),subjectId:s[0].id,name:'Partiel de physiologie',date:plusDays(localDate(),12)}];closeModal();activeTab='home';save();toast('Démonstration ajoutée.');}
function exportData(){const data=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const url=URL.createObjectURL(data);const a=document.createElement('a');a.href=url;a.download=`FlashBoard-sauvegarde-${localDate()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('Sauvegarde créée : conserve le fichier.');}
function handleAction(e){const button=e.target.closest('[data-action]');if(!button)return;const action=button.dataset.action,key=button.dataset.id;
 if(action==='close'){closeModal();return;}
 if(action==='add-subject')return subjectForm();
 if(action==='add-chapter')return chapterForm(key||selectedSubject);
 if(action==='add-exam')return examForm();
 if(action==='settings')return settings();
 if(action==='view-subject'){activeTab='subjects';selectedSubject=key;render();return;}
 if(action==='back-subjects'){selectedSubject=null;render();return;}
 if(action==='review')return reviewForm(key);
 if(action==='demo')return demo();
 if(action==='export')return exportData();
 if(action==='open-things'){window.location.href='things:///show?id=today';return;}
 if(action==='delete-exam'){if(!confirm('Supprimer cet examen ?'))return;db.exams=db.exams.filter(v=>v.id!==key);save();return;}
 if(action==='delete-chapter'){if(!confirm('Supprimer ce chapitre et son historique de révision ?'))return;db.chapters=db.chapters.filter(v=>v.id!==key);db.sessions=db.sessions.filter(v=>v.chapterId!==key);save();return;}
 if(action==='delete-subject'){if(!confirm('Supprimer cette matière, ses chapitres, ses examens et son historique ?'))return;const ids=new Set(db.chapters.filter(v=>v.subjectId===key).map(v=>v.id));db.subjects=db.subjects.filter(v=>v.id!==key);db.chapters=db.chapters.filter(v=>v.subjectId!==key);db.exams=db.exams.filter(v=>v.subjectId!==key);db.sessions=db.sessions.filter(v=>!ids.has(v.chapterId));selectedSubject=null;save();return;}
}
async function handleImport(e){if(e.target.id!=='import-file')return;const file=e.target.files?.[0];if(!file)return;try{if(file.size>5_000_000)throw Error('Fichier trop volumineux');const imported=JSON.parse(await file.text());if(!validate(imported))throw Error('Format JSON incompatible');if(!confirm('Remplacer les données actuelles par cette sauvegarde ?'))return;db=imported;selectedSubject=null;activeTab='home';closeModal();save();toast('Sauvegarde restaurée.');}catch(err){toast(err.message||'Impossible de lire ce fichier.');}finally{e.target.value='';}}
$('#settings-btn').addEventListener('click',settings);
document.addEventListener('click',handleAction);
document.addEventListener('submit',handleForm);
document.addEventListener('change',handleImport);
document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{activeTab=btn.dataset.tab;if(activeTab!=='subjects')selectedSubject=null;render();window.scrollTo({top:0,behavior:'instant'});}));
dialog.addEventListener('click',event=>{if(event.target===dialog)closeModal();});
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Offline unavailable:',err)));}
render();
