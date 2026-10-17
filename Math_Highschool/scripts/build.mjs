import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'dist');
fs.mkdirSync(out,{recursive:true});
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),strip=s=>s.replace(/^import .*?;\s*$/gm,'').replace(/^export (const|let|function|class) /gm,'$1 ');
const sourceNames=['math.js','lesson-schema.js','state.js','retrieval.js','visuals.js','app.js'];
const courseFiles=['slice.js','algebra.js','calculus.js','statistics.js','bridges.js'].filter(n=>fs.existsSync(path.join(root,'src/courses',n)));
let moduleCode='',courseNames=[];
for(const name of courseFiles){const key=name.replace('.js','')+'Lessons';courseNames.push(key);moduleCode+='const '+key+'=(()=>{\n'+strip(read('src/courses/'+name))+'\nreturn lessons;\n})();\n';}
const content=strip(read('src/content.js')).replace(/const LESSONS=.*?\.map\(finalizeLesson\)/,'const LESSONS=['+courseNames.map(n=>'...'+n).join(',')+'].map(finalizeLesson)');
const js=strip(read('src/math.js'))+'\n'+strip(read('src/known-errors.js'))+'\n'+strip(read('src/lesson-schema.js'))+'\n'+strip(read('src/author.js'))+'\n'+moduleCode+'\n'+content+'\n'+['state.js','retrieval.js','visuals.js','app.js'].map(n=>strip(read('src/'+n))).join('\n');
let css=read('src/styles.css'),vendor=read('node_modules/katex/dist/katex.min.css');
vendor=vendor.replace(/@font-face\{[^}]+\}/g,face=>{const m=face.match(/url\(([^)]+\.woff2)\)/);if(!m)throw new Error('WOFF2 font not found');const bytes=fs.readFileSync(path.join(root,'node_modules/katex/dist',m[1]));return face.replace(/src:[^;}]*/,'src:url(data:font/woff2;base64,'+bytes.toString('base64')+') format("woff2")');});
const build=createHash('sha256').update(css+js+read('package-lock.json')).digest('hex').slice(0,12);
const records=[];for(const folder of ['discussions','reviews'])for(const f of fs.readdirSync(path.join(root,'docs',folder)).filter(f=>f.endsWith('.json')).sort()){const record=JSON.parse(read('docs/'+folder+'/'+f));records.push({title:(folder==='discussions'?'논의 · ':'검토 · ')+f.replace('.json',''),record});}
const starts=fs.existsSync(path.join(root,'src/start-items.json'))?JSON.parse(read('src/start-items.json')):[];
const safeJSON=v=>JSON.stringify(v).replace(/</g,'\\u003c');
const katex=read('node_modules/katex/dist/katex.min.js').replace(/<\/script/gi,'<\\/script');
const html='<!doctype html>\n<!--\n'+read('node_modules/katex/LICENSE')+'\n-->\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#172f3a"><meta name="description" content="2028+ 수능 수학 개념 학습. 이유와 조건, 표현 연결, 단계 풀이, 전이와 오류 분석, 시간 뒤의 새 변형 복습."><meta name="app-build" content="'+build+'"><title>개념의 연결 · 수능 수학</title><style>'+vendor+'\n'+css+'</style></head><body><div id="app"></div><noscript><h1>개념의 연결 · 수능 수학</h1><p>학습 화면을 열려면 JavaScript를 켜 주세요.</p></noscript><script>'+katex+'</script><script>window.APP_BUILD='+safeJSON(build)+';window.DESIGN_RECORDS='+safeJSON(records)+';window.START_ITEMS='+safeJSON(starts)+';\n(()=>{\n'+js+'\n})();</script></body></html>';
fs.writeFileSync(path.join(out,'index.html'),html);fs.writeFileSync(path.join(root,'index.html'),html);
fs.writeFileSync(path.join(out,'version.json'),JSON.stringify({build,version:'2.0',offline:true},null,2)+'\n');
fs.writeFileSync(path.join(out,'THIRD_PARTY_LICENSES.txt'),read('node_modules/katex/LICENSE'));
const zip=spawnSync('python3',[path.join(root,'scripts/source-archive.py')],{cwd:root,encoding:'utf8'});if(zip.status!==0)throw new Error(zip.stderr);
for(const name of ['source.zip','version.json','THIRD_PARTY_LICENSES.txt'])fs.copyFileSync(path.join(out,name),path.join(root,name));
console.log('Built '+build+' · '+(Buffer.byteLength(html)/1024).toFixed(1)+' KB · offline HTML + source.zip');
