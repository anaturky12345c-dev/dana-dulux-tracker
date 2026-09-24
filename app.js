(() => {
'use strict';

const cfg = window.DANA_CONFIG || {};
const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes('PASTE_') && !cfg.SUPABASE_ANON_KEY.includes('PASTE_');
const sb = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}) : null;
const USERS = {admin:'admin@dana.local',majdi:'majdi@dana.local',saeed:'saeed@dana.local',yaqoub:'yaqoub@dana.local',omar:'omar@dana.local'};
const STATUS = {new:'جديد',active:'نشط',hesitant:'متردد',rejected:'رافض',stopped:'متوقف'};
const REPORT = {sold:'تم البيع',followup:'متابعة لاحقة',rejected:'رفض',management:'يحتاج تدخل الإدارة'};
const PAY_METHOD = {cash:'نقدي',transfer:'تحويل',cheque:'شيك',other:'أخرى'};
const ACTION = {customer_created:'إضافة عميل',status_changed:'تغيير حالة',sale_added:'إضافة سحب / فاتورة',payment_added:'تسجيل دفعة',report_added:'إضافة تقرير',location_corrected:'تصحيح موقع',password_changed:'تغيير كلمة المرور'};
const MAX_IDLE_MS = 20*60*1000;
const MAX_SESSION_MS = 8*60*60*1000;
const LOGIN_LOCK_MS = 5*60*1000;
const LOGIN_FAIL_LIMIT = 5;
const PAGE_SIZE = 1000;
const state = {session:null,profile:null,customers:[],sales:[],payments:[],allocations:[],reports:[],profiles:[],map:null,markerLayer:null,mapLocations:[],pickerMap:null,pickerMarker:null,securityGateMode:null,mfaFactorId:null,lastActivity:Date.now(),financeCache:new Map()};
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmt = n => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(Number(n||0));
const money = n => fmt(n)+' ر.س';
const dateTime = iso => iso ? new Intl.DateTimeFormat('ar-SA',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(new Date(iso)) : '-';
const dateOnly = d => d ? new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(d+'T00:00:00Z')) : '-';
const todayRiyadh = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const monthRiyadh = () => todayRiyadh().slice(0,7);
const dateMs = d => Date.parse(d+'T00:00:00Z');
const diffDays = (from,to) => Math.floor((dateMs(to)-dateMs(from))/86400000);
const addDays = (d,n) => new Date(dateMs(d)+n*86400000).toISOString().slice(0,10);
const isAdmin = () => state.profile?.role === 'admin';

function flash(msg,bad=false){ const f=$('flash'); f.textContent=msg; f.style.background=bad?'#991b1b':'#111827'; f.classList.remove('hidden'); setTimeout(()=>f.classList.add('hidden'),3600); }
function badgeStatus(s){ const cls={new:'b-info',active:'b-good',hesitant:'b-warn',rejected:'b-bad',stopped:'b-gray'}[s]||'b-gray'; return `<span class="badge ${cls}">${esc(STATUS[s]||s)}</span>`; }
function badgeReport(s){ const cls={sold:'b-good',followup:'b-warn',rejected:'b-bad',management:'b-bad'}[s]||'b-gray'; return `<span class="badge ${cls}">${esc(REPORT[s]||s)}</span>`; }
function invoiceStatusBadge(info){
  if(info.outstanding<=0) return '<span class="badge b-good">مسددة</span>';
  if(info.overdue) return `<span class="badge b-purple">متأخرة ${info.overdueDays} يوم</span>`;
  if(info.dueSoon) return `<span class="badge b-warn">تستحق خلال ${info.daysToDue} يوم</span>`;
  return '<span class="badge b-info">داخل الأجل</span>';
}
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
  state.session=null;state.profile=null;state.customers=[];state.sales=[];state.payments=[];state.allocations=[];state.reports=[];state.profiles=[];state.financeCache.clear();state.lastActivity=Date.now();
  ['customersBody','salesBody','paymentsBody','debtsBody','reportsBody','auditBody'].forEach(id=>{const el=$(id);if(el)el.innerHTML='';});
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
  await Promise.all([loadProfiles(),loadCustomers(),loadSales(),loadPayments(),loadAllocations(),loadReports()]);
  state.financeCache.clear(); renderAll();
}
async function loadProfiles(){ const {data,error}=await sb.from('profiles').select('id,username,full_name,role,active').eq('active',true).order('full_name'); state.profiles=error?[]:(data||[]); }
async function loadCustomers(){
  const {data,error}=await sb.from('customers').select('id,name,area,phone,status,current_debt,oldest_invoice_date,created_at,assigned_rep,rep:profiles!customers_assigned_rep_fkey(full_name)').order('created_at',{ascending:false});
  if(error){console.error(error);flash('تعذر تحميل العملاء',true);return;} state.customers=data||[];
}
async function loadSales(){ state.sales=await loadPaged((a,b)=>sb.from('sales').select('id,customer_id,product,quantity,amount,order_ref,business_date,due_date,created_at,rep_id,customer:customers(name),rep:profiles!sales_rep_id_fkey(full_name)').order('created_at',{ascending:false}).range(a,b),'السحوبات'); }
async function loadPayments(){ state.payments=await loadPaged((a,b)=>sb.from('payments').select('id,customer_id,amount,payment_method,reference,note,business_date,created_at,rep_id,customer:customers(name),rep:profiles!payments_rep_id_fkey(full_name)').order('created_at',{ascending:false}).range(a,b),'الدفعات'); }
async function loadAllocations(){ state.allocations=await loadPaged((a,b)=>sb.from('payment_allocations').select('id,payment_id,sale_id,amount,created_at').order('id',{ascending:true}).range(a,b),'توزيع الدفعات'); }
async function loadReports(){ state.reports=await loadPaged((a,b)=>sb.from('reports').select('id,customer_id,report_type,note,next_action,created_at,business_date,rep_id,customer:customers(name),rep:profiles!reports_rep_id_fkey(full_name)').order('created_at',{ascending:false}).range(a,b),'التقارير'); }

function allocationTotals(){ const m=new Map(); for(const a of state.allocations) m.set(Number(a.sale_id),(m.get(Number(a.sale_id))||0)+Number(a.amount||0)); return m; }
function invoiceInfo(s,allocs=null){
  const map=allocs||allocationTotals(); const paid=Math.min(Number(s.amount||0),Number(map.get(Number(s.id))||0)); const outstanding=Math.max(0,Number(s.amount||0)-paid); const today=todayRiyadh(); const due=s.due_date||addDays(s.business_date,30); const daysToDue=diffDays(today,due); const overdue=outstanding>0 && daysToDue<0; const overdueDays=overdue?Math.abs(daysToDue):0; const dueSoon=outstanding>0 && daysToDue>=0 && daysToDue<=7;
  return {paid,outstanding,due,daysToDue,overdue,overdueDays,dueSoon};
}
function financeForCustomer(cid){
  cid=Number(cid); if(state.financeCache.has(cid)) return state.financeCache.get(cid);
  const allocs=allocationTotals(); const invoices=state.sales.filter(s=>Number(s.customer_id)===cid); let balance=0,overdue=0,dueSoon=0,overdueDays=0,oldest=null; const month=monthRiyadh(); let monthSalesCount=0,monthSalesValue=0; let lastSale=null;
  for(const s of invoices){ const f=invoiceInfo(s,allocs); balance+=f.outstanding; if(f.overdue){overdue+=f.outstanding;overdueDays=Math.max(overdueDays,f.overdueDays);} if(f.dueSoon) dueSoon+=f.outstanding; if(f.outstanding>0 && (!oldest||s.business_date<oldest)) oldest=s.business_date; if(String(s.business_date||'').startsWith(month)){monthSalesCount++;monthSalesValue+=Number(s.amount||0);} if(!lastSale||new Date(s.created_at)>new Date(lastSale.created_at)) lastSale=s; }
  const payments=state.payments.filter(p=>Number(p.customer_id)===cid); const monthPayments=payments.filter(p=>String(p.business_date||'').startsWith(month)).reduce((a,p)=>a+Number(p.amount||0),0);
  const out={balance,overdue,dueSoon,overdueDays,oldest,monthSalesCount,monthSalesValue,monthPayments,lastSale}; state.financeCache.set(cid,out); return out;
}
function customerCategory(c){ const f=financeForCustomer(c.id); if(f.overdue>0)return 'overdue'; if(f.monthSalesCount>1)return 'frequent'; return c.status||'new'; }
function renderAll(){ renderDashboard();renderCustomers();renderSales();renderPayments();renderDebts();renderReports(); }

function renderDashboard(){
  const month=monthRiyadh(); const fins=state.customers.map(c=>({c,f:financeForCustomer(c.id)}));
  const monthSales=state.sales.filter(s=>String(s.business_date||'').startsWith(month)).reduce((a,b)=>a+Number(b.amount||0),0);
  const monthPayments=state.payments.filter(p=>String(p.business_date||'').startsWith(month)).reduce((a,b)=>a+Number(b.amount||0),0);
  const totalDebt=fins.reduce((a,x)=>a+x.f.balance,0), overdue=fins.reduce((a,x)=>a+x.f.overdue,0), dueSoon=fins.reduce((a,x)=>a+x.f.dueSoon,0); const overdueRows=fins.filter(x=>x.f.overdue>0).sort((a,b)=>b.f.overdueDays-a.f.overdueDays||b.f.overdue-a.f.overdue);
  $('mCustomers').textContent=state.customers.length; $('mSales').textContent=money(monthSales); $('mPayments').textContent=money(monthPayments); $('mDebt').textContent=money(totalDebt); $('mOverdue').textContent=money(overdue); $('mOverdueCustomers').textContent=overdueRows.length; $('mDueSoon').textContent=money(dueSoon);
  $('overdueList').innerHTML=overdueRows.length?overdueRows.slice(0,10).map(x=>`<div class="event overdue-event"><b>${esc(x.c.name)}</b><div class="finance-danger">متأخرات ${money(x.f.overdue)} — ${x.f.overdueDays} يوم تأخير</div><div class="small">الرصيد الكلي ${money(x.f.balance)} — ${esc(x.c.rep?.full_name||'-')}</div></div>`).join(''):'<div class="small">لا توجد متأخرات حالياً.</div>';
  const attention=state.reports.filter(r=>r.report_type==='management'); $('attentionList').innerHTML=attention.length?attention.slice(0,8).map(r=>`<div class="event"><b>${esc(r.customer?.name||'-')}</b><div>${esc(r.note)}</div><div class="small">${dateTime(r.created_at)} — ${esc(r.rep?.full_name||'-')} — ${esc(r.next_action||'')}</div></div>`).join(''):'<div class="small">لا توجد حالات حالياً.</div>';
  if(isAdmin()){
    const reps=state.profiles.filter(p=>p.role==='rep');
    $('repSummary').innerHTML=reps.map(p=>{ const cs=state.customers.filter(c=>c.assigned_rep===p.id); const fs=cs.map(c=>financeForCustomer(c.id)); const debt=fs.reduce((a,x)=>a+x.balance,0), od=fs.reduce((a,x)=>a+x.overdue,0); const sm=state.sales.filter(s=>s.rep_id===p.id&&String(s.business_date||'').startsWith(month)).reduce((a,b)=>a+Number(b.amount||0),0); return `<div class="event"><b>${esc(p.full_name)}</b><div class="small">${cs.length} عميل — سحوبات الشهر ${money(sm)}</div><div class="small">الرصيد ${money(debt)}${od>0?` — <span class="finance-danger">متأخرات ${money(od)}</span>`:''}</div></div>`; }).join('')||'<div class="small">لا يوجد مندوبون مفعّلون.</div>';
  } else {
    const fsum=fins.reduce((o,x)=>({debt:o.debt+x.f.balance,overdue:o.overdue+x.f.overdue,due:o.due+x.f.dueSoon}),{debt:0,overdue:0,due:0}); $('repSummary').innerHTML=`<div class="event"><b>حسابات عملائك</b><div class="small">الرصيد ${money(fsum.debt)}</div><div class="small">المتأخرات ${money(fsum.overdue)} — يستحق خلال 7 أيام ${money(fsum.due)}</div></div>`;
  }
}
function renderCustomers(){
  const q=$('customerSearch').value.trim().toLowerCase(), f=$('customerStatusFilter').value; const rows=state.customers.filter(c=>(!f||c.status===f)&&(!q||`${c.name} ${c.area||''} ${c.rep?.full_name||''}`.toLowerCase().includes(q)));
  $('customersBody').innerHTML=rows.length?rows.map(c=>{const x=financeForCustomer(c.id);return `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.area||'-')}</td><td>${esc(c.rep?.full_name||'-')}</td><td>${badgeStatus(c.status)}</td><td>${x.monthSalesCount}</td><td>${money(x.balance)}</td><td>${x.overdue>0?`<span class="finance-danger">${money(x.overdue)}</span>`:'-'}</td><td><button class="btn secondary" data-open-customer="${c.id}">عرض</button></td></tr>`}).join(''):'<tr><td colspan="8" class="empty">لا توجد نتائج.</td></tr>';
}
function renderSales(){
  const q=$('saleSearch').value.trim().toLowerCase(), allocs=allocationTotals(); const rows=state.sales.filter(s=>!q||`${s.customer?.name||''} ${s.product||''}`.toLowerCase().includes(q));
  $('salesBody').innerHTML=rows.length?rows.map(s=>{const f=invoiceInfo(s,allocs);return `<tr><td>${dateOnly(s.business_date)}</td><td>${esc(s.customer?.name||'-')}</td><td>${esc(s.product)}</td><td>${money(s.amount)}</td><td>${money(f.paid)}</td><td>${money(f.outstanding)}</td><td>${dateOnly(f.due)}</td><td>${invoiceStatusBadge(f)}</td><td>${esc(s.rep?.full_name||'-')}</td></tr>`}).join(''):'<tr><td colspan="9" class="empty">لا توجد سحوبات.</td></tr>';
}
function renderPayments(){
  const q=$('paymentSearch').value.trim().toLowerCase(); const rows=state.payments.filter(p=>!q||`${p.customer?.name||''} ${p.reference||''} ${PAY_METHOD[p.payment_method]||''}`.toLowerCase().includes(q));
  $('paymentsBody').innerHTML=rows.length?rows.map(p=>`<tr><td>${dateTime(p.created_at)}</td><td>${esc(p.customer?.name||'-')}</td><td>${money(p.amount)}</td><td>${esc(PAY_METHOD[p.payment_method]||p.payment_method)}</td><td>${esc(p.reference||'-')}</td><td>${esc(p.rep?.full_name||'-')}</td></tr>`).join(''):'<tr><td colspan="6" class="empty">لا توجد دفعات.</td></tr>';
}
function renderDebts(){
  const filter=$('receivableFilter').value; let rows=state.customers.map(c=>({c,f:financeForCustomer(c.id)})).filter(x=>x.f.balance>0); if(filter==='overdue')rows=rows.filter(x=>x.f.overdue>0); else if(filter==='dueSoon')rows=rows.filter(x=>x.f.dueSoon>0); else if(filter==='current')rows=rows.filter(x=>x.f.overdue===0); rows.sort((a,b)=>b.f.overdueDays-a.f.overdueDays||b.f.balance-a.f.balance);
  $('debtsBody').innerHTML=rows.length?rows.map(x=>`<tr><td><b>${esc(x.c.name)}</b></td><td>${money(x.f.balance)}</td><td>${x.f.overdue>0?`<span class="finance-danger">${money(x.f.overdue)}</span>`:'-'}</td><td>${x.f.dueSoon>0?money(x.f.dueSoon):'-'}</td><td>${dateOnly(x.f.oldest)}</td><td>${x.f.overdueDays?`<span class="finance-danger">${x.f.overdueDays} يوم</span>`:'-'}</td><td>${esc(x.c.rep?.full_name||'-')}</td><td><button class="btn secondary" data-open-customer="${x.c.id}">عرض</button></td></tr>`).join(''):'<tr><td colspan="8" class="empty">لا توجد نتائج.</td></tr>';
}
function renderReports(){ const f=$('reportTypeFilter').value; const rows=state.reports.filter(r=>!f||r.report_type===f); $('reportsBody').innerHTML=rows.length?rows.map(r=>`<tr><td>${dateTime(r.created_at)}</td><td>${esc(r.customer?.name||'-')}</td><td>${esc(r.rep?.full_name||'-')}</td><td>${badgeReport(r.report_type)}</td><td>${esc(r.note)}</td><td>${esc(r.next_action||'-')}</td></tr>`).join(''):'<tr><td colspan="6" class="empty">لا توجد تقارير.</td></tr>'; }

async function openCustomer(id){
  const c=state.customers.find(x=>Number(x.id)===Number(id)); if(!c)return; const f=financeForCustomer(id); const allocs=allocationTotals();
  const hs=await sb.from('customer_status_history').select('id,old_status,new_status,reason,method,created_at,actor:profiles!customer_status_history_changed_by_fkey(full_name)').eq('customer_id',id).order('created_at',{ascending:false});
  const invoices=state.sales.filter(s=>Number(s.customer_id)===Number(id)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)); const pays=state.payments.filter(p=>Number(p.customer_id)===Number(id)); const reps=state.reports.filter(r=>Number(r.customer_id)===Number(id));
  openModal(c.name,`<div class="detail-grid"><div><b>المنطقة</b>${esc(c.area||'-')}</div><div><b>المندوب</b>${esc(c.rep?.full_name||'-')}</div><div><b>الحالة</b>${badgeStatus(c.status)}</div><div><b>الجوال</b>${esc(c.phone||'-')}</div></div>
  <div class="account-summary"><div><b>الرصيد الآجل</b><strong>${money(f.balance)}</strong></div><div class="overdue"><b>المتأخرات</b><strong>${money(f.overdue)}</strong></div><div><b>يستحق خلال 7 أيام</b><strong>${money(f.dueSoon)}</strong></div><div><b>سحوبات الشهر</b><strong>${f.monthSalesCount}</strong></div><div><b>أيام التأخير</b><strong>${f.overdueDays||0}</strong></div></div>
  <div class="toolbar"><button class="btn" data-add-sale="${c.id}">+ سحب</button><button class="btn good" data-add-payment="${c.id}">+ دفعة</button><button class="btn secondary" data-change-status="${c.id}">تغيير الحالة</button><button class="btn secondary" data-add-report="${c.id}">+ تقرير</button></div>
  <h4>الفواتير / السحوبات</h4><div class="table-wrap"><table><thead><tr><th>التاريخ</th><th>المنتج</th><th>القيمة</th><th>المدفوع</th><th>المتبقي</th><th>الاستحقاق</th><th>الحالة</th></tr></thead><tbody>${invoices.length?invoices.map(s=>{const x=invoiceInfo(s,allocs);return `<tr><td>${dateOnly(s.business_date)}</td><td>${esc(s.product)}</td><td>${money(s.amount)}</td><td>${money(x.paid)}</td><td>${money(x.outstanding)}</td><td>${dateOnly(x.due)}</td><td>${invoiceStatusBadge(x)}</td></tr>`}).join(''):'<tr><td colspan="7" class="empty">لا توجد فواتير.</td></tr>'}</tbody></table></div>
  <h4>الدفعات</h4><div class="table-wrap"><table><thead><tr><th>الوقت</th><th>المبلغ</th><th>الطريقة</th><th>المرجع</th></tr></thead><tbody>${pays.length?pays.map(p=>`<tr><td>${dateTime(p.created_at)}</td><td>${money(p.amount)}</td><td>${esc(PAY_METHOD[p.payment_method]||p.payment_method)}</td><td>${esc(p.reference||'-')}</td></tr>`).join(''):'<tr><td colspan="4" class="empty">لا توجد دفعات.</td></tr>'}</tbody></table></div>
  <h4>تاريخ حالة العميل</h4><div class="timeline">${(hs.data||[]).length?(hs.data||[]).map(h=>`<div class="event"><div class="status-flow">${h.old_status?badgeStatus(h.old_status):'<span class="badge b-gray">بداية</span>'}<span class="status-arrow">←</span>${badgeStatus(h.new_status)}</div><div>${esc(h.reason||'')}</div><div class="small">${dateTime(h.created_at)} — ${esc(h.actor?.full_name||'-')}${h.method?' — '+esc(h.method):''}</div></div>`).join(''):'<div class="small">لا يوجد سجل.</div>'}</div>
  <h4>تقارير المندوب</h4><div class="timeline">${reps.length?reps.map(r=>`<div class="event"><b>${dateTime(r.created_at)} — ${esc(r.rep?.full_name||'-')} — ${esc(REPORT[r.report_type]||r.report_type)}</b><div>${esc(r.note)}</div><div class="small">الإجراء القادم: ${esc(r.next_action||'-')}</div></div>`).join(''):'<div class="small">لا توجد تقارير.</div>'}</div>`);
}
function openModal(title,html){ $('modalTitle').textContent=title; $('modalContent').innerHTML=html; $('modal').classList.add('open'); }
function closeModal(){ if(state.pickerMap){try{state.pickerMap.remove()}catch(_){} state.pickerMap=null;state.pickerMarker=null;} $('modal').classList.remove('open'); }
function customerOptions(selected=null){ return state.customers.map(c=>`<option value="${c.id}" ${Number(selected)===Number(c.id)?'selected':''}>${esc(c.name)}</option>`).join(''); }
function repOptions(){ return state.profiles.filter(p=>p.role==='rep').map(p=>`<option value="${p.id}">${esc(p.full_name)}</option>`).join(''); }

function openCustomerForm(){
  openModal('إضافة عميل جديد',`<div class="danger-note">بعد الحفظ لا يمكن تعديل اسم العميل أو حذفه. حدد موقع المحل بدقة.</div><div class="form-grid" style="margin-top:10px"><div><label>اسم العميل</label><input id="fName" autocomplete="off"></div><div><label>المنطقة</label><input id="fArea" autocomplete="off"></div><div><label>الجوال</label><input id="fPhone" inputmode="tel" autocomplete="off"></div><div><label>الحالة الأولية</label><select id="fStatus"><option value="new">جديد</option><option value="hesitant">متردد</option><option value="active">نشط</option><option value="rejected">رافض</option></select></div>${isAdmin()?`<div><label>المندوب المسؤول</label><select id="fRep">${repOptions()}</select></div>`:''}<div class="full"><label>موقع المحل على الخريطة</label><div class="map-picker-help">اضغط على موقع المحل، أو استخدم «موقعي الحالي». ويمكن سحب العلامة.</div><div id="customerPickerMap"></div><div class="location-box" style="margin-top:8px"><div><label class="small">خط العرض</label><input id="fLat" readonly></div><div><label class="small">خط الطول</label><input id="fLng" readonly></div><button class="btn secondary" id="gpsBtn" type="button">موقعي الحالي</button></div><div id="locationStatus" class="small location-status">لم يتم تحديد الموقع.</div></div><div class="full"><button class="btn" id="saveCustomerBtn">حفظ العميل نهائياً</button></div></div>`); setTimeout(initCustomerPickerMap,80);
}
function setCustomerLocation(lat,lng,zoom=true){ const a=Number(lat),b=Number(lng);if(!Number.isFinite(a)||!Number.isFinite(b))return;$('fLat').value=a.toFixed(6);$('fLng').value=b.toFixed(6);const ll=[a,b];if(!state.pickerMarker){state.pickerMarker=L.marker(ll,{draggable:true}).addTo(state.pickerMap);state.pickerMarker.on('dragend',e=>{const p=e.target.getLatLng();setCustomerLocation(p.lat,p.lng,false);});}else state.pickerMarker.setLatLng(ll);if(zoom)state.pickerMap.setView(ll,16);$('locationStatus').textContent='تم تحديد موقع العميل.';$('locationStatus').classList.add('ok'); }
function initCustomerPickerMap(){ const el=$('customerPickerMap');if(!el||!window.L)return;if(state.pickerMap){try{state.pickerMap.remove()}catch(_){}}state.pickerMap=L.map(el,{zoomControl:true}).setView([24.7136,46.6753],11);L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri'}).addTo(state.pickerMap);state.pickerMap.on('click',e=>setCustomerLocation(e.latlng.lat,e.latlng.lng,false));setTimeout(()=>state.pickerMap?.invalidateSize(),100); }
function captureLocation(){ if(!navigator.geolocation){flash('المتصفح لا يدعم تحديد الموقع',true);return;}const btn=$('gpsBtn');if(btn){btn.disabled=true;btn.textContent='جاري تحديد الموقع...';}navigator.geolocation.getCurrentPosition(pos=>{setCustomerLocation(pos.coords.latitude,pos.coords.longitude,true);flash('تم تحديد موقعك');if(btn){btn.disabled=false;btn.textContent='موقعي الحالي';}},()=>{flash('تعذر الحصول على الموقع. اختر المكان يدوياً على الخريطة.',true);if(btn){btn.disabled=false;btn.textContent='موقعي الحالي';}},{enableHighAccuracy:true,timeout:15000,maximumAge:0}); }
async function createCustomer(){ const name=$('fName').value.trim(),area=$('fArea').value.trim(),phone=$('fPhone').value.trim(),status=$('fStatus').value,lat=$('fLat').value,lng=$('fLng').value;if(!name)return flash('اسم العميل مطلوب',true);if(!lat||!lng)return flash('حدد موقع العميل قبل الحفظ',true);const args={p_name:name,p_area:area||null,p_phone:phone||null,p_initial_status:status,p_lat:Number(lat),p_lng:Number(lng),p_assigned_rep:isAdmin()?$('fRep').value:null};const {error}=await sb.rpc('create_customer',args);if(error){console.error(error);return flash(error.message.includes('duplicate')?'العميل أو رقم الجوال مسجل مسبقاً.':'تعذر إضافة العميل: '+error.message,true);}closeModal();flash('تم إضافة العميل وتثبيت موقعه');await refreshAll(); }

function openStatusForm(id){const c=state.customers.find(x=>Number(x.id)===Number(id));if(!c)return;openModal('تغيير حالة العميل',`<div class="danger-note">الحالة السابقة تبقى محفوظة في السجل.</div><div class="form-grid" style="margin-top:10px"><div><label>الحالة الحالية</label><input value="${esc(STATUS[c.status])}" readonly></div><div><label>الحالة الجديدة</label><select id="stNew">${Object.entries(STATUS).filter(([k])=>k!==c.status).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div><div><label>طريقة المتابعة</label><select id="stMethod"><option>زيارة</option><option>اتصال</option><option>عرض سعر</option><option>تجربة منتج</option><option>تفاوض</option><option>أخرى</option></select></div><div class="full"><label>سبب التغيير</label><textarea id="stReason" rows="3"></textarea></div><div class="full"><button class="btn" id="saveStatusBtn" data-id="${id}">حفظ التغيير</button></div></div>`);}
async function changeStatus(id){const reason=$('stReason').value.trim();if(reason.length<5)return flash('اكتب سبباً واضحاً',true);const {error}=await sb.rpc('change_customer_status',{p_customer_id:id,p_new_status:$('stNew').value,p_reason:reason,p_method:$('stMethod').value});if(error)return flash('تعذر تغيير الحالة: '+error.message,true);closeModal();flash('تم حفظ الحالة');await refreshAll();}

function openSaleForm(id=null){openModal('تسجيل سحب / فاتورة',`<div class="notice">مدة الأجل 30 يوماً من تاريخ التسجيل. بعد الحفظ لا تُعدّل الفاتورة ولا تُحذف.</div><div class="form-grid"><div><label>العميل</label><select id="sCustomer">${customerOptions(id)}</select></div><div><label>المنتج</label><input id="sProduct" placeholder="مثال: دلوكس داخلي"></div><div><label>الكمية</label><input id="sQty" type="number" min="0.01" step="0.01"></div><div><label>قيمة الفاتورة</label><input id="sAmount" type="number" min="0.01" step="0.01"></div><div class="full"><label>مرجع الطلبية / رقم الفاتورة (اختياري)</label><input id="sRef"></div><div class="full"><button class="btn" id="saveSaleBtn">حفظ السحب</button></div></div>`);}
async function addSale(){const cid=Number($('sCustomer').value),product=$('sProduct').value.trim(),qty=Number($('sQty').value),amount=Number($('sAmount').value);if(!product||!(qty>0)||!(amount>0))return flash('أكمل بيانات السحب بشكل صحيح',true);const {error}=await sb.rpc('add_sale',{p_customer_id:cid,p_product:product,p_quantity:qty,p_amount:amount,p_order_ref:$('sRef').value.trim()||null});if(error)return flash('تعذر تسجيل السحب: '+error.message,true);closeModal();flash('تم تسجيل الفاتورة وأصبح استحقاقها بعد 30 يوماً');await refreshAll();}

function updatePaymentBalanceBox(){const cid=Number($('pCustomer')?.value||0),box=$('paymentBalance');if(!box)return;const f=financeForCustomer(cid);box.innerHTML=`الرصيد الحالي: <b>${money(f.balance)}</b>${f.overdue>0?` — <span class="finance-danger">المتأخرات ${money(f.overdue)}</span>`:''}<br><span class="small">الدفعة ستذهب تلقائياً إلى أقدم فاتورة غير مسددة أولاً.</span>`;}
function openPaymentForm(id=null){openModal('تسجيل دفعة عميل',`<div class="notice">يتم توزيع الدفعة آلياً على أقدم فاتورة غير مسددة أولاً. لا يمكن حذف الدفعة أو تعديلها بعد الحفظ.</div><div class="form-grid"><div><label>العميل</label><select id="pCustomer">${customerOptions(id)}</select></div><div><label>المبلغ</label><input id="pAmount" type="number" min="0.01" step="0.01"></div><div><label>طريقة السداد</label><select id="pMethod"><option value="transfer">تحويل</option><option value="cash">نقدي</option><option value="cheque">شيك</option><option value="other">أخرى</option></select></div><div><label>المرجع (اختياري)</label><input id="pReference" placeholder="رقم التحويل / الشيك"></div><div class="full"><label>ملاحظة (اختياري)</label><textarea id="pNote" rows="2"></textarea></div><div id="paymentBalance" class="full payment-balance"></div><div class="full"><button class="btn good" id="savePaymentBtn">حفظ الدفعة</button></div></div>`);setTimeout(()=>{const s=$('pCustomer');if(s)s.addEventListener('change',updatePaymentBalanceBox);updatePaymentBalanceBox();},0);}
async function addPayment(){const cid=Number($('pCustomer').value),amount=Number($('pAmount').value);if(!(amount>0))return flash('أدخل مبلغ دفعة صحيح',true);const fin=financeForCustomer(cid);if(fin.balance<=0)return flash('لا يوجد رصيد مستحق على هذا العميل',true);if(amount>fin.balance)return flash('الدفعة أكبر من رصيد العميل الحالي',true);const {error}=await sb.rpc('add_payment',{p_customer_id:cid,p_amount:amount,p_payment_method:$('pMethod').value,p_reference:$('pReference').value.trim()||null,p_note:$('pNote').value.trim()||null});if(error){console.error(error);const msg=error.message.includes('exceeds')?'الدفعة أكبر من الرصيد الحالي.':error.message.includes('no outstanding')?'لا يوجد رصيد مستحق.':'تعذر تسجيل الدفعة: '+error.message;return flash(msg,true);}closeModal();flash('تم تسجيل الدفعة وتوزيعها على أقدم الفواتير');await refreshAll();}

function openReportForm(id=null){openModal('إضافة تقرير متابعة',`<div class="danger-note">التقرير سجل دائم ولا يُعدّل أو يُحذف.</div><div class="form-grid"><div><label>العميل</label><select id="rCustomer">${customerOptions(id)}</select></div><div><label>الحالة</label><select id="rType"><option value="sold">تم البيع</option><option value="followup">متابعة لاحقة</option><option value="rejected">رفض</option><option value="management">يحتاج تدخل الإدارة</option></select></div><div class="full"><label>الملاحظة</label><textarea id="rNote" rows="4"></textarea></div><div class="full"><label>الإجراء القادم</label><input id="rNext"></div><div class="full"><button class="btn" id="saveReportBtn">حفظ التقرير</button></div></div>`);}
async function addReport(){const note=$('rNote').value.trim();if(note.length<5)return flash('اكتب ملاحظة واضحة',true);const {error}=await sb.rpc('add_report',{p_customer_id:Number($('rCustomer').value),p_report_type:$('rType').value,p_note:note,p_next_action:$('rNext').value.trim()||null});if(error)return flash('تعذر حفظ التقرير: '+error.message,true);closeModal();flash('تم حفظ التقرير');await refreshAll();}

function markerIcon(category){const star=category==='frequent'?'★':'';return L.divIcon({className:'map-pin-wrap',html:`<div class="map-pin pin-${category}"><span>${star}</span></div>`,iconSize:[30,30],iconAnchor:[15,28],popupAnchor:[0,-28]});}
async function renderMap(){
  if(!isAdmin())return;
  if(!state.map){state.map=L.map('map').setView([24.78,46.76],11);L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri'}).addTo(state.map);state.markerLayer=L.layerGroup().addTo(state.map);}
  const {data,error}=await sb.from('customer_locations').select('customer_id,lat,lng'); if(error){console.error(error);return flash('تعذر تحميل الخريطة',true);} state.mapLocations=data||[]; drawMapMarkers(); setTimeout(()=>state.map.invalidateSize(),60);
}
function drawMapMarkers(){
  if(!state.map||!state.markerLayer)return; state.markerLayer.clearLayers(); const filter=$('mapFilter')?.value||'', q=($('mapSearch')?.value||'').trim().toLowerCase(); const bounds=[];
  for(const x of state.mapLocations){const c=state.customers.find(z=>Number(z.id)===Number(x.customer_id));if(!c||x.lat==null||x.lng==null)continue;const f=financeForCustomer(c.id),category=customerCategory(c);if(filter&&category!==filter)continue;if(q&&!`${c.name} ${c.area||''} ${c.rep?.full_name||''}`.toLowerCase().includes(q))continue;const m=L.marker([x.lat,x.lng],{icon:markerIcon(category)}).addTo(state.markerLayer);const div=document.createElement('div');div.dir='rtl';div.style.minWidth='230px';div.innerHTML=`<b>${esc(c.name)}</b><br>${esc(c.area||'')}<br>${esc(c.rep?.full_name||'')}<br>الحالة: ${esc(STATUS[c.status]||c.status)}${category==='frequent'?'<br><b class="finance-ok">★ سحب أكثر من مرة هذا الشهر</b>':''}<div class="popup-finance">الرصيد: ${money(f.balance)}<br>${f.overdue>0?`<span class="popup-overdue">متأخرات: ${money(f.overdue)} — ${f.overdueDays} يوم</span><br>`:''}يستحق خلال 7 أيام: ${money(f.dueSoon)}<br>سحوبات الشهر: ${f.monthSalesCount}</div>`;const btn=document.createElement('button');btn.className='btn secondary';btn.style.marginTop='7px';btn.textContent='فتح العميل';btn.addEventListener('click',()=>openCustomer(c.id));div.appendChild(btn);m.bindPopup(div);bounds.push([x.lat,x.lng]);}
  if(bounds.length) state.map.fitBounds(bounds,{padding:[30,30],maxZoom:14});
}

async function renderAudit(){if(!isAdmin())return;const {data,error}=await sb.from('audit_log').select('id,action,entity_type,entity_id,details,created_at,actor:profiles!audit_log_actor_id_fkey(full_name)').order('created_at',{ascending:false}).limit(500);if(error){console.error(error);return;}$('auditBody').innerHTML=(data||[]).map(a=>`<tr><td>${dateTime(a.created_at)}</td><td>${esc(a.actor?.full_name||'-')}</td><td>${esc(ACTION[a.action]||a.action)}</td><td>${esc(a.entity_type)} #${esc(a.entity_id||'')}</td><td>${esc(JSON.stringify(a.details||{}))}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">لا يوجد سجل.</td></tr>';}

async function changePassword(forced=false){
  const current=$(forced?'gateCurrentPassword':'currentPassword')?.value||'', p=$(forced?'gateNewPassword':'newPassword')?.value||'', confirm=$(forced?'gateConfirmPassword':'confirmPassword')?.value||'', msg=forced?$('gateSecurityMsg'):null; const fail=t=>{if(msg)msg.textContent=t;else flash(t,true);};
  if(!current)return fail('أدخل كلمة المرور الحالية.'); if(p===current)return fail('كلمة المرور الجديدة يجب أن تختلف عن الحالية.'); if(!strongPassword(p))return fail('استخدم 14 حرفاً على الأقل مع حرف كبير وصغير ورقم ورمز.'); if(p!==confirm)return fail('تأكيد كلمة المرور غير مطابق.'); if(msg)msg.textContent='جاري التحقق...';
  const email=state.session?.user?.email; const auth=await sb.auth.signInWithPassword({email,password:current}); if(auth.error)return fail('كلمة المرور الحالية غير صحيحة.'); const {error}=await sb.auth.updateUser({password:p}); if(error)return fail('تعذر تغيير كلمة المرور: '+error.message); if(!forced)flash('تم تغيير كلمة المرور'); await new Promise(r=>setTimeout(r,400)); await loadProfile();
}
async function renderSecurityStatus(){const box=$('securityStatus');if(!box||!state.profile)return;const changed=state.profile.password_changed_at?dateTime(state.profile.password_changed_at):'لم تُسجل بعد';box.innerHTML=`كلمة المرور: <b>${state.profile.must_change_password?'يجب تغييرها':'محدثة'}</b><br>آخر تغيير: ${esc(changed)}<br>الجلسة تُغلق بعد 20 دقيقة من عدم الاستخدام وبحد أقصى 8 ساعات.`;const m=$('mfaAccount');if(!m||!isAdmin())return;const [aal,factors]=await Promise.all([sb.auth.mfa.getAuthenticatorAssuranceLevel(),sb.auth.mfa.listFactors()]);const verified=(factors.data?.totp||[]).some(x=>x.status==='verified');m.innerHTML=`<h4>التحقق بخطوتين للإدارة</h4><div class="${verified?'security-good':'security-warn'}">${verified?'مفعّل. مستوى الجلسة: '+esc(aal.data?.currentLevel||'-'):'غير مفعّل.'}</div>`;}

function gotoPage(id){
  if(state.securityGateMode)return;if(state.profile?.must_change_password)return showPasswordGate();if(!isAdmin()&&(id==='mapPage'||id==='audit'))return;document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));$(id).classList.add('active');document.querySelectorAll('.nav-grid button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));const titles={dashboard:'لوحة المتابعة',customers:'العملاء',sales:'السحوبات / الفواتير',payments:'الدفعات',debts:'الأجل والمتأخرات',reports:'تقارير المندوبين',mapPage:'خريطة العملاء',audit:'سجل العمليات',account:'حسابي'};$('pageTitle').textContent=titles[id]||'';if(id==='mapPage')setTimeout(renderMap,100);if(id==='audit')renderAudit();if(id==='account')renderSecurityStatus();
}

$('loginBtn').addEventListener('click',login); $('loginPass').addEventListener('keydown',e=>{if(e.key==='Enter')login()}); $('logoutBtn').addEventListener('click',()=>logout()); $('closeModalBtn').addEventListener('click',closeModal); $('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal()});
document.querySelectorAll('.nav-grid button').forEach(b=>b.addEventListener('click',()=>gotoPage(b.dataset.page)));
$('customerSearch').addEventListener('input',renderCustomers); $('customerStatusFilter').addEventListener('change',renderCustomers); $('saleSearch').addEventListener('input',renderSales); $('paymentSearch').addEventListener('input',renderPayments); $('receivableFilter').addEventListener('change',renderDebts); $('reportTypeFilter').addEventListener('change',renderReports); $('mapSearch').addEventListener('input',drawMapMarkers); $('mapFilter').addEventListener('change',drawMapMarkers);
$('newCustomerBtn').addEventListener('click',openCustomerForm); $('newSaleBtn').addEventListener('click',()=>openSaleForm()); $('newPaymentBtn').addEventListener('click',()=>openPaymentForm()); $('newReportBtn').addEventListener('click',()=>openReportForm()); $('changePasswordBtn').addEventListener('click',()=>changePassword(false));
$('customersBody').addEventListener('click',e=>{const b=e.target.closest('[data-open-customer]');if(b)openCustomer(Number(b.dataset.openCustomer));}); $('debtsBody').addEventListener('click',e=>{const b=e.target.closest('[data-open-customer]');if(b)openCustomer(Number(b.dataset.openCustomer));});
$('modalContent').addEventListener('click',e=>{let b;if((b=e.target.closest('#gpsBtn')))captureLocation();else if((b=e.target.closest('#saveCustomerBtn')))createCustomer();else if((b=e.target.closest('[data-change-status]')))openStatusForm(Number(b.dataset.changeStatus));else if((b=e.target.closest('#saveStatusBtn')))changeStatus(Number(b.dataset.id));else if((b=e.target.closest('[data-add-sale]')))openSaleForm(Number(b.dataset.addSale));else if((b=e.target.closest('#saveSaleBtn')))addSale();else if((b=e.target.closest('[data-add-payment]')))openPaymentForm(Number(b.dataset.addPayment));else if((b=e.target.closest('#savePaymentBtn')))addPayment();else if((b=e.target.closest('[data-add-report]')))openReportForm(Number(b.dataset.addReport));else if((b=e.target.closest('#saveReportBtn')))addReport();});
$('securityGateBody').addEventListener('click',e=>{let b;if((b=e.target.closest('#gateChangePasswordBtn')))changePassword(true);else if((b=e.target.closest('#verifyMfaEnrollBtn')))verifyMFA($('mfaEnrollCode')?.value||'');else if((b=e.target.closest('#verifyMfaChallengeBtn')))verifyMFA($('mfaChallengeCode')?.value||'');});
['pointerdown','keydown','touchstart','scroll'].forEach(evt=>window.addEventListener(evt,()=>{state.lastActivity=Date.now();},{passive:true})); setInterval(()=>{if(state.session&&Date.now()-state.lastActivity>MAX_IDLE_MS)logout('تم تسجيل خروجك تلقائياً بعد 20 دقيقة بدون استخدام.');},30000);
if(!configured) showConfigMessage(); else sb.auth.onAuthStateChange((_event,session)=>{if(!session&&!$('login').classList.contains('hidden'))return;if(!session)showLogin();}); if(configured) loadProfile();
})();