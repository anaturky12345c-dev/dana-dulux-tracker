(function(){
  'use strict';
  const app=window.DANA_APP;
  if(!app||!app.sb||!app.state)return;
  const sb=app.sb;
  const state=app.state;
  const canManage=app.canManage;
  const esc=app.esc;
  const todayRiyadh=app.todayRiyadh;
  const dateOnly=app.dateOnly;
  const dateTime=app.dateTime;
  const statusLabel=app.statusLabel;
  const openModal=app.openModal;
  const closeModal=app.closeModal;
  const flash=app.flash;
  const gotoPage=app.gotoPage;
  const openCustomerForm=app.openCustomerForm;
  const addBaseMap=app.addBaseMap;

  const RIYADH_DISTRICTS_URL='https://namaa-gis.kharetatalenmaa.sa/server/rest/services/Riyadh/RiyadhPMS_DistrictsPI/FeatureServer/5/query?where=1%3D1&outFields=DISTRICT_NAME%2CDISTRICT_NAME_EN%2CDISTRICT_NO%2CMUNIC_NAME%2CMUNIC_NO%2CZONE_&returnGeometry=true&outSR=4326&geometryPrecision=5&f=geojson';
  const DISTRICT_CACHE_KEY='dana_riyadh_districts_geojson_v1';
  const DISTRICT_CACHE_TTL=12*60*60*1000;

  const mo={
    settings:null,
    missions:[],
    links:[],
    requests:[],
    customerLocations:[],
    selectedMissionId:null,
    map:null,
    mapPoints:[],
    pickerMap:null,
    pickerMarker:null,
    pickerCircle:null,
    pickerDistrictLayer:null,
    pickerSelectedLayer:null,
    districtData:null,
    districtDataPromise:null,
    selectedDistrict:null,
    activeBounds:null,
    mapNewLayer:null,
    mapExistingLayer:null,
    mapPeerLayer:null,
    plannerMap:null,
    plannerDistrictLayer:null,
    plannerLayers:new Map(),
    plannerAssignments:new Map(),
    plannerActiveRepId:null,
    repScheduleMap:null,
    repScheduleBaseLayer:null,
    repScheduleFocusLayer:null,
    repScheduleTargetLayer:null,
    previewRepId:null,
    previewMissionId:null,
    demoPreview:null,
    loading:false,
    loadSeq:0,
    lastLoadedAt:0,
    bulkSelectMode:false,
    selectedMissionIds:new Set(),
    customerFormMode:'normal',
    managementMapFilter:'today',
    managementMapDate:'',
    managementMapRep:''
  };

  const ar=()=>app.getLang()==='ar';
  const isRepUser=()=>state?.profile?.role==='rep';
  const isManagementUser=()=>typeof canManage==='function'&&canManage();
  const canPermanentDelete=()=>['admin','mohsen'].includes(String(state?.profile?.username||'').toLowerCase());
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
  function linksForMission(m){
    if(mo.demoPreview?.mission?.id===m?.id)return mo.demoPreview.links||[];
    return mo.links.filter(x=>x.mission_id===m?.id);
  }
  function progress(m){
    return linksForMission(m).length;
  }
  function pendingRequestForMission(missionId){
    if(mo.demoPreview?.mission?.id===missionId)return mo.demoPreview.request||null;
    return mo.requests.find(r=>r.mission_id===missionId&&r.status==='pending')||null;
  }
  function previewMission(){
    if(mo.demoPreview?.mission)return mo.demoPreview.mission;
    if(mo.previewMissionId)return mo.missions.find(m=>m.id===mo.previewMissionId)||null;
    return null;
  }
  function effectiveRepId(){
    return mo.previewRepId||((isRepUser()&&state?.profile?.id)||null);
  }
  function remaining(m){
    return Math.max(0,Number(m.target_customers||0)-progress(m));
  }
  function pct(m){
    const t=Math.max(1,Number(m.target_customers||0));
    return Math.min(100,Math.round(progress(m)/t*100));
  }
  function quickTargetHtml(m){
    if(!isManagementUser()||!m||['completed','cancelled'].includes(m.status))return '';
    const done=progress(m),min=Math.max(1,done),target=Math.max(min,Number(m.target_customers||min));
    return '<div class="mo-quick-target" data-mo-quick-target="'+safe(m.id)+'">'+
      '<div class="mo-quick-target-copy"><b>'+tx('عدد العملاء المطلوبين','Required customers')+'</b><small>'+tx('تعديل سريع بدون فتح المهمة','Quick edit without opening the mission')+' · '+tx('المنجز','Done')+' '+n(done)+'</small></div>'+
      '<div class="mo-quick-target-control"><input type="number" inputmode="numeric" min="'+min+'" max="50" step="1" value="'+target+'" data-mo-target-input="'+safe(m.id)+'" aria-label="'+tx('عدد العملاء المطلوبين','Required customers')+'"><button class="btn good mini" type="button" data-mo-target-save="'+safe(m.id)+'">'+tx('حفظ','Save')+'</button></div>'+
    '</div>';
  }
  async function saveQuickMissionTarget(missionId,wrap=null,afterSave=null){
    if(!isManagementUser())return;
    const m=mo.missions.find(x=>x.id===missionId);
    if(!m)return flash(tx('المهمة غير موجودة.','Mission not found.'),true);
    const host=wrap||document.querySelector('[data-mo-quick-target="'+missionId+'"]');
    const input=host?.querySelector('[data-mo-target-input]');
    const btn=host?.querySelector('[data-mo-target-save]');
    const target=Number(input?.value||0),done=progress(m);
    if(!Number.isInteger(target)||target<1||target>50)return flash(tx('الهدف يجب أن يكون رقمًا صحيحًا من 1 إلى 50.','Target must be a whole number from 1 to 50.'),true);
    if(target<done)return flash(tx('لا يمكن جعل المطلوب أقل من العملاء المنجزين: ','Required customers cannot be below completed customers: ')+n(done),true);
    if(btn){btn.disabled=true;btn.textContent=tx('جاري الحفظ...','Saving...');}
    const {data,error}=await sb.rpc('admin_update_market_mission_target',{p_mission_id:missionId,p_target_customers:target});
    if(error){if(btn){btn.disabled=false;btn.textContent=tx('حفظ','Save');}return flash(tx('تعذر تعديل العدد: ','Could not update target: ')+friendlyError(error.message),true);}
    if(data?.ok===false){if(btn){btn.disabled=false;btn.textContent=tx('حفظ','Save');}return flash(tx('المهمة غير موجودة.','Mission not found.'),true);}
    flash(data?.changed===false?tx('العدد هو نفسه، ما تغير شيء.','The target is already the same.'):tx('تم تعديل عدد العملاء المطلوبين.','Required customer target updated.'));
    await loadData(true);
    if(typeof afterSave==='function')afterSave();
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
  function missionsForToday(){
    if(mo.previewRepId){
      const p=previewMission();
      return p?[p]:[];
    }
    if(!isRepUser())return [];
    return mo.missions
      .filter(m=>m.rep_id===state.profile.id&&ymd(m.scheduled_date)===today()&&m.status!=='cancelled')
      .sort((a,b)=>{
        const sa=a.status==='in_progress'?0:a.status==='scheduled'?1:2;
        const sb=b.status==='in_progress'?0:b.status==='scheduled'?1:2;
        return sa-sb||String(a.created_at||'').localeCompare(String(b.created_at||''));
      });
  }
  function missionForToday(){
    return missionsForToday()[0]||null;
  }
  function overdueForRep(){
    if(mo.previewRepId)return null;
    if(!isRepUser())return null;
    return mo.missions
      .filter(m=>m.rep_id===state.profile.id&&ymd(m.scheduled_date)<today()&&['scheduled','in_progress'].includes(m.status))
      .sort((a,b)=>ymd(b.scheduled_date).localeCompare(ymd(a.scheduled_date)))[0]||null;
  }
  function nextForRep(){
    if(mo.previewRepId)return null;
    if(!isRepUser())return null;
    return mo.missions
      .filter(m=>m.rep_id===state.profile.id&&ymd(m.scheduled_date)>today()&&m.status==='scheduled')
      .sort((a,b)=>ymd(a.scheduled_date).localeCompare(ymd(b.scheduled_date)))[0]||null;
  }
  function statusBreakdown(m){
    const rows=linksForMission(m);
    const c={active:0,hesitant:0,rejected:0,agreed_pending:0};
    rows.forEach(x=>{if(c[x.customer_status_at_creation]!==undefined)c[x.customer_status_at_creation]++;});
    return c;
  }
  function nextWorkDate(base){
    let d=new Date((base||today())+'T00:00:00Z');
    do{d.setUTCDate(d.getUTCDate()+1);}while(d.getUTCDay()===5);
    return d.toISOString().slice(0,10);
  }
  function addCalendarDays(base,days){
    const d=new Date((base||today())+'T00:00:00Z');
    d.setUTCDate(d.getUTCDate()+Number(days||0));
    return d.toISOString().slice(0,10);
  }
  function currentWorkWeekRange(base=today()){
    const d=new Date(base+'T00:00:00Z'),dow=d.getUTCDay();
    const sinceSaturday=(dow+1)%7;
    const start=new Date(d);start.setUTCDate(d.getUTCDate()-sinceSaturday);
    const end=new Date(start);end.setUTCDate(start.getUTCDate()+5);
    return [start.toISOString().slice(0,10),end.toISOString().slice(0,10)];
  }
  function managementMapMatches(m){
    if(!m||m.status==='cancelled')return false;
    if(mo.managementMapRep&&m.rep_id!==mo.managementMapRep)return false;
    const d=ymd(m.scheduled_date),mode=mo.managementMapFilter||'today';
    if(mode==='all')return true;
    if(mode==='today')return d===today();
    if(mode==='tomorrow')return d===addCalendarDays(today(),1);
    if(mode==='week'){
      const [a,b]=currentWorkWeekRange();
      return d>=a&&d<=b;
    }
    if(mode==='custom')return d===(mo.managementMapDate||today());
    return d===today();
  }
  function workDateOnOrAfter(base){
    let d=new Date((base||today())+'T00:00:00Z');
    if(d.getUTCDay()===5)d.setUTCDate(d.getUTCDate()+1);
    return d.toISOString().slice(0,10);
  }
  function previousWorkDate(base){
    let d=new Date((base||today())+'T00:00:00Z');
    do{d.setUTCDate(d.getUTCDate()-1);}while(d.getUTCDay()===5);
    return d.toISOString().slice(0,10);
  }
  function buildDemoPreview(kind='progress',repId=null){
    const reps=state.profiles.filter(p=>p.role==='rep'&&p.active!==false);
    const rid=repId||mo.previewRepId||reps[0]?.id||null;
    const base=mo.missions.find(m=>m.rep_id===rid&&m.zone_geojson)||mo.missions.find(m=>m.zone_geojson)||mo.missions[0]||{};
    const id='demo-'+kind;
    const configs={
      new:{status:'scheduled',count:0,date:today(),request:null,label:tx('قبل بدء المهمة','Before starting')},
      progress:{status:'in_progress',count:3,date:today(),request:null,label:tx('أثناء التنفيذ','In progress')},
      pending:{status:'in_progress',count:2,date:today(),request:{id:'demo-request',mission_id:id,requested_by:rid,requested_date:nextWorkDate(today()),reason:tx('ظرف ميداني — بيانات تجريبية','Field issue — demo data'),status:'pending'},label:tx('طلب تأجيل معلق','Pending reschedule')},
      overdue:{status:'scheduled',count:1,date:previousWorkDate(today()),request:null,label:tx('مهمة متأخرة','Overdue mission')}
    };
    const c=configs[kind]||configs.progress;
    const mission={
      ...base,
      id,
      rep_id:rid,
      scheduled_date:c.date,
      original_date:c.date,
      city:'الرياض',
      area_name:base.area_name||tx('حي تجريبي','Demo District'),
      target_customers:6,
      status:c.status,
      notes:tx('بيانات تجريبية — لا تُحفظ في قاعدة البيانات','Demo data — not saved to the database'),
      reschedule_count:0,
      started_at:c.status==='in_progress'?new Date().toISOString():null,
      completed_at:null,
      cancelled_at:null,
      center_lat:Number(base.center_lat||24.7136),
      center_lng:Number(base.center_lng||46.6753),
      radius_m:Number(base.radius_m||2500),
      zone_type:base.zone_type||'radius',
      district_no:base.district_no||null,
      municipality_name:base.municipality_name||null,
      zone_geojson:base.zone_geojson||null
    };
    const statuses=['active','agreed_pending','hesitant','active','rejected','active'];
    const links=Array.from({length:c.count},(_,i)=>({
      mission_id:id,customer_id:900000+i,rep_id:rid,
      customer_status_at_creation:statuses[i%statuses.length],
      distance_m:150+i*90,created_at:new Date(Date.now()-i*600000).toISOString()
    }));
    mo.previewRepId=rid;
    mo.previewMissionId=null;
    mo.demoPreview={kind,label:c.label,mission,links,request:c.request};
  }

  async function loadData(force=false){
    if(!state?.profile||!sb)return;
    if(mo.loading&&!force)return;
    const seq=++mo.loadSeq;
    mo.loading=true;
    try{
      const [s,m,l,r,cl]=await Promise.all([
        sb.from('market_opening_settings').select('enabled,rep_access_enabled,strict_rep_customer_creation,default_radius_m,updated_at').eq('id',true).maybeSingle(),
        sb.from('market_opening_missions').select('id,rep_id,scheduled_date,original_date,city,area_name,target_customers,center_lat,center_lng,radius_m,zone_type,district_no,municipality_name,zone_geojson,status,notes,reschedule_count,started_at,completed_at,cancelled_at,created_at,updated_at').order('scheduled_date',{ascending:false}).order('created_at',{ascending:false}),
        sb.from('market_opening_mission_customers').select('mission_id,customer_id,rep_id,customer_status_at_creation,distance_m,created_at').order('created_at',{ascending:false}),
        sb.from('market_opening_reschedule_requests').select('id,mission_id,requested_by,requested_date,reason,status,reviewed_by,review_note,created_at,reviewed_at').order('created_at',{ascending:false}),
        isManagementUser()?sb.from('customer_locations').select('customer_id,lat,lng'):Promise.resolve({data:[],error:null})
      ]);
      if(seq!==mo.loadSeq)return;
      if(s.error)throw s.error;
      if(m.error)throw m.error;
      if(l.error)throw l.error;
      if(r.error)throw r.error;
      if(cl.error)throw cl.error;
      mo.settings=s.data||{enabled:false,rep_access_enabled:false,strict_rep_customer_creation:false,default_radius_m:2500};
      mo.missions=m.data||[];
      mo.links=l.data||[];
      mo.requests=r.data||[];
      mo.customerLocations=cl.data||[];
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
    if(!mo.settings?.enabled||(isRepUser()&&!mo.settings?.rep_access_enabled)){
      slot.innerHTML='';
      return;
    }

    if(isRepUser()){
      const todayRows=missionsForToday(),over=overdueForRep(),next=nextForRep();
      if(todayRows.length){
        const done=todayRows.reduce((s,m)=>s+progress(m),0);
        const target=todayRows.reduce((s,m)=>s+Number(m.target_customers||0),0);
        const left=Math.max(0,target-done);
        const pctAll=target?Math.min(100,Math.round(done/target*100)):0;
        const areas=todayRows.map(m=>m.area_name).join('، ');
        slot.innerHTML='<div class="card mo-dashboard-card">'+
          '<div class="mo-dashboard-main"><div><span class="mo-eyebrow">'+tx('مناطق فتح السوق اليوم','Today market-opening areas')+'</span>'+
          '<h3>'+n(todayRows.length)+' '+tx('مناطق','areas')+' · '+safe(areas)+'</h3>'+
          '<div class="small">'+tx('إجمالي الهدف','Total target')+': <b>'+n(target)+'</b> · '+tx('أنجزت','Done')+': <b>'+n(done)+'</b> · '+tx('باقي','Remaining')+': <b>'+n(left)+'</b></div></div>'+
          '<div class="mo-dashboard-progress"><strong>'+n(done)+'/'+n(target)+'</strong><span>'+n(pctAll)+'%</span></div></div>'+
          '<div class="mo-progress"><i style="width:'+pctAll+'%"></i></div>'+
          '<button class="btn good mini" type="button" data-mo-open-page="1">'+tx('عرض كل مناطق اليوم','View all today areas')+'</button>'+
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
    if(isRepUser()&&!mo.settings?.rep_access_enabled){
      root.innerHTML='<div class="mo5-locked"><b>'+tx('فتح السوق قيد التجربة الداخلية','Market Opening is in internal testing')+'</b><span>'+tx('الصفحة غير متاحة للمناديب حتى اعتماد الإدارة.','The page is not available to representatives until management approves launch.')+'</span></div>';
      destroyMap();
      return;
    }
    const preview=isManagementUser()&&!!mo.previewRepId;
    root.innerHTML=preview?repHtml(true):(isManagementUser()?managementHtml():repHtml(false));
    bindPageControls();
    if(preview){
      const candidate=previewMission();
      if(candidate){
        mo.selectedMissionId=candidate.id;
        if(mo.demoPreview?.mission?.id===candidate.id)setTimeout(()=>renderDemoMissionMap(candidate),60);
        else setTimeout(()=>renderMissionMap(candidate),60);
      }else destroyMap();
    }else if(isManagementUser()){
      setTimeout(()=>renderManagementOverviewMap(),60);
    }else{
      const candidate=missionForToday();
      if(candidate){mo.selectedMissionId=candidate.id;setTimeout(()=>renderMissionMap(candidate,false),60);}
      else destroyMap();
    }
  }



  function zoneSummary(m){
    return m?.zone_type==='district_polygon'
      ?tx('حدود الحي كاملة','Full district boundary')
      :n(Math.round(Number(m?.radius_m||0)/100)/10)+' '+tx('كم','km');
  }

  function pointInRing(lng,lat,ring){
    let inside=false;
    if(!Array.isArray(ring)||ring.length<3)return false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const xi=Number(ring[i]?.[0]),yi=Number(ring[i]?.[1]);
      const xj=Number(ring[j]?.[0]),yj=Number(ring[j]?.[1]);
      if(!Number.isFinite(xi)||!Number.isFinite(yi)||!Number.isFinite(xj)||!Number.isFinite(yj))continue;
      const hit=((yi>lat)!==(yj>lat))&&(lng<(xj-xi)*(lat-yi)/((yj-yi)||1e-12)+xi);
      if(hit)inside=!inside;
    }
    return inside;
  }

  function pointInZoneGeojson(geom,lat,lng){
    if(!geom||!Number.isFinite(Number(lat))||!Number.isFinite(Number(lng)))return false;
    const polys=geom.type==='Polygon'?[geom.coordinates]:geom.type==='MultiPolygon'?geom.coordinates:[];
    return polys.some(poly=>{
      if(!Array.isArray(poly)||!pointInRing(Number(lng),Number(lat),poly[0]))return false;
      for(let i=1;i<poly.length;i++)if(pointInRing(Number(lng),Number(lat),poly[i]))return false;
      return true;
    });
  }

  function pointToSegmentMeters(lat,lng,lat1,lng1,lat2,lng2){
    const refLat=(Number(lat)+Number(lat1)+Number(lat2))/3*Math.PI/180;
    const mx=111320*Math.cos(refLat),my=110540;
    const px=Number(lng)*mx,py=Number(lat)*my;
    const ax=Number(lng1)*mx,ay=Number(lat1)*my;
    const bx=Number(lng2)*mx,by=Number(lat2)*my;
    const dx=bx-ax,dy=by-ay;
    const den=dx*dx+dy*dy;
    const t=den?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/den)):0;
    const qx=ax+t*dx,qy=ay+t*dy;
    return Math.hypot(px-qx,py-qy);
  }

  function distanceToZoneGeojsonMeters(geom,lat,lng){
    if(!geom)return Infinity;
    const polys=geom.type==='Polygon'?[geom.coordinates]:geom.type==='MultiPolygon'?geom.coordinates:[];
    let best=Infinity;
    polys.forEach(poly=>(poly||[]).forEach(ring=>{
      if(!Array.isArray(ring)||ring.length<2)return;
      for(let i=1;i<ring.length;i++){
        const a=ring[i-1],b=ring[i];
        if(!Array.isArray(a)||!Array.isArray(b))continue;
        best=Math.min(best,pointToSegmentMeters(lat,lng,a[1],a[0],b[1],b[0]));
      }
    }));
    return best;
  }

  async function loadDistrictData(){
    if(mo.districtData)return mo.districtData;
    if(mo.districtDataPromise)return mo.districtDataPromise;

    try{
      const raw=localStorage.getItem(DISTRICT_CACHE_KEY);
      if(raw){
        const cached=JSON.parse(raw);
        if(cached?.savedAt&&Date.now()-Number(cached.savedAt)<DISTRICT_CACHE_TTL&&Array.isArray(cached?.data?.features)&&cached.data.features.length){
          mo.districtData=cached.data;
          return mo.districtData;
        }
      }
    }catch(_){}

    mo.districtDataPromise=(async()=>{
      let g=null;
      try{
        const edge=await sb.functions.invoke('riyadh-districts',{method:'POST',body:{scope:'riyadh_districts'}});
        if(edge.error)throw edge.error;
        g=edge.data;
      }catch(edgeErr){
        console.warn('district edge fallback',edgeErr);
        const r=await fetch(RIYADH_DISTRICTS_URL,{mode:'cors',credentials:'omit'});
        if(!r.ok)throw new Error('districts '+r.status);
        g=await r.json();
      }
      const out={type:'FeatureCollection',features:(g?.features||[]).filter(x=>x?.geometry&&x?.properties?.DISTRICT_NO)};
      if(!out.features.length)throw new Error('empty district layer');
      mo.districtData=out;
      try{localStorage.setItem(DISTRICT_CACHE_KEY,JSON.stringify({savedAt:Date.now(),data:out}));}catch(_){}
      return out;
    })().finally(()=>{mo.districtDataPromise=null;});
    return mo.districtDataPromise;
  }

  function missionNowText(m){
    if(!m)return '';
    if(m.status==='completed')return tx('الهدف مكتمل — أي عميل إضافي يزيد تغطية المنطقة.','Target completed — extra customers improve area coverage.');
    if(m.status==='scheduled')return tx('ابدأ المهمة، ثم ركّز على الجزء الأقل تغطية في بياناتنا.','Start the mission, then focus on the least-covered part in our data.');
    const left=remaining(m);
    return left>0
      ?tx('باقي ','Remaining ')+n(left)+tx(' عميل للوصول للهدف.',' customers to hit the target.')
      :tx('وصلت للهدف.','Target reached.');
  }

  function missionRing(m){
    return '<div class="mo-v2-ring" style="--mo-p:'+pct(m)+'%"><div><strong>'+n(progress(m))+'</strong><span>/ '+n(m.target_customers)+'</span><small>'+pct(m)+'%</small></div></div>';
  }

  function sectorKey(m,p){
    const lat1=Number(m.center_lat),lng1=Number(m.center_lng);
    const lat2=Number(p.lat),lng2=Number(p.lng);
    const dx=(lng2-lng1)*Math.cos(lat1*Math.PI/180);
    const dy=lat2-lat1;
    const a=(Math.atan2(dx,dy)*180/Math.PI+360)%360;
    if(a>=315||a<45)return'north';
    if(a<135)return'east';
    if(a<225)return'south';
    return'west';
  }

  function sectorLabel(k){
    return {
      north:tx('شمال المنطقة','North'),
      east:tx('شرق المنطقة','East'),
      south:tx('جنوب المنطقة','South'),
      west:tx('غرب المنطقة','West')
    }[k]||k;
  }

  function sectorStats(m,points){
    const out={
      north:{existing:0,newCount:0},
      east:{existing:0,newCount:0},
      south:{existing:0,newCount:0},
      west:{existing:0,newCount:0}
    };
    (points||[]).forEach(p=>{
      const s=out[sectorKey(m,p)];if(!s)return;
      if(p.is_mission_customer)s.newCount++;else s.existing++;
    });
    const entries=Object.entries(out);
    entries.sort((a,b)=>(a[1].existing+a[1].newCount)-(b[1].existing+b[1].newCount));
    return {rows:out,recommended:entries[0]?.[0]||'north'};
  }

  function destinationPoint(lat,lng,bearingDeg,meters){
    const R=6371000,b=bearingDeg*Math.PI/180,p1=lat*Math.PI/180,l1=lng*Math.PI/180,d=meters/R;
    const p2=Math.asin(Math.sin(p1)*Math.cos(d)+Math.cos(p1)*Math.sin(d)*Math.cos(b));
    const l2=l1+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(p1),Math.cos(d)-Math.sin(p1)*Math.sin(p2));
    return [p2*180/Math.PI,l2*180/Math.PI];
  }

  function sectorPolygon(m,startDeg,endDeg){
    const pts=[[Number(m.center_lat),Number(m.center_lng)]];
    for(let a=startDeg;a<=endDeg;a+=15)pts.push(destinationPoint(Number(m.center_lat),Number(m.center_lng),a,Number(m.radius_m)));
    if((endDeg-startDeg)%15!==0)pts.push(destinationPoint(Number(m.center_lat),Number(m.center_lng),endDeg,Number(m.radius_m)));
    return pts;
  }

  function renderCoverageCompass(m,points){
    const el=document.getElementById('moCoverageCompass');if(!el)return;
    const stats=sectorStats(m,points);
    const keys=['north','east','south','west'];
    el.innerHTML='<div class="mo-v2-coverage-head"><div><b>'+tx('بوصلة التغطية','Coverage compass')+'</b><span>'+tx('تعتمد على عملائنا المسجلين داخل المهمة، وليست تقديراً لعدد المحلات في السوق.','Based on customers in our data, not an estimate of all shops in the market.')+'</span></div><div class="mo-v2-next-zone">'+tx('ابدأ بالأقل تغطية','Start with least covered')+': <b>'+sectorLabel(stats.recommended)+'</b></div></div>'+
      '<div class="mo-v2-sector-grid">'+keys.map(k=>{
        const x=stats.rows[k],recommended=k===stats.recommended;
        return '<div class="mo-v2-sector '+(recommended?'recommended':'')+'"><span>'+sectorLabel(k)+'</span><b>'+n(x.newCount)+'</b><small>'+tx('جدد','new')+' · '+n(x.existing)+' '+tx('موجود','existing')+'</small></div>';
      }).join('')+'</div>';
    return stats;
  }

  function repHtml(preview=false){
    const todayMissions=preview?(previewMission()?[previewMission()]:[]):missionsForToday();
    const over=overdueForRep(),next=nextForRep();
    const activeRows=todayMissions.length?todayMissions:(over?[over]:[]);
    const previewBanner=preview?'<div class="mo5-preview-banner"><div><b>'+tx('معاينة تجربة المندوب','Representative experience preview')+'</b><span>'+tx('هذه المعاينة لا تنفذ أي إجراء فعلي. النظام الفعلي متاح للمناديب حسب خططهم المعتمدة.','This preview cannot perform real actions. The live system is available to representatives based on their assigned plans.')+'</span></div><button class="btn secondary mini" type="button" data-mo-exit-preview="1">'+tx('رجوع للإدارة','Back to management')+'</button></div>':'';

    if(!activeRows.length){
      return '<div class="mo5-shell mo5-rep">'+previewBanner+
        '<section class="mo5-empty"><div class="mo5-empty-icon">✓</div><div><h2>'+tx('ما عندك مهمة الآن','No active mission right now')+'</h2><p>'+tx('إذا ما عندك مهمة اليوم، ما تحتاج تسوي شيء. المنطقة القادمة تظهر لك تلقائيًا بعد اعتماد الإدارة.','If you have no mission today, there is nothing to do. Your next approved area appears automatically.')+'</p>'+(next?'<div class="mo5-next">'+tx('المهمة القادمة','Next mission')+': <b>'+safe(next.area_name)+'</b> · '+safe(fmtDate(next.scheduled_date))+'</div>':'')+'</div></section>'+
      '</div>';
    }

    const isOverdueMode=!todayMissions.length&&!!over;
    const disabled=preview?' disabled aria-disabled="true"':'';

    const missionCards=activeRows.map((m,index)=>{
      const b=statusBreakdown(m),done=progress(m),left=remaining(m),pending=pendingRequestForMission(m.id);
      const isOver=preview?ymd(m.scheduled_date)<today():isOverdueMode;
      const actionDelay=pending
        ?'<span class="mo5-step-wait">'+tx('طلب التأجيل تحت المراجعة','Reschedule request pending')+' · '+safe(fmtDate(pending.requested_date))+'</span>'
        :'<button class="mo5-step-action warn" type="button" '+(preview?'':('data-mo-request-reschedule="'+safe(m.id)+'"'))+disabled+'>'+tx('طلب تأجيل','Request reschedule')+'</button>';
      return '<article class="mo-rep-live-mission '+statusClass(m)+'">'+
        '<div class="mo-rep-live-head"><div><span>'+tx('منطقة ','Area ')+(index+1)+'</span><h2>'+safe(m.area_name)+'</h2><small>'+safe(m.city)+' · '+safe(fmtDate(m.scheduled_date))+' · '+safe(statusText(m))+'</small></div><strong>'+n(done)+'<small>/'+n(m.target_customers)+'</small></strong></div>'+
        '<div class="mo-progress"><i style="width:'+pct(m)+'%"></i></div>'+
        '<div class="mo-rep-live-meta"><span>'+tx('المتبقي','Remaining')+' <b>'+n(left)+'</b></span><span>'+tx('نشط','Active')+' <b>'+n(b.active)+'</b></span><span>'+tx('متردد','Hesitant')+' <b>'+n(b.hesitant)+'</b></span><span>'+tx('رافض','Rejected')+' <b>'+n(b.rejected)+'</b></span></div>'+
        '<div class="mo-rep-live-actions">'+
          '<button class="btn secondary mini" type="button" data-mo-map="'+safe(m.id)+'">'+tx('عرض المنطقة بالخريطة','Show area on map')+'</button>'+
          (!isOver?'<button class="btn good mini" type="button" '+(preview?'':'data-mo-add-customer="1"')+disabled+'>'+tx('إضافة عميل','Add customer')+'</button>':'')+
          actionDelay+
        '</div>'+
      '</article>';
    }).join('');

    const totalTarget=activeRows.reduce((s,m)=>s+Number(m.target_customers||0),0);
    const totalDone=activeRows.reduce((s,m)=>s+progress(m),0);
    const totalLeft=Math.max(0,totalTarget-totalDone);

    return '<div class="mo5-shell mo5-rep">'+previewBanner+
      (mo.demoPreview?'<div class="mo5-demo-banner"><b>🧪 '+tx('بيانات تجريبية','Demo data')+'</b><span>'+safe(mo.demoPreview.label)+' · '+tx('لن تُحفظ أي نتيجة','Nothing will be saved')+'</span></div>':'')+
      '<section class="mo-rep-day-summary"><div><span>'+tx(isOverdueMode?'مهمة متأخرة':'مهام اليوم',isOverdueMode?'Overdue mission':'Today’s areas')+'</span><h1>'+(activeRows.length>1?n(activeRows.length)+' '+tx('مناطق اليوم','areas today'):safe(activeRows[0].area_name))+'</h1><p>'+tx('كل المناطق المحددة لك اليوم ظاهرة هنا. ما تحتاج تضغط بدء.','All areas assigned to you today are shown here. No start button is required.')+'</p></div><div class="mo-rep-day-total"><strong>'+n(totalDone)+' <small>/ '+n(totalTarget)+'</small></strong><span>'+tx('إجمالي العملاء','total customers')+'</span><b>'+n(totalLeft)+' '+tx('متبقي','remaining')+'</b></div></section>'+
      '<section class="mo-rep-live-list">'+missionCards+'</section>'+
      (!isOverdueMode?'<section class="mo5-rep-steps compact"><div class="mo5-section-head"><div><span>'+tx('طريقة العمل','Workflow')+'</span><h3>'+tx('خطوتان فقط','Only two steps')+'</h3></div></div>'+
        '<article><em>1</em><div><b>'+tx('سجل العملاء الجدد','Register new customers')+'</b><span>'+tx('أضف العميل من فتح السوق أو من صفحة العملاء القديمة. النظام يحدد تلقائيًا أي منطقة من مناطق اليوم يقع داخلها.','Add the customer from Market Opening or the existing Customers page. The system automatically identifies which of today’s areas contains the customer.')+'</span></div><button class="mo5-step-action success" type="button" '+(preview?'':'data-mo-add-customer="1"')+disabled+'>'+tx('إضافة عميل','Add customer')+'</button></article>'+
        '<article><em>2</em><div><b>'+tx('إذا ما قدرت تروح منطقة','If you cannot visit an area')+'</b><span>'+tx('استخدم زر طلب التأجيل الموجود داخل المنطقة نفسها.','Use the reschedule button inside that specific area.')+'</span></div></article>'+
      '</section>':'')+
      '<details class="mo5-map-panel" open><summary><div><b>'+tx('خريطة مناطق اليوم','Today’s areas map')+'</b><span>'+tx('اضغط عرض المنطقة من أي بطاقة للتنقل بينها.','Use Show area on map from any card to switch between areas.')+'</span></div><span>⌄</span></summary>'+
        '<div class="mo5-map-actions"><button class="btn secondary mini" type="button" data-mo-map-fit="1">'+tx('إظهار كل مناطق اليوم','Fit all today areas')+'</button><button class="btn secondary mini" type="button" data-mo-map-full="1">'+tx('ملء الشاشة','Full screen')+'</button></div>'+
        '<div id="moCoverageCompass" class="mo-v2-coverage"></div><div id="marketOpeningMap" class="mo-map mo-v2-map mo5-map"></div><div id="moMapLegend" class="mo-map-legend"></div>'+
      '</details>'+
    '</div>';
  }

  function managementHtml(){
    const activeReps=state.profiles.filter(p=>p.role==='rep'&&p.active!==false);
    const todayKey=today();
    const todayRows=mo.missions.filter(m=>ymd(m.scheduled_date)===todayKey&&m.status!=='cancelled');
    const todayTarget=todayRows.reduce((s,m)=>s+Number(m.target_customers||0),0);
    const todayDone=todayRows.reduce((s,m)=>s+progress(m),0);
    const overdue=mo.missions.filter(m=>ymd(m.scheduled_date)<todayKey&&['scheduled','in_progress'].includes(m.status));
    const pendingRequests=mo.requests.filter(r=>r.status==='pending');
    const pendingMissionIds=new Set(pendingRequests.map(r=>r.mission_id));
    const riyadhHour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Riyadh',hour:'2-digit',hour12:false}).format(new Date()));
    const overdueAction=overdue.filter(m=>!pendingMissionIds.has(m.id));
    const notStarted=riyadhHour>=11?todayRows.filter(m=>m.status==='scheduled'&&!pendingMissionIds.has(m.id)):[];
    const inProgress=riyadhHour>=15?todayRows.filter(m=>m.status==='in_progress'&&remaining(m)>0&&!pendingMissionIds.has(m.id)):[];
    const actionCount=pendingRequests.length+overdueAction.length+notStarted.length+inProgress.length;
    const accessLive=!!mo.settings?.rep_access_enabled;
    const repOptions='<option value="">'+tx('كل المناديب','All representatives')+'</option>'+activeReps.map(p=>'<option value="'+safe(p.id)+'" '+(p.id===mo.managementMapRep?'selected':'')+'>'+safe(p.full_name)+'</option>').join('');
    const mapDate=mo.managementMapDate||today();
    const mode=mo.managementMapFilter||'today';
    const filterBtn=(key,arLabel,enLabel)=>'<button type="button" class="mo-map-filter-btn '+(mode===key?'active':'')+'" data-mo-map-period="'+key+'">'+tx(arLabel,enLabel)+'</button>';

    const attentionItems=[];
    pendingRequests.forEach(r=>{
      const m=mo.missions.find(x=>x.id===r.mission_id);
      if(!m)return;
      attentionItems.push('<article class="mo-action-alert warn"><div><span>'+tx('طلب تأجيل','Reschedule request')+'</span><b>'+safe(repName(m.rep_id))+' — '+safe(m.area_name)+'</b><small>'+tx('من ','From ')+safe(fmtDate(m.scheduled_date))+' → '+safe(fmtDate(r.requested_date))+' · '+safe(r.reason)+'</small></div><div class="mo-action-alert-actions"><button class="btn good mini" type="button" data-mo-request-approve="'+safe(r.id)+'">'+tx('موافقة','Approve')+'</button><button class="btn bad mini" type="button" data-mo-request-reject="'+safe(r.id)+'">'+tx('رفض','Reject')+'</button></div></article>');
    });
    overdueAction.forEach(m=>{
      attentionItems.push('<article class="mo-action-alert bad"><div><span>'+tx('مهمة متأخرة','Overdue mission')+'</span><b>'+safe(repName(m.rep_id))+' — '+safe(m.area_name)+'</b><small>'+safe(fmtDate(m.scheduled_date))+' · '+tx('المنجز ','Done ')+n(progress(m))+'/'+n(m.target_customers)+'</small></div><div class="mo-action-alert-actions"><button class="btn secondary mini" type="button" data-mo-map="'+safe(m.id)+'">'+tx('الخريطة','Map')+'</button><button class="btn warn mini" type="button" data-mo-reschedule="'+safe(m.id)+'">'+tx('نقل الموعد','Move date')+'</button></div></article>');
    });
    notStarted.forEach(m=>{
      attentionItems.push('<article class="mo-action-alert neutral"><div><span>'+tx('لم يبدأ مهمة اليوم','Today mission not started')+'</span><b>'+safe(repName(m.rep_id))+' — '+safe(m.area_name)+'</b><small>'+tx('الهدف ','Target ')+n(m.target_customers)+'</small></div><div class="mo-action-alert-actions"><button class="btn secondary mini" type="button" data-mo-map="'+safe(m.id)+'">'+tx('الخريطة','Map')+'</button><button class="btn secondary mini" type="button" data-mo-edit="'+safe(m.id)+'">'+tx('تعديل','Edit')+'</button></div></article>');
    });
    inProgress.forEach(m=>{
      attentionItems.push('<article class="mo-action-alert progress"><div><span>'+tx('مهمة اليوم جارية','Today mission in progress')+'</span><b>'+safe(repName(m.rep_id))+' — '+safe(m.area_name)+'</b><small>'+tx('باقي ','Remaining ')+n(remaining(m))+' · '+tx('المنجز ','Done ')+n(progress(m))+'/'+n(m.target_customers)+'</small></div><div class="mo-action-alert-actions"><button class="btn secondary mini" type="button" data-mo-map="'+safe(m.id)+'">'+tx('الخريطة','Map')+'</button><button class="btn secondary mini" type="button" data-mo-rep-plans="'+safe(m.rep_id)+'">'+tx('خطط المندوب','Rep plans')+'</button></div></article>');
    });
    const attentionHtml=attentionItems.length
      ?attentionItems.join('')
      :'<div class="mo-all-clear"><b>✓ '+tx('ما فيه شيء يحتاج تدخل الآن','Nothing needs management action right now')+'</b><span>'+tx('لا يوجد تأجيل معلق، ولا مهمة متأخرة، ومهام اليوم ليست بحاجة لتدخل إداري.','No pending reschedules, overdue missions, or today missions requiring management action.')+'</span></div>';

    const accessBanner=accessLive
      ?'<div class="mo5-pilot-banner mo5-live-banner"><div><b>✓ '+tx('النظام مفعل للمناديب','System live for representatives')+'</b><span>'+tx('المهام الحالية ظاهرة للمناديب حسب جدولهم.','Current missions are visible to representatives based on their schedule.')+'</span></div><span class="mo5-lock-state">'+tx('مفتوح','Live')+'</span></div>'
      :'<div class="mo5-pilot-banner"><div><b>🔒 '+tx('وصول المناديب مغلق','Representative access is locked')+'</b></div><span class="mo5-lock-state">'+tx('مغلق','Locked')+'</span></div>';

    return '<div class="mo5-shell mo5-management">'+
      accessBanner+
      '<section class="mo-management-attention"><div class="mo5-section-head"><div><span>'+tx('مختصر الإدارة','Management shortcut')+'</span><h3>'+tx('ما يحتاج تدخلك الآن','What needs your action now')+'</h3><small>'+tx('هذه أول خانة عندك: أي شيء يحتاج قرار أو متابعة يظهر هنا مباشرة.','This is your first section: anything needing a decision or follow-up appears here immediately.')+'</small></div><strong class="'+(actionCount?'attention':'clear')+'">'+n(actionCount)+'</strong></div><div class="mo-action-alert-list">'+attentionHtml+'</div></section>'+
      '<section class="mo5-primary-actions compact"><button class="mo5-primary-card" type="button" data-mo-auto-plan="1"><span class="icon">⌖</span><div><b>'+tx('توزيع مناطق المناديب','Assign rep territories')+'</b><small>'+tx('إضافة عدة مناطق وترتيبها تلقائيًا','Add multiple areas and schedule them automatically')+'</small></div></button><button class="mo5-primary-card secondary-card" type="button" data-mo-new="1"><span class="icon">＋</span><div><b>'+tx('إضافة مهمة','Add mission')+'</b><small>'+tx('إضافة منطقة أو مهمة مفردة','Add a single area or mission')+'</small></div></button></section>'+
      representativesPanelHtml(activeReps)+
      '<section class="mo-management-map-section"><div class="mo5-section-head"><div><span>'+tx('الخريطة التشغيلية','Operations map')+'</span><h3>'+tx('كل مناطق المناديب','All representative areas')+'</h3><small>'+tx('كل المناطق تبقى مرسومة دائمًا. الفلتر يبرز فقط مناطق اليوم أو التاريخ الذي تختاره ولا يخفي الباقي.','Every assigned area stays drawn at all times. The filter only highlights today or the selected date and never hides the rest.')+'</small></div><button class="btn secondary mini" type="button" data-mo-map-full="1">'+tx('ملء الشاشة','Full screen')+'</button></div>'+
        '<div class="mo-management-map-toolbar"><div class="mo-map-periods">'+filterBtn('all','الكل','All')+filterBtn('today','اليوم','Today')+filterBtn('tomorrow','غدًا','Tomorrow')+filterBtn('week','هذا الأسبوع','This week')+filterBtn('custom','تاريخ محدد','Custom date')+'</div><div class="mo-map-filter-inputs"><select id="moMapRepFilter">'+repOptions+'</select><input type="date" id="moMapCustomDate" value="'+safe(mapDate)+'" aria-label="'+tx('تاريخ الخريطة','Map date')+'"><button class="btn secondary mini" type="button" data-mo-map-fit="1">'+tx('إظهار كل المناطق','Fit all areas')+'</button></div></div>'+
        '<div id="moOverviewCustomerStats" class="mo-overview-customer-stats"></div><div id="marketOpeningMap" class="mo-map mo-v2-map mo5-map mo-management-map"></div><div id="moMapLegend" class="mo-map-legend mo-management-legend"></div></section>'+
      '<div class="mo5-secondary-actions"><button class="btn secondary mini" type="button" data-mo-disable="1">'+tx('إيقاف نظام فتح السوق','Disable Market Opening system')+'</button></div>'+
    '</div>';
  }

  function representativesPanelHtml(activeReps){
    const reps=activeReps;
    const todayKey=today();
    const cards=reps.map(rep=>{
      const plans=mo.missions
        .filter(m=>m.rep_id===rep.id&&m.status!=='cancelled')
        .sort((a,b)=>ymd(a.scheduled_date).localeCompare(ymd(b.scheduled_date))||String(a.created_at||'').localeCompare(String(b.created_at||'')));
      const todayMissions=plans.filter(m=>ymd(m.scheduled_date)===todayKey);
      const futurePlans=plans.filter(m=>ymd(m.scheduled_date)>todayKey&&m.status!=='completed');
      const upcoming=futurePlans.length;
      const completed=plans.filter(m=>m.status==='completed').length;
      const nextDate=futurePlans.length?ymd(futurePlans[0].scheduled_date):null;
      const nextMissions=nextDate?futurePlans.filter(m=>ymd(m.scheduled_date)===nextDate):[];
      const repPending=plans.map(m=>({m,r:pendingRequestForMission(m.id)})).filter(x=>x.r);

      const rescheduleBox=repPending.length
        ?'<div class="mo-rep-reschedule-box"><div class="mo-rep-reschedule-head"><span>'+tx('طلبات التأجيل','Reschedule requests')+'</span><b>'+n(repPending.length)+'</b></div>'+
          repPending.map(x=>'<div class="mo-rep-reschedule-row"><div><b>'+safe(x.m.area_name)+'</b><span>'+safe(fmtDate(x.m.scheduled_date))+' → '+safe(fmtDate(x.r.requested_date))+'</span><small>'+safe(x.r.reason)+'</small></div><div><button class="btn good mini" type="button" data-mo-request-approve="'+safe(x.r.id)+'">'+tx('موافقة','Approve')+'</button><button class="btn bad mini" type="button" data-mo-request-reject="'+safe(x.r.id)+'">'+tx('رفض','Reject')+'</button></div></div>').join('')+
          '</div>'
        :'';

      const todayBlock=todayMissions.length
        ?'<div class="mo-rep-today-list">'+todayMissions.map(m=>{
            const live=!['completed','cancelled'].includes(m.status);
            return '<div class="mo-rep-mission-shell">'+
              '<div class="mo-rep-today-item '+statusClass(m)+'">'+
                '<div class="mo4-card-progress"><div><b>'+safe(m.area_name)+'</b><span> · '+safe(fmtDate(m.scheduled_date))+'</span></div><strong>'+n(progress(m))+'/'+n(m.target_customers)+'</strong></div>'+
                '<div class="mo-progress"><i style="width:'+pct(m)+'%"></i></div>'+
                '<div class="mo4-card-meta"><span>'+tx('حالة اليوم','Today')+' <b>'+safe(statusText(m))+'</b></span><span>'+tx('متبقي','Remaining')+' <b>'+n(remaining(m))+'</b></span></div>'+
                '<div class="mo4-card-actions">'+
                  '<button class="btn secondary mini" type="button" data-mo-map="'+safe(m.id)+'">'+tx('عرض في الخريطة','View on map')+'</button>'+
                  (live?'<button class="btn secondary mini" type="button" data-mo-edit="'+safe(m.id)+'">'+tx('تعديل خطة اليوم','Edit today plan')+'</button>':'')+
                  (live?'<button class="btn warn mini" type="button" data-mo-reschedule="'+safe(m.id)+'">'+tx('تأجيل','Reschedule')+'</button>':'')+
                  '<button class="btn secondary mini" type="button" data-mo-history="'+safe(m.id)+'">'+tx('السجل','History')+'</button>'+
                '</div>'+
              '</div>'+
              (live?'<div class="mo-rep-external-target">'+quickTargetHtml(m)+'</div>':'')+
            '</div>';
          }).join('')+'</div>'
        :'<div class="empty">'+tx('لا توجد خطة لهذا المندوب اليوم.','No plan for this representative today.')+'</div>';

      const nextBlock=!todayMissions.length&&nextMissions.length
        ?'<div class="mo-rep-next-block"><div class="mo-rep-next-head"><span>'+tx('المهمة القادمة','Next mission')+'</span><b>'+safe(fmtDate(nextDate))+'</b></div><div class="mo-rep-next-list">'+nextMissions.map(m=>{
            const live=!['completed','cancelled'].includes(m.status);
            return '<div class="mo-rep-mission-shell">'+
              '<div class="mo-rep-next-item"><div><b>'+safe(m.area_name)+'</b><small>'+safe(statusText(m))+' · '+tx('الهدف ','Target ')+n(m.target_customers)+'</small></div><div class="mo-rep-next-actions"><button class="btn secondary mini" type="button" data-mo-map="'+safe(m.id)+'">'+tx('الخريطة','Map')+'</button><button class="btn secondary mini" type="button" data-mo-edit="'+safe(m.id)+'">'+tx('تعديل','Edit')+'</button>'+(live?'<button class="btn warn mini" type="button" data-mo-reschedule="'+safe(m.id)+'">'+tx('تأجيل','Reschedule')+'</button>':'')+'</div></div>'+
              (live?'<div class="mo-rep-external-target">'+quickTargetHtml(m)+'</div>':'')+
            '</div>';
          }).join('')+'</div></div>'
        :'';

      return '<article class="mo4-mission-card '+(todayMissions.length?statusClass(todayMissions[0])+' mo-has-today-mission':'empty')+'">'+
        '<div class="mo4-card-top"><div><span>'+tx('المندوب','Representative')+'</span><h4>'+safe(rep.full_name)+'</h4><small>'+tx('قادمة','Upcoming')+' '+n(upcoming)+' · '+tx('مكتملة','Completed')+' '+n(completed)+'</small></div><span class="mo-status-pill">'+(todayMissions.length?n(todayMissions.length)+' '+tx('مهام اليوم','Today missions'):tx('بدون خطة اليوم','No plan today'))+'</span></div>'+
        rescheduleBox+
        todayBlock+
        nextBlock+
        '<div class="mo4-card-actions">'+
          '<button class="btn secondary mini" type="button" data-mo-new-rep="'+safe(rep.id)+'">+ '+tx('إضافة خطة','Add plan')+'</button>'+
          '<button class="btn secondary mini" type="button" data-mo-rep-plans="'+safe(rep.id)+'">'+tx('خطط المندوب','Representative plans')+'</button>'+
        '</div></article>';
    }).join('');
    return '<section class="mo5-missions-board mo-representatives-hub"><div class="mo5-section-head"><div><span>'+tx('إدارة الخطط من مكان واحد','Manage plans in one place')+'</span><h3>'+tx('المناديب','Representatives')+'</h3></div><span>'+tx('مهام اليوم والقادمة والتأجيل والعدد المطلوب كلها مباشرة داخل بطاقة المندوب.','Today and upcoming missions, rescheduling, and required-customer editing are all directly accessible in the representative card.')+'</span></div><div class="mo4-mission-grid">'+(cards||'<div class="empty">'+tx('لا يوجد مناديب نشطون.','No active representatives.')+'</div>')+'</div></section>';
  }

  function plannerDayLabel(dateStr){
    const d=new Date(dateStr+'T00:00:00Z');
    return new Intl.DateTimeFormat(ar()?'ar-SA':'en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(d);
  }

  function repScheduleDates(rows){
    const out=new Set();
    let d=new Date(today()+'T00:00:00Z');
    let added=0;
    while(added<21){
      if(d.getUTCDay()!==5){out.add(d.toISOString().slice(0,10));added++;}
      d.setUTCDate(d.getUTCDate()+1);
    }
    rows.forEach(m=>{
      const x=ymd(m.scheduled_date);
      if(x>=today()&&m.status!=='cancelled')out.add(x);
    });
    return [...out].sort();
  }

  async function moveMissionByDrag(missionId,newDate,repId){
    const m=mo.missions.find(x=>x.id===missionId);
    if(!m)return;
    if(ymd(m.scheduled_date)===newDate)return;
    const {data,error}=await sb.rpc('admin_drag_market_mission',{p_mission_id:missionId,p_new_date:newDate});
    if(error)return flash(tx('تعذر نقل المهمة: ','Could not move mission: ')+friendlyError(error.message),true);
    if(data?.ok===false)return flash(tx('المهمة غير موجودة.','Mission not found.'),true);
    closeModal();
    await loadData(true);
    openRepPlans(repId);
    flash(tx('تم نقل المهمة إلى التاريخ المحدد. ويمكن وجود أكثر من منطقة في نفس اليوم.','Mission moved to the selected date. Multiple areas can share the same day.'));
  }

  function destroyRepScheduleMap(){
    try{mo.repScheduleMap?.remove();}catch(_){}
    mo.repScheduleMap=null;
    mo.repScheduleBaseLayer=null;
    mo.repScheduleFocusLayer=null;
    mo.repScheduleTargetLayer=null;
  }

  function missionMapLayer(m,style={}){
    if(!window.L||!m)return null;
    try{
      if(m.zone_type==='district_polygon'&&m.zone_geojson){
        return L.geoJSON({type:'Feature',properties:{},geometry:m.zone_geojson},{
          style:{
            color:style.color||'#64748b',
            weight:style.weight??2,
            fillColor:style.fillColor||style.color||'#94a3b8',
            fillOpacity:style.fillOpacity??.05,
            dashArray:style.dashArray||null
          }
        });
      }
      return L.circle([Number(m.center_lat),Number(m.center_lng)],{
        radius:Number(m.radius_m||2500),
        color:style.color||'#64748b',
        weight:style.weight??2,
        fillColor:style.fillColor||style.color||'#94a3b8',
        fillOpacity:style.fillOpacity??.05,
        dashArray:style.dashArray||null
      });
    }catch(_){return null;}
  }

  function initRepScheduleMap(repId,rows){
    destroyRepScheduleMap();
    const el=document.getElementById('moRepDragMap');
    if(!el||!window.L)return;
    mo.repScheduleMap=L.map(el,{zoomControl:true,preferCanvas:true,attributionControl:false}).setView([24.7136,46.6753],10);
    addBaseMap(mo.repScheduleMap);
    addPickerMapLayers(mo.repScheduleMap);
    mo.repScheduleBaseLayer=L.layerGroup().addTo(mo.repScheduleMap);
    mo.repScheduleTargetLayer=L.layerGroup().addTo(mo.repScheduleMap);
    mo.repScheduleFocusLayer=L.layerGroup().addTo(mo.repScheduleMap);

    const bounds=L.latLngBounds([]);
    rows.filter(m=>m.status!=='cancelled').forEach(m=>{
      const layer=missionMapLayer(m,{color:'#94a3b8',weight:1.5,fillOpacity:.025,dashArray:'5 5'});
      if(!layer)return;
      layer.addTo(mo.repScheduleBaseLayer).bindTooltip(safe(m.area_name)+' · '+safe(fmtDate(m.scheduled_date)),{sticky:true});
      try{bounds.extend(layer.getBounds());}catch(_){}
    });
    if(bounds.isValid())mo.repScheduleMap.fitBounds(bounds,{padding:[18,18],maxZoom:12});
    setTimeout(()=>mo.repScheduleMap?.invalidateSize(),90);
  }

  function focusRepScheduleMission(missionId,targetDate=null){
    if(!mo.repScheduleMap)return;
    const m=mo.missions.find(x=>x.id===missionId);
    if(!m)return;
    mo.repScheduleFocusLayer?.clearLayers();
    mo.repScheduleTargetLayer?.clearLayers();

    if(targetDate){
      mo.missions.filter(x=>
        x.rep_id===m.rep_id&&x.id!==m.id&&x.status!=='cancelled'&&ymd(x.scheduled_date)===targetDate
      ).forEach(x=>{
        const peer=missionMapLayer(x,{color:'#2563eb',weight:2.5,fillOpacity:.08,dashArray:'6 4'});
        if(peer)peer.addTo(mo.repScheduleTargetLayer).bindTooltip(tx('موجود في هذا اليوم: ','Already on this day: ')+safe(x.area_name));
      });
    }

    const focus=missionMapLayer(m,{color:'#0f766e',weight:4,fillOpacity:.18});
    if(focus){
      focus.addTo(mo.repScheduleFocusLayer).bindTooltip(tx('المنطقة التي تنقلها: ','Area being moved: ')+safe(m.area_name),{permanent:false});
      try{
        const b=focus.getBounds();
        if(b?.isValid())mo.repScheduleMap.fitBounds(b,{padding:[28,28],maxZoom:13});
      }catch(_){}
    }
    const label=document.getElementById('moRepDragMapLabel');
    if(label)label.innerHTML='<b>'+safe(m.area_name)+'</b><span>'+safe(fmtDate(m.scheduled_date))+(targetDate?tx(' ← إلى ',' → ')+safe(fmtDate(targetDate)):'')+'</span>';
  }

  function clearRepScheduleTargetDate(){
    mo.repScheduleTargetLayer?.clearLayers();
  }

  function openRepPlans(repId){
    if(!isManagementUser())return;
    const rep=state.profiles.find(p=>p.id===repId);
    if(!rep)return;
    const rows=mo.missions
      .filter(m=>m.rep_id===repId)
      .sort((a,b)=>ymd(a.scheduled_date).localeCompare(ymd(b.scheduled_date))||String(a.created_at||'').localeCompare(String(b.created_at||'')));
    const todayKey=today();
    const todayRows=rows.filter(m=>ymd(m.scheduled_date)===todayKey&&m.status!=='cancelled');
    const upcoming=rows.filter(m=>ymd(m.scheduled_date)>todayKey&&m.status!=='cancelled'&&m.status!=='completed');
    const completed=rows.filter(m=>m.status==='completed');
    const inProgress=rows.filter(m=>m.status==='in_progress');
    const achieved=rows.reduce((sum,m)=>sum+progress(m),0);
    const canDelete=canPermanentDelete();
    const scheduleDates=repScheduleDates(rows);

    const scheduleRail='<section class="mo7-schedule-board mo8-calendar-board"><div class="mo7-schedule-head"><div><b>'+tx('جدولة المناطق بالسحب','Drag areas between dates')+'</b><span>'+tx('امسك المنطقة بالماوس واسحبها من تاريخها الحالي إلى التاريخ المطلوب. الخريطة تعرض لك موقع المنطقة أثناء السحب، والمناطق الموجودة في التاريخ الذي تمر فوقه.','Grab an area with the mouse and drag it from its current date to the date you want. The map shows the area while dragging and the areas already assigned to the date you hover over.')+'</span></div><span class="mo8-desktop-hint">'+tx('للإدارة على اللابتوب · سحب وإفلات مباشر','Management desktop · direct drag & drop')+'</span></div><div class="mo8-calendar-layout"><div class="mo8-calendar-main"><div class="mo8-calendar-strip" id="moRepDateRail">'+scheduleDates.map(d=>{
      const dayMissions=rows.filter(m=>ymd(m.scheduled_date)===d&&m.status!=='cancelled');
      const chips=dayMissions.length?dayMissions.map(m=>{
        const live=!['completed','cancelled'].includes(m.status);
        const movable=live&&progress(m)===0&&ymd(m.scheduled_date)>=todayKey;
        return '<div class="mo8-area-chip '+statusClass(m)+' '+(movable?'movable':'locked')+'" '+(movable?'draggable="true" data-mo-drag-mission="'+safe(m.id)+'"':'')+' data-mo-scheduled-chip="'+safe(m.id)+'"><span class="mo8-grip" aria-hidden="true">⠿</span><div><b>'+safe(m.area_name)+'</b><small>'+tx('الهدف','Target')+' '+n(m.target_customers)+' · '+tx('المنجز','Done')+' '+n(progress(m))+'</small></div>'+(movable?'<span class="mo8-move-mark">↔</span>':'<span class="mo8-lock-mark">🔒</span>')+'</div>';
      }).join(''):'<div class="mo8-empty-slot">'+tx('اسحب منطقة إلى هنا','Drop an area here')+'</div>';
      return '<div class="mo8-date-column '+(d===todayKey?'today ':'')+(dayMissions.length?'occupied':'')+'" data-mo-drop-date="'+safe(d)+'"><div class="mo8-date-head"><span>'+safe(plannerDayLabel(d))+'</span><b>'+safe(fmtDate(d))+'</b><small>'+n(dayMissions.length)+' '+tx('منطقة','areas')+'</small></div><div class="mo8-date-body">'+chips+'</div></div>';
    }).join('')+'</div><div class="mo8-drag-status" id="moRepMoveHint">'+tx('اسحب أي منطقة قابلة للنقل إلى تاريخ آخر.','Drag any movable area to another date.')+'</div></div><div class="mo8-map-panel"><div class="mo8-map-head"><div><b>'+tx('موقع المنطقة','Area location')+'</b><span>'+tx('تتحدث الخريطة تلقائيًا أثناء السحب','Map updates automatically while dragging')+'</span></div><div id="moRepDragMapLabel" class="mo8-map-label">'+tx('امسك منطقة لعرض موقعها','Grab an area to see its location')+'</div></div><div id="moRepDragMap" class="mo8-drag-map"></div><div class="mo8-map-legend"><span><i class="current"></i>'+tx('المنطقة التي تنقلها','Area being moved')+'</span><span><i class="target"></i>'+tx('مناطق موجودة في التاريخ المستهدف','Areas already on target date')+'</span></div></div></div></section>';

    const planCards=rows.length?rows.map(m=>{
      const live=!['completed','cancelled'].includes(m.status);
      const movable=live&&progress(m)===0&&ymd(m.scheduled_date)>=todayKey;
      return '<article class="mo4-mission-card '+statusClass(m)+' '+(movable?'mo7-draggable':'')+'" data-mo-rep-plan-row="'+safe(m.id)+'" '+(movable?'draggable="true" data-mo-drag-mission="'+safe(m.id)+'"':'')+'>'+
        (canDelete?'<label class="mo6-check" data-mo-rep-check-wrap style="display:none"><input type="checkbox" data-mo-rep-select="'+safe(m.id)+'"><span></span></label>':'')+
        '<div class="mo4-card-top"><div><span>'+safe(fmtDate(m.scheduled_date))+'</span><h4>'+safe(m.area_name)+'</h4><small>'+safe(m.city)+' · '+tx('الهدف','Target')+' '+n(m.target_customers)+' · '+tx('المنجز','Done')+' '+n(progress(m))+'</small></div><span class="mo-status-pill">'+safe(statusText(m))+'</span></div>'+
        '<div class="mo-progress"><i style="width:'+pct(m)+'%"></i></div>'+
        (live?quickTargetHtml(m):'')+
        (movable?'<div class="mo7-drag-note">⠿ '+tx('يمكن سحب هذه المنطقة مباشرة إلى أي تاريخ بالأعلى','Drag this area directly to any date above')+'</div>':(live&&progress(m)>0?'<div class="mo7-locked-note">'+tx('هذه المهمة عليها إنجاز عملاء؛ تغيير تاريخها يتم من التعديل الكامل فقط.','This mission has customer progress; change its date through full edit only.')+'</div>':''))+
        '<div class="mo4-card-actions"><button class="btn secondary mini" type="button" data-mo-rep-map="'+safe(m.id)+'">'+tx('عرض في الخريطة','View on map')+'</button><button class="btn secondary mini" type="button" data-mo-rep-history="'+safe(m.id)+'">'+tx('السجل','History')+'</button>'+
          (live?'<button class="btn secondary mini" type="button" data-mo-rep-edit="'+safe(m.id)+'">'+tx('تعديل','Edit')+'</button>':'')+
          (canDelete?'<button class="btn bad mini" type="button" data-mo-rep-delete="'+safe(m.id)+'">'+tx('حذف','Delete')+'</button>':'')+
        '</div></article>';
    }).join(''):'<div class="empty">'+tx('لا توجد خطط لهذا المندوب حتى الآن.','No plans for this representative yet.')+'</div>';

    openModal(tx('خطط المندوب — ','Representative plans — ')+rep.full_name,
      '<div class="mo5-mini-stats management"><div><span>'+tx('خطة اليوم','Today')+'</span><b>'+n(todayRows.length)+'</b></div><div><span>'+tx('قادمة','Upcoming')+'</span><b>'+n(upcoming.length)+'</b></div><div><span>'+tx('جاري التنفيذ','In progress')+'</span><b>'+n(inProgress.length)+'</b></div><div><span>'+tx('مكتملة','Completed')+'</span><b>'+n(completed.length)+'</b></div></div>'+
      scheduleRail+
      '<div class="notice"><b>'+tx('إجمالي العملاء المنجزين في الخطط','Total customers completed across plans')+': '+n(achieved)+'</b><br>'+tx('من هنا تضيف أو تعدل أو تحذف أو تراجع أي خطة لهذا المندوب.','From here you can add, edit, delete, or review any plan for this representative.')+'</div>'+
      '<div class="mo4-card-actions" style="margin:10px 0"><button class="btn" type="button" id="moRepAddPlan">+ '+tx('إضافة خطة','Add plan')+'</button>'+
        (canDelete?'<button class="btn secondary" type="button" id="moRepSelectToggle">'+tx('تحديد','Select')+'</button><button class="btn secondary" type="button" id="moRepSelectAll" style="display:none">'+tx('تحديد الكل','Select all')+'</button><button class="btn bad" type="button" id="moRepDeleteSelected" style="display:none" disabled>'+tx('حذف المحدد','Delete selected')+'</button>':'')+
      '</div><div class="mo4-mission-grid" id="moRepPlansGrid">'+planCards+'</div>');

    initRepScheduleMap(repId,rows);
    const firstMapMission=rows.find(m=>m.status!=='cancelled');
    if(firstMapMission)focusRepScheduleMission(firstMapMission.id);

    const add=document.getElementById('moRepAddPlan');
    if(add)add.onclick=()=>{destroyRepScheduleMap();closeModal();openMissionForm(null,repId);};

    const hint=document.getElementById('moRepMoveHint');
    let draggingMissionId=null;
    document.querySelectorAll('[data-mo-drag-mission]').forEach(card=>{
      card.addEventListener('dragstart',e=>{
        draggingMissionId=card.dataset.moDragMission;
        const m=mo.missions.find(x=>x.id===draggingMissionId);
        focusRepScheduleMission(draggingMissionId);
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setData('text/plain',draggingMissionId);
        card.classList.add('dragging');
        document.querySelectorAll('[data-mo-drop-date]').forEach(x=>x.classList.add('drop-ready'));
        if(hint&&m)hint.textContent=tx('جاري نقل: ','Moving: ')+m.area_name+tx(' — أفلتها فوق التاريخ المطلوب.',' — drop it on the wanted date.');
      });
      card.addEventListener('dragend',()=>{
        card.classList.remove('dragging');
        draggingMissionId=null;
        document.querySelectorAll('[data-mo-drop-date]').forEach(x=>x.classList.remove('dragover','drop-ready'));
        clearRepScheduleTargetDate();
        if(hint)hint.textContent=tx('اسحب أي منطقة قابلة للنقل إلى تاريخ آخر.','Drag any movable area to another date.');
      });
    });

    document.querySelectorAll('[data-mo-drop-date]').forEach(slot=>{
      slot.addEventListener('dragenter',e=>{
        e.preventDefault();
        slot.classList.add('dragover');
        if(draggingMissionId)focusRepScheduleMission(draggingMissionId,slot.dataset.moDropDate);
      });
      slot.addEventListener('dragover',e=>{
        e.preventDefault();
        slot.classList.add('dragover');
        if(draggingMissionId)focusRepScheduleMission(draggingMissionId,slot.dataset.moDropDate);
        if(e.dataTransfer)e.dataTransfer.dropEffect='move';
      });
      slot.addEventListener('dragleave',e=>{
        if(!slot.contains(e.relatedTarget))slot.classList.remove('dragover');
      });
      slot.addEventListener('drop',async e=>{
        e.preventDefault();
        e.stopPropagation();
        slot.classList.remove('dragover');
        const id=e.dataTransfer?.getData('text/plain')||draggingMissionId;
        if(!id)return;
        const m=mo.missions.find(x=>x.id===id);
        if(!m)return;
        if(ymd(m.scheduled_date)===slot.dataset.moDropDate){
          if(hint)hint.textContent=tx('المنطقة موجودة أصلًا في هذا التاريخ.','The area is already on this date.');
          return;
        }
        await moveMissionByDrag(id,slot.dataset.moDropDate,repId);
      });
    });

    document.querySelectorAll('[data-mo-scheduled-chip],[data-mo-rep-plan-row]').forEach(el=>{
      const id=el.dataset.moScheduledChip||el.dataset.moRepPlanRow;
      el.addEventListener('mouseenter',()=>{if(!draggingMissionId&&id)focusRepScheduleMission(id);});
    });

    document.querySelectorAll('[data-mo-rep-map]').forEach(btn=>btn.onclick=()=>{
      const m=mo.missions.find(x=>x.id===btn.dataset.moRepMap);if(!m)return;
      destroyRepScheduleMap();closeModal();mo.selectedMissionId=m.id;renderMissionMap(m);
      setTimeout(()=>document.getElementById('marketOpeningMap')?.scrollIntoView({behavior:'smooth',block:'center'}),60);
    });
    document.querySelectorAll('[data-mo-rep-history]').forEach(btn=>btn.onclick=()=>{
      const m=mo.missions.find(x=>x.id===btn.dataset.moRepHistory);if(m)openMissionHistory(m);
    });
    document.querySelectorAll('[data-mo-rep-edit]').forEach(btn=>btn.onclick=()=>{
      const m=mo.missions.find(x=>x.id===btn.dataset.moRepEdit);if(!m)return;
      destroyRepScheduleMap();closeModal();openMissionForm(m);
    });
    document.querySelectorAll('[data-mo-rep-delete]').forEach(btn=>btn.onclick=()=>{
      const m=mo.missions.find(x=>x.id===btn.dataset.moRepDelete);if(m)openPermanentDelete(m);
    });
    document.getElementById('modalContent')?.querySelectorAll('[data-mo-quick-target]').forEach(wrap=>{
      wrap.addEventListener('pointerdown',e=>e.stopPropagation());
      wrap.addEventListener('dragstart',e=>e.preventDefault());
      const input=wrap.querySelector('[data-mo-target-input]'),btn=wrap.querySelector('[data-mo-target-save]');
      if(btn)btn.onclick=async e=>{e.stopPropagation();await saveQuickMissionTarget(btn.dataset.moTargetSave,wrap,()=>openRepPlans(repId));};
      if(input)input.onkeydown=async e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();await saveQuickMissionTarget(input.dataset.moTargetInput,wrap,()=>openRepPlans(repId));}};
    });

    if(canDelete){
      let selecting=false;
      const toggle=document.getElementById('moRepSelectToggle');
      const all=document.getElementById('moRepSelectAll');
      const del=document.getElementById('moRepDeleteSelected');
      const wraps=[...document.querySelectorAll('[data-mo-rep-check-wrap]')];
      const boxes=[...document.querySelectorAll('[data-mo-rep-select]')];
      const refresh=()=>{
        const selected=boxes.filter(x=>x.checked);
        if(del){del.disabled=selected.length===0;del.textContent=tx('حذف المحدد','Delete selected')+(selected.length?' ('+n(selected.length)+')':'');}
        if(all)all.textContent=boxes.length&&boxes.every(x=>x.checked)?tx('إلغاء تحديد الكل','Clear all'):tx('تحديد الكل','Select all');
      };
      if(toggle)toggle.onclick=()=>{
        selecting=!selecting;
        toggle.textContent=selecting?tx('إلغاء التحديد','Cancel selection'):tx('تحديد','Select');
        wraps.forEach(x=>x.style.display=selecting?'':'none');
        if(all)all.style.display=selecting?'':'none';
        if(del)del.style.display=selecting?'':'none';
        if(!selecting)boxes.forEach(x=>x.checked=false);
        refresh();
      };
      if(all)all.onclick=()=>{
        const setTo=!boxes.length?false:!boxes.every(x=>x.checked);
        boxes.forEach(x=>x.checked=setTo);refresh();
      };
      boxes.forEach(x=>x.onchange=refresh);
      if(del)del.onclick=()=>{
        const ids=boxes.filter(x=>x.checked).map(x=>x.dataset.moRepSelect);
        if(ids.length)openBulkDeleteSelected(ids);
      };
    }
  }

  function fullPlanListHtml(activeReps,filterRep=''){
    const reps=filterRep?activeReps.filter(r=>r.id===filterRep):activeReps;
    const rows=mo.missions
      .filter(m=>m.status!=='cancelled'&&(!filterRep||m.rep_id===filterRep))
      .sort((a,b)=>ymd(a.scheduled_date).localeCompare(ymd(b.scheduled_date))||String(a.created_at||'').localeCompare(String(b.created_at||'')));
    const selectedCount=[...mo.selectedMissionIds].filter(id=>rows.some(m=>m.id===id)).length;
    const allSelected=rows.length>0&&selectedCount===rows.length;
    const toolbar=canPermanentDelete()
      ?'<div class="mo6-plan-toolbar"><button class="btn secondary mini" type="button" data-mo-selection-toggle="1">'+(mo.bulkSelectMode?tx('إلغاء التحديد','Cancel selection'):tx('تحديد','Select'))+'</button>'+
        (mo.bulkSelectMode?'<button class="btn secondary mini" type="button" id="moSelectAllBtn" data-mo-select-all="1">'+(allSelected?tx('إلغاء تحديد الكل','Clear all'):tx('تحديد الكل','Select all'))+'</button><button class="btn bad mini" type="button" id="moDeleteSelectedBtn" data-mo-delete-selected="1" '+(selectedCount?'':'disabled')+'>'+tx('حذف المحدد','Delete selected')+(selectedCount?' ('+n(selectedCount)+')':'')+'</button>':'')+'</div>'
      :'';
    const groups=reps.map(rep=>{
      const plans=rows.filter(m=>m.rep_id===rep.id);
      if(!plans.length)return '';
      return '<div class="mo6-rep-plan-group"><div class="mo6-rep-plan-head"><div><b>'+safe(rep.full_name)+'</b><span>'+n(plans.length)+' '+tx('مهمة','missions')+'</span></div></div><div class="mo6-plan-list">'+plans.map(m=>{
        const live=!['completed','cancelled'].includes(m.status);
        const checked=mo.selectedMissionIds.has(m.id);
        return '<article class="mo6-plan-row '+statusClass(m)+'">'+
          (mo.bulkSelectMode&&canPermanentDelete()?'<label class="mo6-check"><input type="checkbox" data-mo-select-mission="'+safe(m.id)+'" '+(checked?'checked':'')+'><span></span></label>':'')+
          '<div class="mo6-plan-main"><div class="mo6-plan-date">'+safe(fmtDate(m.scheduled_date))+'</div><div><b>'+safe(m.area_name)+'</b><small>'+safe(m.city)+' · '+tx('الهدف','Target')+' '+n(m.target_customers)+' · '+tx('المنجز','Done')+' '+n(progress(m))+'</small></div><span class="mo-status-pill">'+safe(statusText(m))+'</span></div>'+
          (live?quickTargetHtml(m):'')+
          '<div class="mo6-plan-actions"><button class="btn secondary mini" type="button" data-mo-map="'+safe(m.id)+'">'+tx('عرض في الخريطة','View on map')+'</button><button class="btn secondary mini" type="button" data-mo-history="'+safe(m.id)+'">'+tx('السجل','History')+'</button>'+
          (live?'<button class="btn secondary mini" type="button" data-mo-edit="'+safe(m.id)+'">'+tx('تعديل','Edit')+'</button>':'')+
          (canPermanentDelete()?'<button class="btn bad mini" type="button" data-mo-delete="'+safe(m.id)+'">'+tx('حذف','Delete')+'</button>':'')+
          '</div></article>';
      }).join('')+'</div></div>';
    }).filter(Boolean).join('');
    return '<section class="mo6-all-plans"><div class="mo5-section-head"><div><span>'+tx('كل الخطط','All plans')+'</span><h3>'+tx('الخطط مرتبة حسب المندوب','Plans grouped by representative')+'</h3><small>'+tx('كل مندوب له قائمته، وتقدر تعدل أو تحذف مهمة منفردة، أو تدخل وضع التحديد لحذف عدة مهام.','Each rep has a separate list. Edit or delete one mission, or use selection mode for several missions.')+'</small></div>'+toolbar+'</div>'+
      (groups||'<div class="empty">'+tx('لا توجد خطط لعرضها.','No plans to display.')+'</div>')+'</section>';
  }

  function updateBulkSelectionControls(){
    const visible=[...document.querySelectorAll('[data-mo-select-mission]')];
    const selected=visible.filter(x=>x.checked).length;
    const deleteBtn=document.getElementById('moDeleteSelectedBtn');
    if(deleteBtn){
      deleteBtn.disabled=selected===0;
      deleteBtn.textContent=tx('حذف المحدد','Delete selected')+(selected?' ('+n(selected)+')':'');
    }
    const allBtn=document.getElementById('moSelectAllBtn');
    if(allBtn)allBtn.textContent=visible.length&&selected===visible.length?tx('إلغاء تحديد الكل','Clear all'):tx('تحديد الكل','Select all');
  }

  function missionCard(m,isOverdue){
    const done=progress(m),left=remaining(m),percent=pct(m),pending=pendingRequestForMission(m.id);
    const live=!['completed','cancelled'].includes(m.status);
    return '<article class="mo4-mission-card '+statusClass(m)+'" data-mo-mission-card="'+safe(m.id)+'">'+
      '<div class="mo4-card-top"><div><span>'+safe(repName(m.rep_id))+'</span><h4>'+safe(m.area_name)+'</h4><small>'+safe(fmtDate(m.scheduled_date))+(m.reschedule_count?' · '+tx('تأجلت ','Rescheduled ')+n(m.reschedule_count)+'×':'')+'</small></div><span class="mo-status-pill">'+safe(statusText(m))+'</span></div>'+
      '<div class="mo4-card-progress"><div><b>'+n(done)+'</b><span>/ '+n(m.target_customers)+'</span></div><strong>'+percent+'%</strong></div><div class="mo-progress"><i style="width:'+percent+'%"></i></div>'+
      '<div class="mo4-card-meta"><span>'+tx('متبقي','Remaining')+' <b>'+n(left)+'</b></span><span>'+tx('المنطقة','Zone')+' <b>'+safe(zoneSummary(m))+'</b></span>'+(pending?'<span class="pending">'+tx('طلب تأجيل','Reschedule')+' <b>'+safe(fmtDate(pending.requested_date))+'</b></span>':'')+'</div>'+
      (live?quickTargetHtml(m):'')+
      '<div class="mo4-card-actions"><button class="btn secondary mini" type="button" data-mo-map="'+safe(m.id)+'">'+tx('عرض في الخريطة','View on map')+'</button><button class="btn secondary mini" type="button" data-mo-history="'+safe(m.id)+'">'+tx('السجل','History')+'</button>'+
      (live?'<button class="btn secondary mini" type="button" data-mo-edit="'+safe(m.id)+'">'+tx('تعديل','Edit')+'</button><button class="btn warn mini" type="button" data-mo-reschedule="'+safe(m.id)+'">'+(isOverdue?tx('نقل الموعد','Move date'):tx('تأجيل مباشر','Direct reschedule'))+'</button>':'')+
      (canPermanentDelete()?'<button class="btn bad mini mo4-delete" type="button" data-mo-delete="'+safe(m.id)+'">'+tx('حذف نهائي','Delete permanently')+'</button>':'')+
      '</div></article>';
  }

    function selectedManagementMission(){
    if(!isManagementUser())return null;
    let m=mo.missions.find(x=>x.id===mo.selectedMissionId);
    if(m)return m;
    const filterDate=document.getElementById('moDateFilter')?.value||today();
    const filterRep=document.getElementById('moRepFilter')?.value||'';
    return mo.missions.find(x=>ymd(x.scheduled_date)===filterDate&&x.status!=='cancelled'&&(!filterRep||x.rep_id===filterRep))||null;
  }

  function openRepPreviewPicker(demoOnly=false){
    if(!isManagementUser())return;
    const reps=state.profiles.filter(p=>p.role==='rep'&&p.active!==false);
    const repOptions=reps.map(p=>'<option value="'+safe(p.id)+'">'+safe(p.full_name)+'</option>').join('');
    openModal(tx('معاينة تجربة المندوب','Representative Experience Preview'),
      '<div class="form-grid mo5-preview-modal"><div class="full notice"><b>'+tx('الصفحة ما زالت مخفية عن المناديب','The page is still hidden from representatives')+'</b><br>'+tx('المعاينة آمنة ولا تنفذ أزرار المندوب الفعلية.','Preview mode is safe and cannot execute rep actions.')+'</div>'+
      '<div class="full"><label>'+tx('اختر المندوب','Choose representative')+'</label><select id="moPreviewRep">'+repOptions+'</select></div>'+
      (!demoOnly?'<div class="full"><label>'+tx('اختر مهمة حقيقية للمعاينة','Choose a real mission to preview')+'</label><select id="moPreviewMission"></select><button class="btn" id="moPreviewReal" type="button" style="margin-top:8px">'+tx('عرض المهمة كما يراها المندوب','Preview real mission as rep')+'</button></div>':'')+
      '<div class="full"><label>'+tx('أو استخدم بيانات تجريبية','Or use demo data')+'</label><div class="mo5-demo-options"><button type="button" data-demo-kind="new">'+tx('قبل البدء','Before start')+'</button><button type="button" data-demo-kind="progress">'+tx('أثناء التنفيذ','In progress')+'</button><button type="button" data-demo-kind="pending">'+tx('طلب تأجيل','Pending reschedule')+'</button><button type="button" data-demo-kind="overdue">'+tx('مهمة متأخرة','Overdue')+'</button></div></div></div>');
    const repSel=document.getElementById('moPreviewRep'),missionSel=document.getElementById('moPreviewMission');
    const fill=()=>{
      if(!missionSel)return;
      const rid=repSel.value;
      const rows=mo.missions.filter(m=>m.rep_id===rid&&m.status!=='cancelled').sort((a,b)=>ymd(a.scheduled_date).localeCompare(ymd(b.scheduled_date)));
      missionSel.innerHTML=rows.length?rows.map(m=>'<option value="'+safe(m.id)+'">'+safe(fmtDate(m.scheduled_date))+' · '+safe(m.area_name)+' · '+safe(statusText(m))+'</option>').join(''):'<option value="">'+tx('لا توجد مهام لهذا المندوب','No missions for this rep')+'</option>';
    };
    if(repSel){repSel.onchange=fill;fill();}
    const realBtn=document.getElementById('moPreviewReal');
    if(realBtn)realBtn.onclick=()=>{
      if(!repSel.value||!missionSel?.value)return flash(tx('اختر المندوب والمهمة.','Choose a rep and mission.'),true);
      mo.demoPreview=null;mo.previewRepId=repSel.value;mo.previewMissionId=missionSel.value;closeModal();renderPage();
    };
    document.querySelectorAll('[data-demo-kind]').forEach(b=>b.onclick=()=>{
      buildDemoPreview(b.dataset.demoKind,repSel?.value||null);closeModal();renderPage();
    });
  }

  function renderDemoMissionMap(m){
    const el=document.getElementById('marketOpeningMap');
    if(!el||!window.L||!m)return;
    destroyMap();el.innerHTML='';
    mo.map=L.map(el,{zoomControl:true,preferCanvas:true}).setView([Number(m.center_lat),Number(m.center_lng)],13);
    addBaseMap(mo.map);addPickerMapLayers(mo.map);
    let bounds=null;
    try{
      if(m.zone_type==='district_polygon'&&m.zone_geojson){
        const layer=L.geoJSON({type:'Feature',properties:{},geometry:m.zone_geojson},{style:{color:'#0f766e',weight:4,fillColor:'#14b8a6',fillOpacity:.08}}).addTo(mo.map);
        bounds=layer.getBounds();
      }else{
        const c=L.circle([Number(m.center_lat),Number(m.center_lng)],{radius:Number(m.radius_m),color:'#0f766e',weight:3,fillOpacity:.05}).addTo(mo.map);
        bounds=c.getBounds();
      }
      const offsets=[[.002,.0015],[-.001,.002],[-.0015,-.001],[.001,-.002],[.0005,.0008]];
      offsets.forEach((o,i)=>L.circleMarker([Number(m.center_lat)+o[0],Number(m.center_lng)+o[1]],{radius:7,weight:2,fillOpacity:.8}).addTo(mo.map).bindTooltip(tx('عميل تجريبي ','Demo customer ')+(i+1)));
      mo.activeBounds=bounds;
      if(bounds?.isValid())mo.map.fitBounds(bounds,{padding:[24,24]});
      const legend=document.getElementById('moMapLegend');if(legend)legend.innerHTML='<span>'+tx('🧪 خريطة تجريبية — لا توجد بيانات حقيقية هنا','🧪 Demo map — no real customer data here')+'</span>';
    }catch(err){console.error('demo map',err);}
    setTimeout(()=>mo.map?.invalidateSize(),100);
  }

  function bindPageControls(){
    const root=document.getElementById('marketOpeningRoot');
    if(!root)return;
    root.onclick=async e=>{
      let b=e.target.closest('[data-mo-exit-preview]');if(b){mo.previewRepId=null;mo.previewMissionId=null;mo.demoPreview=null;destroyMap();renderPage();return;}
      b=e.target.closest('[data-mo-preview-picker]');if(b){openRepPreviewPicker(false);return;}
      b=e.target.closest('[data-mo-demo-picker]');if(b){openRepPreviewPicker(true);return;}
      b=e.target.closest('[data-mo-enable]');if(b){await setSystemEnabled(true);return;}
      b=e.target.closest('[data-mo-disable]');if(b){await setSystemEnabled(false);return;}
      b=e.target.closest('[data-mo-auto-plan]');if(b){openAutoPlanner();return;}
      b=e.target.closest('[data-mo-new]');if(b){openMissionForm();return;}
      b=e.target.closest('[data-mo-new-rep]');if(b){openMissionForm(null,b.dataset.moNewRep);return;}
      b=e.target.closest('[data-mo-rep-plans]');if(b){openRepPlans(b.dataset.moRepPlans);return;}
      b=e.target.closest('[data-mo-history]');if(b){const m=mo.missions.find(x=>x.id===b.dataset.moHistory);if(m)await openMissionHistory(m);return;}
      b=e.target.closest('[data-mo-add-customer]');if(b){mo.customerFormMode='mission';openCustomerForm();return;}
      b=e.target.closest('[data-mo-map]');if(b){mo.selectedMissionId=b.dataset.moMap;const m=mo.missions.find(x=>x.id===mo.selectedMissionId);if(m){if(isManagementUser()){renderManagementOverviewMap(m.id);setTimeout(()=>document.getElementById('marketOpeningMap')?.scrollIntoView({behavior:'smooth',block:'center'}),20);}else renderMissionMap(m,true);}return;}
      b=e.target.closest('[data-mo-map-period]');if(b){mo.selectedMissionId=null;mo.managementMapFilter=b.dataset.moMapPeriod;if(mo.managementMapFilter==='custom'&&!mo.managementMapDate)mo.managementMapDate=today();renderPage();return;}
      b=e.target.closest('[data-mo-map-fit]');if(b){if(mo.map&&mo.activeBounds?.isValid?.())mo.map.fitBounds(mo.activeBounds,{padding:[24,24]});return;}
      b=e.target.closest('[data-mo-map-full]');if(b){toggleMissionMapFullscreen();return;}
      b=e.target.closest('[data-mo-edit]');if(b){const m=mo.missions.find(x=>x.id===b.dataset.moEdit);if(m)openMissionForm(m);return;}
      b=e.target.closest('[data-mo-reschedule]');if(b){const m=mo.missions.find(x=>x.id===b.dataset.moReschedule);if(m)openReschedule(m);return;}
      b=e.target.closest('[data-mo-request-reschedule]');if(b){const m=mo.missions.find(x=>x.id===b.dataset.moRequestReschedule);if(m)openRepRescheduleRequest(m);return;}
      b=e.target.closest('[data-mo-request-approve]');if(b){const r=mo.requests.find(x=>x.id===b.dataset.moRequestApprove);if(r)openRequestReview(r,true);return;}
      b=e.target.closest('[data-mo-request-reject]');if(b){const r=mo.requests.find(x=>x.id===b.dataset.moRequestReject);if(r)openRequestReview(r,false);return;}
      b=e.target.closest('[data-mo-selection-toggle]');if(b){mo.bulkSelectMode=!mo.bulkSelectMode;mo.selectedMissionIds.clear();renderPage();return;}
      b=e.target.closest('[data-mo-select-all]');if(b){const boxes=[...root.querySelectorAll('[data-mo-select-mission]')];const all=boxes.length&&boxes.every(x=>x.checked);boxes.forEach(x=>{x.checked=!all;if(!all)mo.selectedMissionIds.add(x.dataset.moSelectMission);else mo.selectedMissionIds.delete(x.dataset.moSelectMission);});updateBulkSelectionControls();return;}
      b=e.target.closest('[data-mo-delete-selected]');if(b){const ids=[...mo.selectedMissionIds];if(ids.length)openBulkDeleteSelected(ids);return;}
      b=e.target.closest('[data-mo-select-mission]');if(b){if(b.checked)mo.selectedMissionIds.add(b.dataset.moSelectMission);else mo.selectedMissionIds.delete(b.dataset.moSelectMission);updateBulkSelectionControls();return;}
      b=e.target.closest('[data-mo-target-save]');if(b){await saveQuickMissionTarget(b.dataset.moTargetSave,b.closest('[data-mo-quick-target]'));return;}
      b=e.target.closest('[data-mo-delete]');if(b){const m=mo.missions.find(x=>x.id===b.dataset.moDelete);if(m)openPermanentDelete(m);return;}
    };
    root.onkeydown=async e=>{
      const input=e.target.closest?.('[data-mo-target-input]');
      if(input&&e.key==='Enter'){e.preventDefault();await saveQuickMissionTarget(input.dataset.moTargetInput,input.closest('[data-mo-quick-target]'));}
    };
    const mapRep=document.getElementById('moMapRepFilter'),mapDate=document.getElementById('moMapCustomDate');
    if(mapRep)mapRep.onchange=()=>{mo.selectedMissionId=null;mo.managementMapRep=mapRep.value||'';renderPage();};
    if(mapDate)mapDate.onchange=()=>{mo.selectedMissionId=null;mo.managementMapDate=mapDate.value||today();mo.managementMapFilter='custom';renderPage();};
  }

    function toggleMissionMapFullscreen(){
    const el=document.getElementById('marketOpeningMap');
    if(!el)return;
    if(document.fullscreenElement){
      document.exitFullscreen?.();
      return;
    }
    el.requestFullscreen?.().then(()=>setTimeout(()=>mo.map?.invalidateSize(),120)).catch(()=>{});
  }

  document.addEventListener('fullscreenchange',()=>{
    setTimeout(()=>{
      mo.map?.invalidateSize();
      if(mo.map&&mo.activeBounds?.isValid?.())mo.map.fitBounds(mo.activeBounds,{padding:[18,18]});
    },120);
  });

  async function startMission(id){
    const {data,error}=await sb.rpc('start_market_mission',{p_mission_id:id});
    if(error)return flash(tx('تعذر بدء المهمة: ','Could not start mission: ')+error.message,true);
    if(data!==true)return flash(tx('المهمة غير موجودة.','Mission not found.'),true);
    flash(tx('بدأت المهمة.','Mission started.'));
    await loadData(true);
  }

  function missionFormHtml(m,prefillRep=''){
    const editing=!!m;
    const reps=state.profiles.filter(p=>p.role==='rep'&&p.active!==false);
    const defaultDate=m?.scheduled_date||today();
    const radius=Number(m?.radius_m||mo.settings?.default_radius_m||2500);
    const radiusOptions=[500,1000,1500,2000,2500,3000,4000,5000,7500,10000];
    if(!radiusOptions.includes(radius))radiusOptions.push(radius);
    radiusOptions.sort((a,b)=>a-b);
    const locked=false;
    const selectedRep=m?.rep_id||prefillRep||'';
    const mode=m?.zone_type==='district_polygon'?'district_polygon':'district_polygon';
    const savedGeo=m?.zone_geojson?JSON.stringify(m.zone_geojson):'';
    return '<div class="form-grid mo-mission-form mo-v3-form">'+
      (editing?'<div class="full notice"><b>'+tx('تعديل إداري كامل للخطة','Full management plan editing')+'</b><br>'+tx('تقدر تغيّر المندوب، التاريخ، الحي، الهدف والملاحظات. العملاء المسجلون سابقًا يبقون في السجل التاريخي حتى لو غيرت المندوب أو المنطقة.','You can change the rep, date, zone, target and notes. Previously recorded customers remain in history even if the rep or zone changes.')+'</div>':'')+
      '<div><label>'+tx('المندوب','Representative')+'</label><select id="moFRep"><option value="">'+tx('اختر المندوب...','Choose representative...')+'</option>'+reps.map(p=>'<option value="'+safe(p.id)+'" '+(p.id===selectedRep?'selected':'')+'>'+safe(p.full_name)+'</option>').join('')+'</select></div><div><label>'+tx('التاريخ','Date')+'</label><input type="date" id="moFDate" value="'+safe(defaultDate)+'"></div>'+
      '<div><label>'+tx('المدينة','City')+'</label><input id="moFCity" value="'+safe(m?.city||'الرياض')+'" autocomplete="off" '+(m?.zone_type==='radius'?'':'readonly')+'></div>'+
      '<div><label>'+tx('الحي / المنطقة','District / Area')+'</label><input id="moFArea" value="'+safe(m?.area_name||'')+'" autocomplete="off" placeholder="'+tx('مثال: المونسية','e.g. Al Munsiyah')+'" '+(m?.zone_type==='radius'?'':'readonly')+'></div>'+
      '<div><label>'+tx('هدف العملاء الجدد','New-customer target')+'</label><input type="number" id="moFTarget" min="1" max="50" step="1" value="'+safe(m?.target_customers||6)+'"></div>'+
      '<div id="moRadiusWrap" class="'+(m?.zone_type==='radius'?'':'hidden')+'"><label>'+tx('نطاق الدائرة الاحتياطية','Fallback circle radius')+'</label><select id="moFRadius">'+radiusOptions.map(v=>'<option value="'+v+'" '+(v===radius?'selected':'')+'>'+((v/1000).toFixed(v<1000?1:0))+' km</option>').join('')+'</select></div>'+
      '<div class="full mo-zone-mode-block"><label>'+tx('طريقة تحديد منطقة العمل','Work-zone selection')+'</label><div class="mo-zone-segmented">'+
        '<button type="button" class="mo-zone-mode active" data-mo-zone-mode="district_polygon" '+(locked?'disabled':'')+'>'+tx('اختيار حي كامل','Select full district')+'</button>'+
        '<button type="button" class="mo-zone-mode" data-mo-zone-mode="radius" '+(locked?'disabled':'')+'>'+tx('تحديد يدوي بالدائرة','Manual circle')+'</button>'+
      '</div><div class="small">'+tx('الوضع الافتراضي يحدد حدود الحي الرسمية بالكامل. الدائرة تبقى خياراً احتياطياً للمناطق غير الموجودة في طبقة الأحياء.','Default mode selects the complete district boundary. Circle mode remains a fallback for areas outside the district layer.')+'</div></div>'+
      '<div class="full" id="moDistrictTools"><label>'+tx('ابحث عن الحي أو اضغط عليه مباشرة في الخريطة','Search for a district or click it directly on the map')+'</label><input id="moDistrictSearch" autocomplete="off" placeholder="'+tx('اكتب اسم الحي...','Type district name...')+'"><div id="moDistrictResults" class="mo-district-results"></div><div id="moDistrictStatus" class="mo-district-status">'+(m?.zone_type==='district_polygon'?'<b>'+safe(m.area_name)+'</b>'+(m.municipality_name?' · '+safe(m.municipality_name):''):tx('اختر حي من الخريطة.','Choose a district from the map.'))+'</div></div>'+
      '<div class="full"><label>'+tx('ملاحظة للمندوب (اختياري)','Note to representative (optional)')+'</label><textarea id="moFNotes" rows="2">'+safe(m?.notes||'')+'</textarea></div>'+
      '<div class="full mo-picker-shell"><div class="mo-picker-head"><div><b>'+tx('خريطة اختيار المنطقة','Zone selection map')+'</b><span>'+tx('مرّر على أي حي لمعرفة اسمه واضغط لتحديد حدوده كاملة.','Hover a district to see its name; click to select its full boundary.')+'</span></div><span class="mo-live-chip">'+tx('GIS مباشر','LIVE GIS')+'</span></div><div id="marketMissionPickerMap" class="mo-picker-map mo-picker-map-v3"></div>'+
      '<input type="hidden" id="moFLat" value="'+safe(m?.center_lat??'')+'"><input type="hidden" id="moFLng" value="'+safe(m?.center_lng??'')+'">'+
      '<input type="hidden" id="moFEditingMissionId" value="'+safe(m?.id||'')+'"><input type="hidden" id="moFZoneLocked" value="'+(locked?'1':'0')+'"><input type="hidden" id="moFZoneType" value="'+safe(m?.zone_type||mode)+'"><input type="hidden" id="moFDistrictNo" value="'+safe(m?.district_no||'')+'"><input type="hidden" id="moFMunicipality" value="'+safe(m?.municipality_name||'')+'"><textarea id="moFZoneGeojson" class="hidden">'+safe(savedGeo)+'</textarea>'+
      '<div id="moFLocationText" class="small mo-picker-status"></div><div id="moFZonePreview" class="mo-v2-zone-preview mo-v3-zone-preview"></div></div>'+
      '<div class="full mo-save-row"><button class="btn mo-v3-save" type="button" id="moFSave">'+(editing?tx('حفظ التعديل','Save changes'):tx('اعتماد المهمة','Approve mission'))+'</button></div>'+
    '</div>';
  }

  function openMissionForm(m=null,prefillRep=''){
    if(!isManagementUser())return;
    if(m?.id)mo.selectedMissionId=m.id;
    openModal(m?tx('تعديل مهمة فتح السوق','Edit Market Opening Mission'):tx('مهمة فتح سوق جديدة','New Market Opening Mission'),missionFormHtml(m,prefillRep));
    setTimeout(()=>{
      initMissionPicker(m);
      document.getElementById('moFRadius')?.addEventListener('change',()=>{updatePickerCircle();scheduleZonePreview();});
      document.getElementById('moFRep')?.addEventListener('change',scheduleZonePreview);
      document.getElementById('moFDate')?.addEventListener('change',scheduleZonePreview);
      document.getElementById('moDistrictSearch')?.addEventListener('input',renderDistrictSearchResults);
      document.querySelectorAll('[data-mo-zone-mode]').forEach(b=>b.addEventListener('click',()=>setZoneMode(b.dataset.moZoneMode)));
      document.getElementById('moFSave')?.addEventListener('click',()=>saveMissionForm(m));
    },80);
  }

  function addPickerMapLayers(map){
    try{
      const imagery=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Imagery © Esri'});
      L.control.layers(null,{[tx('صور جوية','Satellite imagery')]:imagery},{collapsed:true,position:'topright'}).addTo(map);
    }catch(_){}
  }

  async function initMissionPicker(m){
    const el=document.getElementById('marketMissionPickerMap');
    if(!el||!window.L)return;
    if(mo.pickerMap){try{mo.pickerMap.remove()}catch(_){}}
    mo.pickerMap=null;mo.pickerMarker=null;mo.pickerCircle=null;mo.pickerDistrictLayer=null;mo.pickerSelectedLayer=null;mo.selectedDistrict=null;mo.pickerDistrictLayer=null;mo.pickerSelectedLayer=null;mo.selectedDistrict=null;
    const center=m?[Number(m.center_lat),Number(m.center_lng)]:[24.7136,46.6753];
    mo.pickerMap=L.map(el,{zoomControl:true,preferCanvas:true}).setView(center,m?13:11);
    addBaseMap(mo.pickerMap);
    addPickerMapLayers(mo.pickerMap);
    mo.pickerMap.on('click',e=>{
      if(document.getElementById('moFZoneType')?.value==='radius')setPickerCenter(e.latlng.lat,e.latlng.lng,true);
    });

    const existingPolygon=m?.zone_type==='district_polygon'&&m?.zone_geojson;
    if(existingPolygon){
      setSelectedGeometry({
        type:'Feature',
        properties:{
          DISTRICT_NAME:m.area_name,
          DISTRICT_NO:m.district_no,
          MUNIC_NAME:m.municipality_name
        },
        geometry:m.zone_geojson
      },false);
    }else if(m){
      setZoneMode('radius',true);
      setPickerCenter(center[0],center[1],false);
    }else{
      setZoneMode('district_polygon',true);
    }

    try{
      const districts=await loadDistrictData();
      if(!mo.pickerMap)return;
      mo.pickerDistrictLayer=L.geoJSON(districts,{
        style:()=>({color:'#64748b',weight:1,fillColor:'#94a3b8',fillOpacity:.025}),
        onEachFeature:(feature,layer)=>{
          const p=feature.properties||{};
          const name=p.DISTRICT_NAME||p.DISTRICT_NAME_EN||p.DISTRICT_NO||'-';
          layer.bindTooltip(safe(name),{sticky:true,direction:'top',className:'mo-district-tooltip'});
          layer.on({
            mouseover:()=>{if(document.getElementById('moFZoneType')?.value==='district_polygon')layer.setStyle({weight:2,color:'#2563eb',fillColor:'#60a5fa',fillOpacity:.13});},
            mouseout:()=>{if(mo.pickerDistrictLayer&&layer!==mo.pickerSelectedLayer)mo.pickerDistrictLayer.resetStyle(layer);},
            click:e=>{
              if(document.getElementById('moFZoneType')?.value!=='district_polygon')return;
              if(e?.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);
              if(document.getElementById('moFZoneLocked')?.value==='1'){
                flash(tx('حدود المنطقة مقفلة بعد تسجيل أول عميل.','The zone boundary is locked after the first customer is counted.'),true);
                return;
              }
              setSelectedGeometry(feature,true);
            }
          });
        }
      }).addTo(mo.pickerMap);
      renderDistrictSearchResults();
    }catch(err){
      console.error('district layer',err);
      const box=document.getElementById('moDistrictStatus');
      if(box)box.innerHTML='<span class="bad">'+tx('تعذر تحميل حدود الأحياء الآن. استخدم التحديد الدائري الاحتياطي.','District boundaries could not be loaded. Use fallback circle mode.')+'</span>';
    }
    setTimeout(()=>mo.pickerMap?.invalidateSize(),120);
  }

  function setZoneMode(mode,silent=false){
    if(!['district_polygon','radius'].includes(mode))return;
    const inp=document.getElementById('moFZoneType');if(inp)inp.value=mode;
    document.querySelectorAll('[data-mo-zone-mode]').forEach(b=>b.classList.toggle('active',b.dataset.moZoneMode===mode));
    document.getElementById('moDistrictTools')?.classList.toggle('hidden',mode!=='district_polygon');
    document.getElementById('moRadiusWrap')?.classList.toggle('hidden',mode!=='radius');
    const areaInput=document.getElementById('moFArea'),cityInput=document.getElementById('moFCity');
    if(areaInput)areaInput.readOnly=mode==='district_polygon';
    if(cityInput){
      cityInput.readOnly=mode==='district_polygon';
      if(mode==='district_polygon')cityInput.value='الرياض';
    }

    if(mode==='radius'){
      if(mo.pickerSelectedLayer){try{mo.pickerSelectedLayer.remove()}catch(_){} mo.pickerSelectedLayer=null;}
      mo.selectedDistrict=null;
      const g=document.getElementById('moFZoneGeojson');if(g)g.value='';
      const d=document.getElementById('moFDistrictNo');if(d)d.value='';
      const mu=document.getElementById('moFMunicipality');if(mu)mu.value='';
      const lat=Number(document.getElementById('moFLat')?.value),lng=Number(document.getElementById('moFLng')?.value);
      if(Number.isFinite(lat)&&Number.isFinite(lng))setPickerCenter(lat,lng,false);
      else if(mo.pickerMap){const c=mo.pickerMap.getCenter();setPickerCenter(c.lat,c.lng,false);}
    }else{
      if(mo.pickerCircle){try{mo.pickerCircle.remove()}catch(_){} mo.pickerCircle=null;}
      if(mo.pickerMarker){try{mo.pickerMarker.remove()}catch(_){} mo.pickerMarker=null;}
    }
    if(!silent)scheduleZonePreview();
  }

  function setSelectedGeometry(feature,fit=true){
    if(!feature?.geometry||!mo.pickerMap)return;
    setZoneMode('district_polygon',true);
    if(mo.pickerSelectedLayer){try{mo.pickerSelectedLayer.remove()}catch(_){}}
    mo.pickerSelectedLayer=L.geoJSON(feature,{
      style:{color:'#0f766e',weight:4,fillColor:'#14b8a6',fillOpacity:.16}
    }).addTo(mo.pickerMap);

    const bounds=mo.pickerSelectedLayer.getBounds();
    const center=bounds.getCenter();
    const p=feature.properties||{};
    mo.selectedDistrict=feature;
    document.getElementById('moFLat').value=Number(center.lat).toFixed(6);
    document.getElementById('moFLng').value=Number(center.lng).toFixed(6);
    document.getElementById('moFZoneGeojson').value=JSON.stringify(feature.geometry);
    document.getElementById('moFDistrictNo').value=p.DISTRICT_NO||'';
    document.getElementById('moFMunicipality').value=p.MUNIC_NAME||'';
    const area=document.getElementById('moFArea');if(area&&p.DISTRICT_NAME)area.value=p.DISTRICT_NAME;
    const city=document.getElementById('moFCity');if(city)city.value='الرياض';
    const status=document.getElementById('moDistrictStatus');
    if(status)status.innerHTML='<div class="mo-selected-district"><span>'+tx('الحي المحدد','Selected district')+'</span><b>'+safe(p.DISTRICT_NAME||p.DISTRICT_NAME_EN||'-')+'</b><small>'+safe(p.MUNIC_NAME||'')+(p.DISTRICT_NO?' · '+tx('كود','Code')+' '+safe(p.DISTRICT_NO):'')+'</small></div>';
    const box=document.getElementById('moFLocationText');
    if(box)box.textContent=tx('تم اعتماد حدود الحي كاملة، وسيتم منع تسجيل أي عميل خارجها.','Full district boundary selected; customers outside it will be blocked.');
    if(fit&&bounds.isValid())mo.pickerMap.fitBounds(bounds,{padding:[24,24]});
    scheduleZonePreview();
  }

  function renderDistrictSearchResults(){
    const box=document.getElementById('moDistrictResults');if(!box)return;
    const q=(document.getElementById('moDistrictSearch')?.value||'').trim().toLowerCase();
    const rows=(mo.districtData?.features||[]).filter(f=>{
      const p=f.properties||{};
      return !q||String(p.DISTRICT_NAME||'').toLowerCase().includes(q)||String(p.DISTRICT_NAME_EN||'').toLowerCase().includes(q)||String(p.MUNIC_NAME||'').toLowerCase().includes(q);
    }).slice(0,q?10:0);
    if(document.getElementById('moFZoneLocked')?.value==='1'){box.innerHTML='';return;}
    box.innerHTML=rows.map((f,i)=>{
      const p=f.properties||{};
      return '<button type="button" data-mo-district-index="'+i+'"><b>'+safe(p.DISTRICT_NAME||p.DISTRICT_NAME_EN||'-')+'</b><span>'+safe(p.MUNIC_NAME||'')+'</span></button>';
    }).join('');
    [...box.querySelectorAll('[data-mo-district-index]')].forEach((b,i)=>b.onclick=()=>setSelectedGeometry(rows[i],true));
  }

  function setPickerCenter(lat,lng,pan){
    if(document.getElementById('moFZoneType'))document.getElementById('moFZoneType').value='radius';
    document.getElementById('moFLat').value=Number(lat).toFixed(6);
    document.getElementById('moFLng').value=Number(lng).toFixed(6);
    const ll=[Number(lat),Number(lng)];
    if(!mo.pickerMarker)mo.pickerMarker=L.marker(ll,{draggable:true}).addTo(mo.pickerMap);
    else mo.pickerMarker.setLatLng(ll);
    mo.pickerMarker.off('dragend').on('dragend',e=>{const p=e.target.getLatLng();setPickerCenter(p.lat,p.lng,false);});
    updatePickerCircle();
    if(pan)mo.pickerMap.panTo(ll);
    const box=document.getElementById('moFLocationText');
    if(box)box.textContent=tx('تم تحديد مركز الدائرة الاحتياطية.','Fallback circle center selected.')+' '+Number(lat).toFixed(5)+', '+Number(lng).toFixed(5);
    scheduleZonePreview();
  }

  let moZonePreviewTimer=null,moZonePreviewSeq=0;
  function scheduleZonePreview(){
    if(!isManagementUser())return;
    clearTimeout(moZonePreviewTimer);
    moZonePreviewTimer=setTimeout(loadZonePreview,300);
  }

  async function loadZonePreview(){
    const box=document.getElementById('moFZonePreview');if(!box)return;
    const lat=Number(document.getElementById('moFLat')?.value),lng=Number(document.getElementById('moFLng')?.value),radius=Number(document.getElementById('moFRadius')?.value||2500);
    const zoneType=document.getElementById('moFZoneType')?.value||'radius';
    let geo=null;
    try{geo=JSON.parse(document.getElementById('moFZoneGeojson')?.value||'null');}catch(_){}
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||!radius||(zoneType==='district_polygon'&&!geo)){box.innerHTML='<span>'+tx('حدد الحي أولاً لعرض تحليل المنطقة.','Select a district first to analyze the zone.')+'</span>';return;}
    const seq=++moZonePreviewSeq;
    box.innerHTML='<div class="mo-v3-loading">'+tx('جاري تحليل المنطقة والتعارضات...','Analyzing coverage and conflicts...')+'</div>';
    const date=document.getElementById('moFDate')?.value||today();
    const rep=document.getElementById('moFRep')?.value||null;
    const missionId=document.getElementById('moFEditingMissionId')?.value||null;
    const [preview,conflicts]=await Promise.all([
      sb.rpc('market_opening_zone_preview_v3',{p_center_lat:lat,p_center_lng:lng,p_radius_m:radius,p_zone_type:zoneType,p_zone_geojson:geo}),
      sb.rpc('market_opening_zone_conflicts_v2',{p_scheduled_date:date,p_rep_id:rep,p_zone_type:zoneType,p_zone_geojson:geo,p_center_lat:lat,p_center_lng:lng,p_radius_m:radius,p_exclude_mission_id:missionId})
    ]);
    if(seq!==moZonePreviewSeq)return;
    if(preview.error){box.innerHTML='<span>'+tx('تعذر تحليل المنطقة الآن.','Could not analyze the area right now.')+'</span>';return;}
    const x=preview.data?.[0]||{};
    const total=Number(x.existing_customers||0),openedAll=Number(x.all_time_market_opened_customers||0);
    const density=total<=3?tx('تغطيتنا ضعيفة','Low current coverage'):total<=10?tx('تغطيتنا متوسطة','Medium current coverage'):tx('تغطيتنا مرتفعة','High current coverage');
    const conflictRows=conflicts.error?[]:(conflicts.data||[]);
    box.innerHTML='<div class="mo4-zone-insight-head"><div><span>'+tx('قراءة المنطقة','ZONE INTELLIGENCE')+'</span><h4>'+safe(document.getElementById('moFArea')?.value||tx('المنطقة المحددة','Selected zone'))+'</h4></div><strong>'+n(total)+'</strong><small>'+tx('إجمالي عملائنا داخل الحدود','total customers inside boundary')+'</small></div>'+
    '<div class="mo-v3-analysis-grid">'+
      '<div class="mo-v3-analysis-card coverage"><span>'+tx('إجمالي التغطية','Total coverage')+'</span><b>'+density+'</b><strong>'+n(total)+'</strong><small>'+tx('كل العملاء المسجلين حاليًا داخل المنطقة','all currently registered customers in the zone')+'</small></div>'+
      '<div class="mo-v3-analysis-card recent"><span>'+tx('عملاء فتح السوق تاريخيًا','All-time market-opening customers')+'</span><strong>'+n(openedAll)+'</strong><small>'+tx('بدون حد 30 يوم — من بداية النظام','no 30-day limit — since system start')+'</small></div>'+
      '<div class="mo-v3-analysis-card conflict '+(conflictRows.length?'warn':'ok')+'"><span>'+tx('تعارض المهام','Mission overlap')+'</span><strong>'+n(conflictRows.length)+'</strong><small>'+(conflictRows.length?tx('منطقة متداخلة تحتاج انتباه','overlapping zones need attention'):tx('لا يوجد تعارض في هذا اليوم','no overlap on this date'))+'</small></div>'+
    '</div>'+
    '<div class="mo-v2-preview-stats"><span>'+tx('نشط','Active')+' <b>'+n(x.active_customers)+'</b></span><span>'+tx('متردد','Hesitant')+' <b>'+n(x.hesitant_customers)+'</b></span><span>'+tx('رافض','Rejected')+' <b>'+n(x.rejected_customers)+'</b></span><span>'+tx('متفق','Agreed')+' <b>'+n(x.agreed_customers)+'</b></span></div>'+
    (conflictRows.length?'<div class="mo-v3-conflicts"><b>'+tx('تداخلات نفس اليوم','Same-day overlaps')+'</b>'+conflictRows.slice(0,6).map(c=>'<span>'+safe(c.rep_name)+' · '+safe(c.area_name)+' <strong>'+safe(c.overlap_pct||0)+'%</strong></span>').join('')+'</div>':'')+
    '<small>'+tx('الأرقام مبنية على بيانات العملاء المسجلين لدينا داخل حدود المنطقة المختارة.','Figures are based on customers already registered in our system inside the selected boundary.')+'</small>';
  }

  function updatePickerCircle(){
    if(!mo.pickerMap||document.getElementById('moFZoneType')?.value!=='radius')return;
    const lat=Number(document.getElementById('moFLat')?.value),lng=Number(document.getElementById('moFLng')?.value),radius=Number(document.getElementById('moFRadius')?.value||2500);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
    if(mo.pickerCircle)mo.pickerCircle.remove();
    mo.pickerCircle=L.circle([lat,lng],{radius,weight:3,color:'#2563eb',fillColor:'#60a5fa',fillOpacity:.10}).addTo(mo.pickerMap);
  }

  async function saveMissionForm(existing){
    const rep=document.getElementById('moFRep')?.value||'';
    const date=document.getElementById('moFDate')?.value||'';
    const city=document.getElementById('moFCity')?.value.trim()||'';
    const area=document.getElementById('moFArea')?.value.trim()||'';
    const target=Number(document.getElementById('moFTarget')?.value||0);
    const radius=Number(document.getElementById('moFRadius')?.value||2500);
    const lat=Number(document.getElementById('moFLat')?.value),lng=Number(document.getElementById('moFLng')?.value);
    const notes=document.getElementById('moFNotes')?.value.trim()||null;
    const zoneType=document.getElementById('moFZoneType')?.value||'radius';
    const districtNo=document.getElementById('moFDistrictNo')?.value||null;
    const municipality=document.getElementById('moFMunicipality')?.value||null;
    let geo=null;try{geo=JSON.parse(document.getElementById('moFZoneGeojson')?.value||'null');}catch(_){}

    if(!rep)return flash(tx('اختر المندوب.','Choose representative.'),true);
    if(!date)return flash(tx('اختر التاريخ.','Choose the date.'),true);
    const dow=new Date(date+'T00:00:00Z').getUTCDay();
    if(dow===5)return flash(tx('الجمعة ليس يوم عمل.','Friday is not a working day.'),true);
    if(existing&&date!==ymd(existing.scheduled_date)&&date<today())return flash(tx('لا يمكن نقل المهمة إلى تاريخ سابق.','Mission cannot be moved to a past date.'),true);
    if(!existing&&date<today())return flash(tx('لا يمكن اختيار تاريخ سابق.','Mission date cannot be in the past.'),true);
    if(city.length<2)return flash(tx('اكتب المدينة.','Enter the city.'),true);
    if(area.length<2)return flash(tx('اكتب الحي أو المنطقة.','Enter the area.'),true);
    if(!(target>=1&&target<=50))return flash(tx('الهدف يجب أن يكون من 1 إلى 50.','Target must be between 1 and 50.'),true);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return flash(tx('حدد المنطقة على الخريطة.','Select the zone on the map.'),true);
    if(zoneType==='district_polygon'&&(!districtNo||!geo))return flash(tx('اختر الحي من الخريطة حتى يتم حفظ حدوده كاملة.','Choose the district on the map so its full boundary can be saved.'),true);

    const btn=document.getElementById('moFSave');if(btn)btn.disabled=true;
    let res;
    if(existing){
      res=await sb.rpc('admin_update_market_mission_full',{
        p_mission_id:existing.id,p_rep_id:rep,p_scheduled_date:date,
        p_city:city,p_area_name:area,p_target_customers:target,
        p_center_lat:lat,p_center_lng:lng,p_radius_m:radius,p_notes:notes,
        p_zone_type:zoneType,p_district_no:districtNo,p_municipality_name:municipality,p_zone_geojson:geo
      });
    }else{
      res=await sb.rpc('admin_create_market_mission_v2',{
        p_rep_id:rep,p_scheduled_date:date,p_city:city,p_area_name:area,p_target_customers:target,
        p_center_lat:lat,p_center_lng:lng,p_radius_m:radius,p_notes:notes,
        p_zone_type:zoneType,p_district_no:districtNo,p_municipality_name:municipality,p_zone_geojson:geo
      });
    }
    if(btn)btn.disabled=false;
    if(res.error)return flash(tx('تعذر حفظ المهمة: ','Could not save mission: ')+friendlyError(res.error.message),true);
    if(existing&&res.data?.ok===false)return flash(tx('المهمة غير موجودة.','Mission not found.'),true);
    const outside=Number(existing?res.data?.customers_outside_new_zone||0:0);
    const rejected=Number(existing?res.data?.pending_requests_auto_rejected||0:0);
    closeModal();cleanupPicker();
    let savedMsg=existing?tx('تم حفظ التعديل الكامل للخطة.','Full plan changes saved.'):tx('تم إنشاء المهمة بحدود المنطقة المعتمدة.','Mission created with the selected zone boundary.');
    if(outside>0)savedMsg+=' '+tx('تنبيه: ','Note: ')+n(outside)+tx(' عميل مسجل سابقًا خارج المنطقة الجديدة وبقي في السجل التاريخي.',' previously recorded customer(s) are outside the new zone and remain in history.');
    if(rejected>0)savedMsg+=' '+tx('تم إلغاء طلب التأجيل المعلق تلقائيًا.','The pending reschedule request was automatically closed.');
    flash(savedMsg);
    await loadData(true);
  }

    function openRepRescheduleRequest(m){
    if(!isRepUser()||m.rep_id!==state.profile.id)return;
    const pending=pendingRequestForMission(m.id);
    if(pending)return flash(tx('عندك طلب تأجيل تحت المراجعة بالفعل.','A reschedule request is already pending.'),true);
    const suggested=ymd(m.scheduled_date)<today()?workDateOnOrAfter(today()):nextWorkDate(ymd(m.scheduled_date));
    openModal(tx('طلب تأجيل المهمة','Request Mission Reschedule'),
      '<div class="form-grid mo4-request-modal"><div class="full notice"><b>'+safe(m.area_name)+'</b><br>'+tx('هذا طلب فقط. لن يتغير موعد المهمة إلا بعد موافقة الإدارة.','This is only a request. The mission date will not change until management approves it.')+'</div><div><label>'+tx('التاريخ المطلوب','Requested date')+'</label><input type="date" id="moRRDate" min="'+safe(today())+'" value="'+safe(suggested)+'"></div><div class="full"><label>'+tx('سبب التأجيل','Reason')+'</label><textarea id="moRRReason" rows="3" placeholder="'+tx('وضح السبب للإدارة...','Explain the reason to management...')+'"></textarea></div><div class="full"><button class="btn warn" id="moRRSave" type="button">'+tx('إرسال طلب التأجيل','Send reschedule request')+'</button></div></div>');
    document.getElementById('moRRSave').onclick=async()=>{
      const date=document.getElementById('moRRDate').value,reason=document.getElementById('moRRReason').value.trim();
      if(!date)return flash(tx('اختر التاريخ المطلوب.','Choose the requested date.'),true);
      if(new Date(date+'T00:00:00Z').getUTCDay()===5)return flash(tx('الجمعة ليس يوم عمل.','Friday is not a working day.'),true);
      if(reason.length<3)return flash(tx('اكتب سبب التأجيل.','Enter the reschedule reason.'),true);
      const {data,error}=await sb.rpc('request_market_mission_reschedule',{p_mission_id:m.id,p_new_date:date,p_reason:reason});
      if(error)return flash(tx('تعذر إرسال الطلب: ','Could not send request: ')+friendlyError(error.message),true);
      if(!data)return flash(tx('تعذر إنشاء الطلب.','Could not create request.'),true);
      closeModal();flash(tx('تم إرسال طلب التأجيل للإدارة. الموعد لم يتغير حتى الآن.','Request sent to management. The mission date has not changed yet.'));await loadData(true);
    };
  }

  function openRequestReview(r,approve){
    if(!isManagementUser())return;
    const m=mo.missions.find(x=>x.id===r.mission_id);
    openModal(approve?tx('اعتماد طلب التأجيل','Approve Reschedule Request'):tx('رفض طلب التأجيل','Reject Reschedule Request'),
      '<div class="form-grid mo4-review-modal"><div class="full '+(approve?'notice':'danger-note')+'"><b>'+safe(repName(m?.rep_id||r.requested_by))+' · '+safe(m?.area_name||'-')+'</b><br>'+safe(fmtDate(m?.scheduled_date))+' → <b>'+safe(fmtDate(r.requested_date))+'</b><br><span>'+safe(r.reason)+'</span></div><div class="full"><label>'+tx('ملاحظة للإدارة / المندوب (اختياري)','Review note (optional)')+'</label><textarea id="moReviewNote" rows="3"></textarea></div><div class="full"><button class="btn '+(approve?'good':'bad')+'" id="moReviewSave" type="button">'+(approve?tx('موافقة ونقل الموعد','Approve & move date'):tx('رفض الطلب','Reject request'))+'</button></div></div>');
    document.getElementById('moReviewSave').onclick=async()=>{
      const note=document.getElementById('moReviewNote').value.trim()||null;
      const {data,error}=await sb.rpc('review_market_mission_reschedule_request',{p_request_id:r.id,p_approve:!!approve,p_review_note:note});
      if(error)return flash(tx('تعذر تنفيذ القرار: ','Could not review request: ')+friendlyError(error.message),true);
      if(data!==true)return flash(tx('الطلب غير موجود.','Request not found.'),true);
      closeModal();flash(approve?tx('تمت الموافقة ونقل موعد المهمة.','Approved and mission date updated.'):tx('تم رفض طلب التأجيل.','Reschedule request rejected.'));await loadData(true);
    };
  }

  function openBulkDeleteSelected(ids){
    if(!canPermanentDelete())return;
    const unique=[...new Set((ids||[]).filter(id=>mo.missions.some(m=>m.id===id)))];
    if(!unique.length)return;
    const rows=unique.map(id=>mo.missions.find(m=>m.id===id)).filter(Boolean);
    const preview=rows.slice(0,8).map(m=>'<li><b>'+safe(repName(m.rep_id))+'</b> · '+safe(m.area_name)+' · '+safe(fmtDate(m.scheduled_date))+'</li>').join('');
    openModal(tx('حذف المهام المحددة','Delete Selected Missions'),
      '<div class="form-grid mo4-delete-modal"><div class="full danger-note"><b>'+tx('سيتم حذف ','You are about to permanently delete ')+n(rows.length)+tx(' مهمة محددة نهائيًا.',' selected mission(s).')+'</b><br>'+tx('سيتم حذف سجلات مهام فتح السوق المرتبطة بها، لكن العملاء أنفسهم لن يُحذفوا من قائمة العملاء. لا يمكن التراجع.','Related Market Opening mission records will be deleted, but customer records themselves will remain. This cannot be undone.')+'</div>'+
      '<div class="full mo6-delete-preview"><ul>'+preview+(rows.length>8?'<li>… +'+n(rows.length-8)+'</li>':'')+'</ul></div>'+
      '<div class="full"><label>'+tx('اكتب كلمة حذف للتأكيد','Type حذف to confirm')+'</label><input id="moBulkDeleteConfirm" autocomplete="off" placeholder="حذف"></div><div class="full"><button class="btn bad" id="moBulkDeleteSave" type="button" disabled>'+tx('حذف المهام المحددة','Delete selected missions')+'</button></div></div>');
    const input=document.getElementById('moBulkDeleteConfirm'),btn=document.getElementById('moBulkDeleteSave');
    input.oninput=()=>{btn.disabled=input.value.trim()!=='حذف';};
    btn.onclick=async()=>{
      if(input.value.trim()!=='حذف')return;
      btn.disabled=true;
      const {data,error}=await sb.rpc('admin_delete_market_missions_permanently',{p_mission_ids:unique,p_confirmation:'DELETE_SELECTED'});
      btn.disabled=false;
      if(error)return flash(tx('تعذر حذف المهام المحددة: ','Could not delete selected missions: ')+friendlyError(error.message),true);
      closeModal();
      mo.selectedMissionIds.clear();
      mo.bulkSelectMode=false;
      mo.selectedMissionId=null;
      flash(tx('تم حذف ','Deleted ')+n(Number(data||0))+tx(' مهمة محددة نهائيًا.',' selected mission(s) permanently.'));
      await loadData(true);
    };
  }

  function openPermanentDelete(m){
    if(!canPermanentDelete())return;
    openModal(tx('حذف المهمة نهائيًا','Permanently Delete Mission'),
      '<div class="form-grid mo4-delete-modal"><div class="full danger-note"><b>'+safe(repName(m.rep_id))+' · '+safe(m.area_name)+'</b><br>'+tx('سيتم حذف المهمة نهائيًا وسجل أحداثها وطلبات التأجيل وربط عملاء فتح السوق وسجل التدقيق الخاص بها. العميل نفسه لن يُحذف من قائمة العملاء. لا يمكن التراجع.','The mission, its history, reschedule requests, market-opening links and mission audit entries will be permanently deleted. Customer records themselves are kept. This cannot be undone.')+'</div><div class="full"><label>'+tx('اكتب كلمة حذف للتأكيد','Type حذف to confirm')+'</label><input id="moDeleteConfirm" autocomplete="off" placeholder="حذف"></div><div class="full"><button class="btn bad" id="moDeleteSave" type="button" disabled>'+tx('حذف نهائي','Delete permanently')+'</button></div></div>');
    const input=document.getElementById('moDeleteConfirm'),btn=document.getElementById('moDeleteSave');
    input.oninput=()=>{btn.disabled=input.value.trim()!=='حذف';};
    btn.onclick=async()=>{
      if(input.value.trim()!=='حذف')return;
      btn.disabled=true;
      const {data,error}=await sb.rpc('admin_delete_market_mission_permanently',{p_mission_id:m.id,p_confirmation:'DELETE'});
      btn.disabled=false;
      if(error)return flash(tx('تعذر الحذف النهائي: ','Permanent delete failed: ')+friendlyError(error.message),true);
      if(data!==true)return flash(tx('المهمة غير موجودة.','Mission not found.'),true);
      closeModal();flash(tx('تم حذف المهمة نهائيًا من نظام فتح السوق.','Mission permanently deleted from Market Opening.'));mo.selectedMissionId=null;await loadData(true);
    };
  }

  const plannerColors=['#22d3ee','#a78bfa','#f59e0b','#10b981','#fb7185','#60a5fa','#f472b6','#84cc16'];

  function plannerReps(){
    return state.profiles.filter(p=>p.role==='rep'&&p.active!==false);
  }

  function plannerColor(repId){
    const reps=plannerReps(),i=Math.max(0,reps.findIndex(r=>r.id===repId));
    return plannerColors[i%plannerColors.length];
  }

  function openAutoPlanner(){
    if(!isManagementUser())return;
    const reps=plannerReps();
    if(!reps.length)return flash(tx('لا يوجد مناديب نشطون.','No active representatives.'),true);
    mo.plannerAssignments=new Map();
    mo.plannerLayers=new Map();
    mo.plannerActiveRepId=reps[0].id;
    openModal(tx('توزيع المناطق وبناء الخطة تلقائيًا','Territory Assignment & Auto Planner'),
      '<div class="mo4-planner">'+
        '<div class="mo4-planner-intro"><span class="mo4-eyebrow">'+tx('AUTO TERRITORY ENGINE','AUTO TERRITORY ENGINE')+'</span><h3>'+tx('وزّع كل أحياء الرياض على المناديب','Distribute all Riyadh districts across representatives')+'</h3><p>'+tx('لا يوجد حد لعدد الأحياء. تقدر توزع جميع الأحياء الظاهرة في طبقة الرياض، وبعد الاعتماد يرتب النظام أحياء كل مندوب تلقائيًا من الأقل تغطية إلى الأعلى ويتجاوز الجمعة والأيام المشغولة.','There is no district limit. You can assign every Riyadh district in the GIS layer; the system then orders each rep’s districts from least-covered to most-covered and skips Fridays and occupied dates.')+'</p></div>'+
        '<div class="mo4-planner-settings"><div><label>'+tx('بداية الخطة','Plan start')+'</label><input type="date" id="moPlanStart" min="'+safe(today())+'" value="'+safe(workDateOnOrAfter(today()))+'"></div><div><label>'+tx('هدف كل مهمة','Target per mission')+'</label><input type="number" id="moPlanTarget" min="1" max="50" value="6"></div><div><label>'+tx('ملاحظة عامة','General note')+'</label><input id="moPlanNotes" placeholder="'+tx('اختياري','Optional')+'"></div></div>'+
        '<div id="moPlannerRepPalette" class="mo4-rep-palette">'+reps.map((p,i)=>'<button type="button" data-mo-plan-rep="'+safe(p.id)+'" class="'+(i===0?'active':'')+'" style="--rep-color:'+plannerColor(p.id)+'"><i></i><b>'+safe(p.full_name)+'</b><span data-mo-plan-count="'+safe(p.id)+'">0</span></button>').join('')+'</div>'+
        '<div class="mo4-planner-workspace"><div class="mo4-planner-map-wrap"><div class="mo4-planner-search"><input id="moPlannerSearch" placeholder="'+tx('ابحث عن حي...','Search district...')+'"><div id="moPlannerSearchResults"></div></div><div id="moAutoPlannerMap"></div></div><div class="mo4-planner-side"><div class="mo4-selected-head"><div><span>'+tx('المناطق الموزعة','Assigned territories')+'</span><small id="moPlannerCoverageText"></small></div><strong id="moPlannerTotal">0</strong></div><div id="moPlannerSelection" class="mo4-selected-zones"></div></div></div>'+
        '<div class="mo4-planner-footer"><div><b>'+tx('الترتيب تلقائي','Automatic ordering')+'</b><span>'+tx('الأقل تغطية أولًا · الجمعة مستثناة · لا يوجد تعارض يومي للمندوب','Least-covered first · Friday skipped · no rep day conflicts')+'</span></div><button class="btn good" id="moPlannerSave" type="button">'+tx('ابنِ الخطة تلقائيًا','Build automatic plan')+'</button></div>'+
      '</div>');
    setTimeout(()=>initAutoPlannerMap(),80);
    document.getElementById('moPlannerRepPalette').onclick=e=>{
      const b=e.target.closest('[data-mo-plan-rep]');if(!b)return;
      mo.plannerActiveRepId=b.dataset.moPlanRep;
      document.querySelectorAll('[data-mo-plan-rep]').forEach(x=>x.classList.toggle('active',x===b));
    };
    document.getElementById('moPlannerSearch').oninput=renderPlannerSearch;
    document.getElementById('moPlannerSave').onclick=saveAutoPlanner;
  }

  async function initAutoPlannerMap(){
    const el=document.getElementById('moAutoPlannerMap');if(!el||!window.L)return;
    if(mo.plannerMap){try{mo.plannerMap.remove()}catch(_){}}
    mo.plannerMap=L.map(el,{zoomControl:true,preferCanvas:true}).setView([24.7136,46.6753],11);
    addBaseMap(mo.plannerMap);
    addPickerMapLayers(mo.plannerMap);
    try{
      const districts=await loadDistrictData();
      mo.plannerDistrictLayer=L.geoJSON(districts,{
        style:()=>({color:'#334155',weight:1,fillColor:'#0f172a',fillOpacity:.04}),
        onEachFeature:(feature,layer)=>{
          const p=feature.properties||{},key=String(p.DISTRICT_NO||'');
          if(!key)return;
          mo.plannerLayers.set(key,layer);
          layer.bindTooltip(safe(p.DISTRICT_NAME||p.DISTRICT_NAME_EN||key),{sticky:true,className:'mo4-plan-tooltip'});
          layer.on('click',e=>{
            if(e?.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);
            togglePlannerDistrict(feature,layer);
          });
          layer.on('mouseover',()=>{if(!mo.plannerAssignments.has(key))layer.setStyle({weight:2,fillOpacity:.12,color:'#64748b'});});
          layer.on('mouseout',()=>refreshPlannerLayer(key));
        }
      }).addTo(mo.plannerMap);
      setTimeout(()=>mo.plannerMap?.invalidateSize(),100);
    }catch(err){
      console.error('planner districts',err);
      flash(tx('تعذر تحميل حدود الأحياء للتخطيط.','Could not load district boundaries for planning.'),true);
    }
  }

  function togglePlannerDistrict(feature,layer){
    const p=feature.properties||{},key=String(p.DISTRICT_NO||'');
    if(!key||!mo.plannerActiveRepId)return;
    const current=mo.plannerAssignments.get(key);
    if(current&&current.repId===mo.plannerActiveRepId){
      mo.plannerAssignments.delete(key);
    }else{
      const center=layer.getBounds().getCenter();
      mo.plannerAssignments.set(key,{
        repId:mo.plannerActiveRepId,
        feature,
        zone:{
          area_name:p.DISTRICT_NAME||p.DISTRICT_NAME_EN||key,
          district_no:key,
          municipality_name:p.MUNIC_NAME||null,
          center_lat:Number(center.lat.toFixed(6)),
          center_lng:Number(center.lng.toFixed(6)),
          zone_geojson:feature.geometry
        }
      });
    }
    refreshPlannerLayer(key);
    renderPlannerSelection();
  }

  function refreshPlannerLayer(key){
    const layer=mo.plannerLayers.get(String(key));if(!layer)return;
    const a=mo.plannerAssignments.get(String(key));
    if(a){
      const color=plannerColor(a.repId);
      layer.setStyle({color,weight:3,fillColor:color,fillOpacity:.26});
      layer.bringToFront?.();
    }else{
      layer.setStyle({color:'#334155',weight:1,fillColor:'#0f172a',fillOpacity:.04});
    }
  }

  function renderPlannerSelection(){
    const reps=plannerReps(),box=document.getElementById('moPlannerSelection'),total=document.getElementById('moPlannerTotal');
    if(total)total.textContent=n(mo.plannerAssignments.size);
    const coverageText=document.getElementById('moPlannerCoverageText');
    const allDistricts=(mo.districtData?.features||[]).filter(f=>f?.properties?.DISTRICT_NO).length;
    if(coverageText){
      const left=Math.max(0,allDistricts-mo.plannerAssignments.size);
      coverageText.textContent=allDistricts
        ?tx('تم توزيع ','Assigned ')+n(mo.plannerAssignments.size)+tx(' من ',' of ')+n(allDistricts)+tx(' · باقي ',' · remaining ')+n(left)
        :'';
    }
    reps.forEach(rep=>{
      const c=[...mo.plannerAssignments.values()].filter(x=>x.repId===rep.id).length;
      const el=document.querySelector('[data-mo-plan-count="'+rep.id+'"]');if(el)el.textContent=n(c);
    });
    if(!box)return;
    if(!mo.plannerAssignments.size){box.innerHTML='<div class="mo4-selection-empty">'+tx('ابدأ باختيار مندوب ثم اضغط الأحياء على الخريطة.','Choose a rep, then click districts on the map.')+'</div>';return;}
    box.innerHTML=reps.map(rep=>{
      const zones=[...mo.plannerAssignments.entries()].filter(([,x])=>x.repId===rep.id);
      if(!zones.length)return '';
      return '<div class="mo4-rep-zone-group" style="--rep-color:'+plannerColor(rep.id)+'"><div><i></i><b>'+safe(rep.full_name)+'</b><span>'+n(zones.length)+'</span></div>'+zones.map(([key,x])=>'<button type="button" data-mo-remove-zone="'+safe(key)+'">'+safe(x.zone.area_name)+' <span>×</span></button>').join('')+'</div>';
    }).join('');
    box.querySelectorAll('[data-mo-remove-zone]').forEach(b=>b.onclick=()=>{const key=b.dataset.moRemoveZone;mo.plannerAssignments.delete(key);refreshPlannerLayer(key);renderPlannerSelection();});
  }

  function renderPlannerSearch(){
    const q=(document.getElementById('moPlannerSearch')?.value||'').trim().toLowerCase();
    const box=document.getElementById('moPlannerSearchResults');if(!box)return;
    if(!q){box.innerHTML='';return;}
    const rows=(mo.districtData?.features||[]).filter(f=>{
      const p=f.properties||{};
      return String(p.DISTRICT_NAME||'').toLowerCase().includes(q)||String(p.DISTRICT_NAME_EN||'').toLowerCase().includes(q)||String(p.MUNIC_NAME||'').toLowerCase().includes(q);
    }).slice(0,8);
    box.innerHTML=rows.map(f=>{const p=f.properties||{};return '<button type="button" data-mo-plan-search="'+safe(p.DISTRICT_NO)+'"><b>'+safe(p.DISTRICT_NAME||p.DISTRICT_NAME_EN||p.DISTRICT_NO)+'</b><span>'+safe(p.MUNIC_NAME||'')+'</span></button>';}).join('');
    box.querySelectorAll('[data-mo-plan-search]').forEach(b=>b.onclick=()=>{
      const key=b.dataset.moPlanSearch,layer=mo.plannerLayers.get(key);
      const feature=(mo.districtData?.features||[]).find(f=>String(f.properties?.DISTRICT_NO||'')===key);
      if(layer&&feature){mo.plannerMap.fitBounds(layer.getBounds(),{padding:[35,35]});togglePlannerDistrict(feature,layer);}
      document.getElementById('moPlannerSearch').value='';box.innerHTML='';
    });
  }

  async function saveAutoPlanner(){
    if(!mo.plannerAssignments.size)return flash(tx('حدد منطقة واحدة على الأقل.','Select at least one district.'),true);
    const start=document.getElementById('moPlanStart').value,target=Number(document.getElementById('moPlanTarget').value||0),notes=document.getElementById('moPlanNotes').value.trim()||null;
    if(!start)return flash(tx('اختر بداية الخطة.','Choose plan start date.'),true);
    if(!(target>=1&&target<=50))return flash(tx('الهدف يجب أن يكون من 1 إلى 50.','Target must be between 1 and 50.'),true);
    const reps=plannerReps();
    const assignments=reps.map(rep=>({
      rep_id:rep.id,
      zones:[...mo.plannerAssignments.values()].filter(x=>x.repId===rep.id).map(x=>x.zone)
    })).filter(x=>x.zones.length);
    const btn=document.getElementById('moPlannerSave');btn.disabled=true;btn.textContent=tx('جاري بناء الخطة...','Building plan...');
    const {data,error}=await sb.rpc('admin_auto_plan_market_missions_multi',{p_start_date:start,p_target_customers:target,p_assignments:assignments,p_notes:notes});
    btn.disabled=false;btn.textContent=tx('ابنِ الخطة تلقائيًا','Build automatic plan');
    if(error)return flash(tx('تعذر بناء الخطة: ','Could not build plan: ')+friendlyError(error.message),true);
    const rows=Array.isArray(data)?data:[];
    closeModal();await loadData(true);
    openModal(tx('تم بناء الخطة','Plan Built'),
      '<div class="mo4-plan-result"><div class="notice"><b>'+tx('تم إنشاء ','Created ')+n(rows.length)+tx(' مهمة وترتيبها تلقائيًا.',' missions and ordered them automatically.')+'</b></div><div>'+rows.sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(x=>'<div><span>'+safe(fmtDate(x.date))+'</span><b>'+safe(x.area_name)+'</b><small>'+tx('تغطيتنا قبل الخطة','Coverage before plan')+': '+n(x.coverage_before)+'</small></div>').join('')+'</div></div>');
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
    const a={created:'إنشاء المهمة',started:'بدء المهمة',rescheduled:'تأجيل المهمة',reschedule_requested:'طلب تأجيل',reschedule_rejected:'رفض طلب التأجيل',edited:'تعديل المهمة',target_updated:'تعديل عدد العملاء المطلوبين',customer_counted:'احتساب عميل',completed:'إكمال الهدف',cancelled:'إلغاء قديم',enabled:'تشغيل النظام',disabled:'إيقاف النظام'};
    const e={created:'Mission created',started:'Mission started',rescheduled:'Mission rescheduled',reschedule_requested:'Reschedule requested',reschedule_rejected:'Reschedule rejected',edited:'Mission edited',target_updated:'Required customer target updated',customer_counted:'Customer counted',completed:'Target completed',cancelled:'Legacy cancellation',enabled:'System enabled',disabled:'System disabled'};
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
        const before=x.details?.before||{},after=x.details?.after||{};
        const editBits=[];
        if(before.rep_id&&after.rep_id&&before.rep_id!==after.rep_id)editBits.push(tx('المندوب: ','Rep: ')+repName(before.rep_id)+' → '+repName(after.rep_id));
        if(before.area_name&&after.area_name&&before.area_name!==after.area_name)editBits.push(tx('المنطقة: ','Zone: ')+before.area_name+' → '+after.area_name);
        if(before.target_customers!=null&&after.target_customers!=null&&before.target_customers!==after.target_customers)editBits.push(tx('الهدف: ','Target: ')+before.target_customers+' → '+after.target_customers);
        const editDetails=editBits.length?'<span>'+safe(editBits.join(' · '))+'</span>':'';
        return '<div class="mo-history-item"><div><b>'+safe(eventLabel(x.event_type))+'</b><small>'+safe(typeof dateTime==='function'?dateTime(x.created_at):x.created_at)+' · '+safe(actor)+'</small></div><div class="mo-history-meta">'+dates+customerId+editDetails+(x.reason?'<span>'+safe(x.reason)+'</span>':'')+'</div></div>';
      }).join(''):'<div class="empty">'+tx('لا يوجد سجل.','No history.')+'</div>')+'</div>';
    openModal(tx('سجل مهمة فتح السوق','Market Opening Mission History'),html);
  }

  function cleanupPicker(){
    if(mo.pickerMap){try{mo.pickerMap.remove()}catch(_){}}
    mo.pickerMap=null;mo.pickerMarker=null;mo.pickerCircle=null;mo.pickerDistrictLayer=null;mo.pickerSelectedLayer=null;mo.selectedDistrict=null;
  }

  function friendlyError(msg){
    const m=String(msg||'');
    const dict={
      'representative already has a mission on this date':tx('المندوب عنده مهمة في هذا اليوم.','Representative already has a mission on this date.'),
      'district already assigned on this date':tx('هذا الحي موزع بالفعل في نفس اليوم على مهمة أخرى. غيّر التاريخ أو الحي.','This district is already assigned to another mission on the same date. Change the date or district.'),
      'mission date required':tx('اختر تاريخ المهمة.','Choose the mission date.'),
      'representative has overdue mission':tx('عند المندوب مهمة قديمة لم تُغلق. انقل موعدها أولاً قبل إنشاء خطة جديدة.','The representative has an unfinished overdue mission. Reschedule it before creating a new plan.'),
      'friday is not a working day':tx('الجمعة ليس يوم عمل.','Friday is not a working day.'),
      'mission date cannot be in the past':tx('لا يمكن اختيار تاريخ سابق.','Mission date cannot be in the past.'),
      'new date cannot be in the past':tx('لا يمكن اختيار تاريخ سابق.','New date cannot be in the past.'),
      'closed mission cannot be rescheduled':tx('المهمة مغلقة ولا يمكن تأجيلها.','Closed mission cannot be rescheduled.'),
      'closed mission cannot be edited':tx('المهمة مغلقة ولا يمكن تعديلها.','Closed mission cannot be edited.'),
      'invalid target':tx('الهدف يجب أن يكون من 1 إلى 50.','Target must be between 1 and 50.'),
      'target cannot be below achieved customers':tx('لا يمكن جعل الهدف أقل من عدد العملاء المنجزين.','Target cannot be below achieved customers.'),
      'zone cannot change after customer progress':tx('استخدم التعديل الكامل للخطة لتغيير المنطقة.','Use full plan editing to change the zone.'),
      'district polygon required':tx('اختر الحي من الخريطة حتى يتم حفظ حدوده كاملة.','Choose a district on the map so its full boundary is saved.'),
      'invalid district polygon':tx('حدود الحي غير صالحة. أعد اختيار الحي.','The district boundary is invalid. Select the district again.'),
      'invalid zone':tx('منطقة العمل غير صالحة.','The work zone is invalid.'),
      'reschedule request already pending':tx('يوجد طلب تأجيل تحت المراجعة لهذه المهمة.','A reschedule request is already pending for this mission.'),
      'request already reviewed':tx('تم اتخاذ قرار على هذا الطلب مسبقًا.','This request has already been reviewed.'),
      'requested date is now in the past':tx('التاريخ المطلوب أصبح في الماضي. اختر تاريخًا جديدًا.','The requested date is now in the past. Choose a new date.'),
      'permanent delete not allowed':tx('الحذف النهائي متاح فقط للحساب الأساسي ومحسن.','Permanent deletion is limited to the primary account and Mohsen.'),
      'choose at least one zone':tx('اختر منطقة واحدة على الأقل للمندوب.','Choose at least one zone for the representative.'),
      'invalid assignment count':tx('توزيع المناطق غير صالح.','Invalid territory assignment.'),
      'duplicate open district for representative':tx('هذه المنطقة موجودة مسبقًا ضمن خطة مفتوحة لنفس المندوب. أكمل أو ألغِ المهمة القديمة قبل إضافتها مرة ثانية.','This area already exists in an open plan for the same representative. Complete or cancel the existing mission before assigning it again.'),
      'invalid representative assignment':tx('يوجد توزيع غير صالح لأحد المناديب.','One representative assignment is invalid.'),
      'invalid zone in planner':tx('إحدى المناطق المحددة غير صالحة. أعد تحديدها من الخريطة.','One selected zone is invalid. Re-select it on the map.'),
      'market opening preview locked':tx('فتح السوق ما زال في وضع التجربة ومغلق عن المناديب.','Market Opening is still in internal preview and locked for representatives.'),
      'mission with customer progress cannot be dragged':tx('هذه المهمة عليها عملاء منجزون؛ لا يمكن نقلها بالسحب. استخدم التعديل الكامل إذا احتجت تغييرها.','This mission already has customer progress and cannot be moved by drag. Use full edit if needed.'),
      'target mission has customer progress':tx('التاريخ المطلوب عليه مهمة بدأ فيها تسجيل عملاء؛ لا يمكن تبديلها بالسحب.','The target date has a mission with customer progress, so it cannot be swapped by drag.'),
      'target date has closed mission':tx('التاريخ المطلوب عليه مهمة مغلقة ولا يمكن تبديلها.','The target date has a closed mission and cannot be swapped.'),
      'district already assigned on target date':tx('نفس الحي موزع على مندوب آخر في التاريخ المطلوب. اختر تاريخًا آخر.','The same district is assigned to another representative on the target date. Choose another date.'),
      'district already assigned on source date':tx('التبديل سيصنع تعارضًا في الحي على التاريخ القديم. اختر تاريخًا آخر.','The swap would create a district conflict on the old date. Choose another date.')
    };
    return dict[m]||m;
  }

  function customerInsideMarketMission(m,loc){
    if(!m||!loc)return false;
    const lat=Number(loc.lat),lng=Number(loc.lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return false;
    if(m.zone_type==='district_polygon'&&m.zone_geojson){
      if(pointInZoneGeojson(m.zone_geojson,lat,lng))return true;
      // Map display tolerance only: customers on boundary roads can sit a few metres
      // outside municipal polygons. This does NOT affect mission counting/targets.
      return distanceToZoneGeojsonMeters(m.zone_geojson,lat,lng)<=100;
    }
    return haversine(Number(m.center_lat),Number(m.center_lng),lat,lng)<=Number(m.radius_m||0);
  }

  function marketCustomerMarkerColor(status){
    const colors={active:'#16a34a',hesitant:'#d97706',rejected:'#dc2626',agreed_pending:'#2563eb',inactive:'#64748b',new:'#7c3aed'};
    return colors[status]||'#475569';
  }

  function managementRepColor(repId){
    const palette=['#0f766e','#2563eb','#7c3aed','#c2410c','#be123c','#0369a1','#4d7c0f','#a16207'];
    const reps=state.profiles.filter(p=>p.role==='rep'&&p.active!==false);
    const i=Math.max(0,reps.findIndex(p=>p.id===repId));
    return palette[i%palette.length];
  }

  function renderManagementOverviewMap(focusMissionId=null){
    const el=document.getElementById('marketOpeningMap');
    if(!el||!window.L||!isManagementUser())return;
    if(focusMissionId)mo.selectedMissionId=focusMissionId;
    destroyMap();el.innerHTML='';
    mo.map=L.map(el,{zoomControl:true,preferCanvas:true}).setView([24.7136,46.6753],11);
    addBaseMap(mo.map);addPickerMapLayers(mo.map);
    mo.mapExistingLayer=L.layerGroup().addTo(mo.map);
    mo.mapNewLayer=L.layerGroup().addTo(mo.map);

    const rows=mo.missions.filter(m=>m.status!=='cancelled'&&Number.isFinite(Number(m.center_lat))&&Number.isFinite(Number(m.center_lng)));
    const groups=new Map();
    rows.forEach(m=>{
      const key=m.district_no?'d:'+m.district_no:'r:'+Number(m.center_lat).toFixed(4)+':'+Number(m.center_lng).toFixed(4)+':'+Number(m.radius_m||0);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(m);
    });

    let allBounds=null,highlighted=0;
    const highlightedReps=new Set();
    const overviewCustomersById=new Map((state.customers||[]).map(x=>[Number(x.id),x]));
    const overviewLocations=mo.customerLocations||[];

    function zoneCustomerStats(mission){
      const seen=new Set();
      const counts={total:0,active:0,hesitant:0,rejected:0,agreed_pending:0,inactive:0,new:0};
      overviewLocations.forEach(loc=>{
        const cid=Number(loc.customer_id);
        if(seen.has(cid)||!customerInsideMarketMission(mission,loc))return;
        const customer=overviewCustomersById.get(cid);
        if(!customer)return;
        seen.add(cid);
        counts.total++;
        if(Object.prototype.hasOwnProperty.call(counts,customer.status))counts[customer.status]++;
      });
      return counts;
    }

    groups.forEach(group=>{
      const matches=group.filter(managementMapMatches);
      const selected=mo.selectedMissionId?group.find(m=>m.id===mo.selectedMissionId):null;
      const primary=selected||matches[0]||group.slice().sort((a,b)=>ymd(b.scheduled_date).localeCompare(ymd(a.scheduled_date)))[0];
      const isHighlight=!!selected||matches.length>0;
      if(isHighlight){highlighted++;(selected?[selected]:matches).forEach(m=>highlightedReps.add(m.rep_id));}
      const color=managementRepColor((selected||matches[0]||primary).rep_id);
      const style=isHighlight
        ?{color,weight:selected?5:4,fillColor:color,fillOpacity:selected?.26:.18,opacity:1}
        :{color,weight:2,fillColor:color,fillOpacity:.035,opacity:.42};
      let layer;
      try{
        if(primary.zone_type==='district_polygon'&&primary.zone_geojson){
          layer=L.geoJSON({type:'Feature',properties:{},geometry:primary.zone_geojson},{style});
        }else{
          layer=L.circle([Number(primary.center_lat),Number(primary.center_lng)],{radius:Number(primary.radius_m),...style});
        }
        layer.addTo(mo.map);
        const sorted=group.slice().sort((a,b)=>ymd(a.scheduled_date).localeCompare(ymd(b.scheduled_date)));
        const visible=sorted.filter(m=>ymd(m.scheduled_date)>=addCalendarDays(today(),-7)).slice(0,8);
        const stats=zoneCustomerStats(primary);
        const popupRows=(visible.length?visible:sorted.slice(-5)).map(m=>
          '<div class="mo-area-assignment-row">'+
            '<div><b>'+safe(repName(m.rep_id))+'</b><span>'+safe(fmtDate(m.scheduled_date))+'</span></div>'+
            '<div><small>'+safe(statusText(m))+'</small><strong>'+tx('الهدف ','Target ')+n(m.target_customers)+'</strong></div>'+
          '</div>'
        ).join('');
        const areaPopup=
          '<div class="mo-area-popup">'+
            '<div class="mo-area-popup-head"><div><span>'+tx('بيانات المنطقة','Area details')+'</span><h4>'+safe(primary.area_name)+'</h4></div><strong>'+n(stats.total)+'</strong><small>'+tx('عميل داخل المنطقة','customers in area')+'</small></div>'+
            '<div class="mo-area-popup-stats">'+
              '<div class="active"><span>'+tx('نشط','Active')+'</span><b>'+n(stats.active)+'</b></div>'+
              '<div class="hesitant"><span>'+tx('متردد','Hesitant')+'</span><b>'+n(stats.hesitant)+'</b></div>'+
              '<div class="rejected"><span>'+tx('رافض','Rejected')+'</span><b>'+n(stats.rejected)+'</b></div>'+
              '<div class="agreed"><span>'+tx('متفق','Agreed')+'</span><b>'+n(stats.agreed_pending)+'</b></div>'+
            '</div>'+
            '<div class="mo-area-popup-assignments"><span class="title">'+tx('الجدولة','Schedule')+'</span>'+popupRows+'</div>'+
          '</div>';
        layer.bindPopup(areaPopup,{maxWidth:360,minWidth:270});
        layer.bindTooltip(safe(primary.area_name)+' · '+safe(repName((selected||matches[0]||primary).rep_id)));
        const b=layer.getBounds?.();
        if(b?.isValid())allBounds=allBounds?allBounds.extend(b):L.latLngBounds(b);
        if(selected){
          const center=layer.getBounds?.().getCenter?.();
          if(center)setTimeout(()=>mo.map?.setView(center,13),80);
        }
      }catch(err){console.warn('management zone render',err);}
    });

    const selectedMission=focusMissionId?rows.find(m=>m.id===focusMissionId):null;
    const activeMissions=selectedMission?[selectedMission]:rows.filter(managementMapMatches);
    const activeMissionIds=new Set(activeMissions.map(m=>m.id));
    const countedIds=new Set(mo.links.filter(x=>activeMissionIds.has(x.mission_id)).map(x=>Number(x.customer_id)));
    const customersById=overviewCustomersById;
    const customerRows=[];
    const seenCustomerIds=new Set();

    (mo.customerLocations||[]).forEach(loc=>{
      const cid=Number(loc.customer_id);
      if(seenCustomerIds.has(cid))return;
      if(!activeMissions.some(m=>customerInsideMarketMission(m,loc)))return;
      const customer=customersById.get(cid);
      if(!customer)return;
      seenCustomerIds.add(cid);
      customerRows.push({loc,customer,counted:countedIds.has(cid)});
    });

    let existingCustomers=0,countedCustomers=0;
    const statusCounts={active:0,hesitant:0,rejected:0,agreed_pending:0,inactive:0,new:0};
    customerRows.forEach(row=>{
      const c=row.customer,isCounted=row.counted;
      if(isCounted)countedCustomers++;else existingCustomers++;
      if(statusCounts[c.status]!==undefined)statusCounts[c.status]++;
      const baseColor=marketCustomerMarkerColor(c.status);
      const marker=L.circleMarker([Number(row.loc.lat),Number(row.loc.lng)],{
        radius:isCounted?7:5,
        weight:isCounted?3:2,
        color:isCounted?'#047857':baseColor,
        fillColor:isCounted?'#10b981':baseColor,
        fillOpacity:isCounted?.95:.72,
        opacity:.95
      }).addTo(isCounted?mo.mapNewLayer:mo.mapExistingLayer);
      marker.bindPopup(
        '<b>'+safe(c.name)+'</b><br>'+
        safe(typeof statusLabel==='function'?statusLabel(c.status):c.status)+'<br>'+
        safe(c.rep?.full_name||repName(c.assigned_rep))+'<br>'+
        '<small>'+safe(isCounted?tx('عميل محسوب في مهمة فتح السوق المبرزة','Counted in the highlighted Market Opening mission'):tx('عميل موجود عندنا مسبقًا داخل المنطقة','Existing customer already in this area'))+'</small>'
      );
    });

    const customerStats=document.getElementById('moOverviewCustomerStats');
    if(customerStats){
      const systemCounts={
        active:(state.customers||[]).filter(x=>x.status==='active').length,
        hesitant:(state.customers||[]).filter(x=>x.status==='hesitant').length,
        rejected:(state.customers||[]).filter(x=>x.status==='rejected').length
      };
      customerStats.innerHTML='<div><span>'+tx('إجمالي عملائنا داخل المناطق المعروضة','Customers shown inside mapped areas')+'</span><b>'+n(customerRows.length)+'</b></div>'+
        '<div><span>'+tx('موجودون مسبقًا داخل المناطق','Existing customers in mapped areas')+'</span><b>'+n(existingCustomers)+'</b></div>'+
        '<div><span>'+tx('جدد محسوبون في فتح السوق','New counted in Market Opening')+'</span><b>'+n(countedCustomers)+'</b></div>'+
        '<div class="system-total"><span>'+tx('نشط','Active')+'</span><b>'+n(systemCounts.active)+'</b></div>'+
        '<div class="system-total"><span>'+tx('متردد','Hesitant')+'</span><b>'+n(systemCounts.hesitant)+'</b></div>'+
        '<div class="system-total"><span>'+tx('رافض','Rejected')+'</span><b>'+n(systemCounts.rejected)+'</b></div>';
    }

    try{
      const customerLayers={};
      customerLayers[tx('عملاؤنا الموجودون داخل المنطقة','Existing customers in area')]=mo.mapExistingLayer;
      customerLayers[tx('عملاء فتح السوق المحسوبون','Counted Market Opening customers')]=mo.mapNewLayer;
      L.control.layers(null,customerLayers,{collapsed:true,position:'topright'}).addTo(mo.map);
    }catch(_){}

    mo.activeBounds=allBounds;
    if(!focusMissionId&&allBounds?.isValid())mo.map.fitBounds(allBounds,{padding:[24,24],maxZoom:12});

    const mode=mo.managementMapFilter||'today';
    const label=mode==='all'?tx('كل المهام','All missions'):mode==='today'?tx('مهام اليوم','Today missions'):mode==='tomorrow'?tx('مهام غدًا','Tomorrow missions'):mode==='week'?tx('مهام هذا الأسبوع','This week missions'):tx('مهام تاريخ ','Missions on ')+fmtDate(mo.managementMapDate||today());
    const legend=document.getElementById('moMapLegend');
    if(legend){
      const reps=state.profiles.filter(p=>p.role==='rep'&&p.active!==false).filter(p=>!mo.managementMapRep||p.id===mo.managementMapRep);
      legend.innerHTML='<div class="mo-management-legend-head"><b>'+safe(label)+'</b><span>'+n(highlighted)+' '+tx('منطقة مبرزة','highlighted areas')+' · '+n(groups.size)+' '+tx('منطقة ظاهرة','areas visible')+'</span></div><div class="mo-management-rep-legend">'+reps.map(p=>'<span><i style="background:'+managementRepColor(p.id)+'"></i>'+safe(p.full_name)+'</span>').join('')+'<span class="muted-zone"><i></i>'+tx('باقي المناطق: نفس لون المندوب بشكل خفيف','Other areas: same representative color, lighter')+'</span><span class="customer-dot existing-dot"><i></i>'+tx('عميل موجود','Existing customer')+'</span><span class="customer-dot counted-dot"><i></i>'+tx('عميل محسوب','Counted customer')+'</span></div>';
    }
  }

  async function renderMissionMap(m,focusSelected=false){
    const el=document.getElementById('marketOpeningMap');
    if(!el||!window.L||!m)return;
    mo.selectedMissionId=m.id;
    destroyMap();
    el.innerHTML='';
    mo.map=L.map(el,{zoomControl:true,preferCanvas:true}).setView([Number(m.center_lat),Number(m.center_lng)],13);
    addBaseMap(mo.map);
    addPickerMapLayers(mo.map);
    mo.mapNewLayer=L.layerGroup().addTo(mo.map);
    mo.mapExistingLayer=L.layerGroup().addTo(mo.map);
    mo.mapPeerLayer=L.layerGroup().addTo(mo.map);

    let primaryBounds=null;
    if(m.zone_type==='district_polygon'&&m.zone_geojson){
      const zone=L.geoJSON({type:'Feature',properties:{},geometry:m.zone_geojson},{
        style:{color:'#0f766e',weight:4,fillColor:'#14b8a6',fillOpacity:.10}
      }).addTo(mo.map).bindTooltip(safe(m.area_name)+' · '+tx('حدود المهمة','Mission boundary'));
      primaryBounds=zone.getBounds();
    }else{
      const circle=L.circle([Number(m.center_lat),Number(m.center_lng)],{radius:Number(m.radius_m),weight:3,fillOpacity:.05,color:'#2563eb'}).addTo(mo.map);
      primaryBounds=circle.getBounds();
    }

    const peerRows=isManagementUser()
      ?mo.missions.filter(x=>x.id!==m.id&&x.scheduled_date===m.scheduled_date&&x.status!=='cancelled')
      :missionsForToday().filter(x=>x.id!==m.id);
    let combinedBounds=primaryBounds;
    let selectedBounds=primaryBounds;
    peerRows.forEach(x=>{
      try{
        let layer;
        if(x.zone_type==='district_polygon'&&x.zone_geojson){
          layer=L.geoJSON({type:'Feature',properties:{},geometry:x.zone_geojson},{style:isManagementUser()
            ?{color:'#94a3b8',weight:2,dashArray:'6 6',fillColor:'#cbd5e1',fillOpacity:.015}
            :{color:'#0f766e',weight:4,fillColor:'#14b8a6',fillOpacity:.10}});
        }else{
          layer=L.circle([Number(x.center_lat),Number(x.center_lng)],{radius:Number(x.radius_m),...(isManagementUser()
            ?{color:'#94a3b8',weight:2,dashArray:'6 6',fillColor:'#cbd5e1',fillOpacity:.01}
            :{color:'#2563eb',weight:3,fillOpacity:.05})});
        }
        layer.addTo(mo.mapPeerLayer).bindTooltip((isManagementUser()?safe(repName(x.rep_id))+' · ':'')+safe(x.area_name));
        const pb=layer.getBounds?.();
        if(pb?.isValid())combinedBounds=combinedBounds?combinedBounds.extend(pb):L.latLngBounds(pb);
      }catch(_){}
    });

    mo.activeBounds=combinedBounds;
    if(focusSelected&&selectedBounds?.isValid())mo.map.fitBounds(selectedBounds,{padding:[24,24]});
    else if(combinedBounds?.isValid())mo.map.fitBounds(combinedBounds,{padding:[24,24]});

    const text=document.getElementById('moSelectedMissionText');
    if(text)text.textContent=repName(m.rep_id)+' · '+m.area_name+' · '+m.city+' · '+fmtDate(m.scheduled_date)+' · '+zoneSummary(m);

    const mapMissions=!isManagementUser()?(missionsForToday().length?missionsForToday():[m]):[m];
    const [pointsResults,healthRes]=await Promise.all([
      Promise.all(mapMissions.map(x=>sb.rpc('market_opening_map_points',{p_mission_id:x.id}))),
      isManagementUser()?sb.rpc('market_opening_mission_health',{p_mission_id:m.id}):Promise.resolve({data:null,error:null})
    ]);
    if(pointsResults.some(x=>x.error)){
      const legend=document.getElementById('moMapLegend');if(legend)legend.textContent=tx('تعذر تحميل العملاء على الخريطة.','Could not load customers on the map.');
      return;
    }

    const selectedPoints=(pointsResults[mapMissions.findIndex(x=>x.id===m.id)]?.data)||[];
    const mergedPoints=new Map();
    pointsResults.forEach(res=>{
      (res.data||[]).forEach(p=>{
        const key=String(p.customer_id??[p.customer_name,p.lat,p.lng].join('|'));
        const old=mergedPoints.get(key);
        if(!old)mergedPoints.set(key,{...p});
        else if(p.is_mission_customer&&!old.is_mission_customer)mergedPoints.set(key,{...old,...p,is_mission_customer:true});
      });
    });
    mo.mapPoints=[...mergedPoints.values()];
    const multiRepMap=!isManagementUser()&&mapMissions.length>1&&!focusSelected;
    const compass=document.getElementById('moCoverageCompass');
    if(multiRepMap&&compass)compass.innerHTML='';
    const stats=multiRepMap?null:renderCoverageCompass(m,selectedPoints);

    if(stats&&m.zone_type!=='district_polygon'){
      const ranges={north:[315,405],east:[45,135],south:[135,225],west:[225,315]};
      Object.entries(ranges).forEach(([k,range])=>{
        const poly=sectorPolygon(m,range[0],range[1]);
        L.polygon(poly,{
          color:k===stats.recommended?'#f59e0b':'#94a3b8',
          weight:k===stats.recommended?2:1,
          dashArray:k===stats.recommended?'5 5':null,
          fillColor:k===stats.recommended?'#fef3c7':'#f8fafc',
          fillOpacity:k===stats.recommended?.12:.025,
          interactive:true
        }).addTo(mo.map).bindTooltip(sectorLabel(k)+(k===stats.recommended?' · '+tx('الأقل تغطية','least covered'):''));
      });
    }

    if(isManagementUser()){
      const box=document.getElementById('moIntegrityBox');
      const q=healthRes?.data?.[0]||null;
      if(box){
        if(healthRes?.error){
          box.innerHTML='<div class="mo-v2-health neutral">'+tx('تعذر فحص مؤشرات التسجيل الآن.','Could not check registration indicators right now.')+'</div>';
        }else if(q){
          const score=Number(q.review_score||0);
          const tone=score===0?'ok':score<=30?'watch':'warn';
          const title=score===0?tx('التسجيلات طبيعية','Registrations look normal'):score<=30?tx('مؤشرات بسيطة للمراجعة','Minor review indicators'):tx('تحتاج مراجعة الإدارة','Management review recommended');
          box.innerHTML='<div class="mo-v2-health '+tone+'"><div><span>'+tx('مؤشر المراجعة','Review indicator')+'</span><b>'+title+'</b></div><strong>'+n(score)+'</strong><div class="mo-v2-health-details"><span>'+tx('نفس الموقع','Repeated location')+' '+n(q.repeated_location_groups)+'</span><span>'+tx('إدخال سريع','Rapid entry')+' '+n(q.rapid_entry_pairs)+'</span><span>'+tx('رقم مكرر','Duplicate phone')+' '+n(q.duplicate_phone_groups)+'</span><span>'+tx('نقاط متقاربة جداً','Very close points')+' '+n(q.close_location_pairs)+'</span><span>'+tx('خارج الحدود','Outside boundary')+' '+n(q.outside_zone_rows)+'</span></div></div>';
        }else box.innerHTML='';
      }
    }

    let missionCount=0,existingCount=0;
    mo.mapPoints.forEach(p=>{
      const isNew=!!p.is_mission_customer;
      if(isNew)missionCount++;else existingCount++;
      const marker=L.circleMarker([Number(p.lat),Number(p.lng)],{
        radius:isNew?8:5,
        weight:isNew?3:1,
        fillOpacity:isNew?.95:.45,
        color:isNew?'#047857':'#64748b',
        fillColor:isNew?'#10b981':'#cbd5e1'
      }).addTo(isNew?mo.mapNewLayer:mo.mapExistingLayer);
      marker.bindPopup('<b>'+safe(p.customer_name)+'</b><br>'+safe(typeof statusLabel==='function'?statusLabel(p.customer_status):p.customer_status)+'<br>'+safe(isNew?tx('عميل جديد محسوب','New customer counted'):tx('عميل موجود مسبقاً','Existing customer')));
    });
    try{
      const overlays={};
      overlays[tx('العملاء الجدد في المهمة','New mission customers')]=mo.mapNewLayer;
      overlays[tx('عملاؤنا الحاليون','Existing customers')]=mo.mapExistingLayer;
      if(isManagementUser())overlays[tx('مناطق بقية المناديب اليوم','Other reps zones today')]=mo.mapPeerLayer;
      else if(missionsForToday().length>1)overlays[tx('باقي مناطق اليوم','Other areas today')]=mo.mapPeerLayer;
      L.control.layers(null,overlays,{collapsed:true,position:'topright'}).addTo(mo.map);
    }catch(_){}
    const count=document.getElementById('moMapCount');if(count)count.textContent=n(mo.mapPoints.length);
    const legend=document.getElementById('moMapLegend');
    if(legend){
      const repAreaCount=!isManagementUser()?mapMissions.length:1;
      const areaInfo=repAreaCount>1&&!focusSelected
        ?'<span>'+tx('مناطق اليوم','Today areas')+': <b>'+n(repAreaCount)+'</b></span>'
        :'<span>'+tx('حدود العمل','Work zone')+': <b>'+safe(zoneSummary(m))+'</b></span>';
      legend.innerHTML='<span><i class="new"></i>'+tx('جدد في مناطق اليوم','New in today areas')+' <b>'+n(missionCount)+'</b></span><span><i class="existing"></i>'+tx('عملاؤنا الحاليون','Existing customers')+' <b>'+n(existingCount)+'</b></span>'+areaInfo+(m.municipality_name&&repAreaCount===1?'<span>'+tx('البلدية','Municipality')+': <b>'+safe(m.municipality_name)+'</b></span>':'');
    }
    setTimeout(()=>mo.map?.invalidateSize(),80);
  }

    function destroyMap(){
    if(mo.map){try{mo.map.remove()}catch(_){}}
    mo.map=null;mo.activeBounds=null;mo.mapNewLayer=null;mo.mapExistingLayer=null;mo.mapPeerLayer=null;
  }

  function attachCustomerForm(){
    const missionMode=mo.customerFormMode==='mission';
    mo.customerFormMode='normal';
    if(!missionMode||!isRepUser()||!mo.settings?.enabled||!mo.settings?.rep_access_enabled)return;
    const form=document.querySelector('#modalContent .form-grid');
    if(!form)return;
    const existing=document.getElementById('moCustomerMissionNotice');if(existing)existing.remove();
    const todayMissions=missionsForToday();
    const m=todayMissions[0]||null;
    const notice=document.createElement('div');
    notice.id='moCustomerMissionNotice';
    notice.className='full mo-customer-mission-notice';
    if(!m){
      notice.classList.add('warn');
      notice.innerHTML='<b>'+tx('ما عندك مهمة فتح سوق اليوم','No Market Opening mission today')+'</b><div>'+safe(tx('تقدر تضيف العميل بشكل طبيعي. هذا العميل لن يدخل في هدف فتح السوق لأنه لا توجد لك منطقة محددة اليوم.','You can add the customer normally. This customer will not count toward a Market Opening target because you have no assigned area today.'))+'</div>';
      form.prepend(notice);
      const save=document.getElementById('saveCustomerBtn');if(save)save.disabled=false;
      return;
    }
    notice.classList.add('ok');
    const areas=todayMissions.map(x=>x.area_name).join('، ');
    notice.innerHTML='<b>'+tx('مناطق فتح السوق اليوم','Today Market Opening areas')+': '+safe(areas)+'</b><div>'+safe(tx('يمكن يكون عندك أكثر من منطقة في نفس اليوم. حدد موقع العميل والنظام يحسبه تلقائيًا على المنطقة التي يقع داخل حدودها. وإذا كان خارج كل مناطق اليوم، ينحفظ بدون احتسابه في الهدف.','You can have multiple areas on the same day. Choose the customer location and the system automatically counts it toward the matching area. If it is outside all of today’s areas, it is saved without counting toward a target.'))+'</div><div id="moCustomerZoneStatus" class="small"></div>';
    form.prepend(notice);
    const area=document.getElementById('fArea');if(area&&!area.value)area.value=m.area_name;
    const save=document.getElementById('saveCustomerBtn');if(save)save.disabled=true;

    if(state.pickerMap&&window.L){
      try{
        let bounds=null;
        todayMissions.forEach((mission,index)=>{
          let zone;
          if(mission.zone_type==='district_polygon'&&mission.zone_geojson){
            zone=L.geoJSON({type:'Feature',properties:{},geometry:mission.zone_geojson},{style:{color:index===0?'#0f766e':'#2563eb',weight:3,fillColor:index===0?'#14b8a6':'#60a5fa',fillOpacity:.08}}).addTo(state.pickerMap);
          }else{
            zone=L.circle([Number(mission.center_lat),Number(mission.center_lng)],{radius:Number(mission.radius_m),color:index===0?'#0f766e':'#2563eb',weight:3,fillOpacity:.05}).addTo(state.pickerMap);
          }
          zone.bindTooltip(safe(mission.area_name));
          const b=zone.getBounds?.();
          if(b?.isValid())bounds=bounds?bounds.extend(b):L.latLngBounds(b);
        });
        if(bounds?.isValid())state.pickerMap.fitBounds(bounds,{padding:[18,18]});
      }catch(_){}
    }
  }

  function customerLocationChanged(lat,lng){
    if(!isRepUser()||!mo.settings?.enabled||!mo.settings?.rep_access_enabled||!document.getElementById('moCustomerMissionNotice'))return;
    const list=missionsForToday(),save=document.getElementById('saveCustomerBtn'),box=document.getElementById('moCustomerZoneStatus');
    if(!list.length){
      if(save)save.disabled=false;
      if(box){
        box.className='small warn';
        box.textContent=tx('لا توجد لك منطقة فتح سوق اليوم. العميل سيُحفظ بشكل طبيعي ولن يدخل في هدف فتح السوق.','You have no Market Opening area today. The customer will be saved normally and will not count toward a Market Opening target.');
      }
      return;
    }
    const match=list.find(m=>{
      if(m.zone_type==='district_polygon'&&m.zone_geojson){
        return pointInZoneGeojson(m.zone_geojson,Number(lat),Number(lng));
      }
      const dist=haversine(Number(m.center_lat),Number(m.center_lng),Number(lat),Number(lng));
      return dist<=Number(m.radius_m);
    })||null;
    const detail=match
      ?tx('داخل منطقة ','Inside area ')+match.area_name+tx(' — هذا العميل سيدخل في هدف هذه المهمة.',' — this customer will count toward this mission target.')
      :tx('تنبيه: الموقع خارج جميع مناطق فتح السوق المحددة لك اليوم. العميل سيُحفظ عادي لكنه لن يدخل في أي هدف.','Warning: this location is outside all Market Opening areas assigned to you today. The customer will be saved normally but will not count toward any target.');
    if(save)save.disabled=false;
    if(box){
      box.className='small '+(match?'ok':'warn');
      box.textContent=detail;
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
  window.addEventListener('beforeunload',()=>{destroyMap();cleanupPicker();try{mo.plannerMap?.remove()}catch(_){}});

  setTimeout(()=>{if(state?.profile)loadData(true);},600);
})();