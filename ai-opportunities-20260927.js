(() => {
'use strict';

function boot(){
  const app=window.DANA_APP;
  if(!app){setTimeout(boot,150);return;}

  const sb=app.sb,state=app.state,esc=app.esc,dateTime=app.dateTime,flash=app.flash,openModal=app.openModal,closeModal=app.closeModal;
  let refreshTimer=null,agentTimerInterval=null,searching=false,availableOpen=false;
  const claimInFlight=new Set();
  let latestReports=new Map(),guidanceByOpportunity=new Map(),opportunityById=new Map();

  const ar=()=>app.getLang()==='ar';
  const isManagement=()=>app.canManage();
  const isPrimaryAdmin=()=>state.profile?.role==='admin'&&state.profile?.username==='admin';
  const isRep=()=>state.profile?.role==='rep';
  const canSee=()=>!!state.profile;
  const safeUrl=v=>{if(!v)return '';try{const u=new URL(v);return(u.protocol==='https:'||u.protocol==='http:')?u.href:'';}catch(_){return '';}};
  const googleMapsSearchUrl=x=>{
    if(x.google_maps_verified!==true)return '';
    const u=safeUrl(x.google_maps_url);if(!u)return '';
    try{
      const z=new URL(u),h=z.hostname.toLowerCase(),p=z.pathname.toLowerCase();
      if(h==='maps.app.goo.gl'||(h==='goo.gl'&&z.pathname.startsWith('/maps')))return u;
      if(h==='google.com'||h==='www.google.com'||h==='maps.google.com'){
        if(p.includes('/maps/search'))return '';
        if(p.includes('/maps/place/')||p.includes('/maps/@')||p.includes('/maps/dir/'))return u;
        const q=z.searchParams.get('query')||z.searchParams.get('q')||'';
        if(/^[-+]?\d{1,2}(?:\.\d+)?\s*,\s*[-+]?\d{1,3}(?:\.\d+)?$/.test(q))return u;
        if(z.searchParams.get('cid'))return u;
      }
    }catch(_){}
    return '';
  };
  const riyadhDateKey=v=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(v?new Date(v):new Date());
  const weekStartKey=()=>{
    const t=riyadhDateKey(),d=new Date(t+'T00:00:00Z'),dow=d.getUTCDay(),diff=(dow+1)%7;
    d.setUTCDate(d.getUTCDate()-diff);return d.toISOString().slice(0,10);
  };
  const periodMatch=(x,p)=>{
    if(!p)return true;
    const k=riyadhDateKey(x.discovered_at),today=riyadhDateKey();
    if(p==='today')return k===today;
    if(p==='week')return k>=weekStartKey()&&k<=today;
    return true;
  };
  const typeLabel=v=>({factory:ar()?'مصنع':'Factory',project:ar()?'مشروع':'Project',contractor:ar()?'شركة مقاولات':'Contractor'}[v]||v||'-');
  const statusLabel=v=>({new:ar()?'جديدة':'New',reviewed:ar()?'معتمدة':'Reviewed',assigned:ar()?'مستلمة':'Claimed',rejected:ar()?'مرفوضة':'Rejected',won:ar()?'تم كسبها':'Won',lost:ar()?'مفقودة':'Lost'}[v]||v||'-');
  const verifyLabel=v=>({verified:ar()?'مؤكدة':'Verified',partial:ar()?'جزئية':'Partial',unverified:ar()?'غير مؤكدة':'Unverified'}[v]||v||'-');
  const gradeClass=v=>v==='A'?'b-good':v==='B'?'b-warn':'b-gray';
  const verifyClass=v=>v==='verified'?'b-good':v==='partial'?'b-warn':'b-gray';

  function removeUi(){
    document.getElementById('aiOppNav')?.remove();
    document.getElementById('aiOppPage')?.remove();
    document.getElementById('repAiOpportunityDashboard')?.remove();
  }

  function openPage(){
    if(!canSee())return;
    app.gotoPage('aiOppPage');
    const pt=document.getElementById('pageTitle');
    if(pt)pt.textContent=ar()?'مصانع ومشاريع':'Factories & Projects';
    loadAll();
  }

  function ensureRepDashboardCard(){
    const dash=document.getElementById('dashboard');
    if(!dash)return;
    let card=document.getElementById('repAiOpportunityDashboard');
    if(!isRep()){card?.remove();return;}
    if(card)return;
    card=document.createElement('div');
    card.id='repAiOpportunityDashboard';
    card.className='card rep-only';
    card.style.marginTop='14px';
    card.innerHTML='<div class="dashboard-head"><div><h3 id="repAiOppTitle"></h3><div class="small" id="repAiOppHint"></div></div><button class="btn secondary mini" id="repAiOppOpen" type="button"></button></div><div class="rep-ai-metrics"><div><span id="repAiAvailableLabel"></span><b id="repAiAvailable">0</b></div><div><span id="repAiMineLabel"></span><b id="repAiMine">0</b></div></div>';
    const goals=document.getElementById('goalsDashboard')?.closest('.card');
    if(goals)dash.insertBefore(card,goals);else dash.appendChild(card);
    card.querySelector('#repAiOppOpen')?.addEventListener('click',openPage);
  }

  function renderRepDashboard(rows){
    ensureRepDashboardCard();
    if(!isRep())return;
    const available=rows.filter(x=>!x.assigned_rep&&['new','reviewed'].includes(x.status)).length;
    const mine=rows.filter(x=>x.assigned_rep===state.profile.id&&x.status==='assigned').length;
    const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
    set('repAiOppTitle',ar()?'مصانع ومشاريع':'Factories & Projects');
    set('repAiOppHint',ar()?'الفرص المتاحة والمشاريع التي استلمتها':'Available opportunities and your claimed projects');
    set('repAiOppOpen',ar()?'فتح الصفحة':'Open');
    set('repAiAvailableLabel',ar()?'متاحة للاستلام':'Available');
    set('repAiMineLabel',ar()?'مشاريعي المستلمة':'My claimed');
    set('repAiAvailable',String(available));
    set('repAiMine',String(mine));
  }

  function ensureUi(){
    if(!canSee()){removeUi();return;}
    ensureRepDashboardCard();

    const navGrid=document.querySelector('.nav-grid');
    if(navGrid&&!document.getElementById('aiOppNav')){
      const btn=document.createElement('button');
      btn.id='aiOppNav';btn.type='button';btn.dataset.page='aiOppPage';
      btn.addEventListener('click',openPage);
      const sources=document.getElementById('aiSourcesNav'),accountBtn=navGrid.querySelector('[data-page="account"]');
      navGrid.insertBefore(btn,sources||(accountBtn||null));
    }

    const main=document.querySelector('main');
    if(main&&!document.getElementById('aiOppPage')){
      const section=document.createElement('section');
      section.id='aiOppPage';section.className='section';
      section.innerHTML=
        '<div class="card" style="margin-bottom:14px">'+
          '<div class="dashboard-head">'+
            '<div><h3 id="aiOppHeading"></h3><div class="small" id="aiOppHelp"></div><div class="ai-agent-timer"><span id="aiAgentTimerLabel"></span><b id="aiAgentTimer">--:--:--</b><span class="small" id="aiAgentTimerNote"></span></div></div>'+
            '<div style="display:flex;gap:7px;flex-wrap:wrap">'+
              '<button class="btn" id="aiSearchNowBtn" type="button"></button>'+
              '<button class="btn secondary" id="aiOppRefresh" type="button"></button>'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div id="aiOverdueWarning"></div>'+
        '<div class="grid cards" id="aiOppSummary" style="margin-bottom:14px"></div>'+
        '<div class="toolbar" style="margin-bottom:10px">'+
          '<select id="aiOppTypeFilter" aria-label="'+(ar()?'النوع':'Type')+'"></select>'+
          '<select id="aiOppGradeFilter" aria-label="'+(ar()?'الأولوية':'Priority')+'"></select>'+
          '<select id="aiOppCityFilter" aria-label="'+(ar()?'المدينة':'City')+'"></select>'+
          '<select id="aiOppPeriodFilter" aria-label="'+(ar()?'الفترة':'Period')+'"></select>'+
        '</div>'+
        '<div id="aiOppList">'+
          '<div class="card ai-opportunity-section ai-available-section" style="margin-bottom:12px">'+
            '<div class="workload-collapsed-head open" id="aiAvailableToggle" role="button" tabindex="0" aria-expanded="true">'+
              '<div><h3 id="aiAvailableTitle"></h3><div class="small" id="aiAvailableHelp"></div></div>'+
              '<div class="ai-section-count"><span class="badge b-warn" id="aiAvailableCount">0</span><span class="workload-collapse-arrow">⌄</span></div>'+
            '</div>'+
            '<div id="aiAvailableBody" style="margin-top:10px"><div id="aiAvailableList"></div></div>'+
          '</div>'+
          '<div class="card ai-opportunity-section ai-claimed-section" style="margin-bottom:12px">'+
            '<div class="dashboard-head"><div><h3 id="aiClaimedTitle"></h3><div class="small" id="aiClaimedHelp"></div></div><span class="badge b-good" id="aiClaimedCount">0</span></div>'+
            '<div id="aiClaimedList"></div>'+
          '</div>'+
        '</div>';
      main.appendChild(section);

      section.querySelector('#aiOppRefresh')?.addEventListener('click',loadAll);
      section.querySelector('#aiSearchNowBtn')?.addEventListener('click',searchNow);
      ['#aiOppTypeFilter','#aiOppGradeFilter','#aiOppCityFilter','#aiOppPeriodFilter'].forEach(sel=>section.querySelector(sel)?.addEventListener('change',loadOpportunities));

      availableOpen=true;
      const toggle=section.querySelector('#aiAvailableToggle');
      const toggleAvailable=()=>{
        availableOpen=!availableOpen;
        section.querySelector('#aiAvailableBody')?.classList.toggle('hidden',!availableOpen);
        toggle?.classList.toggle('open',availableOpen);
        toggle?.setAttribute('aria-expanded',availableOpen?'true':'false');
      };
      toggle?.addEventListener('click',toggleAvailable);
      toggle?.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();toggleAvailable();}});

      section.addEventListener('click',async ev=>{
        let b=ev.target.closest('[data-ai-report]');
        if(b){
          const x=opportunityById.get(b.dataset.id);
          if(x)openOpportunityReport(x);
          return;
        }

        b=ev.target.closest('[data-ai-claim]');
        if(b){
          const id=b.dataset.id;
          if(claimInFlight.has(id))return;
          claimInFlight.add(id);
          b.disabled=true;
          try{
            const {data,error}=await sb.rpc('claim_ai_opportunity',{p_opportunity_id:id});
            if(error)return flash((ar()?'تعذر استلام الفرصة: ':'Could not claim opportunity: ')+error.message,true);
            if(data!==true)return flash(ar()?'الفرصة أخذها مندوب آخر قبلك.':'Another representative claimed this opportunity first.',true);
            flash(ar()?'تم استلام الفرصة. أمامك يومان لرفع التقرير.':'Opportunity claimed. You have two days to submit the report.');
            return loadAll();
          }finally{
            claimInFlight.delete(id);
            if(b?.isConnected)b.disabled=false;
          }
        }

        b=ev.target.closest('[data-ai-cancel-claim]');
        if(b){
          const ok=window.confirm(ar()?'هل تريد إلغاء استلام هذا المشروع؟ سيعود للفرص المتاحة.':'Cancel this claimed opportunity? It will return to the available list.');
          if(!ok)return;
          b.disabled=true;
          const {data,error}=await sb.rpc('cancel_ai_opportunity_claim',{p_opportunity_id:b.dataset.id});
          b.disabled=false;
          if(error)return flash((ar()?'تعذر إلغاء الاستلام: ':'Could not cancel claim: ')+error.message,true);
          if(data!==true)return flash(ar()?'تعذر إلغاء الاستلام.':'Could not cancel claim.',true);
          flash(ar()?'تم إلغاء الاستلام وعادت الفرصة للفرص المتاحة.':'Claim cancelled and the opportunity is available again.');
          return loadAll();
        }

        b=ev.target.closest('[data-ai-delete-opportunity]');
        if(b&&isManagement()){
          const id=b.dataset.id;
          const x=opportunityById.get(id);
          const ok=window.confirm(ar()?('حذف '+(x?.name||'هذه الفرصة')+' نهائياً؟ لن يسمح الإيجنت بإضافتها مرة ثانية.'):'Delete this opportunity permanently? The agent will not add it again.');
          if(!ok)return;
          b.disabled=true;
          const {data,error}=await sb.rpc('admin_delete_ai_opportunity',{p_opportunity_id:id});
          b.disabled=false;
          if(error)return flash((ar()?'تعذر حذف الفرصة: ':'Could not delete opportunity: ')+error.message,true);
          if(data!==true)return flash(ar()?'الفرصة غير موجودة.':'Opportunity not found.',true);
          flash(ar()?'تم حذف الفرصة ومنع الإيجنت من إعادتها.':'Opportunity deleted and blocked from being re-added.');
          return loadAll();
        }

        b=ev.target.closest('[data-ai-opp-status]');
        if(b&&isManagement()){
          const id=b.dataset.id,status=b.dataset.aiOppStatus;
          b.disabled=true;
          const {error}=await sb.from('ai_opportunities').update({status,updated_at:new Date().toISOString()}).eq('id',id);
          b.disabled=false;
          if(error)return flash(error.message,true);
          return loadAll();
        }

        b=ev.target.closest('[data-ai-opp-assign]');
        if(b&&isManagement()){
          const id=b.dataset.id;
          const select=section.querySelector('[data-ai-opp-rep="'+id+'"]');
          const repId=select?.value||'';
          if(!repId)return flash(ar()?'اختر المندوب أولاً':'Choose a representative first',true);
          b.disabled=true;
          const {data,error}=await sb.rpc('assign_ai_opportunity',{p_opportunity_id:id,p_rep_id:repId});
          b.disabled=false;
          if(error)return flash(error.message,true);
          if(data!==true)return flash(ar()?'تعذر إسناد الفرصة.':'Could not assign opportunity.',true);
          flash(ar()?'تم إسناد الفرصة وبدأت مهلة اليومين للتقرير.':'Opportunity assigned; the two-day report window has started.');
          return loadAll();
        }
      });
    }

    const search=document.getElementById('aiSearchNowBtn');
    if(search)search.classList.toggle('hidden',!isPrimaryAdmin());
    document.getElementById('aiOppGradeFilter')?.classList.toggle('hidden',isRep());
    document.querySelector('#aiOppPage .ai-agent-timer')?.classList.toggle('hidden',isRep());
    updateLabels();
    startAgentTimer();
  }

  function nextAgentCycleAt(now=new Date()){
    const next=new Date(now.getTime());
    next.setUTCHours(5,0,0,0);
    if(next.getTime()<=now.getTime())next.setUTCDate(next.getUTCDate()+1);
    return next;
  }

  function updateAgentTimer(){
    const timer=document.getElementById('aiAgentTimer');
    const label=document.getElementById('aiAgentTimerLabel');
    const note=document.getElementById('aiAgentTimerNote');
    if(!timer)return;
    const now=new Date(),next=nextAgentCycleAt(now);
    const ms=Math.max(0,next.getTime()-now.getTime());
    const total=Math.floor(ms/1000);
    const h=String(Math.floor(total/3600)).padStart(2,'0');
    const m=String(Math.floor((total%3600)/60)).padStart(2,'0');
    const s=String(total%60).padStart(2,'0');
    timer.textContent=h+':'+m+':'+s;
    if(label)label.textContent=ar()?'البحث التلقائي القادم بعد':'Next automatic search in';
    if(note)note.textContent=ar()?'يومياً الساعة 8:00 صباحاً · الحد الشهري 240 ريال':'Daily at 8:00 AM · monthly cap: SAR 240';
  }

  function startAgentTimer(){
    updateAgentTimer();
    if(agentTimerInterval)return;
    agentTimerInterval=setInterval(updateAgentTimer,1000);
  }

  function updateLabels(){
    const nav=document.getElementById('aiOppNav');if(nav)nav.textContent=ar()?'مصانع ومشاريع':'Factories & Projects';
    const h=document.getElementById('aiOppHeading');if(h)h.textContent=ar()?'مصانع ومشاريع':'Factories & Projects';
    const help=document.getElementById('aiOppHelp');
    if(help)help.textContent=ar()?(isManagement()?'الفرص مصنفة حسب المدينة، مع موقع فعلي موثق وبيانات قابلة للتنفيذ.':'اختر الفرصة حسب المدينة، وبعد الاستلام أمامك يومان لرفع التقرير.'):(isManagement()?'Opportunities are organized by city with verified physical locations and actionable data.':'Choose an opportunity by city; reports are due within two days.');
    const r=document.getElementById('aiOppRefresh');if(r)r.textContent=ar()?'تحديث':'Refresh';
    const s=document.getElementById('aiSearchNowBtn');if(s)s.textContent=searching?(ar()?'جاري بدء البحث...':'Starting search...'):(ar()?'بحث عن فرص جديدة':'Find new opportunities');
    updateAgentTimer();

    const tf=document.getElementById('aiOppTypeFilter');
    if(tf){const v=tf.value;tf.innerHTML='<option value="">'+(ar()?'كل الأنواع':'All types')+'</option><option value="factory">'+typeLabel('factory')+'</option><option value="project">'+typeLabel('project')+'</option><option value="contractor">'+typeLabel('contractor')+'</option>';tf.value=v;}

    const gf=document.getElementById('aiOppGradeFilter');
    if(gf){const v=gf.value;gf.innerHTML='<option value="">'+(ar()?'كل الدرجات':'All grades')+'</option><option value="A">A</option><option value="B">B</option><option value="C">C</option>';gf.value=v;}

    const pf=document.getElementById('aiOppPeriodFilter');
    if(pf){const v=pf.value;pf.innerHTML='<option value="">'+(ar()?'كل الفترات':'All periods')+'</option><option value="today">'+(ar()?'مشاريع اليوم':'Today')+'</option><option value="week">'+(ar()?'هذا الأسبوع':'This week')+'</option>';pf.value=v;}
  }

  async function searchNow(){
    if(!isPrimaryAdmin()||searching)return;
    searching=true;updateLabels();
    const {error}=await sb.rpc('admin_trigger_ai_market_scout');
    searching=false;updateLabels();
    if(error)return flash((ar()?'تعذر بدء البحث: ':'Could not start search: ')+error.message,true);
    flash(ar()?'بدأ البحث عن فرص جديدة. ستظهر النتائج عند اكتماله.':'Search started. Results will appear when complete.');
    setTimeout(loadAll,12000);
    setTimeout(loadAll,30000);
  }

  function repMap(){
    return new Map((state.profiles||[]).filter(r=>r.role==='rep').map(r=>[r.id,r.full_name||r.username]));
  }

  function renderSummary(rows){
    const el=document.getElementById('aiOppSummary');if(!el)return;
    const available=rows.filter(x=>!x.assigned_rep&&['new','reviewed'].includes(x.status));
    const claimed=isRep()?rows.filter(x=>x.assigned_rep===state.profile.id&&x.status==='assigned'):rows.filter(x=>x.assigned_rep&&x.status==='assigned');
    const overdue=claimed.filter(x=>x.report_due_at&&!x.last_report_at&&new Date(x.report_due_at).getTime()<=Date.now()).length;
    const cards=isRep()?[
      [ar()?'متاحة':'Available',available.length],
      [ar()?'مستلمة':'Claimed',claimed.length],
      [ar()?'تقارير متأخرة':'Overdue',overdue]
    ]:[
      [ar()?'متاحة للاستلام':'Available',available.length],
      [ar()?'أولوية A':'Priority A',available.filter(x=>x.grade==='A').length],
      [ar()?'مستلمة':'Claimed',claimed.length],
      [ar()?'تقارير متأخرة':'Overdue reports',overdue]
    ];
    el.innerHTML=cards.map(x=>'<div class="card metric-card"><div class="label">'+esc(x[0])+'</div><div class="metric">'+Number(x[1])+'</div></div>').join('');
  }

  function dueState(x){
    if(!x.assigned_rep||x.status!=='assigned')return null;
    if(x.last_report_at)return{done:true,overdue:false,text:ar()?'تم رفع التقرير المطلوب':'Required report submitted'};
    if(!x.report_due_at)return{done:false,overdue:false,text:ar()?'مهلة التقرير غير محددة':'Report deadline not set'};
    const ms=new Date(x.report_due_at).getTime()-Date.now();
    if(ms<=0)return{done:false,overdue:true,text:ar()?'التقرير متأخر ويجب رفعه الآن':'Report is overdue and must be submitted now'};
    const hours=Math.ceil(ms/3600000);
    const left=hours<=24?(ar()?hours+' ساعة':hours+' hours'):(ar()?Math.ceil(hours/24)+' يوم':Math.ceil(hours/24)+' days');
    return{done:false,overdue:false,text:ar()?'متبقي '+left+' لرفع التقرير':left+' left to submit the report'};
  }

  function fallbackRole(x){
    if(x.recommended_contact_role)return x.recommended_contact_role;
    if(x.opportunity_type==='factory')return ar()?'مسؤول المشتريات أو مدير الصيانة':'Procurement or maintenance manager';
    if(x.opportunity_type==='contractor')return ar()?'مسؤول المشتريات أو مدير المشاريع':'Procurement or projects manager';
    return ar()?'مدير المشروع أو مسؤول المشتريات':'Project manager or procurement';
  }

  function latestReportHtml(x){
    const r=latestReports.get(x.id);
    if(!r)return'';
    const meta=[
      r.responsible_phone?'<span>☎ <bdi class="ai-ltr-number" dir="ltr">'+esc(r.responsible_phone)+'</bdi></span>':'',
      r.location_text?'<span>⌖ '+esc(r.location_text)+'</span>':'',
      r.created_at?'<span>◷ '+esc(dateTime(r.created_at))+'</span>':''
    ].filter(Boolean).join('');
    return '<details class="ai-compact-details ai-latest-report">'+
      '<summary>'+(ar()?'آخر تقرير للمندوب':'Latest representative report')+'<span class="ai-detail-arrow">⌄</span></summary>'+
      '<div class="ai-report-meta">'+meta+'</div>'+
      (r.report_text?'<div class="ai-report-text">'+esc(r.report_text)+'</div>':'')+
    '</details>';
  }

  function openOpportunityReport(x){
    if(!isRep()||x.assigned_rep!==state.profile.id)return;
    const last=latestReports.get(x.id);
    const loc=last?.location_text||x.address||x.district||x.city||'';
    const phone=last?.responsible_phone||'';
    const html=
      '<div class="notice"><b>'+esc(x.name)+'</b><br>'+(ar()?'التقرير المطلوب يحتوي على رقم المسؤول، الموقع، وما حدث معك.':'The required report must include the responsible contact number, location, and what happened.')+'</div>'+
      '<div class="form-grid">'+
        '<div><label>'+(ar()?'رقم المسؤول':'Responsible contact number')+'</label><input id="aiReportPhone" inputmode="tel" value="'+esc(phone)+'" placeholder="'+(ar()?'مثال: 05xxxxxxxx':'Example: 05xxxxxxxx')+'"></div>'+
        '<div><label>'+(ar()?'الموقع':'Location')+'</label><input id="aiReportLocation" value="'+esc(loc)+'" placeholder="'+(ar()?'العنوان أو رابط الموقع':'Address or map location')+'"></div>'+
        '<div class="full"><label>'+(ar()?'التقرير':'Report')+'</label><textarea id="aiReportText" rows="6" placeholder="'+(ar()?'اكتب ماذا حصل مع المشروع، من تواصلت معه، وما الخطوة القادمة...':'Write what happened, who you contacted, and the next step...')+'"></textarea></div>'+
        '<div class="full"><button class="btn good" id="aiSaveOpportunityReport" type="button">'+(ar()?'حفظ التقرير':'Save report')+'</button></div>'+
      '</div>';
    openModal(ar()?'رفع تقرير المشروع / المصنع':'Submit project / factory report',html);
    const save=document.getElementById('aiSaveOpportunityReport');
    save?.addEventListener('click',async()=>{
      const responsiblePhone=(document.getElementById('aiReportPhone')?.value||'').trim();
      const locationText=(document.getElementById('aiReportLocation')?.value||'').trim();
      const reportText=(document.getElementById('aiReportText')?.value||'').trim();
      if(responsiblePhone.length<5)return flash(ar()?'رقم المسؤول مطلوب.':'Responsible contact number is required.',true);
      if(locationText.length<2)return flash(ar()?'الموقع مطلوب.':'Location is required.',true);
      if(reportText.length<5)return flash(ar()?'اكتب التقرير.':'Enter the report.',true);
      save.disabled=true;
      const {error}=await sb.rpc('submit_ai_opportunity_report',{p_opportunity_id:x.id,p_responsible_phone:responsiblePhone,p_location_text:locationText,p_report_text:reportText});
      save.disabled=false;
      if(error)return flash(error.message,true);
      closeModal();
      flash(ar()?'تم رفع التقرير، ويمكنك استلام فرص جديدة.':'Report submitted. You can claim new opportunities.');
      await loadAll();
    });
  }

  function claimedGuidanceHtml(x){
    if(!x.assigned_rep)return '';
    const g=guidanceByOpportunity.get(x.id);
    if(!g)return '<div class="ai-guide-loading">'+(ar()?'الإيجنت يجهز خطة الزيارة لهذه الفرصة.':'The agent is preparing the visit plan for this opportunity.')+'</div>';
    const accessSrc=safeUrl(g.access_source_url);
    const step=(n,title,value)=>value?'<div class="ai-guide-step"><span>'+n+'</span><div><b>'+esc(title)+'</b><p>'+esc(value)+'</p></div></div>':'';
    return '<details class="ai-visit-plan ai-compact-details">'+
      '<summary><span>'+(ar()?'خطة الزيارة للمندوب':'Representative visit plan')+'</span><span class="ai-detail-arrow">⌄</span></summary>'+
      '<div class="ai-rep-guide">'+
        '<div class="ai-guide-steps">'+
          step('1',ar()?'كيف أوصل؟':'How do I get there?',g.access_plan)+
          step('2',ar()?'مين أكلم ووش أقول؟':'Who do I ask for and what do I say?',g.visit_playbook)+
          step('3',ar()?'وش هدفي من الزيارة؟':'What is my goal?',g.capture_plan)+
        '</div>'+
        (g.likely_requests?'<div class="ai-guide-request"><b>'+(ar()?'جهّز معك: ':'Be ready for: ')+'</b>'+esc(g.likely_requests)+'</div>':'')+
        (accessSrc?'<a class="ai-guide-source" href="'+esc(accessSrc)+'" target="_blank" rel="noopener noreferrer">'+(ar()?'مصدر معلومات الوصول':'Access source')+'</a>':'')+
      '</div>'+
    '</details>';
  }

  function claimCancelState(x){
    if(!x?.claimed_at)return {allowed:false,remainingMinutes:0};
    const ms=(new Date(x.claimed_at).getTime()+60*60*1000)-Date.now();
    return {allowed:ms>0,remainingMinutes:Math.max(0,Math.ceil(ms/60000))};
  }

  function renderOpportunityCard(x,rmap,priorityIndex,repBlocked){
    const src=safeUrl(x.source_url),web=safeUrl(x.website),contractorSrc=safeUrl(x.linked_contractor_source_url),maps=googleMapsSearchUrl(x);
    const assignedName=rmap.get(x.assigned_rep)||'';
    const due=dueState(x);
    const type=typeLabel(x.opportunity_type);
    const reason=String(x.priority_reason||x.recommendation_reason||'').trim();
    const locationText=String(x.address||x.district||x.city||'').trim();
    const contactName=String(x.contact_name||'').trim();
    const contactPhone=String(x.phone||'').trim();
    const contractorName=String(x.linked_contractor_name||'').trim();
    const contractorPhone=String(x.linked_contractor_phone||'').trim();
    const bestRole=String(fallbackRole(x)||'').trim();
    const products=(x.suggested_products||[]).filter(Boolean).slice(0,6);
    let actions='';

    if(isRep()){
      if(x.assigned_rep===state.profile.id&&x.status==='assigned'){
        const cancelState=claimCancelState(x);
        actions='<div class="ai-opp-actions">'+
          '<button class="btn '+(due?.overdue?'bad':'good')+'" data-ai-report="1" data-id="'+esc(x.id)+'">'+(ar()?(due?.done?'إضافة تقرير':'رفع التقرير'):(due?.done?'Add report':'Submit report'))+'</button>'+
          (cancelState.allowed
            ?'<button class="btn secondary" data-ai-cancel-claim="1" data-id="'+esc(x.id)+'">'+(ar()?'إلغاء الاستلام · '+cancelState.remainingMinutes+' د':'Cancel · '+cancelState.remainingMinutes+' min')+'</button>'
            :'<button class="btn secondary" type="button" disabled>'+(ar()?'انتهت مهلة الإلغاء':'Cancellation ended')+'</button>')+
        '</div>';
      }else if(!x.assigned_rep&&['new','reviewed'].includes(x.status)){
        actions=repBlocked
          ?'<div class="ai-opp-actions"><button class="btn secondary" type="button" disabled>'+(ar()?'ارفع التقرير المتأخر أولاً':'Submit overdue report first')+'</button></div>'
          :'<div class="ai-opp-actions"><button class="btn good ai-primary-action" data-ai-claim="1" data-id="'+esc(x.id)+'">'+(ar()?'استلام الفرصة':'Claim opportunity')+'</button></div>';
      }
    }else if(isManagement()){
      if(x.assigned_rep&&x.status==='assigned'){
        actions='<div class="ai-opp-actions"><button class="btn secondary" data-ai-cancel-claim="1" data-id="'+esc(x.id)+'">'+(ar()?'إلغاء الاستلام':'Cancel claim')+'</button>';
      }else if(!x.assigned_rep&&x.status!=='rejected'&&x.status!=='won'&&x.status!=='lost'){
        const options=['<option value="">'+(ar()?'اختر مندوباً':'Choose representative')+'</option>'].concat((state.profiles||[]).filter(r=>r.role==='rep').map(r=>'<option value="'+esc(r.id)+'">'+esc(r.full_name||r.username)+'</option>')).join('');
        actions='<div class="ai-opp-actions">'+
          (x.status==='new'?'<button class="btn good mini" data-id="'+esc(x.id)+'" data-ai-opp-status="reviewed">'+(ar()?'اعتماد':'Approve')+'</button>':'')+
          '<button class="btn secondary mini" data-id="'+esc(x.id)+'" data-ai-opp-status="rejected">'+(ar()?'رفض':'Reject')+'</button>'+
          '<select data-ai-opp-rep="'+esc(x.id)+'">'+options+'</select>'+
          '<button class="btn mini" data-id="'+esc(x.id)+'" data-ai-opp-assign="1">'+(ar()?'إسناد':'Assign')+'</button>';
      }else{
        actions='<div class="ai-opp-actions">';
      }
      actions+='<button class="btn bad mini" data-ai-delete-opportunity="1" data-id="'+esc(x.id)+'">'+(ar()?'حذف نهائي':'Delete permanently')+'</button></div>';
    }

    const topTags=[
      '<span class="ai-type-pill '+(x.opportunity_type==='factory'?'factory':'project')+'">'+esc(type)+'</span>',
      x.city?'<span class="ai-city-pill">'+esc(x.city)+'</span>':'',
      x.project_stage?'<span class="ai-stage-pill">'+esc(x.project_stage)+'</span>':''
    ].filter(Boolean).join('');

    const priority=priorityIndex?'<span class="ai-priority-pill">'+(ar()?'أولوية ':'Priority ')+'<bdi class="ai-ltr-number" dir="ltr">'+priorityIndex+'</bdi></span>':'';
    const managementScore=isManagement()?'<span class="badge '+gradeClass(x.grade)+'">'+esc(x.grade||'C')+' · <bdi class="ai-ltr-number" dir="ltr">'+Number(x.score||0)+'</bdi></span>':'';

    const locationBlock='<div class="ai-main-fact ai-main-location">'+
      '<div class="ai-main-fact-label">'+(ar()?'الموقع الفعلي':'Physical location')+'</div>'+
      '<div class="ai-main-fact-value">'+
        '<b>'+esc(locationText||x.city||'-')+'</b>'+
        (maps?'<a class="btn good mini ai-map-action" href="'+esc(maps)+'" target="_blank" rel="noopener noreferrer">'+(ar()?'فتح الموقع':'Open location')+'</a>':'')+
      '</div>'+
    '</div>';

    const contractorBlock=(x.opportunity_type==='project'&&contractorName)
      ?'<div class="ai-main-fact ai-main-contractor">'+
        '<div class="ai-main-fact-label">'+(ar()?'المقاول / الجهة المنفذة':'Contractor / executing company')+'</div>'+
        '<div class="ai-main-fact-value"><b>'+esc(contractorName)+'</b>'+
          (contractorPhone?'<a class="ai-phone-link" href="tel:'+esc(contractorPhone.replace(/[^+0-9]/g,''))+'"><bdi class="ai-ltr-number" dir="ltr">'+esc(contractorPhone)+'</bdi></a>':'')+
        '</div>'+
      '</div>'
      :'';

    const contactLines=[
      bestRole?'<b>'+esc(bestRole)+'</b>':'',
      contactName?'<span>'+esc(contactName)+'</span>':'',
      contactPhone?'<a class="ai-phone-link ai-phone-button" href="tel:'+esc(contactPhone.replace(/[^+0-9]/g,''))+'"><span class="ai-call-label">'+(ar()?'اتصال:':'Call:')+'</span><bdi class="ai-ltr-number" dir="ltr">'+esc(contactPhone)+'</bdi></a>':''
    ].filter(Boolean).join('');
    const contactBlock=contactLines?'<div class="ai-main-fact ai-main-contact">'+
      '<div class="ai-main-fact-label">'+(ar()?'أفضل جهة للتواصل':'Best contact')+'</div>'+
      '<div class="ai-main-fact-value ai-contact-stack">'+contactLines+'</div>'+
    '</div>':'';

    const activityHtml=x.activity
      ?'<div class="ai-activity-line"><span>'+(ar()?'النشاط':'Activity')+'</span><b>'+esc(x.activity)+'</b></div>'
      :'';

    const reasonHtml=reason
      ?'<div class="ai-sales-reason"><div class="ai-sales-reason-title">'+(ar()?'ليش هذه فرصة؟':'Why this opportunity?')+'</div><div>'+esc(reason)+'</div></div>'
      :'';

    const productsHtml=products.length
      ?'<div class="ai-sales-products"><div class="ai-sales-products-title">'+(ar()?'وش ممكن نبيع؟':'What can we sell?')+'</div><div>'+products.map(p=>'<span>'+esc(p)+'</span>').join('')+'</div></div>'
      :'';

    const dueHtml=due
      ?'<div class="ai-due-strip '+(due.overdue?'overdue':due.done?'done':'')+'"><b>'+esc(due.text)+'</b>'+(x.report_due_at&&!due.done?'<span><bdi class="ai-ltr-number" dir="ltr">'+esc(dateTime(x.report_due_at))+'</bdi></span>':'')+'</div>'
      :'';

    const moreItems=[
      isManagement()&&x.administrative_region?'<div><span>'+(ar()?'المنطقة':'Region')+'</span><b>'+esc(x.administrative_region)+'</b></div>':'',
      isManagement()?'<div><span>'+(ar()?'الحالة':'Status')+'</span><b>'+esc(statusLabel(x.status))+'</b></div>':'',
      isManagement()&&assignedName?'<div><span>'+(ar()?'المندوب':'Representative')+'</span><b>'+esc(assignedName)+'</b></div>':'',
      isManagement()&&x.verification_status?'<div><span>'+(ar()?'التحقق':'Verification')+'</span><b>'+esc(verifyLabel(x.verification_status))+'</b></div>':'',
      x.claimed_at?'<div><span>'+(ar()?'وقت الاستلام':'Claimed at')+'</span><b><bdi class="ai-ltr-number" dir="ltr">'+esc(dateTime(x.claimed_at))+'</bdi></b></div>':'',
      web?'<div><span>'+(ar()?'موقع الجهة':'Website')+'</span><a href="'+esc(web)+'" target="_blank" rel="noopener noreferrer">'+(ar()?'فتح':'Open')+'</a></div>':'',
      src?'<div><span>'+(ar()?'المصدر':'Source')+'</span><a href="'+esc(src)+'" target="_blank" rel="noopener noreferrer">'+(ar()?'فتح':'Open')+'</a></div>':'',
      contractorSrc&&contractorName?'<div><span>'+(ar()?'مصدر المقاول':'Contractor source')+'</span><a href="'+esc(contractorSrc)+'" target="_blank" rel="noopener noreferrer">'+(ar()?'فتح':'Open')+'</a></div>':''
    ].filter(Boolean).join('');

    return '<div class="card ai-opportunity-card ai-opportunity-clear" data-opportunity-id="'+esc(x.id)+'">'+
      '<div class="ai-card-header">'+
        '<div class="ai-card-title-area"><div class="ai-card-title-line"><b class="ai-opp-name">'+esc(x.name)+'</b>'+priority+managementScore+'</div><div class="ai-card-tags">'+topTags+'</div>'+activityHtml+'</div>'+
      '</div>'+
      '<div class="ai-main-facts">'+locationBlock+contractorBlock+contactBlock+'</div>'+
      reasonHtml+
      productsHtml+
      dueHtml+
      claimedGuidanceHtml(x)+
      latestReportHtml(x)+
      (moreItems?'<details class="ai-compact-details ai-opp-more"><summary>'+(ar()?'بيانات إضافية':'Additional details')+'<span class="ai-detail-arrow">⌄</span></summary><div class="ai-more-grid">'+moreItems+'</div></details>':'')+
      actions+
    '</div>';
  }

  async function loadOpportunityReports(){
    latestReports=new Map();
    const {data,error}=await sb.from('ai_opportunity_reports').select('id,opportunity_id,rep_id,responsible_phone,location_text,report_text,created_at').order('created_at',{ascending:false}).limit(1000);
    if(error){console.error('ai opportunity reports',error);return;}
    for(const r of(data||[]))if(!latestReports.has(r.opportunity_id))latestReports.set(r.opportunity_id,r);
  }

  async function loadOpportunityGuidance(){
    guidanceByOpportunity=new Map();
    const {data,error}=await sb.from('ai_opportunity_guidance')
      .select('opportunity_id,access_plan,access_source_url,visit_playbook,likely_requests,capture_plan,updated_at')
      .limit(1000);
    if(error){console.error('ai opportunity guidance',error);return;}
    for(const g of(data||[]))guidanceByOpportunity.set(g.opportunity_id,g);
  }

  async function loadOpportunities(){
    if(!canSee())return;
    ensureUi();
    const claimedList=document.getElementById('aiClaimedList'),availableList=document.getElementById('aiAvailableList');
    if(claimedList)claimedList.innerHTML='<div class="small">'+(ar()?'جاري التحميل...':'Loading...')+'</div>';
    if(availableList)availableList.innerHTML='<div class="small">'+(ar()?'جاري التحميل...':'Loading...')+'</div>';

    let q=sb.from('ai_opportunities').select('id,opportunity_type,name,activity,city,administrative_region,district,address,phone,website,contact_name,contact_role,recommended_contact_role,linked_contractor_name,linked_contractor_phone,linked_contractor_source_url,priority_reason,google_maps_url,google_maps_verified,location_source_url,location_checked_at,intelligence_checked_at,quality_checked_at,project_stage,suggested_products,score,grade,recommendation_reason,verification_status,confidence,source_name,source_url,source_published_at,discovered_at,last_verified_at,status,assigned_rep,claimed_at,report_due_at,last_report_at').order('score',{ascending:false}).order('discovered_at',{ascending:false}).limit(500);
    const ty=document.getElementById('aiOppTypeFilter')?.value||'';if(ty)q=q.eq('opportunity_type',ty);
    const gr=document.getElementById('aiOppGradeFilter')?.value||'';if(gr)q=q.eq('grade',gr);
    const results=await Promise.all([q,loadOpportunityReports(),loadOpportunityGuidance()]);
    const data=results[0].data,error=results[0].error;
    if(error){
      const html='<div class="danger-note">'+esc(error.message)+'</div>';
      if(claimedList)claimedList.innerHTML=html;
      if(availableList)availableList.innerHTML=html;
      return;
    }

    const allRows=(data||[]).filter(x=>x.quality_checked_at||x.assigned_rep||!['new','reviewed'].includes(x.status));
    const cityFilter=document.getElementById('aiOppCityFilter');
    if(cityFilter){
      const selected=cityFilter.value||'';
      const cityCounts=new Map();
      for(const x of allRows){const cityName=String(x.city||'').trim();if(cityName)cityCounts.set(cityName,(cityCounts.get(cityName)||0)+1);}
      const cities=[...cityCounts.keys()].sort((a,b)=>a.localeCompare(b,ar()?'ar':'en'));
      cityFilter.innerHTML='<option value="">'+(ar()?'كل المدن':'All cities')+' ('+allRows.length+')</option>'+cities.map(c=>'<option value="'+esc(c)+'">'+esc(c)+' ('+cityCounts.get(c)+')</option>').join('');
      cityFilter.value=cities.includes(selected)?selected:'';
    }
    const city=cityFilter?.value||'';
    const period=document.getElementById('aiOppPeriodFilter')?.value||'';
    const rows=allRows.filter(x=>(!city||String(x.city||'')===city)&&periodMatch(x,period)),rmap=repMap();
    opportunityById=new Map(rows.map(x=>[x.id,x]));
    renderSummary(rows);renderRepDashboard(rows);

    const claimed=(isRep()?rows.filter(x=>x.assigned_rep===state.profile.id&&x.status==='assigned'):rows.filter(x=>x.assigned_rep&&x.status==='assigned')).sort((a,b)=>new Date(b.claimed_at||0)-new Date(a.claimed_at||0));
    const available=rows.filter(x=>!x.assigned_rep&&['new','reviewed'].includes(x.status)).sort((a,b)=>Number(b.score||0)-Number(a.score||0)||new Date(b.discovered_at||0)-new Date(a.discovered_at||0));
    const repBlocked=isRep()&&claimed.some(x=>x.report_due_at&&!x.last_report_at&&new Date(x.report_due_at).getTime()<=Date.now());

    const warning=document.getElementById('aiOverdueWarning');
    if(warning)warning.innerHTML=repBlocked?'<div class="danger-note" style="margin-bottom:12px"><b>'+(ar()?'لديك تقرير مشروع متأخر. لن تستطيع استلام أي مشروع جديد حتى ترفع التقرير المطلوب.':'You have an overdue project report. You cannot claim a new opportunity until it is submitted.')+'</b></div>':'';

    const ct=document.getElementById('aiClaimedTitle'),ch=document.getElementById('aiClaimedHelp'),cc=document.getElementById('aiClaimedCount');
    if(ct)ct.textContent=ar()?'المشاريع المستلمة':'Claimed projects';
    if(ch)ch.textContent=ar()?(isRep()?'المصانع والمشاريع التي استلمتها، ومهلة التقرير يومان من وقت الاستلام.':'المشاريع والمصانع المسندة للمناديب وتقارير المتابعة.'):(isRep()?'Your claimed factories and projects; reports are due within two days.':'Assigned opportunities and representative reports.');
    if(cc)cc.textContent=String(claimed.length);

    const at=document.getElementById('aiAvailableTitle'),ah=document.getElementById('aiAvailableHelp'),ac=document.getElementById('aiAvailableCount');
    if(at)at.textContent=ar()?'المصانع والمشاريع المتاحة':'Available factories & projects';
    if(ah)ah.textContent=ar()?'مصفوطة افتراضياً؛ اضغط لفتحها. مرتبة حسب أولوية التواصل.':'Collapsed by default; open to view opportunities sorted by contact priority.';
    if(ac)ac.textContent=String(available.length);

    if(claimedList)claimedList.innerHTML=claimed.length?claimed.map(x=>renderOpportunityCard(x,rmap,null,repBlocked)).join(''):'<div class="empty">'+(ar()?'لا توجد مشاريع مستلمة حالياً.':'No claimed projects currently.')+'</div>';
    if(availableList)availableList.innerHTML=available.length?available.map((x,i)=>renderOpportunityCard(x,rmap,i+1,repBlocked)).join(''):'<div class="empty">'+(ar()?'لا توجد مصانع أو مشاريع متاحة بهذه الفلاتر حالياً.':'No available factories or projects match these filters.')+'</div>';

    const body=document.getElementById('aiAvailableBody'),toggle=document.getElementById('aiAvailableToggle');
    if(body)body.classList.toggle('hidden',!availableOpen);
    toggle?.classList.toggle('open',availableOpen);
    toggle?.setAttribute('aria-expanded',availableOpen?'true':'false');
  }

  async function loadAll(){ensureUi();await loadOpportunities();}
  function sync(){ensureUi();if(canSee())loadAll();}

  window.addEventListener('dana:render',sync);
  sb.auth.onAuthStateChange((_event,session)=>{if(!session)removeUi();else setTimeout(sync,0);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&canSee())updateAgentTimer();});
  window.addEventListener('beforeunload',()=>{if(refreshTimer)clearInterval(refreshTimer);if(agentTimerInterval)clearInterval(agentTimerInterval);});
  sync();
}

boot();
})();