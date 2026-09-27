(() => {
'use strict';

function boot(){
  const app=window.DANA_APP;
  if(!app){ setTimeout(boot,150); return; }
  const {sb,state,esc,dateTime,flash}=app;
  let refreshTimer=null;
  const ar=()=>app.getLang()==='ar';
  const isAdmin=()=>state.profile?.role==='admin';
  const safeUrl=v=>{if(!v)return '';try{const u=new URL(v);return (u.protocol==='https:'||u.protocol==='http:')?u.href:'';}catch(_){return '';}};

  const categoryLabel=v=>({
    search:ar()?'بحث عام':'Search',maps:ar()?'خرائط':'Maps',projects:ar()?'مشاريع':'Projects',
    tenders:ar()?'مناقصات':'Tenders',factories:ar()?'مصانع':'Factories',contractors:ar()?'مقاولين':'Contractors',
    social:ar()?'شبكات مهنية':'Professional networks',directories:ar()?'أدلة':'Directories',
    news:ar()?'أخبار':'News',other:ar()?'أخرى':'Other'
  }[v]||v||'-');
  const accessLabel=v=>({
    public:ar()?'عام ومفتوح':'Public',api:'API',account:ar()?'حساب':'Account',
    api_or_account:ar()?'API أو حساب':'API or account',manual:ar()?'يدوي':'Manual',
    unavailable:ar()?'غير متاح':'Unavailable',unknown:ar()?'غير محدد':'Unknown'
  }[v]||v||'-');
  const sourceStatusLabel=v=>({
    discovered:ar()?'مكتشف':'Discovered',ready:ar()?'متصل / جاهز':'Ready',
    needs_setup:ar()?'يحتاج إعداد':'Needs setup',blocked:ar()?'متوقف':'Blocked',disabled:ar()?'معطل':'Disabled'
  }[v]||v||'-');
  const sourceStatusClass=v=>v==='ready'?'b-good':v==='needs_setup'?'b-warn':v==='blocked'?'b-bad':'b-gray';
  const requestStatusLabel=v=>({
    pending:ar()?'بانتظارك':'Pending',account_created:ar()?'تم إنشاء الحساب':'Account created',
    login_ready:ar()?'جاهز للدخول':'Login ready',resolved:ar()?'تم الحل':'Resolved',ignored:ar()?'متجاهل':'Ignored'
  }[v]||v||'-');
  const reasonLabel=v=>({
    login_required:ar()?'يحتاج تسجيل دخول':'Login required',subscription_required:ar()?'يحتاج اشتراك':'Subscription required',
    mfa_required:ar()?'يحتاج رمز تحقق':'Verification required',captcha:ar()?'يوجد CAPTCHA':'CAPTCHA present',
    automation_restricted:ar()?'الأتمتة غير مسموحة':'Automation restricted',other:ar()?'سبب آخر':'Other reason'
  }[v]||v||'-');
  const yesNo=v=>v===true?(ar()?'نعم':'Yes'):v===false?(ar()?'لا':'No'):'-';

  function removeUi(){
    document.getElementById('aiSourcesNav')?.remove();
    document.getElementById('aiSourcesPage')?.remove();
    document.getElementById('aiAccessAlert')?.remove();
  }

  function openPage(){
    if(!isAdmin())return;
    app.gotoPage('aiSourcesPage');
    const pt=document.getElementById('pageTitle');
    if(pt)pt.textContent=ar()?'مصادر البحث':'Search Sources';
    loadAll();
  }

  function ensureUi(){
    if(!isAdmin()){ removeUi(); return; }
    const oldAccess=document.getElementById('aiAccessNav'); if(oldAccess)oldAccess.remove();
    const oldPage=document.getElementById('aiAccessRequests'); if(oldPage)oldPage.remove();

    const navGrid=document.querySelector('.nav-grid');
    if(navGrid && !document.getElementById('aiSourcesNav')){
      const btn=document.createElement('button');
      btn.id='aiSourcesNav'; btn.type='button'; btn.dataset.page='aiSourcesPage';
      btn.addEventListener('click',openPage);
      const accountBtn=navGrid.querySelector('[data-page="account"]');
      navGrid.insertBefore(btn,accountBtn||null);
    }

    const main=document.querySelector('main');
    if(main && !document.getElementById('aiSourcesPage')){
      const section=document.createElement('section');
      section.id='aiSourcesPage'; section.className='section';
      section.innerHTML=`
        <div class="card" style="margin-bottom:14px">
          <div class="dashboard-head">
            <div><h3 id="aiSourcesHeading"></h3><div class="small" id="aiSourcesHelp"></div></div>
            <button class="btn secondary" id="aiSourcesRefresh" type="button"></button>
          </div>
        </div>
        <div class="grid cards" id="aiSourcesSummary" style="margin-bottom:14px"></div>
        <div class="card" style="margin-bottom:14px">
          <div class="dashboard-head"><h3 id="aiSourceRegistryTitle"></h3><select id="aiSourcesStatusFilter"><option value=""></option><option value="ready"></option><option value="needs_setup"></option><option value="blocked"></option><option value="discovered"></option><option value="disabled"></option></select></div>
          <div id="aiSourcesList"></div>
        </div>
        <div class="card">
          <div class="dashboard-head"><div><h3 id="aiAccessHeading"></h3><div class="small" id="aiAccessHelp"></div></div><span class="badge b-warn" id="aiAccessCount">0</span></div>
          <div id="aiAccessList"></div>
        </div>`;
      main.appendChild(section);
      section.querySelector('#aiSourcesRefresh')?.addEventListener('click',loadAll);
      section.querySelector('#aiSourcesStatusFilter')?.addEventListener('change',loadSources);
      section.addEventListener('click',async e=>{
        let b=e.target.closest('[data-ai-source-toggle]');
        if(b){
          const id=b.dataset.id,enabled=b.dataset.aiSourceToggle==='1';
          b.disabled=true;
          const {error}=await sb.from('ai_sources').update({enabled,status:enabled?'discovered':'disabled',updated_at:new Date().toISOString()}).eq('id',id);
          b.disabled=false;
          if(error)return flash((ar()?'تعذر تحديث المصدر: ':'Could not update source: ')+error.message,true);
          flash(ar()?'تم تحديث المصدر':'Source updated');
          return loadSources();
        }
        b=e.target.closest('[data-ai-access-status]');
        if(b){
          const id=b.dataset.id,status=b.dataset.aiAccessStatus;
          b.disabled=true;
          const patch={status,updated_at:new Date().toISOString()};
          if(status==='resolved'||status==='ignored')patch.resolved_at=new Date().toISOString();
          const {error}=await sb.from('ai_source_access_requests').update(patch).eq('id',id);
          b.disabled=false;
          if(error)return flash((ar()?'تعذر تحديث الطلب: ':'Could not update request: ')+error.message,true);
          flash(ar()?'تم تحديث طلب الوصول':'Access request updated');
          return loadRequests();
        }
      });
    }
    updateLabels();
  }

  function updateLabels(){
    const nav=document.getElementById('aiSourcesNav');if(nav)nav.textContent=ar()?'مصادر البحث':'Search Sources';
    const h=document.getElementById('aiSourcesHeading');if(h)h.textContent=ar()?'مصادر البحث وطلبات الوصول':'Search Sources & Access Requests';
    const help=document.getElementById('aiSourcesHelp');if(help)help.textContent=ar()?'إدارة كل مصادر البحث وأي منصة تحتاج حساب أو API أو اشتراك من صفحة واحدة.':'Manage all search sources and any source that needs an account, API, or subscription from one page.';
    const reg=document.getElementById('aiSourceRegistryTitle');if(reg)reg.textContent=ar()?'المصادر':'Sources';
    const ah=document.getElementById('aiAccessHeading');if(ah)ah.textContent=ar()?'طلبات الوصول':'Access Requests';
    const ahelp=document.getElementById('aiAccessHelp');if(ahelp)ahelp.textContent=ar()?'إذا تعذر على النظام الوصول إلى مصدر، يظهر هنا المطلوب منك بالضبط.':'If the system cannot access a source, the required action appears here.';
    const r=document.getElementById('aiSourcesRefresh');if(r)r.textContent=ar()?'تحديث':'Refresh';
    const f=document.getElementById('aiSourcesStatusFilter');
    if(f){
      const labels={'':ar()?'كل الحالات':'All statuses',ready:sourceStatusLabel('ready'),needs_setup:sourceStatusLabel('needs_setup'),blocked:sourceStatusLabel('blocked'),discovered:sourceStatusLabel('discovered'),disabled:sourceStatusLabel('disabled')};
      [...f.options].forEach(o=>o.textContent=labels[o.value]||o.value);
    }
  }

  function renderSummary(rows,pending){
    const el=document.getElementById('aiSourcesSummary');if(!el)return;
    const cards=[
      [ar()?'إجمالي المصادر':'Total sources',rows.length],
      [ar()?'جاهز':'Ready',rows.filter(x=>x.status==='ready'&&x.enabled).length],
      [ar()?'يحتاج إعداد':'Needs setup',rows.filter(x=>x.status==='needs_setup').length],
      [ar()?'طلبات وصول':'Access requests',pending]
    ];
    el.innerHTML=cards.map(([l,n])=>`<div class="card metric-card"><div class="label">${esc(l)}</div><div class="metric">${Number(n)}</div></div>`).join('');
  }

  async function loadSources(){
    if(!isAdmin())return [];
    ensureUi();
    const list=document.getElementById('aiSourcesList');
    if(list)list.innerHTML=`<div class="small">${ar()?'جاري التحميل...':'Loading...'}</div>`;
    let q=sb.from('ai_sources').select('id,source_name,source_url,category,access_method,status,api_available,login_required,subscription_required,automation_policy,enabled,priority,required_action,notes,last_checked_at,last_success_at,last_error,discovered_at,updated_at').order('priority',{ascending:false}).order('updated_at',{ascending:false}).limit(500);
    const filter=document.getElementById('aiSourcesStatusFilter')?.value||''; if(filter)q=q.eq('status',filter);
    const {data,error}=await q;
    if(error){if(list)list.innerHTML=`<div class="danger-note">${esc(error.message)}</div>`;return [];}
    const rows=data||[];
    if(list)list.innerHTML=rows.length?rows.map(x=>{
      const url=safeUrl(x.source_url);
      const policy=x.automation_policy==='allowed'?(ar()?'مسموحة':'Allowed'):x.automation_policy==='restricted'?(ar()?'مقيدة':'Restricted'):(ar()?'غير محددة':'Unknown');
      return `<div style="padding:12px 0;border-bottom:1px solid var(--line)">
        <div class="dashboard-head" style="margin-bottom:8px"><div><b>${esc(x.source_name)}</b>${url?` <a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="small">${ar()?'فتح المصدر':'Open source'}</a>`:''}</div><span class="badge ${sourceStatusClass(x.status)}">${esc(sourceStatusLabel(x.status))}</span></div>
        <div class="detail-grid">
          <div><b>${ar()?'الفئة':'Category'}</b>${esc(categoryLabel(x.category))}</div><div><b>${ar()?'طريقة الوصول':'Access'}</b>${esc(accessLabel(x.access_method))}</div>
          <div><b>API</b>${esc(yesNo(x.api_available))}</div><div><b>${ar()?'يحتاج حساب':'Login required'}</b>${esc(yesNo(x.login_required))}</div>
          <div><b>${ar()?'يحتاج اشتراك':'Subscription required'}</b>${esc(yesNo(x.subscription_required))}</div><div><b>${ar()?'الأتمتة':'Automation'}</b>${esc(policy)}</div>
          <div><b>${ar()?'آخر فحص':'Last checked'}</b>${esc(dateTime(x.last_checked_at))}</div><div><b>${ar()?'آخر نجاح':'Last success'}</b>${esc(dateTime(x.last_success_at))}</div>
        </div>
        ${x.required_action?`<div class="notice" style="margin-top:8px"><b>${ar()?'المطلوب منك':'Required from you'}</b><br>${esc(x.required_action)}</div>`:''}
        ${x.last_error?`<div class="danger-note" style="margin-top:8px">${esc(x.last_error)}</div>`:''}
        <div style="margin-top:8px"><button class="btn secondary mini" data-id="${esc(x.id)}" data-ai-source-toggle="${x.enabled?'0':'1'}">${x.enabled?(ar()?'تعطيل المصدر':'Disable source'):(ar()?'تفعيل المصدر':'Enable source')}</button></div>
      </div>`;
    }).join(''):`<div class="empty">${ar()?'لا توجد مصادر بهذه الحالة.':'No sources in this state.'}</div>`;
    return rows;
  }

  function renderAlert(pending){
    const dash=document.getElementById('dashboard'); if(!dash)return;
    let box=document.getElementById('aiAccessAlert');
    if(!pending){box?.remove();return;}
    if(!box){
      box=document.createElement('div');box.id='aiAccessAlert';box.className='card';box.style.marginTop='14px';box.style.cursor='pointer';box.addEventListener('click',openPage);
      const cards=dash.querySelector('.dashboard-cards');if(cards)cards.insertAdjacentElement('afterend',box);else dash.prepend(box);
    }
    box.innerHTML=`<b>${ar()?'الـAI يحتاج تدخلك':'AI needs your action'}</b><div class="small" style="margin-top:6px">${ar()?`لديك ${pending} طلب وصول بانتظارك.`:`${pending} access request(s) waiting.`}</div>`;
  }

  async function loadRequests(){
    if(!isAdmin())return 0;
    const list=document.getElementById('aiAccessList');
    const {data,error}=await sb.from('ai_source_access_requests').select('id,source_name,source_url,discovered_reason,block_reason,required_action,status,priority,notes,discovered_at,updated_at').order('discovered_at',{ascending:false}).limit(200);
    if(error){if(list)list.innerHTML=`<div class="danger-note">${esc(error.message)}</div>`;return 0;}
    const rows=data||[],pending=rows.filter(x=>['pending','account_created','login_ready'].includes(x.status)).length;
    const count=document.getElementById('aiAccessCount');if(count)count.textContent=String(pending);
    renderAlert(pending);
    if(list)list.innerHTML=rows.length?rows.map(x=>{
      const url=safeUrl(x.source_url);
      const actions=['pending','account_created','login_ready'].includes(x.status)?`<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px">
        ${x.status==='pending'?`<button class="btn secondary mini" data-id="${esc(x.id)}" data-ai-access-status="account_created">${ar()?'تم إنشاء الحساب':'Account created'}</button>`:''}
        ${x.status!=='login_ready'?`<button class="btn secondary mini" data-id="${esc(x.id)}" data-ai-access-status="login_ready">${ar()?'الوصول جاهز':'Access ready'}</button>`:''}
        <button class="btn good mini" data-id="${esc(x.id)}" data-ai-access-status="resolved">${ar()?'تم الحل':'Resolved'}</button>
        <button class="btn secondary mini" data-id="${esc(x.id)}" data-ai-access-status="ignored">${ar()?'تجاهل':'Ignore'}</button>
      </div>`:'';
      return `<div style="padding:12px 0;border-bottom:1px solid var(--line)">
        <div class="dashboard-head"><div><b>${esc(x.source_name)}</b>${url?` <a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="small">${ar()?'فتح المنصة':'Open source'}</a>`:''}</div><span class="badge ${x.priority==='urgent'?'b-bad':x.priority==='high'?'b-warn':'b-gray'}">${esc(requestStatusLabel(x.status))}</span></div>
        <div class="detail-grid"><div><b>${ar()?'سبب التوقف':'Block reason'}</b>${esc(reasonLabel(x.block_reason))}</div><div><b>${ar()?'اكتُشف':'Discovered'}</b>${esc(dateTime(x.discovered_at))}</div></div>
        <div class="notice" style="margin-top:8px"><b>${ar()?'المطلوب منك':'Required from you'}</b><br>${esc(x.required_action||'-')}</div>
        ${actions}
      </div>`;
    }).join(''):`<div class="empty">${ar()?'لا توجد طلبات وصول حالياً.':'No access requests right now.'}</div>`;
    return pending;
  }

  async function loadAll(){
    ensureUi();
    const rows=await loadSources();
    const pending=await loadRequests();
    renderSummary(rows,pending);
  }
  function sync(){ensureUi();if(isAdmin())loadAll();}
  window.addEventListener('dana:render',sync);
  sb.auth.onAuthStateChange((_event,session)=>{if(!session)removeUi();else setTimeout(sync,0);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&isAdmin())loadAll();});
  refreshTimer=setInterval(()=>{if(isAdmin())loadAll();},90000);
  window.addEventListener('beforeunload',()=>{if(refreshTimer)clearInterval(refreshTimer);});
  sync();
}

boot();
})();