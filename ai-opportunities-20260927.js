(() => {
'use strict';

function boot(){
  const app=window.DANA_APP;
  if(!app){ setTimeout(boot,150); return; }
  const {sb,state,esc,dateTime,flash}=app;
  let refreshTimer=null;
  let reps=[];
  const ar=()=>app.getLang()==='ar';
  const isPrimaryAdmin=()=>state.profile?.role==='admin' && state.profile?.username==='admin';
  const safeUrl=v=>{if(!v)return '';try{const u=new URL(v);return (u.protocol==='https:'||u.protocol==='http:')?u.href:'';}catch(_){return '';}};
  const typeLabel=v=>({factory:ar()?'مصنع':'Factory',project:ar()?'مشروع':'Project',contractor:ar()?'شركة مقاولات':'Contractor'}[v]||v||'-');
  const statusLabel=v=>({new:ar()?'جديدة':'New',reviewed:ar()?'معتمدة':'Reviewed',assigned:ar()?'مسندة':'Assigned',rejected:ar()?'مرفوضة':'Rejected',won:ar()?'تم كسبها':'Won',lost:ar()?'مفقودة':'Lost'}[v]||v||'-');
  const verifyLabel=v=>({verified:ar()?'مؤكدة':'Verified',partial:ar()?'جزئية':'Partial',unverified:ar()?'غير مؤكدة':'Unverified'}[v]||v||'-');
  const gradeClass=v=>v==='A'?'b-good':v==='B'?'b-warn':'b-gray';
  const verifyClass=v=>v==='verified'?'b-good':v==='partial'?'b-warn':'b-gray';

  function removeUi(){
    document.getElementById('aiOppNav')?.remove();
    document.getElementById('aiOppPage')?.remove();
  }

  function openPage(){
    if(!isPrimaryAdmin())return;
    app.gotoPage('aiOppPage');
    const pt=document.getElementById('pageTitle');
    if(pt)pt.textContent=ar()?'فرص AI':'AI Opportunities';
    loadAll();
  }

  function ensureUi(){
    if(!isPrimaryAdmin()){ removeUi(); return; }
    const navGrid=document.querySelector('.nav-grid');
    if(navGrid && !document.getElementById('aiOppNav')){
      const btn=document.createElement('button');
      btn.id='aiOppNav';
      btn.type='button';
      btn.dataset.page='aiOppPage';
      btn.textContent=ar()?'فرص AI':'AI Opportunities';
      btn.addEventListener('click',openPage);
      const sources=document.getElementById('aiSourcesNav');
      const access=document.getElementById('aiAccessNav');
      const accountBtn=navGrid.querySelector('[data-page="account"]');
      navGrid.insertBefore(btn,sources||access||accountBtn||null);
    }
    const main=document.querySelector('main');
    if(main && !document.getElementById('aiOppPage')){
      const section=document.createElement('section');
      section.id='aiOppPage';
      section.className='section';
      section.innerHTML=`
        <div class="card" style="margin-bottom:14px">
          <div class="dashboard-head">
            <div><h3 id="aiOppHeading"></h3><div class="small" id="aiOppHelp"></div></div>
            <button class="btn secondary" id="aiOppRefresh" type="button"></button>
          </div>
        </div>
        <div class="grid cards" id="aiOppSummary" style="margin-bottom:14px"></div>
        <div class="toolbar" style="margin-bottom:10px">
          <select id="aiOppStatusFilter"></select>
          <select id="aiOppTypeFilter"></select>
          <select id="aiOppGradeFilter"></select>
        </div>
        <div id="aiOppList"></div>`;
      main.appendChild(section);
      section.querySelector('#aiOppRefresh')?.addEventListener('click',loadAll);
      ['#aiOppStatusFilter','#aiOppTypeFilter','#aiOppGradeFilter'].forEach(sel=>section.querySelector(sel)?.addEventListener('change',loadOpportunities));
      section.addEventListener('click',async e=>{
        let b=e.target.closest('[data-ai-opp-status]');
        if(b){
          const id=b.dataset.id,status=b.dataset.aiOppStatus;
          b.disabled=true;
          const {error}=await sb.from('ai_opportunities').update({status,updated_at:new Date().toISOString()}).eq('id',id);
          b.disabled=false;
          if(error)return flash((ar()?'تعذر تحديث الفرصة: ':'Could not update opportunity: ')+error.message,true);
          flash(status==='reviewed'?(ar()?'تم اعتماد الفرصة':'Opportunity approved'):(ar()?'تم تحديث الفرصة':'Opportunity updated'));
          return loadOpportunities();
        }
        b=e.target.closest('[data-ai-opp-assign]');
        if(b){
          const id=b.dataset.id;
          const select=section.querySelector(`[data-ai-opp-rep="${CSS.escape(id)}"]`);
          const repId=select?.value||'';
          if(!repId)return flash(ar()?'اختر المندوب أولاً':'Choose a representative first',true);
          b.disabled=true;
          const {error}=await sb.from('ai_opportunities').update({assigned_rep:repId,status:'assigned',updated_at:new Date().toISOString()}).eq('id',id);
          b.disabled=false;
          if(error)return flash((ar()?'تعذر إسناد الفرصة: ':'Could not assign opportunity: ')+error.message,true);
          flash(ar()?'تم إسناد الفرصة للمندوب':'Opportunity assigned');
          return loadOpportunities();
        }
      });
    }
    updateLabels();
  }

  function updateLabels(){
    const nav=document.getElementById('aiOppNav');if(nav)nav.textContent=ar()?'فرص AI':'AI Opportunities';
    const h=document.getElementById('aiOppHeading');if(h)h.textContent=ar()?'الفرص المكتشفة بالذكاء الاصطناعي':'AI-discovered opportunities';
    const help=document.getElementById('aiOppHelp');if(help)help.textContent=ar()?'الوكيل يرفع الفرص هنا بعد البحث والتحقق والتقييم. لا يتم توزيعها تلقائياً على المناديب.':'The agent places opportunities here after search, verification and scoring. They are not auto-assigned to representatives.';
    const r=document.getElementById('aiOppRefresh');if(r)r.textContent=ar()?'تحديث':'Refresh';
    const sf=document.getElementById('aiOppStatusFilter');if(sf){const v=sf.value;sf.innerHTML=`<option value="">${ar()?'كل الحالات':'All statuses'}</option><option value="new">${statusLabel('new')}</option><option value="reviewed">${statusLabel('reviewed')}</option><option value="assigned">${statusLabel('assigned')}</option><option value="rejected">${statusLabel('rejected')}</option>`;sf.value=v;}
    const tf=document.getElementById('aiOppTypeFilter');if(tf){const v=tf.value;tf.innerHTML=`<option value="">${ar()?'كل الأنواع':'All types'}</option><option value="factory">${typeLabel('factory')}</option><option value="project">${typeLabel('project')}</option><option value="contractor">${typeLabel('contractor')}</option>`;tf.value=v;}
    const gf=document.getElementById('aiOppGradeFilter');if(gf){const v=gf.value;gf.innerHTML=`<option value="">${ar()?'كل الدرجات':'All grades'}</option><option value="A">A</option><option value="B">B</option><option value="C">C</option>`;gf.value=v;}
  }

  async function loadReps(){
    const {data,error}=await sb.from('profiles').select('id,full_name,username').eq('role','rep').eq('active',true).order('full_name');
    if(!error)reps=data||[];
  }

  function renderSummary(rows){
    const el=document.getElementById('aiOppSummary');if(!el)return;
    const cards=[
      [ar()?'فرص جديدة':'New opportunities',rows.filter(x=>x.status==='new').length],
      ['A',rows.filter(x=>x.grade==='A').length],
      ['B',rows.filter(x=>x.grade==='B').length],
      [ar()?'مسندة':'Assigned',rows.filter(x=>x.status==='assigned').length]
    ];
    el.innerHTML=cards.map(([l,n])=>`<div class="card metric-card"><div class="label">${esc(l)}</div><div class="metric">${Number(n)}</div></div>`).join('');
  }

  async function loadOpportunities(){
    if(!isPrimaryAdmin())return;
    ensureUi();
    const list=document.getElementById('aiOppList');
    if(list)list.innerHTML=`<div class="card"><div class="small">${ar()?'جاري التحميل...':'Loading...'}</div></div>`;
    let q=sb.from('ai_opportunities').select('id,opportunity_type,name,activity,city,district,address,phone,website,contact_name,contact_role,project_stage,suggested_products,score,grade,recommendation_reason,verification_status,confidence,source_name,source_url,source_published_at,discovered_at,last_verified_at,status,assigned_rep').order('score',{ascending:false}).order('discovered_at',{ascending:false}).limit(500);
    const st=document.getElementById('aiOppStatusFilter')?.value||'';if(st)q=q.eq('status',st);
    const ty=document.getElementById('aiOppTypeFilter')?.value||'';if(ty)q=q.eq('opportunity_type',ty);
    const gr=document.getElementById('aiOppGradeFilter')?.value||'';if(gr)q=q.eq('grade',gr);
    const {data,error}=await q;
    if(error){if(list)list.innerHTML=`<div class="card"><div class="danger-note">${esc(error.message)}</div></div>`;return;}
    const rows=data||[];
    renderSummary(rows);
    if(!list)return;
    if(!rows.length){list.innerHTML=`<div class="card"><div class="empty">${ar()?'لا توجد فرص بهذه الفلاتر حالياً.':'No opportunities match these filters yet.'}</div></div>`;return;}
    const repMap=new Map(reps.map(r=>[r.id,r.full_name||r.username]));
    list.innerHTML=rows.map(x=>{
      const src=safeUrl(x.source_url),web=safeUrl(x.website);
      const repOptions=['<option value="">'+(ar()?'اختر مندوباً':'Choose representative')+'</option>',...reps.map(r=>`<option value="${esc(r.id)}" ${x.assigned_rep===r.id?'selected':''}>${esc(r.full_name||r.username)}</option>`)].join('');
      const products=(x.suggested_products||[]).map(p=>`<span class="badge b-gray" style="margin:2px">${esc(p)}</span>`).join('')||'-';
      const actions=x.status!=='rejected'&&x.status!=='won'&&x.status!=='lost'?`<div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-top:10px">
        ${x.status==='new'?`<button class="btn good mini" data-id="${esc(x.id)}" data-ai-opp-status="reviewed">${ar()?'اعتماد':'Approve'}</button>`:''}
        <button class="btn secondary mini" data-id="${esc(x.id)}" data-ai-opp-status="rejected">${ar()?'رفض':'Reject'}</button>
        <select data-ai-opp-rep="${esc(x.id)}" style="max-width:220px">${repOptions}</select>
        <button class="btn mini" data-id="${esc(x.id)}" data-ai-opp-assign="1">${ar()?'إسناد للمندوب':'Assign'}</button>
      </div>`:'';
      return `<div class="card" style="margin-bottom:10px">
        <div class="dashboard-head" style="margin-bottom:8px">
          <div><b>${esc(x.name)}</b> <span class="badge b-gray">${esc(typeLabel(x.opportunity_type))}</span></div>
          <div><span class="badge ${gradeClass(x.grade)}">${esc(x.grade||'C')} · ${Number(x.score||0)}</span> <span class="badge ${verifyClass(x.verification_status)}">${esc(verifyLabel(x.verification_status))}</span></div>
        </div>
        <div class="detail-grid" style="margin-bottom:8px">
          <div><b>${ar()?'النشاط':'Activity'}</b>${esc(x.activity||'-')}</div>
          <div><b>${ar()?'المدينة':'City'}</b>${esc(x.city||'-')}</div>
          <div><b>${ar()?'الحي / الموقع':'District / location'}</b>${esc(x.district||x.address||'-')}</div>
          <div><b>${ar()?'مرحلة المشروع':'Project stage'}</b>${esc(x.project_stage||'-')}</div>
          <div><b>${ar()?'الجوال':'Phone'}</b>${esc(x.phone||'-')}</div>
          <div><b>${ar()?'الحالة':'Status'}</b>${esc(statusLabel(x.status))}</div>
          <div><b>${ar()?'اكتُشفت':'Discovered'}</b>${esc(dateTime(x.discovered_at))}</div>
          <div><b>${ar()?'المندوب':'Representative'}</b>${esc(repMap.get(x.assigned_rep)||'-')}</div>
        </div>
        <div class="notice" style="margin-bottom:8px"><b>${ar()?'سبب الترشيح':'Why recommended'}</b><br>${esc(x.recommendation_reason||'-')}</div>
        <div style="margin-bottom:8px"><b>${ar()?'المنتجات المحتملة':'Suggested products'}</b><div style="margin-top:4px">${products}</div></div>
        <div class="small">${src?`<a href="${esc(src)}" target="_blank" rel="noopener noreferrer">${ar()?'فتح المصدر':'Open source'}</a>`:''}${web?` · <a href="${esc(web)}" target="_blank" rel="noopener noreferrer">${ar()?'موقع الجهة':'Company website'}</a>`:''}${x.source_name?` · ${esc(x.source_name)}`:''}</div>
        ${actions}
      </div>`;
    }).join('');
  }

  async function loadAll(){await loadReps();await loadOpportunities();}
  function sync(){ensureUi();if(isPrimaryAdmin())loadAll();}
  window.addEventListener('dana:render',sync);
  sb.auth.onAuthStateChange((_event,session)=>{if(!session)removeUi();else setTimeout(sync,0);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&isPrimaryAdmin())loadAll();});
  refreshTimer=setInterval(()=>{if(isPrimaryAdmin())loadAll();},90000);
  window.addEventListener('beforeunload',()=>{if(refreshTimer)clearInterval(refreshTimer);});
  sync();
}

boot();
})();