import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
const root=resolve('.'),out=resolve(root,'dist');if(dirname(out)!==root)throw new Error('Unsafe build path');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const name of ['index.html','assets','CNAME','.nojekyll'])await cp(resolve(root,name),resolve(out,name),{recursive:true});
console.log('Built public static files in dist. No saves, tests, credentials or server files are published.');
