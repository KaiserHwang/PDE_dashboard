export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const sum=xs=>xs.reduce((a,b)=>a+b,0);
export const mean=xs=>sum(xs)/xs.length;
export const variance=xs=>mean(xs.map(x=>(x-mean(xs))**2));
export function factorial(n){if(!Number.isInteger(n)||n<0||n>170)return NaN;let r=1;for(let i=2;i<=n;i++)r*=i;return r;}
export function choose(n,r){if(!Number.isInteger(n)||!Number.isInteger(r)||r<0||r>n)return 0;let v=1;for(let i=1;i<=Math.min(r,n-r);i++)v=v*(n-i+1)/i;return v;}
export const binomial=(n,p)=>Array.from({length:n+1},(_,k)=>choose(n,k)*p**k*(1-p)**(n-k));
export const normalPDF=(x,mu=0,sigma=1)=>Math.exp(-.5*((x-mu)/sigma)**2)/(sigma*Math.sqrt(2*Math.PI));
export function normalCDF(z){const sign=z<0?-1:1,x=Math.abs(z)/Math.SQRT2,t=1/(1+.3275911*x),erf=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x);return .5*(1+sign*erf);}
export function seeded(seed=2028){let v=seed>>>0;return()=>{v=(1664525*v+1013904223)>>>0;return v/4294967296;};}
export function sampleNormal(n,seed=1,mu=50,sigma=10){const r=seeded(seed);return Array.from({length:n},()=>mu+sigma*Math.sqrt(-2*Math.log(Math.max(r(),1e-15)))*Math.cos(2*Math.PI*r()));}
export const ci=(xbar,sigma,n,z=1.96)=>[xbar-z*sigma/Math.sqrt(n),xbar+z*sigma/Math.sqrt(n)];
export function midpoint(fn,a,b,n=1000){const dx=(b-a)/n;return sum(Array.from({length:n},(_,i)=>fn(a+(i+.5)*dx)*dx));}
// 숫자 또는 분수만 받으며 입력 문자열을 코드로 실행하지 않는다.
export function parseNumber(value){const s=String(value).trim().replace(/−/g,'-');if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\/[+-]?(?:\d+(?:\.\d*)?|\.\d+))?$/.test(s))return null;const [a,b]=s.split('/').map(Number),v=b===undefined?a:a/b;return Number.isFinite(v)?v:null;}
export function rational(value){
  const s=String(value).trim().replace(/−/g,'-');
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\/[+-]?(?:\d+(?:\.\d*)?|\.\d+))?$/.test(s))return null;
  const decimal=s=>{const neg=s.startsWith('-'),v=s.replace(/^[+-]/,''),[x,y='']=v.split('.');return [BigInt((x||'0')+y)*(neg?-1n:1n),10n**BigInt(y.length)];};
  let [an,ad]=decimal(s.split('/')[0]),[bn,bd]=s.includes('/')?decimal(s.split('/')[1]):[1n,1n];
  if(bn===0n)return null;let n=an*bd,d=ad*bn;if(d<0n){n=-n;d=-d;}let x=n<0n?-n:n,y=d;while(y){[x,y]=[y,x%y];}return {n:n/x,d:d/x};
}
export const rationalEqual=(a,b)=>{const x=rational(a),y=rational(b);return !!x&&!!y&&x.n===y.n&&x.d===y.d;};
export const endpoint=x=>{const s=String(x).trim().replace(/−/g,'-').toLowerCase();return ['-inf','-infinity','-∞'].includes(s)?-Infinity:['inf','+inf','infinity','∞','+∞'].includes(s)?Infinity:parseNumber(s);};
export function parseSet(answer){if(Array.isArray(answer))return answer.every(Number.isFinite)?answer:null;const s=String(answer).trim();if(s===''||s==='없음')return [];const values=s.split(/[,，\s]+/).map(parseNumber);return values.some(x=>x===null)?null:values;}
export function validAnswer(q,a){if(q.type==='choice')return Number.isInteger(a)&&a>=0&&a<q.options.length;if(q.type==='numeric')return parseNumber(a)!==null;if(q.type==='rational')return rational(a)!==null;if(q.type==='set')return a!==''&&parseSet(a)!==null;if(q.type==='interval')return !!a&&endpoint(a.lo)!==null&&endpoint(a.hi)!==null&&endpoint(a.lo)<=endpoint(a.hi);return false;}
export function gradeAnswer(q,answer){
 if(q.type==='numeric'){const n=parseNumber(answer);return n!==null&&Math.abs(n-q.answer)<=(q.tolerance??1e-8)*Math.max(1,Math.abs(q.answer));}
 if(q.type==='rational')return rationalEqual(answer,q.answer);
 if(q.type==='interval'){if(!answer||typeof answer!=='object')return false;const a=q.answer;return endpoint(answer.lo)!==null&&endpoint(answer.hi)!==null&&endpoint(answer.lo)===endpoint(a.lo)&&endpoint(answer.hi)===endpoint(a.hi)&&answer.loIncl===a.loIncl&&answer.hiIncl===a.hiIncl;}
 if(q.type==='set'){const v=parseSet(answer);if(v===null)return false;const x=[...new Set(v)].sort((a,b)=>a-b),y=[...new Set(q.answer)].sort((a,b)=>a-b);return x.length===y.length&&x.every((n,i)=>Math.abs(n-y[i])<1e-8);}
 return Number.isInteger(answer)&&answer===q.answer;
}
export const fmt=x=>typeof x==='number'?Number.isFinite(x)?x!==0&&Math.abs(x)<.0001?x.toExponential(2):Number(x.toFixed(4)).toLocaleString('ko-KR',{maximumFractionDigits:4}):'정의되지 않음':String(x);
export const poly=(coeff,x)=>coeff.reduce((v,c)=>v*x+c,0);
export const derivative=coeff=>coeff.slice(0,-1).map((v,i)=>v*(coeff.length-1-i));
export const antiderivative=coeff=>[...coeff.map((v,i)=>v/(coeff.length-i)),0];
