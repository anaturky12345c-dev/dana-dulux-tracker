(() => {
  'use strict';
  if (!window.DANA_CONFIG || !window.supabase) return;
  const APP = window.DANA_APP;
  if (!APP) return;
  const style = document.createElement('style');
  style.textContent = `
    #debtAging .debt-head{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:14px}
    #debtAging .debt-metrics{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:10px;margin-bottom:14px}
    #debtAging .debt-metric{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:13px}
    #debtAging .debt-metric span{font-size:12px;color:#64748b;display:block}
    #debtAging .debt-metric b{font-size:21px;display:block;margin-top:5px}
    #debtAging .debt-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
    #debtAging .debt-toolbar input,#debtAging .debt-toolbar select{flex:1;min-width:150px}
    #debtAging .debt-table{min-width:1450px}
    #debtAging .debt-inline-edit td{background:#f8fafc;padding:12px}
    #debtAging .debt-inline-form{grid-template-columns:repeat(4,minmax(145px,1fr))}
    @media(max-width:720px){#debtAging .debt-inline-form{grid-template-columns:repeat(2,minmax(130px,1fr))}#debtAging .debt-inline-form .full{grid-column:1/-1}}
    #debtAging .debt-actions{display:flex;gap:6px;flex-wrap:wrap}
    #debtAging .debt-request-card{border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin:8px 0;background:#fff}
    #debtAging .debt-request-top{display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap}
    #debtAging .debt-audio{width:min(360px,100%);height:38px}
    #debtAging .debt-rec-status{font-size:12px;color:#64748b;margin-top:6px}
    #debtAging .debt-danger{background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;border-radius:10px;padding:10px;font-size:12px}
    @media(max-width:720px){#debtAging .debt-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}#debtAging .debt-metric b{font-size:18px}#debtAging .debt-toolbar input,#debtAging .debt-toolbar select{min-width:100%}#debtAging .debt-head .btn{width:100%;min-height:46px}}
    #debtAging .debt-table.debt-rep-table{min-width:0;width:100%;table-layout:fixed}
    #debtAging .debt-table.debt-rep-table th,#debtAging .debt-table.debt-rep-table td{font-size:12px;padding:8px 5px;white-space:normal;overflow-wrap:anywhere}
    #debtAging .debt-table.debt-rep-table th:nth-child(1),#debtAging .debt-table.debt-rep-table td:nth-child(1){width:40%}
    #debtAging .debt-table.debt-rep-table th:nth-child(n+2),#debtAging .debt-table.debt-rep-table td:nth-child(n+2){width:20%}
    #debtAging .debt-rep-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}
    #debtTodayCollections .debt-today-items{display:grid;gap:8px;margin-top:10px}
    #debtTodayCollections .debt-today-item{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc}
    #debtTodayCollections .debt-today-item small{display:block;color:#64748b;margin-top:3px}
    #debtAging{--debt-ink:#172033;--debt-muted:#64748b;--debt-line:#e2e8f0;--debt-surface:#fff;--debt-soft:#f7f9fc;color:var(--debt-ink);font-size:15px;line-height:1.6}
    #debtAging h2{font-size:26px;line-height:1.3;font-weight:750;letter-spacing:-.02em}
    #debtAging h3{font-size:18px;line-height:1.4;font-weight:700}
    #debtAging .small{font-size:13px;line-height:1.55;color:var(--debt-muted)}
    #debtAging .debt-head{align-items:center;margin-bottom:16px}
    #debtAging .debt-head>div:first-child{min-width:220px}
    #debtAging .debt-metrics{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
    #debtAging .debt-metric{min-height:94px;padding:15px 16px;background:var(--debt-surface);border:1px solid var(--debt-line);border-radius:14px;box-shadow:0 2px 8px rgba(15,23,42,.035)}
    #debtAging .debt-metric span{font-size:13px;line-height:1.45;color:var(--debt-muted)}
    #debtAging .debt-metric b{font-size:21px;line-height:1.35;margin-top:8px;font-variant-numeric:tabular-nums}
    #debtAging .debt-toolbar{align-items:center;padding:12px;background:var(--debt-surface);border:1px solid var(--debt-line);border-radius:14px}
    #debtAging .debt-toolbar input,#debtAging .debt-toolbar select{height:44px;min-width:180px;border:1px solid #cbd5e1;border-radius:10px;font:inherit;font-size:14px}
    #debtAging .debt-toolbar .btn{min-height:44px;font-size:14px}
    #debtAging .debt-request-card{padding:16px;margin:10px 0;border:1px solid var(--debt-line);border-radius:14px;background:var(--debt-surface);box-shadow:0 2px 8px rgba(15,23,42,.035);font-size:14px;line-height:1.65}
    #debtAging .debt-request-top{align-items:center;margin-bottom:5px}
    #debtAging .debt-request-top b{font-size:15px}
    #debtAging .debt-requests-shell{margin-top:16px;padding:16px;border:1px solid var(--debt-line);border-radius:16px;background:var(--debt-soft)}\n    #debtRequestsWrap{margin-top:16px!important;padding:16px;border:1px solid var(--debt-line);border-radius:16px;background:var(--debt-soft);box-shadow:none}
    #debtAging .debt-metric{min-width:0;overflow:hidden}
    #debtAging .debt-metric b{min-width:0;max-width:100%;display:flex;flex-wrap:wrap;align-items:baseline;gap:0 5px;overflow:hidden}
    #debtAging .debt-metric-number{min-width:0;max-width:100%;font-size:clamp(15px,1.7vw,19px);line-height:1.25;overflow-wrap:anywhere;word-break:break-word;font-variant-numeric:tabular-nums}
    #debtAging .debt-metric b small{font-size:12px;line-height:1.3;white-space:nowrap;color:var(--debt-muted)}
    #debtAging .debt-table td{overflow-wrap:anywhere;word-break:normal;font-variant-numeric:tabular-nums}
    #debtAging .debt-table.debt-rep-table{display:block;border:0;box-shadow:none;background:transparent}
    #debtAging .debt-table.debt-rep-table thead{display:none}
    #debtAging .debt-table.debt-rep-table tbody{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    #debtAging .debt-table.debt-rep-table .debt-rep-row{display:block;min-width:0}
    #debtAging .debt-table.debt-rep-table .debt-rep-row>td{display:block;padding:0;border:0}
    #debtAging .debt-rep-card-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;width:100%;min-width:0}
    #debtAging .debt-rep-card{min-width:0;height:100%;padding:15px;border:1px solid var(--debt-line);border-radius:15px;background:#fff;box-shadow:0 2px 9px rgba(15,23,42,.05)}
    #debtAging .debt-rep-card-head{font-size:15px;line-height:1.55;overflow-wrap:anywhere}
    #debtAging .debt-rep-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:11px 0}
    #debtAging .debt-rep-actions .btn{flex:1 1 130px;min-height:40px;font-size:13px}
    #debtAging .debt-rep-promise{flex:1 1 130px;min-height:40px;display:flex;justify-content:center;align-items:center;gap:5px;padding:7px 10px;border:1px solid var(--debt-line);border-radius:10px;background:var(--debt-soft);font-size:12px;color:var(--debt-muted)}
    #debtAging .debt-rep-promise b{color:var(--debt-ink);font-size:13px}
    #debtAging .debt-rep-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    #debtAging .debt-rep-metric{min-width:0;padding:10px 8px;border:1px solid #edf1f5;border-radius:10px;background:#f8fafc;text-align:center}
    #debtAging .debt-rep-metric span{display:block;min-height:36px;font-size:12px;line-height:1.45;color:var(--debt-muted)}
    #debtAging .debt-rep-metric b{display:block;max-width:100%;font-size:16px;line-height:1.4;overflow-wrap:anywhere;word-break:break-word;font-variant-numeric:tabular-nums}
    #debtAging .debt-rep-metric small{display:block;font-size:11px;line-height:1.3;color:var(--debt-muted)}
    #debtAging .debt-table{width:100%;border-collapse:separate;border-spacing:0;background:#fff;font-size:13px}
    #debtAging .table-wrap{border:1px solid var(--debt-line);border-radius:14px;background:#fff;box-shadow:0 2px 8px rgba(15,23,42,.035)}
    #debtAging .debt-table th{position:sticky;top:0;z-index:1;background:#f1f5f9;color:#334155;font-size:12px;font-weight:700;line-height:1.45;white-space:normal}
    #debtAging .debt-table th,#debtAging .debt-table td{padding:11px 9px;vertical-align:middle;border-bottom:1px solid #edf1f5}
    #debtAging .debt-table td{font-size:13px;line-height:1.55}
    #debtAging .debt-table tbody tr:last-child td{border-bottom:0}
    #debtAging .debt-table tbody tr:hover td{background:#fafcff}
    #debtAging .debt-table .btn{font-size:12px;min-height:34px;padding:6px 10px;line-height:1.35}
    #debtAging .debt-table.debt-rep-table{min-width:0;table-layout:fixed}
    #debtAging .debt-table.debt-rep-table th,#debtAging .debt-table.debt-rep-table td{font-size:14px;padding:12px 9px;line-height:1.5}
    #debtAging .debt-table.debt-rep-table th{font-size:13px}
    #debtAging .debt-table.debt-rep-table th:nth-child(1),#debtAging .debt-table.debt-rep-table td:nth-child(1){width:40%}
    #debtAging .debt-table.debt-rep-table th:nth-child(n+2),#debtAging .debt-table.debt-rep-table td:nth-child(n+2){width:20%}
    #debtAging .debt-table.debt-rep-table td:not(:first-child){font-weight:650;font-variant-numeric:tabular-nums}
    #debtAging .debt-rep-actions{gap:6px;margin-top:8px}
    #debtAging .debt-rep-actions .btn{font-size:12px;min-height:36px}
    #debtAging .debt-inline-edit td{padding:16px;background:#f8fafc}
    #debtAging input,#debtAging select,#debtAging textarea{font:inherit}
    #debtAging .notice{font-size:14px;line-height:1.65;border-radius:12px}
    #debtAging .badge{font-size:12px}
    #debtAging .empty{padding:24px;font-size:14px;color:var(--debt-muted)}
    #debtTodayCollections{border:1px solid var(--debt-line);border-radius:16px;box-shadow:0 3px 12px rgba(15,23,42,.05)}
    #debtTodayCollections h3{font-size:18px}
    #debtTodayCollections .debt-today-item{padding:13px;border-color:var(--debt-line);background:#fff}
    #debtTodayCollections .debt-today-item b{font-size:15px}
    #debtTodayCollections .debt-today-item small{font-size:13px}
    #debtAging .form-grid{gap:14px}
    #debtAging label{display:block;margin-bottom:5px;font-size:13px;font-weight:650;color:#334155}
    #debtAging input,#debtAging select,#debtAging textarea{min-height:42px;border:1px solid #cbd5e1;border-radius:10px;padding:9px 11px;font-size:14px}
    #debtAging .btn{min-height:40px;border-radius:10px;font-size:14px;font-weight:650}
    #debtAging .btn.mini{min-height:34px;font-size:12px}
    #debtAging :focus-visible{outline:3px solid rgba(37,99,235,.3);outline-offset:2px}
    @media(max-width:720px){
      #debtAging{font-size:14px}
      #debtAging h2{font-size:22px}
      #debtAging h3{font-size:17px}
      #debtAging .debt-head{align-items:stretch;gap:10px}
      #debtAging .debt-head>div:first-child{min-width:0}
      #debtAging .debt-head .btn{width:100%;min-height:44px}
      #debtAging .debt-metrics{gap:9px}
      #debtAging .debt-metric{min-height:84px;padding:12px}
      #debtAging .debt-metric span{font-size:12px}
      #debtAging .debt-metric b{font-size:18px}
      #debtAging .debt-toolbar{padding:10px;gap:8px}
      #debtAging .debt-toolbar input,#debtAging .debt-toolbar select{min-width:100%;height:44px;font-size:14px}
      #debtAging .debt-toolbar .btn{width:100%}
      #debtAging .debt-requests-shell{padding:12px}\n      #debtRequestsWrap{padding:12px}
      #debtAging .debt-request-card{padding:13px}
      #debtAging .debt-table{min-width:980px}
      #debtAging .debt-metric-number{font-size:15px}\n      #debtAging .debt-table.debt-rep-table tbody{grid-template-columns:minmax(0,1fr);gap:9px}\n      #debtAging .debt-rep-card-list{grid-template-columns:minmax(0,1fr);gap:10px}
      #debtAging .debt-rep-card{padding:13px}\n      #debtAging .debt-rep-metric{padding:9px 6px}\n      #debtAging .debt-rep-metric span{font-size:11px;min-height:32px}\n      #debtAging .debt-rep-metric b{font-size:15px}\n      #debtAging .debt-table.debt-rep-table{min-width:0}
      #debtAging .debt-table.debt-rep-table th,#debtAging .debt-table.debt-rep-table td{font-size:13px;padding:10px 6px}
      #debtAging .debt-table.debt-rep-table th{font-size:12px}
      #debtAging .debt-table.debt-rep-table th:nth-child(1),#debtAging .debt-table.debt-rep-table td:nth-child(1){width:42%}
      #debtAging .debt-table.debt-rep-table th:nth-child(n+2),#debtAging .debt-table.debt-rep-table td:nth-child(n+2){width:19.33%}
      #debtAging .debt-table.debt-rep-table .btn{padding:6px 8px;font-size:11px}
      #debtAging .debt-rep-actions{gap:5px}
      #debtAging .debt-rep-actions .btn{min-height:36px}
      #debtAging .debt-audio{width:100%}
      #debtAging .debt-inline-form{grid-template-columns:repeat(2,minmax(0,1fr))}
      #debtAging .debt-inline-form .full{grid-column:1/-1}
      #debtTodayCollections .debt-today-item{gap:8px;padding:11px}
    }
    @media print{@page{size:A3 landscape;margin:12mm}body.debt-printing>*{display:none!important}body.debt-printing #debtPrintRoot{display:block!important;position:static!important;width:100%;direction:rtl;font-family:Tahoma,Arial,sans-serif;color:#111}#debtPrintRoot h1{font-size:18pt;margin:0 0 4mm}#debtPrintRoot p{font-size:9pt;margin:0 0 4mm;color:#444}#debtPrintRoot table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8pt}#debtPrintRoot th,#debtPrintRoot td{border:1px solid #888;padding:4px 5px;vertical-align:top;overflow-wrap:anywhere;white-space:normal}#debtPrintRoot th{background:#e8edf3!important;print-color-adjust:exact;-webkit-print-color-adjust:exact}#debtPrintRoot tr{break-inside:avoid;page-break-inside:avoid}#debtPrintRoot .debt-print-total{font-weight:bold;margin-top:4mm;font-size:10pt}}
  `;
  document.head.appendChild(style);

  const main = document.querySelector('.app main');
  const nav = document.querySelector('.nav-grid');
  if (!main || !nav) return;
  let navBtn = nav.querySelector('button[data-page="debtAging"]');
  if (!navBtn) {
    navBtn = document.createElement('button');
    navBtn.type = 'button'; navBtn.dataset.page = 'debtAging'; navBtn.textContent = 'أعمار الديون';
    nav.appendChild(navBtn);
  }
  const page = document.createElement('section');
  page.id = 'debtAging'; page.className = 'section'; page.dir = 'rtl';
  page.innerHTML = `
    <div class="debt-head"><div><h2 style="margin:0 0 4px">أعمار الديون</h2><div class="small">بيانات مستقلة عن المبيعات والمتابعات. تُمسح بيانات الصفحة وطلبات الإدارة بالكامل كل جمعة.</div></div><div id="debtAdminActions" class="debt-actions"></div></div>
    <div id="debtResetNote" class="notice hidden"></div>
    <div class="debt-metrics"><div class="debt-metric"><span>إجمالي الدين</span><b id="debtTotal">0</b></div><div class="debt-metric"><span>إجمالي المتأخرات</span><b id="debtOverdue">0</b></div><div class="debt-metric"><span>المطلوب الأسبوعي</span><b id="debtRequired">0</b></div><div class="debt-metric"><span>المحصّل/المخفّض هذا الأسبوع</span><b id="debtRecovered">0</b></div></div>
    <div class="debt-toolbar"><input id="debtSearch" placeholder="ابحث باسم العميل أو رقم العميل"/><select id="debtRepFilter"><option value="">كل المندوبين</option></select><select id="debtAgingFilter"><option value="all">كل العملاء</option><option value="overdue">لديهم رصيد في شرائح الأعمار</option><option value="over60">أكثر من 60 يوم</option></select><button class="btn secondary" id="debtPdf" type="button">تقارير أعمار الديون · PDF</button></div>
    <div id="debtRequestsWrap" class="card" style="margin-top:14px"><div class="debt-head"><div><h3 style="margin:0">طلبات زيارة الإدارة ومشاكل المندوبين</h3><div class="small">تظهر للإدارة لمتابعتها والرد عليها.</div></div><button id="debtNewRequest" class="btn" type="button">طلب زيارة / متابعة مشكلة</button></div><div id="debtRequests"></div></div>
    <div id="debtRepCards" class="debt-rep-card-list hidden"></div>
    <div class="table-wrap"><table class="debt-table"><thead><tr><th>العميل</th><th>رقم العميل</th><th>المندوب</th><th>إجمالي الدين</th><th>0–15</th><th>16–30</th><th>31–45</th><th>46–60</th><th>أكثر من 60</th><th>المطلوب أسبوعياً</th><th>المحصّل/المخفّض</th><th>المتبقي للأسبوع</th><th>موعد الدفعة</th><th>الإجراء</th></tr></thead><tbody id="debtRows"></tbody></table></div>
    <div id="debtPrintRoot" hidden></div>`;
  main.appendChild(page);

  const $ = id => document.getElementById(id);
  const escText = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = value => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:4}).format(Number(value||0));
  const money = value => `${fmt(value)} ر.س`;
  const isFull = () => ['admin','accounts'].includes(APP.state.profile?.role);
  const isManagement = () => ['admin','manager','accounts'].includes(APP.state.profile?.role);
  const isAccounts = () => APP.state.profile?.role === 'accounts';
  const PRIMARY_ADMIN_ID = 'c5b5df53-f45d-4db2-a4da-65e2bc90a916';
  const isPrimaryAdmin = () => APP.state.profile?.role === 'admin' && APP.state.profile?.username === 'admin';
  const canCreatePaymentPromise = () => ['rep','accounts','admin'].includes(APP.state.profile?.role);
  let rows = [], reps = [], requests = [], entries = [], paymentPromises = [], editingCustomerId = null, recorder = null, recordedBlob = null;
  const expandedDetails = new Set();
  let lastRole = null;
  const audioCache = new Map();
  const AGE_BUCKETS = [
    {key:'opening_0_15', current:'current_0_15', label:'0–15', aliases:['0 - 15','0-15','0–15']},
    {key:'opening_16_30', current:'current_16_30', label:'16–30', aliases:['16 - 30','16-30','16–30']},
    {key:'opening_31_45', current:'current_31_45', label:'31–45', aliases:['31 - 45','31-45','31–45']},
    {key:'opening_46_60', current:'current_46_60', label:'46–60', aliases:['46 - 60','46-60','46–60']},
    {key:'opening_over_60', current:'current_over_60', label:'أكثر من 60', aliases:['more than 60','أكثر من 60','61+']}
  ];

  function goDebt(){
    if (!APP.state.profile || APP.state.securityGateMode || APP.state.profile.must_change_password || !$('login').classList.contains('hidden')) return;
    APP.gotoPage('debtAging');
    if (!page.classList.contains('active')) return;
    navBtn.classList.add('active');
    $('pageTitle').textContent='أعمار الديون';
    loadAll();
  }
  function restrictAccounts(){
    renderRoleUI();
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
  // Do not observe our own visibility/navigation mutations.
  const gateObserverOptions = {subtree:true,attributes:true,attributeFilter:['class']};
  const gateObserver = new MutationObserver(() => {
    gateObserver.disconnect();
    try { restrictAccounts(); }
    finally { gateObserver.observe(document.body,gateObserverOptions); }
  });
  gateObserver.observe(document.body,gateObserverOptions);


  function renderRoleUI(){
    const role=APP.state.profile?.role||null;
    if(role===lastRole)return;
    lastRole=role;
    $('debtAdminActions').innerHTML=isFull()?`${role==='admin'?'<button class="btn secondary" id="debtCreateAccountUsers" type="button">تهيئة حسابات علي وأحمد</button>':''}`:'';
    $('debtRepFilter').classList.toggle('hidden',!isManagement());
    $('debtPdf').classList.toggle('hidden',role==='rep');
  }
  $('debtAdminActions').addEventListener('click',async e=>{
    if(!e.target.closest('#debtCreateAccountUsers'))return;
    if(!confirm('إنشاء حسابي أعمار الديون باسم حسابات علي وحسابات أحمد وإظهار كلمة مرور مؤقتة لكل حساب؟'))return;
    const b=$('debtCreateAccountUsers');b.disabled=true;b.textContent='جاري الإنشاء…';
    const {data,error}=await APP.sb.functions.invoke('create-debt-aging-users');
    b.disabled=false;b.textContent='تهيئة حسابات علي وأحمد';
    if(error||data?.error){APP.flash?.('تعذر تهيئة الحسابات. '+(data?.error||error?.message||''),true);return;}
    const creds=(data.users||[]).map(u=>`<div class="debt-request-card"><b>${escText(u.full_name)}</b><br>اسم الدخول: <code>${escText(u.username)}</code><br>كلمة المرور المؤقتة: <code>${escText(u.password)}</code></div>`).join('');
    APP.openModal?.('بيانات الدخول المؤقتة',`<div class="notice">احفظ بيانات الدخول الآن وشارك كل حساب مع صاحبه. لن تظهر كلمات المرور مرة أخرى.</div>${creds}`);
  });
  $('debtNewRequest').addEventListener('click',openRequestForm);
  $('debtSearch').addEventListener('input',renderRows);
  $('debtRepFilter').addEventListener('change',renderRows);
  $('debtAgingFilter').addEventListener('change',renderRows);
  $('debtAging').addEventListener('click',async e=>{
    const b=e.target.closest('[data-debt-action]'); if(!b)return;
    const row=rows.find(x=>x.id===b.dataset.id); if(!row)return;
    if(b.dataset.debtAction==='detailsToggle'){if(expandedDetails.has(row.id))expandedDetails.delete(row.id);else expandedDetails.add(row.id);renderRows();return;}
    if(b.dataset.debtAction==='entry')openEntryForm(row);
    if(b.dataset.debtAction==='edit')editCustomer(row);
    if(b.dataset.debtAction==='saveEdit')await saveCustomerInline(row);
    if(b.dataset.debtAction==='cancelEdit'){editingCustomerId=null;renderRows();}
    if(b.dataset.debtAction==='promiseCreate')openPaymentPromise(row,false);
    if(b.dataset.debtAction==='promiseEdit')openPaymentPromise(row,true);
    if(b.dataset.debtAction==='history')showHistory(row);
    if(b.dataset.debtAction==='delete')deleteCustomer(row);
  });
  $('debtRequests').addEventListener('click',e=>{
    const b=e.target.closest('[data-request-action]'); if(!b)return;
    const req=requests.find(x=>x.id===b.dataset.id); if(!req)return;
    if(b.dataset.requestAction==='resolve')resolveRequest(req);
    if(b.dataset.requestAction==='audio')playRequestAudio(req);
  });
  $('debtPdf').addEventListener('click',exportPdf);

  async function loadAll(){
    if(!APP.state.profile)return;
    if(!isManagement()) $('debtRepFilter').classList.add('hidden');
    const [balanceRes,repRes,requestRes,promiseRes] = await Promise.all([
      APP.sb.from('debt_aging_balances').select('*').order('customer_name'),
      isManagement()?APP.sb.from('profiles').select('id,full_name,username').eq('role','rep').eq('active',true).order('full_name'):Promise.resolve({data:[],error:null}),
      APP.sb.from('debt_aging_requests').select('id,rep_id,customer_id,request_type,reason,audio_path,status,management_response,created_at,resolved_at,rep:profiles!debt_aging_requests_rep_id_fkey(full_name),customer:debt_aging_customers(customer_name)').order('created_at',{ascending:false}).limit(150),
      APP.sb.from('debt_aging_payment_promises').select('id,customer_id,promise_date,promise_amount,created_by,updated_by,updated_at')
    ]);
    const entryRes=await APP.sb.from('debt_aging_entries').select('id,customer_id,entry_type,amount,business_date,receipt_number,note,rep_id,created_at').order('business_date',{ascending:false}).limit(2500);
    paymentPromises=promiseRes.error?[]:(promiseRes.data||[]);const promiseByCustomer=new Map(paymentPromises.map(p=>[p.customer_id,p]));
    rows=balanceRes.error?[]:(balanceRes.data||[]).map(r=>({...r,payment_promise:promiseByCustomer.get(r.id)||null})); reps=repRes.data||[]; requests=requestRes.error?[]:(requestRes.data||[]); entries=entryRes.data||[];
    if(balanceRes.error) console.error('debt aging load',balanceRes.error);
    $('debtRepFilter').innerHTML='<option value="">كل المندوبين</option>'+reps.map(r=>`<option value="${r.id}">${escText(r.full_name)}</option>`).join('');
    renderRows(); renderRequests();
    loadTodayCollections(true);
  }
  function currentRows(){
    const search=$('debtSearch').value.trim().toLowerCase(),rep=$('debtRepFilter').value,filter=$('debtAgingFilter').value;
    return rows.filter(r=>{
      const name=`${r.customer_name||''} ${r.source_key||''} ${r.area||''} ${r.phone||''}`.toLowerCase();
      return (!search||name.includes(search))&&(!rep||r.assigned_rep===rep)&&(filter==='all'||(filter==='overdue'&&AGE_BUCKETS.some(b=>Number(r[b.current])>0))||(filter==='over60'&&Number(r.current_over_60)>0));
    });
  }
  function inlineEditHtml(row){
    const repOptions=reps.map(rep=>'<option value="'+rep.id+'" '+(rep.id===row.assigned_rep?'selected':'')+'>'+escText(rep.full_name)+'</option>').join('');
    const adminOption=row.assigned_rep===PRIMARY_ADMIN_ID?'<option value="'+PRIMARY_ADMIN_ID+'" selected>تركي توفيق (الإدارة)</option>':'';
    const buckets=AGE_BUCKETS.map(b=>'<div><label>'+b.label+' يوم</label><input data-edit-bucket="'+b.key+'" type="number" min="0" step="0.0001" inputmode="decimal" value="'+Number(row[b.key]||0)+'"></div>').join('');
    return '<tr class="debt-inline-edit" data-edit-customer="'+row.id+'"><td colspan="8"><div class="form-grid debt-inline-form"><div><label>اسم العميل</label><input data-edit-field="customer_name" maxlength="180" value="'+escText(row.customer_name)+'"></div><div><label>رقم العميل</label><input data-edit-field="source_key" maxlength="120" value="'+escText(row.source_key||'')+'"></div><div><label>المندوب المسؤول</label><select data-edit-field="assigned_rep"><option value="">بدون تعيين</option>'+repOptions+adminOption+'</select></div><div><label>إجمالي الدين عند الاستيراد</label><input data-edit-field="opening_total" type="number" min="0" step="0.0001" inputmode="decimal" value="'+Number(row.opening_total||0)+'"></div>'+buckets+'<div><label>المطلوب أسبوعياً</label><input data-edit-field="weekly_required" type="number" min="0" step="0.01" inputmode="decimal" value="'+Number(row.weekly_required||0)+'"></div><div class="full debt-actions"><button class="btn" type="button" data-debt-action="saveEdit" data-id="'+row.id+'">حفظ التعديل</button><button class="btn secondary" type="button" data-debt-action="cancelEdit" data-id="'+row.id+'">إلغاء</button><span class="small" data-edit-message></span></div></div></td></tr>';
  }
  async function saveCustomerInline(row){
    const editor=document.querySelector('[data-edit-customer="'+row.id+'"]');if(!editor)return;
    const value=key=>editor.querySelector('[data-edit-field="'+key+'"]')?.value.trim()||'';
    const total=Number(value('opening_total')),weekly=Number(value('weekly_required')||0);
    const bucketValues=Object.fromEntries(AGE_BUCKETS.map(b=>[b.key,Number(editor.querySelector('[data-edit-bucket="'+b.key+'"]')?.value||0)]));
    const overdue=Object.values(bucketValues).reduce((sum,n)=>sum+n,0),msg=editor.querySelector('[data-edit-message]');
    if(!value('customer_name')||!value('source_key')||!Number.isFinite(total)||total<0||!Number.isFinite(weekly)||weekly<0||Object.values(bucketValues).some(n=>!Number.isFinite(n)||n<0)||overdue>total+0.00005){msg.textContent='تحقق من الاسم ورقم العميل والمبالغ؛ مجموع الشرائح لا يتجاوز إجمالي الدين.';return;}
    const {error}=await APP.sb.from('debt_aging_customers').update({customer_name:value('customer_name'),source_key:value('source_key'),assigned_rep:value('assigned_rep')||null,opening_total:total,opening_overdue:overdue,...bucketValues,weekly_required:weekly,updated_at:new Date().toISOString()}).eq('id',row.id);
    if(error){msg.textContent='تعذر حفظ التعديل.';return;}
    editingCustomerId=null;await loadAll();
  }
  function renderRows(){
    const view=currentRows();
    const simpleRep=APP.state.profile?.role==='rep';
    const table=document.querySelector('#debtAging .debt-table');
    const tableWrap=table?.closest('.table-wrap');
    const repCards=$('debtRepCards');
    const head=table?.querySelector('thead tr');
    if(head)head.innerHTML=simpleRep
      ?'<th>اسم العميل</th><th>المتأخرات</th><th>الدفعة المطلوبة</th><th>المتبقي</th>'
      :'<th>العميل</th><th>المندوب</th><th>إجمالي الدين</th><th>المتأخرات فوق 60 يوم</th><th>الدفعة المطلوبة</th><th>المتبقي</th><th>موعد الدفعة</th><th>التفاصيل والإجراء</th>';
    table?.classList.toggle('debt-rep-table',simpleRep);
    const sums=view.reduce((a,r)=>{a.total+=Number(r.current_total||0);a.overdue+=Number(r.current_overdue||0);a.required+=Number(r.weekly_required||0);a.recovered+=Number(r.recovered_this_week||0);return a;},{total:0,overdue:0,required:0,recovered:0});
    const setDebtMetric=(id,value)=>{$(id).innerHTML='<span class="debt-metric-number">'+escText(fmt(value))+'</span><small>ر.س</small>';};
    setDebtMetric('debtTotal',sums.total);setDebtMetric('debtOverdue',sums.overdue);setDebtMetric('debtRequired',sums.required);setDebtMetric('debtRecovered',sums.recovered);
    if(simpleRep){
      tableWrap?.classList.add('hidden');repCards?.classList.remove('hidden');
      const repMetric=(label,value)=>'<div class="debt-rep-metric"><span>'+label+'</span><b dir="ltr">'+escText(fmt(value))+'</b><small>ر.س</small></div>';
      repCards.innerHTML=view.length?view.map(r=>{const promise=r.payment_promise;const promiseAction=promise?'<span class="debt-rep-promise">موعد الدفعة <b>'+escText(promise.promise_date)+'</b></span>':'<button class="btn secondary" data-debt-action="promiseCreate" data-id="'+r.id+'">تحديد موعد دفعة</button>';return '<article class="debt-rep-card"><div class="debt-rep-card-head"><b>'+escText(r.customer_name)+'</b></div><div class="debt-rep-actions"><button class="btn" data-debt-action="entry" data-id="'+r.id+'">تسجيل دفعة / كاش</button>'+promiseAction+'</div><div class="debt-rep-metrics">'+repMetric('المتأخرات فوق 60 يوم',r.current_overdue)+repMetric('الدفعة المطلوبة',r.weekly_required)+repMetric('المتبقي للأسبوع',r.weekly_remaining)+'</div></article>';}).join(''):'<div class="empty">لا توجد بيانات أعمار ديون حالياً.</div>';
      return;
    }
    tableWrap?.classList.remove('hidden');repCards?.classList.add('hidden');table?.classList.remove('debt-rep-table');
    const bucketDetails=row=>AGE_BUCKETS.map(b=>'<div class="debt-detail-item"><span>'+b.label+' يوم</span><b>'+money(row[b.current])+'</b></div>').join('');
    $('debtRows').innerHTML=view.length?view.map(r=>{
      const rep=reps.find(p=>p.id===r.assigned_rep)?.full_name||(r.assigned_rep===PRIMARY_ADMIN_ID?'تركي توفيق':r.assigned_rep_name)||'—';
      const action=isFull()?'<button class="btn secondary mini" data-debt-action="edit" data-id="'+r.id+'">تعديل</button><button class="btn bad mini" data-debt-action="delete" data-id="'+r.id+'">حذف</button>':'';
      const history='<button class="btn secondary mini" data-debt-action="history" data-id="'+r.id+'">الحركات</button>';
      const collect=APP.state.profile?.role==='rep'?'<button class="btn mini" data-debt-action="entry" data-id="'+r.id+'">تسجيل دفعة / طلبية كاش</button>':'';
      const promise=r.payment_promise;
      const promiseCell=promise?'<div class="debt-promise-summary">'+escText(promise.promise_date)+(promise.promise_amount?'<small>'+money(promise.promise_amount)+'</small>':'')+(isPrimaryAdmin()?'<button class="btn secondary mini" data-debt-action="promiseEdit" data-id="'+r.id+'">تعديل الموعد</button>':'')+'</div>':(canCreatePaymentPromise()?'<button class="btn secondary mini" data-debt-action="promiseCreate" data-id="'+r.id+'">تحديد موعد</button>':'—');
      const detailOpen=expandedDetails.has(r.id);
      const detailButton='<button class="btn secondary mini" data-debt-action="detailsToggle" data-id="'+r.id+'" aria-expanded="'+detailOpen+'">'+(detailOpen?'إخفاء التفاصيل':'تفاصيل أكثر')+'</button>';
      const details=detailOpen?'<tr class="debt-detail-row"><td colspan="8"><div class="debt-detail-panel"><div class="debt-detail-grid"><div class="debt-detail-item"><span>رقم العميل</span><b>'+escText(r.source_key||'—')+'</b></div><div class="debt-detail-item"><span>المندوب المسؤول</span><b>'+escText(rep)+'</b></div><div class="debt-detail-item"><span>إجمالي ما تم تحصيله أو تخفيضه هذا الأسبوع</span><b>'+money(r.recovered_this_week)+'</b></div><div class="debt-detail-item"><span>موعد الدفعة</span><b>'+escText(promise?.promise_date||'—')+(promise?.promise_amount?'<small>المبلغ المتوقع: '+money(promise.promise_amount)+'</small>':'')+'</b></div></div><div class="debt-detail-buckets">'+bucketDetails(r)+'</div></div></td></tr>':'';
      const editRow=editingCustomerId===r.id?inlineEditHtml(r):'';
      return '<tr><td><b>'+escText(r.customer_name)+'</b></td><td>'+escText(rep)+'</td><td><b>'+money(r.current_total)+'</b></td><td>'+money(r.current_overdue)+'</td><td>'+money(r.weekly_required)+'</td><td>'+money(r.weekly_remaining)+'</td><td>'+promiseCell+'</td><td><div class="debt-actions">'+detailButton+collect+history+action+'</div></td></tr>'+details+editRow;
    }).join(''):'<tr><td colspan="8" class="empty">لا توجد بيانات أعمار ديون حالياً.</td></tr>';
  }
  function editCustomer(row){editingCustomerId=editingCustomerId===row.id?null:row.id;renderRows();}
  async function openPaymentPromise(row,editing=false){
    if(editing&&!isPrimaryAdmin())return;
    if(!editing&&!canCreatePaymentPromise())return;
    const existing=paymentPromises.find(p=>p.customer_id===row.id);
    const form='<div class="form-grid"><div><label>موعد الدفعة</label><input id="debtPromiseDate" type="date" min="'+APP.todayRiyadh()+'" value="'+escText(existing?.promise_date||APP.todayRiyadh())+'"></div><div><label>المبلغ المتوقع (اختياري)</label><input id="debtPromiseAmount" type="number" min="0.01" step="0.01" inputmode="decimal" value="'+(existing?.promise_amount?Number(existing.promise_amount):'')+'"></div><div class="full"><button class="btn" id="debtPromiseSave">حفظ الموعد</button>'+(editing?'<button class="btn bad" id="debtPromiseClear" type="button">إلغاء الموعد</button>':'')+'<span id="debtPromiseMsg" class="small"></span></div></div>';
    APP.openModal?.(editing?'تعديل موعد الدفعة':'تحديد موعد دفعة','<div class="small">'+escText(row.customer_name)+'</div>'+form);
    setTimeout(()=>{
      const save=$('debtPromiseSave'),clear=$('debtPromiseClear');
      if(save)save.onclick=async()=>{
        const date=$('debtPromiseDate').value,amountText=$('debtPromiseAmount').value.trim(),amount=amountText?Number(amountText):null,msg=$('debtPromiseMsg');
        if(!date||(amount!==null&&(!Number.isFinite(amount)||amount<=0))){msg.textContent='أدخل موعداً صحيحاً ومبلغاً موجباً.';return;}
        const rpc=editing?'debt_aging_admin_update_payment_promise':'debt_aging_create_payment_promise';
        const {error}=await APP.sb.rpc(rpc,{p_customer_id:row.id,p_promise_date:date,p_promise_amount:amount});if(error){msg.textContent='تعذر حفظ الموعد.';return;}
        document.getElementById('modal')?.classList.remove('open');await loadAll();
      };
      if(clear)clear.onclick=async()=>{const {error}=await APP.sb.rpc('debt_aging_admin_update_payment_promise',{p_customer_id:row.id,p_promise_date:null,p_promise_amount:null});if(error){$('debtPromiseMsg').textContent='تعذر إلغاء الموعد.';return;}document.getElementById('modal')?.classList.remove('open');await loadAll();};
    },0);
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
    const form=`<div class="notice">الطلبية الكاش تقلل أقدم المتأخرات فقط، ولا تدخل في المبيعات. الدفعة تقلل إجمالي الدين والمتأخرات.</div><div class="form-grid"><div><label>دفعة تحصيل (ر.س)</label><input id="debtPaymentAmount" type="number" min="0" step="0.01" inputmode="decimal" value="0"></div><div><label>رقم سند دفعة التحصيل</label><input id="debtPaymentReceipt" type="text" maxlength="100" autocomplete="off"></div><div><label>طلبية كاش مدفوعة فوراً (ر.س) — اختياري</label><input id="debtCashAmount" type="number" min="0" step="0.01" inputmode="decimal" value="0"></div><div><label>رقم سند طلبية الكاش</label><input id="debtCashReceipt" type="text" maxlength="100" autocomplete="off"></div><div class="full"><label>التاريخ</label><input id="debtEntryDate" type="date" value="${APP.todayRiyadh()}"></div><div class="full"><label>ملاحظة اختيارية</label><input id="debtEntryNote" maxlength="250"></div><div class="full"><button class="btn" id="debtSaveEntry">حفظ</button><div id="debtEntryError" class="small"></div></div></div>`;
    APP.openModal?.('تسجيل حركة أعمار ديون',form);
    setTimeout(()=>{const b=document.getElementById('debtSaveEntry');if(b)b.onclick=()=>saveEntry(row);},0);
  }
  async function saveEntry(row){
    const payment=Number(document.getElementById('debtPaymentAmount')?.value||0),cash=Number(document.getElementById('debtCashAmount')?.value||0),paymentReceipt=document.getElementById('debtPaymentReceipt')?.value.trim()||'',cashReceipt=document.getElementById('debtCashReceipt')?.value.trim()||'',date=document.getElementById('debtEntryDate')?.value||APP.todayRiyadh(),note=document.getElementById('debtEntryNote')?.value.trim()||null;
    const errorBox=document.getElementById('debtEntryError');
    if(payment<0||cash<0||(!payment&&!cash)){errorBox.textContent='أدخل مبلغاً للدفعة أو الطلبية الكاش.';return;}
    if(payment>0&&!paymentReceipt){errorBox.textContent='أدخل رقم سند دفعة التحصيل.';return;}
    if(cash>0&&!cashReceipt){errorBox.textContent='أدخل رقم سند طلبية الكاش.';return;}
    const totalAging=AGE_BUCKETS.reduce((sum,b)=>sum+Number(row[b.current]||0),0);
    if(payment>Number(row.current_total)||cash>totalAging){errorBox.textContent='المبلغ أكبر من الرصيد المتاح.';return;}
    const items=[];if(payment>0)items.push({customer_id:row.id,entry_type:'payment',amount:payment,business_date:date,receipt_number:paymentReceipt,rep_id:APP.state.profile.id,created_by:APP.state.profile.id,note});if(cash>0)items.push({customer_id:row.id,entry_type:'cash_order',amount:cash,business_date:date,receipt_number:cashReceipt,rep_id:APP.state.profile.id,created_by:APP.state.profile.id,note});
    const {error}=await APP.sb.from('debt_aging_entries').insert(items);
    if(error){errorBox.textContent='تعذر الحفظ. '+(error.message||'');return;}
    document.getElementById('modal')?.classList.remove('open');await loadAll();APP.flash?.('تم تسجيل الحركة');
  }
  function showHistory(row){
    const history=entries.filter(x=>x.customer_id===row.id);
    const actions=isFull()?'<th>تعديل</th>':'';
    const html=`<div class="notice">الحركات هنا خاصة بأعمار الديون. لا تُسجل كفواتير أو مبيعات.</div><div class="table-wrap"><table><thead><tr><th>التاريخ</th><th>الحركة</th><th>المبلغ</th><th>رقم السند</th><th>ملاحظة</th>${actions}</tr></thead><tbody>${history.length?history.map(x=>`<tr><td>${escText(x.business_date)}</td><td>${x.entry_type==='payment'?'دفعة تحصيل':'طلبية كاش مدفوعة'}</td><td>${money(x.amount)}</td><td>${escText(x.receipt_number||'—')}</td><td>${escText(x.note||'—')}</td>${isFull()?`<td><button class="btn secondary mini" data-edit-debt-entry="${x.id}">تعديل</button> <button class="btn bad mini" data-delete-debt-entry="${x.id}">حذف</button></td>`:''}</tr>`).join(''):`<tr><td colspan="${isFull()?6:5}" class="empty">لا توجد حركات لهذا العميل.</td></tr>`}</tbody></table></div>`;
    APP.openModal?.(`حركات ${escText(row.customer_name)}`,html);
    if(isFull())$('modalContent').addEventListener('click',async e=>{const edit=e.target.closest('[data-edit-debt-entry]'),del=e.target.closest('[data-delete-debt-entry]');if(edit){const item=history.find(x=>x.id===edit.dataset.editDebtEntry);if(item)editEntry(item,row);return;}if(del){const item=history.find(x=>x.id===del.dataset.deleteDebtEntry);if(item&&confirm('حذف حركة أعمار الديون هذه نهائياً؟')){const {error}=await APP.sb.from('debt_aging_entries').delete().eq('id',item.id);if(error){APP.flash?.('تعذر حذف الحركة',true);return;}await loadAll();showHistory(row);}}},{once:true});
  }
  function editEntry(item,row){
    const form=`<div class="form-grid"><div><label>نوع الحركة</label><select id="debtEditEntryType"><option value="payment" ${item.entry_type==='payment'?'selected':''}>دفعة تحصيل</option><option value="cash_order" ${item.entry_type==='cash_order'?'selected':''}>طلبية كاش مدفوعة</option></select></div><div><label>المبلغ</label><input id="debtEditEntryAmount" type="number" min="0.01" step="0.01" value="${Number(item.amount)}"></div><div><label>التاريخ</label><input id="debtEditEntryDate" type="date" value="${item.business_date}"></div><div><label>رقم السند</label><input id="debtEditEntryReceipt" type="text" maxlength="100" value="${escText(item.receipt_number||'')}"></div><div><label>ملاحظة</label><input id="debtEditEntryNote" maxlength="250" value="${escText(item.note||'')}"></div><div class="full"><button class="btn" id="debtEditEntrySave">حفظ</button><span id="debtEditEntryMsg" class="small"></span></div></div>`;
    APP.openModal?.(`تعديل حركة ${escText(row.customer_name)}`,form);
    setTimeout(()=>{const b=$('debtEditEntrySave');if(b)b.onclick=async()=>{const amount=Number($('debtEditEntryAmount').value);if(amount<=0){$('debtEditEntryMsg').textContent='أدخل مبلغاً صحيحاً.';return;}const receipt=$('debtEditEntryReceipt').value.trim();if(!receipt){$('debtEditEntryMsg').textContent='أدخل رقم السند.';return;}const {error}=await APP.sb.from('debt_aging_entries').update({entry_type:$('debtEditEntryType').value,amount,business_date:$('debtEditEntryDate').value,receipt_number:receipt,note:$('debtEditEntryNote').value.trim()||null}).eq('id',item.id);if(error){$('debtEditEntryMsg').textContent='تعذر الحفظ؛ قد يتجاوز المبلغ الرصيد الحالي.';return;}await loadAll();showHistory(row);};},0);
  }
  async function deleteCustomer(row){if(!confirm(`حذف ${row.customer_name} وكل حركات أعمار دينه نهائياً؟`))return;const {error}=await APP.sb.from('debt_aging_customers').delete().eq('id',row.id);if(error){APP.flash?.('تعذر حذف العميل',true);return;}await loadAll();}

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
  function blobToBase64(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.onerror=()=>reject(reader.error||new Error('تعذر قراءة التسجيل'));reader.readAsDataURL(blob);});}
  async function submitRequest(){
    const type=document.getElementById('debtRequestType').value,customer=document.getElementById('debtRequestCustomer').value||null,reason=document.getElementById('debtRequestReason').value.trim(),msg=document.getElementById('debtRequestError');
    if(recorder?.state==='recording')stopRecording();await new Promise(r=>setTimeout(r,100));
    if(!reason&&!recordedBlob){msg.textContent='سجل السبب صوتياً أو اكتب تفاصيله.';return;}
    const id=crypto.randomUUID(),path=recordedBlob?`db:${id}`:null;
    const {error:insertError}=await APP.sb.from('debt_aging_requests').insert({id,rep_id:APP.state.profile.id,customer_id:customer,request_type:type,reason:reason||null,audio_path:path});
    if(insertError){msg.textContent='تعذر تسجيل الطلب.';return;}
    if(recordedBlob){try{const contentType=(recordedBlob.type||'audio/webm').split(';')[0],audio_base64=await blobToBase64(recordedBlob);const {error:uploadError}=await APP.sb.rpc('debt_aging_save_request_audio',{p_request_id:id,p_content_type:contentType,p_audio_base64:audio_base64});if(uploadError)throw uploadError;}catch(e){await APP.sb.from('debt_aging_requests').update({audio_path:null,reason:reason||'تعذر حفظ التسجيل الصوتي.'}).eq('id',id);msg.textContent='تعذر حفظ الصوت، لكن أُرسل الطلب بالتفاصيل المكتوبة.';}}
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
    if(!url){if(req.audio_path.startsWith('db:')){const {data,error}=await APP.sb.rpc('debt_aging_get_request_audio',{p_request_id:req.id});const item=Array.isArray(data)?data[0]:null;if(error||!item?.audio_base64){APP.flash?.('تعذر تشغيل الصوت',true);return;}const raw=atob(item.audio_base64.replace(/\s/g,'')),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);url=URL.createObjectURL(new Blob([bytes],{type:item.content_type}));}else{const {data,error}=await APP.sb.storage.from('debt-aging-requests').createSignedUrl(req.audio_path,300);if(error){APP.flash?.('تعذر تشغيل الصوت',true);return;}url=data.signedUrl;}audioCache.set(req.audio_path,url);}
    const audio=document.createElement('audio');audio.controls=true;audio.src=url;audio.className='debt-audio';const card=document.querySelector(`[data-id="${req.id}"]`)?.closest('.debt-request-card');(card||$('debtRequests')).appendChild(audio);audio.play().catch(()=>{});
  }

  function exportPdf(){
    const data=currentRows(),totals=data.reduce((a,r)=>{a.total+=Number(r.current_total||0);a.overdue+=Number(r.current_overdue||0);a.required+=Number(r.weekly_required||0);a.recovered+=Number(r.recovered_this_week||0);for(const b of AGE_BUCKETS)a[b.key]+=Number(r[b.current]||0);return a;},{total:0,overdue:0,required:0,recovered:0,...Object.fromEntries(AGE_BUCKETS.map(b=>[b.key,0]))});
    const bucketHeaders=AGE_BUCKETS.map(b=>`<th>${b.label}</th>`).join('');
    const bucketCells=r=>AGE_BUCKETS.map(b=>`<td>${money(r[b.current])}</td>`).join('');
    const bucketTotals=AGE_BUCKETS.map(b=>`<td><b>${money(totals[b.key])}</b></td>`).join('');
    const html=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير أعمار الديون</title><style>@page{size:A3 landscape;margin:12mm}body{font-family:Tahoma,Arial,sans-serif;color:#111;margin:0}h1{font-size:18pt;margin:0 0 4mm}p{font-size:9pt;color:#444;margin:0 0 4mm}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8pt}th,td{border:1px solid #888;padding:4px 5px;vertical-align:top;overflow-wrap:anywhere;white-space:normal}th{background:#e8edf3}tr{break-inside:avoid;page-break-inside:avoid}.total{font-weight:bold;margin-top:4mm;font-size:10pt}col.customer{width:14%}col.key{width:6%}col.rep{width:8%}col.bucket{width:5.5%}col.overdue{width:8%}col.week{width:7%}col.recovered{width:8%}col.remaining{width:12%}col.promise{width:9.5%}</style></head><body><h1>تقرير أعمار الديون</h1><p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA',{timeZone:'Asia/Riyadh'})} · عدد العملاء: ${data.length}</p><table><colgroup><col class="customer"><col class="key"><col class="rep"><col class="overdue">${AGE_BUCKETS.map(()=>'<col class="bucket">').join('')}<col class="week"><col class="recovered"><col class="remaining"><col class="promise"></colgroup><thead><tr><th>اسم العميل</th><th>رقم العميل</th><th>المندوب</th><th>إجمالي الدين</th>${bucketHeaders}<th>المطلوب أسبوعياً</th><th>المحصّل/المخفّض</th><th>المتبقي للأسبوع</th><th>موعد الدفعة</th></tr></thead><tbody>${data.map(r=>`<tr><td>${escText(r.customer_name)}</td><td>${escText(r.source_key||'—')}</td><td>${escText(reps.find(x=>x.id===r.assigned_rep)?.full_name||'بدون تعيين')}</td><td>${money(r.current_total)}</td>${bucketCells(r)}<td>${money(r.weekly_required)}</td><td>${money(r.recovered_this_week)}</td><td>${money(r.weekly_remaining)}</td><td>${escText(r.payment_promise?.promise_date||'—')}</td></tr>`).join('')}<tr><th colspan="3">الإجمالي</th><th>${money(totals.total)}</th>${bucketTotals}<th>${money(totals.required)}</th><th>${money(totals.recovered)}</th><th>—</th><th>—</th></tr></tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`;
    const w=window.open('','_blank');if(!w){APP.flash?.('اسمح بفتح نافذة التقرير أولاً',true);return;}w.document.open();w.document.write(html);w.document.close();
  }

  let todayCollectionBusy=false,todayCollectionLoadedAt=0;
  function ensureTodayCollectionsCard(){
    const dashboard=document.getElementById('dashboard');if(!dashboard)return null;
    const isRep=APP.state.profile?.role==='rep';let card=document.getElementById('debtTodayCollections');
    if(!isRep){card?.remove();return null;}
    if(!card){card=document.createElement('div');card.id='debtTodayCollections';card.className='card';card.style.margin='12px 0';dashboard.insertBefore(card,dashboard.querySelector('.dashboard-priority-grid')||dashboard.querySelector('.dashboard-cards')||null);}
    return card;
  }
  async function loadTodayCollections(force=false){
    const profile=APP.state.profile,card=ensureTodayCollectionsCard();if(!card||!profile||profile.role!=='rep'||todayCollectionBusy)return;
    if(!force&&Date.now()-todayCollectionLoadedAt<30000)return;
    todayCollectionBusy=true;card.innerHTML='<div class="dashboard-head"><h3 style="margin:0">تحصيلات اليوم</h3></div><div class="small">مواعيد الدفعات المسجلة لهذا اليوم…</div>';
    try{
      const today=APP.todayRiyadh();
      const {data:promises,error:promiseError}=await APP.sb.from('debt_aging_payment_promises').select('customer_id,promise_amount').eq('promise_date',today);
      if(promiseError)throw promiseError;
      const ids=(promises||[]).map(p=>p.customer_id);
      if(!ids.length){card.innerHTML='<div class="dashboard-head"><h3 style="margin:0">تحصيلات اليوم</h3></div><div class="small">ما عندك مواعيد دفعات مسجلة اليوم.</div>';todayCollectionLoadedAt=Date.now();return;}
      const {data:balances,error:balanceError}=await APP.sb.from('debt_aging_balances').select('id,customer_name,current_overdue,weekly_remaining').eq('assigned_rep',profile.id).in('id',ids).order('customer_name');
      if(balanceError)throw balanceError;
      const byId=new Map((promises||[]).map(p=>[p.customer_id,p]));
      const items=balances||[];
      card.innerHTML='<div class="dashboard-head"><div><h3 style="margin:0">تحصيلات اليوم</h3><div class="small">مواعيد الدفعات المسجلة لهذا اليوم</div></div><span class="badge b-warn">'+items.length+'</span></div><div class="debt-today-items">'+(items.length?items.map(r=>{const p=byId.get(r.id);const amount=p?.promise_amount?money(p.promise_amount):'غير محدد';return '<div class="debt-today-item"><div><b>'+escText(r.customer_name)+'</b><small>المتأخرات: '+money(r.current_overdue)+'</small></div><div class="small"><b>'+amount+'</b><small>'+(p?.promise_amount?'المبلغ المتوقع':'المتبقي من المطلوب الأسبوعي: '+money(r.weekly_remaining))+'</small></div></div>';}).join(''):'<div class="empty">ما عندك مواعيد دفعات مستحقة اليوم.</div>')+'</div>';
      todayCollectionLoadedAt=Date.now();
    }catch(error){console.error('today debt collections',error);card.innerHTML='<div class="dashboard-head"><h3 style="margin:0">تحصيلات اليوم</h3></div><div class="small">تعذر تحميل مواعيد التحصيل اليوم.</div>';}
    finally{todayCollectionBusy=false;}
  }
  window.addEventListener('dana:render',()=>loadTodayCollections());
  window.addEventListener('load',()=>loadTodayCollections(true));

  document.addEventListener('DOMContentLoaded',()=>{if(APP.state.profile)restrictAccounts();});
  window.DANA_DEBT_AGING={open:goDebt,reload:loadAll};
  window.addEventListener('load',()=>{if(APP.state.profile?.role==='accounts')goDebt();});
})();
