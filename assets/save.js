import { VERSION, LOCATIONS, ITEMS, CLUES, JOBS, newGame } from './story.js';
export const SAVE_KEY = 'briarwick.story.v1';
const bounded = (v,min,max) => Number.isInteger(v)&&v>=min&&v<=max;
const validText = (v,max) => typeof v==='string'&&v.length<=max;
export function validateSave(value) {
  if(!value||typeof value!=='object'||value.version!==VERSION)throw new Error('This save is damaged or belongs to a different version.');
  if(!LOCATIONS.includes(value.location)||!bounded(value.day,1,999)||!bounded(value.coins,0,9999)||!bounded(value.kindness,-20,50)||!bounded(value.firmness,0,30)||typeof value.wounded!=='boolean'||!bounded(value.turns,0,100000))throw new Error('This save contains invalid adventure state.');
  for(const [key,allowed] of [['items',Object.keys(ITEMS)],['clues',Object.keys(CLUES)]]) {
    if(!Array.isArray(value[key])||value[key].length>allowed.length||new Set(value[key]).size!==value[key].length||value[key].some(v=>!allowed.includes(v)))throw new Error('This save contains unknown items or clues.');
  }
  const jobs={};
  for(const [key,definition]of Object.entries(JOBS)) {
    const j=value.jobs?.[key];if(!j||!['posted','active','found','done'].includes(j.stage)||(j.stage==='done'?!definition.endings.includes(j.outcome):j.outcome!==null))throw new Error('This save contains an invalid job.');
    jobs[key]={stage:j.stage,outcome:j.outcome};
  }
  const flags={};for(const key of Object.keys(newGame().flags)){if(typeof value.flags?.[key]!=='boolean')throw new Error('Invalid town memory.');flags[key]=value.flags[key];}
  if((flags.bellGentled&&jobs.bell.outcome!=='loud')||(flags.millMended&&jobs.mill.outcome!=='force')||(flags.pieAmends&&jobs.pie.outcome!=='sell')||((flags.meeting||flags.fedNettle)&&Object.values(jobs).some(j=>j.stage!=='done')))throw new Error('Inconsistent town memory.');
  if(!Array.isArray(value.journal)||value.journal.length>100||value.journal.some(e=>!validText(e?.id,120)||!validText(e?.title,200)||!validText(e?.body,6000)||!bounded(e.day,1,999)))throw new Error('Invalid journal.');
  if(value.last!==null&&(!validText(value.last?.title,200)||!validText(value.last?.body,6000)))throw new Error('Invalid story text.');
  // Unknown fields are discarded; imported JSON never supplies code or markup.
  return {version:VERSION,location:value.location,day:value.day,coins:value.coins,kindness:value.kindness,firmness:value.firmness,wounded:value.wounded,items:[...value.items],clues:[...value.clues],jobs,flags,journal:value.journal.map(e=>({id:e.id,title:e.title,body:e.body,day:e.day})),last:value.last?{title:value.last.title,body:value.last.body}:null,turns:value.turns};
}
export function loadSave(storage) {
  try {
    const raw=storage.getItem(SAVE_KEY);
    if(raw===null)return {state:newGame(),mode:'new',message:'Your story will save in this browser.'};
    if(raw.length>100000)throw new Error('Oversized save.');
    return {state:validateSave(JSON.parse(raw)),mode:'saved',message:'Your story has been restored.'};
  } catch(e) {
    // Never overwrite a corrupt/unsupported existing save automatically.
    let existing=false;try{existing=storage.getItem(SAVE_KEY)!==null;}catch{return{state:newGame(),mode:'memory',message:'Browser saving is unavailable. Export your story from the save menu to keep it.'};}
    return {state:newGame(),mode:existing?'protected':'memory',message:existing?'Your old save could not be read. It will not be overwritten. Export this session or explicitly reset it in the save menu.':'Browser saving is unavailable. Export your story to keep it.'};
  }
}
export function saveGame(state,storage,protectedSave=false) {
  if(protectedSave)return{ok:false,message:'Your old save is protected. This session can be exported.'};
  try{storage.setItem(SAVE_KEY,JSON.stringify(validateSave(state)));return{ok:true,message:'Saved in this browser'};}catch{return{ok:false,message:'Not saved to this browser. Export your story to keep it.'};}
}
export function parseImport(text) {
  if(typeof text!=='string'||text.length>100000)throw new Error('Save file is too large.');
  try{return validateSave(JSON.parse(text));}catch(e){throw new Error(e instanceof SyntaxError?'This file is not a valid JSON save.':e.message);}
}
