import {DEFAULT_CLASSES} from './defaults.js';
export const VERSION=1,ROLES=['tank','healer','dps'],SAVE_KEY='wow-forever.class-draft.v1';
export const effectiveRole=p=>p.role==='unassigned'?'dps':p.role;
const copy=s=>structuredClone(s);
export function newSetup(){return {version:VERSION,phase:'setup',players:[{id:'p1',name:'',role:'unassigned',dice:null}],classes:copy(DEFAULT_CLASSES),queue:[],picks:[],pending:null,ties:null};}
export function uniformIndex(size,source=()=>crypto.getRandomValues(new Uint32Array(1))[0]){
  if(!Number.isInteger(size)||size<1||size>0x100000000)throw Error('Invalid random range');
  const limit=Math.floor(0x100000000/size)*size;let n;
  do{n=source();if(!Number.isInteger(n)||n<0||n>=0x100000000)throw Error('Invalid random source');}while(n>=limit);
  return n%size;
}
export function canAssign(players,classes){
  const matched=new Map();
  function visit(player,seen){
    for(const c of classes){if(!c.enabled||!c.roles.includes(effectiveRole(player))||seen.has(c.id))continue;seen.add(c.id);
      if(!matched.has(c.id)||visit(matched.get(c.id),seen)){matched.set(c.id,player);return true;}}
    return false;
  }
  return players.every(p=>visit(p,new Set()));
}
export function setupErrors(state,requireDice=false){
  const errors=[],names=new Set(),classes=state.classes.filter(c=>c.enabled);
  if(!state.players.length)errors.push('Add at least one player.');
  for(const p of state.players){const name=p.name.trim();if(!name)errors.push('Every player needs a name.');else if(names.has(name.toLocaleLowerCase()))errors.push('Give each player a different name.');names.add(name.toLocaleLowerCase());}
  if(!classes.length)errors.push('Enable at least one class in Class pools.');
  if(classes.some(c=>!c.name.trim()||!c.roles.length))errors.push('Every enabled class needs a name and at least one eligible role.');
  if(new Set(state.classes.map(c=>c.name.trim().toLocaleLowerCase())).size!==state.classes.length)errors.push('Class names must be unique.');
  if(state.players.length>classes.length)errors.push(`${state.players.length} players need ${state.players.length} different classes; only ${classes.length} are enabled.`);
  for(const role of ROLES){const count=state.players.filter(p=>effectiveRole(p)===role).length,eligible=classes.filter(c=>c.roles.includes(role)).length;
    if(count>eligible)errors.push(`${count} ${role==='dps'?'DPS players':role+'s'} need distinct classes, but only ${eligible} are eligible.`);}
  if(!canAssign(state.players,classes)&&!errors.some(e=>/need|enabled/.test(e)))errors.push('These roles overlap too much to give everyone a different eligible class. Change roles or Class pools.');
  if(requireDice&&state.players.some(p=>p.dice===null))errors.push('Roll a d20 for every player before starting.');
  return [...new Set(errors)];
}
export function tieGroups(state){const groups=new Map();for(const p of state.players){if(p.dice===null)continue;const key=effectiveRole(p)+':'+p.dice;if(!groups.has(key))groups.set(key,{role:effectiveRole(p),dice:p.dice,ids:[]});groups.get(key).ids.push(p.id);}return [...groups.values()].filter(g=>g.ids.length>1).sort((a,b)=>ROLES.indexOf(a.role)-ROLES.indexOf(b.role)||b.dice-a.dice);}
export const HANDS=['rock','paper','scissors'];
export function handWinner(a,b){if(!HANDS.includes(a)||!HANDS.includes(b))throw Error('Unknown hand.');if(a===b)return null;return (HANDS.indexOf(a)+2)%3===HANDS.indexOf(b)?'a':'b';}
function shuffled(ids,random){const next=[...ids];for(let i=next.length-1;i>0;i--){const j=random(i+1);[next[i],next[j]]=[next[j],next[i]];}return next;}
export function makeTies(state,random=uniformIndex){
  const groups=[],matches=[];
  for(const original of tieGroups(state)){let remaining=[...original.ids];const ranking=[],brackets=[];
    while(remaining.length>1){const seed=shuffled(remaining,random);let roundIds=[...seed],round=1;
      while(roundIds.length>1){const winners=[];for(let i=0;i<roundIds.length;i+=2){if(i+1===roundIds.length){winners.push(roundIds[i]);continue;}let winner=null,attempts=0;
          while(!winner){if(++attempts>256)throw Error('Too many drawn hands. Try starting the tournament again.');const aHand=HANDS[random(3)],bHand=HANDS[random(3)],result=handWinner(aHand,bHand);winner=result==='a'?roundIds[i]:result==='b'?roundIds[i+1]:null;matches.push({role:original.role,dice:original.dice,place:ranking.length+1,round,aId:roundIds[i],bId:roundIds[i+1],aHand,bHand,winnerId:winner});}winners.push(winner);}roundIds=winners;round++;}
      const winnerId=roundIds[0];brackets.push({seed,winnerId});ranking.push(winnerId);remaining=remaining.filter(id=>id!==winnerId);
    }
    ranking.push(remaining[0]);groups.push({...original,ranking,brackets});
  }
  return groups.length?{groups,matches,seen:0}:null;
}
export function draftOrder(state){const rank={tank:0,healer:1,dps:2};return state.players.map((p,index)=>({...p,index})).sort((a,b)=>{const main=rank[effectiveRole(a)]-rank[effectiveRole(b)]||(b.dice??0)-(a.dice??0);if(main)return main;const group=state.ties?.groups.find(g=>g.role===effectiveRole(a)&&g.dice===a.dice);return group?group.ranking.indexOf(a.id)-group.ranking.indexOf(b.id):a.index-b.index;}).map(p=>p.id);}
export function rollPlayer(state,id,random=uniformIndex){if(state.phase!=='setup')throw Error('Edit setup to change the rolls.');const next=copy(state),p=next.players.find(p=>p.id===id);if(!p)throw Error('Unknown player.');p.dice=random(20)+1;return next;}
export function rollAll(state,random=uniformIndex){if(state.phase!=='setup')throw Error('Edit setup to change the rolls.');const next=copy(state);next.players.forEach(p=>p.dice=random(20)+1);return next;}
export function startDraft(state,random=uniformIndex){if(state.phase!=='setup')throw Error('Draft already started.');const errors=setupErrors(state,true);if(errors.length)throw Error(errors.join(' '));const next=copy(state);next.ties=makeTies(next,random);next.queue=draftOrder(next);next.phase=next.ties?'tiebreak':'drafting';return next;}
export function advanceTie(state){if(state.phase!=='tiebreak')throw Error('No tournament is running.');const next=copy(state);next.ties.seen++;if(next.ties.seen===next.ties.matches.length)next.phase='drafting';return next;}
export function finishTies(state){if(state.phase!=='tiebreak')throw Error('No tournament is running.');const next=copy(state);next.ties.seen=next.ties.matches.length;next.phase='drafting';return next;}
export function currentPlayer(state){return state.players.find(p=>p.id===state.queue[state.picks.length])??null;}
export function availableClasses(state){const used=new Set(state.picks.map(p=>p.classId));return state.classes.filter(c=>c.enabled&&!used.has(c.id));}
export function spinPool(state){
  const player=currentPlayer(state);if(!player)return {eligible:[],safe:[],excluded:[]};
  const available=availableClasses(state),later=state.queue.slice(state.picks.length+1).map(id=>state.players.find(p=>p.id===id));
  const eligible=available.filter(c=>c.roles.includes(effectiveRole(player)));
  const safe=eligible.filter(c=>canAssign(later,available.filter(other=>other.id!==c.id)));
  return {eligible,safe,excluded:eligible.filter(c=>!safe.some(s=>s.id===c.id))};
}
export function beginSpin(state,random=uniformIndex){
  if(state.phase!=='drafting'||state.pending)throw Error('A spin is already running or the draft is finished.');
  const pool=spinPool(state).safe;if(!pool.length)throw Error('No safe class is available. Edit the setup.');
  const index=random(pool.length);if(!Number.isInteger(index)||index<0||index>=pool.length)throw Error('Invalid class selection.');
  const next=copy(state);next.pending={playerId:currentPlayer(next).id,classId:pool[index].id,poolIds:pool.map(c=>c.id)};return next;
}
export function finishSpin(state){if(state.phase!=='drafting'||!state.pending)throw Error('No spin to finish.');const next=copy(state);next.picks.push({playerId:next.pending.playerId,classId:next.pending.classId});next.pending=null;if(next.picks.length===next.players.length)next.phase='results';return next;}
export function editSetup(state){const next=copy(state);next.phase='setup';next.players.forEach(p=>p.dice=null);next.queue=[];next.picks=[];next.pending=null;next.ties=null;return next;}
export function resetRolls(state){if(state.phase!=='setup')throw Error('Edit setup first.');return editSetup(state);}
export function resultsText(state){return ['WoW Forever · Class draft',...state.picks.map((pick,i)=>{const p=state.players.find(p=>p.id===pick.playerId),c=state.classes.find(c=>c.id===pick.classId);return `${i+1}. ${p.name} — ${c.name} (${effectiveRole(p)==='dps'?'DPS':effectiveRole(p)}, d20: ${p.dice})`;})].join('\n');}
function validateTies(data,state,fail){
  const originals=tieGroups(state);if(!originals.length){if(data!==null)fail();return null;}
  if(!data||!Array.isArray(data.groups)||data.groups.length!==originals.length||!Array.isArray(data.matches)||data.matches.length>10000||!Number.isInteger(data.seen)||data.seen<0||data.seen>data.matches.length)fail();
  let cursor=0;const groups=[],matches=[];
  for(let gi=0;gi<originals.length;gi++){const original=originals[gi],g=data.groups[gi];if(!g||g.role!==original.role||g.dice!==original.dice||JSON.stringify(g.ids)!==JSON.stringify(original.ids)||!Array.isArray(g.brackets)||g.brackets.length!==original.ids.length-1)fail();
    let remaining=[...original.ids];const ranking=[],brackets=[];
    for(const bracket of g.brackets){if(!bracket||!Array.isArray(bracket.seed)||bracket.seed.length!==remaining.length||new Set(bracket.seed).size!==remaining.length||bracket.seed.some(id=>!remaining.includes(id)))fail();let roundIds=[...bracket.seed],round=1;
      while(roundIds.length>1){const winners=[];for(let i=0;i<roundIds.length;i+=2){if(i+1===roundIds.length){winners.push(roundIds[i]);continue;}let winner=null,attempts=0;
          while(!winner){if(++attempts>256)fail();const m=data.matches[cursor++];if(!m||m.role!==original.role||m.dice!==original.dice||m.place!==ranking.length+1||m.round!==round||m.aId!==roundIds[i]||m.bId!==roundIds[i+1]||!HANDS.includes(m.aHand)||!HANDS.includes(m.bHand))fail();const result=handWinner(m.aHand,m.bHand);winner=result==='a'?m.aId:result==='b'?m.bId:null;if(m.winnerId!==winner)fail();matches.push({role:m.role,dice:m.dice,place:m.place,round:m.round,aId:m.aId,bId:m.bId,aHand:m.aHand,bHand:m.bHand,winnerId:m.winnerId});}winners.push(winner);}roundIds=winners;round++;}
      if(bracket.winnerId!==roundIds[0])fail();brackets.push({seed:[...bracket.seed],winnerId:roundIds[0]});ranking.push(roundIds[0]);remaining=remaining.filter(id=>id!==roundIds[0]);
    }
    ranking.push(remaining[0]);if(JSON.stringify(g.ranking)!==JSON.stringify(ranking))fail();groups.push({...original,ranking,brackets});
  }
  if(cursor!==data.matches.length)fail();return {groups,matches,seen:data.seen};
}
export function parseSave(raw){
  const fail=()=>{throw Error('Saved draft is invalid or uses an unsupported version.');};
  if(typeof raw!=='string'||raw.length>1000000)fail();let data;try{data=JSON.parse(raw);}catch{fail();}
  if(!data||data.version!==VERSION||!['setup','tiebreak','drafting','results'].includes(data.phase)||!Array.isArray(data.players)||data.players.length>32||!Array.isArray(data.classes)||!data.classes.length||data.classes.length>32)fail();
  const id=v=>typeof v==='string'&&/^[a-z0-9_-]{1,48}$/.test(v),name=v=>typeof v==='string'&&v.length<=40;
  const players=data.players.map(p=>{if(!p||!id(p.id)||!name(p.name)||!['unassigned',...ROLES].includes(p.role)||!(p.dice===null||Number.isInteger(p.dice)&&p.dice>=1&&p.dice<=20))fail();return {id:p.id,name:p.name,role:p.role,dice:p.dice};});
  const classes=data.classes.map(c=>{if(!c||!id(c.id)||!name(c.name)||typeof c.enabled!=='boolean'||!/^#[0-9a-f]{6}$/i.test(c.color)||!Array.isArray(c.roles)||c.roles.some(r=>!ROLES.includes(r))||new Set(c.roles).size!==c.roles.length)fail();return {id:c.id,name:c.name,roles:[...c.roles],enabled:c.enabled,color:c.color};});
  if(new Set(players.map(p=>p.id)).size!==players.length||new Set(classes.map(c=>c.id)).size!==classes.length||!Array.isArray(data.queue)||!Array.isArray(data.picks))fail();
  const state={version:VERSION,phase:data.phase,players,classes,queue:[...data.queue],picks:[],pending:null,ties:null};
  if(data.phase==='setup'){if(data.queue.length||data.picks.length||data.pending!==null||data.ties!==null)fail();return state;}
  state.ties=validateTies(data.ties,state,fail);
  if(data.phase==='tiebreak'){if(!state.ties||state.ties.seen===state.ties.matches.length||data.picks.length||data.pending!==null)fail();}else if(state.ties&&state.ties.seen!==state.ties.matches.length)fail();
  if(setupErrors(state,true).length||JSON.stringify(state.queue)!==JSON.stringify(draftOrder(state))||data.picks.length>players.length)fail();
  for(const pick of data.picks){if(!pick||pick.playerId!==state.queue[state.picks.length]||!spinPool(state).safe.some(c=>c.id===pick.classId))fail();state.picks.push({playerId:pick.playerId,classId:pick.classId});}
  if((data.phase==='results')!==(state.picks.length===players.length))fail();
  if(data.pending!==null){const p=data.pending,pool=spinPool(state).safe;if(data.phase!=='drafting'||!p||p.playerId!==currentPlayer(state)?.id||!pool.some(c=>c.id===p.classId)||JSON.stringify(p.poolIds)!==JSON.stringify(pool.map(c=>c.id)))fail();state.pending={playerId:p.playerId,classId:p.classId,poolIds:[...p.poolIds]};}
  return state;
}
export function loadDraft(storage){try{const raw=storage.getItem(SAVE_KEY);if(!raw)return {state:newSetup(),mode:'normal',message:'Saved in this browser.'};let state=parseSave(raw);if(state.phase==='tiebreak'){state=finishTies(state);return {state,mode:'normal',message:'The interrupted tournament was recovered with its original order.'};}if(state.pending){state=finishSpin(state);return {state,mode:'normal',message:'The interrupted spin was recovered with its original result.'};}return {state,mode:'normal',message:'Your draft has been restored.'};}catch(error){return {state:newSetup(),mode:error.message.includes('Saved draft')?'protected':'memory',message:error.message.includes('Saved draft')?'An unreadable saved draft is protected. Reset saved draft to replace it.':'Browser storage is unavailable. Keep this tab open and copy your results.'};}}
export function persistDraft(state,storage,protectedSave=false){if(protectedSave)return {saved:false,message:'An unreadable saved draft is protected. Reset saved draft to replace it.'};try{storage.setItem(SAVE_KEY,JSON.stringify(state));return {saved:true,message:'Saved in this browser.'};}catch{return {saved:false,message:'Could not save in this browser. Keep this tab open and copy your results.'};}}
