import {cp,mkdir,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/assets',{recursive:true});
for(const file of ['index.html','404.html','CNAME','.nojekyll']) await cp(file,`dist/${file}`);
await cp('assets','dist/assets',{recursive:true});
console.log('Built static site in dist/');
