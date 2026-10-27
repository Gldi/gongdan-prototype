// 설치된 Edge로 화면 시안을 검증한다. 외부 패키지나 네트워크 서비스는 사용하지 않는다.
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(__dirname,'.browser-test-'));
const edge=process.env.GONGDAN_EDGE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
let child,ws;
async function run(){
 child=spawn(edge,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore',windowsHide:true});
 let spawnError;child.on('error',e=>spawnError=e);
 const portFile=path.join(profile,'DevToolsActivePort');
 for(let i=0;i<100&&!fs.existsSync(portFile);i++){if(spawnError)throw spawnError;await delay(100);}
 const port=fs.readFileSync(portFile,'utf8').split('\n')[0];
 const pages=await (await fetch(`http://127.0.0.1:${port}/json`)).json();
 ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 let seq=0;const pending=new Map(),errors=[];
 ws.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.text);if(pending.has(data.id)){const p=pending.get(data.id);pending.delete(data.id);clearTimeout(p.timer);data.error?p.reject(Error(data.error.message)):p.resolve(data.result);}});
 function call(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error(`응답 시간 초과: ${method}`));},10000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});}
 async function evaluate(expression){const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
 await call('Runtime.enable');await call('Page.enable');
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:pathToFileURL(path.join(__dirname,'index.html')).href});
 for(let i=0;i<50;i++){if(await evaluate('Boolean(document.querySelector("h1"))'))break;await delay(100);}
 assert.equal(await evaluate('document.querySelectorAll("nav a").length'),7);
 assert.equal(await evaluate('document.querySelector(".stat strong").textContent'),'3명');
 for(const route of ['work','workers','clients','payroll','claims','settings','home']){await evaluate(`location.hash=${JSON.stringify(route)}`);await delay(100);assert.equal(await evaluate('document.querySelector("nav a[aria-current]").hash'),`#${route}`);}
 await evaluate('document.querySelector("[data-action=add]").click(); document.querySelector("#work-form").requestSubmit()');
 assert.match(await evaluate('document.querySelector("#form-error").textContent'),/이미 있습니다/);
 await evaluate('document.querySelector("#work-form").elements.site.value="s2"; document.querySelector("#work-form").requestSubmit()');
 assert.equal(await evaluate('entries.length'),4);
 assert.equal(await evaluate('document.querySelector("#work-dialog").open'),false);
 await evaluate('location.hash="work"');await delay(100);
 await evaluate('document.querySelector("#filter-site").value="s2"; document.querySelector("#filter-site").dispatchEvent(new Event("change",{bubbles:true}))');
 assert.equal(await evaluate('document.querySelectorAll("#work-results tbody tr").length'),2);
 await evaluate('document.querySelector("#filter-date").value="2000-01-01"; document.querySelector("#filter-date").dispatchEvent(new Event("change",{bubbles:true}))');
 assert.match(await evaluate('document.querySelector("#work-results").textContent'),/표시할 내역이 없습니다/);
 await evaluate('location.hash="payroll"');await delay(100);
 assert.match(await evaluate('document.querySelector("tbody tr").textContent'),/300,000원/);
 assert.equal(await evaluate('document.querySelector("main button").disabled'),true);
 await evaluate('location.hash="workers"');await delay(100);
 assert.equal(await evaluate('document.querySelectorAll("#content tbody tr").length'),3);
 await evaluate('document.querySelector("[data-action=add-worker]").click()');
 assert.equal(await evaluate('document.querySelector("#worker-dialog").open'),true);
 await evaluate('document.querySelector("#worker-form").elements.name.value=" "; document.querySelector("#worker-form").elements.rate.value="200000"; document.querySelector("#worker-form").requestSubmit()');
 assert.match(await evaluate('document.querySelector("#worker-form-error").textContent'),/이름을 입력/);
 await evaluate('document.querySelector("#worker-form").elements.name.value="근로자 라"; document.querySelector("#worker-form").requestSubmit()');
 assert.equal(await evaluate('workers.length'),4);
 assert.equal(await evaluate('document.querySelector("#worker-dialog").open'),false);
 assert.equal(await evaluate('document.querySelectorAll("#content tbody tr").length'),4);
 await evaluate('document.querySelector("[data-action=edit-worker]").click()');
 assert.equal(await evaluate('document.querySelector("#worker-form").elements.name.value'),'근로자 가');
 await evaluate('document.querySelector("#worker-form").elements.phone.value="010-1234-5678"; document.querySelector("#worker-form").requestSubmit()');
 assert.equal(await evaluate('workers[0].phone'),'010-1234-5678');
 await evaluate('document.querySelector("[data-action=toggle-worker]").click()');
 assert.equal(await evaluate('workers[0].active'),false);
 await evaluate('location.hash="work"');await delay(100);
 await evaluate('document.querySelector("[data-action=add]").click()');
 assert.equal(await evaluate('document.querySelector("#work-form").elements.worker.options.length'),3);
 await evaluate('document.querySelector("#close-dialog").click()');
 assert.equal(await evaluate('document.documentElement.classList.contains("inverted")'),false);
 await evaluate('document.querySelector("#theme-toggle").click()');
 assert.equal(await evaluate('document.documentElement.classList.contains("inverted")'),true);
 assert.match(await evaluate('document.querySelector("#theme-toggle").textContent'),/☀️.*원래 색/);
 assert.equal(await evaluate('document.querySelector("#theme-toggle").getAttribute("aria-pressed")'),'true');
 await evaluate('document.querySelector("#theme-toggle").click()');
 assert.equal(await evaluate('document.documentElement.classList.contains("inverted")'),false);
 assert.match(await evaluate('document.querySelector("#theme-toggle").textContent'),/🌙.*색 반전/);
 assert.equal(await evaluate('document.querySelector("#theme-toggle").getAttribute("aria-pressed")'),'false');
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 for(const route of ['home','work','workers','clients','payroll','claims','settings']){await evaluate(`location.hash=${JSON.stringify(route)}`);await delay(80);assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),true,`휴대폰 가로 넘침: ${route}`);}
 await call('Page.reload');await delay(300);
 assert.equal(await evaluate('entries.length'),3);
 assert.deepEqual(errors,[]);
 console.log('통과: 7개 메뉴, 작업 추가, 중복 차단, 필터, 급여 반영, 확정 차단, 근로자 등록·수정·비활성화, 색 반전 토글, 휴대폰 너비, 새로고침 초기화, 실행 오류 없음');
 await call('Browser.close').catch(()=>{});
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(ws)ws.close();if(child&&child.exitCode===null){child.kill();await delay(700);}try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{console.error(`검증용 프로필 정리 필요: ${profile}`);process.exitCode=1;}});
