import {act} from '../assets/story.js';
export function doJob(s,job,outcome){
  if(s.location!=='square')s=act(s,'travel:square');s=act(s,`accept:${job}`);
  if(job==='bell'){s=act(s,'travel:tower');s=act(s,'inspect:bell');s=act(s,'travel:marsh');s=act(s,'inspect:nest');}
  if(job==='mill'){s=act(s,'travel:mill');s=act(s,'inspect:mill');if(outcome==='repair')s=act(s,'inspect:toolbox');}
  if(job==='pie'){s=act(s,'travel:inn');s=act(s,'inspect:pie');s=act(s,'travel:marsh');s=act(s,'inspect:basket');}
  return act(s,`finish:${job}:${outcome}`);
}
