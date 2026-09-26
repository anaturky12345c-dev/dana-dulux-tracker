(function(){
'use strict';

var app=window.DANA_APP;
if(!app||!app.sb)return;
var sb=app.sb;
var items=[];
var pollTimer=null;
var VAPID_ENDPOINT='https://bmpxtvhqpjvlyeoseuvz.supabase.co/functions/v1/send-push-notifications';

function ar(){return app.getLang()==='ar';}
function tx(a,b){return ar()?a:b;}
function id(x){return document.getElementById(x);}
function esc(v){return app.esc(v);}
function currentUser(){return app.state.profile&&app.state.profile.id;}
function isOpen(){var p=id('notificationPanel');return p&&!p.classList.contains('hidden');}

function inject(){
  if(id('notificationBell'))return;
  var actions=document.querySelector('.top-actions');
  if(!actions)return;

  var wrap=document.createElement('div');
  wrap.className='notification-wrap';
  wrap.id='notificationWrap';
  wrap.innerHTML=
    '<button type="button" class="btn secondary notification-bell" id="notificationBell" aria-label="Notifications">🔔<span class="notification-badge hidden" id="notificationBadge">0</span></button>'+
    '<div class="notification-panel hidden" id="notificationPanel">'+
      '<div class="notification-head"><b id="notificationTitle"></b><button class="close" id="notificationClose">×</button></div>'+
      '<div class="notification-tools">'+
        '<button class="btn secondary mini" id="enablePushBtn"></button>'+
        '<button class="btn secondary mini" id="markAllNotificationsBtn"></button>'+
      '</div>'+
      '<div class="small notification-help" id="notificationHelp"></div>'+
      '<div class="notification-list" id="notificationList"></div>'+
    '</div>';
  actions.insertBefore(wrap,actions.firstChild);

  var st=document.createElement('style');
  st.id='notificationStyles';
  st.textContent=[
    '.notification-wrap{position:relative}',
    '.notification-bell{position:relative;min-width:44px}',
    '.notification-badge{position:absolute;top:-7px;right:-7px;background:#b91c1c;color:#fff;border-radius:999px;min-width:20px;height:20px;padding:0 5px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid #fff}',
    '.notification-panel{position:absolute;z-index:18000;top:calc(100% + 8px);right:0;width:min(420px,92vw);max-height:70vh;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 45px rgba(15,23,42,.22);overflow:hidden}',
    'html[dir="ltr"] .notification-panel{right:0;left:auto}html[dir="rtl"] .notification-panel{left:0;right:auto}',
    '.notification-head{display:flex;align-items:center;justify-content:space-between;padding:12px 12px 8px;border-bottom:1px solid var(--line)}',
    '.notification-tools{display:flex;gap:6px;padding:9px 12px;flex-wrap:wrap}',
    '.notification-help{padding:0 12px 8px;line-height:1.55}',
    '.notification-list{max-height:52vh;overflow:auto;border-top:1px solid var(--line)}',
    '.notification-item{display:block;width:100%;border:0;border-bottom:1px solid var(--line);background:#fff;text-align:inherit;padding:11px 12px;cursor:pointer}',
    '.notification-item:hover{background:#f8fafc}.notification-item.unread{background:#eff6ff}',
    '.notification-item b{display:block;margin-bottom:4px}.notification-item .small{line-height:1.55}',
    '.notification-empty{padding:22px;text-align:center;color:var(--muted)}',
    '@media(max-width:600px){.notification-panel{position:fixed;top:70px;left:10px!important;right:10px!important;width:auto;max-height:78vh}.notification-list{max-height:58vh}}'
  ].join('');
  document.head.appendChild(st);

  bind();
  labels();
}

function labels(){
  inject();
  var wrap=id('notificationWrap');
  if(wrap)wrap.classList.toggle('hidden',!currentUser());
  var bell=id('notificationBell');
  if(bell)bell.setAttribute('aria-label',tx('الإشعارات','Notifications'));
  if(id('notificationTitle'))id('notificationTitle').textContent=tx('الإشعارات','Notifications');
  if(id('enablePushBtn'))id('enablePushBtn').textContent=tx('تفعيل إشعارات الجوال','Enable phone notifications');
  if(id('markAllNotificationsBtn'))id('markAllNotificationsBtn').textContent=tx('تحديد الكل كمقروء','Mark all as read');
  updatePushStatus();
}

function render(){
  labels();
  var list=id('notificationList');
  if(!list)return;
  var unread=items.filter(function(n){return !n.read_at;}).length;
  var badge=id('notificationBadge');
  if(badge){
    badge.textContent=unread>99?'99+':String(unread);
    badge.classList.toggle('hidden',unread===0);
  }
  list.innerHTML=items.length?items.map(function(n){
    return '<button class="notification-item '+(!n.read_at?'unread':'')+'" data-notification-id="'+n.id+'" data-notification-url="'+esc(n.url||'')+'">'+
      '<b>'+esc(n.title)+'</b>'+
      '<div>'+esc(n.body)+'</div>'+
      '<div class="small">'+app.dateTime(n.created_at)+'</div>'+
    '</button>';
  }).join(''):'<div class="notification-empty">'+tx('لا توجد إشعارات.','No notifications.')+'</div>';
}

async function load(){
  if(!currentUser()){items=[];render();return;}
  var res=await sb.from('notifications')
    .select('id,type,title,body,entity_type,entity_id,url,read_at,created_at,push_sent_at')
    .order('created_at',{ascending:false})
    .limit(50);
  if(res.error){console.error(res.error);return;}
  items=res.data||[];
  render();
}

async function markRead(notificationId,url){
  await sb.rpc('mark_notification_read',{p_notification_id:Number(notificationId)});
  var n=items.find(function(x){return Number(x.id)===Number(notificationId);});
  if(n)n.read_at=new Date().toISOString();
  render();
  route(url);
}

async function markAll(){
  var r=await sb.rpc('mark_all_notifications_read');
  if(r.error)return app.flash(r.error.message,true);
  items.forEach(function(n){if(!n.read_at)n.read_at=new Date().toISOString();});
  render();
}

function route(url){
  var target='';
  try{
    var u=new URL(url||'',location.href);
    target=u.searchParams.get('open')||'';
  }catch(_){}
  if(target==='tasks')app.gotoPage('tasks');
  else if(target==='reports')app.gotoPage('reports');
  if(id('notificationPanel'))id('notificationPanel').classList.add('hidden');
}

function urlBase64ToUint8Array(base64String){
  var padding='='.repeat((4-base64String.length%4)%4);
  var base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  var raw=atob(base64);
  return Uint8Array.from(Array.prototype.map.call(raw,function(c){return c.charCodeAt(0);}));
}

async function getRegistration(){
  if(!('serviceWorker' in navigator))throw new Error(tx('المتصفح لا يدعم إشعارات الجوال.','This browser does not support phone notifications.'));
  var reg=await navigator.serviceWorker.register('./sw.js');
  try{await reg.update();}catch(_){}
  return reg;
}

async function updatePushStatus(){
  var btn=id('enablePushBtn'),help=id('notificationHelp');
  if(!btn||!help)return;
  if(!currentUser()){help.textContent='';return;}
  if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window)){
    help.textContent=tx('هذا المتصفح لا يدعم إشعارات Push.','This browser does not support push notifications.');
    btn.disabled=true;
    return;
  }

  if(/iPhone|iPad|iPod/i.test(navigator.userAgent)&&!window.navigator.standalone&&window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches===false){
    help.textContent=tx('على الآيفون: أضف الموقع إلى الشاشة الرئيسية أولاً، ثم افتحه من الأيقونة وفعّل الإشعارات.','On iPhone: add the site to the Home Screen first, then open it from the icon and enable notifications.');
  }else{
    help.textContent=tx('فعّلها مرة واحدة على جوال المندوب؛ بعدها يرتبط هذا الجهاز بحسابه.','Enable once on the representative’s phone; the device will then be linked to that account.');
  }

  try{
    var reg=await navigator.serviceWorker.getRegistration('./');
    var sub=reg?await reg.pushManager.getSubscription():null;
    if(sub&&Notification.permission==='granted'){
      btn.textContent=tx('إشعارات الجوال مفعلة','Phone notifications enabled');
      btn.disabled=true;
      await saveSubscription(sub);
    }else{
      btn.textContent=Notification.permission==='denied'?tx('الإشعارات مرفوضة من المتصفح','Notifications blocked by browser'):tx('تفعيل إشعارات الجوال','Enable phone notifications');
      btn.disabled=Notification.permission==='denied';
    }
  }catch(_){}
}

async function saveSubscription(sub){
  var j=sub.toJSON();
  if(!j.endpoint||!j.keys||!j.keys.p256dh||!j.keys.auth)return;
  var r=await sb.rpc('save_push_subscription',{
    p_endpoint:j.endpoint,
    p_p256dh:j.keys.p256dh,
    p_auth:j.keys.auth,
    p_user_agent:navigator.userAgent
  });
  if(r.error)throw r.error;
}

async function enablePush(){
  if(!currentUser())return;
  try{
    if(!('Notification' in window)||!('PushManager' in window))throw new Error(tx('المتصفح لا يدعم إشعارات Push.','Push notifications are not supported.'));
    var permission=await Notification.requestPermission();
    if(permission!=='granted')throw new Error(tx('لم يتم السماح بالإشعارات من المتصفح.','Notification permission was not granted.'));
    var reg=await getRegistration();
    var sub=await reg.pushManager.getSubscription();
    if(!sub){
      var keyRes=await fetch(VAPID_ENDPOINT,{method:'GET',cache:'no-store'});
      if(!keyRes.ok)throw new Error(tx('تعذر تجهيز إشعارات الجوال.','Could not prepare phone notifications.'));
      var keyData=await keyRes.json();
      sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(keyData.publicKey)});
    }
    await saveSubscription(sub);
    app.flash(tx('تم تفعيل إشعارات الجوال لهذا الحساب على هذا الجهاز.','Phone notifications enabled for this account on this device.'));
    await updatePushStatus();
  }catch(err){
    app.flash((err&&err.message)||tx('تعذر تفعيل الإشعارات.','Could not enable notifications.'),true);
  }
}

function consumeOpenParam(){
  if(!currentUser())return;
  var u=new URL(location.href);
  var target=u.searchParams.get('open');
  if(target==='tasks'||target==='reports'){
    setTimeout(function(){app.gotoPage(target);},100);
    u.searchParams.delete('open');
    history.replaceState({},'',u.pathname+(u.search?u.search:'')+u.hash);
  }
}

function bind(){
  if(window.__danaNotificationBound)return;
  window.__danaNotificationBound=true;
  document.addEventListener('click',function(ev){
    var b=ev.target.closest('#notificationBell');
    if(b){
      var p=id('notificationPanel');
      if(p)p.classList.toggle('hidden');
      if(p&&!p.classList.contains('hidden'))load();
      return;
    }
    if(ev.target.closest('#notificationClose')){if(id('notificationPanel'))id('notificationPanel').classList.add('hidden');return;}
    if(ev.target.closest('#enablePushBtn')){enablePush();return;}
    if(ev.target.closest('#markAllNotificationsBtn')){markAll();return;}
    var item=ev.target.closest('[data-notification-id]');
    if(item){markRead(item.getAttribute('data-notification-id'),item.getAttribute('data-notification-url'));return;}
    if(isOpen()&&!ev.target.closest('#notificationWrap'))id('notificationPanel').classList.add('hidden');
  });
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&currentUser())load();});
}

function startPolling(){
  if(pollTimer)return;
  pollTimer=setInterval(function(){if(currentUser())load();},60000);
}

window.addEventListener('dana:render',function(){
  inject();
  labels();
  consumeOpenParam();
  load();
  startPolling();
});

inject();
labels();
startPolling();
})();