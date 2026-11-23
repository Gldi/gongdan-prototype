"use strict";
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
const workers = [{id:"w1",name:"근로자 가",phone:"010-0000-0001",trade:"일반",account:"",rate:150000,active:true},{id:"w2",name:"근로자 나",phone:"010-0000-0002",trade:"일반",account:"",rate:160000,active:true},{id:"w3",name:"근로자 다",phone:"010-0000-0003",trade:"기능",account:"",rate:180000,active:true}];
let nextWorkerId = workers.length + 1;
const clients = [
  {id:"c1",name:"거래처 가",contact:"",phone:"",businessNumber:"",active:true},
  {id:"c2",name:"거래처 나",contact:"",phone:"",businessNumber:"",active:true},
];
const sites = [
  {id:"s1",name:"가 현장",clientId:"c1",address:"",active:true},
  {id:"s2",name:"나 현장",clientId:"c2",address:"",active:true},
];
const entries = [{date:today,worker:"w1",site:"s1",units:1,rate:150000,vehicle:true},{date:today,worker:"w2",site:"s1",units:0.5,rate:160000,vehicle:false},{date:today,worker:"w3",site:"s2",units:1,rate:180000,vehicle:true}];
const activeEntries = () => entries.filter(entry=>!entry.cancelled);
const titles = {home:"오늘의 업무",work:"작업내역",workers:"근로자",clients:"거래처·현장",payroll:"급여 정산",claims:"작업확인서",settings:"설정"};
const esc = value => String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = value => new Intl.NumberFormat("ko-KR",{maximumFractionDigits:2}).format(value);
const person = id => workers.find(w=>w.id===id);
const site = id => sites.find(s=>s.id===id);
const client = id => clients.find(c=>c.id===id);
const availableSite = s => s.active && client(s.clientId).active;
const content = document.querySelector("#content");
const dialog = document.querySelector("#work-dialog");
const form = document.querySelector("#work-form");
const workerDialog = document.querySelector("#worker-dialog");
const workerForm = document.querySelector("#worker-form");
document.querySelector("#today").textContent = now.toLocaleDateString("ko-KR",{month:"long",day:"numeric",weekday:"long"});
const themeToggle = document.querySelector("#theme-toggle");
themeToggle.addEventListener("click",()=>{const on=document.documentElement.classList.toggle("inverted");themeToggle.setAttribute("aria-pressed",String(on));themeToggle.innerHTML=on?'<span aria-hidden="true">☀️</span> 원래 색':'<span aria-hidden="true">🌙</span> 색 반전';});
const heading = (title,description,action="") => `<div class="page-heading"><div><div class="eyebrow">우리 인력사무소</div><h1>${title}</h1><p class="muted">${description}</p></div>${action}</div>`;
const addButton = '<button data-action="add">＋ 작업 등록</button>';
const table = (headers,rows) => `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.length?rows.join(""):`<tr><td class="empty" colspan="${headers.length}">표시할 내역이 없습니다.</td></tr>`}</tbody></table></div>`;
const options = records => records.map(record=>`<option value="${record.id}">${esc(record.name)}</option>`).join("");
function workTable(rows, editable=false) {
  const headers = ["작업일","거래처 / 현장","근로자","공수","적용 일당","차량","상태"];
  if (editable) headers.push("관리");
  return table(headers, rows.map(e=>{
    const workplace = site(e.site);
    const index = entries.indexOf(e);
    const actions = editable ? `<td class="row-actions">${e.cancelled?"":`
      <button class="secondary" data-action="edit-work" data-index="${index}">수정</button>
      <button class="quiet" data-action="cancel-work" data-index="${index}">작업 취소</button>`}</td>` : "";
    return `<tr><td>${esc(e.date)}</td><td>${esc(client(workplace.clientId).name)}<br>${esc(workplace.name)}</td>
      <td><strong>${esc(person(e.worker).name)}</strong></td><td>${e.units}</td>
      <td class="number">${money(e.rate)}원</td><td>${e.vehicle?"이용":"미이용"}</td>
      <td><span class="badge ${e.cancelled?"cancelled":"pending"}">${e.cancelled?"취소":"작성 중"}</span></td>${actions}</tr>`;
  }));
}
function home(){const rows=activeEntries().filter(e=>e.date===today);return heading("오늘도, 차근차근","오늘의 작업을 등록하고 정산할 내역을 확인하세요.",addButton)+`<div class="stats"><article class="stat"><span>오늘 근무 인원</span><strong>${new Set(rows.map(e=>e.worker)).size}명</strong><span>등록된 근로자 기준</span></article><article class="stat"><span>오늘 작업 현장</span><strong>${new Set(rows.map(e=>e.site)).size}곳</strong><span>작업이 있는 현장</span></article><article class="stat"><span>오늘 총공수</span><strong>${money(rows.reduce((sum,e)=>sum+e.units,0))}</strong><span>입력한 공수 합계</span></article><article class="stat"><span>확인할 작업</span><strong>${activeEntries().length}건</strong><span>전체 작성 중 내역</span></article></div><div class="columns"><section class="panel"><div class="panel-heading"><h2>오늘 작업내역</h2><a class="text-link" href="#work">전체 보기 →</a></div>${workTable(rows)}</section><section class="panel"><h2>업무 순서</h2><div class="task"><span class="step">1</span><div><a href="#work"><strong>작업내역 입력</strong></a><p class="muted">날짜·현장·근로자·공수를 기록합니다.</p></div></div><div class="task"><span class="step">2</span><div><a href="#payroll"><strong>급여와 공제 확인</strong></a><p class="muted">공제 규칙 확인 후 정산을 연결합니다.</p></div></div><div class="task"><span class="step">3</span><div><a href="#claims"><strong>작업확인서 작성</strong></a><p class="muted">작업내역을 거래처 청구에 활용합니다.</p></div></div></section></div>`;}
function work() {
  return heading("작업내역","날짜·거래처·현장·근로자로 작업을 조회합니다.",addButton)+`
    <section class="panel">
      <div class="filters">
        <label>작업일<input id="filter-date" type="date"></label>
        <label>거래처<select id="filter-client"><option value="">모든 거래처</option>${options(clients)}</select></label>
        <label>현장<select id="filter-site"><option value="">모든 현장</option>${options(sites)}</select></label>
        <label>근로자<select id="filter-worker"><option value="">모든 근로자</option>${options(workers)}</select></label>
        <button class="secondary" data-action="reset-filter">전체 보기</button>
      </div>
      <div id="work-results">${workTable(entries,true)}</div>
    </section>`;
}
function workerRow(w){return `<tr><td><strong>${esc(w.name)}</strong></td><td>${esc(w.phone||"-")}</td><td>${esc(w.trade||"-")}</td><td>${esc(w.account||"-")}</td><td class="number">${money(w.rate)}원</td><td>${entries.filter(e=>e.worker===w.id).length}건</td><td><span class="badge ${w.active?"":"pending"}">${w.active?"활동 중":"비활성"}</span></td><td class="row-actions"><button class="secondary" data-action="edit-worker" data-id="${w.id}">수정</button><button class="quiet" data-action="toggle-worker" data-id="${w.id}">${w.active?"비활성화":"활성화"}</button></td></tr>`;}
function workerPage(){return heading("근로자","기본 일당과 작업 이력을 관리하는 화면입니다.",'<button data-action="add-worker">＋ 근로자 등록</button>')+`<section class="panel"><div class="panel-heading"><h2>등록 근로자 <span class="badge">가상 자료</span></h2></div>${table(["이름","연락처","직종","계좌","기본 일당","등록 작업","상태",""],workers.map(workerRow))}</section>`;}
function recordActions(kind, record) {
  return `<td class="row-actions">
    <button class="secondary" data-record="${kind}" data-action="edit-record" data-id="${record.id}">수정</button>
    <button class="quiet" data-record="${kind}" data-action="toggle-record" data-id="${record.id}">${record.active?"비활성화":"활성화"}</button>
  </td>`;
}
function recordStatus(active, label=active?"활성":"비활성") {
  return `<span class="badge ${active?"":"pending"}">${label}</span>`;
}
function clientsPage() {
  const clientRows = clients.map(c=>`<tr><td><strong>${esc(c.name)}</strong></td>
    <td>${esc(c.contact||"-")}</td><td>${esc(c.phone||"-")}</td><td>${esc(c.businessNumber||"-")}</td>
    <td>${recordStatus(c.active)}</td>${recordActions("client",c)}</tr>`);
  const siteRows = sites.map(s=>`<tr><td><strong>${esc(s.name)}</strong></td>
    <td>${esc(client(s.clientId).name)}</td><td>${esc(s.address||"-")}</td>
    <td>${entries.filter(e=>e.site===s.id).length}건</td>
    <td>${s.active && !availableSite(s)?recordStatus(false,"거래처 비활성"):recordStatus(s.active)}</td>
    ${recordActions("site",s)}</tr>`);
  return heading("거래처·현장","거래처 아래에 현장을 묶어 관리합니다.")+`
    <section class="panel">
      <div class="panel-heading"><h2>거래처</h2><button data-record="client" data-action="add-record">＋ 거래처 등록</button></div>
      ${table(["거래처명","담당자","연락처","사업자등록번호","상태",""],clientRows)}
    </section>
    <section class="panel">
      <div class="panel-heading"><h2>현장</h2><button data-record="site" data-action="add-record" ${clients.some(c=>c.active)?"":"disabled"}>＋ 현장 등록</button></div>
      ${table(["현장명","소속 거래처","주소","등록 작업","상태",""],siteRows)}
    </section>`;
}
function payroll(){return heading("급여 정산","작업내역을 바탕으로 근로자별 금액을 확인합니다.")+`<div class="info"><strong>공제 규칙 확인 후 정산할 수 있습니다.</strong><p class="muted">아래는 전체 예시 작업의 일당 × 공수 합계입니다. 수수료·차량비·기타 항목과 원 단위 처리 전 금액이며 실지급액이 아닙니다.</p></div><section class="panel"><div class="panel-heading"><h2>근로자별 정산 틀</h2><button disabled>급여 확정 · 규칙 확인 필요</button></div>${table(["근로자","공수 합계","공제 전 계산값","수수료 / 차량비","실지급액"],workers.map(w=>{const rows=activeEntries().filter(e=>e.worker===w.id);return `<tr><td>${esc(w.name)}</td><td>${money(rows.reduce((s,e)=>s+e.units,0))}</td><td>${money(rows.reduce((s,e)=>s+e.rate*e.units,0))}원</td><td>확인 필요</td><td>미확정</td></tr>`;}))}</section>`;}
function claims(){return heading("작업확인서","거래처에 전달할 작업 내역의 구성 예시입니다.")+`<div class="info"><strong>기존 양식과 청구단가를 확인 중입니다.</strong><p class="muted">아래는 ${esc(client("c1").name)}의 미발행 초안입니다. 근로자 공제내역과 개인 계좌는 표시하지 않습니다.</p></div><section class="panel"><div class="panel-heading"><h2>문서 미리보기</h2><button disabled>발행 · 양식 확인 필요</button></div><div class="document"><h2>작업확인서</h2><p class="draft">화면 검토용 · 미발행</p><p><strong>${esc(client("c1").name)} 귀중</strong><br>발행자: 우리 인력사무소(예시)<br>대상: ${esc(client("c1").name)}의 전체 예시 작업</p>${table(["작업일","현장","근로자","공수","청구금액"],activeEntries().filter(e=>site(e.site).clientId==="c1").map(e=>`<tr><td>${esc(e.date)}</td><td>${esc(site(e.site).name)}</td><td>${esc(person(e.worker).name)}</td><td>${e.units}</td><td>단가 확인 필요</td></tr>`))}<p style="text-align:right;margin-top:20px"><strong>총 청구액: 미확정</strong></p></div></section>`;}
function settings(){return heading("설정","업무 기본값과 사용자 관리를 구성할 공간입니다.")+`<section class="panel"><h2>확인할 기본값</h2>${table(["항목","현재 상태"],["일일 수수료","차량 이용료","공수·반나절 처리","급여 지급 주기","원 단위 처리","사용자별 권한"].map(label=>`<tr><td>${label}</td><td><span class="badge pending">업무 답변 대기</span></td></tr>`))}</section><section class="panel"><h2>이 시안에서 가능한 일</h2><ul class="settings-list"><li>메뉴 이동과 PC·휴대폰 화면 구성 확인</li><li>가상 작업 등록·수정·취소, 조건별 조회, 공제 전 계산값 확인</li></ul><p class="muted">로그인, 영구 저장, 두 기기 간 공유, 급여 확정, 문서 발행은 아직 연결하지 않았습니다. 실제 개인정보는 입력하지 마세요.</p></section>`;}
const pages={home,work,workers:workerPage,clients:clientsPage,payroll,claims,settings};
function render(){const key=location.hash.slice(1);const route=pages[key]?key:"home";content.innerHTML=pages[route]();document.title=`${titles[route]} · 우리 인력사무소`;document.querySelectorAll("nav a").forEach(a=>{if(a.hash===`#${route}`)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});}
function filter() {
  const date = document.querySelector("#filter-date").value;
  const clientId = document.querySelector("#filter-client").value;
  const siteId = document.querySelector("#filter-site").value;
  const workerId = document.querySelector("#filter-worker").value;
  const rows = entries.filter(entry=>
    (!date || entry.date===date) &&
    (!clientId || site(entry.site).clientId===clientId) &&
    (!siteId || entry.site===siteId) &&
    (!workerId || entry.worker===workerId));
  document.querySelector("#work-results").innerHTML = workTable(rows,true);
}

const workRows = document.querySelector("#work-rows");
const workError = document.querySelector("#form-error");
let editingEntries = [];
function updateWorkSites(selectedSite) {
  const select = form.elements.site;
  select.innerHTML = '<option value="">현장 선택</option>' +
    options(sites.filter(s=>s.clientId===form.elements.clientId.value && availableSite(s)));
  select.value = selectedSite && availableSite(site(selectedSite)) ? selectedSite : "";
}
function addWorkRow(entry, allowRemove) {
  const row = document.createElement("fieldset");
  row.className = "work-row";
  row.innerHTML = `<legend>근로자${entry && !person(entry.worker).active ? ` · 기존 ${esc(person(entry.worker).name)} (비활성)` : ""}</legend>
    <label>근로자 선택<select name="worker" required><option value="">근로자 선택</option>${options(workers.filter(w=>w.active))}</select></label>
    <div class="form-grid">
      <label>공수<input name="units" type="number" min="0.01" step="any" required></label>
      <label>적용 일당(원)<input name="rate" type="number" min="0" step="1" required></label>
    </div>
    <label class="check"><input name="vehicle" type="checkbox">회사 차량 이용</label>
    ${allowRemove ? '<button type="button" class="quiet" data-remove-row>추가 행 제거</button>' : ""}`;
  row.querySelector('[name="worker"]').value = entry && person(entry.worker).active ? entry.worker : "";
  row.querySelector('[name="units"]').value = entry?.units ?? 1;
  row.querySelector('[name="rate"]').value = entry?.rate ?? "";
  row.querySelector('[name="vehicle"]').checked = entry?.vehicle ?? false;
  workRows.append(row);
  return row;
}
function openForm(entry) {
  editingEntries = entry ? activeEntries().filter(e=>e.date===entry.date && e.site===entry.site) : [];
  form.reset();
  workRows.replaceChildren();
  workError.textContent = "";
  document.querySelector("#dialog-title").textContent = entry ? "작업 수정" : "작업 등록";
  document.querySelector("#work-dialog-description").textContent = entry
    ? `${entry.date} · ${client(site(entry.site).clientId).name} · ${site(entry.site).name}의 작성 중 작업을 함께 수정합니다.`
    : "날짜와 현장을 선택하고 근로자별 공수를 입력하세요.";
  form.elements.date.value = entry?.date ?? today;
  form.elements.clientId.innerHTML = '<option value="">거래처 선택</option>' + options(clients.filter(c=>c.active));
  if (entry) {
    const workplace = site(entry.site);
    form.elements.clientId.value = client(workplace.clientId).active ? workplace.clientId : "";
    updateWorkSites(entry.site);
    editingEntries.forEach(e=>addWorkRow(e,false));
  } else {
    updateWorkSites();
    addWorkRow(null,false);
  }
  dialog.showModal();
}
function refreshWork() {
  if (document.querySelector("#work-results")) filter();
  else render();
}
function openWorkerForm(id){workerForm.reset();document.querySelector("#worker-form-error").textContent="";const w=id?person(id):null;document.querySelector("#worker-dialog-title").textContent=w?"근로자 수정":"근로자 등록";workerForm.elements.id.value=w?w.id:"";workerForm.elements.name.value=w?w.name:"";workerForm.elements.phone.value=w?w.phone||"":"";workerForm.elements.trade.value=w?w.trade||"":"";workerForm.elements.account.value=w?w.account||"":"";workerForm.elements.rate.value=w?w.rate:"";workerDialog.showModal();}
content.addEventListener("click",event=>{const target=event.target.closest("[data-action]");const action=target?.dataset.action;if(action==="add-worker")openWorkerForm();if(action==="edit-worker")openWorkerForm(target.dataset.id);if(action==="toggle-worker"){const w=person(target.dataset.id);if(!w)return;w.active=!w.active;render();const toast=document.querySelector("#toast");toast.textContent=`${w.name}의 상태를 ${w.active?"활동 중":"비활성"}으로 변경했습니다. 실제 저장은 아닙니다.`;toast.style.display="block";setTimeout(()=>{toast.style.display="none";},4000);}});
content.addEventListener("change",event=>{if(event.target.id.startsWith("filter-"))filter();});
content.addEventListener("click",event=>{
  const button = event.target.closest("[data-action]");
  switch (button?.dataset.action) {
    case "add":
      openForm();
      break;
    case "edit-work":
      openForm(entries[button.dataset.index]);
      break;
    case "cancel-work": {
      const entry = entries[button.dataset.index];
      if (window.confirm(`${entry.date} · ${site(entry.site).name} · ${person(entry.worker).name} 작업을 취소할까요?`)) {
        entry.cancelled = true;
        refreshWork();
      }
      break;
    }
    case "reset-filter":
      document.querySelectorAll(".filters input, .filters select").forEach(field=>{field.value="";});
      filter();
      break;
  }
});
form.elements.clientId.addEventListener("change",()=>updateWorkSites());
document.querySelector("#add-work-row").addEventListener("click",()=>{
  addWorkRow(null,true).querySelector("select").focus();
});
workRows.addEventListener("click",event=>{
  if (event.target.matches("[data-remove-row]")) {
    event.target.closest(".work-row").remove();
    document.querySelector("#add-work-row").focus();
  }
});
workRows.addEventListener("change",event=>{
  if (event.target.name==="worker") {
    event.target.closest(".work-row").querySelector('[name="rate"]').value = person(event.target.value)?.rate ?? "";
  }
});
for(const id of ["close-dialog","cancel-dialog"])document.getElementById(id).addEventListener("click",()=>dialog.close());
for(const id of ["close-worker-dialog","cancel-worker-dialog"])document.getElementById(id).addEventListener("click",()=>workerDialog.close());
form.addEventListener("submit",event=>{
  event.preventDefault();
  const {date,clientId,site:siteField} = form.elements;
  const workplace = site(siteField.value);
  workError.textContent = "";
  if (!workplace || !availableSite(workplace) || workplace.clientId!==clientId.value) {
    workError.textContent = "활성 거래처의 활성 현장을 선택하세요.";
    return;
  }
  const rows = Array.from(workRows.children, row=>({
    date:date.value,
    site:workplace.id,
    worker:row.querySelector('[name="worker"]').value,
    units:row.querySelector('[name="units"]').valueAsNumber,
    rate:row.querySelector('[name="rate"]').valueAsNumber,
    vehicle:row.querySelector('[name="vehicle"]').checked,
  }));
  const usedWorkers = new Set(activeEntries()
    .filter(e=>e.date===date.value && e.site===workplace.id && !editingEntries.includes(e))
    .map(e=>e.worker));
  for (const row of rows) {
    if (!person(row.worker)?.active) {
      workError.textContent = "활성 근로자를 선택하세요.";
      return;
    }
    if (!Number.isFinite(row.units) || row.units<=0 || !Number.isSafeInteger(row.rate) || row.rate<0 || !Number.isFinite(row.units*row.rate)) {
      workError.textContent = "공수와 일당에 올바른 숫자를 입력하세요.";
      return;
    }
    if (usedWorkers.has(row.worker)) {
      workError.textContent = `${person(row.worker).name}의 같은 날짜·현장 작업이 이미 있습니다.`;
      return;
    }
    usedWorkers.add(row.worker);
  }
  rows.forEach((row,index)=>{
    if (index<editingEntries.length) Object.assign(editingEntries[index],row);
    else entries.push(row);
  });
  dialog.close();
  refreshWork();
});
workerForm.addEventListener("submit",event=>{event.preventDefault();if(!workerForm.reportValidity())return;const values=new FormData(workerForm);const id=values.get("id");const name=values.get("name").trim();const rate=Number(values.get("rate"));const error=document.querySelector("#worker-form-error");if(!name){error.textContent="이름을 입력하세요.";return;}if(!Number.isSafeInteger(rate)||rate<0){error.textContent="기본 일당에 올바른 숫자를 입력하세요.";return;}const fields={name,phone:values.get("phone").trim(),trade:values.get("trade").trim(),account:values.get("account").trim(),rate};if(id){const existing=person(id);if(!existing){error.textContent="대상 근로자를 찾을 수 없습니다.";return;}Object.assign(existing,fields);}else{workers.push({id:`w${nextWorkerId++}`,active:true,...fields});}workerDialog.close();render();const toast=document.querySelector("#toast");toast.textContent=id?"시안에서 근로자 정보를 수정했습니다. 실제 저장은 아닙니다.":"시안에 근로자를 등록했습니다. 실제 저장은 아닙니다.";toast.style.display="block";setTimeout(()=>{toast.style.display="none";},4000);});
const recordTypes = {
  client:{label:"거래처",rows:clients,prefix:"c",fields:["name","contact","phone","businessNumber"]},
  site:{label:"현장",rows:sites,prefix:"s",fields:["name","address","clientId"]},
};
for (const [kind,type] of Object.entries(recordTypes)) {
  const recordDialog = document.querySelector(`#${kind}-dialog`);
  const recordForm = document.querySelector(`#${kind}-form`);
  const error = document.querySelector(`#${kind}-form-error`);
  const title = document.querySelector(`#${kind}-dialog-title`);

  content.addEventListener("click",event=>{
    const button = event.target.closest(`button[data-record="${kind}"]`);
    if (!button) return;
    const record = type.rows.find(row=>row.id===button.dataset.id);
    if (button.dataset.action==="toggle-record") {
      record.active = !record.active;
      render();
      return;
    }

    recordForm.reset();
    error.textContent = "";
    title.textContent = `${type.label} ${record?"수정":"등록"}`;
    recordForm.elements.id.value = record?.id ?? "";
    if (kind==="site") {
      recordForm.elements.clientId.innerHTML = clients
        .filter(c=>c.active || c.id===record?.clientId)
        .map(c=>`<option value="${c.id}">${esc(c.name)}${c.active?"":" (비활성)"}</option>`)
        .join("");
    }
    if (record) {
      for (const field of type.fields) recordForm.elements[field].value = record[field];
    }
    recordDialog.showModal();
  });

  for (const button of recordForm.querySelectorAll("[data-close]")) {
    button.addEventListener("click",()=>recordDialog.close());
  }
  recordForm.addEventListener("submit",event=>{
    event.preventDefault();
    const values = new FormData(recordForm);
    const record = type.rows.find(row=>row.id===values.get("id"));
    const fields = Object.fromEntries(type.fields.map(field=>[field,values.get(field).trim()]));
    if (!fields.name) {
      error.textContent = `${type.label}명을 입력하세요.`;
      return;
    }
    if (kind==="site" && fields.clientId!==record?.clientId && !client(fields.clientId)?.active) {
      error.textContent = "활성 거래처를 선택하세요.";
      return;
    }
    if (record) Object.assign(record,fields);
    else type.rows.push({id:`${type.prefix}${type.rows.length+1}`,active:true,...fields});
    recordDialog.close();
    render();
  });
}
window.addEventListener("hashchange",()=>{render();content.focus();});
render();
