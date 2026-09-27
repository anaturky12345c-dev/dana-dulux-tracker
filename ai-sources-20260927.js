(() => {
'use strict';

function boot(){
  const app=window.DANA_APP;
  if(!app){ setTimeout(boot,150); return; }
  const {sb,state,esc,dateTime,flash}=app;
  let refreshTimer=null;
  const ar=()=>app.getLang()==='ar';
  const isPrimaryAdmin=()=>state.profile?.role==='admin' && state.profile?.username==='admin';
  const safeUrl=v=>{if(!v)return '';try{const u=new URL(v);return (u.protocol==='https:'||u.protocol==='http:')?u.href:'';}catch(_){return '';}};

  const categoryLabel=v=>({
    search:ar()?'بحث عام':'Search',maps:ar()?'خرائط':'Maps',projects:ar()?'مشاريع':'Projects',tenders:ar()?'مناقصات':'Tenders',factories:ar()?'مصانع':'Factories',contractors:ar()?'مقاولين':'Contractors',social:ar()?'شبكات مهنية':'Professional networks',directories:ar()?'أدلة':'Directories',news:ar()?'أخبار':'News',other:ar()?'أخرى':'Other'
  }[v]||v||'-');
  const accessLabel=v=>({
    public:ar()?'عام ومفتوح':'Public',api:'API',account:ar()?'حساب':'Account',api_or_account:ar()?'API أو حساب':'API or account',manual:ar()?'يدوي':'Manual',unavailable:ar()?'غير متاح':'Unavailable',unknown:ar()?'غير محدد':'Unknown'
  }[v]||v||'-');
  const statusLabel=v=>({
    discovered:ar()?'مكتشف':'Discovered',ready:ar()?'متصل / جاهز':'Ready',needs_setup:ar()?'يحتاج إعداد':'Needs setup',blocked:ar()?'متوقف':'Blocked',disabled:ar()?'معطل':'Disabled'
  }[v]||v||'-');
  const statusClass=v=>v==='ready'?'b-good':v==='needs_setup'?'b-warn':v==='blocked'?'b-bad':'b-gray';
  const yesNo=v=>v===true?(ar()?'نعم':'Yes'):v===false?(ar()?'لا':'No'):'-';

  function removeUi(){
    document.getElementById('aiSourcesNav')?.remove();
    document.getElementById('aiSourcesPage')?.remove();
  }

  function openPage(){
    if(!isPrimaryAdmin())return;
    app.gotoPage('aiSourcesPage');
    const pt=document.getElementById('pageTitle');
    if(pt)pt.textContent=ar()?'مصادر البحث':'Search Sources';
    loadSources();
  }

  function ensureUi(){
    if(!isPrimaryAdmin()){ removeUi(); return; }
    const navGrid=document.querySelector('.nav-grid');
    if(navGrid && !document.getElementById('aiSourcesNav')){
      const btn=document.createElement('button');
      btn.id='aiSourcesNav';
      btn.type='button';
      btn.dataset.page='aiSourcesPage';
      btn.textContent=ar()?'مصادر البحث':'Search Sources';
      btn.addEventListener('click',openPage);
      const aiAccess=document.getElementById('aiAccessNav');
      const accountBtn=navGrid.querySelector('[data-page="account"]');
      navGrid.insertBefore(btn,aiAccess||accountBtn||null);
    }
    const main=document.querySelector('main');
    if(main && !document.getElementById('aiSourcesPage')){
      const section=document.createElement('section');
      section.id='aiSourcesPage';
      section.className='section';
      section.innerHTML=`
        <div class="card" style="margin-bottom:14px">
          <div class="dashboard-head">
            <div><h3 id="aiSourcesHeading"></h3><div class="small" id="aiSourcesHelp"></div></div>
            <button class="btn secondary" id="aiSourcesRefresh" type="button"></button>
          </div>
        </div>
        <div class="grid cards" id="aiSourcesSummary" style="margin-bottom:14px"></div>
        <div class="toolbar" style="margin-bottom:10px">
          <select id="aiSourcesStatusFilter">
            <option value=""></option>
            <option value="ready"></option>
            <option value="needs_setup"></option>
            <option value="blocked"></option>
            <option value="discovered"></option>
            <option value="disabled"></option>
          </select>
        </div>
        <div id="aiSourcesList"></div>`;
      main.appendChild(section);
      section.querySelector('#aiSourcesRefresh')?.addEventListener('click',loadSources);
      section.querySelector('#aiSourcesStatusFilter')?.addEventListener('change',loadSources);
      section.addEventListener('click',async e=>{
        const b=e.target.closest('[data-ai-source-toggle]');
        if(!b)return;
        const id=b.dataset.id;
        const enabled=b.dataset.aiSourceToggle==='1';
        b.disabled=true;
        const patch={enabled,status:enabled?'discovered':'disabled',updated_at:new Date().toISOString()};
        const {error}=await sb.from('ai_sources').update(patch).eq('id',id);
        b.disabled=false;
        if(error)return flash((ar()?'تعذر تحديث المصدر: ':'Could not update source: ')+error.message,true);
        flash(ar()?'تم تحديث المصدر':'Source updated');
        await loadSources();
      });
    }
    updateLabels();
  }

  function updateLabels(){
    const nav=document.getElementById('aiSourcesNav');if(nav)nav.textContent=ar()?'مصادر البحث':'Search Sources';
    const h=document.getElementById('aiSourcesHeading');if(h)h.textContent=ar()?'مصادر البحث':'Search Sources';
    const help=document.getElementById('aiSourcesHelp');if(help)help.textContent=ar()?'كل منصة يكتشفها النظام تظهر هنا مع طريقة الوصول، حالتها، وهل تحتاج منك حساباً أو API أو اشتراكاً.':'Every discovered source appears here with its access method, status, and whether an account, API, or subscription is needed.';
    const r=document.getElementById('aiSourcesRefresh');if(r)r.textContent=ar()?'تحديث':'Refresh';
    const f=document.getElementById('aiSourcesStatusFilter');
    if(f){
      const labels={'':ar()?'كل الحالات':'All statuses',ready:statusLabel('ready'),needs_setup:statusLabel('needs_setup'),blocked:statusLabel('blocked'),discovered:statusLabel('discovered'),disabled:statusLabel('disabled')};
      [...f.options].forEach(o=>o.textContent=labels[o.value]||o.value);
    }
  }

  function renderSummary(rows){
    const el=document.getElementById('aiSourcesSummary');if(!el)return;
    const cards=[
      [ar()?'إجمالي المصادر':'Total sources',rows.length],
      [ar()?'جاهز':'Ready',rows.filter(x=>x.status==='ready'&&x.enabled).length],
      [ar()?'يحتاج إعداد':'Needs setup',rows.filter(x=>x.status==='needs_setup').length],
      [ar()?'متوقف':'Blocked',rows.filter(x=>x.status==='blocked').length]
    ];
    el.innerHTML=cards.map(([l,n])=>`<div class="card metric-card"><div class="label">${esc(l)}</div><div class="metric">${Number(n)}</div></div>`).join('');
  }

  async function loadSources(){
    if(!isPrimaryAdmin())return;
    ensureUi();
    const list=document.getElementById('aiSourcesList');
    if(list)list.innerHTML=`<div class="card"><div class="small">${ar()?'جاري التحميل...':'Loading...'}</div></div>`;
    let q=sb.from('ai_sources').select('id,source_name,source_url,category,access_method,status,api_available,login_required,subscription_required,automation_policy,enabled,priority,required_action,notes,last_checked_at,last_success_at,last_error,discovered_at,updated_at').order('priority',{ascending:false}).order('updated_at',{ascending:false}).limit(500);
    const filter=document.getElementById('aiSourcesStatusFilter')?.value||'';
    if(filter)q=q.eq('status',filter);
    const {data,error}=await q;
    if(error){if(list)list.innerHTML=`<div class="card"><div class="danger-note">${esc(error.message)}</div></div>`;return;}
    const rows=data||[];
    renderSummary(rows);
    if(!list)return;
    if(!rows.length){list.innerHTML=`<div class="card"><div class="empty">${ar()?'لا توجد مصادر بهذه الحالة حالياً.':'No sources in this state yet.'}</div></div>`;return;}
    list.innerHTML=rows.map(x=>{
      const url=safeUrl(x.source_url);
      const policy=x.automation_policy==='allowed'?(ar()?'مسموحة':'Allowed'):x.automation_policy==='restricted'?(ar()?'مقيدة':'Restricted'):(ar()?'غير محددة':'Unknown');
      return `<div class="card" style="margin-bottom:10px">
        <div class="dashboard-head" style="margin-bottom:8px">
          <div><b>${esc(x.source_name)}</b>${url?` <a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="small">${ar()?'فتح المصدر':'Open source'}</a>`:''}</div>
          <span class="badge ${statusClass(x.status)}">${esc(statusLabel(x.status))}</span>
        </div>
        <div class="detail-grid" style="margin-bottom:8px">
          <div><b>${ar()?'الفئة':'Category'}</b>${esc(categoryLabel(x.category))}</div>
          <div><b>${ar()?'طريقة الوصول':'Access'}</b>${esc(accessLabel(x.access_method))}</div>
          <div><b>API</b>${esc(yesNo(x.api_available))}</div>
          <div><b>${ar()?'يحتاج حساب':'Login required'}</b>${esc(yesNo(x.login_required))}</div>
          <div><b>${ar()?'يحتاج اشتراك':'Subscription required'}</b>${esc(yesNo(x.subscription_required))}</div>
          <div><b>${ar()?'الأتمتة':'Automation'}</b>${esc(policy)}</div>
          <div><b>${ar()?'آخر فحص':'Last checked'}</b>${esc(dateTime(x.last_checked_at))}</div>
          <div><b>${ar()?'آخر نجاح':'Last success'}</b>${esc(dateTime(x.last_success_at))}</div>
        </div>
        ${x.required_action?`<div class="notice" style="margin-bottom:8px"><b>${ar()?'المطلوب منك':'Required from you'}</b><br>${esc(x.required_action)}</div>`:''}
        ${x.last_error?`<div class="danger-note" style="margin-bottom:8px">${esc(x.last_error)}</div>`:''}
        ${x.notes?`<div class="small" style="margin-bottom:8px">${esc(x.notes)}</div>`:''}
        <button class="btn secondary mini" data-id="${esc(x.id)}" data-ai-source-toggle="${x.enabled?'0':'1'}">${x.enabled?(ar()?'تعطيل المصدر':'Disable source'):(ar()?'تفعيل المصدر':'Enable source')}</button>
      </div>`;
    }).join('');
  }

  function sync(){ensureUi();if(isPrimaryAdmin())loadSources();}
  window.addEventListener('dana:render',sync);
  sb.auth.onAuthStateChange((_event,session)=>{if(!session)removeUi();else setTimeout(sync,0);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&isPrimaryAdmin())loadSources();});
  refreshTimer=setInterval(()=>{if(isPrimaryAdmin())loadSources();},90000);
  window.addEventListener('beforeunload',()=>{if(refreshTimer)clearInterval(refreshTimer);});
  sync();
}

boot();
})();