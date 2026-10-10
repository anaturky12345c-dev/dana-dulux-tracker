(function(){
'use strict';
const app=window.DANA_APP;if(!app||!app.sb||!app.state)return;
const sb=app.sb,state=app.state;
const PRODUCTS=['dulux_emulsion','dulux_oil','leafs_tinting','dulux_polyurethane'];
const productLabel=k=>app.productLabel?app.productLabel(k):k;
const esc=v=>app.esc?app.esc(v):String(v??'');
const ar=()=>app.getLang?app.getLang()==='ar':true;
const drafts=new Map();
let decorating=false;

function productOptions(selected=''){
 return '<option value=""></option>'+PRODUCTS.map(k=>'<option value="'+k+'" '+(k===selected?'selected':'')+'>'+esc(productLabel(k))+'</option>').join('');
}
function fmtDateTime(v){return v?(app.dateTime?app.dateTime(v):String(v)):'-';}
function fmtDate(v){return v?(app.dateOnly?app.dateOnly(v):String(v)):'-';}
function money(v){return app.money?app.money(v):String(v||0);}
function flash(m,bad=false){if(app.flash)app.flash(m,bad);}

function ensureStyles(){if(document.getElementById('emulsionTrackingStyles'))return;const s=document.createElement('style');s.id='emulsionTrackingStyles';s.textContent=`
.emu-extra-wrap{margin-top:12px;padding:12px;border:1px solid #dfe5ec;border-radius:14px;background:#f8fafc}.emu-extra-wrap label{display:block;font-weight:800;margin-bottom:7px}.emu-extra-wrap .small{display:block;margin-top:6px}
.emu-voice{margin-top:12px;padding:14px;border:1px solid #dfe5ec;border-radius:14px;background:#f8fafc}.emu-voice-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.emu-voice-head b{font-size:15px}.emu-voice-head span{font-size:12px;color:#64748b}.emu-voice-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.emu-record-btn{border:0;border-radius:12px;padding:11px 14px;font-weight:800;cursor:pointer;background:#111827;color:white}.emu-record-btn.recording{background:#b91c1c}.emu-voice-status{font-size:13px;color:#475569}.emu-voice-status b{display:inline-block;min-width:44px;color:#111827}.emu-audio{width:min(100%,340px);height:38px;margin-top:10px}.emu-written{margin-top:10px}.emu-written textarea{min-height:66px}
.customer-detail-organized>.detail-grid,.customer-detail-organized>.account-summary{border:1px solid #e2e8f0;border-radius:16px;padding:14px;background:white}.customer-detail-organized>.detail-grid{display:grid;gap:10px}.customer-detail-organized>.detail-grid>div{padding:10px;border-radius:11px;background:#f8fafc}.customer-detail-organized>.detail-grid b{display:block;color:#475569;font-size:12px;margin-bottom:5px}.customer-section-title{font-size:16px;font-weight:900;margin:16px 0 8px}.customer-insight{margin:12px 0;padding:14px;border-radius:16px;border:1px solid #dbe4ee;background:#f8fafc}.customer-insight h4{margin:0 0 10px;font-size:16px}.customer-insight-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.customer-insight-grid>div{padding:10px;border-radius:11px;background:white;border:1px solid #e5e7eb}.customer-insight-grid b{display:block;color:#64748b;font-size:12px;margin-bottom:4px}.customer-insight-grid strong{font-size:14px}.customer-insight .emu-important{background:#fff7ed;border-color:#fed7aa}.customer-insight .emu-good{background:#f0fdf4;border-color:#bbf7d0}.customer-insight .emu-muted{background:#f8fafc}.customer-actions-title{font-weight:900;margin-top:14px;margin-bottom:7px}
.emu-dashboard-card{border:1px solid #dbe4ee;border-radius:15px;padding:12px;background:#fff;margin:10px 0}.emu-dashboard-card b{display:block;font-size:13px;color:#475569}.emu-dashboard-card strong{font-size:25px;display:block;margin-top:4px}
@media(max-width:650px){.customer-insight-grid{grid-template-columns:1fr}.emu-voice-row{align-items:stretch}.emu-record-btn{width:100%}}
`;document.head.appendChild(s);}

function sec(n){n=Math.max(0,Math.round(n||0));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function voiceWidget(){return `<div class="emu-voice" id="fInitialVoiceWrap"><div class="emu-voice-head"><b>${ar()?'سبب حالة العميل — تسجيل صوتي':'Customer status reason — voice recording'}</b><span>${ar()?'إلزامي • بحد أقصى دقيقتين':'Required • maximum 2 minutes'}</span></div><div class="emu-voice-row"><button type="button" class="emu-record-btn" id="fInitialVoiceBtn">🎤 ${ar()?'ابدأ التسجيل':'Start recording'}</button><div class="emu-voice-status"><b id="fInitialVoiceTime">00:00</b> <span id="fInitialVoiceStatus">${ar()?'اضغط واذكر السبب بوضوح':'Tap and state the reason clearly'}</span></div><button type="button" class="btn secondary mini hidden" id="fInitialVoiceReset">${ar()?'حذف وإعادة':'Delete & re-record'}</button></div><audio id="fInitialVoiceAudio" class="emu-audio hidden" controls></audio><div class="emu-written"><label>${ar()?'تفاصيل إضافية — اختياري':'Additional details — optional'}</label><textarea id="fInitialWrittenNote" placeholder="${ar()?'اكتب ملاحظة إضافية إذا احتجت...':'Optional extra note...'}"></textarea></div></div>`;}

async function startVoice(){
 const old=drafts.get('initial');if(old?.recording)return stopVoice();
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return flash(ar()?'التسجيل الصوتي غير مدعوم في هذا المتصفح.':'Voice recording is not supported in this browser.',true);
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  let mime='';for(const x of ['audio/webm;codecs=opus','audio/webm','audio/mp4']){if(MediaRecorder.isTypeSupported?.(x)){mime=x;break;}}
  const rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined),chunks=[];const d={rec,stream,chunks,recording:true,started:Date.now(),timer:null,blob:null,duration:0,url:null};drafts.set('initial',d);
  rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
  rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());d.recording=false;d.duration=Math.min(120,Math.max(1,Math.round((Date.now()-d.started)/1000)));d.blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});if(d.url)URL.revokeObjectURL(d.url);d.url=URL.createObjectURL(d.blob);clearInterval(d.timer);renderVoice('ready');};
  rec.start(250);d.timer=setInterval(()=>{const elapsed=Math.floor((Date.now()-d.started)/1000);const e=document.getElementById('fInitialVoiceTime');if(e)e.textContent=sec(elapsed);if(elapsed>=120)stopVoice();},500);renderVoice('recording');
 }catch(e){flash(ar()?'تعذر تشغيل المايك. تأكد من إعطاء صلاحية الميكروفون.':'Could not access the microphone. Check microphone permission.',true);}
}
function stopVoice(){const d=drafts.get('initial');if(d?.recording&&d.rec?.state!=='inactive')d.rec.stop();}
function resetVoice(){const d=drafts.get('initial');if(d?.recording)try{d.rec.stop()}catch(_){}if(d?.stream)d.stream.getTracks().forEach(t=>t.stop());if(d?.timer)clearInterval(d.timer);if(d?.url)URL.revokeObjectURL(d.url);drafts.delete('initial');renderVoice('empty');}
function renderVoice(mode){const btn=document.getElementById('fInitialVoiceBtn'),tm=document.getElementById('fInitialVoiceTime'),st=document.getElementById('fInitialVoiceStatus'),rs=document.getElementById('fInitialVoiceReset'),au=document.getElementById('fInitialVoiceAudio'),d=drafts.get('initial');if(!btn)return;if(mode==='recording'){btn.classList.add('recording');btn.textContent='⏹ '+(ar()?'إيقاف التسجيل':'Stop recording');st.textContent=ar()?'جاري التسجيل...':'Recording...';rs?.classList.remove('hidden');au?.classList.add('hidden');}else if(mode==='ready'&&d?.blob){btn.classList.remove('recording');btn.textContent='🎤 '+(ar()?'إعادة التسجيل':'Record again');tm.textContent=sec(d.duration);st.textContent=ar()?'تم التسجيل — اسمعه قبل الحفظ':'Recorded — listen before saving';rs?.classList.remove('hidden');if(au){au.src=d.url;au.classList.remove('hidden');}}else{btn.classList.remove('recording');btn.textContent='🎤 '+(ar()?'ابدأ التسجيل':'Start recording');if(tm)tm.textContent='00:00';if(st)st.textContent=ar()?'اضغط واذكر السبب بوضوح':'Tap and state the reason clearly';rs?.classList.add('hidden');if(au){au.removeAttribute('src');au.classList.add('hidden');}}}
async function uploadInitialVoice(){const d=drafts.get('initial');if(!d?.blob||!d.duration)throw new Error('voice required');const uid=state.session?.user?.id||state.profile?.id;if(!uid)throw new Error('unauthorized');const ext=(d.blob.type||'').includes('mp4')?'m4a':'webm';const path=`voice/${uid}/initial-status-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;const {error}=await sb.storage.from('dana-voice-reports').upload(path,d.blob,{contentType:d.blob.type||'audio/webm',upsert:false});if(error)throw error;return {path,duration:d.duration};}

function decorateNewCustomerForm(){
 const status=document.getElementById('fStatus'),save=document.getElementById('saveCustomerBtn');if(!status||!save)return;
 const host=status.closest('.form-grid')||document.getElementById('modalContent');if(!host)return;
 let productWrap=document.getElementById('fAgreementProductWrap');if(!productWrap){productWrap=document.createElement('div');productWrap.id='fAgreementProductWrap';productWrap.className='full emu-extra-wrap hidden';productWrap.innerHTML=`<label>${ar()?'المنتج المتفق عليه':'Agreed product'}</label><select id="fAgreementProduct">${productOptions()}</select><span class="small">${ar()?'لا يمكن حفظ «متفق – بانتظار الطلبية» بدون تحديد المنتج.':'An agreed product is required.'}</span>`;host.appendChild(productWrap);}
 if(!document.getElementById('fInitialVoiceWrap')){const w=document.createElement('div');w.className='full';w.innerHTML=voiceWidget();host.appendChild(w.firstElementChild);document.getElementById('fInitialVoiceBtn')?.addEventListener('click',startVoice);document.getElementById('fInitialVoiceReset')?.addEventListener('click',resetVoice);}
 updateNewCustomerExtras();
 if(!status.dataset.emuBound){status.dataset.emuBound='1';status.addEventListener('change',updateNewCustomerExtras);}
}
function updateNewCustomerExtras(){const st=document.getElementById('fStatus')?.value,voice=document.getElementById('fInitialVoiceWrap'),prod=document.getElementById('fAgreementProductWrap'),oldReason=document.getElementById('fInitialReasonWrap');if(voice)voice.classList.toggle('hidden',!['hesitant','rejected'].includes(st));if(prod)prod.classList.toggle('hidden',st!=='agreed_pending');if(oldReason)oldReason.classList.add('hidden');if(!['hesitant','rejected'].includes(st))resetVoice();}

async function saveSpecialNewCustomer(e,btn){
 const st=document.getElementById('fStatus')?.value;if(!['hesitant','rejected','agreed_pending'].includes(st))return false;
 e.preventDefault();e.stopImmediatePropagation();
 const name=document.getElementById('fName')?.value?.trim(),type=document.getElementById('fType')?.value,area=document.getElementById('fArea')?.value?.trim()||null,phone=document.getElementById('fPhone')?.value?.trim()||null,lat=Number(document.getElementById('fLat')?.value),lng=Number(document.getElementById('fLng')?.value),rep=document.getElementById('fRep')?.value||null;
 if(!name||name.length<2)return flash(ar()?'اكتب اسم العميل.':'Enter customer name.',true),true;
 if(!type)return flash(ar()?'اختر نوع العميل.':'Select customer type.',true),true;
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||!document.getElementById('fLat')?.value)return flash(ar()?'حدد موقع العميل أولاً.':'Set customer location first.',true),true;
 const product=document.getElementById('fAgreementProduct')?.value||null;if(st==='agreed_pending'&&!product)return flash(ar()?'اختر المنتج المتفق عليه.':'Select the agreed product.',true),true;
 let audio=null;if(['hesitant','rejected'].includes(st)){const d=drafts.get('initial');if(!d?.blob||!d.duration)return flash(ar()?'سجل سبب الحالة صوتيًا قبل الحفظ.':'Record the status reason before saving.',true),true;}
 btn.disabled=true;const old=btn.textContent;btn.textContent=ar()?'جاري الحفظ...':'Saving...';
 try{
  if(['hesitant','rejected'].includes(st))audio=await uploadInitialVoice();
  const {data,error}=await sb.rpc('create_customer_with_voice_status',{p_name:name,p_area:area,p_phone:phone,p_initial_status:st,p_lat:lat,p_lng:lng,p_assigned_rep:rep,p_customer_type:type,p_audio_path:audio?.path||null,p_audio_duration_seconds:audio?.duration||null,p_written_note:document.getElementById('fInitialWrittenNote')?.value?.trim()||null,p_agreement_product:product});
  if(error)throw error;
  resetVoice();app.closeModal?.();flash(ar()?'تمت إضافة العميل.':'Customer added.');await app.refreshAll?.();window.dispatchEvent(new CustomEvent('dana:customer-created',{detail:{customerId:Number(data),source:'emulsion-tracking'}}));
 }catch(err){console.error(err);flash((ar()?'تعذر حفظ العميل: ':'Could not save customer: ')+(err?.message||err),true);}
 finally{btn.disabled=false;btn.textContent=old;}
 return true;
}

function decoratePendingAgreement(){
 const wrap=document.getElementById('sPendingAgreementWrap');if(!wrap||document.getElementById('sAgreementProductWrap'))return;
 const d=document.createElement('div');d.id='sAgreementProductWrap';d.className='emu-extra-wrap';d.innerHTML=`<label>${ar()?'المنتج المتفق عليه':'Agreed product'}</label><select id="sAgreementProduct">${productOptions()}</select><span class="small">${ar()?'حدد المنتج الذي اتفق عليه العميل قبل الحفظ.':'Choose the product agreed with the customer.'}</span>`;wrap.insertBefore(d,wrap.firstChild);
}
async function prepareAgreementClick(e,btn){
 if(btn.dataset.emuPrepared==='1'){delete btn.dataset.emuPrepared;return false;}
 const product=document.getElementById('sAgreementProduct')?.value;if(!product){e.preventDefault();e.stopImmediatePropagation();flash(ar()?'اختر المنتج المتفق عليه.':'Select the agreed product.',true);return true;}
 const customerId=Number(document.getElementById('sCustomer')?.value||btn.dataset.customerId||0);if(!customerId)return false;
 e.preventDefault();e.stopImmediatePropagation();btn.disabled=true;
 const {error}=await sb.rpc('prepare_customer_agreement',{p_customer_id:customerId,p_product:product});btn.disabled=false;
 if(error){flash((ar()?'تعذر حفظ المنتج المتفق عليه: ':'Could not save agreed product: ')+error.message,true);return true;}
 btn.dataset.emuPrepared='1';btn.click();return true;
}

async function decorateCustomerDetail(){
 if(decorating||!document.getElementById('modal')?.classList.contains('open'))return;
 const content=document.getElementById('modalContent');if(!content||!content.querySelector('.detail-grid')||content.dataset.emuDecorated==='1')return;
 const title=document.getElementById('modalTitle')?.textContent?.trim();const c=state.customers.find(x=>String(x.name).trim()===title);if(!c)return;
 decorating=true;content.dataset.emuDecorated='1';content.classList.add('customer-detail-organized');
 try{
  const grid=content.querySelector('.detail-grid');const sum=content.querySelector('.account-summary');
  const h=document.createElement('div');h.className='customer-section-title';h.textContent=ar()?'بيانات العميل':'Customer information';grid?.before(h);
  if(sum){const sh=document.createElement('div');sh.className='customer-section-title';sh.textContent=ar()?'ملخص السحوبات':'Order summary';sum.before(sh);}
  const tb=content.querySelector('.toolbar');if(tb){const ah=document.createElement('div');ah.className='customer-actions-title';ah.textContent=ar()?'الإجراءات':'Actions';tb.before(ah);}
  const {data,error}=await sb.from('customers').select('id,activity_product_class,emulsion_first_order_date,emulsion_last_order_date,emulsion_order_count,emulsion_sales_total,agreement_product,agreement_origin_status,agreement_started_at,agreement_expires_at,agreement_open,agreement_outcome,agreement_completed_at,agreement_expired_at').eq('id',c.id).maybeSingle();
  if(error||!data)return;
  const isMgmt=app.canManage?.();
  const panel=document.createElement('div');panel.className='customer-insight';
  const emState=data.activity_product_class==='emulsion'?(ar()?'اشترى إميلشن':'Bought Emulsion'):data.activity_product_class==='other'?(ar()?'نشط بمنتجات أخرى — لا يوجد إميلشن':'Active from other products — no Emulsion'):(ar()?'لا توجد طلبية مسجلة':'No recorded order');
  const outcome={open:ar()?'اتفاق مفتوح':'Open agreement',fulfilled:ar()?'تم تنفيذ الاتفاق':'Agreement fulfilled',expired_no_order:ar()?'انتهت المهلة بدون طلبية':'Expired without an order',expired_after_other_purchase:ar()?'انتهت مهلة الاتفاق بعد شراء منتج آخر':'Agreement expired after another product purchase'}[data.agreement_outcome]||'-';
  panel.innerHTML=`<h4>${ar()?'وضع العميل التجاري':'Customer commercial status'}</h4><div class="customer-insight-grid">
    <div class="${data.activity_product_class==='emulsion'?'emu-good':'emu-muted'}"><b>${ar()?'نشاط الإميلشن':'Emulsion activity'}</b><strong>${esc(emState)}</strong></div>
    <div><b>${ar()?'آخر طلبية إميلشن':'Last Emulsion order'}</b><strong>${fmtDate(data.emulsion_last_order_date)}</strong></div>
    <div><b>${ar()?'عدد طلبيات الإميلشن':'Emulsion orders'}</b><strong>${Number(data.emulsion_order_count||0)}</strong></div>
    <div><b>${ar()?'إجمالي الإميلشن':'Emulsion sales total'}</b><strong>${money(data.emulsion_sales_total||0)}</strong></div>
    ${isMgmt&&data.agreement_product?`<div class="${data.agreement_outcome&&data.agreement_outcome!=='fulfilled'?'emu-important':''}"><b>${ar()?'المنتج المتفق عليه':'Agreed product'}</b><strong>${esc(productLabel(data.agreement_product))}</strong></div><div><b>${ar()?'حالة الاتفاق':'Agreement status'}</b><strong>${esc(outcome)}</strong></div><div><b>${ar()?'تاريخ الاتفاق':'Agreement date'}</b><strong>${fmtDateTime(data.agreement_started_at)}</strong></div><div><b>${ar()?'نهاية المهلة':'Agreement deadline'}</b><strong>${fmtDateTime(data.agreement_expires_at)}</strong></div>`:''}
  </div>${isMgmt&&data.agreement_outcome==='expired_no_order'?`<div class="notice" style="margin-top:10px"><b>${ar()?'متردد — انتهت مهلة الاتفاق':'Hesitant — agreement deadline expired'}</b><br>${ar()?'كان متفقًا على: ':'Agreed product: '}${esc(productLabel(data.agreement_product))}</div>`:''}`;
  const anchor=sum||grid;if(anchor)anchor.after(panel);
 }finally{decorating=false;}
}

function patchEmulsionGoalCard(){
 const root=document.getElementById('goalsDashboard');if(!root||!app.canManage?.())return;
 const month=(app.monthRiyadh?app.monthRiyadh():new Date().toISOString().slice(0,7));
 const sales=state.sales.filter(s=>String(s.business_date||'').slice(0,7)===month&&s.product==='dulux_emulsion');
 const byCustomer=new Map();sales.forEach(s=>byCustomer.set(Number(s.customer_id),(byCustomer.get(Number(s.customer_id))||0)+Number(s.amount||0)));
 const newIds=new Set(state.customers.filter(c=>String(c.created_at||'').slice(0,7)===month).map(c=>Number(c.id)));
 const count=[...byCustomer].filter(([id,total])=>newIds.has(id)&&total>=5000).length;
 let card=document.getElementById('emuActiveNewCard');if(!card){card=document.createElement('div');card.id='emuActiveNewCard';card.className='emu-dashboard-card';root.prepend(card);}card.innerHTML=`<b>${ar()?'عملاء جدد نشطين بالإميلشن (5,000 ر.س+)':'New active Emulsion customers (SAR 5,000+)'}</b><strong>${count}</strong><span class="small">${ar()?'يُحسب من سحوبات الإميلشن فقط':'Calculated from Emulsion sales only'}</span>`;
}

function scan(){ensureStyles();decorateNewCustomerForm();decoratePendingAgreement();decorateCustomerDetail();patchEmulsionGoalCard();}

document.addEventListener('click',async e=>{
 const save=e.target.closest('#saveCustomerBtn');if(save){const st=document.getElementById('fStatus')?.value;if(['hesitant','rejected','agreed_pending'].includes(st)){await saveSpecialNewCustomer(e,save);return;}}
 const agr=e.target.closest('#sSaveAgreedPendingBtn');if(agr){await prepareAgreementClick(e,agr);return;}
},true);

const obs=new MutationObserver(()=>setTimeout(scan,0));obs.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('dana:render',()=>setTimeout(scan,0));document.addEventListener('change',e=>{if(e.target?.id==='fStatus')setTimeout(updateNewCustomerExtras,0);});
setInterval(()=>{if(state.profile)scan();},1800);
scan();
})();