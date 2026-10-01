(function(){
  const mo={
    settings:null,
    missions:[],
    links:[],
    selectedMissionId:null,
    map:null,
    mapPoints:[],
    pickerMap:null,
    pickerMarker:null,
    pickerCircle:null,
    loading:false,
    loadSeq:0,
    lastLoadedAt:0
  };

  const ar=()=>typeof lang!=='undefined'&&lang==='ar';
  const isRepUser=()=>state?.profile?.role==='rep';
  const isManagementUser=()=>typeof canManage==='function'&&canManage();
  const tx=(a,e)=>ar()?a:e;
  const n=v=>new Intl.NumberFormat(ar()?'ar-SA':'en-US',{maximumFractionDigits:0}).format(Number(v||0));
  const ymd=v=>String(v||'').slice(0,10);
  const today=()=>typeof todayRiyadh==='function'?todayRiyadh():new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const fmtDate=d=>d?(typeof dateOnly==='function'?dateOnly(ymd(d)):ymd(d)):'-';
  const safe=v=>typeof esc==='function'?esc(v):String(v??'');
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));

  function repName(id){
    return state.profiles?.find(p=>p.id===id)?.full_name||'-';
  }
  function progress(m){
    return mo.links.filter(x=>x.mission_id===m.id).length;
  }
  function remaining(m){
    return Math.max(0,Number(m.target_customers||0)-progress(m));
  }
  function pct(m){
    const t=Math.max(1,Number(m.target_customers||0));
    return Math.min(100,Math.round(progress(m)/t*100));
  }
  function statusText(m){
    if(m.status==='cancelled')return tx('ملغاة','Cancelled');
    if(m.status==='completed')return tx('مكتملة','Completed');
    if(ymd(m.scheduled_date)<today())return tx('فات موعدها','Overdue');
    if(m.status==='in_progress')return tx('جاري التنفيذ','In progress');
    return tx('مجدولة','Scheduled');
  }
  function statusClass(m){
    if(m.status==='cancelled')return 'mo-status-cancelled';
    if(m.status==='completed')return 'mo-status-completed';
    if(ymd(m.scheduled_date)<today())return 'mo-status-overdue';
    if(m.status==='in_progress')return 'mo-status-progress';
    return 'mo-status-scheduled';
  }
  function haversine(lat1,lng1,lat2,lng2){
    const r=6371000,toRad=x=>x*Math.PI/180;
    const dLat=toRad(lat2-lat1),dLng=toRad(lng2-lng1);
    const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    return r*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,a))));
  }
  function missionForToday(){
    if(!isRepUser())return null;
    return mo.missions
      .filter(m=>m.rep_id===state.profile.id&&ymd(m.scheduled_date)===today()&&m.status!=='cancelled')
      .sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||'')))[0]||null;
  }
  function overdueForRep(){
    if(!isRepUser())return null;
    return mo.missions
      .filter(m=>m.rep_id===state.profile.id&&ymd(m.scheduled_date)<today()&&['scheduled','in_progress'].includes(m.status))
      .sort((a,b)=>ymd(b.scheduled_date).localeCompare(ymd(a.scheduled_date)))[0]||null;
  }
  function nextForRep(){
    if(!isRepUser())return null;
    return mo.missions
      .filter(m=>m.rep_id===state.profile.id&&ymd(m.scheduled_date)>today()&&m.status==='scheduled')
      .sort((a,b)=>ymd(a.scheduled_date).localeCompare(ymd(b.scheduled_date)))[0]||null;
  }
  function statusBreakdown(m){
    const rows=mo.links.filter(x=>x.mission_id===m.id);
    const c={active:0,hesitant:0,rejected:0,agreed_pending:0};
    rows.forEach(x=>{if(c[x.customer_status_at_creation]!==undefined)c[x.customer_status_at_creation]++;});
    return c;
  }
  function nextWorkDate(base){
    let d=new Date((base||today())+'T00:00:00Z');
    do{d.setUTCDate(d.getUTCDate()+1);}while(d.getUTCDay()===5);
    return d.toISOString().slice(0,10);
  }
  function workDateOnOrAfter(base){
    let d=new Date((base||today())+'T00:00:00Z');
    if(d.getUTCDay()===5)d.setUTCDate(d.getUTCDate()+1);
    return d.toISOString().slice(0,10);
  }

  async function loadData(force=false){
    if(!state?.profile||!sb)return;
    if(mo.loading&&!force)return;
    const seq=++mo.loadSeq;
    mo.loading=true;
    try{
      const [s,m,l]=await Promise.all([
        sb.from('market_opening_settings').select('enabled,strict_rep_customer_creation,default_radius_m,updated_at').eq('id',true).maybeSingle(),
        sb.from('market_opening_missions').select('id,rep_id,scheduled_date,original_date,city,area_name,target_customers,center_lat,center_lng,radius_m,status,notes,reschedule_count,started_at,completed_at,cancelled_at,created_at,updated_at').order('scheduled_date',{ascending:false}).order('created_at',{ascending:false}),
        sb.from('market_opening_mission_customers').select('mission_id,customer_id,rep_id,customer_status_at_creation,distance_m,created_at').order('created_at',{ascending:false})
      ]);
      if(seq!==mo.loadSeq)return;
      if(s.error)throw s.error;
      if(m.error)throw m.error;
      if(l.error)throw l.error;
      mo.settings=s.data||{enabled:false,strict_rep_customer_creation:false,default_radius_m:2500};
      mo.missions=m.data||[];
      mo.links=l.data||[];
      mo.lastLoadedAt=Date.now();
      renderDashboardSlot();
      if(document.getElementById('marketOpening')?.classList.contains('active'))renderPage();
    }catch(err){
      console.error('market opening load',err);
      const root=document.getElementById('marketOpeningRoot');
      if(root)root.innerHTML='<div class="danger-note">'+safe(tx('تعذر تحميل نظام فتح السوق.','Could not load Market Opening.'))+'</div>';
    }finally{
      if(seq===mo.loadSeq)mo.loading=false;
    }
  }

  function renderDashboardSlot(){
    const slot=document.getElementById('marketOpeningDashboardSlot');
    if(!slot||!state?.profile)return;
    if(!mo.settings?.enabled){
      slot.innerHTML='';
      return;
    }

    if(isRepUser()){
      const m=missionForToday(),over=overdueForRep(),next=nextForRep();
      if(m){
        const done=progress(m),left=remaining(m);
        slot.innerHTML='<div class="card mo-dashboard-card">'+
          '<div class="mo-dashboard-main"><div><span class="mo-eyebrow">'+tx('مهمة فتح السوق اليوم','Today market-opening mission')+'</span>'+
          '<h3>'+safe(m.area_name)+' · '+safe(m.city)+'</h3>'+
          '<div class="small">'+tx('الهدف','Target')+': <b>'+n(m.target_customers)+'</b> · '+tx('أنجزت','Done')+': <b>'+n(done)+'</b> · '+tx('باقي','Remaining')+': <b>'+n(left)+'</b></div></div>'+
          '<div class="mo-dashboard-progress"><strong>'+n(done)+'/'+n(m.target_customers)+'</strong><span>'+pct(m)+'%</span></div></div>'+
          '<div class="mo-progress"><i style="width:'+pct(m)+'%"></i></div>'+
          '<button class="btn good mini" type="button" data-mo-open-page="1">'+tx('فتح المهمة','Open mission')+'</button>'+
        '</div>';
      }else if(over){
        slot.innerHTML='<div class="card mo-dashboard-card overdue"><div><span class="mo-eyebrow">'+tx('مهمة تحتاج إعادة جدولة','Mission needs rescheduling')+'</span><h3>'+safe(over.area_name)+' · '+safe(over.city)+'</h3><div class="small">'+tx('كان موعدها','Was scheduled')+': '+safe(fmtDate(over.scheduled_date))+' · '+tx('راجع الإدارة قبل إضافة عملاء جدد.','Contact management before adding new customers.')+'</div></div><button class="btn secondary mini" type="button" data-mo-open-page="1">'+tx('عرض المهمة','View mission')+'</button></div>';
      }else{
        slot.innerHTML='<div class="card mo-dashboard-card neutral"><div><span class="mo-eyebrow">'+tx('فتح السوق','Market Opening')+'</span><h3>'+tx('لا توجد مهمة محددة لك اليوم','No mission assigned for today')+'</h3>'+(next?'<div class="small">'+tx('المهمة القادمة','Next mission')+': '+safe(next.area_name)+' · '+safe(fmtDate(next.scheduled_date))+'</div>':'')+'</div><button class="btn secondary mini" type="button" data-mo-open-page="1">'+tx('فتح الصفحة','Open page')+'</button></div>';
      }
    }else if(isManagementUser()){
      const rows=mo.missions.filter(m=>ymd(m.scheduled_date)===today()&&m.status!=='cancelled');
      const target=rows.reduce((s,m)=>s+Number(m.target_customers||0),0);
      const done=rows.reduce((s,m)=>s+progress(m),0);
      const overdue=mo.missions.filter(m=>ymd(m.scheduled_date)<today()&&['scheduled','in_progress'].includes(m.status)).length;
      slot.innerHTML='<div class="card mo-dashboard-card management">'+
        '<div><span class="mo-eyebrow">'+tx('فتح السوق اليوم','Market Opening Today')+'</span><h3>'+n(rows.length)+' '+tx('مهام','missions')+'</h3><div class="small">'+tx('المنجز','Done')+' <b>'+n(done)+'</b> / '+tx('الهدف','Target')+' <b>'+n(target)+'</b>'+(overdue?' · '+tx('متأخرة','Overdue')+' <b>'+n(overdue)+'</b>':'')+'</div></div>'+
        '<button class="btn secondary mini" type="button" data-mo-open-page="1">'+tx('إدارة المهام','Manage missions')+'</button>'+
      '</div>';
    }else slot.innerHTML='';
  }

  function renderPage(){
    const root=document.getElementById('marketOpeningRoot');
    if(!root||!state?.profile)return;
    if(!mo.settings){
      root.innerHTML='<div class="card"><div class="small">'+tx('جاري تحميل النظام...','Loading...')+'</div></div>';
      return;
    }
    if(!mo.settings.enabled){
      if(isManagementUser()){
        root.innerHTML='<div class="card mo-disabled-card"><div><span class="mo-eyebrow">'+tx('فتح السوق','Market Opening')+'</span><h2>'+tx('النظام متوقف حالياً','The system is currently disabled')+'</h2><p>'+tx('البيانات والمهام السابقة محفوظة، والخريطة الأصلية للموقع لم تتغير. تقدر تشغله مرة ثانية بدون فقدان شيء.','Previous missions and data are preserved, and the original customer map is unchanged. You can re-enable the system without losing anything.')+'</p></div><button class="btn good" type="button" data-mo-enable="1">'+tx('تشغيل النظام','Enable system')+'</button></div>';
        bindPageControls();
      }else{
        root.innerHTML='<div class="card"><div class="notice"><b>'+tx('نظام فتح السوق متوقف حالياً.','Market Opening is currently disabled.')+'</b></div></div>';
      }
      destroyMap();
      return;
    }
    root.innerHTML=isManagementUser()?managementHtml():repHtml();
    bindPageControls();
    const candidate=isManagementUser()?selectedManagementMission():missionForToday();
    if(candidate){
      mo.selectedMissionId=candidate.id;
      setTimeout(()=>renderMissionMap(candidate),60);
    }else destroyMap();
  }

  function repHtml(){
    const m=missionForToday(),over=overdueForRep(),next=nextForRep();
    let hero='';
    if(m){
      const done=progress(m),left=remaining(m),b=statusBreakdown(m);
      hero='<div class="mo-hero '+statusClass(m)+'">'+
        '<div class="mo-hero-head"><div><span class="mo-eyebrow">'+tx('مهمتك اليوم','Your mission today')+'</span><h2>'+safe(m.area_name)+'</h2><div class="mo-hero-city">'+safe(m.city)+' · '+safe(fmtDate(m.scheduled_date))+'</div></div>'+
        '<div class="mo-big-count"><strong>'+n(done)+'</strong><span>/ '+n(m.target_customers)+'</span></div></div>'+
        '<div class="mo-progress large"><i style="width:'+pct(m)+'%"></i></div>'+
        '<div class="mo-kpis"><div><span>'+tx('أنجزت','Done')+'</span><b>'+n(done)+'</b></div><div><span>'+tx('باقي','Remaining')+'</span><b>'+n(left)+'</b></div><div><span>'+tx('نطاق المهمة','Mission radius')+'</span><b>'+n(Math.round(m.radius_m/100)/10)+' كم</b></div><div><span>'+tx('الحالة','Status')+'</span><b>'+safe(statusText(m))+'</b></div></div>'+
        '<div class="mo-status-breakdown"><span>'+tx('يُحسب ضمن الهدف','Counts toward target')+':</span><b>'+tx('نشط','Active')+' '+n(b.active)+'</b><b>'+tx('متردد','Hesitant')+' '+n(b.hesitant)+'</b><b>'+tx('رافض','Rejected')+' '+n(b.rejected)+'</b><b>'+tx('متفق','Agreed')+' '+n(b.agreed_pending)+'</b></div>'+
        (m.notes?'<div class="mo-mission-note"><b>'+tx('ملاحظة الإدارة','Management note')+':</b> '+safe(m.notes)+'</div>':'')+
        '<div class="mo-hero-actions">'+
          (m.status==='scheduled'?'<button class="btn" type="button" data-mo-start="'+safe(m.id)+'">'+tx('ابدأ المهمة','Start mission')+'</button>':'')+
          '<button class="btn good" type="button" data-mo-add-customer="1">'+(m.status==='completed'?tx('إضافة عميل آخر','Add another customer'):tx('إضافة عميل جديد','Add new customer'))+'</button>'+
        '</div>'+
      '</div>';
    }else if(over){
      hero='<div class="mo-hero mo-status-overdue"><span class="mo-eyebrow">'+tx('لم تُنفذ المهمة في موعدها','Mission was not completed on its date')+'</span><h2>'+safe(over.area_name)+' · '+safe(over.city)+'</h2><p>'+tx('لا يتم نقلها تلقائياً حتى لا تتغير خطة الإدارة. الإدارة تستطيع تأجيلها لك مع الحفاظ على التقدم الحالي.','It is not moved automatically. Management can reschedule it while preserving current progress.')+'</p><div class="mo-big-count inline"><strong>'+n(progress(over))+'</strong><span>/ '+n(over.target_customers)+'</span></div></div>';
    }else{
      hero='<div class="mo-hero neutral"><span class="mo-eyebrow">'+tx('فتح السوق','Market Opening')+'</span><h2>'+tx('ما عندك مهمة اليوم','No mission assigned today')+'</h2><p>'+tx('إضافة عميل جديد من حساب المندوب تتطلب مهمة محددة لليوم.','A representative needs a mission for today before adding a new customer.')+'</p>'+(next?'<div class="notice">'+tx('مهمتك القادمة','Next mission')+': <b>'+safe(next.area_name)+' · '+safe(next.city)+'</b> — '+safe(fmtDate(next.scheduled_date))+'</div>':'')+'</div>';
    }
    return '<div class="mo-page">'+hero+
      '<div class="card mo-map-card"><div class="dashboard-head"><div><h3>'+tx('خريطة المهمة','Mission map')+'</h3><div class="small">'+tx('الدائرة تحدد المنطقة المسموح تسجيل العملاء داخلها. العملاء الموجودون مسبقاً يظهرون لتجنب التكرار.','The circle is the allowed zone. Existing customers are shown to avoid duplicates.')+'</div></div><span class="badge b-info" id="moMapCount">0</span></div><div id="marketOpeningMap" class="mo-map"></div><div id="moMapLegend" class="mo-map-legend"></div></div>'+
    '</div>';
  }

  function managementHtml(){
    const filterDate=document.getElementById('moDateFilter')?.value||today();
    const filterRep=document.getElementById('moRepFilter')?.value||'';
    const dateRows=mo.missions.filter(m=>ymd(m.scheduled_date)===filterDate&&m.status!=='cancelled'&&(!filterRep||m.rep_id===filterRep));
    const overdue=mo.missions.filter(m=>ymd(m.scheduled_date)<today()&&['scheduled','in_progress'].includes(m.status)&&(!filterRep||m.rep_id===filterRep));
    const target=dateRows.reduce((s,m)=>s+Number(m.target_customers||0),0);
    const done=dateRows.reduce((s,m)=>s+progress(m),0);
    const complete=dateRows.filter(m=>m.status==='completed').length;
    const notStarted=dateRows.filter(m=>m.status==='scheduled').length;

    const repOptionsHtml='<option value="">'+tx('كل المناديب','All representatives')+'</option>'+state.profiles.filter(p=>p.role==='rep').map(p=>'<option value="'+safe(p.id)+'" '+(p.id===filterRep?'selected':'')+'>'+safe(p.full_name)+'</option>').join('');

    return '<div class="mo-page management">'+
      '<div class="card mo-management-head"><div><span class="mo-eyebrow">'+tx('إدارة فتح السوق','Market Opening Management')+'</span><h2>'+tx('وزّع المنطقة والهدف، والنظام يتابع التنفيذ','Assign the zone and target; the system tracks execution')+'</h2></div><div class="mo-management-actions"><button class="btn" type="button" data-mo-new="1">+ '+tx('مهمة جديدة','New mission')+'</button><button class="btn secondary" type="button" data-mo-disable="1">'+tx('إيقاف النظام','Disable system')+'</button></div></div>'+
      '<div class="toolbar mo-toolbar"><input type="date" id="moDateFilter" value="'+safe(filterDate)+'"><select id="moRepFilter">'+repOptionsHtml+'</select></div>'+
      '<div class="grid cards mo-summary"><div class="card metric-card"><div class="label">'+tx('المهام','Missions')+'</div><div class="metric">'+n(dateRows.length)+'</div></div><div class="card metric-card"><div class="label">'+tx('الهدف','Target')+'</div><div class="metric">'+n(target)+'</div></div><div class="card metric-card"><div class="label">'+tx('المنجز','Done')+'</div><div class="metric">'+n(done)+'</div></div><div class="card metric-card"><div class="label">'+tx('مكتملة','Completed')+'</div><div class="metric">'+n(complete)+'</div></div><div class="card metric-card"><div class="label">'+tx('لم تبدأ','Not started')+'</div><div class="metric">'+n(notStarted)+'</div></div></div>'+
      (overdue.length?'<div class="card mo-overdue-box"><div class="dashboard-head"><div><h3>'+tx('مهام فات موعدها','Overdue missions')+'</h3><div class="small">'+tx('لا تنتقل تلقائياً؛ أجّلها للموعد المناسب.','They do not roll over automatically; reschedule them explicitly.')+'</div></div><span class="attention-count">'+n(overdue.length)+'</span></div><div class="mo-mission-list">'+overdue.map(m=>missionCard(m,true)).join('')+'</div></div>':'')+
      '<div class="card"><div class="dashboard-head"><div><h3>'+tx('مهام اليوم المحدد','Missions for selected date')+'</h3><div class="small">'+safe(fmtDate(filterDate))+'</div></div></div><div class="mo-mission-list">'+(dateRows.length?dateRows.map(m=>missionCard(m,false)).join(''):'<div class="empty">'+tx('لا توجد مهام في هذا اليوم.','No missions on this date.')+'</div>')+'</div></div>'+
      '<div class="card mo-map-card"><div class="dashboard-head"><div><h3>'+tx('خريطة المهمة المحددة','Selected mission map')+'</h3><div class="small" id="moSelectedMissionText">'+tx('اختر «عرض الخريطة» من إحدى المهام.','Choose “View map” on a mission.')+'</div></div><span class="badge b-info" id="moMapCount">0</span></div><div id="moIntegrityBox"></div><div id="marketOpeningMap" class="mo-map"></div><div id="moMapLegend" class="mo-map-legend"></div></div>'+
    '</div>';
  }

  function missionCard(m,isOverdue){
    const done=progress(m),left=remaining(m);
    return '<div class="mo-mission-card '+statusClass(m)+'" data-mo-mission-card="'+safe(m.id)+'">'+
      '<div class="mo-mission-top"><div><b>'+safe(repName(m.rep_id))+'</b><h4>'+safe(m.area_name)+' · '+safe(m.city)+'</h4><div class="small">'+safe(fmtDate(m.scheduled_date))+(m.reschedule_count?' · '+tx('تأجلت','Rescheduled')+' '+n(m.reschedule_count)+'×':'')+'</div></div><span class="mo-status-pill">'+safe(statusText(m))+'</span></div>'+
      '<div class="mo-mini-progress"><div><span>'+tx('الهدف','Target')+'</span><b>'+n(m.target_customers)+'</b></div><div><span>'+tx('المنجز','Done')+'</span><b>'+n(done)+'</b></div><div><span>'+tx('الباقي','Remaining')+'</span><b>'+n(left)+'</b></div><div><span>'+tx('النطاق','Radius')+'</span><b>'+n(Math.round(m.radius_m/100)/10)+' كم</b></div></div>'+
      '<div class="mo-progress"><i style="width:'+pct(m)+'%"></i></div>'+
      '<div class="mo-card-actions"><button class="btn secondary mini" type="button" data-mo-map="'+safe(m.id)+'">'+tx('عرض الخريطة','View map')+'</button><button class="btn secondary mini" type="button" data-mo-history="'+safe(m.id)+'">'+tx('السجل','History')+'</button>'+
      ((!['completed','cancelled'].includes(m.status))?'<button class="btn secondary mini" type="button" data-mo-edit="'+safe(m.id)+'">'+tx('تعديل','Edit')+'</button><button class="btn warn mini" type="button" data-mo-reschedule="'+safe(m.id)+'">'+tx('تأجيل','Reschedule')+'</button><button class="btn bad mini" type="button" data-mo-cancel="'+safe(m.id)+'">'+tx('إلغاء','Cancel')+'</button>':'')+'</div>'+
    '</div>';
  }

  function selectedManagementMission(){
    if(!isManagementUser())return null;
    let m=mo.missions.find(x=>x.id===mo.selectedMissionId);
    if(m)return m;
    const filterDate=document.getElementById('moDateFilter')?.value||today();
    const filterRep=document.getElementById('moRepFilter')?.value||'';
    return mo.missions.find(x=>ymd(x.scheduled_date)===filterDate&&x.status!=='cancelled'&&(!filterRep||x.rep_id===filterRep))||null;
  }

  function bindPageControls(){
    const root=document.getElementById('marketOpeningRoot');
    if(!root)return;
    root.onclick=async e=>{
      let b=e.target.closest('[data-mo-enable]');if(b){await setSystemEnabled(true);return;}
      b=e.target.closest('[data-mo-disable]');if(b){await setSystemEnabled(false);return;}
      b=e.target.closest('[data-mo-new]');if(b){openMissionForm();return;}
      b=e.target.closest('[data-mo-history]');if(b){const m=mo.missions.find(x=>x.id===b.dataset.moHistory);if(m)await openMissionHistory(m);return;}
      b=e.target.closest('[data-mo-start]');if(b){await startMission(b.dataset.moStart);return;}
      b=e.target.closest('[data-mo-add-customer]');if(b){openCustomerForm();return;}
      b=e.target.closest('[data-mo-map]');if(b){mo.selectedMissionId=b.dataset.moMap;const m=mo.missions.find(x=>x.id===mo.selectedMissionId);if(m)renderMissionMap(m);return;}
      b=e.target.closest('[data-mo-edit]');if(b){const m=mo.missions.find(x=>x.id===b.dataset.moEdit);if(m)openMissionForm(m);return;}
      b=e.target.closest('[data-mo-reschedule]');if(b){const m=mo.missions.find(x=>x.id===b.dataset.moReschedule);if(m)openReschedule(m);return;}
      b=e.target.closest('[data-mo-cancel]');if(b){const m=mo.missions.find(x=>x.id===b.dataset.moCancel);if(m)openCancel(m);return;}
    };
    const df=document.getElementById('moDateFilter'),rf=document.getElementById('moRepFilter');
    if(df)df.onchange=()=>{mo.selectedMissionId=null;renderPage();};
    if(rf)rf.onchange=()=>{mo.selectedMissionId=null;renderPage();};
  }

  async function startMission(id){
    const {data,error}=await sb.rpc('start_market_mission',{p_mission_id:id});
    if(error)return flash(tx('تعذر بدء المهمة: ','Could not start mission: ')+error.message,true);
    if(data!==true)return flash(tx('المهمة غير موجودة.','Mission not found.'),true);
    flash(tx('بدأت المهمة.','Mission started.'));
    await loadData(true);
  }

  function missionFormHtml(m){
    const editing=!!m;
    const reps=state.profiles.filter(p=>p.role==='rep');
    const defaultDate=m?.scheduled_date||today();
    const radius=Number(m?.radius_m||mo.settings?.default_radius_m||2500);
    const radiusOptions=[500,1000,1500,2000,2500,3000,4000,5000,7500,10000];
    if(!radiusOptions.includes(radius))radiusOptions.push(radius);
    radiusOptions.sort((a,b)=>a-b);
    return '<div class="form-grid mo-mission-form">'+
      (editing?'<div class="full notice"><b>'+safe(repName(m.rep_id))+'</b> · '+safe(fmtDate(m.scheduled_date))+'<br>'+tx('تعديل المنطقة أو الهدف لا يغير المندوب أو تاريخ المهمة.','Editing the zone or target does not change the representative or mission date.')+'</div>':
      '<div><label>'+tx('المندوب','Representative')+'</label><select id="moFRep"><option value="">'+tx('اختر المندوب...','Choose representative...')+'</option>'+reps.map(p=>'<option value="'+safe(p.id)+'">'+safe(p.full_name)+'</option>').join('')+'</select></div><div><label>'+tx('التاريخ','Date')+'</label><input type="date" id="moFDate" value="'+safe(defaultDate)+'" min="'+safe(today())+'"></div>')+
      '<div><label>'+tx('المدينة','City')+'</label><input id="moFCity" value="'+safe(m?.city||'الرياض')+'" autocomplete="off"></div>'+
      '<div><label>'+tx('الحي / المنطقة','District / Area')+'</label><input id="moFArea" value="'+safe(m?.area_name||'')+'" autocomplete="off" placeholder="'+tx('مثال: المونسية','e.g. Al Munsiyah')+'"></div>'+
      '<div><label>'+tx('هدف العملاء الجدد','New-customer target')+'</label><input type="number" id="moFTarget" min="1" max="50" step="1" value="'+safe(m?.target_customers||6)+'"></div>'+
      '<div><label>'+tx('نطاق المنطقة','Zone radius')+'</label><select id="moFRadius">'+radiusOptions.map(v=>'<option value="'+v+'" '+(v===radius?'selected':'')+'>'+((v/1000).toFixed(v<1000?1:0))+' km</option>').join('')+'</select></div>'+
      '<div class="full"><label>'+tx('ملاحظة للمندوب (اختياري)','Note to representative (optional)')+'</label><textarea id="moFNotes" rows="2">'+safe(m?.notes||'')+'</textarea></div>'+
      '<div class="full"><label>'+tx('حدد منطقة العمل على الخريطة','Select the work zone on the map')+'</label><div class="small">'+tx('اضغط وسط المنطقة. الدائرة هي الحدود التي يسمح النظام بتسجيل العملاء الجدد داخلها.','Tap the center of the area. The circle is where new customers may be registered.')+'</div><div id="marketMissionPickerMap" class="mo-picker-map"></div><input type="hidden" id="moFLat" value="'+safe(m?.center_lat??'')+'"><input type="hidden" id="moFLng" value="'+safe(m?.center_lng??'')+'"><div id="moFLocationText" class="small mo-picker-status"></div></div>'+
      '<div class="full"><button class="btn" type="button" id="moFSave">'+(editing?tx('حفظ التعديل','Save changes'):tx('إنشاء المهمة','Create mission'))+'</button></div>'+
    '</div>';
  }

  function openMissionForm(m=null){
    if(!isManagementUser())return;
    openModal(m?tx('تعديل مهمة فتح السوق','Edit Market Opening Mission'):tx('مهمة فتح سوق جديدة','New Market Opening Mission'),missionFormHtml(m));
    setTimeout(()=>{
      initMissionPicker(m);
      document.getElementById('moFRadius')?.addEventListener('change',updatePickerCircle);
      document.getElementById('moFSave')?.addEventListener('click',()=>saveMissionForm(m));
    },80);
  }

  function initMissionPicker(m){
    const el=document.getElementById('marketMissionPickerMap');
    if(!el||!window.L)return;
    if(mo.pickerMap){try{mo.pickerMap.remove()}catch(_){}}
    mo.pickerMap=null;mo.pickerMarker=null;mo.pickerCircle=null;
    const center=m?[Number(m.center_lat),Number(m.center_lng)]:[24.7136,46.6753];
    mo.pickerMap=L.map(el,{zoomControl:true}).setView(center,m?13:11);
    addBaseMap(mo.pickerMap);
    mo.pickerMap.on('click',e=>setPickerCenter(e.latlng.lat,e.latlng.lng,true));
    if(m)setPickerCenter(center[0],center[1],false);
    setTimeout(()=>mo.pickerMap?.invalidateSize(),120);
  }

  function setPickerCenter(lat,lng,pan){
    document.getElementById('moFLat').value=Number(lat).toFixed(6);
    document.getElementById('moFLng').value=Number(lng).toFixed(6);
    const ll=[Number(lat),Number(lng)];
    if(!mo.pickerMarker)mo.pickerMarker=L.marker(ll,{draggable:true}).addTo(mo.pickerMap);
    else mo.pickerMarker.setLatLng(ll);
    mo.pickerMarker.off('dragend').on('dragend',e=>{const p=e.target.getLatLng();setPickerCenter(p.lat,p.lng,false);});
    updatePickerCircle();
    if(pan)mo.pickerMap.panTo(ll);
    const box=document.getElementById('moFLocationText');
    if(box)box.textContent=tx('تم تحديد مركز المنطقة.','Zone center selected.')+' '+Number(lat).toFixed(5)+', '+Number(lng).toFixed(5);
  }

  function updatePickerCircle(){
    if(!mo.pickerMap)return;
    const lat=Number(document.getElementById('moFLat')?.value),lng=Number(document.getElementById('moFLng')?.value),radius=Number(document.getElementById('moFRadius')?.value||2500);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
    if(mo.pickerCircle)mo.pickerCircle.remove();
    mo.pickerCircle=L.circle([lat,lng],{radius,weight:2,fillOpacity:.08}).addTo(mo.pickerMap);
  }

  async function saveMissionForm(existing){
    const city=document.getElementById('moFCity')?.value.trim()||'';
    const area=document.getElementById('moFArea')?.value.trim()||'';
    const target=Number(document.getElementById('moFTarget')?.value||0);
    const radius=Number(document.getElementById('moFRadius')?.value||0);
    const lat=Number(document.getElementById('moFLat')?.value),lng=Number(document.getElementById('moFLng')?.value);
    const notes=document.getElementById('moFNotes')?.value.trim()||null;
    if(city.length<2)return flash(tx('اكتب المدينة.','Enter the city.'),true);
    if(area.length<2)return flash(tx('اكتب الحي أو المنطقة.','Enter the area.'),true);
    if(!(target>=1&&target<=50))return flash(tx('الهدف يجب أن يكون من 1 إلى 50.','Target must be between 1 and 50.'),true);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return flash(tx('حدد المنطقة على الخريطة.','Select the zone on the map.'),true);

    const btn=document.getElementById('moFSave');if(btn)btn.disabled=true;
    let res;
    if(existing){
      res=await sb.rpc('admin_update_market_mission',{
        p_mission_id:existing.id,p_city:city,p_area_name:area,p_target_customers:target,
        p_center_lat:lat,p_center_lng:lng,p_radius_m:radius,p_notes:notes
      });
    }else{
      const rep=document.getElementById('moFRep')?.value||'';
      const date=document.getElementById('moFDate')?.value||'';
      if(!rep){if(btn)btn.disabled=false;return flash(tx('اختر المندوب.','Choose representative.'),true);}
      if(!date){if(btn)btn.disabled=false;return flash(tx('اختر التاريخ.','Choose the date.'),true);}
      const dow=new Date(date+'T00:00:00Z').getUTCDay();
      if(dow===5){if(btn)btn.disabled=false;return flash(tx('الجمعة ليس يوم عمل.','Friday is not a working day.'),true);}
      res=await sb.rpc('admin_create_market_mission',{
        p_rep_id:rep,p_scheduled_date:date,p_city:city,p_area_name:area,p_target_customers:target,
        p_center_lat:lat,p_center_lng:lng,p_radius_m:radius,p_notes:notes
      });
    }
    if(btn)btn.disabled=false;
    if(res.error)return flash(tx('تعذر حفظ المهمة: ','Could not save mission: ')+friendlyError(res.error.message),true);
    closeModal();cleanupPicker();flash(existing?tx('تم تعديل المهمة.','Mission updated.'):tx('تم إنشاء المهمة.','Mission created.'));
    await loadData(true);
  }

  function openReschedule(m){
    const suggested=ymd(m.scheduled_date)<today()?workDateOnOrAfter(today()):nextWorkDate(ymd(m.scheduled_date));
    openModal(tx('تأجيل مهمة فتح السوق','Reschedule Market Opening Mission'),
      '<div class="form-grid"><div class="full notice"><b>'+safe(repName(m.rep_id))+'</b> · '+safe(m.area_name)+'<br>'+tx('التقدم الحالي محفوظ','Current progress is preserved')+': '+n(progress(m))+'/'+n(m.target_customers)+'</div><div><label>'+tx('التاريخ الجديد','New date')+'</label><input type="date" id="moRDate" min="'+safe(today())+'" value="'+safe(suggested)+'"></div><div class="full"><label>'+tx('سبب التأجيل','Reason')+'</label><textarea id="moRReason" rows="3"></textarea></div><div class="full"><button class="btn warn" id="moRSave" type="button">'+tx('تأكيد التأجيل','Confirm reschedule')+'</button></div></div>');
    document.getElementById('moRSave').onclick=async()=>{
      const date=document.getElementById('moRDate').value,reason=document.getElementById('moRReason').value.trim();
      if(!date)return flash(tx('اختر التاريخ الجديد.','Choose the new date.'),true);
      if(new Date(date+'T00:00:00Z').getUTCDay()===5)return flash(tx('الجمعة ليس يوم عمل.','Friday is not a working day.'),true);
      if(reason.length<3)return flash(tx('اكتب سبب التأجيل.','Enter the reschedule reason.'),true);
      const {data,error}=await sb.rpc('admin_reschedule_market_mission',{p_mission_id:m.id,p_new_date:date,p_reason:reason});
      if(error)return flash(tx('تعذر التأجيل: ','Could not reschedule: ')+friendlyError(error.message),true);
      if(data!==true)return flash(tx('المهمة غير موجودة.','Mission not found.'),true);
      closeModal();flash(tx('تم تأجيل المهمة وحفظ التقدم.','Mission rescheduled and progress preserved.'));await loadData(true);
    };
  }

  function openCancel(m){
    openModal(tx('إلغاء مهمة فتح السوق','Cancel Market Opening Mission'),
      '<div class="form-grid"><div class="full danger-note"><b>'+safe(repName(m.rep_id))+' · '+safe(m.area_name)+'</b><br>'+tx('الإلغاء يوقف المهمة لكنه لا يحذف سجلها أو العملاء الذين تم تسجيلهم.','Cancellation stops the mission but keeps its history and registered customers.')+'</div><div class="full"><label>'+tx('سبب الإلغاء','Reason')+'</label><textarea id="moCReason" rows="3"></textarea></div><div class="full"><button class="btn bad" id="moCSave" type="button">'+tx('تأكيد الإلغاء','Confirm cancellation')+'</button></div></div>');
    document.getElementById('moCSave').onclick=async()=>{
      const reason=document.getElementById('moCReason').value.trim();
      if(reason.length<3)return flash(tx('اكتب سبب الإلغاء.','Enter the cancellation reason.'),true);
      const {data,error}=await sb.rpc('admin_cancel_market_mission',{p_mission_id:m.id,p_reason:reason});
      if(error)return flash(tx('تعذر الإلغاء: ','Could not cancel: ')+friendlyError(error.message),true);
      if(data!==true)return flash(tx('المهمة غير موجودة.','Mission not found.'),true);
      closeModal();flash(tx('تم إلغاء المهمة.','Mission cancelled.'));await loadData(true);
    };
  }

  async function setSystemEnabled(enabled){
    if(!isManagementUser())return;
    if(!enabled){
      const ok=window.confirm(tx('إيقاف النظام؟ لن نحذف أي مهمة أو عميل، وسترجع إضافة العملاء للوضع العادي إلى أن تعيد تشغيله.','Disable the system? No missions or customers will be deleted, and customer creation will return to normal until you enable it again.'));
      if(!ok)return;
    }
    const {data,error}=await sb.rpc('admin_set_market_opening_enabled',{p_enabled:!!enabled});
    if(error)return flash(tx('تعذر تغيير حالة النظام: ','Could not change system status: ')+error.message,true);
    if(data!==true)return flash(tx('تعذر تغيير حالة النظام.','Could not change system status.'),true);
    flash(enabled?tx('تم تشغيل نظام فتح السوق.','Market Opening enabled.'):tx('تم إيقاف نظام فتح السوق مع حفظ كل البيانات.','Market Opening disabled; all data was preserved.'));
    await loadData(true);
  }

  function eventLabel(k){
    const a={created:'إنشاء المهمة',started:'بدء المهمة',rescheduled:'تأجيل المهمة',edited:'تعديل المهمة',customer_counted:'احتساب عميل',completed:'إكمال الهدف',cancelled:'إلغاء المهمة',enabled:'تشغيل النظام',disabled:'إيقاف النظام'};
    const e={created:'Mission created',started:'Mission started',rescheduled:'Mission rescheduled',edited:'Mission edited',customer_counted:'Customer counted',completed:'Target completed',cancelled:'Mission cancelled',enabled:'System enabled',disabled:'System disabled'};
    return (ar()?a:e)[k]||k||'-';
  }

  async function openMissionHistory(m){
    if(!isManagementUser())return;
    const {data,error}=await sb.from('market_opening_mission_events')
      .select('id,event_type,actor_id,old_date,new_date,reason,details,created_at')
      .eq('mission_id',m.id)
      .order('created_at',{ascending:false})
      .limit(100);
    if(error)return flash(tx('تعذر تحميل سجل المهمة.','Could not load mission history.'),true);
    const rows=data||[];
    const html='<div class="notice"><b>'+safe(repName(m.rep_id))+' · '+safe(m.area_name)+'</b><br>'+safe(fmtDate(m.scheduled_date))+' · '+tx('التقدم الحالي','Current progress')+' '+n(progress(m))+'/'+n(m.target_customers)+'</div>'+
      '<div class="mo-history-list">'+(rows.length?rows.map(x=>{
        const actor=state.profiles?.find(p=>p.id===x.actor_id)?.full_name||'-';
        const dates=(x.old_date||x.new_date)?'<span>'+safe(x.old_date||'-')+(x.new_date?' → '+safe(x.new_date):'')+'</span>':'';
        const customerId=x.details?.customer_id?'<span>'+tx('عميل #','Customer #')+safe(x.details.customer_id)+'</span>':'';
        return '<div class="mo-history-item"><div><b>'+safe(eventLabel(x.event_type))+'</b><small>'+safe(typeof dateTime==='function'?dateTime(x.created_at):x.created_at)+' · '+safe(actor)+'</small></div><div class="mo-history-meta">'+dates+customerId+(x.reason?'<span>'+safe(x.reason)+'</span>':'')+'</div></div>';
      }).join(''):'<div class="empty">'+tx('لا يوجد سجل.','No history.')+'</div>')+'</div>';
    openModal(tx('سجل مهمة فتح السوق','Market Opening Mission History'),html);
  }

  function cleanupPicker(){
    if(mo.pickerMap){try{mo.pickerMap.remove()}catch(_){}}
    mo.pickerMap=null;mo.pickerMarker=null;mo.pickerCircle=null;
  }

  function friendlyError(msg){
    const m=String(msg||'');
    const dict={
      'representative already has a mission on this date':tx('المندوب عنده مهمة في هذا اليوم.','Representative already has a mission on this date.'),
      'representative has overdue mission':tx('عند المندوب مهمة قديمة لم تُغلق. أجّلها أو ألغها أولاً قبل إنشاء مهمة جديدة.','The representative has an unfinished overdue mission. Reschedule or cancel it before creating a new one.'),
      'friday is not a working day':tx('الجمعة ليس يوم عمل.','Friday is not a working day.'),
      'mission date cannot be in the past':tx('لا يمكن اختيار تاريخ سابق.','Mission date cannot be in the past.'),
      'new date cannot be in the past':tx('لا يمكن اختيار تاريخ سابق.','New date cannot be in the past.'),
      'closed mission cannot be rescheduled':tx('المهمة مغلقة ولا يمكن تأجيلها.','Closed mission cannot be rescheduled.'),
      'closed mission cannot be edited':tx('المهمة مغلقة ولا يمكن تعديلها.','Closed mission cannot be edited.'),
      'target cannot be below achieved customers':tx('لا يمكن جعل الهدف أقل من عدد العملاء المنجزين.','Target cannot be below achieved customers.'),
      'zone cannot change after customer progress':tx('بعد تسجيل أول عميل لا يمكن تغيير مركز المنطقة أو نصف القطر. تقدر تعدل الاسم والهدف أو تؤجل المهمة.','After the first customer is counted, the zone center and radius cannot be changed. You can still edit the label, target, or reschedule the mission.')
    };
    return dict[m]||m;
  }

  async function renderMissionMap(m){
    const el=document.getElementById('marketOpeningMap');
    if(!el||!window.L||!m)return;
    mo.selectedMissionId=m.id;
    destroyMap();
    el.innerHTML='';
    mo.map=L.map(el,{zoomControl:true}).setView([Number(m.center_lat),Number(m.center_lng)],13);
    addBaseMap(mo.map);
    const circle=L.circle([Number(m.center_lat),Number(m.center_lng)],{radius:Number(m.radius_m),weight:3,fillOpacity:.06}).addTo(mo.map);
    const center=L.circleMarker([Number(m.center_lat),Number(m.center_lng)],{radius:5,weight:2,fillOpacity:1}).addTo(mo.map);
    center.bindTooltip(safe(m.area_name));
    mo.map.fitBounds(circle.getBounds(),{padding:[20,20]});

    const text=document.getElementById('moSelectedMissionText');
    if(text)text.textContent=repName(m.rep_id)+' · '+m.area_name+' · '+m.city+' · '+fmtDate(m.scheduled_date);

    const [pointsRes,integrityRes]=await Promise.all([
      sb.rpc('market_opening_map_points',{p_mission_id:m.id}),
      isManagementUser()?sb.rpc('market_opening_mission_integrity',{p_mission_id:m.id}):Promise.resolve({data:null,error:null})
    ]);
    if(pointsRes.error){
      document.getElementById('moMapLegend').textContent=tx('تعذر تحميل العملاء على الخريطة.','Could not load customers on the map.');
      return;
    }
    mo.mapPoints=pointsRes.data||[];
    if(isManagementUser()){
      const box=document.getElementById('moIntegrityBox');
      const q=integrityRes?.data?.[0]||null;
      if(box){
        if(integrityRes?.error){
          box.innerHTML='<div class="small mo-integrity neutral">'+tx('تعذر فحص مؤشرات التحقق الآن.','Integrity indicators are temporarily unavailable.')+'</div>';
        }else if(q){
          const repeated=Number(q.repeated_location_groups||0),rapid=Number(q.rapid_entry_pairs||0),outside=Number(q.outside_zone_rows||0);
          const warning=repeated>0||rapid>0||outside>0;
          box.innerHTML='<div class="mo-integrity '+(warning?'warn':'ok')+'"><b>'+(warning?tx('مراجعة سريعة مطلوبة','Quick review suggested'):tx('مؤشرات التسجيل طبيعية','Registration indicators look normal'))+'</b><span>'+tx('عملاء محسوبون','Counted')+': '+n(q.counted_customers)+' · '+tx('مواقع متكررة','Repeated locations')+': '+n(repeated)+' · '+tx('إدخالات سريعة','Rapid entries')+': '+n(rapid)+' · '+tx('خارج النطاق','Outside zone')+': '+n(outside)+'</span></div>';
        }else box.innerHTML='';
      }
    }
    let missionCount=0,existingCount=0;
    mo.mapPoints.forEach(p=>{
      const isNew=!!p.is_mission_customer;
      if(isNew)missionCount++;else existingCount++;
      const marker=L.circleMarker([Number(p.lat),Number(p.lng)],{
        radius:isNew?8:6,
        weight:isNew?3:1,
        fillOpacity:isNew?.9:.55,
        color:isNew?'#047857':'#64748b',
        fillColor:isNew?'#10b981':'#cbd5e1'
      }).addTo(mo.map);
      marker.bindPopup('<b>'+safe(p.customer_name)+'</b><br>'+safe(typeof statusLabel==='function'?statusLabel(p.customer_status):p.customer_status)+'<br>'+safe(isNew?tx('عميل محسوب في المهمة','Counted in mission'):tx('عميل موجود مسبقاً','Existing customer')));
    });
    const count=document.getElementById('moMapCount');if(count)count.textContent=n(mo.mapPoints.length);
    const legend=document.getElementById('moMapLegend');
    if(legend)legend.innerHTML='<span><i class="new"></i>'+tx('عملاء المهمة','Mission customers')+' <b>'+n(missionCount)+'</b></span><span><i class="existing"></i>'+tx('موجودون مسبقاً داخل النطاق','Existing in zone')+' <b>'+n(existingCount)+'</b></span><span>'+tx('نطاق','Radius')+': <b>'+n(Math.round(m.radius_m/100)/10)+' كم</b></span>';
    setTimeout(()=>mo.map?.invalidateSize(),80);
  }

  function destroyMap(){
    if(mo.map){try{mo.map.remove()}catch(_){}}
    mo.map=null;
  }

  function attachCustomerForm(){
    if(!isRepUser()||!mo.settings?.enabled||!mo.settings?.strict_rep_customer_creation)return;
    const form=document.querySelector('#modalContent .form-grid');
    if(!form)return;
    const existing=document.getElementById('moCustomerMissionNotice');if(existing)existing.remove();
    const m=missionForToday();
    const notice=document.createElement('div');
    notice.id='moCustomerMissionNotice';
    notice.className='full mo-customer-mission-notice';
    if(!m){
      const over=overdueForRep();
      notice.innerHTML='<b>'+tx('لا يمكن إضافة عميل جديد الآن','New customer cannot be added now')+'</b><div>'+safe(over?tx('عندك مهمة فات موعدها وتحتاج الإدارة تأجلها لك.','You have an overdue mission that management needs to reschedule.'):tx('ما عندك مهمة فتح سوق محددة لليوم.','You do not have a market-opening mission for today.'))+'</div>';
      form.prepend(notice);
      const save=document.getElementById('saveCustomerBtn');if(save)save.disabled=true;
      return;
    }
    notice.classList.add('ok');
    notice.innerHTML='<b>'+tx('مهمة فتح السوق','Market-opening mission')+': '+safe(m.area_name)+' · '+safe(m.city)+'</b><div>'+tx('اختر موقع العميل داخل الدائرة المحددة. جميع الحالات الأولية تُحسب في الهدف.','Choose the customer location inside the mission circle. All initial statuses count toward the target.')+'</div><div id="moCustomerZoneStatus" class="small"></div>';
    form.prepend(notice);
    const area=document.getElementById('fArea');if(area&&!area.value)area.value=m.area_name;
    const save=document.getElementById('saveCustomerBtn');if(save)save.disabled=true;

    if(state.pickerMap&&window.L){
      const circle=L.circle([Number(m.center_lat),Number(m.center_lng)],{radius:Number(m.radius_m),weight:3,fillOpacity:.06}).addTo(state.pickerMap);
      state.pickerMap.fitBounds(circle.getBounds(),{padding:[15,15]});
    }
  }

  function customerLocationChanged(lat,lng){
    if(!isRepUser()||!mo.settings?.enabled||!mo.settings?.strict_rep_customer_creation)return;
    const m=missionForToday(),save=document.getElementById('saveCustomerBtn'),box=document.getElementById('moCustomerZoneStatus');
    if(!m){if(save)save.disabled=true;return;}
    const dist=haversine(Number(m.center_lat),Number(m.center_lng),Number(lat),Number(lng));
    const inside=dist<=Number(m.radius_m);
    if(save)save.disabled=!inside;
    if(box){
      box.className='small '+(inside?'ok':'bad');
      box.textContent=inside
        ?tx('الموقع داخل منطقة المهمة — يُسمح بالحفظ.','Location is inside the mission zone — saving is allowed.')
        :tx('الموقع خارج منطقة المهمة بحوالي ','Location is outside the mission zone by about ')+n(Math.max(0,Math.round(dist-m.radius_m)))+tx(' متر.',' m.');
    }
  }

  function handleGlobalClicks(e){
    const b=e.target.closest('[data-mo-open-page]');
    if(b){gotoPage('marketOpening');setTimeout(()=>renderPage(),20);}
  }

  window.marketOpeningRender=async function(){await loadData(true);renderPage();};
  window.marketOpeningAttachCustomerForm=attachCustomerForm;
  window.marketOpeningLocationChanged=customerLocationChanged;

  document.addEventListener('click',handleGlobalClicks);
  window.addEventListener('dana:render',()=>loadData(false));
  window.addEventListener('beforeunload',()=>{destroyMap();cleanupPicker();});

  setTimeout(()=>{if(state?.profile)loadData(true);},600);
})();