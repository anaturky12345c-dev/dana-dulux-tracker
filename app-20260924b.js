(() => {
'use strict';

const cfg = window.DANA_CONFIG || {};
const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes('PASTE_') && !cfg.SUPABASE_ANON_KEY.includes('PASTE_');
const sb = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}) : null;
const USERS = {admin:'admin@dana.local',management:'management@dana.local',mohsen:'mohsen@dana.local',majdi:'majdi@dana.local',saeed:'saeed@dana.local',yaqoub:'yaqoub@dana.local',omar:'omar@dana.local',mowazaa:'mowazaa@dana.local','موزع':'mowazaa@dana.local',mutasim:'mutasim@dana.local','معتصم':'mutasim@dana.local'};

let lang=localStorage.getItem('dana_lang')||'ar';
const I18N={
 ar:{
  signIn:'دخول',signOut:'تسجيل خروج',dashboard:'لوحة المتابعة',customers:'العملاء',sales:'السحوبات / الفواتير',followups:'متابعات وشكاوى العملاء',map:'الخريطة',reports:'التقارير',audit:'سجل العمليات',account:'حسابي',
  new:'جديد',active:'نشط',inactive:'خامل',agreed_pending:'متفق – بانتظار الطلبية',hesitant:'متردد',rejected:'رافض',noChange:'بدون تغيير الحالة',
  sales_followup:'متابعة بيعية',admin_intervention:'طلب تدخل الإدارة',complaint:'شكوى عميل',service_followup:'طلب خدمة / مراجعة شكوى',inactive_visit:'زيارة عميل خامل',review_next_week:'متابعة قديمة',sample_request:'طلب عينة',customer_agreed:'اتفاق عميل - سجل قديم',management_response:'رد / متابعة الإدارة',
  dulux_emulsion:'اميلشن ديلوكس',dulux_oil:'زياتي ديلوكس',leafs_tinting:'تلوينة ليفز',dulux_polyurethane:'بلوريثان ديلوكس',
  company:'الشركة',newCustomers:'عملاء جدد',activeNewCustomers:'عملاء جدد نشطين (سحب 5,000+)',totalSalesGoal:'إجمالي المبيعات',goal:'الهدف',achieved:'المحقق',remaining:'المتبقي',progress:'النسبة',
  edit:'تعديل',del:'حذف',save:'حفظ',cancel:'إلغاء',view:'عرض',close:'إغلاق',add:'إضافة',
  customer:'العميل',customerType:'نوع العميل',shop:'محل',factory:'مصنع',project:'مشروع',notSet:'غير محدد',representative:'المندوب',area:'المنطقة',phone:'الجوال',status:'الحالة',action:'الإجراء',reason:'التقرير / السبب',product:'المنتج',quantity:'الكمية',value:'القيمة',reference:'المرجع',date:'التاريخ',
  totalCustomers:'إجمالي العملاء',salesThisMonth:'سحوبات الشهر',activeCustomers:'العملاء النشطون',hesitantCustomers:'العملاء المترددون',rejectedCustomers:'العملاء الرافضون',clickView:'اضغط للعرض',
  repSummary:'ملخص المناديب اليومي',managementIntervention:'حالات تحتاج تدخل الإدارة',goals:'ملخص الأهداف',currentMonth:'الشهر الحالي',editGoals:'تعديل الأهداف',repPerformance:'أداء المندوبين',
  allStatuses:'كل الحالات',searchCustomer:'ابحث باسم العميل أو المنطقة أو رقم الجوال...',newCustomer:'+ عميل جديد',customerAddedAt:'تاريخ الإضافة',salesCountMonth:'عدد سحوبات الشهر',salesValueMonth:'قيمة سحوبات الشهر',
  recordSale:'+ تسجيل سحب / فاتورة',searchSale:'ابحث بالعميل أو المنتج أو المرجع...',allDates:'كل التواريخ',today:'هذا اليوم',thisWeek:'هذا الأسبوع',thisMonth:'هذا الشهر',
  addFollowup:'+ تسجيل شكوى / طلب',allActions:'كل الأنواع',recordedAt:'وقت التسجيل',previousStatus:'الحالة السابقة',newStatus:'الحالة الجديدة',
  reportType:'نوع التقرير',allReps:'كل المندوبين',from:'من تاريخ',to:'إلى تاريخ',generateReport:'عرض التقرير',printPdf:'تصدير PDF / طباعة',
  username:'اسم المستخدم',password:'كلمة المرور',language:'English',accountSecurity:'أمان الحساب',
  noData:'لا توجد بيانات.',confirmDelete:'هل أنت متأكد من الحذف؟',saved:'تم الحفظ',deleted:'تم الحذف',updated:'تم التعديل'
 },
 en:{
  signIn:'Sign in',signOut:'Sign out',dashboard:'Dashboard',customers:'Customers',sales:'Sales / Withdrawals',followups:'Customer Follow-ups & Complaints',map:'Customer Map',reports:'Reports',audit:'Activity Log',account:'My Account',
  new:'New',active:'Active',inactive:'Inactive',agreed_pending:'Agreed – awaiting order',hesitant:'Hesitant',rejected:'Rejected',noChange:'No status change',
  sales_followup:'Sales follow-up',admin_intervention:'Request management intervention',complaint:'Customer complaint',service_followup:'Service request / complaint review',inactive_visit:'Inactive customer visit',review_next_week:'Legacy follow-up',sample_request:'Sample request',customer_agreed:'Legacy customer agreement',management_response:'Management response / follow-up',
  dulux_emulsion:'Dulux Emulsion',dulux_oil:'Dulux Oil-Based',leafs_tinting:'Leafs Tinting',dulux_polyurethane:'Dulux Polyurethane',
  company:'Company',newCustomers:'New customers',activeNewCustomers:'Active new customers (SAR 5,000+)',totalSalesGoal:'Total sales',goal:'Goal',achieved:'Achieved',remaining:'Remaining',progress:'Progress',
  edit:'Edit',del:'Delete',save:'Save',cancel:'Cancel',view:'View',close:'Close',add:'Add',
  customer:'Customer',customerType:'Customer Type',shop:'Shop',factory:'Factory',project:'Project',notSet:'Not set',representative:'Representative',area:'Area',phone:'Phone',status:'Status',action:'Action',reason:'Report / Reason',product:'Product',quantity:'Quantity',value:'Value',reference:'Reference',date:'Date',
  totalCustomers:'Total Customers',salesThisMonth:'Sales This Month',activeCustomers:'Active Customers',hesitantCustomers:'Hesitant Customers',rejectedCustomers:'Rejected Customers',clickView:'Click to view',
  repSummary:'Daily Representative Summary',managementIntervention:'Management Intervention',goals:'Goal Summary',currentMonth:'Current month',editGoals:'Edit Goals',repPerformance:'Representative Performance',
  allStatuses:'All Statuses',searchCustomer:'Search customer, area or phone...',newCustomer:'+ New Customer',customerAddedAt:'Date Added',salesCountMonth:'Sales Count This Month',salesValueMonth:'Sales Value This Month',
  recordSale:'+ Record Sale / Withdrawal',searchSale:'Search customer, product or reference...',allDates:'All Dates',today:'Today',thisWeek:'This Week',thisMonth:'This Month',
  addFollowup:'+ Complaint / Request',allActions:'All Types',recordedAt:'Recorded At',previousStatus:'Previous Status',newStatus:'New Status',
  reportType:'Report Type',allReps:'All Representatives',from:'From',to:'To',generateReport:'Generate Report',printPdf:'Export PDF / Print',
  username:'Username',password:'Password',language:'العربية',accountSecurity:'Account Security',
  noData:'No data.',confirmDelete:'Are you sure you want to delete this record?',saved:'Saved',deleted:'Deleted',updated:'Updated'
 }
};
const t=k=>I18N[lang][k]??k;
const statusLabel=k=>t(k);
const actionLabel=k=>I18N[lang][k]||k||'-';
const productLabel=k=>I18N[lang][k]||k||'-';
const STATUS_KEYS=['hesitant','agreed_pending','rejected','active'];
const CHANGE_STATUS_KEYS=['active','agreed_pending','hesitant','rejected'];
const FOLLOW_ACTION_KEYS=['complaint','sample_request','admin_intervention','service_followup'];
const EDIT_ACTION_KEYS=[...FOLLOW_ACTION_KEYS,'management_response','review_next_week','customer_agreed','inactive_visit'];
const PRODUCT_KEYS=['dulux_emulsion','dulux_oil','leafs_tinting','dulux_polyurethane'];
const ACTION = {
 customer_created:'Customer created',customer_updated:'Customer updated',customer_deleted:'Customer deleted',
 status_changed:'Status changed',sale_added:'Sale / withdrawal added',sale_updated:'Sale updated',sale_deleted:'Sale deleted',
 report_added:'Follow-up added',report_updated:'Follow-up updated',report_deleted:'Follow-up deleted',
 location_corrected:'Location corrected',password_changed:'Password changed',password_reset_by_admin:'Representative password reset by admin',performance_goal_updated:'Performance goal updated'
};
const MAX_IDLE_MS = 60*60*1000;
const MAX_SESSION_MS = 8*60*60*1000;
const LOGIN_LOCK_MS = 5*60*1000;
const LOGIN_FAIL_LIMIT = 5;
const PAGE_SIZE = 1000;
const ACTIVE_NEW_GOAL_MIN_SALES = 5000;
const state={session:null,profile:null,customers:[],sales:[],reports:[],profiles:[],goals:[],map:null,markerLayer:null,mapLocations:[],pickerMap:null,pickerMarker:null,securityGateMode:null,mfaFactorId:null,lastActivity:Date.now(),activityCache:new Map(),customerMonthOnly:false};
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmt=n=>new Intl.NumberFormat(lang==='ar'?'ar-SA':'en-US',{maximumFractionDigits:2}).format(Number(n||0));
const money=n=>lang==='ar'?fmt(n)+' ر.س':'SAR '+fmt(n);
const dateTime=iso=>iso?new Intl.DateTimeFormat(lang==='ar'?'ar-SA':'en-GB',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(new Date(iso)):'-';
const dateOnly=d=>d?new Intl.DateTimeFormat(lang==='ar'?'ar-SA':'en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(d+'T00:00:00Z')):'-';
const todayRiyadh=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dateKeyRiyadh=iso=>iso?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso)):'';
const monthRiyadh=()=>todayRiyadh().slice(0,7);
const weekStartRiyadh=()=>{
 const today=todayRiyadh(),d=new Date(today+'T00:00:00Z'),daysSinceSaturday=(d.getUTCDay()+1)%7;
 d.setUTCDate(d.getUTCDate()-daysSinceSaturday);
 return d.toISOString().slice(0,10);
};
const periodMatchesDate=(dateValue,period)=>{
 const p=period||'all';
 if(p==='all')return true;
 const d=String(dateValue||'').slice(0,10);
 if(!d)return false;
 const today=todayRiyadh(),weekStart=weekStartRiyadh(),month=monthRiyadh();
 return (p==='day'&&d===today)||(p==='week'&&d>=weekStart&&d<=today)||(p==='month'&&d.startsWith(month));
};
const googleMapsDirectionsUrl=(lat,lng)=>`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${Number(lat)},${Number(lng)}`)}`;
const isAdmin=()=>state.profile?.role==='admin';
const isManager=()=>state.profile?.role==='manager';
const canManage=()=>isAdmin()||isManager();
const normalizePhone=v=>{
 let d=String(v??'').replace(/[٠-٩]/g,ch=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(ch))).replace(/[۰-۹]/g,ch=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch))).replace(/\D/g,'');
 if(d.startsWith('00966'))d=d.slice(2);
 if(d.startsWith('966'))d='0'+d.slice(3);
 else if(d.startsWith('5')&&d.length===9)d='0'+d;
 return d;
};

function applyLanguage(){
 document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
 const set=(sel,txt)=>{const e=document.querySelector(sel);if(e)e.textContent=txt;};
 const ph=(id,txt)=>{const e=$(id);if(e)e.placeholder=txt;};
 const heads=(id,arr)=>{const hs=document.querySelectorAll('#'+id+' thead th');arr.forEach((x,i)=>{if(hs[i])hs[i].textContent=x;});};

 set('.brand',lang==='ar'?'دانة التاج':'Dana Al-Taj');set('.sub',lang==='ar'?'إدارة مبيعات ديلوكس':'Dulux Sales Management');
 set('#login h2',lang==='ar'?'نظام إدارة مبيعات ديلوكس':'Dulux Sales Management');
 ph('loginUser',t('username'));ph('loginPass',t('password'));if($('loginBtn'))$('loginBtn').textContent=t('signIn');
 if($('logoutBtn'))$('logoutBtn').textContent=t('signOut');if($('closeModalBtn'))$('closeModalBtn').textContent=t('close');
 if($('langBtn'))$('langBtn').textContent=t('language');if($('langBtnLogin'))$('langBtnLogin').textContent=t('language');

 const nav={dashboard:'dashboard',customers:'customers',sales:'sales',reports:'followups',mapPage:'map',analytics:'reports',audit:'audit',account:'account'};
 for(const [p,k] of Object.entries(nav)){const e=document.querySelector('[data-page="'+p+'"]');if(e)e.textContent=t(k);}

 if($('newCustomerBtn'))$('newCustomerBtn').textContent=t('newCustomer');if($('newSaleBtn'))$('newSaleBtn').textContent=t('recordSale');if($('newSalesFollowupBtn'))$('newSalesFollowupBtn').textContent=lang==='ar'?'+ تسجيل متابعة':'+ Record Follow-up';if($('newComplaintBtn'))$('newComplaintBtn').textContent=lang==='ar'?'+ شكوى / طلب':'+ Complaint / Request';if($('editGoalsBtn'))$('editGoalsBtn').textContent=t('editGoals');set('#servicePageTitle',lang==='ar'?'متابعات وشكاوى العملاء':'Customer Follow-ups & Complaints');set('#servicePageHint',lang==='ar'?'المتابعات البيعية منفصلة عن الشكاوى والطلبات. لا يتم تغيير حالة العميل من هذه الصفحة.':'Sales follow-ups are separate from complaints and requests. Customer status is not changed from this page.');set('#requiredFollowupTitle',lang==='ar'?'المتابعات المطلوبة':'Required Sales Follow-ups');set('#requiredFollowupHint',lang==='ar'?'المتردد: كل 3 أيام عمل. الرافض: كل 7 أيام عمل. الجمعة لا تُحسب.':'Hesitant: every 3 workdays. Rejected: every 7 workdays. Friday is not counted.');set('#salesFollowupHistoryTitle',lang==='ar'?'سجل المتابعات':'Sales Follow-up History');set('#salesFollowupHistoryHint',lang==='ar'?'تسجيل المتابعة لا يغيّر حالة العميل.':'Recording a follow-up does not change customer status.');set('#complaintsHistoryTitle',lang==='ar'?'الشكاوى والطلبات':'Complaints & Requests');set('#complaintsHistoryHint',lang==='ar'?'الشكاوى وطلبات العينات وطلبات الخدمة وتدخل الإدارة.':'Complaints, sample requests, service requests, and management intervention.');
 ph('customerSearch',t('searchCustomer'));ph('saleSearch',t('searchSale'));ph('mapSearch',lang==='ar'?'ابحث باسم العميل أو المنطقة...':'Search customer or area...');

 set('#dashboard .dashboard-panels h3',canManage()?t('repSummary'):(lang==='ar'?'ملخص اليوم':'Today summary'));const rss=$('repSummarySub');if(rss)rss.textContent=canManage()?(lang==='ar'?'أرقام اليوم فقط — كل مندوب في بطاقة مستقلة':'Today only — one clear card per representative'):(lang==='ar'?'أرقامك لليوم فقط':'Your numbers for today');set('#dashboard .dashboard-attention h3',t('managementIntervention'));set('#dormantTitle',lang==='ar'?'عملاء خاملون – مطلوب زيارة':'Inactive Customers – Visit Required');set('#goalsTitle',t('goals'));
 const goalSmall=document.querySelector('#goalsTitle + .small');if(goalSmall)goalSmall.textContent=t('currentMonth');
 const rp=document.querySelector('#repPerformance')?.closest('.card')?.querySelector('.dashboard-head h3');if(rp)rp.textContent=t('repPerformance');
 const rpSmall=document.querySelector('#repPerformance')?.closest('.card')?.querySelector('.dashboard-head .small');if(rpSmall)rpSmall.textContent=t('currentMonth');
 const cards=canManage()?[['customers','totalCustomers'],['sales-month','salesThisMonth'],['active','activeCustomers'],['hesitant','hesitantCustomers'],['rejected','rejectedCustomers']]:[['sales-day',lang==='ar'?'سحوبات اليوم':'Sales Today'],['sales-month','salesThisMonth'],['active','activeCustomers'],['hesitant','hesitantCustomers'],['rejected','rejectedCustomers']];
 const dashboardCards=[...document.querySelectorAll('#dashboard .dashboard-cards [data-dashboard-link]')];
 dashboardCards.forEach((el,i)=>{const cfg=cards[i];if(!cfg)return;el.dataset.dashboardLink=cfg[0];const x=el.querySelector('.label'),h=el.querySelector('.card-hint');if(x)x.textContent=I18N[lang][cfg[1]]||cfg[1];if(h)h.textContent=t('clickView');});

 const st=$('customerStatusFilter');if(st){st.options[0].text=t('allStatuses');for(let i=1;i<st.options.length;i++)st.options[i].text=t(st.options[i].value);} const crf=$('customerRepFilter');if(crf&&crf.options.length)crf.options[0].text=t('allReps');
 const dateLabels={all:t('allDates'),day:t('today'),week:t('thisWeek'),month:t('thisMonth')};
 const cpf=$('customerPeriodFilter');if(cpf){for(const o of cpf.options)o.text=dateLabels[o.value]||o.value;}
 const sp=$('salePeriodFilter');if(sp){for(const o of sp.options)o.text=dateLabels[o.value]||o.value;}
 const rpf=$('reportPeriodFilter');if(rpf){for(const o of rpf.options)o.text=dateLabels[o.value]||o.value;}
 const apf=$('auditPeriodFilter');if(apf){for(const o of apf.options)o.text=dateLabels[o.value]||o.value;}
 const spp=$('saleProductFilter');if(spp){if(spp.options.length)spp.options[0].text=lang==='ar'?'كل المنتجات':'All Products';for(let i=1;i<spp.options.length;i++)spp.options[i].text=productLabel(spp.options[i].value);} const srf=$('saleRepFilter');if(srf&&srf.options.length)srf.options[0].text=t('allReps');
 const rf=$('reportActionFilter');if(rf){rf.options[0].text=lang==='ar'?'كل أنواع الشكاوى والطلبات':'All Complaint / Request Types';for(let i=1;i<rf.options.length;i++)rf.options[i].text=t(rf.options[i].value);}
 const mf=$('mapFilter');if(mf){mf.options[0].text=lang==='ar'?'كل الحالات':'All Statuses';for(let i=1;i<mf.options.length;i++){const v=mf.options[i].value;mf.options[i].text=v==='frequent'?(lang==='ar'?'سحب متكرر هذا الشهر':'Repeated sale this month'):t(v);}} const mrf=$('mapRepFilter');if(mrf&&mrf.options.length)mrf.options[0].text=t('allReps');const mtf=$('mapTypeFilter');if(mtf){const labs={'':lang==='ar'?'كل أنواع العملاء':'All Customer Types',shop:t('shop'),factory:t('factory'),project:t('project')};for(const o of mtf.options)o.text=labs[o.value]||o.value;}if(typeof setMapText==='function')setMapText();
 const ar=$('analyticsRep');if(ar&&ar.options.length)ar.options[0].text=t('allReps');

 heads('customers',[t('customer'),t('customerType'),t('customerAddedAt'),t('area'),t('representative'),t('status'),t('salesCountMonth'),t('salesValueMonth'),'']);
 heads('sales',[t('date'),t('customer'),t('product'),t('quantity'),t('value'),t('reference'),t('representative'),lang==='ar'?'الإجراءات':'Actions']);
 set('#sfhDate',t('recordedAt'));set('#sfhCustomer',t('customer'));set('#sfhRep',t('representative'));set('#sfhStatus',t('status'));set('#sfhNote',lang==='ar'?'نتيجة المتابعة':'Follow-up Result');set('#sfhActions',lang==='ar'?'الإجراءات':'Actions');set('#chDate',t('recordedAt'));set('#chCustomer',t('customer'));set('#chRep',t('representative'));set('#chType',lang==='ar'?'النوع':'Type');set('#chDetails',lang==='ar'?'التفاصيل':'Details');set('#chActions',lang==='ar'?'الإجراءات':'Actions');
 heads('audit',[lang==='ar'?'الوقت':'Time',lang==='ar'?'المستخدم':'User',t('action'),lang==='ar'?'الكيان':'Entity',lang==='ar'?'التفاصيل':'Details']);

 const legend=$('mapPage')?.querySelector('.map-legend');if(legend)legend.innerHTML=`<span><i class="legend-dot green star">★</i>${lang==='ar'?'سحب متكرر':'Repeated sale'}</span><span><i class="legend-dot green"></i>${t('active')}</span><span><i class="legend-dot purple"></i>${t('inactive')}</span><span><i class="legend-dot blue"></i>${t('agreed_pending')}</span><span><i class="legend-dot yellow"></i>${t('hesitant')}</span><span><i class="legend-dot red"></i>${t('rejected')}</span><span class="map-type-legend">🏪 ${t('shop')}</span><span class="map-type-legend">🏭 ${t('factory')}</span><span class="map-type-legend">🏗 ${t('project')}</span>`;

 const at=$('analyticsType');if(at){const labs={'':lang==='ar'?'اختر نوع التقرير...':'Choose report type...',executive:lang==='ar'?'لوحة الإدارة التنفيذية':'Executive Management',sales:lang==='ar'?'تحليل المبيعات':'Sales Intelligence',products:lang==='ar'?'أداء المنتجات':'Product Performance',reps:lang==='ar'?'أداء المناديب':'Representative Performance',customers:lang==='ar'?'حركة وتحويل العملاء':'Customer Movement & Conversion',followups:lang==='ar'?'طلبات وشكاوى العملاء':'Customer Requests & Complaints',goals:lang==='ar'?'أداء الأهداف':'Goal Performance'};for(const o of at.options)o.text=labs[o.value]||o.value;}
 const labels=document.querySelectorAll('#analytics label');const al=[t('reportType'),t('representative'),t('from'),t('to')];al.forEach((x,i)=>{if(labels[i])labels[i].textContent=x;});const rph=$('analytics')?.querySelector('.report-page-head');if(rph){const h=rph.querySelector('h2'),p=rph.querySelector('p'),e=rph.querySelector('.report-eyebrow');if(h)h.textContent=lang==='ar'?'التقارير والتحليلات':'Reports & Analytics';if(p)p.textContent=lang==='ar'?'اختر التقرير والفترة لتحصل على قراءة إدارية واضحة، وليس مجرد جدول أرقام.':'Choose a report and period to get a management view, not just a raw table.';if(e)e.textContent=lang==='ar'?'ذكاء إداري':'Management Intelligence';}const preset=$('analytics')?.querySelector('.report-preset-row');if(preset){const s=preset.querySelector('span'),bs=preset.querySelectorAll('button');if(s)s.textContent=lang==='ar'?'فترة سريعة:':'Quick period:';if(bs[0])bs[0].textContent=t('thisWeek');if(bs[1])bs[1].textContent=t('thisMonth');if(bs[2])bs[2].textContent=lang==='ar'?'آخر 30 يوم':'Last 30 Days';}if($('generateReportBtn'))$('generateReportBtn').textContent=t('generateReport');if($('printReportBtn'))$('printReportBtn').textContent=t('printPdf');
 const empty=$('printableReport')?.querySelector('.empty');if(empty&&!state.profile)empty.textContent=lang==='ar'?'حدد نوع التقرير والفترة ثم اضغط عرض التقرير.':'Select a report type and date range, then generate the report.';

 set('#account h3',t('accountSecurity'));if($('repPasswordAdminTitle'))$('repPasswordAdminTitle').textContent=lang==='ar'?'إعادة تعيين كلمة مرور مندوب':'Reset Representative Password';if($('repPasswordAdminHelp'))$('repPasswordAdminHelp').textContent=lang==='ar'?'ينشئ كلمة مرور مؤقتة ويطلب من المندوب تغييرها بعد تسجيل الدخول.':'Creates a temporary password and requires the representative to change it after signing in.';if($('repPasswordAdminLabel'))$('repPasswordAdminLabel').textContent=t('representative');if($('repPasswordAdminBtn'))$('repPasswordAdminBtn').textContent=lang==='ar'?'إعادة تعيين كلمة المرور':'Reset Password';const accLabels=document.querySelectorAll('#account .security-account:first-child label');const acc=[lang==='ar'?'كلمة المرور الحالية':'Current Password',lang==='ar'?'كلمة المرور الجديدة':'New Password',lang==='ar'?'تأكيد كلمة المرور الجديدة':'Confirm New Password'];acc.forEach((x,i)=>{if(accLabels[i])accLabels[i].textContent=x;});const pol=document.querySelector('#account .password-policy');if(pol)pol.textContent=lang==='ar'?'14 حرفاً على الأقل مع حرف كبير وصغير ورقم ورمز.':'At least 14 characters with uppercase, lowercase, number and symbol.';if($('changePasswordBtn'))$('changePasswordBtn').textContent=lang==='ar'?'تغيير كلمة المرور':'Change Password';

 const pt=$('pageTitle');if(pt){const active=document.querySelector('.nav-grid button.active');if(active)pt.textContent=active.textContent;}
 if(state.profile){renderAll();if(document.querySelector('#mapPage.section.active'))drawMapMarkers();if(document.querySelector('#audit.section.active'))renderAudit();if(document.querySelector('#account.section.active'))renderSecurityStatus();}
}
function toggleLanguage(){lang=lang==='ar'?'en':'ar';localStorage.setItem('dana_lang',lang);applyLanguage();}

function addBaseMap(map){
  const layer=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'© OpenStreetMap contributors'
  });
  layer.addTo(map);
  return layer;
}


function flash(msg,bad=false){ const f=$('flash'); f.textContent=msg; f.style.background=bad?'#991b1b':'#111827'; f.classList.remove('hidden'); setTimeout(()=>f.classList.add('hidden'),3600); }
function showConfigMessage(){ $('loginMsg').textContent=lang==='ar'?'تعذر تحميل إعدادات النظام.':'Could not load system configuration.'; $('loginBtn').disabled=true; }
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
  document.querySelectorAll('.management-only').forEach(el=>el.classList.toggle('hidden',!canManage()));
  document.querySelectorAll('.full-admin-only').forEach(el=>el.classList.toggle('hidden',!isAdmin()));
  document.querySelectorAll('.rep-only').forEach(el=>el.classList.toggle('hidden',canManage()));
}
function showSecurityGate(title,html,mode){ state.securityGateMode=mode; $('securityGateTitle').textContent=title; $('securityGateBody').innerHTML=html; $('securityGate').classList.remove('hidden'); }
function hideSecurityGate(){ state.securityGateMode=null; state.mfaFactorId=null; $('securityGate').classList.add('hidden'); $('securityGateBody').innerHTML=''; }

function showPasswordGate(){
 const ar=lang==='ar';
 showSecurityGate(ar?'تغيير كلمة المرور مطلوب':'Password change required',`<div class="security-warn">${ar?'لحماية الحساب، لن تفتح بيانات النظام قبل تغيير كلمة المرور الحالية.':'For account security, system data will remain locked until you change the current password.'}</div><div class="form-grid" style="margin-top:12px"><div class="full"><label>${ar?'كلمة المرور الحالية':'Current password'}</label><input id="gateCurrentPassword" type="password" autocomplete="current-password"></div><div><label>${ar?'كلمة المرور الجديدة':'New password'}</label><input id="gateNewPassword" type="password" autocomplete="new-password"></div><div><label>${ar?'تأكيد كلمة المرور':'Confirm password'}</label><input id="gateConfirmPassword" type="password" autocomplete="new-password"></div><div class="full password-policy">${ar?'14 حرفاً على الأقل مع حرف كبير وصغير ورقم ورمز.':'At least 14 characters with uppercase, lowercase, number and symbol.'}</div><div class="full"><button class="btn" id="gateChangePasswordBtn">${ar?'تغيير كلمة المرور والمتابعة':'Change password and continue'}</button></div><div id="gateSecurityMsg" class="full small"></div></div>`,'password');
}
async function showMFAChallengeGate(){
 const factors=await sb.auth.mfa.listFactors(),factor=factors.data?.totp?.find(x=>x.status==='verified');
 if(factors.error||!factor)return showMFAEnrollGate();
 state.mfaFactorId=factor.id;const ar=lang==='ar';
 showSecurityGate(ar?'رمز التحقق للإدارة':'Admin verification code',`<div class="security-warn">${ar?'أدخل الرمز الحالي من تطبيق المصادقة.':'Enter the current code from your authenticator app.'}</div><div class="form-grid" style="margin-top:12px"><div class="full"><label>${ar?'رمز التحقق (6 أرقام)':'Verification code (6 digits)'}</label><input id="mfaChallengeCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div><div class="full"><button class="btn" id="verifyMfaChallengeBtn">${ar?'تحقق وادخل':'Verify and continue'}</button></div><div id="gateSecurityMsg" class="full small"></div></div>`,'mfa-challenge');
}
async function showMFAEnrollGate(){
 const ar=lang==='ar';
 showSecurityGate(ar?'تفعيل التحقق بخطوتين للإدارة':'Enable admin two-factor authentication',`<div class="small">${ar?'جاري تجهيز رمز الحماية...':'Preparing security code...'}</div>`,'mfa-enroll-loading');

 const listed=await sb.auth.mfa.listFactors();
 if(listed.error){
   showSecurityGate(ar?'تعذر فحص التحقق بخطوتين':'Could not check two-factor authentication',`<div class="security-error">${esc(listed.error.message||'')}</div><div style="margin-top:12px"><button class="btn" id="retryMfaSetupBtn">${ar?'إعادة المحاولة':'Retry'}</button></div>`,'mfa-error');
   setTimeout(()=>{const b=$('retryMfaSetupBtn');if(b)b.onclick=showMFAEnrollGate;},0);
   return;
 }
 if(listed.data?.totp?.some(x=>x.status==='verified'))return showMFAChallengeGate();

 // A page refresh can leave an unfinished TOTP factor behind. Remove it explicitly
 // before creating a fresh QR code; Supabase returns errors in the result object,
 // not as rejected promises.
 const stale=(listed.data?.totp||[]).filter(x=>x.status!=='verified');
 for(const f of stale){
   const removed=await sb.auth.mfa.unenroll({factorId:f.id});
   if(removed.error){
     showSecurityGate(
       ar?'إعادة تجهيز التحقق بخطوتين':'Reset two-factor setup',
       `<div class="security-error">${ar?'يوجد إعداد تحقق غير مكتمل من محاولة سابقة. اضغط إعادة المحاولة لتنظيفه وإنشاء رمز جديد.':'An unfinished verification setup exists from a previous attempt. Retry to clean it up and create a new code.'}</div><div style="margin-top:12px"><button class="btn" id="retryMfaSetupBtn">${ar?'إعادة المحاولة':'Retry'}</button></div>`,
       'mfa-error'
     );
     setTimeout(()=>{const b=$('retryMfaSetupBtn');if(b)b.onclick=showMFAEnrollGate;},0);
     return;
   }
 }

 // Re-check after cleanup so a stale factor cannot block a new enrollment.
 const afterCleanup=await sb.auth.mfa.listFactors();
 if(afterCleanup.data?.totp?.some(x=>x.status==='verified'))return showMFAChallengeGate();
 const stillStale=(afterCleanup.data?.totp||[]).filter(x=>x.status!=='verified');
 if(stillStale.length){
   showSecurityGate(
     ar?'إعادة تجهيز التحقق بخطوتين':'Reset two-factor setup',
     `<div class="security-error">${ar?'تعذر تنظيف إعداد التحقق السابق. سجل خروج ثم ادخل مرة أخرى واضغط إعادة المحاولة.':'Could not clear the previous verification setup. Sign out, sign in again, then retry.'}</div><div style="margin-top:12px"><button class="btn" id="retryMfaSetupBtn">${ar?'إعادة المحاولة':'Retry'}</button></div>`,
     'mfa-error'
   );
   setTimeout(()=>{const b=$('retryMfaSetupBtn');if(b)b.onclick=showMFAEnrollGate;},0);
   return;
 }

 const friendlyName='Dana Al-Taj Admin '+Date.now().toString().slice(-6);
 const {data,error}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName});
 if(error){
   showSecurityGate(ar?'تعذر تفعيل التحقق بخطوتين':'Could not enable two-factor authentication',`<div class="security-error">${ar?'تعذر إنشاء رمز تحقق جديد. اضغط إعادة المحاولة.':'Could not create a new verification code. Retry.'}</div><div style="margin-top:12px"><button class="btn" id="retryMfaSetupBtn">${ar?'إعادة المحاولة':'Retry'}</button></div>`,'mfa-error');
   setTimeout(()=>{const b=$('retryMfaSetupBtn');if(b)b.onclick=showMFAEnrollGate;},0);
   return;
 }
 state.mfaFactorId=data.id;
 showSecurityGate(ar?'تفعيل التحقق بخطوتين للإدارة':'Enable admin two-factor authentication',`<div class="security-warn">${ar?'امسح رمز QR الجديد بتطبيق Google Authenticator أو Microsoft Authenticator ثم أدخل الرمز. إذا حدث تحديث للصفحة، استخدم رمز QR الذي يظهر بعد التحديث فقط.':'Scan the new QR code with Google Authenticator or Microsoft Authenticator, then enter the code. If the page refreshes, use only the QR code shown after the refresh.'}</div><img class="mfa-qr" alt="MFA QR" src="${esc(data.totp?.qr_code||'')}"><div class="small">${ar?'المفتاح اليدوي:':'Manual key:'}</div><div class="security-secret">${esc(data.totp?.secret||'')}</div><div class="form-grid" style="margin-top:12px"><div class="full"><label>${ar?'رمز التحقق':'Verification code'}</label><input id="mfaEnrollCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div><div class="full"><button class="btn" id="verifyMfaEnrollBtn">${ar?'تفعيل الحماية':'Enable protection'}</button></div><div id="gateSecurityMsg" class="full small"></div></div>`,'mfa-enroll');
}
async function verifyMFA(code){
 const msg=$('gateSecurityMsg'),ar=lang==='ar';
 if(!/^\d{6}$/.test(code||'')){if(msg)msg.textContent=ar?'أدخل رمزاً صحيحاً من 6 أرقام.':'Enter a valid 6-digit code.';return;}
 if(msg)msg.textContent=ar?'جاري التحقق...':'Verifying...';
 const challenge=await sb.auth.mfa.challenge({factorId:state.mfaFactorId});if(challenge.error){if(msg)msg.textContent=ar?'تعذر إنشاء التحقق.':'Could not start verification.';return;}
 const verified=await sb.auth.mfa.verify({factorId:state.mfaFactorId,challengeId:challenge.data.id,code});if(verified.error){if(msg)msg.textContent=ar?'الرمز غير صحيح أو انتهت صلاحيته.':'The code is invalid or expired.';return;}
 await sb.auth.refreshSession();await loadProfile();
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
  if(remaining>0){ $('loginMsg').textContent=lang==='ar'?`محاولات كثيرة. حاول بعد ${Math.ceil(remaining/60000)} دقيقة.`:`Too many attempts. Try again in ${Math.ceil(remaining/60000)} minutes.`; return; }
  const username=$('loginUser').value.trim().toLowerCase(), password=$('loginPass').value;
  const email=USERS[username];
  if(!email||!password){ recordLoginFailure(); $('loginMsg').textContent=lang==='ar'?'تعذر الدخول. تأكد من البيانات.':'Could not sign in. Check your details.'; return; }
  $('loginMsg').textContent=lang==='ar'?'جاري الدخول...':'Signing in...';
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error){ recordLoginFailure(); $('loginMsg').textContent=lang==='ar'?'تعذر الدخول. تأكد من البيانات.':'Could not sign in. Check your details.'; return; }
  clearLoginFailures(); state.session=data.session; state.lastActivity=Date.now(); await loadProfile();
}
async function loadProfile(){
  const {data:{session}}=await sb.auth.getSession(); state.session=session;
  if(!session){ showLogin(); return; }
  if(sessionTooOld(session)){ await sb.auth.signOut(); return showLogin(lang==='ar'?'انتهت مدة الجلسة. سجل الدخول من جديد.':'Session expired. Please sign in again.'); }
  const {data,error}=await sb.from('profiles').select('id,username,full_name,role,active,must_change_password,password_changed_at').eq('id',session.user.id).single();
  if(error || !data?.active){ await sb.auth.signOut(); return showLogin(lang==='ar'?'الحساب غير مفعّل في النظام.':'This account is not active.'); }
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
    if(error){ console.error(label,error); flash((lang==='ar'?'تعذر تحميل ':'Could not load ')+label,true); return out; }
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
  const {data,error}=await sb.from('customers').select('id,name,area,phone,status,customer_type,created_at,updated_at,inactive_since,inactive_visit_due_at,assigned_rep,created_by,rep:profiles!customers_assigned_rep_fkey(full_name)').order('created_at',{ascending:false});
  if(error){console.error(error);flash(lang==='ar'?'تعذر تحميل العملاء':'Could not load customers',true);return;}state.customers=data||[];
}
async function loadSales(){state.sales=await loadPaged((x,y)=>sb.from('sales').select('id,customer_id,product,quantity,amount,order_ref,business_date,created_at,rep_id,customer:customers(name),rep:profiles!sales_rep_id_fkey(full_name)').order('business_date',{ascending:false}).order('created_at',{ascending:false}).range(x,y),lang==='ar'?'السحوبات':'sales');}
async function loadReports(){state.reports=await loadPaged((x,y)=>sb.from('reports').select('id,customer_id,report_type,action_code,note,old_status,new_status,created_at,business_date,rep_id,customer:customers(name,status),rep:profiles!reports_rep_id_fkey(full_name)').order('created_at',{ascending:false}).range(x,y),lang==='ar'?'المتابعات':'follow-ups');}
async function loadGoals(){const {data,error}=await sb.from('performance_goals').select('id,scope_type,rep_id,goal_type,product_code,monthly_target,updated_at').order('scope_type').order('rep_id').order('goal_type').order('product_code');state.goals=error?[]:(data||[]);}

function activityForCustomer(cid){
 cid=Number(cid);if(state.activityCache.has(cid))return state.activityCache.get(cid);
 const month=monthRiyadh();let monthSalesCount=0,monthSalesValue=0,lastSale=null;
 for(const x of state.sales){if(Number(x.customer_id)!==cid)continue;if(String(x.business_date||'').startsWith(month)){monthSalesCount++;monthSalesValue+=Number(x.amount||0);}if(!lastSale||new Date(x.created_at)>new Date(lastSale.created_at))lastSale=x;}
 const out={monthSalesCount,monthSalesValue,lastSale};state.activityCache.set(cid,out);return out;
}
function customerCategory(c){const x=activityForCustomer(c.id);if(c.status==='inactive')return 'inactive';if(x.monthSalesCount>1)return 'frequent';return c.status||'hesitant';}
function renderAll(){if(!$('mCustomers'))return;renderDashboard();renderCustomers();renderSales();renderReports();renderGoalsDashboard();renderRepPerformance();renderRepPasswordAdmin();window.dispatchEvent(new CustomEvent('dana:render'));}

function badgeStatus(k){const cls={new:'b-info',active:'b-good',inactive:'b-purple',agreed_pending:'b-info',hesitant:'b-warn',rejected:'b-bad'}[k]||'b-gray';return `<span class="badge ${cls}">${esc(statusLabel(k))}</span>`;}

function goalFor(scope,repId,type){return state.goals.find(g=>g.scope_type===scope&&(scope==='company'||g.rep_id===repId)&&g.goal_type===type);}
function goalProgress(goal,achieved,isMoney=true){
 const target=Number(goal?.monthly_target||0),pct=target>0?Math.round(achieved/target*100):0,remaining=Math.max(0,target-achieved);
 return `<div class="goal-progress"><div class="goal-numbers"><span>${t('goal')}: <b>${isMoney?money(target):fmt(target)}</b></span><span>${t('achieved')}: <b>${isMoney?money(achieved):fmt(achieved)}</b></span><span>${t('remaining')}: <b>${isMoney?money(remaining):fmt(remaining)}</b></span></div><div class="progress-track"><div class="progress-fill" style="width:${Math.min(100,pct)}%"></div></div><div class="small">${t('progress')}: ${pct}%</div></div>`;
}


function inactiveVisitForCustomer(c){
 const since=c?.inactive_since?new Date(c.inactive_since).getTime():0;
 return state.reports
   .filter(r=>Number(r.customer_id)===Number(c?.id)&&r.action_code==='inactive_visit'&&new Date(r.created_at||0).getTime()>=since)
   .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))[0]||null;
}
function renderDormantDashboard(){
 const box=$('dormantList'),count=$('dormantCount'),sub=$('dormantSub');if(!box)return;
 const repId=state.profile?.id;
 const rows=state.customers.filter(c=>c.status==='inactive'&&(canManage()||c.assigned_rep===repId))
   .slice().sort((a,b)=>new Date(a.inactive_since||a.updated_at||0)-new Date(b.inactive_since||b.updated_at||0));
 if(count)count.textContent=String(rows.length);
 if(sub)sub.textContent=lang==='ar'
   ?(rows.length?'عملاء نشطون سابقاً لم يسجلوا طلبية في أسبوع العمل السابق. مطلوب زيارة وتقرير.':'لا يوجد عملاء خاملون حالياً.')
   :(rows.length?'Previously active customers with no order in the last Sat–Thu workweek. Visit and report required.':'No inactive customers right now.');
 box.innerHTML=rows.length?rows.slice(0,10).map(c=>{
   const ac=activityForCustomer(c.id),visit=inactiveVisitForCustomer(c),due=c.inactive_visit_due_at?new Date(c.inactive_visit_due_at).getTime():0,overdue=!!due&&due<Date.now();
   const badgeText=overdue?(lang==='ar'?'زيارة متأخرة':'Visit overdue'):(visit?(lang==='ar'?'زيارة جديدة خلال 3 أيام عمل':'Next visit in 3 workdays'):(lang==='ar'?'مطلوب زيارة':'Visit required'));
   return `<button type="button" class="dormant-item" data-dormant-customer="${c.id}">
     <span class="dormant-main"><b>${esc(c.name)}</b><span>${esc(c.rep?.full_name||'-')}</span></span>
     <span class="dormant-meta"><small>${lang==='ar'?'آخر طلبية':'Last order'}: ${ac.lastSale?dateOnly(ac.lastSale.business_date):'-'}</small><small>${lang==='ar'?'خامل منذ':'Inactive since'}: ${dateOnly(c.inactive_since||c.updated_at||c.created_at)}</small><small>${lang==='ar'?'موعد الزيارة':'Visit due'}: ${c.inactive_visit_due_at?dateTime(c.inactive_visit_due_at):'-'}</small></span>
     <span class="dormant-visit ${overdue?'overdue':(visit?'done':'pending')}">${badgeText}</span>
   </button>`;
 }).join(''):`<div class="attention-empty">${lang==='ar'?'لا يوجد عملاء خاملون حالياً.':'No inactive customers right now.'}</div>`;
}
function openDormantCustomer(id){
 const c=state.customers.find(x=>Number(x.id)===Number(id));if(!c||c.status!=='inactive')return;
 const ac=activityForCustomer(c.id),visit=inactiveVisitForCustomer(c);
 openModal(lang==='ar'?'عميل خامل':'Inactive Customer',`
   <div class="notice"><b>${esc(c.name)}</b><br>${lang==='ar'?'هذا العميل تحول إلى خامل آلياً لعدم وجود طلبية خلال أسبوع العمل من السبت إلى الخميس.':'This customer was automatically marked Inactive because no order was recorded during the Sat–Thu workweek.'}</div>
   <div class="detail-grid" style="margin-top:10px">
     <div><b>${t('representative')}</b>${esc(c.rep?.full_name||'-')}</div>
     <div><b>${t('status')}</b>${badgeStatus(c.status)}</div>
     <div><b>${lang==='ar'?'آخر طلبية':'Last order'}</b>${ac.lastSale?dateOnly(ac.lastSale.business_date):'-'}</div>
     <div><b>${lang==='ar'?'خامل منذ':'Inactive since'}</b>${dateTime(c.inactive_since||c.updated_at||c.created_at)}</div><div><b>${lang==='ar'?'مهلة الزيارة':'Visit due'}</b>${c.inactive_visit_due_at?dateTime(c.inactive_visit_due_at):'-'}</div>
   </div>
   <div class="${visit?'security-good':'security-warn'}" style="margin-top:10px">
     ${visit?(lang==='ar'?'تم تسجيل زيارة بعد تحوله إلى خامل: ':'A visit was logged after inactivity: ')+esc(visit.note):(lang==='ar'?'زيارة العميل وتسجيل تقرير إلزامي كل 3 أيام عمل ما دام خاملًا. وإذا نتجت الزيارة عن طلبية يمكن تسجيل التقرير داخل شاشة الطلبية.':'A customer visit and report are required. The report can also be entered inside the order screen if the visit results in an order.')}
   </div>
   <div class="toolbar" style="margin-top:12px">
     <button class="btn secondary" data-inactive-visit="${c.id}">${lang==='ar'?'تسجيل زيارة':'Record Visit'}</button>
     <button class="btn" data-add-sale="${c.id}">${lang==='ar'?'تسجيل طلبية':'Record Order'}</button>
   </div>`);
}
function openInactiveVisitForm(id){
 const c=state.customers.find(x=>Number(x.id)===Number(id));if(!c||c.status!=='inactive')return flash(lang==='ar'?'العميل لم يعد خاملًا.':'Customer is no longer inactive.',true);
 openModal(lang==='ar'?'تقرير زيارة عميل خامل':'Inactive Customer Visit Report',`
   <div class="notice"><b>${esc(c.name)}</b><br>${lang==='ar'?'سجّل نتيجة الزيارة بالصوت. يبقى العميل خاملًا إلى أن تسجل له طلبية.':'Record the visit result by voice. The customer stays Inactive until an order is recorded.'}</div>
   <div class="form-grid" style="margin-top:12px">
     <div class="full">${voiceRecorderHtml('inactiveVisitVoice',lang==='ar'?'تقرير الزيارة الصوتي':'Voice visit report')}</div>
     <div class="full"><label>${lang==='ar'?'تفاصيل إضافية بالكتابة — اختياري':'Additional written details — optional'}</label><textarea id="inactiveVisitNote" rows="3" placeholder="${lang==='ar'?'اكتب فقط إذا فيه معلومة تحتاج توضيح...':'Write only if something needs extra clarification...'}"></textarea></div>
     <div class="full"><button class="btn" id="saveInactiveVisitBtn" data-id="${c.id}">${t('save')}</button></div>
   </div>`);
}
async function saveInactiveVisit(id){
 const note=$('inactiveVisitNote')?.value.trim()||'',btn=$('saveInactiveVisitBtn');
 if(!voiceDraft('inactiveVisitVoice')?.blob)return flash(lang==='ar'?'سجّل تقرير الزيارة الصوتي أولاً.':'Record the voice visit report first.',true);
 try{
   if(btn){btn.disabled=true;btn.textContent=lang==='ar'?'جاري الحفظ...':'Saving...';}
   const audio=await uploadVoiceDraft('inactiveVisitVoice','inactive-visit',id);
   const {error}=await sb.rpc('record_inactive_visit',{p_customer_id:id,p_note:note,p_audio_path:audio.path,p_audio_duration_seconds:audio.duration});
   if(error)throw new Error(error.message);
   closeModal();flash(lang==='ar'?'تم تسجيل زيارة العميل الخامل.':'Inactive-customer visit recorded.');await refreshAll();
 }catch(err){
   flash(err.message||String(err),true);
   if(btn){btn.disabled=false;btn.textContent=t('save');}
 }
}
function renderDashboard(){
 const dashboardConfig=canManage()?[['customers',t('totalCustomers')],['sales-month',t('salesThisMonth')],['active',t('activeCustomers')],['hesitant',t('hesitantCustomers')],['rejected',t('rejectedCustomers')]]:[['sales-day',lang==='ar'?'سحوبات اليوم':'Sales Today'],['sales-month',t('salesThisMonth')],['active',t('activeCustomers')],['hesitant',t('hesitantCustomers')],['rejected',t('rejectedCustomers')]];
 [...document.querySelectorAll('#dashboard .dashboard-cards [data-dashboard-link]')].forEach((el,i)=>{const cfg=dashboardConfig[i];if(!cfg)return;el.dataset.dashboardLink=cfg[0];const label=el.querySelector('.label'),hint=el.querySelector('.card-hint');if(label)label.textContent=cfg[1];if(hint)hint.textContent=t('clickView');});
 const repSummaryTitle=document.querySelector('#dashboard .dashboard-panels h3');if(repSummaryTitle)repSummaryTitle.textContent=canManage()?t('repSummary'):(lang==='ar'?'ملخص اليوم':'Today summary');
 const month=monthRiyadh(),today=todayRiyadh(),repId=state.profile?.id;
 const visibleCustomers=canManage()?state.customers:state.customers.filter(c=>c.assigned_rep===repId);
 const visibleSales=canManage()?state.sales:state.sales.filter(x=>x.rep_id===repId);
 const monthSales=visibleSales.filter(x=>String(x.business_date||'').startsWith(month)).reduce((z,x)=>z+Number(x.amount||0),0);
 const todaySales=visibleSales.filter(x=>String(x.business_date||'')===today);
 const todaySalesValue=todaySales.reduce((z,x)=>z+Number(x.amount||0),0);
 $('mCustomers').textContent=canManage()?visibleCustomers.length:money(todaySalesValue);
 $('mSales').textContent=money(monthSales);
 $('mActive').textContent=visibleCustomers.filter(c=>c.status==='active').length;
 $('mHesitant').textContent=visibleCustomers.filter(c=>c.status==='hesitant').length;
 $('mRejected').textContent=visibleCustomers.filter(c=>c.status==='rejected').length;
 const attention=state.reports.filter(r=>r.action_code==='admin_intervention'&&!state.reports.some(x=>Number(x.customer_id)===Number(r.customer_id)&&x.action_code==='management_response'&&new Date(x.created_at||0)>new Date(r.created_at||0))).slice().sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
 if($('attentionCount'))$('attentionCount').textContent=String(attention.length);
 if($('attentionSub'))$('attentionSub').textContent=lang==='ar'?(attention.length?'هذه طلبات تدخل إدارة مفتوحة فقط.':'لا توجد حالات مفتوحة تحتاج تدخل الإدارة.'):(attention.length?'Only open management-intervention requests are shown.':'No open management-intervention cases.');
 $('attentionList').innerHTML=attention.length?attention.slice(0,8).map(r=>`<button type="button" class="attention-item" data-attention-customer="${r.customer_id}"><span class="attention-main"><b>${esc(r.customer?.name||'-')}</b><span>${esc(r.note)}</span></span><span class="attention-meta">${esc(r.rep?.full_name||'-')}<small>${dateTime(r.created_at)}</small></span><span class="attention-open">${lang==='ar'?'فتح العميل':'Open'}</span></button>`).join(''):`<div class="attention-empty">${lang==='ar'?'لا توجد حالات تحتاج تدخل الإدارة حالياً.':'No cases need management intervention right now.'}</div>`;
 renderDormantDashboard();
 const reps=canManage()?state.profiles.filter(p=>p.role==='rep'):[state.profile];
 const repDailyRows=reps.map(p=>{
   const newToday=state.customers.filter(c=>c.assigned_rep===p.id&&dateKeyRiyadh(c.created_at)===today);
   const salesToday=state.sales.filter(x=>x.rep_id===p.id&&String(x.business_date||'')===today);
   const followupsToday=state.reports.filter(x=>x.rep_id===p.id&&x.action_code==='sales_followup'&&String(x.business_date||'')===today);
   const activeNewToday=newToday.filter(c=>c.status==='active').length;
   const salesValueToday=salesToday.reduce((z,x)=>z+Number(x.amount||0),0);
   return {p,newToday,salesToday,followupsToday,activeNewToday,salesValueToday};
 });
 if(canManage()){
   $('repSummary').innerHTML=repDailyRows.length?`<div class="rep-summary-grid">${repDailyRows.map(x=>`
     <button type="button" class="rep-summary-card" data-rep-customers="${x.p.id}">
       <div class="rep-summary-head">
         <div><span class="rep-summary-label">${lang==='ar'?'المندوب':'Representative'}</span><b>${esc(x.p.full_name)}</b></div>
         <span class="rep-summary-open">${lang==='ar'?'عرض العملاء':'View customers'}</span>
       </div>
       <div class="rep-summary-sales">
         <span>${lang==='ar'?'قيمة سحوبات اليوم':'Today sales value'}</span>
         <strong>${money(x.salesValueToday)}</strong>
       </div>
       <div class="rep-summary-stats">
         <div><span>${lang==='ar'?'الطلبيات':'Orders'}</span><b>${x.salesToday.length}</b></div>
         <div><span>${lang==='ar'?'عملاء جدد':'New customers'}</span><b>${x.newToday.length}</b></div>
         <div><span>${lang==='ar'?'جدد نشطون':'New active'}</span><b>${x.activeNewToday}</b></div>
         <div><span>${lang==='ar'?'المتابعات':'Follow-ups'}</span><b>${x.followupsToday.length}</b></div>
       </div>
     </button>`).join('')}</div>`:`<div class="small">${t('noData')}</div>`;
 }else{
   const x=repDailyRows[0];
   $('repSummary').innerHTML=x?`<div class="rep-summary-grid rep-summary-grid-single">
     <div class="rep-summary-card rep-summary-card-static">
       <div class="rep-summary-sales"><span>${lang==='ar'?'قيمة سحوبات اليوم':'Today sales value'}</span><strong>${money(x.salesValueToday)}</strong></div>
       <div class="rep-summary-stats">
         <div><span>${lang==='ar'?'الطلبيات':'Orders'}</span><b>${x.salesToday.length}</b></div>
         <div><span>${lang==='ar'?'عملاء جدد':'New customers'}</span><b>${x.newToday.length}</b></div>
         <div><span>${lang==='ar'?'جدد نشطون':'New active'}</span><b>${x.activeNewToday}</b></div>
         <div><span>${lang==='ar'?'المتابعات':'Follow-ups'}</span><b>${x.followupsToday.length}</b></div>
       </div>
     </div>
   </div>`:`<div class="small">${t('noData')}</div>`;
 }
}
function renderRepPerformance(){
 const box=$('repPerformance');if(!box||!canManage())return;
 const month=monthRiyadh(),reps=state.profiles.filter(p=>p.role==='rep');
 box.innerHTML='<div class="table-wrap"><table><thead><tr><th>'+t('representative')+'</th><th>'+t('customers')+'</th><th>'+t('newCustomers')+'</th><th>'+t('activeCustomers')+'</th><th>'+t('salesThisMonth')+'</th><th>'+t('followups')+'</th></tr></thead><tbody>'+
 reps.map(p=>{const cs=state.customers.filter(c=>c.assigned_rep===p.id),ss=state.sales.filter(x=>x.rep_id===p.id&&String(x.business_date||'').startsWith(month)),rr=state.reports.filter(x=>x.rep_id===p.id&&x.action_code==='sales_followup'&&String(x.business_date||'').startsWith(month)),nc=cs.filter(c=>String(c.created_at).slice(0,7)===month).length;return `<tr class="clickable-row" data-rep-customers="${p.id}"><td><b>${esc(p.full_name)}</b></td><td>${cs.length}</td><td>${nc}</td><td>${cs.filter(c=>c.status==='active').length}</td><td>${money(ss.reduce((z,x)=>z+Number(x.amount||0),0))}</td><td>${rr.length}</td></tr>`}).join('')+'</tbody></table></div>';
}
function qualifiedActiveNewCustomers(customers,sales){
 const totals=new Map();
 for(const x of sales){const id=Number(x.customer_id);totals.set(id,(totals.get(id)||0)+Number(x.amount||0));}
 return customers.filter(c=>c.status==='active'&&(totals.get(Number(c.id))||0)>=ACTIVE_NEW_GOAL_MIN_SALES);
}
function goalNewCustomers(scope,repId,fromKey,toKey){
 const repIds=new Set(state.profiles.filter(p=>p.role==='rep').map(p=>p.id));
 return state.customers.filter(c=>{
   const d=dateKeyRiyadh(c.created_at);
   const dateOk=(!fromKey||d>=fromKey)&&(!toKey||d<=toKey);
   const creatorOk=scope==='company'?repIds.has(c.created_by):c.created_by===repId;
   return dateOk&&creatorOk;
 });
}
function scopeAchievements(scope,repId=null){
 const month=monthRiyadh(),monthStart=month+'-01',today=todayRiyadh();
 const sales=state.sales.filter(x=>String(x.business_date||'').startsWith(month)&&(scope==='company'||x.rep_id===repId));
 const newCustomers=goalNewCustomers(scope,repId,monthStart,today);
 const allMonthSales=state.sales.filter(x=>String(x.business_date||'').startsWith(month));
 return {
   totalSales:sales.reduce((z,x)=>z+Number(x.amount||0),0),
   newCustomers:newCustomers.length,
   activeNewCustomers:qualifiedActiveNewCustomers(newCustomers,allMonthSales).length
 };
}
function goalMetricView(scope,repId,type,achieved,label,isMoney=true){
 const goal=goalFor(scope,repId,type),target=Number(goal?.monthly_target||0),got=Number(achieved||0),remaining=Math.max(0,target-got),pct=target>0?Math.round(got/target*100):0,bar=Math.min(100,pct);
 const value=v=>isMoney?money(v):fmt(v);
 return `<div class="goal-v2-metric clickable-goal" data-goal-kind="${type}" data-goal-scope="${scope==='company'?'company':repId}">
   <div class="goal-v2-top"><b>${esc(label)}</b><span class="goal-v2-pct">${target>0?pct+'%':(lang==='ar'?'غير محدد':'Not set')}</span></div>
   <div class="goal-v2-values"><div><span>${lang==='ar'?'المحقق':'Achieved'}</span><strong>${value(got)}</strong></div><div><span>${lang==='ar'?'الهدف':'Target'}</span><strong>${target>0?value(target):'-'}</strong></div><div><span>${lang==='ar'?'المتبقي':'Remaining'}</span><strong>${target>0?value(remaining):'-'}</strong></div></div>
   <div class="goal-v2-track"><i style="width:${bar}%"></i></div>
 </div>`;
}
function renderGoalScope(scope,repId,label){
 const ac=scopeAchievements(scope,repId);
 return `<div class="goal-v2-scope ${scope==='company'?'goal-v2-company':''}"><div class="goal-v2-scope-head"><div><h4>${esc(label)}</h4><span>${lang==='ar'?'عملاء جدد: أي عميل يسجله المندوب مهما كانت حالته. النشط الجديد يُحسب بعد سحب 5,000 ر.س+':'New customers: every customer registered by the rep, regardless of status. Active-new counts after SAR 5,000+ in sales'}</span></div></div><div class="goal-v2-grid">
   ${goalMetricView(scope,repId,'total_sales',ac.totalSales,t('totalSalesGoal'),true)}
   ${goalMetricView(scope,repId,'new_customers',ac.newCustomers,lang==='ar'?'عملاء جدد (أي حالة)':'New customers (any status)',false)}
   ${goalMetricView(scope,repId,'active_new_customers',ac.activeNewCustomers,t('activeNewCustomers'),false)}
 </div></div>`;
}
function compactGoalRow(scope,repId,type,got,label,isMoney){
 const target=Number(goalFor(scope,repId,type)?.monthly_target||0),pct=target>0?Math.round(Number(got||0)/target*100):0,show=v=>isMoney?money(v):fmt(v);
 return `<div class="goal-mini-row"><div><span>${esc(label)}</span><b>${show(got)} <small>/ ${target>0?show(target):'-'}</small></b></div><div class="goal-mini-track"><i style="width:${Math.min(100,pct)}%"></i></div><em>${target>0?pct+'%':'-'}</em></div>`;
}
function renderRepGoalCompact(p){
 const ac=scopeAchievements('rep',p.id);
 return `<div class="goal-rep-card"><div class="goal-rep-name">${esc(p.full_name)}</div>
   ${compactGoalRow('rep',p.id,'total_sales',ac.totalSales,t('sales'),true)}
   ${compactGoalRow('rep',p.id,'new_customers',ac.newCustomers,lang==='ar'?'عملاء جدد (أي حالة)':'New customers (any status)',false)}
   ${compactGoalRow('rep',p.id,'active_new_customers',ac.activeNewCustomers,t('activeNewCustomers'),false)}
 </div>`;
}
function renderGoalsDashboard(){
 const box=$('goalsDashboard');if(!box)return;
 if(isAdmin()){
   const reps=state.profiles.filter(x=>x.role==='rep');
   box.innerHTML=renderGoalScope('company',null,lang==='ar'?'هدف الشركة':'Company Goal')+`<div class="goal-reps-head"><h4>${lang==='ar'?'أهداف المناديب':'Representative Goals'}</h4><span>${lang==='ar'?'المحقق / الهدف / نسبة الإنجاز':'Achieved / target / progress'}</span></div><div class="goal-reps-grid">${reps.map(renderRepGoalCompact).join('')}</div>`;
 }else{
   box.innerHTML=renderGoalScope('rep',state.profile.id,state.profile.full_name);
 }
}
function openGoalsEditor(){
 if(!isAdmin())return;
 const scopes=[{type:'company',id:null,label:t('company')},...state.profiles.filter(p=>p.role==='rep').map(p=>({type:'rep',id:p.id,label:p.full_name}))];
 const rows=scopes.map(sc=>`<div class="goal-edit-scope"><h4>${esc(sc.label)}</h4><div class="form-grid">
   <div><label>${t('totalSalesGoal')}</label><input type="number" min="0" step="1" data-goal-input data-scope="${sc.type}" data-rep="${sc.id||''}" data-type="total_sales" value="${Number(goalFor(sc.type,sc.id,'total_sales')?.monthly_target||0)}"></div>
   <div><label>${lang==='ar'?'عملاء جدد (أي حالة)':'New customers (any status)'}</label><input type="number" min="0" step="1" data-goal-input data-scope="${sc.type}" data-rep="${sc.id||''}" data-type="new_customers" value="${Number(goalFor(sc.type,sc.id,'new_customers')?.monthly_target||0)}"></div>
   <div><label>${t('activeNewCustomers')}</label><input type="number" min="0" step="1" data-goal-input data-scope="${sc.type}" data-rep="${sc.id||''}" data-type="active_new_customers" value="${Number(goalFor(sc.type,sc.id,'active_new_customers')?.monthly_target||0)}"></div>
 </div></div>`).join('');
 openModal(t('editGoals'),rows+`<div style="margin-top:14px"><button class="btn" id="saveGoalsBtn">${t('save')}</button></div>`);
}
async function saveGoals(){
 const inputs=[...document.querySelectorAll('[data-goal-input]')];
 for(const el of inputs){
   const val=Number(el.value);if(!(val>=0))return flash(lang==='ar'?'تحقق من قيم الأهداف':'Check goal values',true);
   const {error}=await sb.rpc('set_performance_goal',{p_scope_type:el.dataset.scope,p_rep_id:el.dataset.rep||null,p_goal_type:el.dataset.type,p_monthly_target:val});
   if(error)return flash((lang==='ar'?'تعذر حفظ الهدف: ':'Could not save goal: ')+error.message,true);
 }
 closeModal();flash(lang==='ar'?'تم تحديث الأهداف':'Goals updated');await refreshAll();
}

function refreshCustomerRepFilter(){
 const el=$('customerRepFilter');if(!el)return;const selected=el.value;const reps=state.profiles.filter(p=>p.role==='rep');el.innerHTML=`<option value="">${t('allReps')}</option>`+reps.map(p=>`<option value="${p.id}">${esc(p.full_name)}</option>`).join('');if(reps.some(p=>p.id===selected))el.value=selected;
}
function refreshSaleRepFilter(){
 const el=$('saleRepFilter');if(!el)return;const selected=el.value;const reps=state.profiles.filter(p=>p.role==='rep');el.innerHTML=`<option value="">${t('allReps')}</option>`+reps.map(p=>`<option value="${p.id}">${esc(p.full_name)}</option>`).join('');if(reps.some(p=>p.id===selected))el.value=selected;
}
function renderCustomers(){
 refreshCustomerRepFilter();
 const q=($('customerSearch')?.value||'').trim().toLowerCase(),f=$('customerStatusFilter')?.value||'',repFilter=$('customerRepFilter')?.value||'',period=$('customerPeriodFilter')?.value||'all';
 const qPhone=normalizePhone(q);
 let rows=state.customers.filter(c=>{
  const d=dateKeyRiyadh(c.created_at);
  const periodOk=periodMatchesDate(d,period);
  const text=`${c.name} ${c.area||''} ${c.rep?.full_name||''}`.toLowerCase();
  const searchOk=!q||text.includes(q)||(qPhone&&normalizePhone(c.phone).includes(qPhone));
  return (!f||c.status===f)&&(!repFilter||c.assigned_rep===repFilter)&&periodOk&&searchOk;
 });
 rows=rows.slice().sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
 $('customersBody').innerHTML=rows.length?rows.map(c=>{const ac=activityForCustomer(c.id);const added=c.created_at?dateOnly(dateKeyRiyadh(c.created_at)):'-';return `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.customer_type?t(c.customer_type):t('notSet'))}</td><td>${added}</td><td>${esc(c.area||'-')}</td><td>${esc(c.rep?.full_name||'-')}</td><td>${badgeStatus(c.status)}</td><td>${ac.monthSalesCount}</td><td>${money(ac.monthSalesValue)}</td><td><button class="btn secondary" data-open-customer="${c.id}">${t('view')}</button></td></tr>`}).join(''):`<tr><td colspan="9" class="empty">${t('noData')}</td></tr>`;
}
function renderSales(){
 refreshSaleRepFilter();
 const q=($('saleSearch')?.value||'').trim().toLowerCase(),period=$('salePeriodFilter')?.value||'all',productFilter=$('saleProductFilter')?.value||'',repFilter=$('saleRepFilter')?.value||'';
 const rows=state.sales.filter(x=>{
   const d=String(x.business_date||'');
   const periodOk=periodMatchesDate(d,period);
   return periodOk&&(!productFilter||x.product===productFilter)&&(!repFilter||x.rep_id===repFilter)&&(!q||`${x.customer?.name||''} ${productLabel(x.product)} ${x.product||''} ${x.order_ref||''} ${x.rep?.full_name||''}`.toLowerCase().includes(q));
 }).slice().sort((a,b)=>String(b.business_date||'').localeCompare(String(a.business_date||''))||new Date(b.created_at||0)-new Date(a.created_at||0));
 $('salesBody').innerHTML=rows.length?rows.map(x=>`<tr><td>${dateOnly(x.business_date)}</td><td>${esc(x.customer?.name||'-')}</td><td>${esc(productLabel(x.product))}</td><td>${fmt(x.quantity)}</td><td>${money(x.amount)}</td><td>${esc(x.order_ref||'-')}</td><td>${esc(x.rep?.full_name||'-')}</td><td>${canManage()?`<button class="btn secondary mini" data-edit-sale="${x.id}">${t('edit')}</button>${isAdmin()?` <button class="btn bad mini" data-delete-sale="${x.id}">${t('del')}</button>`:''}`:'-'}</td></tr>`).join(''):`<tr><td colspan="8" class="empty">${t('noData')}</td></tr>`;
 const total=rows.reduce((sum,x)=>sum+Number(x.amount||0),0);
 if($('salesTotalLabel'))$('salesTotalLabel').textContent=lang==='ar'?'مجموع السحبيات المعروضة':'Total displayed sales';
 if($('salesTotalValue'))$('salesTotalValue').textContent=money(total);
}

function renderReports(){
 const f=$('reportActionFilter')?.value||'',period=$('reportPeriodFilter')?.value||'all';
 const inPeriod=r=>periodMatchesDate(r.business_date||dateKeyRiyadh(r.created_at),period);
 const salesRows=state.reports.filter(r=>r.action_code==='sales_followup'&&inPeriod(r));
 const serviceRows=state.reports.filter(r=>r.action_code!=='sales_followup'&&r.action_code!=='inactive_visit'&&(!f||r.action_code===f)&&inPeriod(r));
 if($('salesFollowupsBody'))$('salesFollowupsBody').innerHTML=salesRows.length?salesRows.map(r=>`<tr><td>${dateTime(r.created_at)}</td><td>${esc(r.customer?.name||'-')}</td><td>${esc(r.rep?.full_name||'-')}</td><td>${r.customer?.status?badgeStatus(r.customer.status):'-'}</td><td>${esc(r.note)}</td><td>${isAdmin()?`<button class="btn bad mini" data-delete-report="${r.id}">${t('del')}</button>`:'-'}</td></tr>`).join(''):`<tr><td colspan="6" class="empty">${t('noData')}</td></tr>`;
 if($('reportsBody'))$('reportsBody').innerHTML=serviceRows.length?serviceRows.map(r=>`<tr><td>${dateTime(r.created_at)}</td><td>${esc(r.customer?.name||'-')}</td><td>${esc(r.rep?.full_name||'-')}</td><td>${esc(actionLabel(r.action_code)||'-')}</td><td>${esc(r.note)}</td><td>${canManage()?`<button class="btn secondary mini" data-edit-report="${r.id}">${t('edit')}</button>${isAdmin()?` <button class="btn bad mini" data-delete-report="${r.id}">${t('del')}</button>`:''}`:'-'}</td></tr>`).join(''):`<tr><td colspan="6" class="empty">${t('noData')}</td></tr>`;
}

function reportRange(){return {from:$('analyticsFrom').value,to:$('analyticsTo').value,rep:$('analyticsRep').value,type:$('analyticsType').value};}
function inRange(d,x,y){const v=String(d||'').slice(0,10);return (!x||v>=x)&&(!y||v<=y);}
function reportCard(label,value,note){
 return '<div class="report-kpi"><span>'+esc(label)+'</span><strong>'+value+'</strong>'+(note?'<small>'+esc(note)+'</small>':'')+'</div>';
}
function reportBars(items,moneyMode){
 if(!items.length)return '<div class="empty">'+t('noData')+'</div>';
 const max=Math.max.apply(null,items.map(function(x){return Number(x.value||0)}).concat([0]));
 return '<div class="report-bars">'+items.map(function(x){const v=Number(x.value||0),pct=max>0?Math.max(3,Math.round(v/max*100)):0;return '<div class="report-bar-row"><div class="report-bar-label"><span>'+esc(x.label)+'</span><b>'+(moneyMode?money(v):fmt(v))+'</b></div><div class="report-bar-track"><i style="width:'+pct+'%"></i></div>'+(x.note?'<small>'+esc(x.note)+'</small>':'')+'</div>'}).join('')+'</div>';
}
function reportTable(headers,rows){
 return '<div class="table-wrap report-table"><table><thead><tr>'+headers.map(function(h){return '<th>'+esc(h)+'</th>'}).join('')+'</tr></thead><tbody>'+(rows.length?rows.map(function(r){return '<tr>'+r.map(function(v){return '<td>'+v+'</td>'}).join('')+'</tr>'}).join(''):'<tr><td colspan="'+headers.length+'" class="empty">'+t('noData')+'</td></tr>')+'</tbody></table></div>';
}
function reportSection(title,content){
 return '<section class="report-section"><div class="report-section-head"><h3>'+esc(title)+'</h3></div>'+content+'</section>';
}
function salesSum(rows){return rows.reduce(function(z,x){return z+Number(x.amount||0)},0)}
function productAnalytics(rows){
 return PRODUCT_KEYS.map(function(k){const ss=rows.filter(function(x){return x.product===k});return {label:productLabel(k),value:salesSum(ss),orders:ss.length,customers:new Set(ss.map(function(x){return x.customer_id})).size}}).filter(function(x){return x.orders>0}).sort(function(a,b){return b.value-a.value});
}
function customerAnalytics(rows){
 const map=new Map();
 rows.forEach(function(x){const id=Number(x.customer_id),cur=map.get(id)||{id:id,name:x.customer&&x.customer.name||'-',value:0,orders:0};cur.value+=Number(x.amount||0);cur.orders++;map.set(id,cur)});
 return Array.from(map.values()).sort(function(a,b){return b.value-a.value});
}
function renderManagementReport(title,from,to,repName,kpis,body,headline){
 $('printableReport').innerHTML='<div class="report-letterhead"><div><span class="report-brand">'+(lang==='ar'?'شركة دانة التاج التجارية':'Dana Al-Taj Trading Company')+'</span><h1>'+esc(title)+'</h1></div><div class="report-period"><b>'+dateOnly(from)+' — '+dateOnly(to)+'</b><span>'+(lang==='ar'?'النطاق':'Scope')+': '+esc(repName)+'</span></div></div>'+(headline?'<div class="report-headline">'+headline+'</div>':'')+'<div class="report-kpi-grid">'+kpis.join('')+'</div><div class="report-body-v2">'+body+'</div><div class="report-footer">'+(lang==='ar'?'تاريخ إعداد التقرير':'Report date')+': '+dateOnly(todayRiyadh())+'</div>';
}
function generateAnalytics(){
 const range=reportRange(),from=range.from,to=range.to,rep=range.rep,type=range.type;
 if(!type)return flash(lang==='ar'?'اختر نوع التقرير':'Choose a report type',true);
 if(!from||!to)return flash(lang==='ar'?'حدد تاريخ البداية والنهاية':'Select start and end dates',true);
 if(from>to)return flash(lang==='ar'?'تاريخ البداية يجب أن يكون قبل النهاية':'Start date must be before end date',true);

 const repName=rep?(state.profiles.find(function(p){return p.id===rep})||{}).full_name||'':t('allReps');
 const sales=state.sales.filter(function(x){return inRange(x.business_date,from,to)&&(!rep||x.rep_id===rep)});
 const reports=state.reports.filter(function(x){return inRange(x.business_date||dateKeyRiyadh(x.created_at),from,to)&&(!rep||x.rep_id===rep)});
 const customers=state.customers.filter(function(c){return !rep||c.assigned_rep===rep});
 const newCustomers=customers.filter(function(c){return inRange(dateKeyRiyadh(c.created_at),from,to)});
 const total=salesSum(sales),orders=sales.length,avg=orders?total/orders:0;
 const productRows=productAnalytics(sales),customerRows=customerAnalytics(sales);
 const uniqueBuyers=new Set(sales.map(function(x){return Number(x.customer_id)})).size;
 const repeatBuyers=customerRows.filter(function(x){return x.orders>=2}).length;
 const activeNew=newCustomers.filter(function(c){return c.status==='active'}).length;
 const salesFollowupReports=reports.filter(function(r){return r.action_code==='sales_followup'});
 const serviceReports=reports.filter(function(r){return r.action_code!=='inactive_visit'&&r.action_code!=='sales_followup'});
 const attention=serviceReports.filter(function(r){return r.action_code==='admin_intervention'});
 const complaints=serviceReports.filter(function(r){return r.action_code==='complaint'});
 const repRows=state.profiles.filter(function(p){return p.role==='rep'&&(!rep||p.id===rep)}).map(function(p){
   const ss=sales.filter(function(x){return x.rep_id===p.id}),rr=serviceReports.filter(function(x){return x.rep_id===p.id}),ff=salesFollowupReports.filter(function(x){return x.rep_id===p.id}),cs=state.customers.filter(function(c){return c.assigned_rep===p.id}),nc=cs.filter(function(c){return inRange(dateKeyRiyadh(c.created_at),from,to)});
   return {name:p.full_name,value:salesSum(ss),orders:ss.length,serviceRequests:rr.length,salesFollowups:ff.length,newCustomers:nc.length,managementRequests:rr.filter(function(x){return x.action_code==='admin_intervention'}).length,active:cs.filter(function(c){return c.status==='active'}).length};
 }).sort(function(a,b){return b.value-a.value});

 if(type==='executive'){
   const kpis=[
     reportCard(lang==='ar'?'إجمالي السحوبات':'Total Sales',money(total),lang==='ar'?'خلال الفترة المحددة':'Selected period'),
     reportCard(lang==='ar'?'عدد الطلبيات':'Orders',fmt(orders),(lang==='ar'?'متوسط ':'Average ')+money(avg)),
     reportCard(lang==='ar'?'عملاء سحبوا':'Buying Customers',fmt(uniqueBuyers),(lang==='ar'?'كرر السحب ':'Repeat buyers ')+repeatBuyers),
     reportCard(lang==='ar'?'عملاء جدد':'New Customers',fmt(newCustomers.length),(lang==='ar'?'نشط منهم ':'Active ')+activeNew),
     reportCard(lang==='ar'?'المتابعات البيعية':'Sales Follow-ups',fmt(salesFollowupReports.length)),
     reportCard(lang==='ar'?'طلبات وشكاوى':'Requests & Complaints',fmt(serviceReports.length),(lang==='ar'?'شكاوى ':'Complaints ')+complaints.length),
     reportCard(lang==='ar'?'طلبات تدخل الإدارة':'Management Requests',fmt(attention.length),lang==='ar'?'مسجلة خلال الفترة':'Recorded in period')
   ];
   const insights='<div class="report-insight-strip">'+
     '<div>'+(productRows[0]?(lang==='ar'?'أعلى منتج بالقيمة: ':'Top product: ')+'<b>'+esc(productRows[0].label)+'</b> — '+money(productRows[0].value):(lang==='ar'?'لا توجد سحوبات منتجات.':'No product sales.'))+'</div>'+
     '<div>'+(customerRows[0]?(lang==='ar'?'أعلى عميل سحباً: ':'Top customer: ')+'<b>'+esc(customerRows[0].name)+'</b> — '+money(customerRows[0].value):(lang==='ar'?'لا توجد سحوبات عملاء.':'No customer sales.'))+'</div>'+
     '<div>'+(lang==='ar'?'عملاء كرروا السحب: ':'Repeat buyers: ')+'<b>'+repeatBuyers+'</b></div>'+
     '<div>'+(lang==='ar'?'طلبات تدخل الإدارة: ':'Management requests: ')+'<b>'+attention.length+'</b></div></div>';
   const prod=reportBars(productRows.map(function(x){return {label:x.label,value:x.value,note:x.orders+' '+(lang==='ar'?'طلبية':'orders')}}),true);
   const reps=reportBars(repRows.map(function(x){return {label:x.name,value:x.value,note:x.orders+' '+(lang==='ar'?'طلبية':'orders')+' • '+x.salesFollowups+' '+(lang==='ar'?'متابعة':'follow-ups')}}),true);
   const top=reportTable([t('customer'),lang==='ar'?'السحوبات':'Sales',lang==='ar'?'الطلبيات':'Orders',t('representative')],customerRows.slice(0,10).map(function(x){const c=customers.find(function(z){return Number(z.id)===x.id});return [esc(x.name),money(x.value),fmt(x.orders),esc(c&&c.rep&&c.rep.full_name||'-')]}));
   const att=attention.length?'<div class="report-attention-list">'+attention.slice(0,8).map(function(r){return '<div><b>'+esc(r.customer&&r.customer.name||'-')+'</b><span>'+esc(r.note)+'</span><small>'+esc(r.rep&&r.rep.full_name||'-')+' — '+dateOnly(r.business_date||dateKeyRiyadh(r.created_at))+'</small></div>'}).join('')+'</div>':'<div class="report-good-note">'+(lang==='ar'?'لا توجد حالات تدخل إدارة مسجلة في الفترة.':'No management cases recorded in this period.')+'</div>';
   renderManagementReport(lang==='ar'?'لوحة الإدارة التنفيذية':'Executive Management Report',from,to,repName,kpis,insights+'<div class="report-two-col">'+reportSection(lang==='ar'?'مزيج المنتجات':'Product Mix',prod)+reportSection(lang==='ar'?'حركة المناديب':'Representative Sales',reps)+'</div>'+reportSection(lang==='ar'?'أعلى العملاء سحباً':'Top Customers',top)+reportSection(lang==='ar'?'طلبات تدخل الإدارة خلال الفترة':'Management Requests in Period',att),lang==='ar'?'هذا التقرير يجمع أهم الأرقام التي تحتاجها الإدارة لاتخاذ قرار سريع.':'A management view of the numbers that matter for quick decisions.');
   return;
 }

 if(type==='sales'){
   const dayMap=new Map();sales.forEach(function(x){const d=String(x.business_date||'');dayMap.set(d,(dayMap.get(d)||0)+Number(x.amount||0))});
   const daily=Array.from(dayMap.entries()).sort(function(a,b){return a[0].localeCompare(b[0])}).map(function(x){return {label:dateOnly(x[0]),value:x[1]}});
   const kpis=[reportCard(lang==='ar'?'إجمالي السحوبات':'Total Sales',money(total)),reportCard(lang==='ar'?'عدد الطلبيات':'Orders',fmt(orders)),reportCard(lang==='ar'?'متوسط الطلبية':'Average Order',money(avg)),reportCard(lang==='ar'?'عملاء سحبوا':'Buying Customers',fmt(uniqueBuyers)),reportCard(lang==='ar'?'كرروا السحب':'Repeat Buyers',fmt(repeatBuyers)),reportCard(lang==='ar'?'أعلى منتج':'Top Product',productRows[0]?esc(productRows[0].label):'-')];
   const prodTable=reportTable([t('product'),lang==='ar'?'القيمة':'Value',lang==='ar'?'الطلبيات':'Orders',lang==='ar'?'العملاء':'Customers',lang==='ar'?'متوسط الطلبية':'Average'],productRows.map(function(x){return [esc(x.label),money(x.value),fmt(x.orders),fmt(x.customers),money(x.orders?x.value/x.orders:0)]}));
   const custTable=reportTable([t('customer'),lang==='ar'?'القيمة':'Value',lang==='ar'?'الطلبيات':'Orders'],customerRows.slice(0,12).map(function(x){return [esc(x.name),money(x.value),fmt(x.orders)]}));
   renderManagementReport(lang==='ar'?'تحليل المبيعات والسحوبات':'Sales Intelligence Report',from,to,repName,kpis,'<div class="report-two-col">'+reportSection(lang==='ar'?'المبيعات حسب اليوم':'Sales by Day',reportBars(daily,true))+reportSection(lang==='ar'?'المبيعات حسب المنتج':'Sales by Product',reportBars(productRows,true))+'</div>'+reportSection(lang==='ar'?'تفصيل المنتجات':'Product Detail',prodTable)+reportSection(lang==='ar'?'أعلى العملاء':'Top Customers',custTable),'');
   return;
 }

 if(type==='products'){
   const kpis=[reportCard(lang==='ar'?'إجمالي المبيعات':'Total Sales',money(total)),reportCard(lang==='ar'?'المنتجات المتحركة':'Products Sold',fmt(productRows.length)),reportCard(lang==='ar'?'عدد الطلبيات':'Orders',fmt(orders)),reportCard(lang==='ar'?'عملاء اشتروا':'Customers',fmt(uniqueBuyers)),reportCard(lang==='ar'?'أعلى منتج':'Top Product',productRows[0]?esc(productRows[0].label):'-'),reportCard(lang==='ar'?'متوسط الطلبية':'Average Order',money(avg))];
   const table=reportTable([t('product'),lang==='ar'?'القيمة':'Value',lang==='ar'?'الطلبيات':'Orders',lang==='ar'?'العملاء':'Customers',lang==='ar'?'الحصة':'Share'],productRows.map(function(x){return [esc(x.label),money(x.value),fmt(x.orders),fmt(x.customers),total?Math.round(x.value/total*100)+'%':'0%']}));
   renderManagementReport(lang==='ar'?'تقرير أداء المنتجات':'Product Performance Report',from,to,repName,kpis,reportSection(lang==='ar'?'حصة المنتجات':'Product Share',reportBars(productRows.map(function(x){return {label:x.label,value:x.value,note:total?Math.round(x.value/total*100)+'%':'0%'}}),true))+reportSection(lang==='ar'?'التفصيل':'Detail',table),'');
   return;
 }

 if(type==='reps'){
   const kpis=[reportCard(lang==='ar'?'إجمالي السحوبات':'Total Sales',money(total)),reportCard(lang==='ar'?'عدد المندوبين':'Representatives',fmt(repRows.length)),reportCard(lang==='ar'?'الطلبيات':'Orders',fmt(orders)),reportCard(lang==='ar'?'المتابعات البيعية':'Sales Follow-ups',fmt(salesFollowupReports.length)),reportCard(lang==='ar'?'عملاء جدد':'New Customers',fmt(newCustomers.length)),reportCard(lang==='ar'?'متوسط الطلبية':'Average Order',money(avg))];
   const table=reportTable([t('representative'),lang==='ar'?'السحوبات':'Sales',lang==='ar'?'الطلبيات':'Orders',t('newCustomers'),lang==='ar'?'متابعات':'Follow-ups',lang==='ar'?'طلبات إدارة':'Management Requests',t('activeCustomers')],repRows.map(function(x){return [esc(x.name),money(x.value),fmt(x.orders),fmt(x.newCustomers),fmt(x.salesFollowups),fmt(x.managementRequests),fmt(x.active)]}));
   renderManagementReport(lang==='ar'?'تقرير أداء المناديب':'Representative Performance Report',from,to,repName,kpis,reportSection(lang==='ar'?'المبيعات حسب المندوب':'Sales by Representative',reportBars(repRows.map(function(x){return {label:x.name,value:x.value,note:x.orders+' '+(lang==='ar'?'طلبية':'orders')+' • '+x.followups+' '+(lang==='ar'?'متابعة':'follow-ups')}}),true))+reportSection(lang==='ar'?'التفاصيل الرقمية':'Detailed Metrics',table),'');
   return;
 }

 if(type==='customers'){
   const statusRows=['active','agreed_pending','hesitant','rejected'].map(function(k){return {label:statusLabel(k),value:customers.filter(function(c){return c.status===k}).length}}).filter(function(x){return x.value>0});
   const conversion=newCustomers.length?Math.round(activeNew/newCustomers.length*100):0;
   const kpis=[reportCard(lang==='ar'?'عملاء جدد':'New Customers',fmt(newCustomers.length)),reportCard(lang==='ar'?'الجدد النشطون':'New Active',fmt(activeNew),conversion+'%'),reportCard(lang==='ar'?'عملاء سحبوا':'Buying Customers',fmt(uniqueBuyers)),reportCard(lang==='ar'?'كرروا السحب':'Repeat Buyers',fmt(repeatBuyers)),reportCard(lang==='ar'?'إجمالي العملاء':'Customers in Scope',fmt(customers.length)),reportCard(lang==='ar'?'قيمة سحوباتهم':'Customer Sales',money(total))];
   const table=reportTable([t('customer'),t('area'),t('status'),t('representative'),lang==='ar'?'سحوبات الفترة':'Period Sales'],newCustomers.map(function(c){const x=customerRows.find(function(r){return r.id===Number(c.id)});return [esc(c.name),esc(c.area||'-'),esc(statusLabel(c.status)),esc(c.rep&&c.rep.full_name||'-'),x?money(x.value):money(0)]}));
   renderManagementReport(lang==='ar'?'تقرير حركة وتحويل العملاء':'Customer Movement & Conversion',from,to,repName,kpis,'<div class="report-two-col">'+reportSection(lang==='ar'?'توزيع الحالات الحالية':'Current Status Mix',reportBars(statusRows,false))+reportSection(lang==='ar'?'أعلى العملاء سحباً':'Top Buying Customers',reportBars(customerRows.slice(0,8),true))+'</div>'+reportSection(lang==='ar'?'العملاء المضافون خلال الفترة':'Customers Added in Period',table),'');
   return;
 }

 if(type==='followups'){
   const actionKeys=Array.from(new Set(serviceReports.map(function(x){return x.action_code}).filter(Boolean)));
   const actionRows=actionKeys.map(function(k){return {label:actionLabel(k),value:serviceReports.filter(function(x){return x.action_code===k}).length}}).sort(function(a,b){return b.value-a.value});
   const followedCustomers=new Set(salesFollowupReports.map(function(x){return Number(x.customer_id)})).size;
   const serviceCustomers=new Set(serviceReports.map(function(x){return Number(x.customer_id)})).size;
   const complaintsCount=serviceReports.filter(function(x){return x.action_code==='complaint'}).length;
   const samples=serviceReports.filter(function(x){return x.action_code==='sample_request'}).length;
   const managementCases=serviceReports.filter(function(x){return x.action_code==='admin_intervention'}).length;
   const managementResponses=serviceReports.filter(function(x){return x.action_code==='management_response'}).length;
   const kpis=[
     reportCard(lang==='ar'?'المتابعات البيعية':'Sales Follow-ups',fmt(salesFollowupReports.length)),
     reportCard(lang==='ar'?'عملاء تمت متابعتهم':'Customers Followed',fmt(followedCustomers)),
     reportCard(lang==='ar'?'الشكاوى والطلبات':'Complaints & Requests',fmt(serviceReports.length)),
     reportCard(lang==='ar'?'عملاء لديهم شكوى/طلب':'Customers with Requests',fmt(serviceCustomers)),
     reportCard(lang==='ar'?'طلبات تدخل الإدارة':'Management Requests',fmt(managementCases)),
     reportCard(lang==='ar'?'ردود الإدارة':'Management Responses',fmt(managementResponses))
   ];
   const latestFollowups=salesFollowupReports.slice().sort(function(a,b){return new Date(b.created_at)-new Date(a.created_at)}).slice(0,20).map(function(x){return [dateOnly(x.business_date||dateKeyRiyadh(x.created_at)),esc(x.customer&&x.customer.name||'-'),esc(x.rep&&x.rep.full_name||'-'),esc(x.note)]});
   const latestService=serviceReports.slice().sort(function(a,b){return new Date(b.created_at)-new Date(a.created_at)}).slice(0,20).map(function(x){return [dateOnly(x.business_date||dateKeyRiyadh(x.created_at)),esc(x.customer&&x.customer.name||'-'),esc(x.rep&&x.rep.full_name||'-'),esc(actionLabel(x.action_code)||'-'),esc(x.note)]});
   const body=
     reportSection(lang==='ar'?'أحدث المتابعات البيعية':'Latest Sales Follow-ups',reportTable([t('date'),t('customer'),t('representative'),lang==='ar'?'النتيجة':'Result'],latestFollowups))
     +reportSection(lang==='ar'?'أنواع الشكاوى والطلبات':'Complaint & Request Types',reportBars(actionRows,false))
     +reportSection(lang==='ar'?'أحدث الشكاوى والطلبات':'Latest Complaints & Requests',reportTable([t('date'),t('customer'),t('representative'),t('action'),lang==='ar'?'التفاصيل':'Details'],latestService));
   renderManagementReport(lang==='ar'?'تقرير متابعات وشكاوى العملاء':'Customer Follow-ups & Complaints Report',from,to,repName,kpis,body,'');
   return;
 }
 if(type==='goals'){
   const scope=rep?'rep':'company',repId=rep||null;
   const goalNew=goalNewCustomers(scope,repId,from,to);
   const goalSalesAll=state.sales.filter(function(x){return inRange(x.business_date,from,to)});
   const goalActiveNew=qualifiedActiveNewCustomers(goalNew,goalSalesAll).length;
   const data=[
    {key:'total_sales',label:t('totalSalesGoal'),got:total,m:true},
    {key:'new_customers',label:lang==='ar'?'عملاء جدد (أي حالة)':'New customers (any status)',got:goalNew.length,m:false},
    {key:'active_new_customers',label:t('activeNewCustomers'),got:goalActiveNew,m:false}
   ].map(function(x){const target=Number(goalFor(scope,repId,x.key)&&goalFor(scope,repId,x.key).monthly_target||0),pct=target?Math.round(x.got/target*100):0;return {label:x.label,got:x.got,target:target,pct:pct,m:x.m}});
   const kpis=data.map(function(x){return reportCard(x.label,x.m?money(x.got):fmt(x.got),x.target?x.pct+'% '+(lang==='ar'?'من الهدف':'of target'):(lang==='ar'?'الهدف غير محدد':'Target not set'))});
   const bars=data.map(function(x){return {label:x.label,value:x.pct,note:(lang==='ar'?'المحقق ':'Achieved ')+(x.m?money(x.got):fmt(x.got))+' / '+(x.target?(x.m?money(x.target):fmt(x.target)):'-')}});
   renderManagementReport(lang==='ar'?'تقرير أداء الأهداف':'Goal Performance Report',from,to,repName,kpis,reportSection(lang==='ar'?'نسبة إنجاز الأهداف':'Goal Progress',reportBars(bars,false)),lang==='ar'?'الأهداف شهرية، والإنجاز المعروض محسوب من الفترة المختارة.':'Targets are monthly; displayed achievement uses the selected period.');
 }
}
function setupAnalytics(){const r=$('analyticsRep');if(r)r.innerHTML=`<option value="">${t('allReps')}</option>`+state.profiles.filter(p=>p.role==='rep').map(p=>`<option value="${p.id}">${esc(p.full_name)}</option>`).join('');const to=todayRiyadh(),from=to.slice(0,8)+'01';if($('analyticsFrom')&&!$('analyticsFrom').value)$('analyticsFrom').value=from;if($('analyticsTo')&&!$('analyticsTo').value)$('analyticsTo').value=to;}



async function openCustomer(id){
 const c=state.customers.find(x=>Number(x.id)===Number(id));if(!c)return;
 const ac=activityForCustomer(id);
 const locRes=await sb.from('customer_locations').select('lat,lng').eq('customer_id',id).maybeSingle();
 const loc=locRes.data||null;
 const hs=await sb.from('customer_status_history').select('id,old_status,new_status,reason,method,created_at,actor:profiles!customer_status_history_changed_by_fkey(full_name)').eq('customer_id',id).order('created_at',{ascending:false});
 const sales=state.sales.filter(x=>Number(x.customer_id)===Number(id)).sort((x,y)=>new Date(y.created_at)-new Date(x.created_at));
 const reps=state.reports.filter(r=>Number(r.customer_id)===Number(id));
 const managementButtons=canManage()?`<button class="btn" data-add-sale="${c.id}">${t('recordSale')}</button><button class="btn secondary" data-add-report="${c.id}">${t('addFollowup')}</button><button class="btn secondary" data-edit-customer="${c.id}">${t('edit')}</button><button class="btn secondary" data-edit-location="${c.id}">${lang==='ar'?'تعديل الموقع':'Edit Location'}</button>`:'';
 const fullAdminButtons=isAdmin()?`<button class="btn secondary" data-change-status="${c.id}">${lang==='ar'?'تعديل الحالة - إدارة':'Admin Status Edit'}</button><button class="btn bad" data-delete-customer="${c.id}">${t('del')}</button>`:'';
 openModal(c.name,`
 <div class="detail-grid"><div><b>${t('customerType')}</b>${esc(c.customer_type?t(c.customer_type):t('notSet'))}</div><div><b>${t('area')}</b>${esc(c.area||'-')}</div><div><b>${t('representative')}</b>${esc(c.rep?.full_name||'-')}</div><div><b>${t('status')}</b>${badgeStatus(c.status)}</div><div><b>${t('phone')}</b>${esc(c.phone||'-')}</div><div><b>${lang==='ar'?'موقع العميل':'Customer Location'}</b>${loc?`<a class="btn secondary mini" href="${googleMapsDirectionsUrl(loc.lat,loc.lng)}" target="_blank" rel="noopener noreferrer">${lang==='ar'?'فتح في Google Maps':'Open in Google Maps'}</a>`:`<span class="small">${lang==='ar'?'غير متوفر':'Not available'}</span>`}</div></div>
 <div class="account-summary"><div><b>${t('salesCountMonth')}</b><strong>${ac.monthSalesCount}</strong></div><div><b>${t('salesValueMonth')}</b><strong>${money(ac.monthSalesValue)}</strong></div><div><b>${lang==='ar'?'آخر سحب':'Last Sale'}</b><strong>${ac.lastSale?dateOnly(ac.lastSale.business_date):'-'}</strong></div></div>
 ${!canManage()?`<div class="notice" style="margin-top:10px">${lang==='ar'?'هذه الصفحة لبيانات العميل فقط. الطلبية من صفحة السحوبات، والشكوى أو الطلب من صفحة طلبات وشكاوى العملاء.':'This page is customer data only. Record orders from Sales and service requests from Customer Requests & Complaints.'}</div>`:''}<div class="toolbar">${managementButtons}${fullAdminButtons}</div>
 <h4>${t('sales')}</h4><div class="table-wrap"><table><thead><tr><th>${t('date')}</th><th>${t('product')}</th><th>${t('quantity')}</th><th>${t('value')}</th><th>${t('reference')}</th><th></th></tr></thead><tbody>${sales.length?sales.map(x=>`<tr><td>${dateOnly(x.business_date)}</td><td>${esc(productLabel(x.product))}</td><td>${fmt(x.quantity)}</td><td>${money(x.amount)}</td><td>${esc(x.order_ref||'-')}</td><td>${canManage()?`<button class="btn secondary mini" data-edit-sale="${x.id}">${t('edit')}</button>${isAdmin()?` <button class="btn bad mini" data-delete-sale="${x.id}">${t('del')}</button>`:''}`:'-'}</td></tr>`).join(''):`<tr><td colspan="6" class="empty">${t('noData')}</td></tr>`}</tbody></table></div>
 <h4>${lang==='ar'?'تاريخ حالة العميل':'Customer Status History'}</h4><div class="timeline">${(hs.data||[]).length?(hs.data||[]).map(h=>`<div class="event"><div class="status-flow">${h.old_status?badgeStatus(h.old_status):'<span class="badge b-gray">'+(lang==='ar'?'بداية':'Initial')+'</span>'}<span class="status-arrow">→</span>${badgeStatus(h.new_status)}</div><div>${esc(h.reason||'')}</div><div class="small">${dateTime(h.created_at)} — ${esc(h.actor?.full_name||'-')}</div></div>`).join(''):`<div class="small">${t('noData')}</div>`}</div>
 <h4>${lang==='ar'?'سجل المتابعات والشكاوى والطلبات':'Follow-ups, complaints & requests history'}</h4><div class="timeline">${reps.length?reps.map(r=>`<div class="event"><b>${dateTime(r.created_at)} — ${esc(r.rep?.full_name||'-')} — ${esc(actionLabel(r.action_code))}</b>${r.new_status?`<div class="status-flow">${badgeStatus(r.old_status)}<span class="status-arrow">→</span>${badgeStatus(r.new_status)}</div>`:''}<div>${esc(r.note)}</div>${canManage()?`<div style="margin-top:7px"><button class="btn secondary mini" data-edit-report="${r.id}">${t('edit')}</button>${isAdmin()?` <button class="btn bad mini" data-delete-report="${r.id}">${t('del')}</button>`:''}</div>`:''}</div>`).join(''):`<div class="small">${t('noData')}</div>`}</div>`);
}

function openModal(title,html){$('modalTitle').textContent=title;$('modalContent').innerHTML=html;$('modal').classList.add('open');}
function closeModal(){resetAllVoiceDrafts();if(state.pickerMap){try{state.pickerMap.remove()}catch(_){}state.pickerMap=null;state.pickerMarker=null;}$('modal').classList.remove('open');}

const VOICE_BUCKET='dana-voice-reports';
const VOICE_MAX_SECONDS=120;
const voiceDrafts=new Map();

function voiceTime(seconds){
 const s=Math.max(0,Math.min(VOICE_MAX_SECONDS,Math.round(Number(seconds)||0)));
 return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
}
function voiceMimeType(){
 const candidates=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus','audio/ogg'];
 if(!window.MediaRecorder)return '';
 return candidates.find(x=>MediaRecorder.isTypeSupported?.(x))||'';
}
function voiceExt(mime){
 const m=String(mime||'').toLowerCase();
 if(m.includes('mp4'))return 'm4a';
 if(m.includes('ogg'))return 'ogg';
 if(m.includes('mpeg'))return 'mp3';
 return 'webm';
}
function voiceRecorderHtml(id,label){
 return `<div class="voice-recorder" data-voice-widget="${esc(id)}">
   <div class="voice-recorder-head"><b>${esc(label)}</b><span>${lang==='ar'?'إلزامي • بحد أقصى دقيقتين':'Required • up to 2 minutes'}</span></div>
   <div class="voice-record-row">
     <button type="button" class="voice-record-btn" data-voice-toggle="${esc(id)}"><span class="voice-mic">🎤</span><span data-voice-button-text="${esc(id)}">${lang==='ar'?'تسجيل صوتي':'Record voice'}</span></button>
     <div class="voice-record-status"><span class="voice-pulse" data-voice-pulse="${esc(id)}"></span><b data-voice-timer="${esc(id)}">00:00</b><small data-voice-status="${esc(id)}">${lang==='ar'?'اضغط المايك وابدأ التقرير':'Tap the mic to start the report'}</small></div>
     <button type="button" class="btn secondary mini hidden" data-voice-reset="${esc(id)}">${lang==='ar'?'حذف وإعادة':'Delete & re-record'}</button>
   </div>
   <audio class="voice-local-preview hidden" data-voice-preview="${esc(id)}" controls preload="metadata"></audio>
 </div>`;
}
function voiceDraft(id){return voiceDrafts.get(id)||null;}
function updateVoiceUi(id,mode,seconds=0){
 const widget=document.querySelector('[data-voice-widget="'+id+'"]');if(!widget)return;
 const btn=widget.querySelector('[data-voice-toggle="'+id+'"]');
 const txt=widget.querySelector('[data-voice-button-text="'+id+'"]');
 const timer=widget.querySelector('[data-voice-timer="'+id+'"]');
 const status=widget.querySelector('[data-voice-status="'+id+'"]');
 const pulse=widget.querySelector('[data-voice-pulse="'+id+'"]');
 const reset=widget.querySelector('[data-voice-reset="'+id+'"]');
 const preview=widget.querySelector('[data-voice-preview="'+id+'"]');
 if(timer)timer.textContent=voiceTime(seconds);
 widget.classList.toggle('recording',mode==='recording');
 if(pulse)pulse.classList.toggle('active',mode==='recording');
 if(mode==='recording'){
   if(txt)txt.textContent=lang==='ar'?'إيقاف التسجيل':'Stop recording';
   if(status)status.textContent=lang==='ar'?'جاري التسجيل...':'Recording...';
   if(reset)reset.classList.remove('hidden');
   if(preview)preview.classList.add('hidden');
 }else if(mode==='ready'){
   if(txt)txt.textContent=lang==='ar'?'تسجيل جديد':'Record again';
   if(status)status.textContent=lang==='ar'?'تم التسجيل — اسمعه قبل الحفظ':'Recorded — listen before saving';
   if(reset)reset.classList.remove('hidden');
   if(preview)preview.classList.remove('hidden');
 }else{
   if(txt)txt.textContent=lang==='ar'?'تسجيل صوتي':'Record voice';
   if(status)status.textContent=lang==='ar'?'اضغط المايك وابدأ التقرير':'Tap the mic to start the report';
   if(reset)reset.classList.add('hidden');
   if(preview){preview.classList.add('hidden');preview.removeAttribute('src');}
 }
 if(btn)btn.setAttribute('aria-pressed',mode==='recording'?'true':'false');
}
function stopVoiceTracks(d){
 try{d?.stream?.getTracks?.().forEach(t=>t.stop());}catch(_){}
 if(d?.interval)clearInterval(d.interval);
}
function resetVoiceDraft(id){
 const d=voiceDrafts.get(id);
 if(d){
   d.discard=true;
   try{if(d.recorder&&d.recorder.state!=='inactive')d.recorder.stop();}catch(_){}
   stopVoiceTracks(d);
   if(d.localUrl)try{URL.revokeObjectURL(d.localUrl);}catch(_){}
 }
 voiceDrafts.delete(id);
 updateVoiceUi(id,'idle',0);
}
function resetAllVoiceDrafts(){
 for(const id of [...voiceDrafts.keys()])resetVoiceDraft(id);
}
async function toggleVoiceRecording(id){
 const current=voiceDrafts.get(id);
 if(current?.recorder&&current.recorder.state==='recording'){
   current.recorder.stop();
   return;
 }
 if(current?.blob)resetVoiceDraft(id);
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
   return flash(lang==='ar'?'التسجيل الصوتي غير مدعوم في هذا المتصفح. افتح الموقع من متصفح حديث على الجوال.':'Voice recording is not supported in this browser. Open the site in a modern mobile browser.',true);
 }
 try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   const mime=voiceMimeType();
   const recorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
   const d={recorder,stream,chunks:[],startedAt:Date.now(),interval:null,blob:null,duration:0,mime:recorder.mimeType||mime||'audio/webm',localUrl:null,discard:false,uploadedPath:null};
   voiceDrafts.set(id,d);
   recorder.ondataavailable=e=>{if(e.data&&e.data.size)d.chunks.push(e.data);};
   recorder.onerror=()=>{stopVoiceTracks(d);voiceDrafts.delete(id);updateVoiceUi(id,'idle',0);flash(lang==='ar'?'تعذر إكمال التسجيل الصوتي. حاول مرة أخرى.':'Could not complete the voice recording. Try again.',true);};
   recorder.onstop=()=>{
     stopVoiceTracks(d);
     if(d.discard)return;
     d.duration=Math.max(1,Math.min(VOICE_MAX_SECONDS,Math.round((Date.now()-d.startedAt)/1000)));
     d.blob=new Blob(d.chunks,{type:d.mime});
     const preview=document.querySelector('[data-voice-preview="'+id+'"]');
     if(d.localUrl)try{URL.revokeObjectURL(d.localUrl);}catch(_){}
     d.localUrl=URL.createObjectURL(d.blob);
     if(preview){preview.src=d.localUrl;preview.load();}
     updateVoiceUi(id,'ready',d.duration);
   };
   recorder.start(250);
   updateVoiceUi(id,'recording',0);
   d.interval=setInterval(()=>{
     const sec=Math.floor((Date.now()-d.startedAt)/1000);
     updateVoiceUi(id,'recording',sec);
     if(sec>=VOICE_MAX_SECONDS&&recorder.state==='recording')recorder.stop();
   },250);
 }catch(err){
   const denied=err&&['NotAllowedError','PermissionDeniedError'].includes(err.name);
   flash(denied?(lang==='ar'?'فعّل إذن الميكروفون للموقع ثم حاول مرة أخرى.':'Allow microphone access for this site, then try again.'):(lang==='ar'?'تعذر تشغيل الميكروفون. حاول مرة أخرى.':'Could not start the microphone. Try again.'),true);
 }
}
async function uploadVoiceDraft(id,purpose,customerId){
 const d=voiceDrafts.get(id);
 if(!d?.blob||!d.duration)throw new Error(lang==='ar'?'سجّل التقرير الصوتي أولاً.':'Record the voice report first.');
 if(d.duration>VOICE_MAX_SECONDS)throw new Error(lang==='ar'?'مدة التسجيل تتجاوز دقيقتين.':'Recording exceeds two minutes.');
 if(d.uploadedPath)return {path:d.uploadedPath,duration:d.duration};
 const uid=state.session?.user?.id||state.profile?.id;
 if(!uid)throw new Error(lang==='ar'?'انتهت الجلسة. سجل الدخول من جديد.':'Session expired. Sign in again.');
 const token=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2));
 const path='voice/'+uid+'/'+String(purpose||'report').replace(/[^a-z0-9_-]/gi,'-')+'-'+Number(customerId||0)+'-'+token+'.'+voiceExt(d.mime);
 const {error}=await sb.storage.from(VOICE_BUCKET).upload(path,d.blob,{contentType:d.mime||'audio/webm',cacheControl:'3600',upsert:false});
 if(error)throw new Error((lang==='ar'?'تعذر رفع التسجيل الصوتي: ':'Could not upload voice recording: ')+error.message);
 d.uploadedPath=path;
 return {path,duration:d.duration};
}
function savedVoiceHtml(path,duration){
 if(!path)return '';
 return `<span class="saved-voice"><button type="button" class="voice-play-btn" data-play-voice="${esc(path)}"><span>▶</span> ${lang==='ar'?'تشغيل التقرير الصوتي':'Play voice report'} <b>${voiceTime(duration||0)}</b></button><audio class="saved-voice-audio hidden" controls preload="none"></audio></span>`;
}
async function playSavedVoice(button){
 const wrap=button.closest('.saved-voice');if(!wrap)return;
 const audio=wrap.querySelector('audio');if(!audio)return;
 if(audio.src){
   if(audio.paused)audio.play();else audio.pause();
   return;
 }
 button.disabled=true;
 const {data,error}=await sb.storage.from(VOICE_BUCKET).createSignedUrl(button.dataset.playVoice,900);
 button.disabled=false;
 if(error||!data?.signedUrl)return flash(lang==='ar'?'تعذر فتح التسجيل الصوتي.':'Could not open the voice recording.',true);
 audio.src=data.signedUrl;audio.classList.remove('hidden');button.classList.add('hidden');
 try{await audio.play();}catch(_){}
}
function customerOptions(selected=null){return state.customers.map(c=>`<option value="${c.id}" ${Number(selected)===Number(c.id)?'selected':''}>${esc(c.name)}</option>`).join('');}
function customerPickerHtml(prefix,selected=null,activeOnly=false){
 const c=state.customers.find(x=>Number(x.id)===Number(selected)&&(!activeOnly||x.status==='active'));
 return `<div class="customer-combo"><input id="${prefix}Customer" autocomplete="off" value="${c?esc(c.name):''}" placeholder="${lang==='ar'?(activeOnly?'اكتب اسم العميل النشط...':'اكتب اسم العميل...'):(activeOnly?'Type active customer name...':'Type customer name...')}"><input id="${prefix}CustomerId" type="hidden" value="${c?.id||''}"><div id="${prefix}CustomerResults" class="customer-combo-results hidden"></div></div>`;
}
function bindCustomerPicker(prefix,onSelect=null,activeOnly=false){
 const input=$(prefix+'Customer'),hidden=$(prefix+'CustomerId'),results=$(prefix+'CustomerResults');if(!input||!hidden||!results)return;
 const render=()=>{
   const q=input.value.trim().toLowerCase();
   const matches=state.customers.filter(c=>(!activeOnly||c.status==='active')&&(!q||`${c.name} ${c.area||''} ${c.phone||''}`.toLowerCase().includes(q))).slice(0,12);
   results.innerHTML=matches.length?matches.map(c=>`<button type="button" class="customer-combo-option" data-customer-pick="${c.id}"><b>${esc(c.name)}</b>${c.area?`<span>${esc(c.area)}</span>`:''}</button>`).join(''):`<div class="customer-combo-empty">${lang==='ar'?(activeOnly?'لا يوجد عميل نشط مطابق':'لا يوجد عميل مطابق'):(activeOnly?'No matching active customer':'No matching customer')}</div>`;
   results.classList.remove('hidden');
 };
 input.addEventListener('focus',render);
 input.addEventListener('input',()=>{hidden.value='';render();if(onSelect)onSelect();});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=results.querySelector('[data-customer-pick]');if(first){e.preventDefault();first.click();}}});
 results.addEventListener('mousedown',e=>e.preventDefault());
 results.addEventListener('click',e=>{
   const btn=e.target.closest('[data-customer-pick]');if(!btn)return;
   const c=state.customers.find(x=>Number(x.id)===Number(btn.dataset.customerPick));if(!c||activeOnly&&c.status!=='active')return;
   hidden.value=String(c.id);input.value=c.name;results.classList.add('hidden');if(onSelect)onSelect();
 });
 input.addEventListener('blur',()=>setTimeout(()=>results.classList.add('hidden'),120));
}
function repOptions(selected=null){return state.profiles.filter(p=>p.role==='rep').map(p=>`<option value="${p.id}" ${selected===p.id?'selected':''}>${esc(p.full_name)}</option>`).join('');}
function renderRepPasswordAdmin(){
 const card=$('repPasswordAdminCard'),sel=$('repPasswordAdminSelect');if(!card||!sel)return;
 card.classList.toggle('hidden',!isAdmin());
 if(!isAdmin())return;
 const selected=sel.value;
 const reps=state.profiles.filter(p=>p.role==='rep');
 sel.innerHTML=`<option value="">${lang==='ar'?'اختر المندوب...':'Choose representative...'}</option>`+reps.map(p=>`<option value="${p.id}">${esc(p.full_name)} (${esc(p.username)})</option>`).join('');
 if(reps.some(p=>p.id===selected))sel.value=selected;
}
async function resetRepresentativePassword(){
 if(!isAdmin())return;
 const target=$('repPasswordAdminSelect')?.value;
 const rep=state.profiles.find(p=>p.id===target&&p.role==='rep');
 if(!rep)return flash(lang==='ar'?'اختر المندوب.':'Select a representative.',true);
 if(!confirm(lang==='ar'?`إعادة تعيين كلمة مرور ${rep.full_name}؟`:`Reset password for ${rep.full_name}?`))return;
 const btn=$('repPasswordAdminBtn');if(btn){btn.disabled=true;btn.textContent=lang==='ar'?'جاري إنشاء كلمة مرور...':'Creating password...';}
 try{
   const {data,error}=await sb.functions.invoke('admin-reset-rep-password',{body:{target_user_id:target}});
   if(error)throw error;
   if(!data?.ok||!data?.temporary_password)throw new Error(data?.error||'reset failed');
   openModal(lang==='ar'?'كلمة المرور المؤقتة':'Temporary Password',`
     <div class="security-warn">${lang==='ar'?'انسخ كلمة المرور وأرسلها للمندوب. سيطلب منه النظام تغييرها بعد أول دخول.':'Copy this password and send it to the representative. The system will require a change after sign-in.'}</div>
     <div class="form-grid" style="margin-top:12px">
       <div><label>${lang==='ar'?'المندوب':'Representative'}</label><input value="${esc(data.full_name||rep.full_name)}" readonly></div>
       <div><label>${lang==='ar'?'اسم المستخدم':'Username'}</label><input value="${esc(data.username||rep.username)}" readonly></div>
       <div class="full"><label>${lang==='ar'?'كلمة المرور المؤقتة':'Temporary password'}</label><input id="temporaryRepPassword" value="${esc(data.temporary_password)}" readonly></div>
       <div class="full"><button class="btn" id="copyTemporaryRepPasswordBtn" type="button">${lang==='ar'?'نسخ كلمة المرور':'Copy password'}</button></div>
     </div>`);
   flash(lang==='ar'?'تم إنشاء كلمة مرور مؤقتة.':'Temporary password created.');
 }catch(err){
   const msg=String(err?.message||err||'');
   flash(msg.includes('mfa')?(lang==='ar'?'يجب إكمال تحقق الإدارة بخطوتين أولاً.':'Complete admin two-factor authentication first.'):(lang==='ar'?'تعذر إعادة تعيين كلمة المرور.':'Could not reset password.'),true);
 }finally{
   if(btn){btn.disabled=false;btn.textContent=lang==='ar'?'إعادة تعيين كلمة المرور':'Reset Password';}
 }
}

function productOptions(selected=null){return PRODUCT_KEYS.map(k=>`<option value="${k}" ${selected===k?'selected':''}>${esc(productLabel(k))}</option>`).join('');}

function openCustomerForm(){
 openModal(lang==='ar'?'إضافة عميل جديد':'Add New Customer',`<div class="form-grid"><div><label>${t('customer')}</label><input id="fName" autocomplete="off"></div><div><label>${t('customerType')}</label><select id="fCustomerType"><option value="">${lang==='ar'?'اختر نوع العميل...':'Choose customer type...'}</option><option value="shop">${t('shop')}</option><option value="factory">${t('factory')}</option><option value="project">${t('project')}</option></select></div><div><label>${t('area')}</label><input id="fArea" autocomplete="off"></div><div><label>${t('phone')}</label><input id="fPhone" inputmode="tel" autocomplete="off"></div><div><label>${lang==='ar'?'الحالة الأولية':'Initial Status'}</label><select id="fStatus"><option value="">${lang==='ar'?'اختر الحالة...':'Choose status...'}</option>${STATUS_KEYS.map(k=>`<option value="${k}">${t(k)}</option>`).join('')}</select></div>${canManage()?`<div><label>${t('representative')}</label><select id="fRep"><option value="">${lang==='ar'?'اختر المندوب...':'Choose representative...'}</option>${repOptions()}</select></div>`:''}<div class="full" id="fInitialReasonWrap"><label id="fInitialReasonLabel">${lang==='ar'?'سبب تردد العميل':'Reason for hesitation'}</label><textarea id="fInitialReason" rows="3" placeholder="${lang==='ar'?'اكتب السبب بوضوح...':'Enter the reason clearly...'}"></textarea></div><div class="full hidden" id="fInitialSaleWrap"><div class="notice" style="margin-bottom:10px"><b>${lang==='ar'?'العميل النشط يحتاج طلبية':'Active customer requires an order'}</b><br>${lang==='ar'?'لن يتم حفظ العميل كنشط إلا بعد إدخال بيانات الطلبية الأولى وتاريخها.':'The customer cannot be saved as Active without the first order and its date.'}</div><div class="form-grid"><div class="full sale-date-card"><label>${lang==='ar'?'تاريخ الطلبية الأولى':'First order date'} <span class="required-star">*</span></label><input id="fSaleDate" class="sale-date-input" type="date" required autocomplete="off"><div class="sale-date-hint">${lang==='ar'?'اضغط لاختيار تاريخ الطلبية. لن يتم وضع تاريخ اليوم تلقائياً.':'Tap to choose the order date. Today is not filled automatically.'}</div></div><div><label>${t('product')}</label><select id="fSaleProduct"><option value="">${lang==='ar'?'اختر المنتج...':'Choose product...'}</option>${productOptions()}</select></div><div><label>${t('quantity')}</label><input id="fSaleQty" type="number" min="0.01" step="0.01"></div><div><label>${t('value')}</label><input id="fSaleAmount" type="number" min="0.01" step="0.01"></div><div><label>${t('reference')}</label><input id="fSaleRef"></div></div></div><div class="full"><label>${lang==='ar'?'موقع العميل على الخريطة':'Customer Location'}</label><div class="map-picker-help">${lang==='ar'?'اختر الموقع على الخريطة أو استخدم موقعك الحالي.':'Choose the location on the map or use your current location.'}</div><div id="customerPickerMap"></div><div class="location-box" style="margin-top:8px"><div><label class="small">Latitude</label><input id="fLat" readonly></div><div><label class="small">Longitude</label><input id="fLng" readonly></div><button class="btn secondary" id="gpsBtn" type="button">${lang==='ar'?'موقعي الحالي':'My Location'}</button></div><div id="locationStatus" class="small location-status"></div></div><div class="full"><button class="btn" id="saveCustomerBtn">${t('save')}</button></div></div>`);
 setTimeout(()=>{initCustomerPickerMap();const st=$('fStatus');if(st){st.addEventListener('change',updateInitialStatusReason);updateInitialStatusReason();}},80);
}
function updateInitialStatusReason(){
 const status=$('fStatus')?.value,wrap=$('fInitialReasonWrap'),saleWrap=$('fInitialSaleWrap'),label=$('fInitialReasonLabel');
 if(wrap){
   const needed=status==='hesitant'||status==='rejected';
   wrap.classList.toggle('hidden',!needed);
   if(label)label.textContent=status==='hesitant'?(lang==='ar'?'سبب تردد العميل':'Reason for hesitation'):(lang==='ar'?'سبب رفض العميل':'Reason for rejection');
 }
 if(saleWrap)saleWrap.classList.toggle('hidden',status!=='active');
 const oldNotice=$('fAgreedPendingNote');if(oldNotice)oldNotice.remove();
 if(status==='agreed_pending'){
   const target=$('fStatus')?.closest('div');
   if(target){
     const note=document.createElement('div');
     note.id='fAgreedPendingNote';
     note.className='small';
     note.style.marginTop='6px';
     note.textContent=lang==='ar'?'إذا لم تُسجل طلبية خلال 24 ساعة ضمن أيام العمل، يرجع العميل تلقائياً إلى حالته السابقة (متردد أو رافض). الجمعة لا تُحسب.':'If no order is recorded within 24 working hours, the customer automatically returns to the prior status (Hesitant or Rejected). Friday is not counted.';
     target.appendChild(note);
   }
 }
}
function setCustomerLocation(lat,lng,zoom=true){const x=Number(lat),y=Number(lng);if(!Number.isFinite(x)||!Number.isFinite(y))return;if($('fLat'))$('fLat').value=x.toFixed(6);if($('fLng'))$('fLng').value=y.toFixed(6);const ll=[x,y];if(!state.pickerMarker){state.pickerMarker=L.marker(ll,{draggable:true}).addTo(state.pickerMap);state.pickerMarker.on('dragend',e=>{const p=e.target.getLatLng();setCustomerLocation(p.lat,p.lng,false);});}else state.pickerMarker.setLatLng(ll);if(zoom)state.pickerMap.setView(ll,16);if($('locationStatus')){$('locationStatus').textContent=lang==='ar'?'تم تحديد الموقع.':'Location selected.';$('locationStatus').classList.add('ok');}}
function initCustomerPickerMap(){const el=$('customerPickerMap');if(!el||!window.L)return;if(state.pickerMap){try{state.pickerMap.remove()}catch(_){}}state.pickerMap=L.map(el,{zoomControl:true}).setView([24.7136,46.6753],11);addBaseMap(state.pickerMap);state.pickerMap.on('click',e=>setCustomerLocation(e.latlng.lat,e.latlng.lng,false));setTimeout(()=>state.pickerMap?.invalidateSize(),100);}
function captureLocation(){if(!navigator.geolocation)return flash(lang==='ar'?'المتصفح لا يدعم تحديد الموقع':'Location is not supported',true);const btn=$('gpsBtn');if(btn)btn.disabled=true;navigator.geolocation.getCurrentPosition(pos=>{setCustomerLocation(pos.coords.latitude,pos.coords.longitude,true);if(btn)btn.disabled=false;},()=>{flash(lang==='ar'?'تعذر الحصول على الموقع. اختره يدوياً.':'Could not get location. Choose it manually.',true);if(btn)btn.disabled=false;},{enableHighAccuracy:true,timeout:15000,maximumAge:0});}
async function createCustomer(){
 const name=$('fName').value.trim(),customerType=$('fCustomerType')?.value||'',area=$('fArea').value.trim(),phone=$('fPhone').value.trim(),status=$('fStatus').value,lat=$('fLat').value,lng=$('fLng').value,reason=$('fInitialReason')?.value.trim()||'';
 if(!name)return flash(lang==='ar'?'اسم العميل مطلوب':'Customer name is required',true);
 if(!['shop','factory','project'].includes(customerType))return flash(lang==='ar'?'حدد نوع العميل: محل أو مصنع أو مشروع.':'Select customer type: Shop, Factory, or Project.',true);
 if(!status)return flash(lang==='ar'?'اختر حالة العميل.':'Choose customer status.',true);
 if(canManage()&&!$('fRep')?.value)return flash(lang==='ar'?'اختر المندوب المسؤول.':'Choose the responsible representative.',true);
 if((status==='hesitant'||status==='rejected')&&reason.length<5)return flash(lang==='ar'?(status==='hesitant'?'اكتب سبب تردد العميل':'اكتب سبب رفض العميل'):(status==='hesitant'?'Enter the reason for hesitation':'Enter the reason for rejection'),true);
 if(!lat||!lng)return flash(lang==='ar'?'حدد موقع العميل':'Select customer location',true);
 let error=null;
 if(status==='active'){
   const saleDate=$('fSaleDate')?.value||'',product=$('fSaleProduct')?.value||'',qty=Number($('fSaleQty')?.value||0),amount=Number($('fSaleAmount')?.value||0);
   if(!saleDate)return flash(lang==='ar'?'اختر تاريخ الطلبية الأولى.':'Choose the first order date.',true);
   if(!product)return flash(lang==='ar'?'اختر منتج الطلبية الأولى.':'Choose the first order product.',true);
   if(!(qty>0)||!(amount>0))return flash(lang==='ar'?'العميل النشط لازم تسجل طلبيته الأولى قبل الحفظ.':'An Active customer requires the first order before saving.',true);
   ({error}=await sb.rpc('create_customer_with_initial_sale',{
     p_name:name,p_area:area||null,p_phone:phone||null,p_lat:Number(lat),p_lng:Number(lng),
     p_assigned_rep:canManage()?$('fRep').value:null,p_customer_type:customerType,p_product:product,
     p_quantity:qty,p_amount:amount,p_business_date:saleDate,p_order_ref:$('fSaleRef')?.value.trim()||null
   }));
 }else{
   ({error}=await sb.rpc('create_customer',{
     p_name:name,p_area:area||null,p_phone:phone||null,p_initial_status:status,p_lat:Number(lat),p_lng:Number(lng),
     p_assigned_rep:canManage()?$('fRep').value:null,p_initial_reason:reason,p_customer_type:customerType
   }));
 }
 if(error){
   const msg=error.message==='active customer requires initial sale'?(lang==='ar'?'لا يمكن تسجيل العميل نشط بدون طلبية.':'Active customer requires an order.'):error.message;
   return flash((lang==='ar'?'تعذر إضافة العميل: ':'Could not add customer: ')+msg,true);
 }
 closeModal();flash(lang==='ar'?(status==='active'?'تمت إضافة العميل والطلبية الأولى':'تمت إضافة العميل'):(status==='active'?'Customer and first order saved':'Customer added'));await refreshAll();
}

function openCustomerEditor(id){if(!canManage())return;const c=state.customers.find(x=>Number(x.id)===Number(id));if(!c)return;const adminStatus=isAdmin()?`<div class="full"><div class="notice" style="margin-bottom:8px"><b>${lang==='ar'?'تعديل الحالة - إدارة':'Admin status correction'}</b><br>${lang==='ar'?'الحالة الحالية: ':'Current status: '}${esc(statusLabel(c.status))}. ${lang==='ar'?'اختيار «نشط» غير مسموح إذا ما عند العميل طلبية.':'Active cannot be selected unless the customer has an order.'}</div><label>${lang==='ar'?'تعديل الحالة (اختياري)':'Change status (optional)'}</label><select id="ecStatus"><option value="">${lang==='ar'?'بدون تغيير الحالة...':'No status change...'}</option>${CHANGE_STATUS_KEYS.filter(k=>k!==c.status).map(k=>`<option value="${k}">${t(k)}</option>`).join('')}</select></div>`:'';openModal(lang==='ar'?'تعديل العميل':'Edit Customer',`<div class="form-grid"><div><label>${t('customer')}</label><input id="ecName" value="${esc(c.name)}"></div><div><label>${t('customerType')}</label><select id="ecCustomerType"><option value="" ${!c.customer_type?'selected':''}>${t('notSet')}</option><option value="shop" ${c.customer_type==='shop'?'selected':''}>${t('shop')}</option><option value="factory" ${c.customer_type==='factory'?'selected':''}>${t('factory')}</option><option value="project" ${c.customer_type==='project'?'selected':''}>${t('project')}</option></select></div><div><label>${t('area')}</label><input id="ecArea" value="${esc(c.area||'')}"></div><div><label>${t('phone')}</label><input id="ecPhone" value="${esc(c.phone||'')}"></div><div><label>${t('representative')}</label><select id="ecRep">${repOptions(c.assigned_rep)}</select></div>${adminStatus}<div class="full"><button class="btn" id="saveCustomerEditBtn" data-id="${c.id}">${t('save')}</button></div></div>`);}
async function saveCustomerEdit(id){const customerType=$('ecCustomerType').value;if(!['shop','factory','project'].includes(customerType))return flash(lang==='ar'?'حدد نوع العميل: محل أو مصنع أو مشروع.':'Select customer type: Shop, Factory, or Project.',true);const {error}=await sb.rpc('admin_update_customer',{p_customer_id:id,p_name:$('ecName').value.trim(),p_area:$('ecArea').value.trim()||null,p_phone:$('ecPhone').value.trim()||null,p_assigned_rep:$('ecRep').value,p_customer_type:customerType});if(error)return flash(error.message,true);const newStatus=isAdmin()?($('ecStatus')?.value||''):'';if(newStatus){const statusResult=await sb.rpc('admin_set_customer_status',{p_customer_id:id,p_new_status:newStatus});if(statusResult.error){const msg=statusResult.error.message==='active customer requires sale'?(lang==='ar'?'ما تقدر تحول العميل إلى نشط بدون طلبية. سجل الطلبية أولاً.':'You cannot make the customer Active without an order. Record the order first.'):statusResult.error.message;return flash(msg,true);}}closeModal();flash(t('updated'));await refreshAll();}
async function deleteCustomer(id){if(!isAdmin()||!confirm(t('confirmDelete')))return;const {error}=await sb.rpc('admin_delete_customer',{p_customer_id:id});if(error)return flash(error.message,true);closeModal();flash(t('deleted'));await refreshAll();}

function openStatusForm(id){if(!isAdmin())return;const c=state.customers.find(x=>Number(x.id)===Number(id));if(!c)return;const hasSale=!!activityForCustomer(c.id).lastSale;const allowed=CHANGE_STATUS_KEYS.filter(k=>k!==c.status&&(k!=='active'||hasSale));const opts=`<option value="">${lang==='ar'?'اختر الحالة الجديدة...':'Choose new status...'}</option>`+allowed.map(k=>`<option value="${k}">${t(k)}</option>`).join('');openModal(lang==='ar'?'تعديل حالة العميل - إدارة':'Edit Customer Status - Admin',`<div class="notice" style="margin-bottom:10px">${lang==='ar'?'هذا تعديل إداري مباشر. يغيّر الحالة الحالية فقط ولا يُسجّل كمتابعة أو كتغيير حالة ضمن سجل العميل. ولا يمكن تحويل العميل إلى نشط بدون طلبية.':'This is a direct admin correction. It changes the current status only and is not recorded as a follow-up or customer status-change event.'}</div><div class="form-grid"><div><label>${lang==='ar'?'الحالة الحالية':'Current Status'}</label><input value="${esc(statusLabel(c.status))}" readonly></div><div><label>${t('newStatus')}</label><select id="stNew">${opts}</select></div><div class="full"><button class="btn" id="saveStatusBtn" data-id="${id}" ${allowed.length?'':'disabled'}>${t('save')}</button></div></div>`);}
async function changeStatus(id){const newStatus=$('stNew')?.value;if(!newStatus)return flash(lang==='ar'?'اختر الحالة الجديدة.':'Choose the new status.',true);const {error}=await sb.rpc('admin_set_customer_status',{p_customer_id:id,p_new_status:newStatus});if(error)return flash(error.message==='active customer requires sale'?(lang==='ar'?'ما تقدر تحول العميل إلى نشط بدون طلبية. سجل الطلبية أولاً.':'You cannot make the customer Active without an order. Record the order first.'):error.message,true);closeModal();flash(lang==='ar'?'تم تعديل حالة العميل إدارياً.':'Customer status updated by admin.');await refreshAll();}

function openLocationEditor(id){if(!canManage())return;openModal(lang==='ar'?'تعديل موقع العميل':'Edit Customer Location',`<div><div id="customerPickerMap"></div><div class="location-box" style="margin-top:8px"><div><label>Latitude</label><input id="fLat" readonly></div><div><label>Longitude</label><input id="fLng" readonly></div></div><div style="margin-top:10px"><label>${t('reason')}</label><textarea id="locReason" rows="3"></textarea></div><button class="btn" style="margin-top:10px" id="saveLocationBtn" data-id="${id}">${t('save')}</button></div>`);setTimeout(async()=>{initCustomerPickerMap();const {data}=await sb.from('customer_locations').select('lat,lng').eq('customer_id',id).maybeSingle();if(data)setCustomerLocation(data.lat,data.lng,true);},80);}
async function saveLocation(id){const reason=$('locReason').value.trim();if(reason.length<4)return flash(lang==='ar'?'اكتب سبب التعديل':'Enter a reason',true);const {error}=await sb.rpc('correct_customer_location',{p_customer_id:id,p_lat:Number($('fLat').value),p_lng:Number($('fLng').value),p_reason:reason});if(error)return flash(error.message,true);closeModal();flash(t('updated'));}


function inactiveVisitAlreadyLogged(customer){
 return !!inactiveVisitForCustomer(customer);
}
function updateSaleWorkflowFields(){
 const customerId=Number($('sCustomerId')?.value||0),c=state.customers.find(x=>Number(x.id)===customerId);
 const gate=$('sWorkflowGate'),saleFields=$('sSaleFields'),activationWrap=$('sActivationReasonWrap'),inactiveWrap=$('sInactiveVisitWrap'),confirmed=$('sActivationConfirmed');
 if(!gate||!saleFields)return;
 saleFields.classList.add('hidden');if(activationWrap)activationWrap.classList.add('hidden');if(inactiveWrap)inactiveWrap.classList.add('hidden');if(confirmed)confirmed.value='';
 if(!c){gate.innerHTML=`<div class="notice">${lang==='ar'?'اختر العميل أولاً لمعرفة مسار تسجيل الطلبية.':'Choose the customer first to see the order workflow.'}</div>`;return;}
 if(c.status==='active'){
   gate.innerHTML=`<div class="security-good"><b>${t('active')}</b> — ${lang==='ar'?'يمكن تسجيل الطلبية مباشرة.':'Order entry is available directly.'}</div>`;saleFields.classList.remove('hidden');return;
 }
 if(c.status==='agreed_pending'){
   gate.innerHTML=`<div class="notice"><b>${t('agreed_pending')}</b> — ${lang==='ar'?'سجّل الطلبية، وبعد نجاح الحفظ يتحول العميل إلى نشط تلقائياً.':'Record the order. After a successful save, the customer becomes Active automatically.'}</div>`;saleFields.classList.remove('hidden');return;
 }
 if(c.status==='inactive'){
   const hasVisit=inactiveVisitAlreadyLogged(c);
   gate.innerHTML=`<div class="security-warn"><b>${t('inactive')}</b> — ${lang==='ar'?'هذا العميل كان نشطاً ثم توقف عن السحب أسبوعياً. تسجيل الطلبية يعيده إلى نشط تلقائياً.':'This customer was Active and then missed the weekly-order requirement. Saving an order reactivates the customer automatically.'}</div>`;
   if(inactiveWrap){inactiveWrap.classList.toggle('hidden',hasVisit);inactiveWrap.innerHTML=hasVisit?`<div class="security-good">${lang==='ar'?'تم تسجيل زيارة للعميل بعد تحوله إلى خامل.':'A visit has already been recorded since the customer became inactive.'}</div>`:`<label>${lang==='ar'?'تقرير زيارة العميل الخامل':'Inactive customer visit report'} <span class="required-star">*</span></label><textarea id="sInactiveVisitNote" rows="4" placeholder="${lang==='ar'?'اكتب نتيجة الزيارة قبل حفظ الطلبية...':'Enter the visit result before saving the order...'}"></textarea><div class="small">${lang==='ar'?'لن تُحفظ الطلبية بدون تقرير زيارة، إلا إذا كانت زيارة مسجلة مسبقاً بعد تحوله إلى خامل.':'The order cannot be saved without a visit report unless a visit was already logged after the customer became inactive.'}</div>`;}
   saleFields.classList.remove('hidden');return;
 }
 if(c.status==='hesitant'||c.status==='rejected'){
   gate.innerHTML=`<div class="security-warn"><b>${badgeStatus(c.status)}</b><br>${lang==='ar'?'تسجيل طلبية يتطلب تحويل العميل إلى نشط مع كتابة سبب التحويل. لن تتغير الحالة إلا بعد نجاح حفظ الطلبية.':'Recording an order requires converting the customer to Active with a reason. The status will not change until the order is saved successfully.'}<div class="toolbar" style="margin-top:10px"><button type="button" class="btn" id="sActivateNowBtn">${lang==='ar'?'تغيير الحالة الآن':'Change status now'}</button><button type="button" class="btn secondary" id="sAgreedPendingBtn">${lang==='ar'?'متفق – بانتظار الطلبية':'Agreed – awaiting order'}</button></div><div id="sPendingAgreementWrap" class="hidden" style="margin-top:10px"><label>${lang==='ar'?'سبب الاتفاق':'Agreement reason'} <span class="required-star">*</span></label><textarea id="sPendingReason" rows="3"></textarea><button type="button" class="btn secondary" id="sSaveAgreedPendingBtn" style="margin-top:8px">${lang==='ar'?'حفظ كمتفق – بانتظار الطلبية':'Save as agreed – awaiting order'}</button></div></div>`;return;
 }
 gate.innerHTML=`<div class="danger-note">${lang==='ar'?'حالة العميل الحالية لا تسمح بتسجيل طلبية.':'The current customer status does not allow order entry.'}</div>`;
}
function enableSaleActivation(){
 const c=state.customers.find(x=>Number(x.id)===Number($('sCustomerId')?.value||0));if(!c||!['hesitant','rejected'].includes(c.status))return;
 $('sActivationConfirmed').value='1';$('sActivationReasonWrap').classList.remove('hidden');$('sSaleFields').classList.remove('hidden');
 $('sPendingAgreementWrap')?.classList.add('hidden');$('sActivationReason')?.focus();
}
function showPendingAgreementForm(){
 const c=state.customers.find(x=>Number(x.id)===Number($('sCustomerId')?.value||0));if(!c||!['hesitant','rejected'].includes(c.status))return;
 $('sPendingAgreementWrap')?.classList.remove('hidden');$('sPendingReason')?.focus();
}
async function markAgreedPendingFromSales(){
 const customerId=Number($('sCustomerId')?.value||0),reason=$('sPendingReason')?.value.trim()||'',c=state.customers.find(x=>Number(x.id)===customerId);
 if(!c||!['hesitant','rejected'].includes(c.status))return flash(lang==='ar'?'حالة العميل تغيرت. أعد فتح العملية.':'Customer status changed. Reopen the workflow.',true);
 if(reason.length<5)return flash(lang==='ar'?'اكتب سبب الاتفاق بشكل واضح.':'Enter a clear agreement reason.',true);
 const {error}=await sb.rpc('mark_customer_agreed_pending',{p_customer_id:customerId,p_reason:reason});
 if(error)return flash(error.message,true);
 closeModal();flash(lang==='ar'?'تم تحويل العميل إلى «متفق – بانتظار الطلبية».':'Customer marked Agreed – awaiting order.');await refreshAll();
}
function openSaleForm(customerId=null){
 const requested=state.customers.find(c=>Number(c.id)===Number(customerId))||null;
 if(!state.customers.length)return flash(lang==='ar'?'لا يوجد عميل متاح لتسجيل طلبية.':'There is no customer available for an order.',true);
 openModal(lang==='ar'?'تسجيل سحب / فاتورة':'Record Sale / Withdrawal',`
   <div class="notice" style="margin-bottom:10px">${lang==='ar'?'مسار الطلبية مضبوط حسب حالة العميل: نشط أو متفق يسجل مباشرة، المتردد/الرافض يحتاج سبب تحويل، والخامل يحتاج زيارة مسجلة.':'Order entry follows customer status: Active/Agreed can order directly, Hesitant/Rejected require an activation reason, and Inactive requires a recorded visit.'}</div>
   <div class="form-grid">
     <div class="full"><label>${t('customer')}</label>${customerPickerHtml('s',requested?.id||null,false)}</div>
     <div class="full" id="sWorkflowGate"></div>
     <input id="sActivationConfirmed" type="hidden" value="">
     <div class="full hidden" id="sActivationReasonWrap"><label>${lang==='ar'?'سبب تحويل العميل إلى نشط':'Reason for converting customer to Active'} <span class="required-star">*</span></label><textarea id="sActivationReason" rows="4" placeholder="${lang==='ar'?'مثال: وافق العميل على الشراء بعد الزيارة وتم إصدار الطلبية...':'Example: customer agreed to buy after the visit and the order is being issued...'}"></textarea></div>
     <div class="full hidden" id="sInactiveVisitWrap"></div>
     <div class="full hidden" id="sSaleFields"><div class="form-grid">
       <div class="full sale-date-card"><label>${lang==='ar'?'تاريخ الطلبية':'Order date'} <span class="required-star">*</span></label><input id="sDate" class="sale-date-input" type="date" required autocomplete="off"><div class="sale-date-hint">${lang==='ar'?'اضغط لاختيار تاريخ الطلبية. لن يتم وضع تاريخ اليوم تلقائياً.':'Tap to choose the order date. Today is not filled automatically.'}</div></div>
       <div><label>${t('product')}</label><select id="sProduct"><option value="">${lang==='ar'?'اختر المنتج...':'Choose product...'}</option>${productOptions()}</select></div>
       <div><label>${t('quantity')}</label><input id="sQty" type="number" min="0.01" step="0.01"></div>
       <div><label>${t('value')}</label><input id="sAmount" type="number" min="0.01" step="0.01"></div>
       <div class="full"><label>${t('reference')}</label><input id="sRef"></div>
       <div class="full"><button class="btn" id="saveSaleBtn">${t('save')}</button></div>
     </div></div>
   </div>`);
 setTimeout(()=>{bindCustomerPicker('s',updateSaleWorkflowFields,false);updateSaleWorkflowFields();},0);
}
async function addSale(){
 const customerId=Number($('sCustomerId')?.value||0),businessDate=$('sDate')?.value||'',product=$('sProduct')?.value||'',qty=Number($('sQty')?.value||0),amount=Number($('sAmount')?.value||0);
 if(!customerId)return flash(lang==='ar'?'اختر العميل من نتائج البحث':'Select a customer from the search results',true);
 const customer=state.customers.find(c=>Number(c.id)===customerId);
 if(!customer)return flash(lang==='ar'?'العميل غير موجود':'Customer not found',true);
 let activationReason=null,inactiveVisitNote=null;
 if(['hesitant','rejected'].includes(customer.status)){
   if($('sActivationConfirmed')?.value!=='1')return flash(lang==='ar'?'اضغط «تغيير الحالة الآن» أولاً.':'Click “Change status now” first.',true);
   activationReason=$('sActivationReason')?.value.trim()||'';
   if(activationReason.length<5)return flash(lang==='ar'?'اكتب سبب تحويل العميل إلى نشط.':'Enter the reason for converting the customer to Active.',true);
 }else if(customer.status==='inactive'&&!inactiveVisitAlreadyLogged(customer)){
   inactiveVisitNote=$('sInactiveVisitNote')?.value.trim()||'';
   if(inactiveVisitNote.length<5)return flash(lang==='ar'?'اكتب تقرير زيارة العميل الخامل قبل حفظ الطلبية.':'Enter the inactive-customer visit report before saving the order.',true);
 }else if(!['active','agreed_pending','inactive'].includes(customer.status)){
   return flash(lang==='ar'?'حالة العميل لا تسمح بتسجيل طلبية.':'Customer status does not allow an order.',true);
 }
 if(!businessDate)return flash(lang==='ar'?'اختر تاريخ الطلبية':'Choose the order date',true);
 if(!product)return flash(lang==='ar'?'اختر المنتج':'Choose the product',true);
 if(!(qty>0)||!(amount>0))return flash(lang==='ar'?'أكمل بيانات السحب':'Complete sale details',true);
 const before=customer.status;
 const {error}=await sb.rpc('record_sale_workflow',{
   p_customer_id:customerId,p_product:product,p_quantity:qty,p_amount:amount,
   p_business_date:businessDate,p_order_ref:$('sRef')?.value.trim()||null,
   p_activation_reason:activationReason,p_inactive_visit_note:inactiveVisitNote
 });
 if(error){
   const map={
     'activation reason required':lang==='ar'?'سبب التحويل إلى نشط مطلوب.':'Activation reason is required.',
     'inactive visit report required':lang==='ar'?'تقرير زيارة العميل الخامل مطلوب قبل الطلبية.':'Inactive-customer visit report is required before the order.',
     'customer status not eligible for sale':lang==='ar'?'حالة العميل لا تسمح بتسجيل طلبية.':'Customer status does not allow an order.'
   };
   return flash(map[error.message]||error.message,true);
 }
 closeModal();
 const msg=before==='active'?(lang==='ar'?'تم حفظ الطلبية.':'Order saved.'):before==='agreed_pending'?(lang==='ar'?'تم حفظ الطلبية وتحويل العميل إلى نشط.':'Order saved and customer activated.'):before==='inactive'?(lang==='ar'?'تم حفظ الطلبية وإعادة العميل الخامل إلى نشط.':'Order saved and inactive customer reactivated.'):(lang==='ar'?'تم حفظ السبب والطلبية وتحويل العميل إلى نشط.':'Reason and order saved; customer activated.');
 flash(msg);await refreshAll();
}

function openSaleEditor(id){if(!canManage())return;const x=state.sales.find(s=>Number(s.id)===Number(id));if(!x)return;openModal(lang==='ar'?'تعديل السحب':'Edit Sale',`<div class="form-grid"><div><label>${t('date')}</label><input id="esDate" type="date" value="${x.business_date}"></div><div><label>${t('product')}</label><select id="esProduct">${productOptions(PRODUCT_KEYS.includes(x.product)?x.product:null)}</select></div><div><label>${t('quantity')}</label><input id="esQty" type="number" min="0.01" step="0.01" value="${Number(x.quantity)}"></div><div><label>${t('value')}</label><input id="esAmount" type="number" min="0.01" step="0.01" value="${Number(x.amount)}"></div><div class="full"><label>${t('reference')}</label><input id="esRef" value="${esc(x.order_ref||'')}"></div><div class="full"><button class="btn" id="saveSaleEditBtn" data-id="${id}">${t('save')}</button></div></div>`);}
async function saveSaleEdit(id){const {error}=await sb.rpc('admin_update_sale',{p_sale_id:id,p_product:$('esProduct').value,p_quantity:Number($('esQty').value),p_amount:Number($('esAmount').value),p_order_ref:$('esRef').value.trim()||null,p_business_date:$('esDate').value});if(error)return flash(error.message,true);closeModal();flash(t('updated'));await refreshAll();}
async function deleteSale(id){if(!isAdmin()||!confirm(t('confirmDelete')))return;const {error}=await sb.rpc('admin_delete_sale',{p_sale_id:id});if(error)return flash(error.message,true);closeModal();flash(t('deleted'));await refreshAll();}



function salesFollowupPickerHtml(selected=null){
 const eligible=state.customers.filter(c=>['hesitant','rejected'].includes(c.status));
 const c=eligible.find(x=>Number(x.id)===Number(selected))||null;
 return `<div class="customer-combo"><input id="sfCustomer" autocomplete="off" value="${c?esc(c.name):''}" placeholder="${lang==='ar'?'اكتب اسم العميل المتردد أو الرافض...':'Type a hesitant or rejected customer...'}"><input id="sfCustomerId" type="hidden" value="${c?.id||''}"><div id="sfCustomerResults" class="customer-combo-results hidden"></div></div>`;
}
function bindSalesFollowupPicker(){
 const input=$('sfCustomer'),hidden=$('sfCustomerId'),results=$('sfCustomerResults');if(!input||!hidden||!results)return;
 const eligible=()=>state.customers.filter(c=>['hesitant','rejected'].includes(c.status));
 const updateInfo=()=>{
   const c=state.customers.find(x=>Number(x.id)===Number(hidden.value||0));
   if($('sfCurrentStatus'))$('sfCurrentStatus').value=c?statusLabel(c.status):'';
 };
 const render=()=>{
   const q=input.value.trim().toLowerCase();
   const matches=eligible().filter(c=>!q||`${c.name} ${c.area||''} ${c.phone||''}`.toLowerCase().includes(q)).slice(0,12);
   results.innerHTML=matches.length?matches.map(c=>`<button type="button" class="customer-combo-option" data-sf-pick="${c.id}"><b>${esc(c.name)}</b><span>${esc(statusLabel(c.status))}${c.area?' — '+esc(c.area):''}</span></button>`).join(''):`<div class="customer-combo-empty">${lang==='ar'?'لا يوجد عميل متردد أو رافض مطابق.':'No matching hesitant or rejected customer.'}</div>`;
   results.classList.remove('hidden');
 };
 input.addEventListener('focus',render);
 input.addEventListener('input',()=>{hidden.value='';updateInfo();render();});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=results.querySelector('[data-sf-pick]');if(first){e.preventDefault();first.click();}}});
 results.addEventListener('mousedown',e=>e.preventDefault());
 results.addEventListener('click',e=>{
   const btn=e.target.closest('[data-sf-pick]');if(!btn)return;
   const c=eligible().find(x=>Number(x.id)===Number(btn.dataset.sfPick));if(!c)return;
   hidden.value=String(c.id);input.value=c.name;results.classList.add('hidden');updateInfo();
 });
 input.addEventListener('blur',()=>setTimeout(()=>results.classList.add('hidden'),120));
 updateInfo();
}
function openSalesFollowupForm(id=null){
 const selected=state.customers.find(c=>Number(c.id)===Number(id)&&['hesitant','rejected'].includes(c.status))||null;
 const eligible=state.customers.filter(c=>['hesitant','rejected'].includes(c.status));
 if(!eligible.length)return flash(lang==='ar'?'لا يوجد عميل متردد أو رافض يحتاج متابعة حالياً.':'No hesitant or rejected customer currently needs a follow-up.',true);
 openModal(lang==='ar'?'تسجيل متابعة بيعية':'Record Sales Follow-up',`
   <div class="notice">${lang==='ar'?'المتابعة لا تغيّر حالة العميل. المتردد بعد 3 أيام عمل، والرافض بعد 7 أيام عمل. الجمعة لا تُحسب.':'A follow-up does not change status. Hesitant customers are due in 3 workdays and Rejected customers in 7; Friday is not counted.'}</div>
   <div class="form-grid" style="margin-top:12px">
     <div class="full"><label>${t('customer')}</label>${salesFollowupPickerHtml(selected?.id||null)}</div>
     <div><label>${lang==='ar'?'الحالة الحالية':'Current status'}</label><input id="sfCurrentStatus" readonly></div>
     <div class="full">${voiceRecorderHtml('salesFollowupVoice',lang==='ar'?'تقرير المتابعة الصوتي':'Voice follow-up report')}</div>
     <div class="full"><label>${lang==='ar'?'تفاصيل إضافية بالكتابة — اختياري':'Additional written details — optional'}</label><textarea id="sfNote" rows="3" placeholder="${lang==='ar'?'مثلاً رقم عرض سعر أو معلومة قصيرة تحتاج توضيح...':'For example, a quotation number or short detail that needs clarification...'}"></textarea></div>
     <div class="full"><button class="btn" id="saveSalesFollowupBtn">${t('save')}</button></div>
   </div>`);
 setTimeout(bindSalesFollowupPicker,0);
}
async function saveSalesFollowup(){
 const customerId=Number($('sfCustomerId')?.value||0),note=$('sfNote')?.value.trim()||'',btn=$('saveSalesFollowupBtn');
 if(!customerId)return flash(lang==='ar'?'اختر عميلاً متردداً أو رافضاً.':'Choose a hesitant or rejected customer.',true);
 const c=state.customers.find(x=>Number(x.id)===customerId);
 if(!c||!['hesitant','rejected'].includes(c.status))return flash(lang==='ar'?'هذا العميل لم يعد متردداً أو رافضاً.':'This customer is no longer hesitant or rejected.',true);
 if(!voiceDraft('salesFollowupVoice')?.blob)return flash(lang==='ar'?'سجّل تقرير المتابعة الصوتي أولاً.':'Record the voice follow-up report first.',true);
 try{
   if(btn){btn.disabled=true;btn.textContent=lang==='ar'?'جاري الحفظ...':'Saving...';}
   const audio=await uploadVoiceDraft('salesFollowupVoice','sales-followup',customerId);
   const {error}=await sb.rpc('record_sales_followup',{p_customer_id:customerId,p_note:note,p_audio_path:audio.path,p_audio_duration_seconds:audio.duration});
   if(error)throw new Error(error.message);
   const days=c.status==='rejected'?7:3;
   closeModal();flash(lang==='ar'?('تم حفظ المتابعة الصوتية. المتابعة التالية بعد '+days+' أيام عمل.'):('Voice follow-up saved. The next follow-up is due in '+days+' workdays.'));await refreshAll();
 }catch(err){
   flash(err.message||String(err),true);
   if(btn){btn.disabled=false;btn.textContent=t('save');}
 }
}
function openReportForm(id=null){
 const selected=state.customers.find(c=>Number(c.id)===Number(id))||null;if(!state.customers.length)return flash(t('noData'),true);
 openModal(lang==='ar'?'تسجيل شكوى / طلب عميل':'Add Customer Complaint / Request',`
   <div class="notice">${lang==='ar'?'اختر النوع ثم سجّل التقرير بالصوت. هذه الشاشة لا تغيّر حالة العميل.':'Choose the type, then record the report by voice. This screen does not change customer status.'}</div>
   <div class="form-grid" style="margin-top:12px">
     <div class="full"><label>${t('customer')}</label>${customerPickerHtml('r',selected?.id||null)}</div>
     <div><label>${lang==='ar'?'نوع الطلب':'Request type'}</label><select id="rAction"><option value="">${lang==='ar'?'اختر النوع...':'Choose type...'}</option>${FOLLOW_ACTION_KEYS.map(k=>`<option value="${k}">${t(k)}</option>`).join('')}</select></div>
     <div class="full">${voiceRecorderHtml('serviceReportVoice',lang==='ar'?'التقرير الصوتي':'Voice report')}</div>
     <div class="full"><label>${lang==='ar'?'تفاصيل إضافية بالكتابة — اختياري':'Additional written details — optional'}</label><textarea id="rNote" rows="3" placeholder="${lang==='ar'?'مثلاً رقم الصنف أو معلومة تحتاج كتابة...':'For example, a product code or detail that needs to be written...'}"></textarea></div>
     <div class="full"><button class="btn" id="saveReportBtn">${t('save')}</button></div>
   </div>`);
 setTimeout(()=>bindCustomerPicker('r',null,false),0);
}
async function addReport(){
 const customerId=Number($('rCustomerId')?.value||0),note=$('rNote')?.value.trim()||'',action=$('rAction')?.value||'',btn=$('saveReportBtn');
 if(!customerId)return flash(lang==='ar'?'اختر العميل من نتائج البحث':'Select a customer from the search results',true);
 if(!action)return flash(lang==='ar'?'اختر نوع الطلب أو الشكوى.':'Choose the request or complaint type.',true);
 if(!voiceDraft('serviceReportVoice')?.blob)return flash(lang==='ar'?'سجّل التقرير الصوتي أولاً.':'Record the voice report first.',true);
 try{
   if(btn){btn.disabled=true;btn.textContent=lang==='ar'?'جاري الحفظ...':'Saving...';}
   const audio=await uploadVoiceDraft('serviceReportVoice','service-report',customerId);
   const {error}=await sb.rpc('add_report',{p_customer_id:customerId,p_action_code:action,p_note:note,p_new_status:null,p_audio_path:audio.path,p_audio_duration_seconds:audio.duration});
   if(error){
     const msg=error.message==='already waiting for management'
       ?(lang==='ar'?'يوجد بالفعل طلب تدخل إدارة مفتوح لهذا العميل.':'There is already an open management-intervention request for this customer.')
       :error.message;
     throw new Error(msg);
   }
   closeModal();flash(lang==='ar'?'تم حفظ التقرير الصوتي.':'Voice report saved.');await refreshAll();
 }catch(err){
   flash(err.message||String(err),true);
   if(btn){btn.disabled=false;btn.textContent=t('save');}
 }
}
function openReportEditor(id){if(!canManage())return;const r=state.reports.find(x=>Number(x.id)===Number(id));if(!r)return;openModal(lang==='ar'?'تعديل المتابعة':'Edit Follow-up',`<div class="form-grid"><div><label>${t('action')}</label><select id="erAction">${EDIT_ACTION_KEYS.map(k=>`<option value="${k}" ${r.action_code===k?'selected':''}>${t(k)}</option>`).join('')}</select></div><div class="full"><label>${t('reason')}</label><textarea id="erNote" rows="5">${esc(r.note)}</textarea></div><div class="full"><button class="btn" id="saveReportEditBtn" data-id="${id}">${t('save')}</button></div></div>`);}
async function saveReportEdit(id){const note=$('erNote').value.trim();if(note.length<5)return flash(lang==='ar'?'اكتب تقريراً واضحاً':'Enter a clear report',true);const {error}=await sb.rpc('admin_update_report',{p_report_id:id,p_action_code:$('erAction').value,p_note:note});if(error)return flash(error.message,true);closeModal();flash(t('updated'));await refreshAll();}
async function deleteReport(id){if(!isAdmin()||!confirm(t('confirmDelete')))return;const {error}=await sb.rpc('admin_delete_report',{p_report_id:id});if(error)return flash(error.message,true);closeModal();flash(t('deleted'));await refreshAll();}



function mapTypeGlyph(type){return {shop:'🏪',factory:'🏭',project:'🏗'}[type]||'●';}
function markerIcon(category,type){
 const star=category==='frequent'?'<span class="map-marker-star">★</span>':'';
 return L.divIcon({
   className:'map-pin-wrap',
   html:'<div class="map-marker marker-'+esc(category)+'"><span class="map-marker-core">'+mapTypeGlyph(type)+'</span>'+star+'</div>',
   iconSize:[42,42],iconAnchor:[21,21],popupAnchor:[0,-22]
 });
}
function refreshMapRepFilter(){
 const el=$('mapRepFilter');if(!el)return;
 if(!canManage()){
   const own=state.profile;
   el.innerHTML='<option value="'+esc(own?.id||'')+'">'+esc(own?.full_name||t('representative'))+'</option>';
   el.value=own?.id||'';
   return;
 }
 const selected=el.value,reps=state.profiles.filter(p=>p.role==='rep');
 el.innerHTML='<option value="">'+t('allReps')+'</option>'+reps.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.full_name)+'</option>').join('');
 if(reps.some(p=>p.id===selected))el.value=selected;else el.value='';
}
function mapFilteredRows(){
 const filter=$('mapFilter')?.value||'',repFilter=$('mapRepFilter')?.value||'',typeFilter=$('mapTypeFilter')?.value||'',q=($('mapSearch')?.value||'').trim().toLowerCase();
 const rows=[];
 const ownRepId=state.profile?.id||'';
 for(const x of state.mapLocations||[]){
   const c=state.customers.find(z=>Number(z.id)===Number(x.customer_id));
   if(!c||x.lat==null||x.lng==null)continue;
   if(!canManage()&&c.assigned_rep!==ownRepId)continue;
   const ac=activityForCustomer(c.id),category=customerCategory(c);
   const statusOk=!filter||(filter==='frequent'?category==='frequent':c.status===filter);
   if(!statusOk)continue;
   if(repFilter&&c.assigned_rep!==repFilter)continue;
   if(typeFilter&&c.customer_type!==typeFilter)continue;
   if(q&&!((c.name||'')+' '+(c.area||'')+' '+(c.rep?.full_name||'')+' '+t(c.customer_type||'')).toLowerCase().includes(q))continue;
   const fu=(state.mapFollowups||[]).find(z=>Number(z.customer_id)===Number(c.id))||null;
   const lastReport=state.reports.find(r=>Number(r.customer_id)===Number(c.id))||null;
   rows.push({x,c,ac,category,fu,lastReport});
 }
 return rows;
}
function setMapText(){
 const ar=lang==='ar';
 if($('mapStatVisibleLabel'))$('mapStatVisibleLabel').textContent=ar?'العملاء المعروضون':'Visible Customers';
 if($('mapStatActiveLabel'))$('mapStatActiveLabel').textContent=t('active');
 if($('mapStatHesitantLabel'))$('mapStatHesitantLabel').textContent=t('hesitant');
 if($('mapStatRejectedLabel'))$('mapStatRejectedLabel').textContent=t('rejected');
 if($('mapStatSalesLabel'))$('mapStatSalesLabel').textContent=t('salesThisMonth');
 if($('mapListTitle'))$('mapListTitle').textContent=ar?(canManage()?'العملاء حسب الفلاتر':'عملائي على الخريطة'):(canManage()?'Customers by filters':'My Customers on Map');
 if($('mapListHint'))$('mapListHint').textContent=ar?(canManage()?'اضغط على العميل للانتقال إليه':'تظهر لك بيانات عملائك فقط — اضغط على العميل للانتقال إليه'):(canManage()?'Tap a customer to focus on it':'Only your customers are shown — tap a customer to focus on it');
 if($('mapFitBtn'))$('mapFitBtn').textContent=ar?'إظهار الكل':'Fit Customers';
 if($('mapClearBtn'))$('mapClearBtn').textContent=ar?'مسح الفلاتر':'Clear Filters';
 if($('mapFullscreenBtn'))$('mapFullscreenBtn').textContent=ar?'ملء الشاشة':'Full Screen';
 const mt=$('mapTypeFilter');
 if(mt){
   const labs={'':ar?'كل أنواع العملاء':'All Customer Types',shop:t('shop'),factory:t('factory'),project:t('project')};
   for(const o of mt.options)o.text=labs[o.value]||o.value;
 }
}
function renderMapSummary(rows){
 const active=rows.filter(r=>r.c.status==='active').length;
 const hesitant=rows.filter(r=>r.c.status==='hesitant').length;
 const rejected=rows.filter(r=>r.c.status==='rejected').length;
 const sales=rows.reduce((n,r)=>n+Number(r.ac.monthSalesValue||0),0);
 if($('mapStatVisible'))$('mapStatVisible').textContent=fmt(rows.length);
 if($('mapStatActive'))$('mapStatActive').textContent=fmt(active);
 if($('mapStatHesitant'))$('mapStatHesitant').textContent=fmt(hesitant);
 if($('mapStatRejected'))$('mapStatRejected').textContent=fmt(rejected);
 if($('mapStatSales'))$('mapStatSales').textContent=money(sales);
 if($('mapListCount'))$('mapListCount').textContent=fmt(rows.length);
}
function renderMapCustomerList(rows){
 const el=$('mapCustomerList');if(!el)return;
 const ar=lang==='ar';
 el.innerHTML=rows.length?rows.map(r=>{
   const due=r.fu?.next_due_at?dateTime(r.fu.next_due_at):'-';
   return '<button type="button" class="map-customer-item" data-map-customer="'+r.c.id+'">'+
     '<span class="map-customer-type">'+mapTypeGlyph(r.c.customer_type)+'</span>'+
     '<span class="map-customer-main"><b>'+esc(r.c.name)+'</b><small>'+esc(t(r.c.customer_type||'notSet'))+' • '+esc(r.c.area||'-')+'</small><small>'+esc(r.c.rep?.full_name||'-')+' • '+(ar?'المتابعة: ':'Follow-up: ')+esc(due)+'</small></span>'+
     '<span class="map-customer-status">'+badgeStatus(r.c.status)+'</span>'+
   '</button>';
 }).join(''):'<div class="empty">'+t('noData')+'</div>';
}
function fitMapRows(rows){
 if(!state.map||!rows.length)return;
 const bounds=rows.map(r=>[r.x.lat,r.x.lng]);
 state.map.fitBounds(bounds,{padding:[45,45],maxZoom:15});
}
function focusMapCustomer(id){
 const marker=state.mapMarkers?.get(Number(id));
 if(!marker||!state.map)return;
 state.map.setView(marker.getLatLng(),Math.max(state.map.getZoom(),16),{animate:true});
 marker.openPopup();
}
async function renderMap(){
  if(!state.profile)return;
  refreshMapRepFilter();setMapText();
  if(!state.map){
    state.map=L.map('map',{zoomControl:true}).setView([24.78,46.76],11);
    addBaseMap(state.map);
    state.markerLayer=L.layerGroup().addTo(state.map);
    state.mapMarkers=new Map();
  }
  const results=await Promise.all([
    sb.from('customer_locations').select('customer_id,lat,lng'),
    sb.from('sales_followup_state').select('customer_id,next_due_at')
  ]);
  if(results[0].error){console.error(results[0].error);return flash(lang==='ar'?'تعذر تحميل الخريطة':'Could not load map',true);}
  state.mapLocations=results[0].data||[];
  state.mapFollowups=results[1].error?[]:(results[1].data||[]);
  drawMapMarkers(true);
  setTimeout(()=>state.map.invalidateSize(),80);
}
function drawMapMarkers(fit=true){
 if(!state.map||!state.markerLayer)return;
 state.markerLayer.clearLayers();
 state.mapMarkers=new Map();
 setMapText();
 const rows=mapFilteredRows();
 for(const row of rows){
  const x=row.x,c=row.c,ac=row.ac,category=row.category,fu=row.fu,lastReport=row.lastReport;
  const m=L.marker([x.lat,x.lng],{icon:markerIcon(category,c.customer_type),riseOnHover:true}).addTo(state.markerLayer);
  state.mapMarkers.set(Number(c.id),m);
  const div=document.createElement('div');
  div.dir=lang==='ar'?'rtl':'ltr';div.className='map-popup-card';
  const ar=lang==='ar';
  div.innerHTML=
    '<div class="map-popup-title"><span class="map-popup-type">'+mapTypeGlyph(c.customer_type)+'</span><div><b>'+esc(c.name)+'</b><div class="small">'+esc(t(c.customer_type||'notSet'))+' • '+esc(c.area||'-')+'</div></div></div>'+
    '<div class="map-popup-grid">'+
      '<div><span>'+t('representative')+'</span><b>'+esc(c.rep?.full_name||'-')+'</b></div>'+
      '<div><span>'+t('status')+'</span><b>'+esc(statusLabel(c.status))+'</b></div>'+
      '<div><span>'+t('salesCountMonth')+'</span><b>'+fmt(ac.monthSalesCount)+'</b></div>'+
      '<div><span>'+t('salesValueMonth')+'</span><b>'+money(ac.monthSalesValue)+'</b></div>'+
      '<div><span>'+(ar?'آخر سحب':'Last Sale')+'</span><b>'+(ac.lastSale?dateOnly(ac.lastSale.business_date):'-')+'</b></div>'+
      '<div><span>'+(ar?'المتابعة القادمة':'Next Follow-up')+'</span><b>'+(fu?.next_due_at?dateTime(fu.next_due_at):'-')+'</b></div>'+
    '</div>'+
    (lastReport?'<div class="map-popup-last"><span>'+(ar?'آخر متابعة':'Last Follow-up')+'</span><b>'+dateTime(lastReport.created_at)+'</b><div>'+esc(lastReport.note||'')+'</div></div>':'');
  if(category==='frequent'){
    const tag=document.createElement('div');tag.className='map-popup-frequent';tag.textContent='★ '+(ar?'سحب متكرر هذا الشهر':'Repeated sale this month');div.appendChild(tag);
  }
  const actions=document.createElement('div');actions.className='map-popup-actions';
  const btn=document.createElement('button');btn.className='btn';btn.textContent=t('view');btn.addEventListener('click',()=>openCustomer(c.id));actions.appendChild(btn);
  const g=document.createElement('a');g.className='btn secondary';g.textContent='Google Maps';g.href=googleMapsDirectionsUrl(x.lat,x.lng);g.target='_blank';g.rel='noopener noreferrer';actions.appendChild(g);
  div.appendChild(actions);m.bindPopup(div,{maxWidth:360});
 }
 renderMapSummary(rows);renderMapCustomerList(rows);
 if(fit)fitMapRows(rows);
}
async function renderAudit(){if(!isAdmin())return;const period=$('auditPeriodFilter')?.value||'all';const data=await loadPaged((x,y)=>sb.from('audit_log').select('id,action,entity_type,entity_id,details,created_at,actor:profiles!audit_log_actor_id_fkey(full_name)').order('created_at',{ascending:false}).range(x,y),lang==='ar'?'سجل العمليات':'audit log');const rows=(data||[]).filter(a=>periodMatchesDate(dateKeyRiyadh(a.created_at),period));$('auditBody').innerHTML=rows.map(a=>`<tr><td>${dateTime(a.created_at)}</td><td>${esc(a.actor?.full_name||'-')}</td><td>${esc(ACTION[a.action]||a.action)}</td><td>${esc(a.entity_type)} #${esc(a.entity_id||'')}</td><td>${esc(JSON.stringify(a.details||{}))}</td></tr>`).join('')||`<tr><td colspan="5" class="empty">${t('noData')}</td></tr>`;}

async function changePassword(forced=false){
 const current=$(forced?'gateCurrentPassword':'currentPassword')?.value||'',p=$(forced?'gateNewPassword':'newPassword')?.value||'',confirm=$(forced?'gateConfirmPassword':'confirmPassword')?.value||'',msg=forced?$('gateSecurityMsg'):null,ar=lang==='ar';
 const fail=x=>{if(msg)msg.textContent=x;else flash(x,true);};
 if(!current)return fail(ar?'أدخل كلمة المرور الحالية.':'Enter the current password.');
 if(p===current)return fail(ar?'كلمة المرور الجديدة يجب أن تختلف عن الحالية.':'The new password must be different.');
 if(!strongPassword(p))return fail(ar?'استخدم 14 حرفاً على الأقل مع حرف كبير وصغير ورقم ورمز.':'Use at least 14 characters with uppercase, lowercase, number and symbol.');
 if(p!==confirm)return fail(ar?'تأكيد كلمة المرور غير مطابق.':'Password confirmation does not match.');
 if(msg)msg.textContent=ar?'جاري التحقق...':'Verifying...';
 const email=state.session?.user?.email,auth=await sb.auth.signInWithPassword({email,password:current});if(auth.error)return fail(ar?'كلمة المرور الحالية غير صحيحة.':'Current password is incorrect.');
 const {error}=await sb.auth.updateUser({password:p});if(error)return fail((ar?'تعذر تغيير كلمة المرور: ':'Could not change password: ')+error.message);
 if(!forced)flash(ar?'تم تغيير كلمة المرور':'Password changed');await new Promise(r=>setTimeout(r,400));await loadProfile();
}
async function renderSecurityStatus(){const box=$('securityStatus');if(!box||!state.profile)return;const changed=state.profile.password_changed_at?dateTime(state.profile.password_changed_at):(lang==='ar'?'لم تُسجل بعد':'Not recorded yet');box.innerHTML=lang==='ar'?`كلمة المرور: <b>${state.profile.must_change_password?'يجب تغييرها':'محدثة'}</b><br>آخر تغيير: ${esc(changed)}<br>الجلسة تُغلق بعد ساعة من عدم الاستخدام وبحد أقصى 8 ساعات.`:`Password: <b>${state.profile.must_change_password?'Change required':'Updated'}</b><br>Last change: ${esc(changed)}<br>Session closes after 1 hour of inactivity and after a maximum of 8 hours.`;const m=$('mfaAccount');if(!m||!isAdmin())return;const [aal,factors]=await Promise.all([sb.auth.mfa.getAuthenticatorAssuranceLevel(),sb.auth.mfa.listFactors()]);const verified=(factors.data?.totp||[]).some(x=>x.status==='verified');m.innerHTML=`<h4>${lang==='ar'?'التحقق بخطوتين للإدارة':'Admin two-factor authentication'}</h4><div class="${verified?'security-good':'security-warn'}">${verified?(lang==='ar'?'مفعّل. مستوى الجلسة: ':'Enabled. Session level: ')+esc(aal.data?.currentLevel||'-'):(lang==='ar'?'غير مفعّل.':'Not enabled.')}</div>`;}

function gotoPage(id){
 if(state.securityGateMode)return;if(state.profile?.must_change_password)return showPasswordGate();if(!canManage()&&id==='analytics')return;if(!isAdmin()&&id==='audit')return;
 document.querySelectorAll('.section').forEach(x=>x.classList.remove('active'));$(id).classList.add('active');document.querySelectorAll('.nav-grid button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
 const titles={dashboard:t('dashboard'),customers:t('customers'),sales:t('sales'),reports:t('followups'),analytics:t('reports'),mapPage:t('map'),audit:t('audit'),account:t('account')};$('pageTitle').textContent=titles[id]||'';
 if(id==='mapPage')setTimeout(renderMap,100);if(id==='analytics')setupAnalytics();if(id==='audit')renderAudit();if(id==='account')renderSecurityStatus();
}

$('loginBtn')?.addEventListener('click',login);$('loginPass')?.addEventListener('keydown',e=>{if(e.key==='Enter')login()});$('logoutBtn')?.addEventListener('click',()=>logout());$('closeModalBtn')?.addEventListener('click',closeModal);$('modal')?.addEventListener('click',e=>{if(e.target===$('modal'))closeModal()});
$('langBtn')?.addEventListener('click',toggleLanguage);$('langBtnLogin')?.addEventListener('click',toggleLanguage);
document.querySelectorAll('.nav-grid button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.page==='customers'){state.customerMonthOnly=false;$('customerSearch').value='';$('customerStatusFilter').value='';if($('customerRepFilter'))$('customerRepFilter').value='';if($('customerPeriodFilter'))$('customerPeriodFilter').value='all';}if(b.dataset.page==='sales'){$('saleSearch').value='';$('salePeriodFilter').value='all';if($('saleProductFilter'))$('saleProductFilter').value='';if($('saleRepFilter'))$('saleRepFilter').value='';}if(b.dataset.page==='reports'){if($('reportActionFilter'))$('reportActionFilter').value='';if($('reportPeriodFilter'))$('reportPeriodFilter').value='all';}if(b.dataset.page==='audit'){if($('auditPeriodFilter'))$('auditPeriodFilter').value='all';}gotoPage(b.dataset.page);}));
$('customerSearch')?.addEventListener('input',renderCustomers);$('customerStatusFilter')?.addEventListener('change',()=>{state.customerMonthOnly=false;renderCustomers();});$('customerRepFilter')?.addEventListener('change',()=>{state.customerMonthOnly=false;renderCustomers();});$('customerPeriodFilter')?.addEventListener('change',()=>{state.customerMonthOnly=false;renderCustomers();});$('saleSearch')?.addEventListener('input',renderSales);$('salePeriodFilter')?.addEventListener('change',renderSales);$('saleProductFilter')?.addEventListener('change',renderSales);$('saleRepFilter')?.addEventListener('change',renderSales);$('reportActionFilter')?.addEventListener('change',renderReports);$('reportPeriodFilter')?.addEventListener('change',renderReports);$('auditPeriodFilter')?.addEventListener('change',renderAudit);$('mapSearch')?.addEventListener('input',()=>drawMapMarkers(true));$('mapFilter')?.addEventListener('change',()=>drawMapMarkers(true));$('mapRepFilter')?.addEventListener('change',()=>drawMapMarkers(true));$('mapTypeFilter')?.addEventListener('change',()=>drawMapMarkers(true));$('mapFitBtn')?.addEventListener('click',()=>fitMapRows(mapFilteredRows()));$('mapClearBtn')?.addEventListener('click',()=>{if($('mapSearch'))$('mapSearch').value='';if($('mapFilter'))$('mapFilter').value='';if($('mapRepFilter'))$('mapRepFilter').value='';if($('mapTypeFilter'))$('mapTypeFilter').value='';drawMapMarkers(true);});$('mapFullscreenBtn')?.addEventListener('click',async()=>{const el=$('mapExperience');if(!el)return;try{if(!document.fullscreenElement)await el.requestFullscreen();else await document.exitFullscreen();}catch(_){}});
$('editGoalsBtn')?.addEventListener('click',openGoalsEditor);$('generateReportBtn')?.addEventListener('click',generateAnalytics);$('printReportBtn')?.addEventListener('click',()=>{generateAnalytics();setTimeout(()=>window.print(),50);});$('analytics')?.addEventListener('click',e=>{const b=e.target.closest('[data-report-preset]');if(!b)return;const today=todayRiyadh(),mode=b.dataset.reportPreset;if(mode==='month'){$('analyticsFrom').value=today.slice(0,8)+'01';$('analyticsTo').value=today;}else if(mode==='week'){$('analyticsFrom').value=weekStartRiyadh();$('analyticsTo').value=today;}else if(mode==='30'){const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-29);$('analyticsFrom').value=d.toISOString().slice(0,10);$('analyticsTo').value=today;}generateAnalytics();});
$('newCustomerBtn')?.addEventListener('click',openCustomerForm);$('newSaleBtn')?.addEventListener('click',()=>openSaleForm());$('newSalesFollowupBtn')?.addEventListener('click',()=>openSalesFollowupForm());$('newComplaintBtn')?.addEventListener('click',()=>openReportForm());$('changePasswordBtn')?.addEventListener('click',()=>changePassword(false));$('repPasswordAdminBtn')?.addEventListener('click',resetRepresentativePassword);
$('customersBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-open-customer]');if(b)openCustomer(Number(b.dataset.openCustomer));});$('mapCustomerList')?.addEventListener('click',e=>{const b=e.target.closest('[data-map-customer]');if(b)focusMapCustomer(Number(b.dataset.mapCustomer));});document.addEventListener('fullscreenchange',()=>{if(state.map&&document.querySelector('#mapPage.section.active'))setTimeout(()=>state.map.invalidateSize(),120);});
$('salesBody')?.addEventListener('click',e=>{let b;if((b=e.target.closest('[data-edit-sale]')))openSaleEditor(Number(b.dataset.editSale));else if((b=e.target.closest('[data-delete-sale]')))deleteSale(Number(b.dataset.deleteSale));});
$('reportsBody')?.addEventListener('click',e=>{let b;if((b=e.target.closest('[data-edit-report]')))openReportEditor(Number(b.dataset.editReport));else if((b=e.target.closest('[data-delete-report]')))deleteReport(Number(b.dataset.deleteReport));});$('salesFollowupsBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-delete-report]');if(b)deleteReport(Number(b.dataset.deleteReport));});
$('dashboard')?.addEventListener('click',e=>{let el;if((el=e.target.closest('[data-dormant-customer]'))){openDormantCustomer(Number(el.dataset.dormantCustomer));return;}if((el=e.target.closest('[data-attention-customer]'))){openCustomer(Number(el.dataset.attentionCustomer));return;}if((el=e.target.closest('[data-dashboard-link]'))){const k=el.dataset.dashboardLink;if(k==='customers'){state.customerMonthOnly=false;$('customerStatusFilter').value='';if($('customerRepFilter'))$('customerRepFilter').value='';if($('customerPeriodFilter'))$('customerPeriodFilter').value='all';$('customerSearch').value='';gotoPage('customers');renderCustomers();}else if(k==='sales-day'){$('salePeriodFilter').value='day';$('saleSearch').value='';gotoPage('sales');renderSales();}else if(k==='sales-month'){$('salePeriodFilter').value='month';$('saleSearch').value='';gotoPage('sales');renderSales();}else if(['active','inactive','agreed_pending','hesitant','rejected'].includes(k)){state.customerMonthOnly=false;$('customerStatusFilter').value=k;if($('customerPeriodFilter'))$('customerPeriodFilter').value='all';$('customerSearch').value='';gotoPage('customers');renderCustomers();}}else if((el=e.target.closest('[data-rep-customers]'))){const p=state.profiles.find(x=>x.id===el.dataset.repCustomers);state.customerMonthOnly=false;$('customerStatusFilter').value='';if($('customerPeriodFilter'))$('customerPeriodFilter').value='all';$('customerSearch').value=p?.full_name||'';gotoPage('customers');renderCustomers();}else if((el=e.target.closest('[data-goal-kind]'))){
   const kind=el.dataset.goalKind,scope=el.dataset.goalScope,isCompany=scope==='company',rep=isCompany?null:state.profiles.find(p=>p.id===scope);
   if(kind==='total_sales'){
     $('salePeriodFilter').value='month';$('saleSearch').value=rep?.full_name||'';gotoPage('sales');renderSales();
   }else if(kind==='new_customers'||kind==='active_new_customers'){
     const month=monthRiyadh(),monthStart=month+'-01',today=todayRiyadh(),scopeType=isCompany?'company':'rep',repId=rep?.id||null;
     let rows=goalNewCustomers(scopeType,repId,monthStart,today);
     const totals=new Map();
     state.sales.filter(x=>String(x.business_date||'').startsWith(month)).forEach(x=>{const id=Number(x.customer_id);totals.set(id,(totals.get(id)||0)+Number(x.amount||0));});
     if(kind==='active_new_customers')rows=rows.filter(c=>c.status==='active'&&(totals.get(Number(c.id))||0)>=ACTIVE_NEW_GOAL_MIN_SALES);
     rows=rows.slice().sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
     const note=kind==='new_customers'?
       (lang==='ar'?'يُحسب كل عميل سجله المندوب هذا الشهر مهما كانت حالته: رافض، متردد، متفق أو نشط.':'Every customer registered by the rep this month counts, regardless of status.'):
       (lang==='ar'?'يُحسب فقط العميل الجديد الذي سجله المندوب، حالته نشط، ووصلت سحوباته هذا الشهر إلى 5,000 ر.س أو أكثر.':'Only rep-registered new customers that are Active and reached SAR 5,000+ in month sales count.');
     openModal(kind==='new_customers'?(lang==='ar'?'العملاء الجدد المحتسبون':'Counted new customers'):(lang==='ar'?'العملاء الجدد النشطون المحتسبون':'Counted active new customers'),`<div class="notice" style="margin-bottom:10px">${note}</div><div class="table-wrap"><table><thead><tr><th>${t('customer')}</th><th>${t('status')}</th><th>${t('representative')}</th><th>${lang==='ar'?'سحوبات الشهر':'Month sales'}</th></tr></thead><tbody>${rows.length?rows.map(c=>`<tr><td><b>${esc(c.name)}</b></td><td>${badgeStatus(c.status)}</td><td>${esc(c.rep?.full_name||'-')}</td><td>${money(totals.get(Number(c.id))||0)}</td></tr>`).join(''):`<tr><td colspan="4" class="empty">${t('noData')}</td></tr>`}</tbody></table></div>`);
   }
 }});

$('modalContent')?.addEventListener('click',e=>{let b;if((b=e.target.closest('#gpsBtn')))captureLocation();else if((b=e.target.closest('#saveCustomerBtn')))createCustomer();else if((b=e.target.closest('[data-edit-customer]')))openCustomerEditor(Number(b.dataset.editCustomer));else if((b=e.target.closest('#saveCustomerEditBtn')))saveCustomerEdit(Number(b.dataset.id));else if((b=e.target.closest('[data-delete-customer]')))deleteCustomer(Number(b.dataset.deleteCustomer));else if((b=e.target.closest('[data-change-status]')))openStatusForm(Number(b.dataset.changeStatus));else if((b=e.target.closest('#saveStatusBtn')))changeStatus(Number(b.dataset.id));else if((b=e.target.closest('[data-edit-location]')))openLocationEditor(Number(b.dataset.editLocation));else if((b=e.target.closest('#saveLocationBtn')))saveLocation(Number(b.dataset.id));else if((b=e.target.closest('[data-add-sale]')))openSaleForm(Number(b.dataset.addSale));else if((b=e.target.closest('#sActivateNowBtn')))enableSaleActivation();else if((b=e.target.closest('#sAgreedPendingBtn')))showPendingAgreementForm();else if((b=e.target.closest('#sSaveAgreedPendingBtn')))markAgreedPendingFromSales();else if((b=e.target.closest('#saveSaleBtn')))addSale();else if((b=e.target.closest('[data-edit-sale]')))openSaleEditor(Number(b.dataset.editSale));else if((b=e.target.closest('#saveSaleEditBtn')))saveSaleEdit(Number(b.dataset.id));else if((b=e.target.closest('[data-delete-sale]')))deleteSale(Number(b.dataset.deleteSale));else if((b=e.target.closest('[data-inactive-visit]')))openInactiveVisitForm(Number(b.dataset.inactiveVisit));else if((b=e.target.closest('#saveInactiveVisitBtn')))saveInactiveVisit(Number(b.dataset.id));else if((b=e.target.closest('#saveSalesFollowupBtn')))saveSalesFollowup();else if((b=e.target.closest('[data-add-report]')))openReportForm(Number(b.dataset.addReport));else if((b=e.target.closest('#saveReportBtn')))addReport();else if((b=e.target.closest('[data-edit-report]')))openReportEditor(Number(b.dataset.editReport));else if((b=e.target.closest('#saveReportEditBtn')))saveReportEdit(Number(b.dataset.id));else if((b=e.target.closest('[data-delete-report]')))deleteReport(Number(b.dataset.deleteReport));else if((b=e.target.closest('#saveGoalsBtn')))saveGoals();else if((b=e.target.closest('#copyTemporaryRepPasswordBtn'))){const x=$('temporaryRepPassword');if(x){navigator.clipboard?.writeText(x.value);x.select();flash(lang==='ar'?'تم نسخ كلمة المرور.':'Password copied.');}}});
$('securityGateBody')?.addEventListener('click',e=>{let b;if((b=e.target.closest('#gateChangePasswordBtn')))changePassword(true);else if((b=e.target.closest('#verifyMfaEnrollBtn')))verifyMFA($('mfaEnrollCode')?.value||'');else if((b=e.target.closest('#verifyMfaChallengeBtn')))verifyMFA($('mfaChallengeCode')?.value||'');});
['pointerdown','keydown','touchstart','scroll'].forEach(evt=>window.addEventListener(evt,()=>{state.lastActivity=Date.now();},{passive:true}));setInterval(()=>{if(state.session&&Date.now()-state.lastActivity>MAX_IDLE_MS)logout(lang==='ar'?'تم تسجيل خروجك تلقائياً بعد ساعة بدون استخدام.':'You were signed out after 1 hour of inactivity.');},30000);
window.DANA_APP={sb,state,t,esc,fmt,money,dateTime,dateOnly,todayRiyadh,dateKeyRiyadh,monthRiyadh,statusLabel,badgeStatus,actionLabel,productLabel,isAdmin,isManager,canManage,openModal,closeModal,flash,openReportForm,openSalesFollowupForm,openCustomer,openDormantCustomer,refreshAll,repOptions,gotoPage,getLang:()=>lang};
applyLanguage();

if(!configured) showConfigMessage(); else sb.auth.onAuthStateChange((_event,session)=>{if(!session&&!$('login').classList.contains('hidden'))return;if(!session)showLogin();}); if(configured) loadProfile();
})();