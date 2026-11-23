// 설치된 Edge 또는 Chrome으로 화면 시안을 검증한다. 외부 패키지나 네트워크 서비스는 사용하지 않는다.
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(__dirname,'.browser-test-'));
const macBrowsers=[
 '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
 '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const browser=process.env.GONGDAN_EDGE || (process.platform==='darwin'
 ? macBrowsers.find(candidate=>fs.existsSync(candidate)) || macBrowsers[0]
 : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe');
let child,ws;
async function run(){
 child=spawn(browser,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore',windowsHide:true});
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
 async function setWorkField(selector,value){
  await evaluate(`{
   const field=document.querySelector(${JSON.stringify(selector)});
   field.value=${JSON.stringify(value)};
   field.dispatchEvent(new Event("change",{bubbles:true}));
  }`);
 }
 const selectClient = id=>setWorkField('#work-form [name="clientId"]',id);
 const selectSite = id=>setWorkField('#work-form [name="site"]',id);
 const selectWorker = (row,id)=>setWorkField(`.work-row:nth-child(${row}) [name="worker"]`,id);
 const submitWork = ()=>evaluate('document.querySelector("#work-form").requestSubmit()');
 const assertDuplicate = async count=>{
  assert.match(await evaluate('document.querySelector("#form-error").textContent'),/이미 있습니다/);
  assert.equal(await evaluate('entries.length'),count);
  assert.equal(await evaluate('document.querySelector("#work-dialog").open'),true);
 };

 await evaluate('document.querySelector("[data-action=add]").click()');
 await selectClient('c1');
 await selectSite('s1');
 await selectWorker(1,'w1');
 await submitWork();
 await assertDuplicate(3);
 await selectClient('c2');
 await selectSite('s2');
 await evaluate('document.querySelector("#add-work-row").click()');
 await selectWorker(2,'w1');
 await submitWork();
 await assertDuplicate(3);
 await selectWorker(2,'w2');
 await setWorkField('.work-row:nth-child(2) [name="units"]','0.75');
 await submitWork();
 assert.equal(await evaluate('document.querySelector("#work-dialog").open'),false);
 assert.deepEqual(await evaluate('entries.slice(3).map(({worker,units})=>[worker,units])'),[['w1',1],['w2',0.75]]);

 await evaluate('location.hash="work"');await delay(100);
 await evaluate(`document.querySelector('[data-action=edit-work][data-index="3"]').click()`);
 assert.equal(await evaluate('document.querySelectorAll(".work-row").length'),3);
 await selectClient('c1');
 await selectSite('s1');
 await submitWork();
 await assertDuplicate(5);
 assert.deepEqual(await evaluate('entries.slice(3).map(e=>e.site)'),['s2','s2']);
 await selectClient('c2');
 await selectSite('s2');
 await setWorkField('.work-row:nth-child(2) [name="units"]','1.25');
 await setWorkField('.work-row:nth-child(3) [name="units"]','0.5');
 await submitWork();
 assert.deepEqual(await evaluate('entries.slice(3).map(e=>e.units)'),[1.25,0.5]);

 await setWorkField('#filter-date',await evaluate('today'));
 await setWorkField('#filter-client','c2');
 await setWorkField('#filter-site','s2');
 const resultCount = ()=>evaluate('document.querySelectorAll("#work-results [data-action=edit-work]").length');
 assert.equal(await resultCount(),3);
 await setWorkField('#filter-worker','w2');
 assert.equal(await resultCount(),1);
 assert.match(await evaluate('document.querySelector("#work-results").textContent'),/근로자 나/);
 await setWorkField('#filter-client','c1');
 assert.equal(await resultCount(),0);
 await setWorkField('#filter-client','c2');
 await setWorkField('#filter-site','s1');
 assert.equal(await resultCount(),0);
 await setWorkField('#filter-site','s2');
 await setWorkField('#filter-date','2000-01-01');
 assert.match(await evaluate('document.querySelector("#work-results").textContent'),/표시할 내역이 없습니다/);
 await setWorkField('#filter-date',await evaluate('today'));
 await evaluate(`{
  const confirm=window.confirm;
  try {
   window.confirm=()=>true;
   document.querySelector('[data-action=cancel-work][data-index="4"]').click();
  } finally { window.confirm=confirm; }
 }`);
 assert.equal(await evaluate('entries.length'),5);
 assert.equal(await evaluate('entries[4].cancelled'),true);
 assert.equal(await evaluate('document.querySelector("#work-results .badge.cancelled").textContent'),'취소');
 assert.equal(await resultCount(),0);
 await evaluate('document.querySelector("[data-action=reset-filter]").click()');
 assert.equal(await resultCount(),4);

 await evaluate('location.hash="payroll"');await delay(100);
 assert.match(await evaluate('document.querySelector("tbody tr").textContent'),/337,500원/);
 assert.match(await evaluate('document.querySelector("tbody tr:nth-child(2)").textContent'),/80,000원/);
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
 assert.deepEqual(await evaluate('Array.from(document.querySelector(".work-row select").options, option=>option.value)'),["","w2","w3","w4"]);
 await evaluate('document.querySelector("#close-dialog").click()');
 await evaluate('location.hash="clients"');await delay(100);
 async function clickRecord(kind,action,id){
  const selector=`[data-record="${kind}"][data-action="${action}-record"]${id?`[data-id="${id}"]`:''}`;
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
 }
 async function submitRecord(kind,fields){
  await evaluate(`{
   const recordForm=document.querySelector("#${kind}-form");
   for(const [field,value] of Object.entries(${JSON.stringify(fields)})) recordForm.elements[field].value=value;
   recordForm.requestSubmit();
  }`);
 }
 await clickRecord('client','add');
 await submitRecord('client',{name:' '});
 assert.match(await evaluate('document.querySelector("#client-form-error").textContent'),/거래처명을 입력/);
 assert.equal(await evaluate('clients.length'),2);
 await submitRecord('client',{name:'새 거래처',contact:'김 담당',phone:'02-123-4567',businessNumber:'123-45-67890'});
 assert.match(await evaluate('document.querySelector("#content").textContent'),/김 담당.*02-123-4567.*123-45-67890/);
 await clickRecord('client','edit','c3');
 assert.equal(await evaluate('document.querySelector("#client-form").elements.name.value'),'새 거래처');
 await submitRecord('client',{name:'수정한 거래처'});
 assert.equal(await evaluate('clients[2].name'),'수정한 거래처');

 await clickRecord('site','add');
 await submitRecord('site',{name:' ',clientId:'c3'});
 assert.match(await evaluate('document.querySelector("#site-form-error").textContent'),/현장명을 입력/);
 assert.equal(await evaluate('sites.length'),2);
 await submitRecord('site',{name:'새 현장',address:'서울시',clientId:'c3'});
 assert.match(await evaluate('document.querySelector("#content section:last-child").textContent'),/서울시/);
 await clickRecord('site','edit','s3');
 assert.equal(await evaluate('document.querySelector("#site-form").elements.clientId.value'),'c3');
 await submitRecord('site',{name:'수정한 현장',address:'인천시'});
 assert.match(await evaluate('document.querySelector("#content section:last-child").textContent'),/인천시/);

 async function workSiteOptions(){
  await evaluate('location.hash="work"');await delay(100);
  await evaluate('document.querySelector("[data-action=add]").click()');
  const clientIds=await evaluate('Array.from(document.querySelector("#work-form").elements.clientId.options, option=>option.value).filter(Boolean)');
  const choices=[];
  for (const clientId of clientIds) {
   await selectClient(clientId);
   const sites=await evaluate('Array.from(document.querySelector("#work-form").elements.site.options, option=>option.value).filter(Boolean)');
   choices.push([clientId,sites]);
  }
  await evaluate('document.querySelector("#close-dialog").click()');
  await evaluate('location.hash="clients"');await delay(100);
  return choices;
 }
 assert.deepEqual(await workSiteOptions(),[['c1',['s1']],['c2',['s2']],['c3',['s3']]]);
 await clickRecord('site','toggle','s2');
 await clickRecord('client','toggle','c1');
 assert.equal(await evaluate('sites[1].active'),false);
 assert.equal(await evaluate('clients[0].active'),false);
 assert.equal(await evaluate('sites[0].active'),true);
 assert.deepEqual(await workSiteOptions(),[['c2',[]],['c3',['s3']]]);
 await evaluate('location.hash="work"');await delay(100);
 assert.match(await evaluate('document.querySelector("#work-results").textContent'),/가 현장/);
 assert.deepEqual(await evaluate('Array.from(document.querySelector("#filter-site").options, option=>option.value)'),['','s1','s2','s3']);
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
 async function reload(){
  const loaded=new Promise(resolve=>{
   function onMessage(event){
    if(JSON.parse(event.data).method!=='Page.loadEventFired')return;
    ws.removeEventListener('message',onMessage);
    resolve();
   }
   ws.addEventListener('message',onMessage);
  });
  await call('Page.reload');
  await loaded;
 }
 const snapshot = ()=>evaluate('JSON.parse(JSON.stringify(data))');
 const modified = await snapshot();
 await reload();
 assert.deepEqual(await snapshot(),modified);
 assert.equal(await evaluate('entries[4].cancelled'),true);
 assert.equal(await evaluate('JSON.parse(localStorage.getItem(storageKey)).version'),1);
 assert.match(await evaluate('document.querySelector("#content").textContent'),/이 기기·이 브라우저에만 저장됩니다.*다른 기기와 공유되지 않습니다/);

 async function reset(confirmed){
  await evaluate(`{
   const confirm=window.confirm;
   try {
    window.confirm=()=>${confirmed};
    document.querySelector('[data-action="reset-data"]').click();
   } finally { window.confirm=confirm; }
  }`);
 }
 await reset(false);
 assert.deepEqual(await snapshot(),modified);
 await reset(true);
 const samples=await evaluate('JSON.parse(sampleData)');
 assert.deepEqual(await snapshot(),samples);
 assert.equal(await evaluate('localStorage.getItem(storageKey)'),null);
 assert.match(await evaluate('document.querySelector("#storage-notice").textContent'),/초기화했습니다/);
 await reload();
 assert.deepEqual(await snapshot(),samples);

 for(const invalid of ['{',JSON.stringify({version:999,...modified}),
  JSON.stringify({version:1,...modified,sites:[{...modified.sites[0],clientId:'c999'}]})]){
  await evaluate(`localStorage.setItem(storageKey,${JSON.stringify(invalid)})`);
  await reload();
  assert.deepEqual(await snapshot(),samples);
  assert.match(await evaluate('document.querySelector("#storage-notice").textContent'),/손상되었거나 지원하지 않는 형식/);
 }
 const {identifier}=await call('Page.addScriptToEvaluateOnNewDocument',{
  source:'Object.defineProperty(window,"localStorage",{get(){throw new DOMException("Blocked","SecurityError");}});'
 });
 await reload();
 assert.deepEqual(await snapshot(),samples);
 assert.match(await evaluate('document.querySelector("#storage-notice").textContent'),/저장소를 읽을 수 없어/);
 await evaluate('location.hash="workers"');await delay(100);
 await evaluate('document.querySelector("[data-action=toggle-worker]").click()');
 assert.equal(await evaluate('workers[0].active'),false);
 assert.match(await evaluate('document.querySelector("#storage-notice").textContent'),/저장하지 못했습니다/);
 await call('Page.removeScriptToEvaluateOnNewDocument',{identifier});
 assert.deepEqual(errors,[]);
 console.log('통과: 7개 메뉴, 작업 등록·다중 근로자·수정·취소, 등록·수정 중복 차단, 조회 필터, 급여 반영, 확정 차단, 근로자 등록·수정·비활성화, 거래처·현장 등록·빈 이름 검증·수정·비활성화·작업 선택 목록, 색 반전 토글, 휴대폰 너비, 새로고침 후 데이터 유지, 초기화 확인·취소, 손상·형식 불일치 복구, 저장소 접근 차단, 실행 오류 없음');
 await call('Browser.close').catch(()=>{});
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(ws)ws.close();if(child&&child.exitCode===null){child.kill();await delay(700);}try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{console.error(`검증용 프로필 정리 필요: ${profile}`);process.exitCode=1;}});
