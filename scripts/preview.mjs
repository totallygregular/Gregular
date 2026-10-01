import { readFile,writeFile,mkdir } from 'node:fs/promises';
const html=await readFile('index.html','utf8'),mark='data:image/svg+xml,'+encodeURIComponent(await readFile('assets/mark.svg','utf8'));
const town='data:image/jpeg;base64,'+(await readFile('assets/town.jpg')).toString('base64');
const css=(await readFile('assets/styles.css','utf8')).replace("url('town.jpg')",`url('${town}')`);
const stripExports=code=>code.replace(/^export /gm,'');
let story=stripExports(await readFile('assets/story.js','utf8'));
let save=stripExports((await readFile('assets/save.js','utf8')).replace(/^import .*;\r?\n/,''));
let app=(await readFile('assets/app.js','utf8')).replace(/^import .*;\r?\n/gm,'');
// Separate scopes avoid colliding helper names while bundling without a server or module imports.
story=`const STORY=(()=>{${story}\nreturn {newGame,scene,act,completed,JOBS,ITEMS,CLUES,townNotices,epilogue,VERSION,LOCATIONS};})();`;
save=`const SAVES=(()=>{const {VERSION,LOCATIONS,ITEMS,CLUES,JOBS,newGame}=STORY;${save}\nreturn {loadSave,saveGame,parseImport,SAVE_KEY};})();`;
app=`(()=>{const {newGame,scene,act,completed,JOBS,ITEMS,CLUES,townNotices,epilogue}=STORY;const {loadSave,saveGame,parseImport,SAVE_KEY}=SAVES;${app}})();`;
const script=(story+'\n'+save+'\n'+app).replaceAll('</script','<\\/script');
const output=html.replace('<link rel="stylesheet" href="assets/styles.css">',`<style>${css}</style>`).replace('<script type="module" src="assets/app.js"></script>',`<script type="module">${script}</script>`).replaceAll('assets/mark.svg',mark);
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/Briarwick - Playable Preview.html',output);console.log('Created the complete offline playable preview. No external runtime assets or services.');
