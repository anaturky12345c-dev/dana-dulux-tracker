(() => {
  'use strict';
  if (!window.DANA_CONFIG || !window.supabase) return;
  const style = document.createElement('style');
  style.textContent = `
    #debtAging .debt-head{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:14px}
    #debtAging .debt-metrics{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:10px;margin-bottom:14px}
    #debtAging .debt-metric{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:13px}
    #debtAging .debt-metric span{font-size:12px;color:#64748b;display:block}
    #debtAging .debt-metric b{font-size:21px;display:block;margin-top:5px}
    #debtAging .debt-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
    #debtAging .debt-toolbar input,#debtAging .debt-toolbar select{flex:1;min-width:150px}
    #debtAging .debt-table{min-width:850px}
    #debtAging .debt-actions{display:flex;gap:6px;flex-wrap:wrap}
    #debtAging .debt-request-card{border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin:8px 0;background:#fff}
    #debtAging .debt-request-top{display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap}
    #debtAging .debt-audio{width:min(360px,100%);height:38px}
    #debtAging .debt-rec-status{font-size:12px;color:#64748b;margin-top:6px}
    #debtAging .debt-danger{background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;border-radius:10px;padding:10px;font-size:12px}
    @media(max-width:720px){#debtAging .debt-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}#debtAging .debt-metric b{font-size:18px}#debtAging .debt-toolbar input,#debtAging .debt-toolbar select{min-width:100%}#debtAging .debt-head .btn{width:100%;min-height:46px}}
    @media print{@page{size:A4 landscape;margin:10mm}body.debt-printing>*{display:none!important}body.debt-printing #debtPrintRoot{display:block!important;position:static!important;width:100%;direction:rtl;font-family:Tahoma,Arial,sans-serif;color:#111}#debtPrintRoot h1{font-size:18pt;margin:0 0 4mm}#debtPrintRoot p{font-size:9pt;margin:0 0 4mm;color:#444}#debtPrintRoot table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8pt}#debtPrintRoot th,#debtPrintRoot td{border:1px solid #888;padding:4px 5px;vertical-align:top;overflow-wrap:anywhere;white-space:normal}#debtPrintRoot th{background:#e8edf3!important;print-color-adjust:exact;-webkit-print-color-adjust:exact}#debtPrintRoot tr{break-inside:avoid;page-break-inside:avoid}#debtPrintRoot .debt-print-total{font-weight:bold;margin-top:4mm;font-size:10pt}}
  `;
  document.head.appendChild(style);

  const main = document.querySelector('.app main');
  const nav = document.querySelector('.nav-grid');
  if (!main || !nav) return;
  const navBtn = document.createElement('button');
  navBtn.type = 'button'; navBtn.dataset.page = 'debtAging'; navBtn.textContent = 'أعمار الديون';
  nav.appendChild(navBtn);
  const page = document.createElement('section');
  page.id = 'debtAging'; page.className = 'section'; page.dir = 'rtl';
  page.innerHTML = `
    <div class="debt-head"><div><h2 style="margin:0 0 4px">أعمار الديون</h2><div class="small">بيانات مستقلة عن المبيعات والمتابعات</div></div><div id="debtAdminActions" class="debt-actions"></div></div>
    <div id="debtResetNote" class="notice hidden"></div>
    <div class="debt-metrics"><div class="debt-metric"><span>إجمالي الدين الظاهر</span><b id="debtTotal">0</b></div><div class="debt-metric"><span>إجمالي المتأخرات</span><b id="debtOverdue">0</b></div><div class="debt-metric"><span>المطلوب الأسبوعي</span><b id="debtRequired">0</b></div><div class="debt-metric"><span>المحصّل/المخفّض هذا الأسبوع</span><b id="debtRecovered">0</b></div></div>
    <div id="debtImportBox" class="card hidden" style="margin-bottom:12px"><h3>رفع ملف أعمار الديون</h3><p class="small">يستبدل الملف السابق داخل صفحة أعمار الديون فقط. لا يغيّر العملاء أو المبيعات أو المتابعات.</p><input id="debtFile" type="file" accept=".xlsx,.xls,.csv"/><div id="debtMapping" class="form-grid" style="margin-top:10px"></div><div class="debt-actions" style="margin-top:10px"><button class="btn" id="debtImportBtn" type="button">استيراد البيانات</button></div><div id="debtImportMsg" class="small" style="margin-top:8px"></div></div>
    <div class="debt-toolbar"><input id="debtSearch" placeholder="ابحث باسم العميل أو الحي أو الجوال"/><select id="debtRepFilter"><option value="">كل المندوبين</option></select><select id="debtAgingFilter"><option value="all">كل العملاء</option><option value="overdue">لديهم متأخرات</option><option value="over60">أكثر من 60 يوم</option></select><button class="btn secondary" id="debtPdf" type="button">تقرير PDF</button></div>
    <div class="table-wrap"><table class="debt-table"><thead><tr><th>العميل</th><th>الحي</th><th>المندوب</th><th>إجمالي الدين</th><th>المتأخرات</th><th>المطلوب أسبوعياً</th><th>المحصّل/المخفّض</th><th>المتبقي للأسبوع</th><th>عمر أقدم دين</th><th>الإجراء</th></tr></thead><tbody id="debtRows"></tbody></table></div>
    <div id="debtRequestsWrap" class="card" style="margin-top:14px"><div class="debt-head"><div><h3 style="margin:0">طلبات زيارة الإدارة ومشاكل المندوبين</h3><div class="small">تظهر للإدارة لمتابعتها والرد عليها.</div></div><button id="debtNewRequest" class="btn" type="button">طلب زيارة / متابعة مشكلة</button></div><div id="debtRequests"></div></div>
    <div id="debtPrintRoot" hidden></div>`;
  main.appendChild(page);

  const $ = id => document.getElementById(id);
  const escText = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = value => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(Number(value||0));
  const money = value => `${fmt(value)} ر.س`;
  const isFull = () => ['admin','accounts'].includes(APP.state.profile?.role);
  const isManagement = () => ['admin','manager','accounts'].includes(APP.state.profile?.role);
  const isAccounts = () => APP.state.profile?.role === 'accounts';
  let rows = [], reps = [], requests = [], currentFileRows = [], recorder = null, recordedBlob = null, currentRequestFilter = '';
  const audioCache = new Map();

  function goDebt(){
    if (!APP.state.profile) return;
    APP.gotoPage('debtAging');
    navBtn.classList.add('active');
    $('pageTitle').textContent='أعمار الديون';
    loadAll();
  }
  function restrictAccounts(){
    const only = isAccounts();
    document.querySelectorAll('.nav-grid button').forEach(b=>{if(b!==navBtn)b.classList.toggle('hidden',only);});
    document.querySelectorAll('.section').forEach(s=>{if(s!==page)s.classList.toggle('hidden',only);});
    if(only && APP.state.profile && !$('login').classList.contains('hidden')) return;
    if(only && APP.state.profile && !page.classList.contains('active')) goDebt();
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('.nav-grid button[data-page]'); if(!b)return;
    if(isAccounts() || b===navBtn){e.preventDefault();e.stopImmediatePropagation();goDebt();}
  },true);
  const gateObserver = new MutationObserver(restrictAccounts);
  gateObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
  window.setInterval(restrictAccounts,1200);

  $('debtAdminActions').innerHTML = isFull()?'<button class="btn" id="debtShowImport" type="button">رفع ملف السبت</button>':'';
  $('debtImportBox').classList.toggle('hidden',!isFull());
  $('debtRepFilter').classList.toggle('hidden',!isFull());
  $('debtShowImport')?.addEventListener('click',()=>{$('debtImportBox').classList.toggle('hidden');});
  $('debtNewRequest').addEventListener('click',openRequestForm);
  $('debtSearch').addEventListener('input',renderRows);
  $('debtRepFilter').addEventListener('change',renderRows);
  $('debtAgingFilter').addEventListener('change',renderRows);
  $('debtRows').addEventListener('click',e=>{
    const b=e.target.closest('[data-debt-action]'); if(!b)return;
    const row=rows.find(x=>x.id===b.dataset.id); if(!row)return;
    if(b.dataset.debtAction==='entry')openEntryForm(row);
    if(b.dataset.debtAction==='edit')editCustomer(row);
  });
  $('debtRequests').addEventListener('click',e=>{
    const b=e.target.closest('[data-request-action]'); if(!b)return;
    const req=requests.find(x=>x.id===b.dataset.id); if(!req)return;
    if(b.dataset.requestAction==='resolve')resolveRequest(req);
    if(b.dataset.requestAction==='audio')playRequestAudio(req);
  });
  $('debtPdf').addEventListener('click',exportPdf);
  $('debtFile').addEventListener('change',readImportFile);
  $('debtImportBtn').addEventListener('click',importSnapshot);

  async function loadAll(){
    if(!APP.state.profile)return;
    if(!isFull()) $('debtRepFilter').classList.add('hidden');
    const [balanceRes,repRes,requestRes] = await Promise.all([
      APP.sb.from('debt_aging_balances').select('*').order('customer_name'),
      isFull()?APP.sb.from('profiles').select('id,full_name,username').eq('role','rep').eq('active',true).order('full_name'):Promise.resolve({data:[],error:null}),
      APP.sb.from('debt_aging_requests').select('id,rep_id,customer_id,request_type,reason,audio_path,status,management_response,created_at,resolved_at,rep:profiles!debt_aging_requests_rep_id_fkey(full_name),customer:debt_aging_customers(customer_name)').order('created_at',{ascending:false}).limit(150)
    ]);
    rows=balanceRes.error?[]:(balanceRes.data||[]); reps=repRes.data||[]; requests=requestRes.error?[]:(requestRes.data||[]);
    if(balanceRes.error) console.error('debt aging load',balanceRes.error);
    $('debtRepFilter').innerHTML='<option value="">كل المندوبين</option>'+reps.map(r=>`<option value="${r.id}">${escText(r.full_name)}</option>`).join('');
    renderRows(); renderRequests();
  }
  function currentRows(){
    const search=$('debtSearch').value.trim().toLowerCase(),rep=$('debtRepFilter').value,filter=$('debtAgingFilter').value;
    return rows.filter(r=>{
      const name=`${r.customer_name||''} ${r.area||''} ${r.phone||''}`.toLowerCase();
      const age=r.oldest_due_date?Math.floor((Date.now()-new Date(`${r.oldest_due_date}T00:00:00Z`))/86400000):0;
      return (!search||name.includes(search))&&(!rep||r.assigned_rep===rep)&&(filter==='all'||(filter==='overdue'&&Number(r.current_overdue)>0)||(filter==='over60'&&age>60));
    });
  }
  function renderRows(){
    const view=currentRows();
    const sums=view.reduce((a,r)=>{a.total+=Number(r.current_total||0);a.overdue+=Number(r.current_overdue||0);a.required+=Number(r.weekly_required||0);a.recovered+=Number(r.recovered_this_week||0);return a;},{total:0,overdue:0,required:0,recovered:0});
    $('debtTotal').textContent=money(sums.total);$('debtOverdue').textContent=money(sums.overdue);$('debtRequired').textContent=money(sums.required);$('debtRecovered').textContent=money(sums.recovered);
    $('debtRows').innerHTML=view.length?view.map(r=>{
      const rep=reps.find(p=>p.id===r.assigned_rep)?.full_name||r.assigned_rep_name||'—';
      const age=r.oldest_due_date?Math.max(0,Math.floor((Date.now()-new Date(`${r.oldest_due_date}T00:00:00Z`))/86400000)):null;
      const action=isFull()?`<button class="btn secondary mini" data-debt-action="edit" data-id="${r.id}">تعديل</button>`:'';
      const collect=APP.state.profile?.role==='rep'?`<button class="btn mini" data-debt-action="entry" data-id="${r.id}">تسجيل دفعة / طلبية كاش</button>`:'';
      return `<tr><td>${escText(r.customer_name)}</td><td>${escText(r.area||'—')}</td><td>${escText(rep)}</td><td>${money(r.current_total)}</td><td><b>${money(r.current_overdue)}</b></td><td>${money(r.weekly_required)}</td><td>${money(r.recovered_this_week)}</td><td>${money(r.weekly_remaining)}</td><td>${age===null?'—':`${age} يوم`}</td><td><div class="debt-actions">${collect}${action}</div></td></tr>`;
    }).join(''):'<tr><td colspan="10" class="empty">لا توجد بيانات أعمار ديون حالياً.</td></tr>';
  }

  function renderRequests(){
    const management=isManagement();
    $('debtRequests').innerHTML=requests.length?requests.map(r=>{
      const type=r.request_type==='visit'?'طلب زيارة الإدارة':'متابعة مشكلة';
      const status={open:'جديد',in_progress:'قيد المتابعة',resolved:'تم الحل'}[r.status]||r.status;
      return `<div class="debt-request-card"><div class="debt-request-top"><b>${type} · ${escText(r.customer?.customer_name||'بدون عميل')}</b><span class="badge ${r.status==='resolved'?'b-good':'b-warn'}">${status}</span></div><div class="small">${escText(r.rep?.full_name||'مندوب')} · ${new Date(r.created_at).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'})}</div>${r.reason?`<p>${escText(r.reason)}</p>`:''}${r.audio_path?`<button class="btn secondary mini" type="button" data-request-action="audio" data-id="${r.id}">تشغيل السبب الصوتي</button>`:''}${r.management_response?`<div class="notice" style="margin-top:8px">رد الإدارة: ${escText(r.management_response)}</div>`:''}${management&&r.status!=='resolved'?`<div class="debt-actions" style="margin-top:8px"><button class="btn secondary mini" data-request-action="resolve" data-id="${r.id}">تحديث / إغلاق الطلب</button></div>`:''}</div>`;
    }).join(''):'<div class="empty">لا توجد طلبات مسجلة.</div>';
  }

  function openEntryForm(row){
    const form=`<div class="notice">الطلبية الكاش تقلل أقدم المتأخرات فقط، ولا تدخل في المبيعات. الدفعة تقلل إجمالي الدين والمتأخرات.</div><div class="form-grid"><div><label>دفعة تحصيل (ر.س)</label><input id="debtPaymentAmount" type="number" min="0" step="0.01" inputmode="decimal" value="0"></div><div><label>طلبية كاش مدفوعة فوراً (ر.س) — اختياري</label><input id="debtCashAmount" type="number" min="0" step="0.01" inputmode="decimal" value="0"></div><div class="full"><label>التاريخ</label><input id="debtEntryDate" type="date" value="${APP.todayRiyadh()}"></div><div class="full"><label>ملاحظة اختيارية</label><input id="debtEntryNote" maxlength="250"></div><div class="full"><button class="btn" id="debtSaveEntry">حفظ</button><div id="debtEntryError" class="small"></div></div></div>`;
    APP.openModal?.('تسجيل حركة أعمار ديون',form);
    setTimeout(()=>{const b=document.getElementById('debtSaveEntry');if(b)b.onclick=()=>saveEntry(row);},0);
  }
  async function saveEntry(row){
    const payment=Number(document.getElementById('debtPaymentAmount')?.value||0),cash=Number(document.getElementById('debtCashAmount')?.value||0),date=document.getElementById('debtEntryDate')?.value||APP.todayRiyadh(),note=document.getElementById('debtEntryNote')?.value.trim()||null;
    const errorBox=document.getElementById('debtEntryError');
    if(payment<0||cash<0||(!payment&&!cash)){errorBox.textContent='أدخل مبلغاً للدفعة أو الطلبية الكاش.';return;}
    if(payment>Number(row.current_total)||cash>Number(row.current_overdue)){errorBox.textContent='المبلغ أكبر من الرصيد المتاح.';return;}
    const items=[];for(const [entry_type,amount] of [['payment',payment],['cash_order',cash]])if(amount>0)items.push({customer_id:row.id,entry_type,amount,business_date:date,rep_id:APP.state.profile.id,created_by:APP.state.profile.id,note});
    const {error}=await APP.sb.from('debt_aging_entries').insert(items);
    if(error){errorBox.textContent='تعذر الحفظ. '+(error.message||'');return;}
    document.getElementById('modal')?.classList.remove('open');await loadAll();APP.flash?.('تم تسجيل الحركة');
  }
  function editCustomer(row){
    const options=reps.map(r=>`<option value="${r.id}" ${r.id===row.assigned_rep?'selected':''}>${escText(r.full_name)}</option>`).join('');
    const form=`<div class="form-grid"><div><label>المطلوب أسبوعياً</label><input id="debtEditWeekly" type="number" min="0" step="0.01" value="${Number(row.weekly_required||0)}"></div><div><label>المندوب المسؤول</label><select id="debtEditRep"><option value="">بدون تعيين</option>${options}</select></div><div><label>أقدم تاريخ استحقاق</label><input id="debtEditDue" type="date" value="${row.oldest_due_date||''}"></div><div class="full"><button class="btn" id="debtEditSave">حفظ التعديل</button><span id="debtEditMsg" class="small"></span></div></div>`;
    APP.openModal?.('تعديل بيانات أعمار الديون',form);
    setTimeout(()=>{const b=document.getElementById('debtEditSave');if(b)b.onclick=async()=>{const {error}=await APP.sb.from('debt_aging_customers').update({weekly_required:Number(document.getElementById('debtEditWeekly').value||0),assigned_rep:document.getElementById('debtEditRep').value||null,oldest_due_date:document.getElementById('debtEditDue').value||null,updated_at:new Date().toISOString()}).eq('id',row.id);document.getElementById('debtEditMsg').textContent=error?'تعذر الحفظ':'تم الحفظ';if(!error){document.getElementById('modal')?.classList.remove('open');await loadAll();}};},0);
  }

  function openRequestForm(){
    if(APP.state.profile?.role!=='rep')return;
    const customerOpts=rows.filter(r=>r.assigned_rep===APP.state.profile.id).map(r=>`<option value="${r.id}">${escText(r.customer_name)}</option>`).join('');
    const form=`<div class="form-grid"><div><label>نوع الطلب</label><select id="debtRequestType"><option value="visit">طلب زيارة الإدارة</option><option value="issue">متابعة مشكلة</option></select></div><div><label>العميل (اختياري)</label><select id="debtRequestCustomer"><option value="">بدون عميل</option>${customerOpts}</select></div><div class="full"><label>سبب الطلب صوتياً</label><button class="btn secondary" id="debtRecordStart" type="button">بدء التسجيل</button> <button class="btn secondary" id="debtRecordStop" type="button" disabled>إيقاف التسجيل</button><div id="debtRecordStatus" class="debt-rec-status">مدة التسجيل القصوى دقيقتان.</div></div><div class="full"><label>تفاصيل إضافية (اختياري)</label><textarea id="debtRequestReason" rows="3" maxlength="1000"></textarea></div><div class="full"><button class="btn" id="debtSendRequest">إرسال للإدارة</button><span id="debtRequestError" class="small"></span></div></div>`;
    APP.openModal?.('طلب زيارة / متابعة مشكلة',form);
    setTimeout(()=>{
      document.getElementById('debtRecordStart').onclick=startRecording;
      document.getElementById('debtRecordStop').onclick=stopRecording;
      document.getElementById('debtSendRequest').onclick=submitRequest;
    },0);
  }
  async function startRecording(){
    try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});recordedBlob=null;recorder=new MediaRecorder(stream);const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>{recordedBlob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});stream.getTracks().forEach(t=>t.stop());document.getElementById('debtRecordStatus').textContent='تم تجهيز التسجيل الصوتي.';};recorder.start();document.getElementById('debtRecordStart').disabled=true;document.getElementById('debtRecordStop').disabled=false;document.getElementById('debtRecordStatus').textContent='جاري التسجيل…';setTimeout(()=>{if(recorder?.state==='recording')stopRecording();},120000);}catch(e){document.getElementById('debtRecordStatus').textContent='تعذر تشغيل الميكروفون؛ اكتب السبب في التفاصيل الإضافية.';}
  }
  function stopRecording(){if(recorder?.state==='recording'){recorder.stop();document.getElementById('debtRecordStart').disabled=false;document.getElementById('debtRecordStop').disabled=true;}}
  async function submitRequest(){
    const type=document.getElementById('debtRequestType').value,customer=document.getElementById('debtRequestCustomer').value||null,reason=document.getElementById('debtRequestReason').value.trim(),msg=document.getElementById('debtRequestError');
    if(recorder?.state==='recording')stopRecording();await new Promise(r=>setTimeout(r,100));
    if(!reason&&!recordedBlob){msg.textContent='سجل السبب صوتياً أو اكتب تفاصيله.';return;}
    const id=crypto.randomUUID(),path=recordedBlob?`${APP.state.profile.id}/${id}.${recordedBlob.type.includes('ogg')?'ogg':recordedBlob.type.includes('mp4')?'mp4':'webm'}`:null;
    const {error:insertError}=await APP.sb.from('debt_aging_requests').insert({id,rep_id:APP.state.profile.id,customer_id:customer,request_type:type,reason:reason||null,audio_path:path});
    if(insertError){msg.textContent='تعذر تسجيل الطلب.';return;}
    if(recordedBlob){const {error:uploadError}=await APP.sb.storage.from('debt-aging-requests').upload(path,recordedBlob,{contentType:recordedBlob.type,upsert:false});if(uploadError){await APP.sb.from('debt_aging_requests').update({audio_path:null,reason:reason||'تعذر رفع التسجيل الصوتي عند الإرسال.'}).eq('id',id);msg.textContent='لم يرفع الصوت، لكن أُرسل الطلب مع التفاصيل المكتوبة.';}}
    document.getElementById('modal')?.classList.remove('open');await loadAll();APP.flash?.('وصل طلبك للإدارة');
  }
  async function resolveRequest(req){
    const response=prompt('اكتب رد الإدارة أو الإجراء المتخذ:');if(response===null)return;
    const {error}=await APP.sb.from('debt_aging_requests').update({status:'resolved',management_response:response.trim()||'تمت المعالجة',resolved_at:new Date().toISOString()}).eq('id',req.id);
    if(error){APP.flash?.('تعذر تحديث الطلب',true);return;}await loadAll();
  }
  async function playRequestAudio(req){
    if(!req.audio_path)return;
    let url=audioCache.get(req.audio_path);
    if(!url){const {data,error}=await APP.sb.storage.from('debt-aging-requests').createSignedUrl(req.audio_path,300);if(error){APP.flash?.('تعذر تشغيل الصوت',true);return;}url=data.signedUrl;audioCache.set(req.audio_path,url);}
    const audio=document.createElement('audio');audio.controls=true;audio.src=url;audio.className='debt-audio';const card=document.querySelector(`[data-id="${req.id}"]`)?.closest('.debt-request-card');(card||$('debtRequests')).appendChild(audio);audio.play().catch(()=>{});
  }

  async function readImportFile(){
    const file=$('debtFile').files?.[0];if(!file)return;
    if(!window.XLSX){$('debtImportMsg').textContent='تعذر تحميل قارئ ملفات Excel.';return;}
    try{const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});const sheet=wb.Sheets[wb.SheetNames[0]];currentFileRows=XLSX.utils.sheet_to_json(sheet,{defval:'',raw:false});if(!currentFileRows.length)throw new Error('الملف لا يحتوي صفوفاً.');buildMapping(Object.keys(currentFileRows[0]));$('debtImportMsg').textContent=`تم قراءة ${currentFileRows.length} صف. راجع مطابقة الأعمدة قبل الاستيراد.`;}catch(e){$('debtImportMsg').textContent=e.message||'تعذر قراءة الملف.';}
  }
  function buildMapping(headers){
    const fields=[['customer_name','اسم العميل',true,['اسم العميل','العميل','customer','customer name','name']],['opening_total','إجمالي الدين',true,['إجمالي الدين','الرصيد','المبلغ المستحق','total debt','balance']],['opening_overdue','المتأخرات',true,['المتأخرات','المتأخر','overdue','past due']],['weekly_required','المطلوب أسبوعياً',false,['المطلوب أسبوعياً','الدفعة الأسبوعية','weekly required','weekly payment']],['area','الحي',false,['الحي','المنطقة','area','district']],['phone','الجوال',false,['الجوال','الهاتف','phone','mobile']],['rep','المندوب',false,['المندوب','المسؤول','rep','sales rep']],['oldest_due_date','تاريخ أقدم استحقاق',false,['تاريخ أقدم استحقاق','تاريخ الاستحقاق','due date','oldest due date']],['source_key','رقم العميل',false,['رقم العميل','كود العميل','customer id','code']]];
    $('debtMapping').innerHTML=fields.map(([key,label,required,aliases])=>{const guess=headers.find(h=>aliases.some(a=>h.toLowerCase().includes(a.toLowerCase())));return `<div><label>${label}${required?' *':''}</label><select data-map="${key}"><option value="">— لا يوجد —</option>${headers.map(h=>`<option value="${escText(h)}" ${h===guess?'selected':''}>${escText(h)}</option>`).join('')}</select></div>`;}).join('');
  }
  function dateForDb(value){if(!value)return null;const d=new Date(value);return Number.isNaN(d.valueOf())?null:d.toISOString().slice(0,10);}
  function importValues(){
    const map={};document.querySelectorAll('#debtMapping [data-map]').forEach(el=>map[el.dataset.map]=el.value);
    for(const f of ['customer_name','opening_total','opening_overdue'])if(!map[f])throw new Error('اختر عمود '+f+' المطلوب.');
    const repMap=new Map(reps.flatMap(r=>[[r.full_name.toLowerCase(),r.id],[r.username.toLowerCase(),r.id]]));
    const parsed=currentFileRows.map((r,i)=>{
      const val=k=>map[k]?String(r[map[k]]??'').trim():'';
      const num=k=>Number(val(k).replace(/[٠-٩]/g,ch=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(ch))).replace(/[۰-۹]/g,ch=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch))).replace(/[,،\sر.سSAR]/gi,''));
      const total=num('opening_total'),overdue=num('opening_overdue');
      if(!val('customer_name')||!Number.isFinite(total)||!Number.isFinite(overdue)||total<0||overdue<0||overdue>total)throw new Error(`راجع اسم العميل وأرقام الدين والمتأخرات في الصف ${i+2}.`);
      const repName=val('rep');const assigned=repMap.get(repName.toLowerCase())||null;
      if(repName&&!assigned)throw new Error(`المندوب في الصف ${i+2} غير مطابق لحساب موجود: ${repName}`);
      return {source_key:val('source_key')||null,customer_name:val('customer_name'),area:val('area')||null,phone:val('phone')||null,assigned_rep:assigned,opening_total:total,opening_overdue:overdue,weekly_required:map.weekly_required&&val('weekly_required')?num('weekly_required'):0,oldest_due_date:dateForDb(val('oldest_due_date'))};
    });
    const keys=parsed.filter(r=>r.source_key).map(r=>r.source_key);if(new Set(keys).size!==keys.length)throw new Error('يوجد رقم عميل مكرر في الملف.');
    const pairs=parsed.filter(r=>r.phone).map(r=>`${r.customer_name.trim().toLowerCase()}|${r.phone.replace(/\D/g,'')}`);if(new Set(pairs).size!==pairs.length)throw new Error('يوجد عميل مكرر بالاسم ورقم الجوال في الملف.');
    return parsed;
  }
  async function importSnapshot(){
    if(!isAccounts()&&!isAdmin())return;
    try{const parsed=importValues();if(!confirm(`سيتم استبدال بيانات أعمار الديون فقط بـ ${parsed.length} عميل. لن تتأثر بيانات المبيعات أو المتابعات. تتابع؟`))return;$('debtImportBtn').disabled=true;$('debtImportMsg').textContent='جاري الاستيراد…';const {data,error}=await APP.sb.rpc('debt_aging_replace_snapshot',{p_rows:parsed});if(error)throw error;$('debtImportMsg').textContent=`تم استيراد ${parsed.length} عميل.`;await loadAll();}catch(e){$('debtImportMsg').textContent=e.message||'فشل الاستيراد.';}finally{$('debtImportBtn').disabled=false;}
  }
  function exportPdf(){
    const data=currentRows(),totals=data.reduce((a,r)=>{a.total+=Number(r.current_total||0);a.overdue+=Number(r.current_overdue||0);return a;},{total:0,overdue:0});
    const html=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير أعمار الديون</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Tahoma,Arial,sans-serif;color:#111;margin:0}h1{font-size:18pt;margin:0 0 4mm}p{font-size:9pt;color:#444;margin:0 0 4mm}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8pt}th,td{border:1px solid #888;padding:4px 5px;vertical-align:top;overflow-wrap:anywhere;white-space:normal}th{background:#e8edf3}tr{break-inside:avoid;page-break-inside:avoid}.total{font-weight:bold;margin-top:4mm;font-size:10pt}</style></head><body><h1>تقرير أعمار الديون</h1><p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA',{timeZone:'Asia/Riyadh'})} · عدد العملاء: ${data.length}</p><table><thead><tr><th>العميل</th><th>الحي</th><th>المندوب</th><th>إجمالي الدين</th><th>المتأخرات</th><th>المطلوب أسبوعياً</th><th>المحصّل/المخفّض</th><th>المتبقي للأسبوع</th><th>أقدم استحقاق</th></tr></thead><tbody>${data.map(r=>`<tr><td>${escText(r.customer_name)}</td><td>${escText(r.area||'—')}</td><td>${escText(reps.find(x=>x.id===r.assigned_rep)?.full_name||'—')}</td><td>${money(r.current_total)}</td><td>${money(r.current_overdue)}</td><td>${money(r.weekly_required)}</td><td>${money(r.recovered_this_week)}</td><td>${money(r.weekly_remaining)}</td><td>${escText(r.oldest_due_date||'—')}</td></tr>`).join('')}</tbody></table><div class="total">إجمالي الدين: ${money(totals.total)} · إجمالي المتأخرات: ${money(totals.overdue)}</div><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`;
    const w=window.open('','_blank');if(!w){APP.flash?.('اسمح بفتح نافذة التقرير أولاً',true);return;}w.document.open();w.document.write(html);w.document.close();
  }

  const oldLanguage=window.applyLanguage;
  document.addEventListener('DOMContentLoaded',()=>{if(APP.state.profile)restrictAccounts();});
  window.DANA_DEBT_AGING={open:goDebt,reload:loadAll};
  window.addEventListener('load',()=>{if(APP.state.profile?.role==='accounts')goDebt();});
})();
