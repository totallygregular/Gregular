export const VERSION = 1;
export const LOCATIONS = ['square', 'inn', 'tower', 'mill', 'marsh'];
export const ITEMS = {
  button: { name: 'Brass button', detail: 'Polished by a very fussy magpie. An excellent opening offer.' },
  wrench: { name: 'Millwright’s wrench', detail: 'For fixing things. The handle suggests someone has also used it for emphasis.' },
  pie: { name: 'The missing pie', detail: 'A substantial blackberry pie. Everyone seems to have an opinion about its ownership.' },
  slice: { name: 'A wrapped slice', detail: 'Blackberry pie. Diplomacy with a crust.' },
  bread: { name: 'Mera’s bread', detail: 'Still warm. Proof that at least one person approves of you.' },
  permit: { name: 'Sluice permit', detail: 'Hester’s official permission to do what needed doing yesterday.' },
  feather: { name: 'A silver feather', detail: 'A small gift from Nettle. She expects you to understand the distinction between gift and loan.' },
  lantern: { name: 'Pocket lantern', detail: 'A steadier view into dark corners. The flame smells faintly of pears.' }
};
export const CLUES = {
  bell: { title: 'The bell’s thief', text: 'A silver feather and a missing brass clapper. Nettle’s nest is beside the footbridge.' },
  nesting: { title: 'A quieter sort of theft', text: 'The clapper is keeping three hatchlings warm. Nettle isn’t hoarding it; she is parenting.' },
  mill: { title: 'Something under the wheel', text: 'Fen, a river spirit, is holding the wheel still. The old sluice has swallowed her side channel.' },
  bypass: { title: 'The forgotten side channel', text: 'The channel is still there. With the millwright’s wrench you can restore the flow without taking the wheel apart.' },
  pie: { title: 'The blackberry trail', text: 'Crumbs lead from the inn to the footbridge. Ivo’s pig is not a subtle criminal.' }
};
export const JOBS = {
  bell: { title: 'A bell without a voice', from: 'Hester, town clerk', reward: '3–8 crowns', place: 'The old bell tower', description: 'Our morning bell has fallen silent. Some residents have mistaken this for progress. Please investigate.', hint: 'Inspect the bell tower, then follow the feather to the reeds.', endings: ['gentle','quiet','loud'] },
  mill: { title: 'Flour. Preferably today.', from: 'Mera, baker', reward: '5–10 crowns', place: 'The watermill', description: 'The mill has stopped. We are one sack away from serving soup in the bread baskets. Find out what is holding the wheel.', hint: 'Speak to Fen beneath the mill wheel. The toolbox may help.', endings: ['repair','bargain','force'] },
  pie: { title: 'A matter of grave pastry', from: 'Mera, baker', reward: '3–12 crowns', place: 'The inn → the footbridge', description: 'One blackberry pie missing. Intended for the lantern supper. Hester has written “evidence” on the empty plate.', hint: 'Ask Mera about the pie, then follow the crumbs into the reeds.', endings: ['return','share','sell'] }
};
const q = (label, hint, id, style='normal') => ({ label, hint, id, style });
export function newGame() {
  return { version:VERSION, location:'square', day:1, coins:4, kindness:0, firmness:0, wounded:false,
    items:[], clues:[], jobs:Object.fromEntries(Object.keys(JOBS).map(k=>[k,{stage:'posted',outcome:null}])),
    flags:{ introduced:false, bellGentled:false, millMended:false, pieAmends:false, fedNettle:false, meeting:false },
    journal:[], last:null, turns:0 };
}
export const completed = state => Object.values(state.jobs).filter(j=>j.stage==='done').length;
export const has = (state,item) => state.items.includes(item);
const knows = (state,clue) => state.clues.includes(clue);
const active = (s,k) => ['active','found'].includes(s.jobs[k].stage);
const bellMode = s => s.flags.bellGentled ? 'gentle' : s.jobs.bell.outcome;
const millMode = s => s.flags.millMended ? 'repair' : s.jobs.mill.outcome;
const addItem = (s,item) => { if(!has(s,item))s.items.push(item); };
const removeItem = (s,item) => { s.items=s.items.filter(i=>i!==item); };
const addClue = (s,clue) => { if(!knows(s,clue))s.clues.push(clue); };
function record(s,id,title,body) {
  if (!s.journal.some(e=>e.id===id)) s.journal.push({id,title,body,day:s.day});
}
export function townNotices(s) {
  const notices=[];
  if(s.jobs.bell.stage==='done') notices.push(bellMode(s)==='quiet' ? 'MORNINGS NOW BEGIN WHEN YOU ARE READY. Hester would like this recorded as a trial.' : bellMode(s)==='gentle' ? 'THE BELL RINGS ONCE. Please imagine the remaining urgency.' : 'THE BELL IS BACK. Complaints may be submitted after everyone has stopped blinking.');
  if(s.jobs.mill.stage==='done') notices.push(millMode(s)==='bargain' ? 'RIVER ACCESS HOURS: dawn to noon. Fen asks that no one call this “flexible working”.' : millMode(s)==='force' ? 'MILL OPEN. A noise described as “probably fine” is under review.' : 'FLOUR AVAILABLE. The side channel is not a shortcut for laundry.');
  if(s.jobs.pie.stage==='done') notices.push(s.jobs.pie.outcome==='share' ? 'LANTERN SUPPER: smaller slices, longer table. Bring your own chair and no theories.' : s.jobs.pie.outcome==='sell'&&!s.flags.pieAmends ? 'THE LANTERN SUPPER WILL FEATURE BLACKBERRIES, IN A CONCEPTUAL CAPACITY.' : 'LANTERN SUPPER AT THE INN. The pie has survived local government.');
  if(completed(s)===3) notices.push(s.flags.meeting ? 'TOWN MEETING CONCLUDED. The minutes are, against precedent, fewer than the hours.' : 'TOWN MEETING TONIGHT. Three jobs, several consequences, and tea.');
  return notices;
}
export function epilogue(s) {
  const bell=bellMode(s),mill=millMode(s);
  return {
    title: s.kindness>=3 ? 'A place at the long table' : s.firmness>=2 ? 'A useful sort of nuisance' : 'Your name, in the good ledger',
    paragraphs:[
      bell==='quiet' ? 'Briarwick learns that a morning can begin without being announced. Nettle raises three noisy children in a suddenly quiet town.' : bell==='gentle' ? 'The bell rings once at dawn. It is enough. Nettle leaves a silver feather on the sill, where nobody could mistake it for a complaint.' : 'The bell rings at dawn, noon and six. Hester is satisfied. Everyone else is developing an unusually accurate sense of dread.',
      mill==='bargain' ? 'Mera bakes around the river’s hours. Fen clears the channel herself each morning. For the first time in years, the mill and the water agree on something.' : mill==='repair' ? 'The side channel runs clear. Flour returns to the bakery, and Fen’s little reed garden survives. The wrench returns to its box rather more respected.' : 'The mill works, loudly. Its cracked gear needs attention. Fen avoids your boots, and Mera has stopped pretending the noise is ordinary.',
      s.jobs.pie.outcome==='share' ? 'At the supper, nobody gets quite enough pie and everybody gets a seat. Ivo brings three chairs to make up for the pig.' : s.jobs.pie.outcome==='sell'&&!s.flags.pieAmends ? 'Hester enjoys her expensive slice. The public supper makes do with stories. Mera has remembered both the amount you earned and the amount you kept.' : 'The lanterns go up at the inn. Mera cuts the pie—or its replacement—with the care usually reserved for arguments.'
    ],
    closing:'You came looking for work. Briarwick, inconveniently, has become a place you know. Stay a while. The morning after is yours as well.'
  };
}
export function scene(s) {
  const loc=s.location, actions=[], paragraphs=[];
  let title, kicker, speaker=null;
  if(loc==='square') {
    title='The noticeboard';kicker='MARKET SQUARE';
    paragraphs.push(s.flags.introduced ? 'The square has begun to recognise you. A kettle steams through the inn’s open door. Someone has straightened the notices; someone else has added a comment.' : 'Rain glints in the cobbles. Three notices hang beneath a timber roof, beside a stern announcement about improper duck ownership. The inn smells of bread. Somewhere uphill, a bell fails to ring.');
    if(!s.flags.introduced)actions.push(q('Introduce yourself to Hester','The town clerk is attempting to sharpen a pencil with authority.','talk:hester'));
    else actions.push(q('Ask Hester how the town is faring','Her ledger has opinions about your work.','talk:hester'));
    if(completed(s)===3&&!s.flags.meeting)actions.push(q('Attend the evening meeting','Hear what your decisions have made of Briarwick.','after:meeting','primary'));
  }
  if(loc==='inn') {
    title='The Crooked Kettle';kicker='INN & BAKERY';speaker='Mera · baker, publican, keeper of the last clean cup';
    paragraphs.push('Amber light settles on scrubbed tables. Mera has flour on one sleeve and no interest in explaining why. A blackboard promises “soup, unless the mill improves”.');
    paragraphs.push(s.flags.pieAmends ? 'A replacement pie waits under a linen cloth. Mera has set a clean cup beside your chair. The empty plate has finally been put away.' : s.jobs.pie.outcome==='sell' ? 'An empty pie plate occupies the place of honour. Mera turns it slightly towards you. It is a surprisingly effective accusation.' : s.jobs.pie.outcome==='share' ? 'Extra chairs crowd the long table. Mera has written “everyone” on the supper list, then underlined it with feeling.' : s.jobs.pie.outcome==='return' ? 'The recovered pie waits under a linen cloth. Mera pats the loaf she has set aside for you.' : 'The empty pie plate is still here. A neat trail of blackberry crumbs crosses the threshold.');
    actions.push(q('Talk to Mera','Ask what she makes of the bell, the mill, and you.','talk:mera'));
    if(active(s,'pie')&&!knows(s,'pie'))actions.push(q('Ask about the missing pie','Follow a witness statement made mostly of crumbs.','inspect:pie','primary'));
    if(!has(s,'lantern'))actions.push(q('Buy a pocket lantern · 4 crowns','Light for the mill’s dark corners. Optional.', 'buy:lantern'));
    if(s.wounded)actions.push(q('Take Mera’s restorative tea','No charge. She dislikes limping customers.','rest:tea','primary'));
    if(s.jobs.pie.outcome==='sell'&&!s.flags.pieAmends)actions.push(q(s.coins>=4?'Buy a replacement pie · 4 crowns':'Help Mera bake a replacement','Make amends. If you cannot pay, give her a morning.','after:pie'));
    if(completed(s)===3)actions.push(q('Stay for another morning','The jobs remain finished; the town keeps its memory.','rest:morning'));
  }
  if(loc==='tower') {
    title='The old bell tower';kicker='UP THE HILL';
    paragraphs.push('Ivy works patiently at the stone. The bell hangs above an oak door. A narrow view reaches across the mill stream to the footbridge.');
    paragraphs.push(bellMode(s)==='quiet'?'A handwritten notice reads: “No bell until the hatchlings leave.” Beneath it, someone has drawn a sleeping face.':bellMode(s)==='gentle'?'The new rope stop permits one small, clear note. Someone has left a sprig of lavender beside it.':bellMode(s)==='loud'?'The rope is taut and official. Its first pull has already dislodged a small amount of ivy and a large amount of goodwill.':'The rope moves easily. Nothing answers it. A silver feather clings to the latch.');
    if(active(s,'bell')&&!knows(s,'bell'))actions.push(q('Inspect the silent bell','Look at the rope, the latch and what is missing.','inspect:bell','primary'));
    if(s.jobs.bell.outcome==='loud'&&!s.flags.bellGentled)actions.push(q('Fit a gentler rope stop','Change the schedule. Hester can learn to read a clock.','after:bell'));
    actions.push(q('Look across the rooftops','A small town is larger once you know its people.','look:town'));
  }
  if(loc==='mill') {
    title='The watermill';kicker='BESIDE THE MILL STREAM';speaker='Fen · a river spirit with very specific working conditions';
    paragraphs.push(millMode(s)==='repair'?'Clear water threads a restored side channel. The wheel turns evenly. Fen is arranging pebbles in a line that she describes as “not your business”.':millMode(s)==='bargain'?'A chalk timetable hangs beside the wheel. Fen naps at the edge of her reed garden. The mill turns only when the river has agreed to it.':millMode(s)==='force'?'The wheel turns with a stubborn metallic knock. A hairline crack runs through the main gear. Fen watches it without comment, which is worse.':'The stream moves. The wheel does not. Beneath it, a small figure made of river water holds one spoke with the irritated patience of a person holding a door.');
    if(active(s,'mill')&&!knows(s,'mill'))actions.push(q('Find out what is holding the wheel','Approach Fen. Keep your boots out of her garden.','inspect:mill','primary'));
    if(active(s,'mill')&&!has(s,'wrench'))actions.push(q('Open the millwright’s toolbox','A loose hinge, a stout wrench, and a useful old sketch.','inspect:toolbox'));
    if(active(s,'mill')&&knows(s,'mill')) {
      if(has(s,'wrench'))actions.push(q('Restore the forgotten side channel',has(s,'permit')?'Your permit keeps Hester out of the repair.':'Use the wrench and leave Fen’s water alone.','finish:mill:repair','primary'));
      actions.push(q('Agree to share the water',has(s,'slice')?'Offer the pie slice and negotiate honest mill hours.':bellMode(s)==='loud'?'Fen is cross about the bell. Offer labour as well as a promise.':'Make a lasting agreement about when the mill can run.','finish:mill:bargain'));
      actions.push(q('Lever the wheel free','Quick and well paid. Risks a broken gear and a bruised shoulder.','finish:mill:force','danger'));
    }
    if(s.jobs.mill.outcome==='force'&&!s.flags.millMended)actions.push(q('Help Fen mend the cracked gear','Volunteer a morning. The noise, and your reputation, can improve.','after:mill'));
    if(s.jobs.mill.stage==='done')actions.push(q('Speak with Fen','The river has an excellent memory.','talk:fen'));
  }
  if(loc==='marsh') {
    title='The reed footbridge';kicker='A SHORT WALK DOWNSTREAM';speaker='Ivo · watchman, reluctant pig supervisor';
    paragraphs.push('The stream widens into a patch of reeds. The bridge is only four planks long, but Ivo still refers to it as infrastructure. A pie-shaped basket rests beneath his bench.');
    if(bellMode(s)==='quiet'||bellMode(s)==='gentle')paragraphs.push('Nettle peers from her nest with three hatchlings. She recognises you, which is either friendship or a record of debt.');
    else if(bellMode(s)==='loud')paragraphs.push('Nettle’s nest sits empty until the bell has finished. The magpie watches the tower from a branch farther away.');
    if(active(s,'bell')&&knows(s,'bell')&&!knows(s,'nesting'))actions.push(q('Examine Nettle’s nest','The missing clapper glints among three hatchlings.','inspect:nest','primary'));
    if(active(s,'bell')&&knows(s,'nesting')) {
      actions.push(q('Trade for the clapper; ring gently',has(s,'slice')?'Nettle accepts a pie slice. Fit a one-note rope stop.':'Offer the brass button from the tower and change the morning schedule.','finish:bell:gentle','primary'));
      actions.push(q('Leave the clapper with the hatchlings','Declare a temporary season of quiet. Hester will object.','finish:bell:quiet'));
      actions.push(q('Take the clapper and restore the full schedule','The clerk gets her bell. The nest, and Fen, get an interruption.','finish:bell:loud','danger'));
    }
    if(active(s,'pie')&&knows(s,'pie')&&!has(s,'pie'))actions.push(q('Inspect the basket under Ivo’s bench','Question the watchman and the extremely satisfied pig.','inspect:basket','primary'));
    if(active(s,'pie')&&has(s,'pie')) {
      actions.push(q('Bring the pie back to Mera','Keep your word. The lantern supper will go ahead.','finish:pie:return','primary'));
      actions.push(q('Share the pie with the hungry neighbours','Feed the mill workers and Ivo. Keep a slice for diplomacy.','finish:pie:share'));
      actions.push(q('Sell it to Hester for her private supper','A larger reward and an official permit. Mera will notice.','finish:pie:sell','danger'));
    }
    actions.push(q('Talk to Ivo','He claims the pig is only technically his.','talk:ivo'));
    if(completed(s)===3&&has(s,'bread')&&!s.flags.fedNettle)actions.push(q('Leave bread for Nettle','A small kindness after the important business.','after:nettle'));
  }
  return {title,kicker,speaker,paragraphs,actions};
}
export function availableActions(s) {
  return [...scene(s).actions,...LOCATIONS.filter(l=>l!==s.location).map(l=>q(`Travel to ${l}`,'',`travel:${l}`)),
    ...(s.location==='square'?Object.keys(JOBS).filter(k=>s.jobs[k].stage==='posted').map(k=>q(`Accept ${JOBS[k].title}`,'',`accept:${k}`)):[])];
}
export function act(previous,id) {
  if(!availableActions(previous).some(a=>a.id===id))throw new Error('That action is not available here.');
  const s=structuredClone(previous);s.turns++;const p=id.split(':');let title,body;
  if(p[0]==='travel') {s.location=p[1];s.last=null;return s;}
  if(p[0]==='accept') {const k=p[1];s.jobs[k].stage='active';title='A notice, taken';body=`You tuck the notice into your journal. ${JOBS[k].hint} There is no deadline, despite Hester’s handwriting.`;record(s,id,JOBS[k].title,body);}
  if(id==='talk:hester') {s.flags.introduced=true;title='Hester closes the ledger';body=s.jobs.pie.outcome==='sell'?'“A practical person,” she says. “There are occasions when public happiness is best delegated.” You wonder whether Mera has heard this formulation.':bellMode(s)==='quiet'?'“Quiet is not a schedule,” she says. She has nevertheless arrived later, with rather less ink on her cuffs.':s.flags.meeting?'“I have filed the minutes,” she says. “Under: Events Which Surprisingly Improved Things.”':bellMode(s)==='loud'?'“Punctuality restored,” says Hester. A distant window closes with exceptional firmness.':'“Three matters, all small,” says Hester. “Nothing here ever becomes a larger matter until someone has said that.”';}
  if(id==='talk:mera') {title='Mera sets down the cup';body=s.jobs.pie.outcome==='sell'&&!s.flags.pieAmends?'“I hope the crowns were nourishing.” She nods at the empty plate. She will still make you tea; this is what makes it uncomfortable.':s.flags.pieAmends?'“An apology with a crust,” says Mera. “Better than most.” She puts a clean cup in front of you.':s.jobs.pie.outcome==='share'?'“I did not get my pie back,” she says, “but I did get everyone back to the table. I can work with that.”':millMode(s)==='bargain'?'“Half a day’s milling, a whole day’s water. We’ll bake earlier.” She considers this, then adds, “Do not tell Hester I adapted.”':millMode(s)==='force'?'“The flour is here. So is the noise.” Mera places a cup on the table. Its tea trembles in time with the mill.':'“A town is mostly small jobs done for the same people,” says Mera. “And occasionally a pie with political ambitions.”';}
  if(id==='talk:fen') {title='Fen remembers your boots';body=millMode(s)==='bargain'?'“Tomorrow, dawn to noon,” she says. “A promise is simply a bridge you must keep walking over.”':millMode(s)==='repair'?'“You moved the blockage, not me.” A small fish noses past your boots. “An unusual distinction. Thank you.”':'“It turns,” Fen says, watching the cracked gear. “That is not the same thing as being fixed.”';}
  if(id==='talk:ivo') {title='Ivo reviews the evidence';body=s.jobs.pie.outcome==='share'?'“The pig has been excluded from the next committee,” he says. “I have not. This feels inconsistent.”':bellMode(s)==='quiet'?'“I heard nothing this morning,” says Ivo. “It was excellent. I intend to write a witness statement.”':'“The pig found the pie first,” says Ivo. “I merely secured it. With a spoon, initially.”';}
  if(id==='inspect:bell') {addClue(s,'bell');addItem(s,'button');title='A missing clapper';body='The bell itself is sound. Its brass clapper is gone. A feather points downstream; a polished button has been dropped beside the latch. You keep it. Nettle, the local magpie, has expensive taste and a nest by the footbridge.';record(s,id,CLUES.bell.title,body);}
  if(id==='inspect:nest') {addClue(s,'nesting');s.jobs.bell.stage='found';title='Three smaller reasons';body='The clapper rests under three hatchlings, warm from a shaft of afternoon sun. Nettle fluffs herself to twice her sensible size. You could trade for it, leave it until the chicks are grown, or take it. The town will hear the difference.';record(s,id,CLUES.nesting.title,body);}
  if(id==='inspect:mill') {addClue(s,'mill');s.jobs.mill.stage='found';title='The river’s side of it';body=`Fen is holding the wheel still because the mill’s blocked sluice has drained her reed garden. ${bellMode(s)==='loud'?'The restored bell has woken her twice. Negotiation may require an apology and some actual labour.':bellMode(s)==='quiet'?'She approves of the quiet morning. For once she does not need to shout over anything.':'She wants water returned to the old side channel, not an heroic speech.'} There is a toolbox on the wall.`;record(s,id,CLUES.mill.title,body);}
  if(id==='inspect:toolbox') {addItem(s,'wrench');addClue(s,'bypass');title='A diagram with useful grease';body=`A stout wrench lies beside a faded sketch of the original sluice. ${has(s,'lantern')?'Your lantern reveals a pencilled note: “Turn the old gate, not the wheel.”':'In the light from the door, you can make out a narrow bypass behind the wheel.'} Restore that channel and the river need not lose its garden.`;record(s,id,CLUES.bypass.title,body);}
  if(id==='inspect:pie') {addClue(s,'pie');title='The witness is a crumb';body='Mera baked the pie for the whole town’s lantern supper. Hester paid a deposit and has decided that makes it hers. Outside, blackberry crumbs lead to the reed footbridge. “If the pig has joined local government,” says Mera, “I want it minuted.”';record(s,id,CLUES.pie.title,body);}
  if(id==='inspect:basket') {addItem(s,'pie');s.jobs.pie.stage='found';title='A pie, mostly intact';body='The basket contains the missing pie. The pig has eaten the decorative pastry duck and appears to consider the matter concluded. Ivo lets you take the evidence. Return it, share it, or take Hester’s richer offer: it is now your decision.';record(s,id,'The pie recovered',body);}
  if(id==='buy:lantern') {title='A little more light';if(s.coins<4)body='The lantern costs four crowns. Mera keeps it behind the counter for you. Nothing essential requires it.';else{s.coins-=4;addItem(s,'lantern');body='Four crowns buy a brass lantern and a flame that smells faintly of pears. “The oil is a local recipe,” says Mera. “So are most of our problems.”';record(s,id,'A pocket lantern',body);}}
  if(id==='rest:tea') {s.wounded=false;title='Restorative, allegedly';body='Mera pours tea, finds a clean cloth for your shoulder, and politely refrains from asking whether the wheel was impressed. The bruise eases. No charge. She adds you to the list of people who need watching.';record(s,id,'A shoulder mended',body);}
  if(id==='look:town') {title='Five places, one small town';body=completed(s)===3?'The roofs are the same roofs. Now you know which window belongs to Mera, which channel belongs to Fen, and how much quiet fits into a morning. The town has not become larger. Your place in it has.':'From here you can see the inn, the mill and the reeds below the bridge. They look like separate places until you follow the water, the crumbs and the people between them.';}
  if(p[0]==='finish') {
    const k=p[1],outcome=p[2];s.jobs[k]={stage:'done',outcome};
    if(k==='bell') {
      if(outcome==='gentle'){if(has(s,'slice'))removeItem(s,'slice');else removeItem(s,'button');s.coins+=5;s.kindness++;addItem(s,'feather');title='One note is enough';body='Nettle accepts your trade. You refit the clapper and a stop on the rope: one clear note at dawn, not a full assault. Hester accepts the compromise with the expression of someone swallowing a comma. Five crowns, and a silver feather, are yours.';}
      if(outcome==='quiet'){s.coins+=3;s.kindness+=2;addItem(s,'feather');title='A season of quiet';body='You pin a notice beneath the bell: no ringing until the hatchlings leave. Hester pays three crowns for the investigation and none for your conclusion. Downstream, Fen lifts her face to a morning that does not begin with a demand.';}
      if(outcome==='loud'){s.coins+=8;s.firmness++;title='The official morning returns';body='You take the clapper and restore the full schedule. Eight crowns arrive from Hester’s contingency purse. Nettle moves to a farther branch. The first ringing wakes Fen beneath the mill. Everything is punctual. Nothing is particularly grateful.';}
    }
    if(k==='mill') {
      if(outcome==='repair'){s.coins+=has(s,'permit')?10:8;s.kindness++;title='The water finds its old way';body=`You clear the side channel and turn the old gate with the wrench. Fen releases the wheel. The mill starts without anyone losing their garden. ${has(s,'permit')?'Hester’s permit adds a two-crown official repair allowance.':'Mera pays eight crowns from the flour fund.'} Somewhere, a bread basket regains its purpose.`;}
      if(outcome==='bargain'){s.coins+=5;s.kindness++;if(has(s,'slice')){removeItem(s,'slice');s.kindness++;}title='Hours the river can live with';body=`You agree that the mill will run from dawn to noon, leaving the rest of the day’s flow to Fen’s garden. ${bellMode(s)==='loud'?'You spend a little time clearing the reeds to make up for the bell.':has(previous,'slice')?'The wrapped pie slice improves the negotiations considerably.':'Fen accepts a promise with specific hours and no heroic adjectives.'} Mera pays five crowns and changes the baking schedule. The town now keeps a promise to its river.`;}
      if(outcome==='force'){s.coins+=10;s.firmness++;s.wounded=true;title='Working, at a cost';body='You lever the wheel past Fen’s grip. It catches, turns, and cracks one of its old gear teeth. Your shoulder catches the recoil. Mera pays ten crowns for the urgent flour, but the mill knocks with every turn. Fen retreats to the reeds. You have solved the stoppage, not the trouble.';}
    }
    if(k==='pie') {
      removeItem(s,'pie');
      if(outcome==='return'){s.coins+=7;s.kindness++;addItem(s,'bread');title='The supper is saved';body='You bring the pie back to Mera. Seven crowns and a warm loaf reward your word. The lantern supper will happen as planned. Hester receives her reserved slice, which she calls a resolution rather than a portion.';}
      if(outcome==='share'){s.coins+=3;s.kindness+=2;addItem(s,'slice');title='A longer table';body='You divide the pie among the hungry mill workers, Ivo and the neighbours waiting for flour. A slice is wrapped for later. Mera pays three crowns for finding it, then fetches more chairs. Hester objects to the arithmetic. Nobody objects to the company.';}
      if(outcome==='sell'){s.coins+=12;s.firmness++;s.kindness--;addItem(s,'permit');title='A profitable private supper';body='Hester buys the pie for twelve crowns and adds an official sluice permit. The public lantern supper loses its centrepiece. At the inn, Mera looks at the empty plate and then at you. The permit opens a useful door. The money does not close this conversation.';}
    }
    record(s,id,title,body);
  }
  if(id==='after:bell'){s.flags.bellGentled=true;s.kindness++;title='A quieter second thought';body='You fit the rope stop and leave Hester a note. The bell will ring once. Nettle returns to her old branch. Your first decision remains in the ledger; the second is now there beside it.';record(s,id,title,body);}
  if(id==='after:mill'){s.flags.millMended=true;s.kindness++;s.day++;s.wounded=false;addItem(s,'wrench');title='A morning spent properly';body='With Fen holding the water still, you replace the damaged tooth and restore the old side channel. A morning passes. The knock disappears. Fen does not forgive your boots all at once, but she no longer avoids them.';record(s,id,title,body);}
  if(id==='after:pie'){s.flags.pieAmends=true;s.kindness++;if(s.coins>=4)s.coins-=4;else s.day++;addItem(s,'bread');title='An apology with a crust';body=s.coins>=0&&previous.coins>=4?'Four crowns buy the ingredients for another pie. You deliver it to the long table, not the clerk’s room. Mera leaves a warm loaf beside your chair. The first pie is still gone; this one counts too.':'You spend a morning with Mera, chopping blackberries and learning that pastry is not impressed by confidence. A replacement pie reaches the public table. Your debt becomes a story she can tell without lowering her voice.';record(s,id,title,body);}
  if(id==='after:nettle'){s.flags.fedNettle=true;removeItem(s,'bread');s.kindness++;title='A smaller kind of payment';body='You leave bread by the nest. Nettle brings you a silver feather and appears to consider your accounts settled. This is probably optimistic.';addItem(s,'feather');record(s,id,title,body);}
  if(id==='after:meeting'){s.flags.meeting=true;title=epilogue(s).title;body=epilogue(s).paragraphs.join('\n\n')+'\n\n'+epilogue(s).closing;record(s,id,title,body);}
  if(id==='rest:morning'){s.day=Math.min(999,s.day+1);title='The morning after';body=bellMode(s)==='loud'?'The bell wakes you exactly on time. Downstairs, Mera is already counting the morning’s small inconveniences. The jobs are finished. Their consequences are still here.':bellMode(s)==='quiet'?'You wake when the light reaches the wall. Someone downstairs has dropped a spoon, which appears to be Briarwick’s new timekeeping arrangement. The town is still yours to visit.':'One clear bell note crosses the roofs. In the inn, a clean cup waits at your usual place. There is no new crisis this morning. You suspect Hester is disappointed.';}
  s.last={title,body};return s;
}
