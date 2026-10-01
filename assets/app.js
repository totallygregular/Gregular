import { newGame, scene, act, completed, JOBS, ITEMS, CLUES, townNotices, epilogue } from './story.js';
import { loadSave, saveGame, parseImport, SAVE_KEY } from './save.js';
const $=s=>document.querySelector(s);
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paras=text=>String(text).split('\n\n').filter(Boolean).map(p=>`<p>${escape(p)}</p>`).join('');
const PLACE={square:'Market square',inn:'The Crooked Kettle',tower:'Bell tower',mill:'Watermill',marsh:'Reed footbridge'};
const ENDINGS={gentle:'One note is enough',quiet:'A season of quiet',loud:'The official morning returns',repair:'The side channel restored',bargain:'A promise to the river',force:'Working, at a cost',return:'The supper is saved',share:'A longer table',sell:'A profitable private supper'};
let storage;try{storage=window.localStorage;}catch{storage={getItem(){throw new Error('Unavailable');},setItem(){throw new Error('Unavailable');}};}
const loaded=loadSave(storage);let game=loaded.state,protectedSave=loaded.mode==='protected',pendingImport=null;
let saveMessage=loaded.message;
function render(focus=false){
  const current=scene(game);
  $('#day-label').textContent=`Day ${game.day}`;$('#place-label').textContent=PLACE[game.location];$('#coins').textContent=game.coins;
  $('#reputation').textContent=game.kindness>=3?'A welcome face':game.firmness>=2?'A useful nuisance':game.turns>3?'Getting acquainted':'A new face';
  $('#injury').hidden=!game.wounded;$('#job-count').textContent=`${completed(game)} / 3`;$('#journal-count').textContent=game.journal.length;$('#inventory-count').textContent=game.items.length;
  document.querySelectorAll('[data-travel]').forEach(b=>{if(b.dataset.travel===game.location)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  $('#job-list').innerHTML=Object.entries(JOBS).map(([key,j],index)=>{const progress=game.jobs[key];return `<article class="notice-card ${progress.stage==='done'?'done':''}"><div class="notice-meta"><span>NOTICE 0${index+1}</span><span>${progress.stage==='done'?'RESOLVED':progress.stage==='posted'?'WORK AVAILABLE':'IN YOUR JOURNAL'}</span></div><h3>${escape(j.title)}</h3><p>${escape(progress.stage==='done'?ENDINGS[progress.outcome]:j.description)}</p><p class="notice-from">— ${escape(j.from)}</p><div class="notice-bottom">${progress.stage==='done'?'<span class="notice-stamp">SETTLED</span>':`<strong>${escape(j.reward)}</strong>`}${progress.stage==='posted'?`<button class="notice-button" data-job="${key}">${game.location==='square'?'Take this job':'Read in square'} <span aria-hidden="true">↗</span></button>`:progress.stage==='done'?`<button class="notice-button secondary" data-job="${key}">Read the outcome</button>`:`<button class="notice-button secondary" data-job="${key}">Review clue <span aria-hidden="true">↗</span></button>`}</div></article>`;}).join('');
  const news=townNotices(game);$('#notices').innerHTML=(news.length?news:['DUCK OWNERSHIP: one duck per household. A goose is not a loophole.']).map(p=>`<p>${escape(p)}</p>`).join('');
  $('#scene-kicker').textContent=current.kicker;$('#scene-title').textContent=current.title;$('#scene-number').textContent=['I','II','III','IV','V'][['square','inn','tower','mill','marsh'].indexOf(game.location)];$('#speaker').textContent=current.speaker||'';$('#speaker').hidden=!current.speaker;
  $('#scene-text').innerHTML=current.paragraphs.map(p=>`<p>${escape(p)}</p>`).join('');$('#event-panel').hidden=!game.last;
  if(game.last){$('#event-title').textContent=game.last.title;$('#event-text').innerHTML=paras(game.last.body);}
  $('#choices').innerHTML=current.actions.map(a=>`<button class="choice ${a.style}" data-action="${escape(a.id)}"><span><strong>${escape(a.label)}</strong><small>${escape(a.hint)}</small></span><span aria-hidden="true">→</span></button>`).join('');
  $('#completion').hidden=completed(game)!==3;
  if(completed(game)===3){const ending=epilogue(game);$('#completion').innerHTML=`<p class="eyebrow">THREE JOBS. A TOWN CHANGED.</p><h3>${escape(ending.title)}</h3><p>${escape(game.flags.meeting?'Your first adventure is complete. Revisit the town, make amends, and stay for another morning.':'All three jobs are resolved. Attend the meeting in the square to hear what the town remembers.')}</p>`;}
  $('#save-status').textContent=saveMessage;$('#save-explanation').textContent=saveMessage;
  if(focus){$('#scene-title').focus({preventScroll:true});if(matchMedia('(max-width:760px)').matches)$('#scene-title').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});}
}
function perform(id){
  try{game=act(game,id);const result=saveGame(game,storage,protectedSave);saveMessage=result.message;render(true);}catch{$('#save-status').textContent='That choice is no longer available. Your story is unchanged.';}
}
function journal(job=null){
  let html='';
  if(job){const j=JOBS[job],progress=game.jobs[job];html+=`<section class="journal-entry"><p class="eyebrow">${escape(j.from)}</p><h3>${escape(j.title)}</h3><p>${escape(j.description)}</p><p>${escape(progress.stage==='done'?ENDINGS[progress.outcome]:j.hint)}</p></section>`;}
  if(game.clues.length)html+=`<h3>Objects & clues</h3>${game.clues.map(k=>`<section class="clue-entry"><h3>${escape(CLUES[k].title)}</h3><p>${escape(CLUES[k].text)}</p></section>`).join('')}`;
  html+=game.journal.length?`<h3>What happened</h3>${[...game.journal].reverse().map(e=>`<section class="journal-entry"><p class="eyebrow">DAY ${e.day}</p><h3>${escape(e.title)}</h3>${paras(e.body)}</section>`).join('')}`:'<p>A clean page, for now. Take a notice from the square and see where it leads.</p>';
  $('#journal-content').innerHTML=html;$('#journal-dialog').showModal();
}
document.querySelectorAll('[data-travel]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.travel!==game.location)perform(`travel:${b.dataset.travel}`);}));
$('#choices').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)perform(b.dataset.action);});
$('#job-list').addEventListener('click',e=>{const b=e.target.closest('[data-job]');if(!b)return;const k=b.dataset.job;if(game.jobs[k].stage==='posted'){if(game.location!=='square')perform('travel:square');else perform(`accept:${k}`);}else journal(k);});
$('#journal-button').addEventListener('click',()=>journal());
$('#inventory-button').addEventListener('click',()=>{$('#inventory-content').innerHTML=game.items.length?game.items.map(k=>`<section class="inventory-item"><span class="item-symbol" aria-hidden="true">◇</span><div><h3>${escape(ITEMS[k].name)}</h3><p>${escape(ITEMS[k].detail)}</p></div></section>`).join(''):'<p>Your satchel is empty. It is a pleasantly uncomplicated feeling. It probably won’t last.</p>';$('#inventory-dialog').showModal();});
$('#save-button').addEventListener('click',()=>{$('#reset-confirmation').hidden=true;$('#import-confirmation').hidden=true;$('#save-dialog').showModal();});
$('#about-button').addEventListener('click',()=>$('#about-dialog').showModal());
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}));
$('#export-save').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(game,null,2)+'\n'],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`briarwick-day-${game.day}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#import-message').textContent='A copy of your story has been downloaded.';});
$('#reset-request').addEventListener('click',()=>{$('#import-confirmation').hidden=true;$('#reset-confirmation').hidden=false;$('#reset-cancel').focus();});
$('#reset-cancel').addEventListener('click',()=>{$('#reset-confirmation').hidden=true;$('#reset-request').focus();});
$('#reset-confirm').addEventListener('click',()=>{game=newGame();protectedSave=false;saveMessage=saveGame(game,storage).message;$('#save-dialog').close();render(true);});
$('#import-save').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>100000)throw new Error('Save file is too large.');pendingImport=parseImport(await file.text());$('#import-message').textContent=`Valid story: day ${pendingImport.day}, ${completed(pendingImport)} jobs resolved. Confirm to replace this session.`;$('#reset-confirmation').hidden=true;$('#import-confirmation').hidden=false;$('#import-cancel').focus();}catch(error){pendingImport=null;$('#import-message').textContent=error.message;$('#import-confirmation').hidden=true;}e.target.value='';});
$('#import-cancel').addEventListener('click',()=>{pendingImport=null;$('#import-confirmation').hidden=true;$('#import-message').textContent='Import cancelled. Your story is unchanged.';});
$('#import-confirm').addEventListener('click',()=>{if(!pendingImport)return;game=pendingImport;pendingImport=null;protectedSave=false;saveMessage=saveGame(game,storage).message;$('#save-dialog').close();render(true);});
// A second tab may hold a different story. Do not silently replace it on this tab's next action.
addEventListener('storage',e=>{if(e.key===SAVE_KEY){protectedSave=true;saveMessage='Another tab changed the saved story. This tab will not overwrite it. Export this session or reload to continue the saved one.';render();}});
render();
