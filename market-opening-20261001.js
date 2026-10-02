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
    previewRepId:null,
    previewMissionId:null,
    demoPreview:null,
    loading:false,
    loadSeq:0,
    lastLoadedAt:0
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
    if(mo.previewRepId)return previewMission();
    if(!isRepUser())return null;
    return mo.missions
      .filter(m=>m.rep_id===state.profile.id&&ymd(m.scheduled_date)===today()&&m.status!=='cancelled')
      .sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||'')))[0]||null;
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
      const [s,m,l,r]=await Promise.all([
        sb.from('market_opening_settings').select('enabled,rep_access_enabled,strict_rep_customer_creation,default_radius_m,updated_at').eq('id',true).maybeSingle(),
        sb.from('market_opening_missions').select('id,rep_id,scheduled_date,original_date,city,area_name,target_customers,center_lat,center_lng,radius_m,zone_type,district_no,municipality_name,zone_geojson,status,notes,reschedule_count,started_at,completed_at,cancelled_at,created_at,updated_at').order('scheduled_date',{ascending:false}).order('created_at',{ascending:false}),
        sb.from('market_opening_mission_customers').select('mission_id,customer_id,rep_id,customer_status_at_creation,distance_m,created_at').order('created_at',{ascending:false}),
        sb.from('market_opening_reschedule_requests').select('id,mission_id,requested_by,requested_date,reason,status,reviewed_by,review_note,created_at,reviewed_at').order('created_at',{ascending:false})
      ]);
      if(seq!==mo.loadSeq)return;
      if(s.error)throw s.error;
      if(m.error)throw m.error;
      if(l.error)throw l.error;
      if(r.error)throw r.error;
      mo.settings=s.data||{enabled:false,rep_access_enabled:false,strict_rep_customer_creation:false,default_radius_m:2500};
      mo.missions=m.data||[];
      mo.links=l.data||[];
      mo.requests=r.data||[];
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
    if(isRepUser()&&!mo.settings?.rep_access_enabled){
      root.innerHTML='<div class="mo5-locked"><b>'+tx('فتح السوق قيد التجربة الداخلية','Market Opening is in internal testing')+'</b><span>'+tx('الصفحة غير متاحة للمناديب حتى اعتماد الإدارة.','The page is not available to representatives until management approves launch.')+'</span></div>';
      destroyMap();
      return;
    }
    const preview=isManagementUser()&&!!mo.previewRepId;
    root.innerHTML=preview?repHtml(true):(isManagementUser()?managementHtml():repHtml(false));
    bindPageControls();
    const candidate=preview?previewMission():(isManagementUser()?selectedManagementMission():missionForToday());
    if(candidate){
      mo.selectedMissionId=candidate.id;
      if(mo.demoPreview?.mission?.id===candidate.id)setTimeout(()=>renderDemoMissionMap(candidate),60);
      else setTimeout(()=>renderMissionMap(candidate),60);
    }else destroyMap();
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
    const m=missionForToday(),over=overdueForRep(),next=nextForRep();
    const active=m||over;
    const previewBanner=preview?'<div class="mo5-preview-banner"><div><b>'+tx('معاينة تجربة المندوب','Representative experience preview')+'</b><span>'+tx('هذه المعاينة لا تنفذ أي إجراء فعلي. الصفحة ما زالت مخفية عن المناديب.','This preview cannot perform real actions. The page is still hidden from representatives.')+'</span></div><button class="btn secondary mini" type="button" data-mo-exit-preview="1">'+tx('رجوع للإدارة','Back to management')+'</button></div>':'';
    if(!active){
      return '<div class="mo5-shell mo5-rep">'+previewBanner+
        '<section class="mo5-empty"><div class="mo5-empty-icon">✓</div><div><h2>'+tx('ما عندك مهمة الآن','No active mission right now')+'</h2><p>'+tx('إذا ما عندك مهمة اليوم، ما تحتاج تسوي شيء. المنطقة القادمة تظهر لك تلقائيًا بعد اعتماد الإدارة.','If you have no mission today, there is nothing to do. Your next approved area appears automatically.')+'</p>'+(next?'<div class="mo5-next">'+tx('المهمة القادمة','Next mission')+': <b>'+safe(next.area_name)+'</b> · '+safe(fmtDate(next.scheduled_date))+'</div>':'')+'</div></section>'+
      '</div>';
    }

    const isOver=preview?ymd(active.scheduled_date)<today():(!!over&&!m);
    const isFuture=preview?ymd(active.scheduled_date)>today():false;
    const b=statusBreakdown(active),done=progress(active),left=remaining(active),pending=pendingRequestForMission(active.id);
    const disabled=preview?' disabled aria-disabled="true"':'';
    const actionStart=!isOver&&active.status==='scheduled'
      ?'<button class="mo5-step-action primary" type="button" '+(preview?'':('data-mo-start="'+safe(active.id)+'"'))+disabled+'>'+tx('ابدأ المهمة','Start mission')+'</button>'
      :'<span class="mo5-step-done">'+tx('المهمة بدأت','Mission started')+'</span>';
    const actionCustomer=!isOver
      ?'<button class="mo5-step-action success" type="button" '+(preview?'':'data-mo-add-customer="1"')+disabled+'>'+tx('سجل عميل جديد','Register new customer')+'</button>'
      :'<span class="mo5-step-note">'+tx('انقل الموعد أولًا قبل تسجيل عملاء','Reschedule first before registering customers')+'</span>';
    const actionDelay=pending
      ?'<span class="mo5-step-wait">'+tx('طلب التأجيل تحت المراجعة','Reschedule request pending')+' · '+safe(fmtDate(pending.requested_date))+'</span>'
      :'<button class="mo5-step-action warn" type="button" '+(preview?'':('data-mo-request-reschedule="'+safe(active.id)+'"'))+disabled+'>'+tx('اطلب تأجيل فقط إذا ما تقدر تروح','Request reschedule only if you cannot go')+'</button>';

    return '<div class="mo5-shell mo5-rep">'+previewBanner+
      (mo.demoPreview?'<div class="mo5-demo-banner"><b>🧪 '+tx('بيانات تجريبية','Demo data')+'</b><span>'+safe(mo.demoPreview.label)+' · '+tx('لن تُحفظ أي نتيجة','Nothing will be saved')+'</span></div>':'')+
      '<section class="mo5-rep-hero '+statusClass(active)+'"><div><span class="mo5-kicker">'+(isOver?tx('مهمة تحتاج قرار','Mission needs action'):(isFuture?tx('مهمة قادمة — معاينة','Upcoming mission — preview'):tx('مهمة اليوم','Today’s mission')))+'</span><h1>'+safe(active.area_name)+'</h1><p>'+safe(active.city)+' · '+safe(fmtDate(active.scheduled_date))+'</p><div class="mo5-zone-chip">'+safe(zoneSummary(active))+'</div></div>'+
        '<div class="mo5-progress-summary"><strong>'+n(done)+' <small>/ '+n(active.target_customers)+'</small></strong><span>'+tx('عميل مسجل','customers registered')+'</span><div class="mo-progress"><i style="width:'+pct(active)+'%"></i></div><b>'+n(left)+' '+tx('متبقي','remaining')+'</b></div></section>'+
      '<section class="mo5-rep-steps"><div class="mo5-section-head"><div><span>'+tx('نفّذها بهذا الترتيب','Follow these steps in order')+'</span><h3>'+tx('ثلاث خطوات فقط','Only three steps')+'</h3></div></div>'+
        '<article><em>1</em><div><b>'+tx('ابدأ المهمة','Start the mission')+'</b><span>'+tx('اضغط مرة واحدة عند وصولك للمنطقة.','Tap once when you reach the assigned area.')+'</span></div>'+actionStart+'</article>'+
        '<article><em>2</em><div><b>'+tx('سجل العملاء الجدد','Register new customers')+'</b><span>'+tx('كل عميل تسجله داخل المنطقة يدخل تلقائيًا في تقدم المهمة.','Every new customer registered inside the zone counts automatically.')+'</span></div>'+actionCustomer+'</article>'+
        '<article><em>3</em><div><b>'+tx('إذا ما قدرت تروح','If you cannot go')+'</b><span>'+tx('أرسل طلب تأجيل. الموعد لا يتغير إلا بعد موافقة الإدارة.','Send a reschedule request. The date changes only after management approval.')+'</span></div>'+actionDelay+'</article>'+
      '</section>'+
      '<section class="mo5-mini-stats"><div><span>'+tx('نشط','Active')+'</span><b>'+n(b.active)+'</b></div><div><span>'+tx('متفق','Agreed')+'</span><b>'+n(b.agreed_pending)+'</b></div><div><span>'+tx('متردد','Hesitant')+'</span><b>'+n(b.hesitant)+'</b></div><div><span>'+tx('رافض','Rejected')+'</span><b>'+n(b.rejected)+'</b></div></section>'+
      '<details class="mo5-map-panel" open><summary><div><b>'+tx('خريطة منطقة العمل','Work-area map')+'</b><span>'+tx('شوف حدود الحي والعملاء الموجودين داخله.','See the district boundary and customers inside it.')+'</span></div><span>⌄</span></summary>'+
        '<div class="mo5-map-actions"><button class="btn secondary mini" type="button" data-mo-map-fit="1">'+tx('إظهار كامل المنطقة','Fit area')+'</button><button class="btn secondary mini" type="button" data-mo-map-full="1">'+tx('ملء الشاشة','Full screen')+'</button></div>'+
        '<div id="moCoverageCompass" class="mo-v2-coverage"></div><div id="marketOpeningMap" class="mo-map mo-v2-map mo5-map"></div><div id="moMapLegend" class="mo-map-legend"></div>'+
      '</details>'+
    '</div>';
  }

  function managementHtml(){
    const filterDate=document.getElementById('moDateFilter')?.value||today();
    const filterRep=document.getElementById('moRepFilter')?.value||'';
    const activeReps=state.profiles.filter(p=>p.role==='rep'&&p.active!==false);
    const dateRows=mo.missions.filter(m=>ymd(m.scheduled_date)===filterDate&&m.status!=='cancelled'&&(!filterRep||m.rep_id===filterRep));
    const overdue=mo.missions.filter(m=>ymd(m.scheduled_date)<today()&&['scheduled','in_progress'].includes(m.status)&&(!filterRep||m.rep_id===filterRep));
    const pendingRequests=mo.requests.filter(r=>r.status==='pending');
    const target=dateRows.reduce((s,m)=>s+Number(m.target_customers||0),0);
    const done=dateRows.reduce((s,m)=>s+progress(m),0);
    const completed=dateRows.filter(m=>m.status==='completed').length;
    const underway=dateRows.filter(m=>m.status==='in_progress').length;
    const assignedIds=new Set(dateRows.map(m=>m.rep_id));
    const noMission=activeReps.filter(r=>(!filterRep||r.id===filterRep)&&!assignedIds.has(r.id));
    const conflicts=(()=>{
      const seenRep=new Set(),seenDistrict=new Set();let c=0;
      dateRows.forEach(m=>{
        const rk=m.rep_id+'|'+ymd(m.scheduled_date);if(seenRep.has(rk))c++;else seenRep.add(rk);
        if(m.district_no){const dk=m.district_no+'|'+ymd(m.scheduled_date);if(seenDistrict.has(dk))c++;else seenDistrict.add(dk);}
      });
      return c;
    })();
    const totalLive=mo.missions.filter(m=>!['cancelled','completed'].includes(m.status)).length;
    const repOptionsHtml='<option value="">'+tx('كل المناديب','All representatives')+'</option>'+activeReps.map(p=>'<option value="'+safe(p.id)+'" '+(p.id===filterRep?'selected':'')+'>'+safe(p.full_name)+'</option>').join('');

    const boardRows=(filterRep?activeReps.filter(r=>r.id===filterRep):activeReps).map(rep=>{
      const m=dateRows.find(x=>x.rep_id===rep.id);
      if(!m)return '<article class="mo4-mission-card empty"><div class="mo4-card-top"><div><span>'+safe(rep.full_name)+'</span><h4>'+tx('بدون مهمة','No mission')+'</h4></div><button class="btn secondary mini" type="button" data-mo-new-rep="'+safe(rep.id)+'">+ '+tx('إضافة مهمة','Add mission')+'</button></div><p>'+tx('لا توجد مهمة لهذا المندوب في اليوم المحدد.','No mission for this rep on the selected day.')+'</p></article>';
      return missionCard(m,ymd(m.scheduled_date)<today());
    }).join('');

    const requestPanel=pendingRequests.length?'<section class="mo5-requests"><div class="mo5-section-head"><div><span>'+tx('تحتاج قرارك','Needs your decision')+'</span><h3>'+tx('طلبات تأجيل معلقة','Pending reschedule requests')+'</h3></div><strong>'+n(pendingRequests.length)+'</strong></div><div class="mo4-request-grid">'+pendingRequests.map(r=>{const m=mo.missions.find(x=>x.id===r.mission_id);return '<article class="mo4-request-card"><div><span>'+safe(m?repName(m.rep_id):repName(r.requested_by))+'</span><h4>'+safe(m?.area_name||'-')+'</h4><p>'+safe(fmtDate(m?.scheduled_date))+' → <b>'+safe(fmtDate(r.requested_date))+'</b></p><small>'+safe(r.reason)+'</small></div><div><button class="btn good mini" type="button" data-mo-request-approve="'+safe(r.id)+'">'+tx('موافقة','Approve')+'</button><button class="btn bad mini" type="button" data-mo-request-reject="'+safe(r.id)+'">'+tx('رفض','Reject')+'</button></div></article>';}).join('')+'</div></section>':'';

    return '<div class="mo5-shell mo5-management">'+
      '<div class="mo5-pilot-banner"><div><b>🔒 '+tx('نسخة تجريبية داخلية','Internal pilot')+'</b><span>'+tx('صفحة فتح السوق مخفية عن المناديب حاليًا. لن تظهر لهم حتى تعتمدها أنت.','Market Opening is currently hidden from representatives. They will not see it until you approve launch.')+'</span></div><span class="mo5-lock-state">'+tx('وصول المناديب: مغلق','Rep access: locked')+'</span></div>'+
      '<section class="mo5-admin-hero"><div><span class="mo5-kicker">'+tx('إدارة فتح السوق','Market Opening')+'</span><h1>'+tx('خطط المناطق وتابع التنفيذ من مكان واحد','Plan territories and track execution in one place')+'</h1><p>'+tx('وزّع أحياء الرياض، راجع الطلبات، وعدّل أي خطة بدون ما تضيع بياناتها السابقة.','Assign Riyadh districts, review requests, and edit any plan without losing its history.')+'</p></div>'+
        '<div class="mo5-hero-metrics"><div><strong>'+n(dateRows.length)+'</strong><span>'+tx('مهام اليوم المحدد','missions on selected day')+'</span></div><div><strong>'+n(done)+' / '+n(target)+'</strong><span>'+tx('التقدم','progress')+'</span></div><div><strong>'+n(totalLive)+'</strong><span>'+tx('مهام قادمة/جارية','upcoming/in progress')+'</span></div></div></section>'+
      '<section class="mo5-primary-actions">'+
        '<button class="mo5-primary-card" type="button" data-mo-auto-plan="1"><span class="icon">⌖</span><div><b>'+tx('توزيع مناطق المناديب','Assign rep territories')+'</b><small>'+tx('حدد كل أحياء الرياض ثم خل النظام يرتب الأيام تلقائيًا','Select Riyadh districts and auto-build the schedule')+'</small></div></button>'+
        '<button class="mo5-primary-card" type="button" data-mo-preview-picker="1"><span class="icon">◉</span><div><b>'+tx('معاينة كمندوب','Preview as representative')+'</b><small>'+tx('شوف الصفحة كما ستظهر للمندوب قبل فتحها لهم','See exactly what a rep will see before launch')+'</small></div></button>'+
        '<button class="mo5-primary-card demo" type="button" data-mo-demo-picker="1"><span class="icon">🧪</span><div><b>'+tx('بيانات تجريبية','Demo scenarios')+'</b><small>'+tx('جرب حالات مختلفة بدون لمس البيانات الحقيقية','Test different situations without touching real data')+'</small></div></button>'+
        '<button class="mo5-primary-card secondary-card" type="button" data-mo-new="1"><span class="icon">＋</span><div><b>'+tx('مهمة مفردة','Single mission')+'</b><small>'+tx('أضف أو عدل مهمة واحدة يدويًا','Add one mission manually')+'</small></div></button>'+
      '</section>'+
      '<section class="mo5-readiness"><div class="mo5-section-head"><div><span>'+tx('فحص سريع','Quick checks')+'</span><h3>'+tx('الأشياء التي تحتاج انتباه الإدارة','Items that need management attention')+'</h3></div></div><div class="mo5-check-grid">'+
        '<div class="'+(pendingRequests.length?'warn':'ok')+'"><span>'+tx('طلبات التأجيل','Reschedule requests')+'</span><b>'+n(pendingRequests.length)+'</b><small>'+(pendingRequests.length?tx('راجعها قبل بداية اليوم','Review before the day starts'):tx('لا يوجد طلب معلق','No pending requests'))+'</small></div>'+
        '<div class="'+(overdue.length?'bad':'ok')+'"><span>'+tx('مهام متأخرة','Overdue missions')+'</span><b>'+n(overdue.length)+'</b><small>'+(overdue.length?tx('تحتاج نقل موعد أو متابعة','Need rescheduling or follow-up'):tx('لا توجد مهام متأخرة','No overdue missions'))+'</small></div>'+
        '<div class="'+(noMission.length?'neutral':'ok')+'"><span>'+tx('بدون مهمة في اليوم','Unassigned reps')+'</span><b>'+n(noMission.length)+'</b><small>'+tx('حسب التاريخ والفلتر الحالي','Based on current date/filter')+'</small></div>'+
        '<div class="'+(conflicts?'bad':'ok')+'"><span>'+tx('تعارضات مكتشفة','Detected conflicts')+'</span><b>'+n(conflicts)+'</b><small>'+(conflicts?tx('راجع قبل الاعتماد','Review before approval'):tx('لا يوجد تعارض ظاهر','No visible conflicts'))+'</small></div>'+
      '</div></section>'+
      requestPanel+
      '<section class="mo5-day-console"><div class="mo5-section-head"><div><span>'+tx('خطة اليوم','Day plan')+'</span><h3>'+safe(fmtDate(filterDate))+'</h3></div><div class="mo4-filter-rack"><input type="date" id="moDateFilter" value="'+safe(filterDate)+'"><select id="moRepFilter">'+repOptionsHtml+'</select></div></div>'+
        '<div class="mo5-mini-stats management"><div><span>'+tx('مكلفين','Assigned')+'</span><b>'+n(dateRows.length)+'</b></div><div><span>'+tx('بدون مهمة','Unassigned')+'</span><b>'+n(noMission.length)+'</b></div><div><span>'+tx('جاري التنفيذ','In progress')+'</span><b>'+n(underway)+'</b></div><div><span>'+tx('مكتملة','Completed')+'</span><b>'+n(completed)+'</b></div></div>'+
      '</section>'+
      (overdue.length?'<section class="mo5-overdue"><div class="mo5-section-head"><div><span>'+tx('تحتاج متابعة','Needs attention')+'</span><h3>'+tx('مهام فات موعدها','Overdue missions')+'</h3></div><strong>'+n(overdue.length)+'</strong></div><div class="mo4-overdue-grid">'+overdue.map(m=>missionCard(m,true)).join('')+'</div></section>':'')+
      '<section class="mo5-missions-board"><div class="mo5-section-head"><div><span>'+tx('المناديب','Representatives')+'</span><h3>'+tx('مهام اليوم المحدد','Missions for selected day')+'</h3></div><span>'+tx('اضغط تعديل لتغيير المندوب أو التاريخ أو المنطقة أو الهدف','Use Edit to change rep, date, area, or target')+'</span></div><div class="mo4-mission-grid">'+boardRows+'</div></section>'+
      '<details class="mo5-map-panel management-map" open><summary><div><b>'+tx('الخريطة التشغيلية','Operations map')+'</b><span id="moSelectedMissionText">'+tx('اختر مهمة من البطاقات لعرض حدودها وعملائها.','Select a mission card to inspect its area and customers.')+'</span></div><span>⌄</span></summary><div class="mo5-map-actions"><span class="badge b-info" id="moMapCount">0</span><button class="btn secondary mini" type="button" data-mo-map-fit="1">'+tx('إظهار كامل المنطقة','Fit area')+'</button><button class="btn secondary mini" type="button" data-mo-map-full="1">'+tx('ملء الشاشة','Full screen')+'</button></div><div id="moIntegrityBox"></div><div id="moCoverageCompass" class="mo-v2-coverage"></div><div id="marketOpeningMap" class="mo-map mo-v2-map mo5-map"></div><div id="moMapLegend" class="mo-map-legend"></div></details>'+
      '<div class="mo5-secondary-actions"><button class="btn secondary mini" type="button" data-mo-disable="1">'+tx('إيقاف نظام فتح السوق','Disable Market Opening system')+'</button></div>'+
    '</div>';
  }

  function missionCard(m,isOverdue){
    const done=progress(m),left=remaining(m),percent=pct(m),pending=pendingRequestForMission(m.id);
    const live=!['completed','cancelled'].includes(m.status);
    return '<article class="mo4-mission-card '+statusClass(m)+'" data-mo-mission-card="'+safe(m.id)+'">'+
      '<div class="mo4-card-top"><div><span>'+safe(repName(m.rep_id))+'</span><h4>'+safe(m.area_name)+'</h4><small>'+safe(fmtDate(m.scheduled_date))+(m.reschedule_count?' · '+tx('تأجلت ','Rescheduled ')+n(m.reschedule_count)+'×':'')+'</small></div><span class="mo-status-pill">'+safe(statusText(m))+'</span></div>'+
      '<div class="mo4-card-progress"><div><b>'+n(done)+'</b><span>/ '+n(m.target_customers)+'</span></div><strong>'+percent+'%</strong></div><div class="mo-progress"><i style="width:'+percent+'%"></i></div>'+
      '<div class="mo4-card-meta"><span>'+tx('متبقي','Remaining')+' <b>'+n(left)+'</b></span><span>'+tx('المنطقة','Zone')+' <b>'+safe(zoneSummary(m))+'</b></span>'+(pending?'<span class="pending">'+tx('طلب تأجيل','Reschedule')+' <b>'+safe(fmtDate(pending.requested_date))+'</b></span>':'')+'</div>'+
      '<div class="mo4-card-actions"><button class="btn secondary mini" type="button" data-mo-map="'+safe(m.id)+'">'+tx('الخريطة','Map')+'</button><button class="btn secondary mini" type="button" data-mo-history="'+safe(m.id)+'">'+tx('السجل','History')+'</button>'+
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
      b=e.target.closest('[data-mo-history]');if(b){const m=mo.missions.find(x=>x.id===b.dataset.moHistory);if(m)await openMissionHistory(m);return;}
      b=e.target.closest('[data-mo-start]');if(b){await startMission(b.dataset.moStart);return;}
      b=e.target.closest('[data-mo-add-customer]');if(b){openCustomerForm();return;}
      b=e.target.closest('[data-mo-map]');if(b){mo.selectedMissionId=b.dataset.moMap;const m=mo.missions.find(x=>x.id===mo.selectedMissionId);if(m)renderMissionMap(m);return;}
      b=e.target.closest('[data-mo-map-fit]');if(b){if(mo.map&&mo.activeBounds?.isValid?.())mo.map.fitBounds(mo.activeBounds,{padding:[24,24]});return;}
      b=e.target.closest('[data-mo-map-full]');if(b){toggleMissionMapFullscreen();return;}
      b=e.target.closest('[data-mo-edit]');if(b){const m=mo.missions.find(x=>x.id===b.dataset.moEdit);if(m)openMissionForm(m);return;}
      b=e.target.closest('[data-mo-reschedule]');if(b){const m=mo.missions.find(x=>x.id===b.dataset.moReschedule);if(m)openReschedule(m);return;}
      b=e.target.closest('[data-mo-request-reschedule]');if(b){const m=mo.missions.find(x=>x.id===b.dataset.moRequestReschedule);if(m)openRepRescheduleRequest(m);return;}
      b=e.target.closest('[data-mo-request-approve]');if(b){const r=mo.requests.find(x=>x.id===b.dataset.moRequestApprove);if(r)openRequestReview(r,true);return;}
      b=e.target.closest('[data-mo-request-reject]');if(b){const r=mo.requests.find(x=>x.id===b.dataset.moRequestReject);if(r)openRequestReview(r,false);return;}
      b=e.target.closest('[data-mo-delete]');if(b){const m=mo.missions.find(x=>x.id===b.dataset.moDelete);if(m)openPermanentDelete(m);return;}
    };
    const df=document.getElementById('moDateFilter'),rf=document.getElementById('moRepFilter');
    if(df)df.onchange=()=>{mo.selectedMissionId=null;renderPage();};
    if(rf)rf.onchange=()=>{mo.selectedMissionId=null;renderPage();};
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
        '<div class="mo4-planner-workspace"><div class="mo4-planner-map-wrap"><div class="mo4-planner-search"><input id="moPlannerSearch" placeholder="'+tx('ابحث عن حي...','Search district...')+'"><div id="moPlannerSearchResults"></div></div><div id="moAutoPlannerMap"></div></div><aside><div class="mo4-selected-head"><div><span>'+tx('المناطق الموزعة','Assigned territories')+'</span><small id="moPlannerCoverageText"></small></div><strong id="moPlannerTotal">0</strong></div><div id="moPlannerSelection" class="mo4-selected-zones"></div></aside></div>'+
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
    const a={created:'إنشاء المهمة',started:'بدء المهمة',rescheduled:'تأجيل المهمة',reschedule_requested:'طلب تأجيل',reschedule_rejected:'رفض طلب التأجيل',edited:'تعديل المهمة',customer_counted:'احتساب عميل',completed:'إكمال الهدف',cancelled:'إلغاء قديم',enabled:'تشغيل النظام',disabled:'إيقاف النظام'};
    const e={created:'Mission created',started:'Mission started',rescheduled:'Mission rescheduled',reschedule_requested:'Reschedule requested',reschedule_rejected:'Reschedule rejected',edited:'Mission edited',customer_counted:'Customer counted',completed:'Target completed',cancelled:'Legacy cancellation',enabled:'System enabled',disabled:'System disabled'};
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
      'invalid representative assignment':tx('يوجد توزيع غير صالح لأحد المناديب.','One representative assignment is invalid.'),
      'invalid zone in planner':tx('إحدى المناطق المحددة غير صالحة. أعد تحديدها من الخريطة.','One selected zone is invalid. Re-select it on the map.'),
      'market opening preview locked':tx('فتح السوق ما زال في وضع التجربة ومغلق عن المناديب.','Market Opening is still in internal preview and locked for representatives.')
    };
    return dict[m]||m;
  }

  async function renderMissionMap(m){
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

    if(isManagementUser()){
      mo.missions.filter(x=>x.id!==m.id&&x.scheduled_date===m.scheduled_date&&x.status!=='cancelled').forEach(x=>{
        try{
          let layer;
          if(x.zone_type==='district_polygon'&&x.zone_geojson){
            layer=L.geoJSON({type:'Feature',properties:{},geometry:x.zone_geojson},{style:{color:'#94a3b8',weight:2,dashArray:'6 6',fillOpacity:.015}});
          }else{
            layer=L.circle([Number(x.center_lat),Number(x.center_lng)],{radius:Number(x.radius_m),color:'#94a3b8',weight:2,dashArray:'6 6',fillOpacity:.01});
          }
          layer.addTo(mo.mapPeerLayer).bindTooltip(safe(repName(x.rep_id))+' · '+safe(x.area_name));
        }catch(_){}
      });
    }

    mo.activeBounds=primaryBounds;
    if(primaryBounds?.isValid())mo.map.fitBounds(primaryBounds,{padding:[24,24]});

    const text=document.getElementById('moSelectedMissionText');
    if(text)text.textContent=repName(m.rep_id)+' · '+m.area_name+' · '+m.city+' · '+fmtDate(m.scheduled_date)+' · '+zoneSummary(m);

    const [pointsRes,healthRes]=await Promise.all([
      sb.rpc('market_opening_map_points',{p_mission_id:m.id}),
      isManagementUser()?sb.rpc('market_opening_mission_health',{p_mission_id:m.id}):Promise.resolve({data:null,error:null})
    ]);
    if(pointsRes.error){
      const legend=document.getElementById('moMapLegend');if(legend)legend.textContent=tx('تعذر تحميل العملاء على الخريطة.','Could not load customers on the map.');
      return;
    }

    mo.mapPoints=pointsRes.data||[];
    const stats=renderCoverageCompass(m,mo.mapPoints);

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
      L.control.layers(null,overlays,{collapsed:true,position:'topright'}).addTo(mo.map);
    }catch(_){}
    const count=document.getElementById('moMapCount');if(count)count.textContent=n(mo.mapPoints.length);
    const legend=document.getElementById('moMapLegend');
    if(legend)legend.innerHTML='<span><i class="new"></i>'+tx('جدد في المهمة','New in mission')+' <b>'+n(missionCount)+'</b></span><span><i class="existing"></i>'+tx('عملاؤنا الحاليون','Existing customers')+' <b>'+n(existingCount)+'</b></span><span>'+tx('حدود العمل','Work zone')+': <b>'+safe(zoneSummary(m))+'</b></span>'+(m.municipality_name?'<span>'+tx('البلدية','Municipality')+': <b>'+safe(m.municipality_name)+'</b></span>':'');
    setTimeout(()=>mo.map?.invalidateSize(),80);
  }

    function destroyMap(){
    if(mo.map){try{mo.map.remove()}catch(_){}}
    mo.map=null;mo.activeBounds=null;mo.mapNewLayer=null;mo.mapExistingLayer=null;mo.mapPeerLayer=null;
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
    notice.innerHTML='<b>'+tx('مهمة فتح السوق','Market-opening mission')+': '+safe(m.area_name)+' · '+safe(m.city)+'</b><div>'+safe(m.zone_type==='district_polygon'?tx('التسجيل مسموح داخل حدود الحي المحددة فقط. جميع الحالات الأولية تُحسب في الهدف.','Registration is allowed only inside the selected district boundary. All initial statuses count toward the target.'):tx('اختر موقع العميل داخل دائرة المهمة. جميع الحالات الأولية تُحسب في الهدف.','Choose the customer location inside the mission circle. All initial statuses count toward the target.'))+'</div><div id="moCustomerZoneStatus" class="small"></div>';
    form.prepend(notice);
    const area=document.getElementById('fArea');if(area&&!area.value)area.value=m.area_name;
    const save=document.getElementById('saveCustomerBtn');if(save)save.disabled=true;

    if(state.pickerMap&&window.L){
      try{
        let zone;
        if(m.zone_type==='district_polygon'&&m.zone_geojson){
          zone=L.geoJSON({type:'Feature',properties:{},geometry:m.zone_geojson},{style:{color:'#0f766e',weight:4,fillColor:'#14b8a6',fillOpacity:.10}}).addTo(state.pickerMap);
          state.pickerMap.fitBounds(zone.getBounds(),{padding:[18,18]});
        }else{
          zone=L.circle([Number(m.center_lat),Number(m.center_lng)],{radius:Number(m.radius_m),weight:3,fillOpacity:.06}).addTo(state.pickerMap);
          state.pickerMap.fitBounds(zone.getBounds(),{padding:[15,15]});
        }
      }catch(_){}
    }
  }

  function customerLocationChanged(lat,lng){
    if(!isRepUser()||!mo.settings?.enabled||!mo.settings?.strict_rep_customer_creation)return;
    const m=missionForToday(),save=document.getElementById('saveCustomerBtn'),box=document.getElementById('moCustomerZoneStatus');
    if(!m){if(save)save.disabled=true;return;}
    let inside=false,detail='';
    if(m.zone_type==='district_polygon'&&m.zone_geojson){
      inside=pointInZoneGeojson(m.zone_geojson,Number(lat),Number(lng));
      detail=inside
        ?tx('الموقع داخل حدود الحي — يُسمح بالحفظ.','Location is inside the district boundary — saving is allowed.')
        :tx('الموقع خارج حدود الحي المحدد للمهمة.','Location is outside the district boundary assigned to this mission.');
    }else{
      const dist=haversine(Number(m.center_lat),Number(m.center_lng),Number(lat),Number(lng));
      inside=dist<=Number(m.radius_m);
      detail=inside
        ?tx('الموقع داخل منطقة المهمة — يُسمح بالحفظ.','Location is inside the mission zone — saving is allowed.')
        :tx('الموقع خارج منطقة المهمة بحوالي ','Location is outside the mission zone by about ')+n(Math.max(0,Math.round(dist-m.radius_m)))+tx(' متر.',' m.');
    }
    if(save)save.disabled=!inside;
    if(box){
      box.className='small '+(inside?'ok':'bad');
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