import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=['math.js','content.js','visuals.js','app.js'];
const css=fs.readFileSync(path.join(root,'src/styles.css'),'utf8');
let js=files.map(name=>fs.readFileSync(path.join(root,'src',name),'utf8').replace(/^import .*?;\s*$/gm,'').replace(/^export (const|function|class) /gm,'$1 ')).join('\n');
const build=createHash('sha256').update(css+js).digest('hex').slice(0,10);
const html=`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f7f8f4"><meta name="description" content="공식 앞에 이해가 먼저. 69개 고등수학 개념을 조작 실험, 숫자, 정의와 반례로 연결하는 수학 개념 탐험실."><meta name="math-build" content="${build}"><title>수학 개념 탐험실 · 고등수학을 내 말로</title><style>${css}</style></head><body><div id="app"></div><noscript><p>조작 실험을 사용하려면 JavaScript를 켜 주세요. 설명과 소스는 이 폴더의 README.md에서 확인할 수 있습니다.</p></noscript><script>window.MATH_BUILD='${build}';\n(()=>{\n${js}\n})();</script></body></html>`;
fs.writeFileSync(path.join(root,'index.html'),html);
fs.writeFileSync(path.join(root,'version.json'),JSON.stringify({version:'1.0',build,entry:'index.html'},null,2)+'\n');
console.log(`Math_Highschool/index.html · ${build} · ${(Buffer.byteLength(html)/1024).toFixed(1)} KB`);
