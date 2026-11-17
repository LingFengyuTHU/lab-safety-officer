import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(dir),out=root;
const read=n=>fs.readFileSync(path.join(dir,n),'utf8');
const assets=Object.fromEntries([['scientist','scientist.png'],['combat','combat.png'],['laboratory','laboratory.png'],['chemical','chemical.png'],['biology','biology.png'],['environments','environments.png'],['weapons','weapons.png'],['bosses','bosses.png']].map(([key,file])=>[key,'data:image/png;base64,'+fs.readFileSync(path.join(root,'assets','art',file)).toString('base64')]));
let html=read('index.template.html');
for(const [marker,content]of Object.entries({CSS:read('style.css'),ASSETS:'window.LAB_ASSETS='+JSON.stringify(assets)+';',QUESTIONS:read('questions.js'),WORLD:read('world.js'),AUDIO:read('audio.js'),CORE:read('core.js'),APP:read('app.js')})){const token='/*__'+marker+'__*/';if(!html.includes(token))throw new Error('Missing marker '+marker);html=html.replace(token,()=>content);}
if(/\/\*__\w+__\*\//.test(html))throw new Error('Unreplaced marker');
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'index.html'),html);fs.writeFileSync(path.join(out,'实验室安全官_单文件版.html'),html);
const manifest={version:'0.2.1',bytes:Buffer.byteLength(html),sha256:createHash('sha256').update(html).digest('hex'),assets:8,externalRuntimeResources:0,builtAt:new Date().toISOString()};
console.log(JSON.stringify(manifest,null,2));
