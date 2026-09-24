(() => {
'use strict';

const cfg = window.DANA_CONFIG || {};
const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes('PASTE_') && !cfg.SUPABASE_ANON_KEY.includes('PASTE_');
const sb = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}) : null;
const USERS = {admin:'admin@dana.local',majdi:'majdi@dana.local',saeed:'saeed@dana.local',yaqoub:'yaqoub@dana.local',omar:'omar@dana.local'};

let lang=localStorage.getItem('dana_lang')||'ar';
const I18N={
 ar:{
  signIn:'دخول',signOut:'تسجيل خروج',dashboard:'لوحة المتابعة',customers:'العملاء',sales:'السحوبات / الفواتير',followups:'متابعة العملاء',map:'الخريطة',reports:'التقارير',audit:'سجل العمليات',account:'حسابي',
  new:'جديد',active:'نشط',hesitant:'متردد',rejected:'رافض',noChange:'بدون تغيير الحالة',
  admin_intervention:'تدخل من قبل الإدارة',review_next_week:'مراجعة العميل الأسبوع القادم',sample_request:'العميل يريد عينة المنتج',
  dulux_emulsion:'اميلشن ديلوكس',dulux_oil:'زياتي ديلوكس',leafs_tinting:'تلوينة ليفز',dulux_polyurethane:'بلوريثان ديلوكس',
  company:'الشركة',newCustomers:'عملاء جدد',productSales:'مبيعات المنتجات',goal:'الهدف',achieved:'المحقق',remaining:'المتبقي',progress:'النسبة',
  edit:'تعديل',del:'حذف',save:'حفظ',cancel:'إلغاء',view:'عرض',close:'إغلاق',add:'إضافة',
  customer:'العميل',representative:'المندوب',area:'المنطقة',phone:'الجوال',status:'الحالة',action:'الإجراء',reason:'التقرير / السبب',product:'المنتج',quantity:'الكمية',value:'القيمة',reference:'المرجع',date:'التاريخ',
  totalCustomers:'إجمالي العملاء',salesThisMonth:'سحوبات الشهر',activeCustomers:'العملاء النشطون',hesitantCustomers:'العملاء المترددون',rejectedCustomers:'العملاء الرافضون',clickView:'اضغط للعرض',
  repSummary:'ملخص المندوبين',managementIntervention:'حالات تحتاج تدخل الإدارة',goals:'الأهداف',currentMonth:'الشهر الحالي',editGoals:'تعديل الأهداف',repPerformance:'أداء المندوبين',
  allStatuses:'كل الحالات',searchCustomer:'ابحث باسم العميل أو المنطقة...',newCustomer:'+ عميل جديد',salesCountMonth:'عدد سحوبات الشهر',salesValueMonth:'قيمة سحوبات الشهر',
  recordSale:'+ تسجيل سحب / فاتورة',searchSale:'ابحث بالعميل أو المنتج أو المرجع...',allDates:'كل التواريخ',thisMonth:'هذا الشهر',
  addFollowup:'+ إضافة متابعة',allActions:'كل الإجراءات',recordedAt:'وقت التسجيل',previousStatus:'الحالة السابقة',newStatus:'الحالة الجديدة',
  reportType:'نوع التقرير',allReps:'كل المندوبين',from:'من تاريخ',to:'إلى تاريخ',generateReport:'عرض التقرير',printPdf:'تصدير PDF / طباعة',
  username:'اسم المستخدم',password:'كلمة المرور',language:'English',accountSecurity:'أمان الحساب',
  noData:'لا توجد بيانات.',confirmDelete:'هل أنت متأكد من الحذف؟',saved:'تم الحفظ',deleted:'تم الحذف',updated:'تم التعديل'
 },
 en:{
  signIn:'Sign in',signOut:'Sign out',dashboard:'Dashboard',customers:'Customers',sales:'Sales / Withdrawals',followups:'Customer Follow-ups',map:'Customer Map',reports:'Reports',audit:'Activity Log',account:'My Account',
  new:'New',active:'Active',hesitant:'Hesitant',rejected:'Rejected',noChange:'No status change',
  admin_intervention:'Management intervention',review_next_week:'Review customer next week',sample_request:'Customer requests product sample',
  dulux_emulsion:'Dulux Emulsion',dulux_oil:'Dulux Oil-Based',leafs_tinting:'Leafs Tinting',dulux_polyurethane:'Dulux Polyurethane',
  company:'Company',newCustomers:'New customers',productSales:'Product sales',goal:'Goal',achieved:'Achieved',remaining:'Remaining',progress:'Progress',
  edit:'Edit',del:'Delete',save:'Save',cancel:'Cancel',view:'View',close:'Close',add:'Add',
  customer:'Customer',representative:'Representative',area:'Area',phone:'Phone',status:'Status',action:'Action',reason:'Report / Reason',product:'Product',quantity:'Quantity',value:'Value',reference:'Reference',date:'Date',
  totalCustomers:'Total Customers',salesThisMonth:'Sales This Month',activeCustomers:'Active Customers',hesitantCustomers:'Hesitant Customers',rejectedCustomers:'Rejected Customers',clickView:'Click to view',
  repSummary:'Representative Summary',managementIntervention:'Management Intervention',goals:'Goals',currentMonth:'Current month',editGoals:'Edit Goals',repPerformance:'Representative Performance',
  allStatuses:'All Statuses',searchCustomer:'Search customer or area...',newCustomer:'+ New Customer',salesCountMonth:'Sales Count This Month',salesValueMonth:'Sales Value This Month',
  recordSale:'+ Record Sale / Withdrawal',searchSale:'Search customer, product or reference...',allDates:'All Dates',thisMonth:'This Month',
  addFollowup:'+ Add Follow-up',allActions:'All Actions',recordedAt:'Recorded At',previousStatus:'Previous Status',newStatus:'New Status',
  reportType:'Report Type',allReps:'All Representatives',from:'From',to:'To',generateReport:'Generate Report',printPdf:'Export PDF / Print',
  username:'Username',password:'Password',language:'العربية',accountSecurity:'Account Security',
  noData:'No data.',confirmDelete:'Are you sure you want to delete this record?',saved:'Saved',deleted:'Deleted',updated:'Updated'
 }
};
const t=k=>I18N[lang][k]??k;
const statusLabel=k=>t(k);
const actionLabel=k=>I18N[lang][k]||k||'-';
const productLabel=k=>I18N[lang][k]||k||'-';
const STATUS_KEYS=['new','active','hesitant','rejected'];
const CHANGE_STATUS_KEYS=['active','hesitant','rejected'];
const FOLLOW_ACTION_KEYS=['admin_intervention','review_next_week','sample_request'];
const PRODUCT_KEYS=['dulux_emulsion','dulux_oil','leafs_tinting','dulux_polyurethane'];
const ACTION = {
 customer_created:'Customer created',customer_updated:'Customer updated',customer_deleted:'Customer deleted',
 status_changed:'Status changed',sale_added:'Sale / withdrawal added',sale_updated:'Sale updated',sale_deleted:'Sale deleted',
 report_added:'Follow-up added',report_updated:'Follow-up updated',report_deleted:'Follow-up deleted',
 location_corrected:'Location corrected',password_changed:'Password changed',performance_goal_updated:'Performance goal updated'
};
const MAX_IDLE_MS = 20*60*1000;
const MAX_SESSION_MS = 8*60*60*1000;
const LOGIN_LOCK_MS = 5*60*1000;
const LOGIN_FAIL_LIMIT = 5;
const PAGE_SIZE = 1000;
const state={session:null,profile:null,customers:[],sales:[],reports:[],profiles:[],goals:[],map:null,markerLayer:null,mapLocations:[],pickerMap:null,pickerMarker:null,securityGateMode:null,mfaFactorId:null,lastActivity:Date.now(),activityCache:new Map(),customerMonthOnly:false};
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmt=n=>new Intl.NumberFormat(lang==='ar'?'ar-SA':'en-US',{maximumFractionDigits:2}).format(Number(n||0));
const money=n=>lang==='ar'?fmt(n)+' ر.س':'SAR '+fmt(n);
const dateTime=iso=>iso?new Intl.DateTimeFormat(lang==='ar'?'ar-SA':'en-GB',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(new Date(iso)):'-';
const dateOnly=d=>d?new Intl.DateTimeFormat(lang==='ar'?'ar-SA':'en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(d+'T00:00:00Z')):'-';
const todayRiyadh=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const monthRiyadh=()=>todayRiyadh().slice(0,7);
const isAdmin=()=>state.profile?.role==='admin';

function applyLanguage(){
 document.documentElement.lang=lang;
 document.documentElement.dir=lang==='ar'?'rtl':'ltr';
 const set=(sel,txt)=>{const e=document.querySelector(sel);if(e)e.textContent=txt;};
 const ph=(id,txt)=>{const e=$(id);if(e)e.placeholder=txt;};
 set('#login h2',lang==='ar'?'نظام إدارة مبيعات ديلوكس':'Dulux Sales Management');
 ph('loginUser',t('username'));ph('loginPass',t('password'));if($('loginBtn'))$('loginBtn').textContent=t('signIn');
 if($('logoutBtn'))$('logoutBtn').textContent=t('signOut');
 if($('closeModalBtn'))$('closeModalBtn').textContent=t('close');
 document.querySelector('[data-page="dashboard"]')?.replaceChildren(document.createTextNode(t('dashboard')));
 document.querySelector('[data-page="customers"]')?.replaceChildren(document.createTextNode(t('customers')));
 document.querySelector('[data-page="sales"]')?.replaceChildren(document.createTextNode(t('sales')));
 document.querySelector('[data-page="reports"]')?.replaceChildren(document.createTextNode(t('followups')));
 document.querySelector('[data-page="mapPage"]')?.replaceChildren(document.createTextNode(t('map')));
 document.querySelector('[data-page="analytics"]')?.replaceChildren(document.createTextNode(t('reports')));
 document.querySelector('[data-page="audit"]')?.replaceChildren(document.createTextNode(t('audit')));
 document.querySelector('[data-page="account"]')?.replaceChildren(document.createTextNode(t('account')));
 if($('langBtn'))$('langBtn').textContent=t('language');
 if($('langBtnLogin'))$('langBtnLogin').textContent=t('language');
 if($('newCustomerBtn'))$('newCustomerBtn').textContent=t('newCustomer');
 if($('newSaleBtn'))$('newSaleBtn').textContent=t('recordSale');
 if($('newReportBtn'))$('newReportBtn').textContent=t('addFollowup');
 ph('customerSearch',t('searchCustomer'));ph('saleSearch',t('searchSale'));
 if($('editGoalsBtn'))$('editGoalsBtn').textContent=t('editGoals');
 set('#dashboard .dashboard-panels h3',t('repSummary'));set('#dashboard .dashboard-attention h3',t('managementIntervention'));set('#goalsTitle',t('goals'));
 const cards=[['customers','totalCustomers'],['sales-month','salesThisMonth'],['active','activeCustomers'],['hesitant','hesitantCustomers'],['rejected','rejectedCustomers']];
 for(const [k,l] of cards){const c=document.querySelector('[data-dashboard-link="'+k+'"]');if(c){const x=c.querySelector('.label'),h=c.querySelector('.card-hint');if(x)x.textContent=t(l);if(h)h.textContent=t('clickView');}}
 const st=$('customerStatusFilter');if(st){st.options[0].text=t('allStatuses');for(let i=1;i<st.options.length;i++)st.options[i].text=t(st.options[i].value);}
 const sp=$('salePeriodFilter');if(sp){sp.options[0].text=t('allDates');sp.options[1].text=t('thisMonth');}
 const rf=$('reportActionFilter');if(rf){rf.options[0].text=t('allActions');for(let i=1;i<rf.options.length;i++)rf.options[i].text=t(rf.options[i].value);}
 const mf=$('mapFilter');if(mf){mf.options[0].text=lang==='ar'?'كل العملاء':'All Customers';for(let i=1;i<mf.options.length;i++){const v=mf.options[i].value;mf.options[i].text=v==='frequent'?(lang==='ar'?'سحب متكرر هذا الشهر':'Repeated sale this month'):t(v);}}
 const ar=$('analyticsRep');if(ar&&ar.options.length)ar.options[0].text=t('allReps');
 const pt=$('pageTitle');if(pt){const active=document.querySelector('.nav-grid button.active');if(active)pt.textContent=active.textContent;}
 renderAll();
}
function toggleLanguage(){lang=lang==='ar'?'en':'ar';localStorage.setItem('dana_lang',lang);applyLanguage();}

function addBaseMap(map){
  const layer=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri'});
  layer.addTo(map);
  return layer;
}


function flash(msg,bad=false){ const f=$('flash'); f.textContent=msg; f.style.background=bad?'#991b1b':'#111827'; f.classList.remove('hidden'); setTimeout(()=>f.classList.add('hidden'),3600); }
function showConfigMessage(){ $('loginMsg').textContent='تعذر تحميل إعدادات النظام.'; $('loginBtn').disabled=true; }
function getLoginGuard(){ try{return JSON.parse(localStorage.getItem('dana_login_guard_v1')||'{}')}catch(_){return {}} }
function setLoginGuard(v){ localStorage.setItem('dana_login_guard_v1',JSON.stringify(v)); }
function loginLockRemaining(){ const g=getLoginGuard(); return Math.max(0,Number(g.lockUntil||0)-Date.now()); }
function recordLoginFailure(){ let g=getLoginGuard(); const now=Date.now(); if(!g.firstAt||now-g.firstAt>15*60*1000) g={count:0,firstAt:now,lockUntil:0}; g.count=Number(g.count||0)+1; if(g.count>=LOGIN_FAIL_LIMIT){g.lockUntil=now+LOGIN_LOCK_MS;g.count=0;g.firstAt=now;} setLoginGuard(g); }
function clearLoginFailures(){ localStorage.removeItem('dana_login_guard_v1'); }
function strongPassword(p){ return p.length>=14 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p); }
function sessionTooOld(session){ const t=session?.user?.last_sign_in_at?new Date(session.user.last_sign_in_at).getTime():0; return !!t && Date.now()-t>MAX_SESSION_MS; }

function prepareAppShell(){
  $('login').classList.add('hidden');
  $('roleText').textContent=state.profile.full_name;
  document.querySelectorAll('.admin-only').forEach(el=>el.classList.toggle('hidden',!isAdmin()));
}
function showSecurityGate(title,html,mode){ state.securityGateMode=mode; $('securityGateTitle').textContent=title; $('securityGateBody').innerHTML=html; $('securityGate').classList.remove('hidden'); }
function hideSecurityGate(){ state.securityGateMode=null; state.mfaFactorId=null; $('securityGate').classList.add('hidden'); $('securityGateBody').innerHTML=''; }
function showPasswordGate(){ showSecurityGate('تغيير كلمة المرور مطلوب',`<div class="security-warn">لحماية الحساب، لن تفتح بيانات النظام قبل تغيير كلمة المرور الحالية.</div><div class="form-grid" style="margin-top:12px"><div class="full"><label>كلمة المرور الحالية</label><input id="gateCurrentPassword" type="password" autocomplete="current-password"></div><div><label>كلمة المرور الجديدة</label><input id="gateNewPassword" type="password" autocomplete="new-password"></div><div><label>تأكيد كلمة المرور</label><input id="gateConfirmPassword" type="password" autocomplete="new-password"></div><div class="full password-policy">14 حرفاً على الأقل مع حرف كبير وصغير ورقم ورمز.</div><div class="full"><button class="btn" id="gateChangePasswordBtn">تغيير كلمة المرور والمتابعة</button></div><div id="gateSecurityMsg" class="full small"></div></div>`,'password'); }
async function showMFAChallengeGate(){
  const factors=await sb.auth.mfa.listFactors();
  const factor=factors.data?.totp?.find(x=>x.status==='verified');
  if(factors.error||!factor) return showMFAEnrollGate();
  state.mfaFactorId=factor.id;
  showSecurityGate('رمز التحقق للإدارة',`<div class="security-warn">أدخل الرمز الحالي من تطبيق المصادقة.</div><div class="form-grid" style="margin-top:12px"><div class="full"><label>رمز التحقق (6 أرقام)</label><input id="mfaChallengeCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div><div class="full"><button class="btn" id="verifyMfaChallengeBtn">تحقق وادخل</button></div><div id="gateSecurityMsg" class="full small"></div></div>`,'mfa-challenge');
}
async function showMFAEnrollGate(){
  showSecurityGate('تفعيل التحقق بخطوتين للإدارة','<div class="small">جاري تجهيز رمز الحماية...</div>','mfa-enroll-loading');
  const listed=await sb.auth.mfa.listFactors();
  if(listed.data?.totp?.some(x=>x.status==='verified')) return showMFAChallengeGate();
  for(const f of (listed.data?.totp||[])){ if(f.status!=='verified') await sb.auth.mfa.unenroll({factorId:f.id}).catch(()=>{}); }
  const {data,error}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'Dana Al-Taj Admin'});
  if(error){ showSecurityGate('تعذر تفعيل التحقق بخطوتين',`<div class="security-error">${esc(error.message)}</div>`,'mfa-error'); return; }
  state.mfaFactorId=data.id;
  showSecurityGate('تفعيل التحقق بخطوتين للإدارة',`<div class="security-warn">امسح QR بتطبيق Google Authenticator أو Microsoft Authenticator ثم أدخل الرمز.</div><img class="mfa-qr" alt="QR للتحقق بخطوتين" src="${esc(data.totp?.qr_code||'')}"><div class="small">المفتاح اليدوي:</div><div class="security-secret">${esc(data.totp?.secret||'')}</div><div class="form-grid" style="margin-top:12px"><div class="full"><label>رمز التحقق</label><input id="mfaEnrollCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div><div class="full"><button class="btn" id="verifyMfaEnrollBtn">تفعيل الحماية</button></div><div id="gateSecurityMsg" class="full small"></div></div>`,'mfa-enroll');
}
async function verifyMFA(code){
  const msg=$('gateSecurityMsg');
  if(!/^\d{6}$/.test(code||'')){ if(msg) msg.textContent='أدخل رمزاً صحيحاً من 6 أرقام.'; return; }
  if(msg) msg.textContent='جاري التحقق...';
  const challenge=await sb.auth.mfa.challenge({factorId:state.mfaFactorId});
  if(challenge.error){ if(msg) msg.textContent='تعذر إنشاء التحقق.'; return; }
  const verified=await sb.auth.mfa.verify({factorId:state.mfaFactorId,challengeId:challenge.data.id,code});
  if(verified.error){ if(msg) msg.textContent='الرمز غير صحيح أو انتهت صلاحيته.'; return; }
  await sb.auth.refreshSession(); await loadProfile();
}
async function enforceSecurityBeforeData(){
  prepareAppShell();
  if(state.profile.must_change_password){ showPasswordGate(); return; }
  if(isAdmin()){
    const aal=await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aal.error){ showSecurityGate('تعذر التحقق من حماية الإدارة','<div class="security-error">تعذر فحص التحقق بخطوتين.</div>','mfa-error'); return; }
    if(aal.data.currentLevel!=='aal2'){ if(aal.data.nextLevel==='aal2') await showMFAChallengeGate(); else await showMFAEnrollGate(); return; }
  }
  hideSecurityGate(); showApp(); await refreshAll(); await renderSecurityStatus();
}

async function login(){
  if(!sb) return showConfigMessage();
  const remaining=loginLockRemaining();
  if(remaining>0){ $('loginMsg').textContent=`محاولات كثيرة. حاول بعد ${Math.ceil(remaining/60000)} دقيقة.`; return; }
  const username=$('loginUser').value.trim().toLowerCase(), password=$('loginPass').value;
  const email=USERS[username];
  if(!email||!password){ recordLoginFailure(); $('loginMsg').textContent='تعذر الدخول. تأكد من البيانات.'; return; }
  $('loginMsg').textContent='جاري الدخول...';
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error){ recordLoginFailure(); $('loginMsg').textContent='تعذر الدخول. تأكد من البيانات.'; return; }
  clearLoginFailures(); state.session=data.session; state.lastActivity=Date.now(); await loadProfile();
}
async function loadProfile(){
  const {data:{session}}=await sb.auth.getSession(); state.session=session;
  if(!session){ showLogin(); return; }
  if(sessionTooOld(session)){ await sb.auth.signOut(); return showLogin('انتهت مدة الجلسة. سجل الدخول من جديد.'); }
  const {data,error}=await sb.from('profiles').select('id,username,full_name,role,active,must_change_password,password_changed_at').eq('id',session.user.id).single();
  if(error || !data?.active){ await sb.auth.signOut(); return showLogin('الحساب غير مفعّل في النظام.'); }
  state.profile=data; await enforceSecurityBeforeData();
}
function showLogin(message=''){ hideSecurityGate(); $('login').classList.remove('hidden'); $('loginPass').value=''; if(message) $('loginMsg').textContent=message; }
function showApp(){ prepareAppShell(); gotoPage('dashboard'); }
async function logout(message=''){
  try{ if(sb) await sb.auth.signOut(); }catch(_){}
  state.session=null;state.profile=null;state.customers=[];state.sales=[];state.reports=[];state.profiles=[];state.goals=[];state.activityCache.clear();state.lastActivity=Date.now();
  ['customersBody','salesBody','reportsBody','auditBody'].forEach(id=>{const el=$(id);if(el)el.innerHTML='';});
  showLogin(message);
}

async function loadPaged(makeQuery,label){
  let out=[],from=0;
  for(;;){
    const {data,error}=await makeQuery(from,from+PAGE_SIZE-1);
    if(error){ console.error(label,error); flash('تعذر تحميل '+label,true); return out; }
    const rows=data||[]; out=out.concat(rows); if(rows.length<PAGE_SIZE) break; from+=PAGE_SIZE;
  }
  return out;
}

async function refreshAll(){
  await Promise.all([loadProfiles(),loadCustomers(),loadSales(),loadReports(),loadGoals()]);
  state.activityCache.clear(); renderAll();
}
async function loadProfiles(){const {data,error}=await sb.from('profiles').select('id,username,full_name,role,active').eq('active',true).order('full_name');state.profiles=error?[]:(data||[]);}
async function loadCustomers(){
  const {data,error}=await sb.from('customers').select('id,name,area,phone,status,created_at,assigned_rep,rep:profiles!customers_assigned_rep_fkey(full_name)').order('created_at',{ascending:false});
  if(error){console.error(error);flash(lang==='ar'?'تعذر تحميل العملاء':'Could not load customers',true);return;}state.customers=data||[];
}
async function loadSales(){state.sales=await loadPaged((x,y)=>sb.from('sales').select('id,customer_id,product,quantity,amount,order_ref,business_date,created_at,rep_id,customer:customers(name),rep:profiles!sales_rep_id_fkey(full_name)').order('created_at',{ascending:false}).range(x,y),lang==='ar'?'السحوبات':'sales');}
async function loadReports(){state.reports=await loadPaged((x,y)=>sb.from('reports').select('id,customer_id,report_type,action_code,note,old_status,new_status,created_at,business_date,rep_id,customer:customers(name),rep:profiles!reports_rep_id_fkey(full_name)').order('created_at',{ascending:false}).range(x,y),lang==='ar'?'المتابعات':'follow-ups');}
async function loadGoals(){const {data,error}=await sb.from('performance_goals').select('id,scope_type,rep_id,goal_type,product_code,monthly_target,updated_at').order('scope_type').order('rep_id').order('goal_type').order('product_code');state.goals=error?[]:(data||[]);}

function activityForCustomer(cid){
 cid=Number(cid);if(state.activityCache.has(cid))return state.activityCache.get(cid);
 const month=monthRiyadh();let monthSalesCount=0,monthSalesValue=0,lastSale=null;
 for(const x of state.sales){if(Number(x.customer_id)!==cid)continue;if(String(x.business_date||'').startsWith(month)){monthSalesCount++;monthSalesValue+=Number(x.amount||0);}if(!lastSale||new Date(x.created_at)>new Date(lastSale.created_at))lastSale=x;}
 const out={monthSalesCount,monthSalesValue,lastSale};state.activityCache.set(cid,out);return out;
}
function customerCategory(c){const x=activityForCustomer(c.id);if(x.monthSalesCount>1)return 'frequent';return c.status||'new';}
function renderAll(){if(!$('mCustomers'))return;renderDashboard();renderCustomers();renderSales();renderReports();renderGoalsDashboard();renderRepPerformance();}

function badgeStatus(k){const cls={new:'b-info',active:'b-good',hesitant:'b-warn',rejected:'b-bad'}[k]||'b-gray';return `<span class="badge ${cls}">${esc(statusLabel(k))}</span>`;}
function goalFor(scope,repId,type,product=null){return state.goals.find(g=>g.scope_type===scope&&(scope==='company'||g.rep_id===repId)&&g.goal_type===type&&(type==='new_customers'||g.product_code===product));}
function goalProgress(goal,achieved,isMoney=true){
 const target=Number(goal?.monthly_target||0),pct=target>0?Math.round(achieved/target*100):0,remaining=Math.max(0,target-achieved);
 return `<div class="goal-progress"><div class="goal-numbers"><span>${t('goal')}: <b>${isMoney?money(target):fmt(target)}</b></span><span>${t('achieved')}: <b>${isMoney?money(achieved):fmt(achieved)}</b></span><span>${t('remaining')}: <b>${isMoney?money(remaining):fmt(remaining)}</b></span></div><div class="progress-track"><div class="progress-fill" style="width:${Math.min(100,pct)}%"></div></div><div class="small">${t('progress')}: ${pct}%</div></div>`;
}

function renderDashboard(){
 const month=monthRiyadh();
 const monthSales=state.sales.filter(x=>String(x.business_date||'').startsWith(month)).reduce((z,x)=>z+Number(x.amount||0),0);
 $('mCustomers').textContent=state.customers.length;$('mSales').textContent=money(monthSales);
 $('mActive').textContent=state.customers.filter(c=>c.status==='active').length;
 $('mHesitant').textContent=state.customers.filter(c=>c.status==='hesitant').length;
 $('mRejected').textContent=state.customers.filter(c=>c.status==='rejected').length;
 const attention=state.reports.filter(r=>r.action_code==='admin_intervention');
 $('attentionList').innerHTML=attention.length?attention.slice(0,8).map(r=>`<div class="event"><b>${esc(r.customer?.name||'-')}</b><div>${esc(r.note)}</div><div class="small">${dateTime(r.created_at)} — ${esc(r.rep?.full_name||'-')}</div></div>`).join(''):`<div class="small">${t('noData')}</div>`;
 const reps=isAdmin()?state.profiles.filter(p=>p.role==='rep'):[state.profile];
 $('repSummary').innerHTML=reps.map(p=>{
   const cs=state.customers.filter(c=>c.assigned_rep===p.id),ss=state.sales.filter(x=>x.rep_id===p.id&&String(x.business_date||'').startsWith(month)),rr=state.reports.filter(x=>x.rep_id===p.id&&String(x.business_date||'').startsWith(month));
   return `<div class="event clickable-event" data-rep-customers="${p.id}"><b>${esc(p.full_name)}</b><div class="small">${lang==='ar'?`${cs.length} عميل — سحوبات ${money(ss.reduce((z,x)=>z+Number(x.amount||0),0))} — ${rr.length} متابعة`:`${cs.length} customers — sales ${money(ss.reduce((z,x)=>z+Number(x.amount||0),0))} — ${rr.length} follow-ups`}</div></div>`;
 }).join('')||`<div class="small">${t('noData')}</div>`;
}
function renderRepPerformance(){
 const box=$('repPerformance');if(!box||!isAdmin())return;
 const month=monthRiyadh(),reps=state.profiles.filter(p=>p.role==='rep');
 box.innerHTML='<div class="table-wrap"><table><thead><tr><th>'+t('representative')+'</th><th>'+t('customers')+'</th><th>'+t('newCustomers')+'</th><th>'+t('activeCustomers')+'</th><th>'+t('salesThisMonth')+'</th><th>'+t('followups')+'</th></tr></thead><tbody>'+
 reps.map(p=>{const cs=state.customers.filter(c=>c.assigned_rep===p.id),ss=state.sales.filter(x=>x.rep_id===p.id&&String(x.business_date||'').startsWith(month)),rr=state.reports.filter(x=>x.rep_id===p.id&&String(x.business_date||'').startsWith(month)),nc=cs.filter(c=>String(c.created_at).slice(0,7)===month).length;return `<tr class="clickable-row" data-rep-customers="${p.id}"><td><b>${esc(p.full_name)}</b></td><td>${cs.length}</td><td>${nc}</td><td>${cs.filter(c=>c.status==='active').length}</td><td>${money(ss.reduce((z,x)=>z+Number(x.amount||0),0))}</td><td>${rr.length}</td></tr>`}).join('')+'</tbody></table></div>';
}
function scopeAchievements(scope,repId=null){
 const month=monthRiyadh();
 const sales=state.sales.filter(x=>String(x.business_date||'').startsWith(month)&&(scope==='company'||x.rep_id===repId));
 const customers=state.customers.filter(c=>(scope==='company'||c.assigned_rep===repId)&&String(c.created_at||'').slice(0,7)===month);
 const byProduct={};for(const k of PRODUCT_KEYS)byProduct[k]=sales.filter(x=>x.product===k).reduce((z,x)=>z+Number(x.amount||0),0);
 return {newCustomers:customers.length,byProduct};
}
function renderGoalScope(scope,repId,label){
 const ac=scopeAchievements(scope,repId);
 const newGoal=goalFor(scope,repId,'new_customers');
 return `<div class="goal-scope"><h4>${esc(label)}</h4><div class="goal-grid">
 <div class="goal-card clickable-goal" data-goal-new-customers="${scope==='company'?'company':repId}"><b>${t('newCustomers')}</b>${goalProgress(newGoal,ac.newCustomers,false)}</div>
 ${PRODUCT_KEYS.map(k=>`<div class="goal-card clickable-goal" data-goal-product="${k}"><b>${esc(productLabel(k))}</b>${goalProgress(goalFor(scope,repId,'product_sales',k),ac.byProduct[k],true)}</div>`).join('')}
 </div></div>`;
}
function renderGoalsDashboard(){
 const box=$('goalsDashboard');if(!box)return;
 let html=renderGoalScope('company',null,t('company'));
 if(isAdmin()){
   for(const p of state.profiles.filter(x=>x.role==='rep'))html+=renderGoalScope('rep',p.id,p.full_name);
 }else html+=renderGoalScope('rep',state.profile.id,state.profile.full_name);
 box.innerHTML=html;
}
function openGoalsEditor(){
 if(!isAdmin())return;
 const scopes=[{type:'company',id:null,label:t('company')},...state.profiles.filter(p=>p.role==='rep').map(p=>({type:'rep',id:p.id,label:p.full_name}))];
 const rows=scopes.map(sc=>{
   const ng=goalFor(sc.type,sc.id,'new_customers');
   return `<div class="goal-edit-scope"><h4>${esc(sc.label)}</h4><div class="form-grid"><div><label>${t('newCustomers')}</label><input type="number" min="0" step="1" data-goal-input data-scope="${sc.type}" data-rep="${sc.id||''}" data-type="new_customers" value="${Number(ng?.monthly_target||0)}"></div>
   ${PRODUCT_KEYS.map(k=>{const g=goalFor(sc.type,sc.id,'product_sales',k);return `<div><label>${esc(productLabel(k))}</label><input type="number" min="0" step="1" data-goal-input data-scope="${sc.type}" data-rep="${sc.id||''}" data-type="product_sales" data-product="${k}" value="${Number(g?.monthly_target||0)}"></div>`}).join('')}</div></div>`;
 }).join('');
 openModal(t('editGoals'),rows+`<div style="margin-top:14px"><button class="btn" id="saveGoalsBtn">${t('save')}</button></div>`);
}
async function saveGoals(){
 const inputs=[...document.querySelectorAll('[data-goal-input]')];
 for(const el of inputs){
   const val=Number(el.value);if(!(val>=0))return flash(lang==='ar'?'تحقق من قيم الأهداف':'Check goal values',true);
   const {error}=await sb.rpc('set_performance_goal',{p_scope_type:el.dataset.scope,p_rep_id:el.dataset.rep||null,p_goal_type:el.dataset.type,p_product_code:el.dataset.product||null,p_monthly_target:val});
   if(error)return flash((lang==='ar'?'تعذر حفظ الهدف: ':'Could not save goal: ')+error.message,true);
 }
 closeModal();flash(lang==='ar'?'تم تحديث الأهداف':'Goals updated');await refreshAll();
}

function renderCustomers(){
 const q=($('customerSearch')?.value||'').trim().toLowerCase(),f=$('customerStatusFilter')?.value||'',month=monthRiyadh();
 let rows=state.customers.filter(c=>(!f||c.status===f)&&(!q||`${c.name} ${c.area||''} ${c.rep?.full_name||''}`.toLowerCase().includes(q)));
 if(state.customerMonthOnly)rows=rows.filter(c=>String(c.created_at||'').slice(0,7)===month);
 $('customersBody').innerHTML=rows.length?rows.map(c=>{const ac=activityForCustomer(c.id);return `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.area||'-')}</td><td>${esc(c.rep?.full_name||'-')}</td><td>${badgeStatus(c.status)}</td><td>${ac.monthSalesCount}</td><td>${money(ac.monthSalesValue)}</td><td><button class="btn secondary" data-open-customer="${c.id}">${t('view')}</button></td></tr>`}).join(''):`<tr><td colspan="7" class="empty">${t('noData')}</td></tr>`;
}
function renderSales(){
 const q=($('saleSearch')?.value||'').trim().toLowerCase(),period=$('salePeriodFilter')?.value||'',month=monthRiyadh();
 const rows=state.sales.filter(x=>(period!=='month'||String(x.business_date||'').startsWith(month))&&(!q||`${x.customer?.name||''} ${productLabel(x.product)} ${x.product||''} ${x.order_ref||''}`.toLowerCase().includes(q)));
 $('salesBody').innerHTML=rows.length?rows.map(x=>`<tr><td>${dateOnly(x.business_date)}</td><td>${esc(x.customer?.name||'-')}</td><td>${esc(productLabel(x.product))}</td><td>${fmt(x.quantity)}</td><td>${money(x.amount)}</td><td>${esc(x.order_ref||'-')}</td><td>${esc(x.rep?.full_name||'-')}</td><td>${isAdmin()?`<button class="btn secondary mini" data-edit-sale="${x.id}">${t('edit')}</button> <button class="btn bad mini" data-delete-sale="${x.id}">${t('del')}</button>`:'-'}</td></tr>`).join(''):`<tr><td colspan="8" class="empty">${t('noData')}</td></tr>`;
}
function renderReports(){
 const f=$('reportActionFilter')?.value||'',rows=state.reports.filter(r=>!f||r.action_code===f);
 $('reportsBody').innerHTML=rows.length?rows.map(r=>`<tr><td>${dateTime(r.created_at)}</td><td>${esc(r.customer?.name||'-')}</td><td>${esc(r.rep?.full_name||'-')}</td><td>${esc(actionLabel(r.action_code)||'-')}</td><td>${r.old_status?badgeStatus(r.old_status):'-'}</td><td>${r.new_status?badgeStatus(r.new_status):'-'}</td><td>${esc(r.note)}</td><td>${isAdmin()?`<button class="btn secondary mini" data-edit-report="${r.id}">${t('edit')}</button> <button class="btn bad mini" data-delete-report="${r.id}">${t('del')}</button>`:'-'}</td></tr>`).join(''):`<tr><td colspan="8" class="empty">${t('noData')}</td></tr>`;
}

function reportRange(){return {from:$('analyticsFrom').value,to:$('analyticsTo').value,rep:$('analyticsRep').value,type:$('analyticsType').value};}
function inRange(d,x,y){const v=String(d||'').slice(0,10);return (!x||v>=x)&&(!y||v<=y);}
function generateAnalytics(){
 const {from,to,rep,type}=reportRange();if(!from||!to)return flash(lang==='ar'?'حدد تاريخ البداية والنهاية':'Select start and end dates',true);if(from>to)return flash(lang==='ar'?'تاريخ البداية يجب أن يكون قبل النهاية':'Start date must be before end date',true);
 const repName=rep?(state.profiles.find(p=>p.id===rep)?.full_name||''):t('allReps'),sales=state.sales.filter(x=>inRange(x.business_date,from,to)&&(!rep||x.rep_id===rep)),rs=state.reports.filter(x=>inRange(x.business_date,from,to)&&(!rep||x.rep_id===rep)),customers=state.customers.filter(c=>!rep||c.assigned_rep===rep),salesTotal=sales.reduce((z,x)=>z+Number(x.amount||0),0);
 let title='',summary='',body='';
 if(type==='sales'){title=lang==='ar'?'تقرير المبيعات والسحوبات':'Sales / Withdrawals Report';summary=`${lang==='ar'?'إجمالي السحوبات':'Total sales'}: <b>${money(salesTotal)}</b> — ${lang==='ar'?'العدد':'Count'}: <b>${sales.length}</b>`;body='<table><thead><tr><th>'+t('date')+'</th><th>'+t('customer')+'</th><th>'+t('product')+'</th><th>'+t('quantity')+'</th><th>'+t('value')+'</th><th>'+t('representative')+'</th></tr></thead><tbody>'+sales.map(x=>`<tr><td>${dateOnly(x.business_date)}</td><td>${esc(x.customer?.name||'-')}</td><td>${esc(productLabel(x.product))}</td><td>${fmt(x.quantity)}</td><td>${money(x.amount)}</td><td>${esc(x.rep?.full_name||'-')}</td></tr>`).join('')+'</tbody></table>';}
 else if(type==='followups'){title=lang==='ar'?'تقرير متابعة العملاء':'Customer Follow-up Report';summary=`${lang==='ar'?'عدد المتابعات':'Follow-ups'}: <b>${rs.length}</b>`;body='<table><thead><tr><th>'+t('date')+'</th><th>'+t('customer')+'</th><th>'+t('representative')+'</th><th>'+t('action')+'</th><th>'+t('previousStatus')+'</th><th>'+t('newStatus')+'</th><th>'+t('reason')+'</th></tr></thead><tbody>'+rs.map(x=>`<tr><td>${dateOnly(x.business_date)}</td><td>${esc(x.customer?.name||'-')}</td><td>${esc(x.rep?.full_name||'-')}</td><td>${esc(actionLabel(x.action_code))}</td><td>${x.old_status?esc(statusLabel(x.old_status)):'-'}</td><td>${x.new_status?esc(statusLabel(x.new_status)):'-'}</td><td>${esc(x.note)}</td></tr>`).join('')+'</tbody></table>';}
 else if(type==='customers'){title=lang==='ar'?'تقرير حركة العملاء':'Customer Activity Report';const created=customers.filter(c=>inRange(c.created_at,from,to));summary=`${t('newCustomers')}: <b>${created.length}</b> — ${t('totalCustomers')}: <b>${customers.length}</b>`;body='<table><thead><tr><th>'+t('customer')+'</th><th>'+t('area')+'</th><th>'+t('status')+'</th><th>'+t('representative')+'</th><th>'+t('sales')+'</th></tr></thead><tbody>'+customers.map(c=>{const ss=sales.filter(x=>Number(x.customer_id)===Number(c.id));return `<tr><td>${esc(c.name)}</td><td>${esc(c.area||'-')}</td><td>${esc(statusLabel(c.status))}</td><td>${esc(c.rep?.full_name||'-')}</td><td>${money(ss.reduce((z,x)=>z+Number(x.amount||0),0))}</td></tr>`}).join('')+'</tbody></table>';}
 else if(type==='reps'){title=lang==='ar'?'تقرير أداء المندوبين':'Representative Performance Report';const reps=state.profiles.filter(p=>p.role==='rep'&&(!rep||p.id===rep));summary=lang==='ar'?'أداء المندوبين خلال الفترة المحددة.':'Representative performance for the selected period.';body='<table><thead><tr><th>'+t('representative')+'</th><th>'+t('customers')+'</th><th>'+t('newCustomers')+'</th><th>'+t('sales')+'</th><th>'+t('followups')+'</th></tr></thead><tbody>'+reps.map(p=>{const cs=state.customers.filter(c=>c.assigned_rep===p.id),ss=sales.filter(x=>x.rep_id===p.id),rr=rs.filter(x=>x.rep_id===p.id),nc=cs.filter(c=>inRange(c.created_at,from,to)).length;return `<tr><td>${esc(p.full_name)}</td><td>${cs.length}</td><td>${nc}</td><td>${money(ss.reduce((z,x)=>z+Number(x.amount||0),0))}</td><td>${rr.length}</td></tr>`}).join('')+'</tbody></table>';}
 else if(type==='products'){title=lang==='ar'?'تقرير أداء المنتجات مقابل الهدف':'Product Goal Performance';summary=`${t('sales')}: <b>${money(salesTotal)}</b>`;body='<table><thead><tr><th>'+t('product')+'</th><th>'+t('goal')+'</th><th>'+t('achieved')+'</th></tr></thead><tbody>'+PRODUCT_KEYS.map(k=>{const goal=goalFor(rep?'rep':'company',rep||null,'product_sales',k),got=sales.filter(x=>x.product===k).reduce((z,x)=>z+Number(x.amount||0),0);return `<tr><td>${esc(productLabel(k))}</td><td>${money(goal?.monthly_target||0)}</td><td>${money(got)}</td></tr>`}).join('')+'</tbody></table>';}
 else{title=lang==='ar'?'التقرير الإداري الشامل':'Management Summary';summary=`${t('sales')}: <b>${money(salesTotal)}</b> — ${t('newCustomers')}: <b>${customers.filter(c=>inRange(c.created_at,from,to)).length}</b> — ${t('followups')}: <b>${rs.length}</b>`;const top=customers.map(c=>{const ss=sales.filter(x=>Number(x.customer_id)===Number(c.id));return {c,v:ss.reduce((z,x)=>z+Number(x.amount||0),0)};}).filter(x=>x.v>0).sort((x,y)=>y.v-x.v).slice(0,20);body='<table><thead><tr><th>'+t('customer')+'</th><th>'+t('value')+'</th><th>'+t('status')+'</th><th>'+t('representative')+'</th></tr></thead><tbody>'+top.map(x=>`<tr><td>${esc(x.c.name)}</td><td>${money(x.v)}</td><td>${esc(statusLabel(x.c.status))}</td><td>${esc(x.c.rep?.full_name||'-')}</td></tr>`).join('')+'</tbody></table>';}
 $('printableReport').innerHTML=`<div class="report-letterhead"><h2>${lang==='ar'?'شركة دانة التاج التجارية':'Dana Al-Taj Trading Company'}</h2><h1>${title}</h1><div>${t('from')}: ${dateOnly(from)} — ${t('to')}: ${dateOnly(to)} — ${t('representative')}: ${esc(repName)}</div></div><div class="report-summary">${summary}</div><div class="report-body">${body||`<div class="empty">${t('noData')}</div>`}</div><div class="report-footer">${lang==='ar'?'تاريخ إعداد التقرير':'Report date'}: ${dateOnly(todayRiyadh())}</div>`;
}
function setupAnalytics(){const r=$('analyticsRep');if(r)r.innerHTML=`<option value="">${t('allReps')}</option>`+state.profiles.filter(p=>p.role==='rep').map(p=>`<option value="${p.id}">${esc(p.full_name)}</option>`).join('');const to=todayRiyadh(),from=to.slice(0,8)+'01';if($('analyticsFrom')&&!$('analyticsFrom').value)$('analyticsFrom').value=from;if($('analyticsTo')&&!$('analyticsTo').value)$('analyticsTo').value=to;}



async function openCustomer(id){
 const c=state.customers.find(x=>Number(x.id)===Number(id));if(!c)return;
 const ac=activityForCustomer(id);
 const hs=await sb.from('customer_status_history').select('id,old_status,new_status,reason,method,created_at,actor:profiles!customer_status_history_changed_by_fkey(full_name)').eq('customer_id',id).order('created_at',{ascending:false});
 const sales=state.sales.filter(x=>Number(x.customer_id)===Number(id)).sort((x,y)=>new Date(y.created_at)-new Date(x.created_at));
 const reps=state.reports.filter(r=>Number(r.customer_id)===Number(id));
 const adminButtons=isAdmin()?`<button class="btn secondary" data-edit-customer="${c.id}">${t('edit')}</button><button class="btn secondary" data-change-status="${c.id}">${lang==='ar'?'تغيير الحالة':'Change Status'}</button><button class="btn secondary" data-edit-location="${c.id}">${lang==='ar'?'تعديل الموقع':'Edit Location'}</button><button class="btn bad" data-delete-customer="${c.id}">${t('del')}</button>`:'';
 openModal(c.name,`
 <div class="detail-grid"><div><b>${t('area')}</b>${esc(c.area||'-')}</div><div><b>${t('representative')}</b>${esc(c.rep?.full_name||'-')}</div><div><b>${t('status')}</b>${badgeStatus(c.status)}</div><div><b>${t('phone')}</b>${esc(c.phone||'-')}</div></div>
 <div class="account-summary"><div><b>${t('salesCountMonth')}</b><strong>${ac.monthSalesCount}</strong></div><div><b>${t('salesValueMonth')}</b><strong>${money(ac.monthSalesValue)}</strong></div><div><b>${lang==='ar'?'آخر سحب':'Last Sale'}</b><strong>${ac.lastSale?dateOnly(ac.lastSale.business_date):'-'}</strong></div></div>
 <div class="toolbar"><button class="btn" data-add-sale="${c.id}">${t('recordSale')}</button><button class="btn secondary" data-add-report="${c.id}">${t('addFollowup')}</button>${adminButtons}</div>
 <h4>${t('sales')}</h4><div class="table-wrap"><table><thead><tr><th>${t('date')}</th><th>${t('product')}</th><th>${t('quantity')}</th><th>${t('value')}</th><th>${t('reference')}</th><th></th></tr></thead><tbody>${sales.length?sales.map(x=>`<tr><td>${dateOnly(x.business_date)}</td><td>${esc(productLabel(x.product))}</td><td>${fmt(x.quantity)}</td><td>${money(x.amount)}</td><td>${esc(x.order_ref||'-')}</td><td>${isAdmin()?`<button class="btn secondary mini" data-edit-sale="${x.id}">${t('edit')}</button> <button class="btn bad mini" data-delete-sale="${x.id}">${t('del')}</button>`:'-'}</td></tr>`).join(''):`<tr><td colspan="6" class="empty">${t('noData')}</td></tr>`}</tbody></table></div>
 <h4>${lang==='ar'?'تاريخ حالة العميل':'Customer Status History'}</h4><div class="timeline">${(hs.data||[]).length?(hs.data||[]).map(h=>`<div class="event"><div class="status-flow">${h.old_status?badgeStatus(h.old_status):'<span class="badge b-gray">'+(lang==='ar'?'بداية':'Initial')+'</span>'}<span class="status-arrow">→</span>${badgeStatus(h.new_status)}</div><div>${esc(h.reason||'')}</div><div class="small">${dateTime(h.created_at)} — ${esc(h.actor?.full_name||'-')}</div></div>`).join(''):`<div class="small">${t('noData')}</div>`}</div>
 <h4>${t('followups')}</h4><div class="timeline">${reps.length?reps.map(r=>`<div class="event"><b>${dateTime(r.created_at)} — ${esc(r.rep?.full_name||'-')} — ${esc(actionLabel(r.action_code))}</b>${r.new_status?`<div class="status-flow">${badgeStatus(r.old_status)}<span class="status-arrow">→</span>${badgeStatus(r.new_status)}</div>`:''}<div>${esc(r.note)}</div>${isAdmin()?`<div style="margin-top:7px"><button class="btn secondary mini" data-edit-report="${r.id}">${t('edit')}</button> <button class="btn bad mini" data-delete-report="${r.id}">${t('del')}</button></div>`:''}</div>`).join(''):`<div class="small">${t('noData')}</div>`}</div>`);
}

function openModal(title,html){$('modalTitle').textContent=title;$('modalContent').innerHTML=html;$('modal').classList.add('open');}
function closeModal(){if(state.pickerMap){try{state.pickerMap.remove()}catch(_){}state.pickerMap=null;state.pickerMarker=null;}$('modal').classList.remove('open');}
function customerOptions(selected=null){return state.customers.map(c=>`<option value="${c.id}" ${Number(selected)===Number(c.id)?'selected':''}>${esc(c.name)}</option>`).join('');}
function repOptions(selected=null){return state.profiles.filter(p=>p.role==='rep').map(p=>`<option value="${p.id}" ${selected===p.id?'selected':''}>${esc(p.full_name)}</option>`).join('');}
function productOptions(selected=null){return PRODUCT_KEYS.map(k=>`<option value="${k}" ${selected===k?'selected':''}>${esc(productLabel(k))}</option>`).join('');}

function openCustomerForm(){
 openModal(lang==='ar'?'إضافة عميل جديد':'Add New Customer',`<div class="form-grid"><div><label>${t('customer')}</label><input id="fName" autocomplete="off"></div><div><label>${t('area')}</label><input id="fArea" autocomplete="off"></div><div><label>${t('phone')}</label><input id="fPhone" inputmode="tel" autocomplete="off"></div><div><label>${lang==='ar'?'الحالة الأولية':'Initial Status'}</label><select id="fStatus">${STATUS_KEYS.map(k=>`<option value="${k}">${t(k)}</option>`).join('')}</select></div>${isAdmin()?`<div><label>${t('representative')}</label><select id="fRep">${repOptions()}</select></div>`:''}<div class="full"><label>${lang==='ar'?'موقع العميل على الخريطة':'Customer Location'}</label><div class="map-picker-help">${lang==='ar'?'اختر الموقع على الخريطة أو استخدم موقعك الحالي.':'Choose the location on the map or use your current location.'}</div><div id="customerPickerMap"></div><div class="location-box" style="margin-top:8px"><div><label class="small">Latitude</label><input id="fLat" readonly></div><div><label class="small">Longitude</label><input id="fLng" readonly></div><button class="btn secondary" id="gpsBtn" type="button">${lang==='ar'?'موقعي الحالي':'My Location'}</button></div><div id="locationStatus" class="small location-status"></div></div><div class="full"><button class="btn" id="saveCustomerBtn">${t('save')}</button></div></div>`);
 setTimeout(initCustomerPickerMap,80);
}
function setCustomerLocation(lat,lng,zoom=true){const x=Number(lat),y=Number(lng);if(!Number.isFinite(x)||!Number.isFinite(y))return;if($('fLat'))$('fLat').value=x.toFixed(6);if($('fLng'))$('fLng').value=y.toFixed(6);const ll=[x,y];if(!state.pickerMarker){state.pickerMarker=L.marker(ll,{draggable:true}).addTo(state.pickerMap);state.pickerMarker.on('dragend',e=>{const p=e.target.getLatLng();setCustomerLocation(p.lat,p.lng,false);});}else state.pickerMarker.setLatLng(ll);if(zoom)state.pickerMap.setView(ll,16);if($('locationStatus')){$('locationStatus').textContent=lang==='ar'?'تم تحديد الموقع.':'Location selected.';$('locationStatus').classList.add('ok');}}
function initCustomerPickerMap(){const el=$('customerPickerMap');if(!el||!window.L)return;if(state.pickerMap){try{state.pickerMap.remove()}catch(_){}}state.pickerMap=L.map(el,{zoomControl:true}).setView([24.7136,46.6753],11);addBaseMap(state.pickerMap);state.pickerMap.on('click',e=>setCustomerLocation(e.latlng.lat,e.latlng.lng,false));setTimeout(()=>state.pickerMap?.invalidateSize(),100);}
function captureLocation(){if(!navigator.geolocation)return flash(lang==='ar'?'المتصفح لا يدعم تحديد الموقع':'Location is not supported',true);const btn=$('gpsBtn');if(btn)btn.disabled=true;navigator.geolocation.getCurrentPosition(pos=>{setCustomerLocation(pos.coords.latitude,pos.coords.longitude,true);if(btn)btn.disabled=false;},()=>{flash(lang==='ar'?'تعذر الحصول على الموقع. اختره يدوياً.':'Could not get location. Choose it manually.',true);if(btn)btn.disabled=false;},{enableHighAccuracy:true,timeout:15000,maximumAge:0});}
async function createCustomer(){const name=$('fName').value.trim(),area=$('fArea').value.trim(),phone=$('fPhone').value.trim(),status=$('fStatus').value,lat=$('fLat').value,lng=$('fLng').value;if(!name)return flash(lang==='ar'?'اسم العميل مطلوب':'Customer name is required',true);if(!lat||!lng)return flash(lang==='ar'?'حدد موقع العميل':'Select customer location',true);const {error}=await sb.rpc('create_customer',{p_name:name,p_area:area||null,p_phone:phone||null,p_initial_status:status,p_lat:Number(lat),p_lng:Number(lng),p_assigned_rep:isAdmin()?$('fRep').value:null});if(error)return flash((lang==='ar'?'تعذر إضافة العميل: ':'Could not add customer: ')+error.message,true);closeModal();flash(lang==='ar'?'تمت إضافة العميل':'Customer added');await refreshAll();}

function openCustomerEditor(id){if(!isAdmin())return;const c=state.customers.find(x=>Number(x.id)===Number(id));if(!c)return;openModal(lang==='ar'?'تعديل العميل':'Edit Customer',`<div class="form-grid"><div><label>${t('customer')}</label><input id="ecName" value="${esc(c.name)}"></div><div><label>${t('area')}</label><input id="ecArea" value="${esc(c.area||'')}"></div><div><label>${t('phone')}</label><input id="ecPhone" value="${esc(c.phone||'')}"></div><div><label>${t('representative')}</label><select id="ecRep">${repOptions(c.assigned_rep)}</select></div><div class="full"><button class="btn" id="saveCustomerEditBtn" data-id="${c.id}">${t('save')}</button></div></div>`);}
async function saveCustomerEdit(id){const {error}=await sb.rpc('admin_update_customer',{p_customer_id:id,p_name:$('ecName').value.trim(),p_area:$('ecArea').value.trim()||null,p_phone:$('ecPhone').value.trim()||null,p_assigned_rep:$('ecRep').value});if(error)return flash(error.message,true);closeModal();flash(t('updated'));await refreshAll();}
async function deleteCustomer(id){if(!isAdmin()||!confirm(t('confirmDelete')))return;const {error}=await sb.rpc('admin_delete_customer',{p_customer_id:id});if(error)return flash(error.message,true);closeModal();flash(t('deleted'));await refreshAll();}

function openStatusForm(id){if(!isAdmin())return;const c=state.customers.find(x=>Number(x.id)===Number(id));if(!c)return;const opts=CHANGE_STATUS_KEYS.filter(k=>k!==c.status).map(k=>`<option value="${k}">${t(k)}</option>`).join('');openModal(lang==='ar'?'تغيير حالة العميل':'Change Customer Status',`<div class="form-grid"><div><label>${lang==='ar'?'الحالة الحالية':'Current Status'}</label><input value="${esc(statusLabel(c.status))}" readonly></div><div><label>${t('newStatus')}</label><select id="stNew">${opts}</select></div><div class="full"><label>${t('reason')}</label><textarea id="stReason" rows="4"></textarea></div><div class="full"><button class="btn" id="saveStatusBtn" data-id="${id}">${t('save')}</button></div></div>`);}
async function changeStatus(id){const reason=$('stReason').value.trim();if(reason.length<5)return flash(lang==='ar'?'اكتب سبباً واضحاً':'Enter a clear reason',true);const {error}=await sb.rpc('change_customer_status',{p_customer_id:id,p_new_status:$('stNew').value,p_reason:reason,p_method:'Admin'});if(error)return flash(error.message,true);closeModal();flash(t('updated'));await refreshAll();}

function openLocationEditor(id){if(!isAdmin())return;openModal(lang==='ar'?'تعديل موقع العميل':'Edit Customer Location',`<div><div id="customerPickerMap"></div><div class="location-box" style="margin-top:8px"><div><label>Latitude</label><input id="fLat" readonly></div><div><label>Longitude</label><input id="fLng" readonly></div></div><div style="margin-top:10px"><label>${t('reason')}</label><textarea id="locReason" rows="3"></textarea></div><button class="btn" style="margin-top:10px" id="saveLocationBtn" data-id="${id}">${t('save')}</button></div>`);setTimeout(async()=>{initCustomerPickerMap();const {data}=await sb.from('customer_locations').select('lat,lng').eq('customer_id',id).maybeSingle();if(data)setCustomerLocation(data.lat,data.lng,true);},80);}
async function saveLocation(id){const reason=$('locReason').value.trim();if(reason.length<4)return flash(lang==='ar'?'اكتب سبب التعديل':'Enter a reason',true);const {error}=await sb.rpc('correct_customer_location',{p_customer_id:id,p_lat:Number($('fLat').value),p_lng:Number($('fLng').value),p_reason:reason});if(error)return flash(error.message,true);closeModal();flash(t('updated'));}

function openSaleForm(customerId=null){openModal(lang==='ar'?'تسجيل سحب / فاتورة':'Record Sale / Withdrawal',`<div class="form-grid"><div><label>${t('customer')}</label><select id="sCustomer">${customerOptions(customerId)}</select></div><div><label>${t('product')}</label><select id="sProduct">${productOptions()}</select></div><div><label>${t('quantity')}</label><input id="sQty" type="number" min="0.01" step="0.01"></div><div><label>${t('value')}</label><input id="sAmount" type="number" min="0.01" step="0.01"></div><div class="full"><label>${t('reference')}</label><input id="sRef"></div><div class="full"><button class="btn" id="saveSaleBtn">${t('save')}</button></div></div>`);}
async function addSale(){const qty=Number($('sQty').value),amount=Number($('sAmount').value);if(!(qty>0)||!(amount>0))return flash(lang==='ar'?'أكمل بيانات السحب':'Complete sale details',true);const {error}=await sb.rpc('add_sale',{p_customer_id:Number($('sCustomer').value),p_product:$('sProduct').value,p_quantity:qty,p_amount:amount,p_order_ref:$('sRef').value.trim()||null});if(error)return flash(error.message,true);closeModal();flash(t('saved'));await refreshAll();}
function openSaleEditor(id){if(!isAdmin())return;const x=state.sales.find(s=>Number(s.id)===Number(id));if(!x)return;openModal(lang==='ar'?'تعديل السحب':'Edit Sale',`<div class="form-grid"><div><label>${t('date')}</label><input id="esDate" type="date" value="${x.business_date}"></div><div><label>${t('product')}</label><select id="esProduct">${productOptions(PRODUCT_KEYS.includes(x.product)?x.product:null)}</select></div><div><label>${t('quantity')}</label><input id="esQty" type="number" min="0.01" step="0.01" value="${Number(x.quantity)}"></div><div><label>${t('value')}</label><input id="esAmount" type="number" min="0.01" step="0.01" value="${Number(x.amount)}"></div><div class="full"><label>${t('reference')}</label><input id="esRef" value="${esc(x.order_ref||'')}"></div><div class="full"><button class="btn" id="saveSaleEditBtn" data-id="${id}">${t('save')}</button></div></div>`);}
async function saveSaleEdit(id){const {error}=await sb.rpc('admin_update_sale',{p_sale_id:id,p_product:$('esProduct').value,p_quantity:Number($('esQty').value),p_amount:Number($('esAmount').value),p_order_ref:$('esRef').value.trim()||null,p_business_date:$('esDate').value});if(error)return flash(error.message,true);closeModal();flash(t('updated'));await refreshAll();}
async function deleteSale(id){if(!isAdmin()||!confirm(t('confirmDelete')))return;const {error}=await sb.rpc('admin_delete_sale',{p_sale_id:id});if(error)return flash(error.message,true);closeModal();flash(t('deleted'));await refreshAll();}

function updateReportStatusFields(){
 const cid=Number($('rCustomer')?.value||0),c=state.customers.find(x=>Number(x.id)===cid),next=$('rNewStatus'),cur=$('rCurrentStatus');if(!c||!next)return;
 if(cur)cur.value=statusLabel(c.status);
 next.innerHTML=`<option value="">${t('noChange')}</option>`+CHANGE_STATUS_KEYS.filter(k=>k!==c.status).map(k=>`<option value="${k}">${t(k)}</option>`).join('');
}
function openReportForm(id=null){
 const selected=state.customers.find(c=>Number(c.id)===Number(id))||state.customers[0];if(!selected)return flash(t('noData'),true);
 openModal(lang==='ar'?'إضافة متابعة عميل':'Add Customer Follow-up',`<div class="danger-note">${lang==='ar'?'التقرير/السبب إلزامي. الحالة الجديدة لا تُحفظ بدون تقرير واضح.':'Report/reason is required. A status change cannot be saved without a clear report.'}</div><div class="form-grid"><div><label>${t('customer')}</label><select id="rCustomer">${customerOptions(selected.id)}</select></div><div><label>${t('action')}</label><select id="rAction">${FOLLOW_ACTION_KEYS.map(k=>`<option value="${k}">${t(k)}</option>`).join('')}</select></div><div><label>${lang==='ar'?'الحالة الحالية':'Current Status'}</label><input id="rCurrentStatus" readonly></div><div><label>${t('newStatus')}</label><select id="rNewStatus"></select></div><div class="full"><label>${t('reason')}</label><textarea id="rNote" rows="4"></textarea></div><div class="full"><button class="btn" id="saveReportBtn">${t('save')}</button></div></div>`);
 setTimeout(()=>{const x=$('rCustomer');if(x)x.addEventListener('change',updateReportStatusFields);updateReportStatusFields();},0);
}
async function addReport(){const note=$('rNote').value.trim(),newStatus=$('rNewStatus').value||null;if(note.length<5)return flash(lang==='ar'?'اكتب تقريراً أو سبباً واضحاً':'Enter a clear report or reason',true);const {error}=await sb.rpc('add_report',{p_customer_id:Number($('rCustomer').value),p_action_code:$('rAction').value,p_note:note,p_new_status:newStatus});if(error)return flash(error.message,true);closeModal();flash(lang==='ar'?(newStatus?'تم حفظ المتابعة وتغيير الحالة':'تم حفظ المتابعة'):(newStatus?'Follow-up saved and status updated':'Follow-up saved'));await refreshAll();}
function openReportEditor(id){if(!isAdmin())return;const r=state.reports.find(x=>Number(x.id)===Number(id));if(!r)return;openModal(lang==='ar'?'تعديل المتابعة':'Edit Follow-up',`<div class="form-grid"><div><label>${t('action')}</label><select id="erAction">${FOLLOW_ACTION_KEYS.map(k=>`<option value="${k}" ${r.action_code===k?'selected':''}>${t(k)}</option>`).join('')}</select></div><div class="full"><label>${t('reason')}</label><textarea id="erNote" rows="5">${esc(r.note)}</textarea></div><div class="full"><button class="btn" id="saveReportEditBtn" data-id="${id}">${t('save')}</button></div></div>`);}
async function saveReportEdit(id){const note=$('erNote').value.trim();if(note.length<5)return flash(lang==='ar'?'اكتب تقريراً واضحاً':'Enter a clear report',true);const {error}=await sb.rpc('admin_update_report',{p_report_id:id,p_action_code:$('erAction').value,p_note:note});if(error)return flash(error.message,true);closeModal();flash(t('updated'));await refreshAll();}
async function deleteReport(id){if(!isAdmin()||!confirm(t('confirmDelete')))return;const {error}=await sb.rpc('admin_delete_report',{p_report_id:id});if(error)return flash(error.message,true);closeModal();flash(t('deleted'));await refreshAll();}


function markerIcon(category){const star=category==='frequent'?'★':'';return L.divIcon({className:'map-pin-wrap',html:`<div class="map-pin pin-${category}"><span>${star}</span></div>`,iconSize:[30,30],iconAnchor:[15,28],popupAnchor:[0,-28]});}
async function renderMap(){
  if(!isAdmin())return;
  if(!state.map){state.map=L.map('map').setView([24.78,46.76],11);addBaseMap(state.map);state.markerLayer=L.layerGroup().addTo(state.map);}
  const {data,error}=await sb.from('customer_locations').select('customer_id,lat,lng'); if(error){console.error(error);return flash('تعذر تحميل الخريطة',true);} state.mapLocations=data||[]; drawMapMarkers(); setTimeout(()=>state.map.invalidateSize(),60);
}
function drawMapMarkers(){
 if(!state.map||!state.markerLayer)return;state.markerLayer.clearLayers();
 const filter=$('mapFilter')?.value||'',q=($('mapSearch')?.value||'').trim().toLowerCase(),bounds=[];
 for(const x of state.mapLocations){
  const c=state.customers.find(z=>Number(z.id)===Number(x.customer_id));if(!c||x.lat==null||x.lng==null)continue;
  const ac=activityForCustomer(c.id),category=customerCategory(c);if(filter&&category!==filter)continue;if(q&&!`${c.name} ${c.area||''} ${c.rep?.full_name||''}`.toLowerCase().includes(q))continue;
  const m=L.marker([x.lat,x.lng],{icon:markerIcon(category)}).addTo(state.markerLayer),div=document.createElement('div');div.dir=lang==='ar'?'rtl':'ltr';div.style.minWidth='230px';
  div.innerHTML=`<b>${esc(c.name)}</b><br>${esc(c.area||'')}<br>${esc(c.rep?.full_name||'')}<br>${t('status')}: ${esc(statusLabel(c.status))}${category==='frequent'?'<br><b class="finance-ok">★ '+(lang==='ar'?'سحب أكثر من مرة هذا الشهر':'Repeated sale this month')+'</b>':''}<div class="popup-finance">${t('salesCountMonth')}: ${ac.monthSalesCount}<br>${t('salesValueMonth')}: ${money(ac.monthSalesValue)}</div>`;
  const btn=document.createElement('button');btn.className='btn secondary';btn.style.marginTop='7px';btn.textContent=t('view');btn.addEventListener('click',()=>openCustomer(c.id));div.appendChild(btn);m.bindPopup(div);bounds.push([x.lat,x.lng]);
 }
 if(bounds.length)state.map.fitBounds(bounds,{padding:[30,30],maxZoom:14});
}

async function renderAudit(){if(!isAdmin())return;const {data,error}=await sb.from('audit_log').select('id,action,entity_type,entity_id,details,created_at,actor:profiles!audit_log_actor_id_fkey(full_name)').order('created_at',{ascending:false}).limit(500);if(error){console.error(error);return;}$('auditBody').innerHTML=(data||[]).map(a=>`<tr><td>${dateTime(a.created_at)}</td><td>${esc(a.actor?.full_name||'-')}</td><td>${esc(ACTION[a.action]||a.action)}</td><td>${esc(a.entity_type)} #${esc(a.entity_id||'')}</td><td>${esc(JSON.stringify(a.details||{}))}</td></tr>`).join('')||`<tr><td colspan="5" class="empty">${t('noData')}</td></tr>`;}

async function changePassword(forced=false){
  const current=$(forced?'gateCurrentPassword':'currentPassword')?.value||'', p=$(forced?'gateNewPassword':'newPassword')?.value||'', confirm=$(forced?'gateConfirmPassword':'confirmPassword')?.value||'', msg=forced?$('gateSecurityMsg'):null; const fail=t=>{if(msg)msg.textContent=t;else flash(t,true);};
  if(!current)return fail('أدخل كلمة المرور الحالية.'); if(p===current)return fail('كلمة المرور الجديدة يجب أن تختلف عن الحالية.'); if(!strongPassword(p))return fail('استخدم 14 حرفاً على الأقل مع حرف كبير وصغير ورقم ورمز.'); if(p!==confirm)return fail('تأكيد كلمة المرور غير مطابق.'); if(msg)msg.textContent='جاري التحقق...';
  const email=state.session?.user?.email; const auth=await sb.auth.signInWithPassword({email,password:current}); if(auth.error)return fail('كلمة المرور الحالية غير صحيحة.'); const {error}=await sb.auth.updateUser({password:p}); if(error)return fail('تعذر تغيير كلمة المرور: '+error.message); if(!forced)flash('تم تغيير كلمة المرور'); await new Promise(r=>setTimeout(r,400)); await loadProfile();
}
async function renderSecurityStatus(){const box=$('securityStatus');if(!box||!state.profile)return;const changed=state.profile.password_changed_at?dateTime(state.profile.password_changed_at):'لم تُسجل بعد';box.innerHTML=`كلمة المرور: <b>${state.profile.must_change_password?'يجب تغييرها':'محدثة'}</b><br>آخر تغيير: ${esc(changed)}<br>الجلسة تُغلق بعد 20 دقيقة من عدم الاستخدام وبحد أقصى 8 ساعات.`;const m=$('mfaAccount');if(!m||!isAdmin())return;const [aal,factors]=await Promise.all([sb.auth.mfa.getAuthenticatorAssuranceLevel(),sb.auth.mfa.listFactors()]);const verified=(factors.data?.totp||[]).some(x=>x.status==='verified');m.innerHTML=`<h4>التحقق بخطوتين للإدارة</h4><div class="${verified?'security-good':'security-warn'}">${verified?'مفعّل. مستوى الجلسة: '+esc(aal.data?.currentLevel||'-'):'غير مفعّل.'}</div>`;}

function gotoPage(id){
 if(state.securityGateMode)return;if(state.profile?.must_change_password)return showPasswordGate();if(!isAdmin()&&(id==='mapPage'||id==='audit'||id==='analytics'))return;
 document.querySelectorAll('.section').forEach(x=>x.classList.remove('active'));$(id).classList.add('active');document.querySelectorAll('.nav-grid button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
 const titles={dashboard:t('dashboard'),customers:t('customers'),sales:t('sales'),reports:t('followups'),analytics:t('reports'),mapPage:t('map'),audit:t('audit'),account:t('account')};$('pageTitle').textContent=titles[id]||'';
 if(id==='mapPage')setTimeout(renderMap,100);if(id==='analytics')setupAnalytics();if(id==='audit')renderAudit();if(id==='account')renderSecurityStatus();
}

$('loginBtn')?.addEventListener('click',login);$('loginPass')?.addEventListener('keydown',e=>{if(e.key==='Enter')login()});$('logoutBtn')?.addEventListener('click',()=>logout());$('closeModalBtn')?.addEventListener('click',closeModal);$('modal')?.addEventListener('click',e=>{if(e.target===$('modal'))closeModal()});
$('langBtn')?.addEventListener('click',toggleLanguage);$('langBtnLogin')?.addEventListener('click',toggleLanguage);
document.querySelectorAll('.nav-grid button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.page==='customers'){state.customerMonthOnly=false;$('customerSearch').value='';$('customerStatusFilter').value='';}if(b.dataset.page==='sales'){$('saleSearch').value='';$('salePeriodFilter').value='';}gotoPage(b.dataset.page);}));
$('customerSearch')?.addEventListener('input',renderCustomers);$('customerStatusFilter')?.addEventListener('change',()=>{state.customerMonthOnly=false;renderCustomers();});$('saleSearch')?.addEventListener('input',renderSales);$('salePeriodFilter')?.addEventListener('change',renderSales);$('reportActionFilter')?.addEventListener('change',renderReports);$('mapSearch')?.addEventListener('input',drawMapMarkers);$('mapFilter')?.addEventListener('change',drawMapMarkers);
$('editGoalsBtn')?.addEventListener('click',openGoalsEditor);$('generateReportBtn')?.addEventListener('click',generateAnalytics);$('printReportBtn')?.addEventListener('click',()=>{generateAnalytics();setTimeout(()=>window.print(),50);});
$('newCustomerBtn')?.addEventListener('click',openCustomerForm);$('newSaleBtn')?.addEventListener('click',()=>openSaleForm());$('newReportBtn')?.addEventListener('click',()=>openReportForm());$('changePasswordBtn')?.addEventListener('click',()=>changePassword(false));
$('customersBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-open-customer]');if(b)openCustomer(Number(b.dataset.openCustomer));});
$('salesBody')?.addEventListener('click',e=>{let b;if((b=e.target.closest('[data-edit-sale]')))openSaleEditor(Number(b.dataset.editSale));else if((b=e.target.closest('[data-delete-sale]')))deleteSale(Number(b.dataset.deleteSale));});
$('reportsBody')?.addEventListener('click',e=>{let b;if((b=e.target.closest('[data-edit-report]')))openReportEditor(Number(b.dataset.editReport));else if((b=e.target.closest('[data-delete-report]')))deleteReport(Number(b.dataset.deleteReport));});
$('dashboard')?.addEventListener('click',e=>{let el;if((el=e.target.closest('[data-dashboard-link]'))){const k=el.dataset.dashboardLink;if(k==='customers'){state.customerMonthOnly=false;$('customerStatusFilter').value='';$('customerSearch').value='';gotoPage('customers');renderCustomers();}else if(k==='sales-month'){$('salePeriodFilter').value='month';$('saleSearch').value='';gotoPage('sales');renderSales();}else if(['active','hesitant','rejected'].includes(k)){state.customerMonthOnly=false;$('customerStatusFilter').value=k;$('customerSearch').value='';gotoPage('customers');renderCustomers();}}else if((el=e.target.closest('[data-rep-customers]'))){const p=state.profiles.find(x=>x.id===el.dataset.repCustomers);state.customerMonthOnly=false;$('customerStatusFilter').value='';$('customerSearch').value=p?.full_name||'';gotoPage('customers');renderCustomers();}else if((el=e.target.closest('[data-goal-product]'))){$('salePeriodFilter').value='month';$('saleSearch').value=productLabel(el.dataset.goalProduct);gotoPage('sales');renderSales();}else if((el=e.target.closest('[data-goal-new-customers]'))){state.customerMonthOnly=true;$('customerStatusFilter').value='';const v=el.dataset.goalNewCustomers;$('customerSearch').value=v==='company'?'':(state.profiles.find(p=>p.id===v)?.full_name||'');gotoPage('customers');renderCustomers();}});
$('modalContent')?.addEventListener('click',e=>{let b;if((b=e.target.closest('#gpsBtn')))captureLocation();else if((b=e.target.closest('#saveCustomerBtn')))createCustomer();else if((b=e.target.closest('[data-edit-customer]')))openCustomerEditor(Number(b.dataset.editCustomer));else if((b=e.target.closest('#saveCustomerEditBtn')))saveCustomerEdit(Number(b.dataset.id));else if((b=e.target.closest('[data-delete-customer]')))deleteCustomer(Number(b.dataset.deleteCustomer));else if((b=e.target.closest('[data-change-status]')))openStatusForm(Number(b.dataset.changeStatus));else if((b=e.target.closest('#saveStatusBtn')))changeStatus(Number(b.dataset.id));else if((b=e.target.closest('[data-edit-location]')))openLocationEditor(Number(b.dataset.editLocation));else if((b=e.target.closest('#saveLocationBtn')))saveLocation(Number(b.dataset.id));else if((b=e.target.closest('[data-add-sale]')))openSaleForm(Number(b.dataset.addSale));else if((b=e.target.closest('#saveSaleBtn')))addSale();else if((b=e.target.closest('[data-edit-sale]')))openSaleEditor(Number(b.dataset.editSale));else if((b=e.target.closest('#saveSaleEditBtn')))saveSaleEdit(Number(b.dataset.id));else if((b=e.target.closest('[data-delete-sale]')))deleteSale(Number(b.dataset.deleteSale));else if((b=e.target.closest('[data-add-report]')))openReportForm(Number(b.dataset.addReport));else if((b=e.target.closest('#saveReportBtn')))addReport();else if((b=e.target.closest('[data-edit-report]')))openReportEditor(Number(b.dataset.editReport));else if((b=e.target.closest('#saveReportEditBtn')))saveReportEdit(Number(b.dataset.id));else if((b=e.target.closest('[data-delete-report]')))deleteReport(Number(b.dataset.deleteReport));else if((b=e.target.closest('#saveGoalsBtn')))saveGoals();});
$('securityGateBody')?.addEventListener('click',e=>{let b;if((b=e.target.closest('#gateChangePasswordBtn')))changePassword(true);else if((b=e.target.closest('#verifyMfaEnrollBtn')))verifyMFA($('mfaEnrollCode')?.value||'');else if((b=e.target.closest('#verifyMfaChallengeBtn')))verifyMFA($('mfaChallengeCode')?.value||'');});
['pointerdown','keydown','touchstart','scroll'].forEach(evt=>window.addEventListener(evt,()=>{state.lastActivity=Date.now();},{passive:true}));setInterval(()=>{if(state.session&&Date.now()-state.lastActivity>MAX_IDLE_MS)logout(lang==='ar'?'تم تسجيل خروجك تلقائياً بعد 20 دقيقة بدون استخدام.':'You were signed out after 20 minutes of inactivity.');},30000);
applyLanguage();

if(!configured) showConfigMessage(); else sb.auth.onAuthStateChange((_event,session)=>{if(!session&&!$('login').classList.contains('hidden'))return;if(!session)showLogin();}); if(configured) loadProfile();
})();