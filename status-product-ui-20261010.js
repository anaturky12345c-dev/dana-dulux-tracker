(function(){
'use strict';
const app=window.DANA_APP;
if(!app||!app.sb||!app.state)return;
const sb=app.sb,state=app.state;
const MAX_SECONDS=120;
let voice=null;
let dashboardTimer=null;
let saving=false;

const $=id=>document.getElementById(id);
const esc=v=>app.esc?app.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isRep=()=>state.profile?.role==='rep';
const isManagement=()=>!!state.profile&&!isRep();
const ar=()=>app.getLang?app.getLang()==='ar':true;
const productName=k=>({dulux_emulsion:'إميلشن',dulux_oil:'زيتي',leafs_tinting:'ليفز',dulux_polyurethane:'بولي يوريثان'}[k]||(k?app.productLabel?.(k)||k:'غير محدد'));
const statusName=s=>s==='active'?'نشط':s==='inactive'?'خامل':(app.statusLabel?.(s)||s||'-');

function ensureStyles(){
 if($('statusProductUiStyles'))return;
 const s=document.createElement('style');s.id='statusProductUiStyles';s.textContent=`
 .sp-inline-wrap{grid-column:1/-1;margin-top:-2px;margin-bottom:4px}.sp-voice-box,.sp-agreement-box{border:1px solid #dbe4ee;border-radius:14px;padding:13px;background:#f8fafc}.sp-voice-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}.sp-voice-head b{font-size:14px}.sp-voice-head span{font-size:12px;color:#64748b}.sp-voice-row{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.sp-rec-btn{border:0;border-radius:12px;padding:11px 14px;background:#111827;color:#fff;font:inherit;font-weight:900;cursor:pointer}.sp-rec-btn.recording{background:#b91c1c}.sp-voice-time{min-width:42px;font-weight:900}.sp-voice-state{font-size:12px;color:#64748b}.sp-voice-audio{width:min(100%,360px);height:38px;margin-top:10px}.sp-extra-note{margin-top:9px}.sp-extra-note label{display:block;font-size:12px;font-weight:800;color:#64748b;margin-bottom:5px}.sp-extra-note textarea{width:100%;min-height:58px}.sp-agreement-box label{display:block;font-weight:900;margin-bottom:7px}.sp-agreement-box .small{margin-top:6px}
 #mgmtProductStatusCard{margin-top:14px}.sp-status-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:12px}.sp-status-head h3{margin:0}.sp-status-head .small{margin-top:3px}.sp-status-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.sp-status-panel{border:1px solid #dfe5ec;border-radius:15px;padding:13px;background:#f8fafc}.sp-status-panel h4{margin:0 0 9px;font-size:16px}.sp-chip-row{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:9px}.sp-chip{display:inline-flex;align-items:center;gap:5px;padding:6px 9px;border:1px solid #dbe4ee;border-radius:999px;background:#fff;font-size:12px;font-weight:800}.sp-chip b{font-size:14px}.sp-product-details{border-top:1px solid #e2e8f0;padding-top:7px}.sp-product-details details{background:#fff;border:1px solid #e5e7eb;border-radius:11px;margin-top:7px;overflow:hidden}.sp-product-details summary{cursor:pointer;padding:9px 10px;font-weight:900;display:flex;justify-content:space-between;gap:8px}.sp-customer-list{padding:0 10px 10px;display:grid;gap:6px}.sp-customer-row{display:flex;justify-content:space-between;gap:8px;font-size:12px;border-top:1px solid #f1f5f9;padding-top:6px}.sp-customer-row span:last-child{color:#64748b}.sp-inline-breakdown{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.sp-inline-breakdown span{font-size:10px;font-weight:800;background:#f8fafc;border:1px solid #e2e8f0;border-radius:999px;padding:4px 6px}
 @media(max-width:700px){.sp-status-grid{grid-template-columns:1fr}.sp-voice-row{align-items:stretch}.sp-rec-btn{width:100%}.sp-customer-row{flex-direction:column;gap:2px}}
 `;document.head.appendChild(s);
}

function sec(n){n=Math.max(0,Math.min(MAX_SECONDS,Math.round(Number(n)||0)));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function cleanupVoice(){
 if(!voice)return;
 try{if(voice.rec&&voice.rec.state!=='inactive')voice.rec.stop();}catch(_){}
 try{voice.stream?.getTracks()?.forEach(t=>t.stop());}catch(_){}
 if(voice.timer)clearInterval(voice.timer);
 if(voice.url)URL.revokeObjectURL(voice.url);
 voice=null;
 renderVoice('empty');
}
function renderVoice(mode){
 const btn=$('spVoiceBtn'),time=$('spVoiceTime'),text=$('spVoiceState'),reset=$('spVoiceReset'),audio=$('spVoiceAudio');if(!btn)return;
 if(mode==='recording'){
  btn.classList.add('recording');btn.textContent='⏹ إيقاف التسجيل';if(text)text.textContent='جاري التسجيل...';reset?.classList.remove('hidden');audio?.classList.add('hidden');
 }else if(mode==='ready'&&voice?.blob){
  btn.classList.remove('recording');btn.textContent='🎤 إعادة التسجيل';if(time)time.textContent=sec(voice.duration);if(text)text.textContent='تم التسجيل — تقدر تسمعه قبل الحفظ';reset?.classList.remove('hidden');if(audio){audio.src=voice.url;audio.classList.remove('hidden');}
 }else{
  btn.classList.remove('recording');btn.textContent='🎤 ابدأ التسجيل';if(time)time.textContent='00:00';if(text)text.textContent='اذكر سبب التردد أو الرفض بوضوح';reset?.classList.add('hidden');if(audio){audio.removeAttribute('src');audio.classList.add('hidden');}
 }
}
async function toggleVoice(){
 if(voice?.recording){try{voice.rec.stop();}catch(_){}return;}
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return app.flash?.('التسجيل الصوتي غير مدعوم في هذا المتصفح.',true);
 cleanupVoice();
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  let mime='';for(const m of ['audio/webm;codecs=opus','audio/webm','audio/mp4']){if(MediaRecorder.isTypeSupported?.(m)){mime=m;break;}}
  const rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined),chunks=[];
  voice={rec,stream,chunks,recording:true,started:Date.now(),duration:0,blob:null,url:null,timer:null};
  rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
  rec.onstop=()=>{if(!voice)return;voice.recording=false;voice.duration=Math.max(1,Math.min(MAX_SECONDS,Math.round((Date.now()-voice.started)/1000)));voice.blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});voice.url=URL.createObjectURL(voice.blob);stream.getTracks().forEach(t=>t.stop());if(voice.timer)clearInterval(voice.timer);renderVoice('ready');};
  rec.start(250);
  voice.timer=setInterval(()=>{if(!voice)return;const elapsed=Math.floor((Date.now()-voice.started)/1000);if($('spVoiceTime'))$('spVoiceTime').textContent=sec(elapsed);if(elapsed>=MAX_SECONDS){try{voice.rec.stop();}catch(_){}}},400);
  renderVoice('recording');
 }catch(e){app.flash?.('تعذر تشغيل المايك. تأكد من صلاحية الميكروفون.',true);}
}
async function uploadVoice(){
 if(!voice?.blob||!voice.duration)throw new Error('voice required');
 const uid=state.session?.user?.id||state.profile?.id;if(!uid)throw new Error('unauthorized');
 const ext=(voice.blob.type||'').includes('mp4')?'m4a':'webm';
 const path=`voice/${uid}/initial-status-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
 const {error}=await sb.storage.from('dana-voice-reports').upload(path,voice.blob,{contentType:voice.blob.type||'audio/webm',upsert:false});
 if(error)throw error;return {path,duration:voice.duration};
}

function decorateCustomerForm(){
 ensureStyles();
 const status=$('fStatus');if(!status)return;
 const statusField=status.closest('div');const form=status.closest('.form-grid')||$('modalContent');if(!statusField||!form)return;
 let wrap=$('spStatusInlineWrap');
 if(!wrap){
  wrap=document.createElement('div');wrap.id='spStatusInlineWrap';wrap.className='sp-inline-wrap full';
  wrap.innerHTML=`<div id="spVoiceBox" class="sp-voice-box hidden"><div class="sp-voice-head"><b>سبب حالة العميل — تسجيل صوتي</b><span>إلزامي • بحد أقصى دقيقتين</span></div><div class="sp-voice-row"><button type="button" id="spVoiceBtn" class="sp-rec-btn">🎤 ابدأ التسجيل</button><b id="spVoiceTime" class="sp-voice-time">00:00</b><span id="spVoiceState" class="sp-voice-state">اذكر سبب التردد أو الرفض بوضوح</span><button type="button" id="spVoiceReset" class="btn secondary mini hidden">حذف وإعادة</button></div><audio id="spVoiceAudio" class="sp-voice-audio hidden" controls></audio><div class="sp-extra-note"><label>تفاصيل إضافية — اختياري</label><textarea id="spVoiceNote" placeholder="ملاحظة إضافية إذا احتجت..."></textarea></div></div><div id="spAgreementBox" class="sp-agreement-box hidden"><label>المنتج المتفق عليه</label><select id="spAgreementProduct"><option value=""></option><option value="dulux_emulsion">إميلشن</option><option value="dulux_oil">زيتي</option><option value="leafs_tinting">ليفز</option><option value="dulux_polyurethane">بولي يوريثان</option></select><div class="small">لا يمكن حفظ «متفق – بانتظار الطلبية» بدون تحديد المنتج.</div></div>`;
  statusField.insertAdjacentElement('afterend',wrap);
  $('spVoiceBtn')?.addEventListener('click',toggleVoice);$('spVoiceReset')?.addEventListener('click',cleanupVoice);
 }
 // Keep the voice/product block immediately below Status even if another script reorders the form.
 if(statusField.nextElementSibling!==wrap)statusField.insertAdjacentElement('afterend',wrap);
 const oldReason=$('fInitialReasonWrap');if(oldReason)oldReason.classList.add('hidden');
 if(!status.dataset.spBound){status.dataset.spBound='1';status.addEventListener('change',()=>{cleanupVoice();updateFormState();});}
 updateFormState();
}
function updateFormState(){
 const st=$('fStatus')?.value;const v=$('spVoiceBox'),a=$('spAgreementBox');
 if(v)v.classList.toggle('hidden',!['hesitant','rejected'].includes(st));
 if(a)a.classList.toggle('hidden',st!=='agreed_pending');
}

async function saveCustomerSpecial(e){
 const btn=e.target.closest?.('#saveCustomerBtn');if(!btn||saving)return;
 const st=$('fStatus')?.value;if(!['hesitant','rejected','agreed_pending'].includes(st))return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 const name=$('fName')?.value?.trim()||'',type=$('fCustomerType')?.value||'',area=$('fArea')?.value?.trim()||null,phone=$('fPhone')?.value?.trim()||null;
 const latRaw=$('fLat')?.value,lngRaw=$('fLng')?.value,lat=Number(latRaw),lng=Number(lngRaw),rep=$('fRep')?.value||null;
 if(name.length<2)return app.flash?.('اسم العميل مطلوب.',true);
 if(!['shop','factory','project'].includes(type))return app.flash?.('حدد نوع العميل.',true);
 if(!st)return app.flash?.('اختر حالة العميل.',true);
 if(isManagement()&&!rep)return app.flash?.('اختر المندوب المسؤول.',true);
 if(!latRaw||!lngRaw||!Number.isFinite(lat)||!Number.isFinite(lng))return app.flash?.('حدد موقع العميل أولاً.',true);
 const product=$('spAgreementProduct')?.value||null;
 if(st==='agreed_pending'&&!product)return app.flash?.('اختر المنتج المتفق عليه.',true);
 if(['hesitant','rejected'].includes(st)&&(!voice?.blob||!voice.duration))return app.flash?.(st==='hesitant'?'سجل سبب تردد العميل صوتيًا.':'سجل سبب رفض العميل صوتيًا.',true);
 saving=true;btn.disabled=true;const old=btn.textContent;btn.textContent='جاري الحفظ...';
 try{
  let uploaded=null;if(['hesitant','rejected'].includes(st))uploaded=await uploadVoice();
  const {data,error}=await sb.rpc('create_customer_with_voice_status',{p_name:name,p_area:area,p_phone:phone,p_initial_status:st,p_lat:lat,p_lng:lng,p_assigned_rep:rep,p_customer_type:type,p_audio_path:uploaded?.path||null,p_audio_duration_seconds:uploaded?.duration||null,p_written_note:$('spVoiceNote')?.value?.trim()||null,p_agreement_product:product});
  if(error)throw error;
  cleanupVoice();app.closeModal?.();app.flash?.('تمت إضافة العميل.');await app.refreshAll?.();window.dispatchEvent(new CustomEvent('dana:customer-created',{detail:{customerId:Number(data),source:'status-product-ui'}}));
 }catch(err){console.error(err);app.flash?.('تعذر حفظ العميل: '+(err?.message||err),true);}
 finally{saving=false;btn.disabled=false;btn.textContent=old;}
}

function latestProductByCustomer(){
 const map=new Map();
 const rows=[...(state.sales||[])].sort((a,b)=>String(b.business_date||'').localeCompare(String(a.business_date||''))||String(b.created_at||'').localeCompare(String(a.created_at||'')));
 for(const s of rows){const id=Number(s.customer_id);if(!map.has(id))map.set(id,s.product||null);}
 return map;
}
function groupByProduct(customers,latest){
 const groups=new Map();
 for(const c of customers){const p=latest.get(Number(c.id))||'unknown';if(!groups.has(p))groups.set(p,[]);groups.get(p).push(c);}
 return [...groups.entries()].sort((a,b)=>b[1].length-a[1].length||productName(a[0]).localeCompare(productName(b[0]),'ar'));
}
function repName(c){return c.rep?.full_name||state.profiles?.find(p=>p.id===c.assigned_rep)?.full_name||'-';}
function panelHtml(title,rows,status){
 const chips=rows.length?rows.map(([p,list])=>`<span class="sp-chip">${esc(productName(p))} <b>${list.length}</b></span>`).join(''):'<span class="small">لا يوجد</span>';
 const details=rows.map(([p,list])=>`<details><summary><span>${esc(statusName(status))} — ${esc(productName(p))}</span><b>${list.length}</b></summary><div class="sp-customer-list">${list.map(c=>`<div class="sp-customer-row"><span>${esc(c.name)}</span><span>${esc(repName(c))}${c.area?' · '+esc(c.area):''}</span></div>`).join('')}</div></details>`).join('');
 return `<div class="sp-status-panel"><h4>${title}</h4><div class="sp-chip-row">${chips}</div><div class="sp-product-details">${details}</div></div>`;
}
function inlineBreakdown(target,rows){
 if(!target)return;let box=target.querySelector('.sp-inline-breakdown');if(!box){box=document.createElement('div');box.className='sp-inline-breakdown';target.appendChild(box);}box.innerHTML=rows.map(([p,list])=>`<span>${esc(productName(p))}: ${list.length}</span>`).join('');
}
function renderManagementDashboard(){
 if(!state.profile)return;
 const old=$('mgmtProductStatusCard');
 if(!isManagement()){old?.remove();document.querySelectorAll('.sp-inline-breakdown').forEach(x=>x.remove());return;}
 const latest=latestProductByCustomer();
 const active=(state.customers||[]).filter(c=>c.status==='active'),inactive=(state.customers||[]).filter(c=>c.status==='inactive');
 const activeRows=groupByProduct(active,latest),inactiveRows=groupByProduct(inactive,latest);
 const dash=$('dashboard'),cards=dash?.querySelector('.dashboard-cards');if(!dash||!cards)return;
 let card=old;if(!card){card=document.createElement('div');card.id='mgmtProductStatusCard';card.className='card management-only';cards.insertAdjacentElement('afterend',card);}
 card.innerHTML=`<div class="sp-status-head"><div><h3>حالة العملاء حسب المنتج</h3><div class="small">هذا التفصيل للإدارة فقط. المندوب يبقى يشوف «نشط» أو «خامل» بدون تفريق المنتجات.</div></div></div><div class="sp-status-grid">${panelHtml('النشطون حسب المنتج',activeRows,'active')}${panelHtml('الخاملون حسب المنتج',inactiveRows,'inactive')}</div>`;
 const activeMetric=$('mActive')?.closest('.metric-card');inlineBreakdown(activeMetric,activeRows);
 const dormantTitle=$('dormantTitle');if(dormantTitle)dormantTitle.textContent='العملاء الخاملون';
 const dormantSummary=dormantTitle?.parentElement;inlineBreakdown(dormantSummary,inactiveRows);
}
function scheduleDashboard(){clearTimeout(dashboardTimer);dashboardTimer=setTimeout(renderManagementDashboard,80);}

ensureStyles();
document.addEventListener('click',saveCustomerSpecial,true);
const obs=new MutationObserver(()=>{decorateCustomerForm();scheduleDashboard();if(!$('modal')?.classList.contains('open'))cleanupVoice();});
obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
window.addEventListener('dana:render',scheduleDashboard);
setInterval(()=>{decorateCustomerForm();scheduleDashboard();},1800);
setTimeout(()=>{decorateCustomerForm();renderManagementDashboard();},400);
})();