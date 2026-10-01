import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,act,scene,availableActions,completed,townNotices,epilogue,JOBS} from '../assets/story.js';
import {validateSave} from '../assets/save.js';import {doJob} from './routes.mjs';
const orders=[['bell','mill','pie'],['bell','pie','mill'],['mill','bell','pie'],['mill','pie','bell'],['pie','bell','mill'],['pie','mill','bell']];
for(const bell of JOBS.bell.endings)for(const mill of JOBS.mill.endings)for(const pie of JOBS.pie.endings){
  test(`all orders finish without dead ends: bell=${bell}, mill=${mill}, pie=${pie}`,()=>{
    for(const order of orders){let s=newGame();const outcomes={bell,mill,pie};for(const job of order){s=doJob(s,job,outcomes[job]);assert.deepEqual(validateSave(s),s);assert.ok(availableActions(s).length>0);}
      assert.equal(completed(s),3);assert.deepEqual(Object.fromEntries(Object.entries(s.jobs).map(([k,j])=>[k,j.outcome])),outcomes);assert.ok(townNotices(s).length>=4);assert.equal(epilogue(s).paragraphs.length,3);
      s=act(s,'travel:square');s=act(s,'after:meeting');assert.equal(s.flags.meeting,true);s=act(s,'travel:inn');const coins=s.coins;s=act(s,'rest:morning');assert.equal(s.coins,coins);assert.equal(completed(s),3);assert.ok(s.day>1);assert.deepEqual(validateSave(s),s);
    }
  });
}
test('actions are immutable and invalid/remote/repeated rewards are rejected',()=>{
  const old=newGame();assert.throws(()=>act(old,'finish:pie:sell'));assert.throws(()=>act(old,'inspect:bell'));const s=act(old,'accept:bell');assert.equal(old.jobs.bell.stage,'posted');assert.equal(s.jobs.bell.stage,'active');assert.throws(()=>act(s,'accept:bell'));
  const done=doJob(newGame(),'pie','sell');assert.throws(()=>act(done,'finish:pie:sell'));assert.throws(()=>act(done,'finish:pie:invented'));
});
test('every job changes notices, recurring locals and outcome prose',()=>{
  const variants=[];for(const outcome of JOBS.pie.endings){let s=doJob(newGame(),'pie',outcome);s=act(s,'travel:inn');s=act(s,'talk:mera');variants.push([townNotices(s).join(''),s.last.body,s.coins,JSON.stringify(s.items)].join('|'));}assert.equal(new Set(variants).size,3);
});
test('pie permit changes repair reward; a shared slice can negotiate the bell',()=>{
  const withPermit=doJob(doJob(newGame(),'pie','sell'),'mill','repair');const afterPie=doJob(newGame(),'pie','sell');assert.equal(withPermit.coins-afterPie.coins,10);
  const s=doJob(doJob(newGame(),'pie','share'),'bell','gentle');assert.ok(!s.items.includes('slice'));assert.ok(s.items.includes('button'));
});
test('earlier bell changes the mill investigation and optional lantern changes a clue',()=>{
  let s=doJob(newGame(),'bell','loud');s=act(s,'travel:square');s=act(s,'accept:mill');s=act(s,'travel:mill');s=act(s,'inspect:mill');assert.match(s.last.body,/woken her twice/);
  let light=act(newGame(),'travel:inn');light=act(light,'buy:lantern');light=act(light,'travel:square');light=act(light,'accept:mill');light=act(light,'travel:mill');light=act(light,'inspect:toolbox');assert.match(light.last.body,/lantern reveals/);assert.equal(light.coins,0);
});
test('zero-crown adventurer can finish all jobs; injuries heal free',()=>{
  let s=act(newGame(),'travel:inn');s=act(s,'buy:lantern');assert.equal(s.coins,0);s=doJob(s,'mill','force');assert.equal(s.wounded,true);s=act(s,'travel:inn');const coins=s.coins;s=act(s,'rest:tea');assert.equal(s.coins,coins);assert.equal(s.wounded,false);s=doJob(s,'bell','quiet');s=doJob(s,'pie','return');assert.equal(completed(s),3);
});
test('aftercare changes the world but preserves original decisions and pays no duplicate rewards',()=>{
  let s=doJob(newGame(),'bell','loud');s=act(s,'travel:tower');s=act(s,'after:bell');assert.equal(s.jobs.bell.outcome,'loud');assert.match(scene(s).paragraphs.join(''),/one small, clear note/);assert.throws(()=>act(s,'after:bell'));
  s=doJob(s,'mill','force');s=act(s,'after:mill');assert.equal(s.jobs.mill.outcome,'force');assert.equal(s.flags.millMended,true);assert.throws(()=>act(s,'after:mill'));
  s=doJob(s,'pie','sell');s=act(s,'travel:inn');const before=s.coins;s=act(s,'after:pie');assert.equal(s.coins,before-4);assert.equal(s.jobs.pie.outcome,'sell');assert.match(scene(s).paragraphs.join(''),/replacement pie/);assert.throws(()=>act(s,'after:pie'));
});
test('amends has a labour route when crowns are insufficient',()=>{
  let s=doJob(newGame(),'pie','sell');s.coins=0;s=act(s,'travel:inn');const day=s.day;s=act(s,'after:pie');assert.equal(s.coins,0);assert.equal(s.day,day+1);assert.equal(s.flags.pieAmends,true);assert.match(s.last.body,/morning/);
});
test('in-progress acceptance clues and choices always expose a next step',()=>{
  let s=newGame();for(const job of Object.keys(JOBS)){s=act(s,`accept:${job}`);}assert.equal(completed(s),0);assert.ok(availableActions(s).some(a=>a.id==='travel:inn'));s=act(s,'travel:tower');assert.ok(scene(s).actions.some(a=>a.id==='inspect:bell'));
});
