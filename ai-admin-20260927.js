(() => {
'use strict';

function boot(){
  const app=window.DANA_APP;
  if(!app){ setTimeout(boot,150); return; }
  const {sb,state,esc,dateTime,flash}=app;
  let refreshTimer=null;

  const ar=()=>app.getLang()==='ar';
  const isPrimaryAdmin=()=>state.profile?.role==='admin' && state.profile?.username==='admin';
  const safeUrl=v=>{
    if(!v)return '';
    try{const u=new URL(v);return (u.protocol==='https:'||u.protocol==='http:')?u.href:'';}catch(_){return '';}
  };
  const reasonLabel=v=>({
    login_required:ar()?'يحتاج تسجيل دخول':'Login required',
    subscription_required:ar()?'يحتاج اشتراك':'Subscription required',
    mfa_required:ar()?'يحتاج رمز تحقق':'Verification required',
    captcha:ar()?'يوجد CAPTCHA':'CAPTCHA present',
    automation_restricted:ar()?'الأتمتة غير مسموحة':'Automation restricted',
    other:ar()?'سبب آخر':'Other reason'
  }[v]||v||'-');
  const statusLabel=v=>({
    pending:ar()?'بانتظارك':'Pending',
    account_created:ar()?'تم إنشاء الحساب':'Account created',
    login_ready:ar()?'جاهز للدخول':'Login ready',
    resolved:ar()?'مغلق':'Resolved',
    ignored:ar()?'متجاهل':'Ignored'
  }[v]||v||'-');
  const priorityLabel=v=>({normal:ar()?'عادي':'Normal',high:ar()?'مهم':'High',urgent:ar()?'عاجل':'Urgent'}[v]||v||'-');

  function removeUi(){
    document.getElementById('aiAccessNav')?.remove();
    document.getElementById('aiAccessRequests')?.remove();
    document.getElementById('aiAccessAlert')?.remove();
  }

  function openPage(){
    if(!isPrimaryAdmin())return;
    app.gotoPage('aiAccessRequests');
    const pt=document.getElementById('pageTitle');
    if(pt)pt.textContent=ar()?'طلبات وصول AI':'AI Access Requests';
    loadRequests();
  }

  function ensureUi(){
    if(!isPrimaryAdmin()){ removeUi(); return; }
    const navGrid=document.querySelector('.nav-grid');
    if(navGrid && !document.getElementById('aiAccessNav')){
      const btn=document.createElement('button');
      btn.id='aiAccessNav';
      btn.type='button';
      btn.dataset.page='aiAccessRequests';
      btn.textContent=ar()?'طلبات وصول AI':'AI Access Requests';
      btn.addEventListener('click',openPage);
      const accountBtn=navGrid.querySelector('[data-page="account"]');
      navGrid.insertBefore(btn,accountBtn||null);
    }
    const main=document.querySelector('main');
    if(main && !document.getElementById('aiAccessRequests')){
      const section=document.createElement('section');
      section.id='aiAccessRequests';
      section.className='section';
      section.innerHTML=`
        <div class="card" style="margin-bottom:14px">
          <div class="dashboard-head">
            <div>
              <h3 id="aiAccessHeading"></h3>
              <div class="small" id="aiAccessHelp"></div>
            </div>
            <button class="btn secondary" id="aiAccessRefresh" type="button"></button>
          </div>
        </div>
        <div id="aiAccessList"></div>`;
      main.appendChild(section);
      section.querySelector('#aiAccessRefresh')?.addEventListener('click',loadRequests);
      section.addEventListener('click',async e=>{
        const b=e.target.closest('[data-ai-access-status]');
        if(!b)return;
        const id=b.dataset.id,status=b.dataset.aiAccessStatus;
        b.disabled=true;
        const patch={status,updated_at:new Date().toISOString()};
        if(status==='resolved'||status==='ignored')patch.resolved_at=new Date().toISOString();
        const {error}=await sb.from('ai_source_access_requests').update(patch).eq('id',id);
        b.disabled=false;
        if(error)return flash((ar()?'تعذر تحديث الطلب: ':'Could not update request: ')+error.message,true);
        flash(ar()?'تم تحديث الطلب':'Request updated');
        await loadRequests();
      });
    }
    updateLabels();
  }

  function updateLabels(){
    const nav=document.getElementById('aiAccessNav');
    if(nav&&!nav.dataset.count)nav.textContent=ar()?'طلبات وصول AI':'AI Access Requests';
    const h=document.getElementById('aiAccessHeading');if(h)h.textContent=ar()?'طلبات وصول الـAI':'AI Access Requests';
    const help=document.getElementById('aiAccessHelp');if(help)help.textContent=ar()?'أي منصة يكتشفها الـAI ولا يستطيع الدخول إليها ستظهر هنا مع السبب والمطلوب منك.':'Any source the AI discovers but cannot access will appear here with the reason and required action.';
    const r=document.getElementById('aiAccessRefresh');if(r)r.textContent=ar()?'تحديث':'Refresh';
  }

  function renderAlert(pending){
    const dash=document.getElementById('dashboard');
    if(!dash)return;
    let box=document.getElementById('aiAccessAlert');
    if(!pending){box?.remove();return;}
    if(!box){
      box=document.createElement('div');
      box.id='aiAccessAlert';
      box.className='card';
      box.style.marginTop='14px';
      box.style.cursor='pointer';
      box.addEventListener('click',openPage);
      const cards=dash.querySelector('.dashboard-cards');
      if(cards)cards.insertAdjacentElement('afterend',box);else dash.prepend(box);
    }
    box.innerHTML=`<b>${ar()?'الـAI يحتاج تدخلك':'AI needs your action'}</b><div class="small" style="margin-top:6px">${ar()?`لديك ${pending} طلب وصول بانتظارك.`:`You have ${pending} access request${pending===1?'':'s'} waiting.`}</div>`;
  }

  async function loadRequests(){
    if(!isPrimaryAdmin())return;
    ensureUi();
    const list=document.getElementById('aiAccessList');
    if(list)list.innerHTML=`<div class="card"><div class="small">${ar()?'جاري التحميل...':'Loading...'}</div></div>`;
    const {data,error}=await sb.from('ai_source_access_requests')
      .select('id,source_name,source_url,discovered_reason,block_reason,required_action,status,priority,notes,discovered_at,updated_at')
      .order('discovered_at',{ascending:false})
      .limit(200);
    if(error){
      if(list)list.innerHTML=`<div class="card"><div class="danger-note">${esc(error.message)}</div></div>`;
      return;
    }
    const rows=data||[];
    const pending=rows.filter(x=>x.status==='pending'||x.status==='account_created'||x.status==='login_ready').length;
    const nav=document.getElementById('aiAccessNav');
    if(nav){nav.dataset.count=String(pending);nav.textContent=(ar()?'طلبات وصول AI':'AI Access Requests')+(pending?` (${pending})`:'');}
    renderAlert(pending);
    if(!list)return;
    if(!rows.length){list.innerHTML=`<div class="card"><div class="empty">${ar()?'لا توجد طلبات وصول حالياً.':'No access requests right now.'}</div></div>`;return;}
    list.innerHTML=rows.map(x=>{
      const url=safeUrl(x.source_url);
      const actions=(x.status==='pending'||x.status==='account_created'||x.status==='login_ready')?`<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px">
        ${x.status==='pending'?`<button class="btn secondary mini" data-id="${esc(x.id)}" data-ai-access-status="account_created">${ar()?'تم إنشاء الحساب':'Account created'}</button>`:''}
        ${x.status!=='login_ready'?`<button class="btn secondary mini" data-id="${esc(x.id)}" data-ai-access-status="login_ready">${ar()?'الوصول جاهز':'Access ready'}</button>`:''}
        <button class="btn good mini" data-id="${esc(x.id)}" data-ai-access-status="resolved">${ar()?'تم الحل':'Resolved'}</button>
        <button class="btn secondary mini" data-id="${esc(x.id)}" data-ai-access-status="ignored">${ar()?'تجاهل':'Ignore'}</button>
      </div>`:'';
      return `<div class="card" style="margin-bottom:10px">
        <div class="dashboard-head" style="margin-bottom:8px"><div><b>${esc(x.source_name)}</b>${url?` <a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="small">${ar()?'فتح المنصة':'Open source'}</a>`:''}</div><span class="badge ${x.priority==='urgent'?'b-bad':x.priority==='high'?'b-warn':'b-gray'}">${esc(priorityLabel(x.priority))}</span></div>
        <div class="detail-grid" style="margin-bottom:8px">
          <div><b>${ar()?'سبب التوقف':'Block reason'}</b>${esc(reasonLabel(x.block_reason))}</div>
          <div><b>${ar()?'الحالة':'Status'}</b>${esc(statusLabel(x.status))}</div>
          <div><b>${ar()?'اكتُشف':'Discovered'}</b>${esc(dateTime(x.discovered_at))}</div>
        </div>
        <div class="notice" style="margin-bottom:8px"><b>${ar()?'المطلوب منك':'Required from you'}</b><br>${esc(x.required_action||'-')}</div>
        ${x.discovered_reason?`<div class="small"><b>${ar()?'لماذا اعتبرها مهمة؟':'Why it matters:'}</b> ${esc(x.discovered_reason)}</div>`:''}
        ${x.notes?`<div class="small" style="margin-top:6px"><b>${ar()?'ملاحظات':'Notes'}:</b> ${esc(x.notes)}</div>`:''}
        ${actions}
      </div>`;
    }).join('');
  }

  function sync(){
    ensureUi();
    if(isPrimaryAdmin())loadRequests();
  }

  window.addEventListener('dana:render',sync);
  sb.auth.onAuthStateChange((_event,session)=>{if(!session)removeUi();else setTimeout(sync,0);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&isPrimaryAdmin())loadRequests();});
  refreshTimer=setInterval(()=>{if(isPrimaryAdmin())loadRequests();},60000);
  window.addEventListener('beforeunload',()=>{if(refreshTimer)clearInterval(refreshTimer);});
  sync();
}

boot();
})();