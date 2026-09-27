(() => {
'use strict';

function boot(){
  const app=window.DANA_APP;
  if(!app){setTimeout(boot,150);return;}

  const sb=app.sb,state=app.state,esc=app.esc,dateTime=app.dateTime,flash=app.flash,openModal=app.openModal,closeModal=app.closeModal;
  let refreshTimer=null,searching=false,availableOpen=false;
  let latestReports=new Map(),opportunityById=new Map();

  const ar=()=>app.getLang()==='ar';
  const isManagement=()=>app.canManage();
  const isPrimaryAdmin=()=>state.profile?.role==='admin'&&state.profile?.username==='admin';
  const isRep=()=>state.profile?.role==='rep';
  const canSee=()=>!!state.profile;
  const safeUrl=v=>{if(!v)return '';try{const u=new URL(v);return(u.protocol==='https:'||u.protocol==='http:')?u.href:'';}catch(_){return '';}};
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
            '<div><h3 id="aiOppHeading"></h3><div class="small" id="aiOppHelp"></div></div>'+
            '<div style="display:flex;gap:7px;flex-wrap:wrap">'+
              '<button class="btn" id="aiSearchNowBtn" type="button"></button>'+
              '<button class="btn secondary" id="aiOppRefresh" type="button"></button>'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div id="aiOverdueWarning"></div>'+
        '<div class="grid cards" id="aiOppSummary" style="margin-bottom:14px"></div>'+
        '<div class="toolbar" style="margin-bottom:10px"><select id="aiOppStatusFilter"></select><select id="aiOppTypeFilter"></select><select id="aiOppGradeFilter"></select><select id="aiOppAreaFilter"></select></div>'+
        '<div id="aiOppList">'+
          '<div class="card ai-opportunity-section" style="margin-bottom:12px">'+
            '<div class="dashboard-head"><div><h3 id="aiClaimedTitle"></h3><div class="small" id="aiClaimedHelp"></div></div><span class="badge b-good" id="aiClaimedCount">0</span></div>'+
            '<div id="aiClaimedList"></div>'+
          '</div>'+
          '<div class="card ai-opportunity-section" style="margin-bottom:12px">'+
            '<div class="workload-collapsed-head" id="aiAvailableToggle" role="button" tabindex="0" aria-expanded="false">'+
              '<div><h3 id="aiAvailableTitle"></h3><div class="small" id="aiAvailableHelp"></div></div>'+
              '<div style="display:flex;align-items:center;gap:8px"><span class="badge b-warn" id="aiAvailableCount">0</span><span class="workload-collapse-arrow">⌄</span></div>'+
            '</div>'+
            '<div id="aiAvailableBody" class="hidden" style="margin-top:12px"><div id="aiAvailableList"></div></div>'+
          '</div>'+
        '</div>';
      main.appendChild(section);

      section.querySelector('#aiOppRefresh')?.addEventListener('click',loadAll);
      section.querySelector('#aiSearchNowBtn')?.addEventListener('click',searchNow);
      ['#aiOppStatusFilter','#aiOppTypeFilter','#aiOppGradeFilter','#aiOppAreaFilter'].forEach(sel=>section.querySelector(sel)?.addEventListener('change',loadOpportunities));

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
          b.disabled=true;
          const {data,error}=await sb.rpc('claim_ai_opportunity',{p_opportunity_id:b.dataset.id});
          b.disabled=false;
          if(error)return flash((ar()?'تعذر استلام الفرصة: ':'Could not claim opportunity: ')+error.message,true);
          if(data!==true)return flash(ar()?'الفرصة أخذها مندوب آخر قبلك.':'Another representative claimed this opportunity first.',true);
          flash(ar()?'تم استلام الفرصة. أمامك يومان لرفع التقرير.':'Opportunity claimed. You have two days to submit the report.');
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
    const areaFilter=document.getElementById('aiOppAreaFilter');
    if(areaFilter)areaFilter.classList.toggle('hidden',!isManagement());
    updateLabels();
  }

  function updateLabels(){
    const nav=document.getElementById('aiOppNav');if(nav)nav.textContent=ar()?'مصانع ومشاريع':'Factories & Projects';
    const h=document.getElementById('aiOppHeading');if(h)h.textContent=ar()?'مصانع ومشاريع':'Factories & Projects';
    const help=document.getElementById('aiOppHelp');
    if(help)help.textContent=ar()?(isManagement()?'الإدارة ترى كل المملكة، والمناديب يرون فرص المنطقة الوسطى فقط.':'استلم الفرصة المناسبة لك، وبعد الاستلام أمامك يومان لرفع التقرير.'):(isManagement()?'Management sees all Saudi opportunities; representatives see Central Region only.':'Claim an opportunity; a report is required within two days.');
    const r=document.getElementById('aiOppRefresh');if(r)r.textContent=ar()?'تحديث':'Refresh';
    const s=document.getElementById('aiSearchNowBtn');if(s)s.textContent=searching?(ar()?'جاري بدء البحث...':'Starting search...'):(ar()?'بحث عن فرص جديدة':'Find new opportunities');

    const sf=document.getElementById('aiOppStatusFilter');
    if(sf){const v=sf.value;sf.innerHTML='<option value="">'+(ar()?'كل الحالات':'All statuses')+'</option><option value="new">'+statusLabel('new')+'</option><option value="reviewed">'+statusLabel('reviewed')+'</option><option value="assigned">'+statusLabel('assigned')+'</option><option value="rejected">'+statusLabel('rejected')+'</option>';sf.value=v;}

    const tf=document.getElementById('aiOppTypeFilter');
    if(tf){const v=tf.value;tf.innerHTML='<option value="">'+(ar()?'كل الأنواع':'All types')+'</option><option value="factory">'+typeLabel('factory')+'</option><option value="project">'+typeLabel('project')+'</option><option value="contractor">'+typeLabel('contractor')+'</option>';tf.value=v;}

    const gf=document.getElementById('aiOppGradeFilter');
    if(gf){const v=gf.value;gf.innerHTML='<option value="">'+(ar()?'كل الدرجات':'All grades')+'</option><option value="A">A</option><option value="B">B</option><option value="C">C</option>';gf.value=v;}

    const af=document.getElementById('aiOppAreaFilter');
    if(af){const v=af.value;af.innerHTML='<option value="">'+(ar()?'كل المملكة':'All Saudi Arabia')+'</option><option value="central">'+(ar()?'المنطقة الوسطى':'Central Region')+'</option><option value="outside">'+(ar()?'خارج المنطقة الوسطى':'Outside Central Region')+'</option>';af.value=v;}
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
    const cards=[
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
    return '<div class="ai-latest-report">'+
      '<b>'+(ar()?'آخر تقرير للمندوب':'Latest representative report')+'</b>'+
      '<div class="detail-grid" style="margin-top:7px">'+
        '<div><b>'+(ar()?'رقم المسؤول':'Responsible contact number')+'</b>'+esc(r.responsible_phone||'-')+'</div>'+
        '<div><b>'+(ar()?'الموقع':'Location')+'</b>'+esc(r.location_text||'-')+'</div>'+
        '<div><b>'+(ar()?'وقت التقرير':'Report time')+'</b>'+esc(dateTime(r.created_at))+'</div>'+
      '</div>'+
      '<div class="small" style="white-space:pre-wrap">'+esc(r.report_text||'')+'</div>'+
    '</div>';
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

  function renderOpportunityCard(x,rmap,priorityIndex,repBlocked){
    const src=safeUrl(x.source_url),web=safeUrl(x.website),contractorSrc=safeUrl(x.linked_contractor_source_url);
    const assignedName=rmap.get(x.assigned_rep)||'-';
    const products=(x.suggested_products||[]).map(p=>'<span class="badge b-gray" style="margin:2px">'+esc(p)+'</span>').join('')||'-';
    const contactName=x.contact_name||(ar()?'لم يتم العثور على اسم المسؤول':'Responsible contact name not found');
    const contactPhone=x.phone||(ar()?'لم يتم العثور على رقم المسؤول':'Responsible contact number not found');
    const contractorName=x.linked_contractor_name||(ar()?'لم يتم العثور على المقاول المرتبط بالمشروع':'Linked contractor not found');
    const contractorPhone=x.linked_contractor_phone||(ar()?'لم يتم العثور على رقم المقاول':'Contractor phone number not found');
    const due=dueState(x);
    let actions='';

    if(isRep()){
      if(x.assigned_rep===state.profile.id&&x.status==='assigned'){
        actions='<button class="btn '+(due?.overdue?'bad':'good')+'" data-ai-report="1" data-id="'+esc(x.id)+'">'+(ar()?(due?.done?'إضافة تقرير جديد':'رفع التقرير'):(due?.done?'Add another report':'Submit report'))+'</button>';
      }else if(!x.assigned_rep&&['new','reviewed'].includes(x.status)){
        actions=repBlocked
          ?'<button class="btn secondary" type="button" disabled>'+(ar()?'ارفع التقرير المتأخر أولاً':'Submit overdue report first')+'</button>'
          :'<button class="btn good" data-ai-claim="1" data-id="'+esc(x.id)+'">'+(ar()?'استلام الفرصة':'Claim opportunity')+'</button>';
      }
    }else if(isManagement()&&!x.assigned_rep&&x.status!=='rejected'&&x.status!=='won'&&x.status!=='lost'){
      const options=['<option value="">'+(ar()?'اختر مندوباً':'Choose representative')+'</option>'].concat((state.profiles||[]).filter(r=>r.role==='rep').map(r=>'<option value="'+esc(r.id)+'">'+esc(r.full_name||r.username)+'</option>')).join('');
      actions='<div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center">'+
        (x.status==='new'?'<button class="btn good mini" data-id="'+esc(x.id)+'" data-ai-opp-status="reviewed">'+(ar()?'اعتماد':'Approve')+'</button>':'')+
        '<button class="btn secondary mini" data-id="'+esc(x.id)+'" data-ai-opp-status="rejected">'+(ar()?'رفض':'Reject')+'</button>'+
        '<select data-ai-opp-rep="'+esc(x.id)+'" style="max-width:220px">'+options+'</select>'+
        '<button class="btn mini" data-id="'+esc(x.id)+'" data-ai-opp-assign="1">'+(ar()?'إسناد للمندوب':'Assign')+'</button>'+
      '</div>';
    }

    const priorityBadge=priorityIndex?'<span class="badge b-info">'+(ar()?'أولوية التواصل #'+priorityIndex:'Contact priority #'+priorityIndex)+'</span>':'';
    const dueHtml=due
      ?'<div class="'+(due.overdue?'danger-note':due.done?'security-good':'notice')+'" style="margin:8px 0"><b>'+esc(due.text)+'</b>'+(x.report_due_at&&!due.done?'<div class="small" style="margin-top:4px">'+(ar()?'الموعد النهائي: ':'Deadline: ')+esc(dateTime(x.report_due_at))+'</div>':'')+'</div>'
      :'';

    return '<div class="card ai-opportunity-card" data-opportunity-id="'+esc(x.id)+'">'+
      '<div class="dashboard-head" style="margin-bottom:8px">'+
        '<div><b>'+esc(x.name)+'</b> <span class="badge b-gray">'+esc(typeLabel(x.opportunity_type))+'</span> '+(isManagement()?'<span class="badge '+(x.market_area==='central'?'b-good':'b-info')+'">'+(x.market_area==='central'?(ar()?'الوسطى':'Central'):(ar()?'خارج الوسطى':'Outside Central'))+'</span>':'')+'</div>'+
        '<div>'+priorityBadge+' <span class="badge '+gradeClass(x.grade)+'">'+esc(x.grade||'C')+' · '+Number(x.score||0)+'</span> <span class="badge '+verifyClass(x.verification_status)+'">'+esc(verifyLabel(x.verification_status))+'</span></div>'+
      '</div>'+
      '<div class="detail-grid">'+
        '<div><b>'+(ar()?'النشاط':'Activity')+'</b>'+esc(x.activity||'-')+'</div>'+
        '<div><b>'+(ar()?'المنطقة':'Region')+'</b>'+esc(x.administrative_region||'-')+'</div>'+
        '<div><b>'+(ar()?'المدينة':'City')+'</b>'+esc(x.city||'-')+'</div>'+
        '<div><b>'+(ar()?'الحي / الموقع':'District / location')+'</b>'+esc(x.district||x.address||'-')+'</div>'+
        '<div><b>'+(ar()?'مرحلة المشروع':'Project stage')+'</b>'+esc(x.project_stage||'-')+'</div>'+
        '<div><b>'+(ar()?'الشخص الأنسب للتواصل':'Best role to contact')+'</b>'+esc(fallbackRole(x))+'</div>'+
        '<div><b>'+(ar()?'اسم المسؤول المنشور':'Published contact name')+'</b>'+esc(contactName)+'</div>'+
        '<div><b>'+(ar()?'رقم التواصل المنشور':'Published contact number')+'</b>'+esc(contactPhone)+'</div>'+
        '<div><b>'+(ar()?'الحالة':'Status')+'</b>'+esc(statusLabel(x.status))+'</div>'+
        '<div><b>'+(ar()?'المندوب':'Representative')+'</b>'+esc(assignedName)+'</div>'+
        (x.claimed_at?'<div><b>'+(ar()?'وقت الاستلام':'Claimed at')+'</b>'+esc(dateTime(x.claimed_at))+'</div>':'')+
      '</div>'+
      '<div class="ai-intelligence-grid">'+
        '<div class="notice"><b>'+(ar()?'لماذا هذه أولوية الآن':'Why this is a priority now')+'</b><br>'+esc(x.priority_reason||x.recommendation_reason||'-')+'</div>'+
        '<div class="notice"><b>'+(ar()?'المقاول المرتبط':'Linked contractor')+'</b><br>'+esc(contractorName)+'<br><span class="small">'+esc(contractorPhone)+'</span>'+(contractorSrc?'<br><a href="'+esc(contractorSrc)+'" target="_blank" rel="noopener noreferrer">'+(ar()?'مصدر بيانات المقاول':'Contractor source')+'</a>':'')+'</div>'+
      '</div>'+
      '<div class="notice" style="margin:8px 0"><b>'+(ar()?'سبب الترشيح':'Why recommended')+'</b><br>'+esc(x.recommendation_reason||'-')+'</div>'+
      '<div style="margin-bottom:8px"><b>'+(ar()?'المنتجات المحتملة':'Suggested products')+'</b><div style="margin-top:4px">'+products+'</div></div>'+
      dueHtml+
      latestReportHtml(x)+
      '<div class="small" style="margin-top:8px">'+(src?'<a href="'+esc(src)+'" target="_blank" rel="noopener noreferrer">'+(ar()?'فتح المصدر':'Open source')+'</a>':'')+(web?' · <a href="'+esc(web)+'" target="_blank" rel="noopener noreferrer">'+(ar()?'موقع الجهة':'Company website')+'</a>':'')+'</div>'+
      (actions?'<div style="margin-top:10px">'+actions+'</div>':'')+
    '</div>';
  }

  async function loadOpportunityReports(){
    latestReports=new Map();
    const {data,error}=await sb.from('ai_opportunity_reports').select('id,opportunity_id,rep_id,responsible_phone,location_text,report_text,created_at').order('created_at',{ascending:false}).limit(1000);
    if(error){console.error('ai opportunity reports',error);return;}
    for(const r of(data||[]))if(!latestReports.has(r.opportunity_id))latestReports.set(r.opportunity_id,r);
  }

  async function loadOpportunities(){
    if(!canSee())return;
    ensureUi();
    const claimedList=document.getElementById('aiClaimedList'),availableList=document.getElementById('aiAvailableList');
    if(claimedList)claimedList.innerHTML='<div class="small">'+(ar()?'جاري التحميل...':'Loading...')+'</div>';
    if(availableList)availableList.innerHTML='<div class="small">'+(ar()?'جاري التحميل...':'Loading...')+'</div>';

    let q=sb.from('ai_opportunities').select('id,opportunity_type,name,activity,city,administrative_region,market_area,district,address,phone,website,contact_name,contact_role,recommended_contact_role,linked_contractor_name,linked_contractor_phone,linked_contractor_source_url,priority_reason,project_stage,suggested_products,score,grade,recommendation_reason,verification_status,confidence,source_name,source_url,source_published_at,discovered_at,last_verified_at,status,assigned_rep,claimed_at,report_due_at,last_report_at').order('score',{ascending:false}).order('discovered_at',{ascending:false}).limit(500);
    const st=document.getElementById('aiOppStatusFilter')?.value||'';if(st)q=q.eq('status',st);
    const ty=document.getElementById('aiOppTypeFilter')?.value||'';if(ty)q=q.eq('opportunity_type',ty);
    const gr=document.getElementById('aiOppGradeFilter')?.value||'';if(gr)q=q.eq('grade',gr);
    const area=document.getElementById('aiOppAreaFilter')?.value||'';if(area&&isManagement())q=q.eq('market_area',area);

    const results=await Promise.all([q,loadOpportunityReports()]);
    const data=results[0].data,error=results[0].error;
    if(error){
      const html='<div class="danger-note">'+esc(error.message)+'</div>';
      if(claimedList)claimedList.innerHTML=html;
      if(availableList)availableList.innerHTML=html;
      return;
    }

    const rows=data||[],rmap=repMap();
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
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&canSee())loadAll();});
  refreshTimer=setInterval(()=>{if(canSee())loadAll();},90000);
  window.addEventListener('beforeunload',()=>{if(refreshTimer)clearInterval(refreshTimer);});
  sync();
}

boot();
})();