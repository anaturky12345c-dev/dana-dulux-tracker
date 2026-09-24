(() => {
'use strict';
const cfg = window.DANA_CONFIG || {};
const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes('PASTE_') && !cfg.SUPABASE_ANON_KEY.includes('PASTE_');
const sb = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}) : null;
const USERS = {admin:'admin@dana.local',majdi:'majdi@dana.local',saeed:'saeed@dana.local',yaqoub:'yaqoub@dana.local',omar:'omar@dana.local'};
const STATUS = {new:'جديد',active:'نشط',hesitant:'متردد',rejected:'رافض',stopped:'متوقف'};
const REPORT = {sold:'تم البيع',followup:'متابعة لاحقة',rejected:'رفض',management:'يحتاج تدخل الإدارة'};
const ACTION = {customer_created:'إضافة عميل',status_changed:'تغيير حالة',sale_added:'إضافة سحب',report_added:'إضافة تقرير',debt_updated:'تحديث مديونية',location_corrected:'تصحيح موقع',password_changed:'تغيير كلمة المرور'};
const MAX_IDLE_MS = 20*60*1000;
const MAX_SESSION_MS = 8*60*60*1000;
const LOGIN_LOCK_MS = 5*60*1000;
const LOGIN_FAIL_LIMIT = 5;
const state = {session:null, profile:null, customers:[], sales:[], reports:[], profiles:[], map:null, markerLayer:null, pickerMap:null, pickerMarker:null, securityGateMode:null, mfaFactorId:null, lastActivity:Date.now()};
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmt = n => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(Number(n||0));
const money = n => fmt(n)+' ر.س';
const dateTime = iso => iso ? new Intl.DateTimeFormat('ar-SA',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(new Date(iso)) : '-';
const todayRiyadh = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const monthRiyadh = () => todayRiyadh().slice(0,7);
const isAdmin = () => state.profile?.role === 'admin';
const ownCustomer = c => isAdmin() || c.assigned_rep === state.profile?.id;
function flash(msg, bad=false){ const f=$('flash'); f.textContent=msg; f.style.background=bad?'#991b1b':'#111827'; f.classList.remove('hidden'); setTimeout(()=>f.classList.add('hidden'),3200); }
function badgeStatus(s){ const cls={new:'b-info',active:'b-good',hesitant:'b-warn',rejected:'b-bad',stopped:'b-gray'}[s]||'b-gray'; return `<span class="badge ${cls}">${esc(STATUS[s]||s)}</span>`; }
function badgeReport(s){ const cls={sold:'b-good',followup:'b-warn',rejected:'b-bad',management:'b-bad'}[s]||'b-gray'; return `<span class="badge ${cls}">${esc(REPORT[s]||s)}</span>`; }
function daysOld(date){ if(!date) return 0; return Math.max(0, Math.floor((Date.now()-new Date(date+'T00:00:00+03:00').getTime())/86400000)); }
function ageBand(days){ if(days<=30)return '0-30'; if(days<=60)return '31-60'; if(days<=90)return '61-90'; return '90+'; }
function showConfigMessage(){ $('loginMsg').innerHTML='النسخة البرمجية جاهزة، وتحتاج ربطها بمشروع Supabase قبل أول دخول.'; $('loginBtn').disabled=true; }
function getLoginGuard(){ try{return JSON.parse(localStorage.getItem('dana_login_guard_v1')||'{}')}catch(_){return {}} }
function setLoginGuard(v){ localStorage.setItem('dana_login_guard_v1',JSON.stringify(v)); }
function loginLockRemaining(){ const g=getLoginGuard(); return Math.max(0,Number(g.lockUntil||0)-Date.now()); }
function recordLoginFailure(){ let g=getLoginGuard(); const now=Date.now(); if(!g.firstAt||now-g.firstAt>15*60*1000) g={count:0,firstAt:now,lockUntil:0}; g.count=Number(g.count||0)+1; if(g.count>=LOGIN_FAIL_LIMIT){g.lockUntil=now+LOGIN_LOCK_MS;g.count=0;g.firstAt=now;} setLoginGuard(g); }
function clearLoginFailures(){ localStorage.removeItem('dana_login_guard_v1'); }
function strongPassword(p){ return p.length>=14 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p); }
function sessionTooOld(session){ const t=session?.user?.last_sign_in_at?new Date(session.user.last_sign_in_at).getTime():0; return !!t && Date.now()-t>MAX_SESSION_MS; }
function prepareAppShell(){
  $('login').classList.add('hidden');
  $('roleText').textContent=isAdmin()?`دخول: ${state.profile.full_name} (إدارة)`:`دخول المندوب: ${state.profile.full_name}`;
  document.querySelectorAll('.admin-only').forEach(el=>el.classList.toggle('hidden',!isAdmin()));
}
function showSecurityGate(title,html,mode){ state.securityGateMode=mode; $('securityGateTitle').textContent=title; $('securityGateBody').innerHTML=html; $('securityGate').classList.remove('hidden'); }
function hideSecurityGate(){ state.securityGateMode=null; state.mfaFactorId=null; $('securityGate').classList.add('hidden'); $('securityGateBody').innerHTML=''; }
function showPasswordGate(){
  showSecurityGate('تغيير كلمة المرور مطلوب',`<div class="security-warn">لحماية الحساب، لن يفتح النظام قبل تغيير كلمة المرور الحالية.</div><div class="form-grid" style="margin-top:12px"><div class="full"><label>كلمة المرور الحالية</label><input id="gateCurrentPassword" type="password" autocomplete="current-password"></div><div><label>كلمة المرور الجديدة</label><input id="gateNewPassword" type="password" autocomplete="new-password"></div><div><label>تأكيد كلمة المرور</label><input id="gateConfirmPassword" type="password" autocomplete="new-password"></div><div class="full password-policy">14 حرفاً على الأقل مع حرف كبير وصغير ورقم ورمز. استخدم كلمة مختلفة تماماً عن كلمة المرور القديمة.</div><div class="full"><button class="btn" id="gateChangePasswordBtn">تغيير كلمة المرور والمتابعة</button></div><div id="gateSecurityMsg" class="full small"></div></div>`,'password');
}
async function showMFAChallengeGate(){
  const factors=await sb.auth.mfa.listFactors();
  const factor=factors.data?.totp?.find(x=>x.status==='verified');
  if(factors.error||!factor) return showMFAEnrollGate();
  state.mfaFactorId=factor.id;
  showSecurityGate('رمز التحقق للإدارة',`<div class="security-warn">حساب الإدارة محمي بالتحقق بخطوتين. افتح تطبيق المصادقة وأدخل الرمز الحالي.</div><div class="form-grid" style="margin-top:12px"><div class="full"><label>رمز التحقق (6 أرقام)</label><input id="mfaChallengeCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div><div class="full"><button class="btn" id="verifyMfaChallengeBtn">تحقق وادخل</button></div><div id="gateSecurityMsg" class="full small"></div></div>`,'mfa-challenge');
}
async function showMFAEnrollGate(){
  showSecurityGate('تفعيل التحقق بخطوتين للإدارة','<div class="small">جاري تجهيز رمز الحماية...</div>','mfa-enroll-loading');
  const listed=await sb.auth.mfa.listFactors();
  if(listed.data?.totp?.some(x=>x.status==='verified')) return showMFAChallengeGate();
  for(const f of (listed.data?.totp||[])){ if(f.status!=='verified') await sb.auth.mfa.unenroll({factorId:f.id}).catch(()=>{}); }
  const {data,error}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'Dana Al-Taj Admin'});
  if(error){ showSecurityGate('تعذر تفعيل التحقق بخطوتين',`<div class="security-error">${esc(error.message)}</div>`,'mfa-error'); return; }
  state.mfaFactorId=data.id;
  const secret=data.totp?.secret||'';
  showSecurityGate('تفعيل التحقق بخطوتين للإدارة',`<div class="security-warn">امسح رمز QR بتطبيق Google Authenticator أو Microsoft Authenticator، ثم أدخل الرمز المكوّن من 6 أرقام. لا ترسل الرمز السري لأي شخص.</div><img class="mfa-qr" alt="QR للتحقق بخطوتين" src="${esc(data.totp?.qr_code||'')}"><div class="small">إذا تعذر مسح QR، أدخل هذا المفتاح يدوياً:</div><div class="security-secret">${esc(secret)}</div><div class="form-grid" style="margin-top:12px"><div class="full"><label>رمز التحقق (6 أرقام)</label><input id="mfaEnrollCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div><div class="full"><button class="btn" id="verifyMfaEnrollBtn">تفعيل الحماية</button></div><div id="gateSecurityMsg" class="full small"></div></div>`,'mfa-enroll');
}
async function verifyMFA(code){
  const msg=$('gateSecurityMsg');
  if(!/^\d{6}$/.test(code||'')){ if(msg) msg.textContent='أدخل رمزاً صحيحاً من 6 أرقام.'; return; }
  if(msg) msg.textContent='جاري التحقق...';
  const challenge=await sb.auth.mfa.challenge({factorId:state.mfaFactorId});
  if(challenge.error){ if(msg) msg.textContent='تعذر إنشاء التحقق: '+challenge.error.message; return; }
  const verified=await sb.auth.mfa.verify({factorId:state.mfaFactorId,challengeId:challenge.data.id,code});
  if(verified.error){ if(msg) msg.textContent='الرمز غير صحيح أو انتهت صلاحيته.'; return; }
  await sb.auth.refreshSession();
  await loadProfile();
}
async function enforceSecurityBeforeData(){
  prepareAppShell();
  if(state.profile.must_change_password){ showPasswordGate(); return; }
  if(isAdmin()){
    const aal=await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aal.error){ showSecurityGate('تعذر التحقق من حماية الإدارة',`<div class="security-error">${esc(aal.error.message)}</div>`,'mfa-error'); return; }
    if(aal.data.currentLevel!=='aal2'){ if(aal.data.nextLevel==='aal2') await showMFAChallengeGate(); else await showMFAEnrollGate(); return; }
  }
  hideSecurityGate();
  showApp();
  await refreshAll();
  await renderSecurityStatus();
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
  clearLoginFailures(); state.session=data.session; state.lastActivity=Date.now();
  await loadProfile();
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
function showApp(){
  prepareAppShell();
  gotoPage('dashboard');
}
async function logout(message=''){
  try{ if(sb) await sb.auth.signOut(); }catch(_){}
  state.session=null;state.profile=null;state.customers=[];state.sales=[];state.reports=[];state.profiles=[];state.lastActivity=Date.now();
  ['customersBody','salesBody','debtsBody','reportsBody','auditBody'].forEach(id=>{const el=$(id);if(el)el.innerHTML='';});
  showLogin(message);
}

async function refreshAll(){
  await Promise.all([loadProfiles(),loadCustomers(),loadSales(),loadReports()]);
  renderAll();
}
async function loadProfiles(){
  const {data,error}=await sb.from('profiles').select('id,username,full_name,role,active').eq('active',true).order('full_name');
  state.profiles=error?[]:(data||[]);
}
async function loadCustomers(){
  const {data,error}=await sb.from('customers').select('id,name,area,phone,status,current_debt,oldest_invoice_date,created_at,assigned_rep,rep:profiles!customers_assigned_rep_fkey(full_name)').order('created_at',{ascending:false});
  if(error){console.error(error);flash('تعذر تحميل العملاء',true);return;} state.customers=data||[];
}
async function loadSales(){
  const {data,error}=await sb.from('sales').select('id,customer_id,product,quantity,amount,created_at,business_date,rep_id,customer:customers(name),rep:profiles!sales_rep_id_fkey(full_name)').order('created_at',{ascending:false}).limit(2000);
  if(error){console.error(error);flash('تعذر تحميل السحوبات',true);return;} state.sales=data||[];
}
async function loadReports(){
  const {data,error}=await sb.from('reports').select('id,customer_id,report_type,note,next_action,created_at,business_date,rep_id,customer:customers(name),rep:profiles!reports_rep_id_fkey(full_name)').order('created_at',{ascending:false}).limit(2000);
  if(error){console.error(error);flash('تعذر تحميل التقارير',true);return;} state.reports=data||[];
}
function renderAll(){ renderDashboard();renderCustomers();renderSales();renderDebts();renderReports(); }
function renderDashboard(){
  const month=monthRiyadh();
  $('mCustomers').textContent=state.customers.length;
  $('mNew').textContent=state.customers.filter(c=>c.status==='new').length;
  $('mSales').textContent=money(state.sales.filter(s=>String(s.business_date||'').startsWith(month)).reduce((a,b)=>a+Number(b.amount||0),0));
  $('mDebt').textContent=money(state.customers.reduce((a,b)=>a+Number(b.current_debt||0),0));
  const attention=state.reports.filter(r=>r.report_type==='management'); $('mAttention').textContent=attention.length;
  $('attentionList').innerHTML=attention.length?attention.slice(0,8).map(r=>`<div class="event"><b>${esc(r.customer?.name||'-')}</b><div>${esc(r.note)}</div><div class="small">${dateTime(r.created_at)} — ${esc(r.rep?.full_name||'-')} — ${esc(r.next_action||'')}</div></div>`).join(''):'<div class="small">لا توجد حالات حالياً.</div>';
  if(isAdmin()){
    const reps=state.profiles.filter(p=>p.role==='rep');
    $('repSummary').innerHTML=reps.map(p=>{ const cc=state.customers.filter(c=>c.assigned_rep===p.id).length; const sm=state.sales.filter(s=>s.rep_id===p.id&&String(s.business_date||'').startsWith(month)).reduce((a,b)=>a+Number(b.amount||0),0); return `<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line)"><span>${esc(p.full_name)}</span><span class="small">${cc} عميل — ${money(sm)}</span></div>`}).join('')||'<div class="small">لا يوجد مندوبون مفعّلون.</div>';
  } else $('repSummary').innerHTML='<div class="small">يعرض لك النظام عملاءك وسحوباتك فقط.</div>';
}
function renderCustomers(){
  const q=$('customerSearch').value.trim().toLowerCase(), f=$('customerStatusFilter').value;
  const rows=state.customers.filter(c=>(!f||c.status===f)&&(!q||`${c.name} ${c.area} ${c.rep?.full_name||''}`.toLowerCase().includes(q)));
  $('customersBody').innerHTML=rows.length?rows.map(c=>{ const ss=state.sales.filter(s=>s.customer_id===c.id); return `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.area||'-')}</td><td>${esc(c.rep?.full_name||'-')}</td><td>${badgeStatus(c.status)}</td><td>${ss[0]?dateTime(ss[0].created_at):'-'}</td><td>${ss.length}</td><td>${money(c.current_debt)}</td><td><button class="btn secondary" data-open-customer="${c.id}">عرض</button></td></tr>`}).join(''):'<tr><td colspan="8" class="empty">لا توجد نتائج.</td></tr>';
}
function renderSales(){
  const q=$('saleSearch').value.trim().toLowerCase(); const rows=state.sales.filter(s=>!q||`${s.customer?.name||''} ${s.product||''}`.toLowerCase().includes(q));
  $('salesBody').innerHTML=rows.length?rows.map(s=>`<tr><td>${dateTime(s.created_at)}</td><td>${esc(s.customer?.name||'-')}</td><td>${esc(s.product)}</td><td>${fmt(s.quantity)}</td><td>${money(s.amount)}</td><td>${esc(s.rep?.full_name||'-')}</td></tr>`).join(''):'<tr><td colspan="6" class="empty">لا توجد سحوبات.</td></tr>';
}
function renderDebts(){
  const f=$('debtAgeFilter').value; const rows=state.customers.filter(c=>Number(c.current_debt)>0).map(c=>({...c,days:daysOld(c.oldest_invoice_date)})).filter(c=>!f||ageBand(c.days)===f).sort((a,b)=>b.days-a.days);
  $('debtsBody').innerHTML=rows.length?rows.map(c=>`<tr><td>${esc(c.name)}</td><td>${money(c.current_debt)}</td><td>${esc(c.oldest_invoice_date||'-')}</td><td>${c.days} يوم</td><td>${esc(c.rep?.full_name||'-')}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">لا توجد مديونيات مطابقة.</td></tr>';
}
function renderReports(){
  const f=$('reportTypeFilter').value; const rows=state.reports.filter(r=>!f||r.report_type===f);
  $('reportsBody').innerHTML=rows.length?rows.map(r=>`<tr><td>${dateTime(r.created_at)}</td><td>${esc(r.customer?.name||'-')}</td><td>${esc(r.rep?.full_name||'-')}</td><td>${badgeReport(r.report_type)}</td><td>${esc(r.note)}</td><td>${esc(r.next_action||'-')}</td></tr>`).join(''):'<tr><td colspan="6" class="empty">لا توجد تقارير.</td></tr>';
}

async function openCustomer(id){
  const c=state.customers.find(x=>x.id===id); if(!c)return;
  const [hs,ss,rr,dh]=await Promise.all([
    sb.from('customer_status_history').select('id,old_status,new_status,reason,method,created_at,actor:profiles!customer_status_history_changed_by_fkey(full_name)').eq('customer_id',id).order('created_at',{ascending:false}),
    sb.from('sales').select('id,product,quantity,amount,created_at').eq('customer_id',id).order('created_at',{ascending:false}),
    sb.from('reports').select('id,report_type,note,next_action,created_at,rep:profiles!reports_rep_id_fkey(full_name)').eq('customer_id',id).order('created_at',{ascending:false}),
    sb.from('debt_history').select('id,old_amount,new_amount,oldest_invoice_date,reason,created_at,actor:profiles!debt_history_changed_by_fkey(full_name)').eq('customer_id',id).order('created_at',{ascending:false})
  ]);
  openModal(c.name,`<div class="detail-grid"><div><b>المنطقة</b>${esc(c.area||'-')}</div><div><b>المندوب</b>${esc(c.rep?.full_name||'-')}</div><div><b>الحالة الحالية</b>${badgeStatus(c.status)}</div><div><b>المديونية</b>${money(c.current_debt)}</div><div><b>عمر الدين</b>${c.current_debt?daysOld(c.oldest_invoice_date)+' يوم':'لا يوجد'}</div><div><b>الجوال</b>${esc(c.phone||'-')}</div></div>
  <div class="toolbar"><button class="btn" data-change-status="${c.id}">تغيير الحالة</button>${isAdmin()?`<button class="btn secondary" data-update-debt="${c.id}">تحديث المديونية</button>`:''}</div>
  <h4>تاريخ حالة العميل</h4><div class="timeline">${(hs.data||[]).length?(hs.data||[]).map(h=>`<div class="event"><div class="status-flow">${h.old_status?badgeStatus(h.old_status):'<span class="badge b-gray">بداية</span>'}<span class="status-arrow">←</span>${badgeStatus(h.new_status)}</div><div>${esc(h.reason||'')}</div><div class="small">${dateTime(h.created_at)} — ${esc(h.actor?.full_name||'-')}${h.method?' — '+esc(h.method):''}</div></div>`).join(''):'<div class="small">لا يوجد سجل.</div>'}</div>
  <h4>السحوبات</h4><div class="table-wrap"><table><thead><tr><th>الوقت</th><th>المنتج</th><th>الكمية</th><th>القيمة</th></tr></thead><tbody>${(ss.data||[]).length?(ss.data||[]).map(s=>`<tr><td>${dateTime(s.created_at)}</td><td>${esc(s.product)}</td><td>${fmt(s.quantity)}</td><td>${money(s.amount)}</td></tr>`).join(''):'<tr><td colspan="4">لا توجد سحوبات.</td></tr>'}</tbody></table></div>
  <h4>تقارير المندوب</h4><div class="timeline">${(rr.data||[]).length?(rr.data||[]).map(r=>`<div class="event"><b>${dateTime(r.created_at)} — ${esc(r.rep?.full_name||'-')} — ${esc(REPORT[r.report_type]||r.report_type)}</b><div>${esc(r.note)}</div><div class="small">الإجراء القادم: ${esc(r.next_action||'-')}</div></div>`).join(''):'<div class="small">لا توجد تقارير.</div>'}</div>
  ${isAdmin()?`<h4>تاريخ المديونية</h4><div class="timeline">${(dh.data||[]).length?(dh.data||[]).map(d=>`<div class="event"><b>${money(d.old_amount)} ← ${money(d.new_amount)}</b><div>${esc(d.reason)}</div><div class="small">${dateTime(d.created_at)} — ${esc(d.actor?.full_name||'-')}</div></div>`).join(''):'<div class="small">لا يوجد سجل.</div>'}</div>`:''}`);
}
function openModal(title,html){ $('modalTitle').textContent=title;$('modalContent').innerHTML=html;$('modal').classList.add('open'); }
function closeModal(){
  if(state.pickerMap){ try{state.pickerMap.remove();}catch(_){} state.pickerMap=null;state.pickerMarker=null; }
  $('modal').classList.remove('open');
}
function customerOptions(){ return state.customers.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join(''); }
function repOptions(){ return state.profiles.filter(p=>p.role==='rep').map(p=>`<option value="${p.id}">${esc(p.full_name)}</option>`).join(''); }
function openCustomerForm(){
  openModal('إضافة عميل جديد',`<div class="danger-note">بعد الحفظ لا يمكن تعديل اسم العميل أو حذف السجل. حدد موقع المحل على الخريطة بدقة قبل الحفظ.</div><div class="form-grid" style="margin-top:10px"><div><label>اسم العميل</label><input id="fName" autocomplete="off"></div><div><label>المنطقة</label><input id="fArea" autocomplete="off"></div><div><label>الجوال</label><input id="fPhone" inputmode="tel" autocomplete="off"></div><div><label>الحالة الأولية</label><select id="fStatus"><option value="new">جديد</option><option value="hesitant">متردد</option><option value="active">نشط</option><option value="rejected">رافض</option></select></div>${isAdmin()?`<div><label>المندوب المسؤول</label><select id="fRep">${repOptions()}</select></div>`:''}<div class="full"><label>موقع المحل على الخريطة</label><div class="map-picker-help">اضغط على موقع المحل في الخريطة، أو استخدم زر «موقعي الحالي». يمكنك سحب العلامة لتعديل المكان.</div><div id="customerPickerMap"></div><div class="location-box" style="margin-top:8px"><div><label class="small">خط العرض</label><input id="fLat" type="text" readonly placeholder="يُحدد من الخريطة"></div><div><label class="small">خط الطول</label><input id="fLng" type="text" readonly placeholder="يُحدد من الخريطة"></div><button class="btn secondary" id="gpsBtn" type="button">موقعي الحالي</button></div><div id="locationStatus" class="small location-status">لم يتم تحديد موقع العميل بعد.</div></div><div class="full"><button class="btn" id="saveCustomerBtn">حفظ العميل نهائياً</button></div></div>`);
  setTimeout(initCustomerPickerMap,80);
}
function setCustomerLocation(lat,lng,zoom=true){
  const latNum=Number(lat), lngNum=Number(lng);
  if(!Number.isFinite(latNum)||!Number.isFinite(lngNum)) return;
  $('fLat').value=latNum.toFixed(6); $('fLng').value=lngNum.toFixed(6);
  const ll=[latNum,lngNum];
  if(!state.pickerMarker){
    state.pickerMarker=L.marker(ll,{draggable:true}).addTo(state.pickerMap);
    state.pickerMarker.on('dragend',e=>{ const p=e.target.getLatLng(); setCustomerLocation(p.lat,p.lng,false); });
  } else state.pickerMarker.setLatLng(ll);
  if(zoom) state.pickerMap.setView(ll,16);
  $('locationStatus').textContent='تم تحديد موقع العميل.';
  $('locationStatus').classList.add('ok');
}
function initCustomerPickerMap(){
  const el=$('customerPickerMap'); if(!el||!window.L) return;
  if(state.pickerMap){ try{state.pickerMap.remove();}catch(_){} }
  state.pickerMap=L.map(el,{zoomControl:true}).setView([24.7136,46.6753],11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(state.pickerMap);
  state.pickerMap.on('click',e=>setCustomerLocation(e.latlng.lat,e.latlng.lng,false));
  setTimeout(()=>state.pickerMap?.invalidateSize(),100);
}
function captureLocation(){
  if(!navigator.geolocation){flash('المتصفح لا يدعم تحديد الموقع',true);return;}
  const btn=$('gpsBtn'); if(btn){btn.disabled=true;btn.textContent='جاري تحديد الموقع...';}
  navigator.geolocation.getCurrentPosition(
    pos=>{ setCustomerLocation(pos.coords.latitude,pos.coords.longitude,true); flash('تم تحديد موقعك على الخريطة'); if(btn){btn.disabled=false;btn.textContent='موقعي الحالي';} },
    ()=>{ flash('تعذر الحصول على موقعك. اسمح للموقع باستخدام GPS أو اختر المكان يدوياً على الخريطة.',true); if(btn){btn.disabled=false;btn.textContent='موقعي الحالي';} },
    {enableHighAccuracy:true,timeout:15000,maximumAge:0}
  );
}
async function createCustomer(){
  const name=$('fName').value.trim(), area=$('fArea').value.trim(), phone=$('fPhone').value.trim(), status=$('fStatus').value, lat=$('fLat').value, lng=$('fLng').value;
  if(!name) return flash('اسم العميل مطلوب',true);
  if(!lat || !lng) return flash('حدد موقع العميل على الخريطة قبل الحفظ',true);
  const args={p_name:name,p_area:area||null,p_phone:phone||null,p_initial_status:status,p_lat:Number(lat),p_lng:Number(lng),p_assigned_rep:isAdmin()?$('fRep').value:null};
  const {error}=await sb.rpc('create_customer',args);
  if(error){console.error(error);return flash(error.message.includes('duplicate')?'العميل أو رقم الجوال مسجل مسبقاً.':'تعذر إضافة العميل: '+error.message,true);}
  closeModal();flash('تم إضافة العميل وتثبيت موقعه على الخريطة');await refreshAll();
}
function openStatusForm(id){ const c=state.customers.find(x=>x.id===id); if(!c)return; openModal('تغيير حالة العميل',`<div class="danger-note">لن تُحذف الحالة السابقة. سيظهر التسلسل كاملاً للإدارة مع اسم المستخدم ووقت السيرفر.</div><div class="form-grid" style="margin-top:10px"><div><label>الحالة الحالية</label><input value="${esc(STATUS[c.status])}" readonly></div><div><label>الحالة الجديدة</label><select id="stNew">${Object.entries(STATUS).filter(([k])=>k!==c.status).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div><div><label>طريقة التحويل/المتابعة</label><select id="stMethod"><option>زيارة</option><option>اتصال</option><option>عرض سعر</option><option>تجربة منتج</option><option>تفاوض</option><option>أخرى</option></select></div><div class="full"><label>سبب التغيير — إلزامي</label><textarea id="stReason" rows="3" placeholder="مثال: كان متردد بسبب السعر، وبعد عرض عينة واتفاق على الشروط تم البيع"></textarea></div><div class="full"><button class="btn" id="saveStatusBtn" data-id="${id}">حفظ التغيير</button></div></div>`); }
async function changeStatus(id){ const reason=$('stReason').value.trim();if(reason.length<5)return flash('اكتب سبب واضح للتغيير',true);const {error}=await sb.rpc('change_customer_status',{p_customer_id:id,p_new_status:$('stNew').value,p_reason:reason,p_method:$('stMethod').value});if(error){console.error(error);return flash('تعذر تغيير الحالة: '+error.message,true);}closeModal();flash('تم حفظ الحالة مع سجلها');await refreshAll(); }
function openSaleForm(){ openModal('تسجيل سحب جديد',`<div class="danger-note">السحب بعد تسجيله لا يُعدّل ولا يُحذف من التطبيق.</div><div class="form-grid" style="margin-top:10px"><div><label>العميل</label><select id="sCustomer">${customerOptions()}</select></div><div><label>المنتج</label><input id="sProduct" placeholder="مثال: دلوكس داخلي"></div><div><label>الكمية</label><input id="sQty" type="number" min="0.01" step="0.01"></div><div><label>القيمة</label><input id="sAmount" type="number" min="0" step="0.01"></div><div class="full"><label>مرجع الطلبية (اختياري)</label><input id="sRef"></div><div class="full"><button class="btn" id="saveSaleBtn">حفظ السحب</button></div></div>`); }
async function addSale(){ const cid=Number($('sCustomer').value), product=$('sProduct').value.trim(), qty=Number($('sQty').value), amount=Number($('sAmount').value);if(!product||!(qty>0)||amount<0)return flash('أكمل بيانات السحب بشكل صحيح',true);const {error}=await sb.rpc('add_sale',{p_customer_id:cid,p_product:product,p_quantity:qty,p_amount:amount,p_order_ref:$('sRef').value.trim()||null});if(error){console.error(error);return flash('تعذر تسجيل السحب: '+error.message,true);}closeModal();flash('تم تسجيل السحب بوقت السيرفر');await refreshAll(); }
function openReportForm(){ openModal('إضافة تقرير متابعة',`<div class="danger-note">التقرير سجل دائم ولا يُعدّل أو يُحذف بعد الإضافة.</div><div class="form-grid" style="margin-top:10px"><div><label>العميل</label><select id="rCustomer">${customerOptions()}</select></div><div><label>الحالة</label><select id="rType"><option value="sold">تم البيع</option><option value="followup">متابعة لاحقة</option><option value="rejected">رفض</option><option value="management">يحتاج تدخل الإدارة</option></select></div><div class="full"><label>الملاحظة</label><textarea id="rNote" rows="4"></textarea></div><div class="full"><label>الإجراء القادم</label><input id="rNext" placeholder="مثال: زيارة مدير المبيعات / اتصال بعد أسبوع"></div><div class="full"><button class="btn" id="saveReportBtn">حفظ التقرير</button></div></div>`); }
async function addReport(){ const note=$('rNote').value.trim();if(note.length<5)return flash('اكتب ملاحظة واضحة',true);const {error}=await sb.rpc('add_report',{p_customer_id:Number($('rCustomer').value),p_report_type:$('rType').value,p_note:note,p_next_action:$('rNext').value.trim()||null});if(error){console.error(error);return flash('تعذر حفظ التقرير: '+error.message,true);}closeModal();flash('تم حفظ التقرير');await refreshAll(); }
function openDebtForm(id=null){ openModal('تحديث المديونية',`<div class="danger-note">هذه العملية للإدارة فقط. القيمة القديمة تبقى محفوظة في سجل المديونية.</div><div class="form-grid" style="margin-top:10px"><div><label>العميل</label><select id="dCustomer">${state.customers.map(c=>`<option value="${c.id}" ${id===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div><label>المبلغ الحالي</label><input id="dAmount" type="number" min="0" step="0.01"></div><div><label>تاريخ أقدم فاتورة</label><input id="dOldest" type="date"></div><div class="full"><label>سبب التحديث</label><textarea id="dReason" rows="3" placeholder="مثال: تحديث من كشف الحساب"></textarea></div><div class="full"><button class="btn" id="saveDebtBtn">حفظ التحديث</button></div></div>`); if(id){const c=state.customers.find(x=>x.id===id);if(c){$('dAmount').value=c.current_debt||0;$('dOldest').value=c.oldest_invoice_date||'';}} }
async function updateDebt(){ const reason=$('dReason').value.trim();if(reason.length<4)return flash('سبب التحديث مطلوب',true);const {error}=await sb.rpc('set_customer_debt',{p_customer_id:Number($('dCustomer').value),p_amount:Number($('dAmount').value||0),p_oldest_invoice:$('dOldest').value||null,p_reason:reason});if(error){console.error(error);return flash('تعذر تحديث المديونية: '+error.message,true);}closeModal();flash('تم تحديث المديونية مع حفظ القيمة السابقة');await refreshAll(); }
async function renderAudit(){ if(!isAdmin())return;const {data,error}=await sb.from('audit_log').select('id,action,entity_type,entity_id,details,created_at,actor:profiles!audit_log_actor_id_fkey(full_name)').order('created_at',{ascending:false}).limit(500);if(error){console.error(error);return;} $('auditBody').innerHTML=(data||[]).map(a=>`<tr><td>${dateTime(a.created_at)}</td><td>${esc(a.actor?.full_name||'-')}</td><td>${esc(ACTION[a.action]||a.action)}</td><td>${esc(a.entity_type)} #${esc(a.entity_id||'')}</td><td>${esc(JSON.stringify(a.details||{}))}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">لا يوجد سجل.</td></tr>'; }
async function renderMap(){ if(!isAdmin())return;if(!state.map){ state.map=L.map('map').setView([24.78,46.76],11);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(state.map);state.markerLayer=L.layerGroup().addTo(state.map);} const {data,error}=await sb.from('customer_locations').select('customer_id,lat,lng,customer:customers(name,area,status,current_debt,rep:profiles!customers_assigned_rep_fkey(full_name))');if(error){console.error(error);return flash('تعذر تحميل الخريطة',true);}state.markerLayer.clearLayers();(data||[]).forEach(x=>{if(x.lat==null||x.lng==null)return;const m=L.marker([x.lat,x.lng]).addTo(state.markerLayer);m.bindPopup(`<div dir="rtl" style="min-width:220px"><b>${esc(x.customer?.name||'-')}</b><br>${esc(x.customer?.area||'')}<br>${esc(x.customer?.rep?.full_name||'')}<br>الحالة: ${esc(STATUS[x.customer?.status]||'')}<br>المديونية: ${money(x.customer?.current_debt||0)}<br><button style="margin-top:7px;padding:6px 10px" onclick="window.__openCustomer(${x.customer_id})">المزيد</button></div>`);});setTimeout(()=>state.map.invalidateSize(),50); }
async function changePassword(forced=false){
  const current=$(forced?'gateCurrentPassword':'currentPassword')?.value||'';
  const p=$(forced?'gateNewPassword':'newPassword')?.value||'';
  const confirm=$(forced?'gateConfirmPassword':'confirmPassword')?.value||'';
  const msg=forced?$('gateSecurityMsg'):null;
  const fail=t=>{if(msg)msg.textContent=t;else flash(t,true);};
  if(!current)return fail('أدخل كلمة المرور الحالية.');
  if(p===current)return fail('كلمة المرور الجديدة يجب أن تكون مختلفة تماماً عن الحالية.');
  if(!strongPassword(p))return fail('كلمة المرور الجديدة لا تحقق شروط الأمان: 14 حرفاً على الأقل مع حرف كبير وصغير ورقم ورمز.');
  if(p!==confirm)return fail('تأكيد كلمة المرور غير مطابق.');
  if(msg)msg.textContent='جاري التحقق من كلمة المرور الحالية...';
  const email=state.session?.user?.email;
  const auth=await sb.auth.signInWithPassword({email,password:current});
  if(auth.error)return fail('كلمة المرور الحالية غير صحيحة.');
  const {error}=await sb.auth.updateUser({password:p});
  if(error)return fail('تعذر تغيير كلمة المرور: '+error.message);
  if(forced){ if(msg)msg.textContent='تم تغيير كلمة المرور. جاري تطبيق الحماية...'; } else flash('تم تغيير كلمة المرور بنجاح');
  await new Promise(r=>setTimeout(r,400));
  await loadProfile();
}
async function renderSecurityStatus(){
  const box=$('securityStatus'); if(!box||!state.profile)return;
  const changed=state.profile.password_changed_at?dateTime(state.profile.password_changed_at):'لم تُسجل بعد';
  box.innerHTML=`كلمة المرور: <b>${state.profile.must_change_password?'يجب تغييرها':'محدثة'}</b><br>آخر تغيير مسجل: ${esc(changed)}<br>الجلسة تُغلق بعد 20 دقيقة من عدم الاستخدام وبحد أقصى 8 ساعات.`;
  const m=$('mfaAccount'); if(!m||!isAdmin())return;
  const [aal,factors]=await Promise.all([sb.auth.mfa.getAuthenticatorAssuranceLevel(),sb.auth.mfa.listFactors()]);
  const verified=(factors.data?.totp||[]).some(x=>x.status==='verified');
  m.innerHTML=`<h4>التحقق بخطوتين للإدارة</h4><div class="${verified?'security-good':'security-warn'}">${verified?'مفعّل على الحساب. مستوى الجلسة الحالي: '+esc(aal.data?.currentLevel||'-'):'غير مفعّل. سيطلب النظام تفعيله قبل الوصول إلى بيانات الإدارة.'}</div>`;
}
function gotoPage(id){ if(state.securityGateMode)return;if(state.profile?.must_change_password)return showPasswordGate();if(!isAdmin()&&(id==='mapPage'||id==='audit'))return;document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));$(id).classList.add('active');document.querySelectorAll('.nav-grid button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));const titles={dashboard:'لوحة المتابعة',customers:'العملاء',sales:'السحوبات',debts:'المديونيات',reports:'تقارير المندوبين',mapPage:'خريطة العملاء',audit:'سجل العمليات',account:'حسابي'};$('pageTitle').textContent=titles[id]||'';if(id==='mapPage')setTimeout(renderMap,100);if(id==='audit')renderAudit();if(id==='account')renderSecurityStatus();}

// Event wiring
$('loginBtn').addEventListener('click',login);$('loginPass').addEventListener('keydown',e=>{if(e.key==='Enter')login()});$('logoutBtn').addEventListener('click',()=>logout());$('closeModalBtn').addEventListener('click',closeModal);$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal()});
document.querySelectorAll('.nav-grid button').forEach(b=>b.addEventListener('click',()=>gotoPage(b.dataset.page)));
$('customerSearch').addEventListener('input',renderCustomers);$('customerStatusFilter').addEventListener('change',renderCustomers);$('saleSearch').addEventListener('input',renderSales);$('debtAgeFilter').addEventListener('change',renderDebts);$('reportTypeFilter').addEventListener('change',renderReports);
$('newCustomerBtn').addEventListener('click',openCustomerForm);$('newSaleBtn').addEventListener('click',openSaleForm);$('newReportBtn').addEventListener('click',openReportForm);$('debtUpdateBtn').addEventListener('click',()=>openDebtForm());$('changePasswordBtn').addEventListener('click',()=>changePassword(false));
$('customersBody').addEventListener('click',e=>{const b=e.target.closest('[data-open-customer]');if(b)openCustomer(Number(b.dataset.openCustomer));});
$('modalContent').addEventListener('click',e=>{let b;if((b=e.target.closest('#gpsBtn')))captureLocation();else if((b=e.target.closest('#saveCustomerBtn')))createCustomer();else if((b=e.target.closest('[data-change-status]')))openStatusForm(Number(b.dataset.changeStatus));else if((b=e.target.closest('#saveStatusBtn')))changeStatus(Number(b.dataset.id));else if((b=e.target.closest('#saveSaleBtn')))addSale();else if((b=e.target.closest('#saveReportBtn')))addReport();else if((b=e.target.closest('[data-update-debt]')))openDebtForm(Number(b.dataset.updateDebt));else if((b=e.target.closest('#saveDebtBtn')))updateDebt();});
$('securityGateBody').addEventListener('click',e=>{let b;if((b=e.target.closest('#gateChangePasswordBtn')))changePassword(true);else if((b=e.target.closest('#verifyMfaEnrollBtn')))verifyMFA($('mfaEnrollCode')?.value||'');else if((b=e.target.closest('#verifyMfaChallengeBtn')))verifyMFA($('mfaChallengeCode')?.value||'');});
['pointerdown','keydown','touchstart','scroll'].forEach(evt=>window.addEventListener(evt,()=>{state.lastActivity=Date.now();},{passive:true}));
setInterval(()=>{if(state.session&&Date.now()-state.lastActivity>MAX_IDLE_MS)logout('تم تسجيل خروجك تلقائياً بعد 20 دقيقة بدون استخدام.');},30000);
window.__openCustomer=openCustomer;
if(!configured) showConfigMessage(); else sb.auth.onAuthStateChange((_event,session)=>{if(!session&&!$('login').classList.contains('hidden'))return;if(!session){showLogin();}});
if(configured) loadProfile();
})();