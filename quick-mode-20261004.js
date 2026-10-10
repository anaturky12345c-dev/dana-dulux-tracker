(() => {
  'use strict';
  const STORAGE_KEY = 'dana_rep_view_mode_v1';
  const QUICK_CLASS = 'rep-quick-mode';

  function byId(id){ return document.getElementById(id); }
  function isLoggedIn(){
    const login = byId('login');
    return !!login && login.classList.contains('hidden');
  }
  function isRepresentative(){
    if(!isLoggedIn()) return false;
    const role = window.DANA_APP?.state?.profile?.role;
    if(role) return role === 'rep';
    const marker = document.querySelector('.management-only');
    return !!marker && marker.classList.contains('hidden');
  }
  function go(page){
    const btn = document.querySelector('[data-page="' + page + '"]');
    if(btn) btn.click();
  }
  function openDirect(id){
    const el = byId(id);
    if(el) el.click();
  }

  const style = document.createElement('style');
  style.id = 'repQuickModeStyles';
  style.textContent = [
    '#repQuickToggle{display:none;white-space:nowrap}',
    '#repQuickToggle.rep-quick-visible{display:inline-flex;align-items:center;gap:7px}',
    '#repQuickHome{display:none;direction:rtl;text-align:right;margin-bottom:12px}',
    '#repQuickActions{display:none;direction:rtl;text-align:right;margin:12px 0 14px}',
    '#repQuickBottomNav{display:none}',
    '.rep-quick-home-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px}',
    '.rep-quick-home-title h2{margin:0;font-size:24px;line-height:1.25}',
    '.rep-quick-home-title .small{margin-top:4px}',
    '.rep-quick-badge{display:inline-flex;align-items:center;border-radius:999px;padding:7px 11px;background:#ecfdf5;color:#047857;font-weight:800;font-size:12px;border:1px solid #a7f3d0}',
    '.rep-quick-actions-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
    '.rep-quick-action{appearance:none;border:1px solid #d7dee8;background:#fff;border-radius:16px;padding:16px 12px;min-height:82px;cursor:pointer;font:inherit;font-weight:900;color:#172033;box-shadow:0 5px 16px rgba(15,23,42,.05);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}',
    '.rep-quick-action:active{transform:translateY(1px)}',
    '.rep-quick-action .q-icon{font-size:22px;line-height:1}',
    '.rep-quick-action.primary{background:#0f766e;color:#fff;border-color:#0f766e}',
    'body.rep-quick-mode .app{grid-template-columns:1fr!important}',
    'body.rep-quick-mode .app>aside{display:none!important}',
    'body.rep-quick-mode main{width:100%;max-width:none}',
    'body.rep-quick-mode #dashboard.active #repQuickHome,body.rep-quick-mode #dashboard.active #repQuickActions{display:block}',
    'body.rep-quick-mode #dashboard.active .dashboard-cards,body.rep-quick-mode #dashboard.active .rep-summary-panel,body.rep-quick-mode #dashboard.active .goals-v2-shell,body.rep-quick-mode #dashboard.active > .management-only{display:none!important}',
    'body.rep-quick-mode #dashboard.active .dashboard-priority-grid{margin-top:10px}',
    'body.rep-quick-mode #dashboard.active .priority-collapsible{border-radius:14px}',
    'body.rep-quick-mode #dashboard.active .priority-summary{min-height:58px}',
    'body.rep-quick-mode #dashboard.active #marketOpeningDashboardSlot{margin-top:8px}',
    'body.rep-quick-mode #dashboard.active #marketOpeningDashboardSlot:empty{display:none}',
    '@media(max-width:900px){body.rep-quick-mode main{padding-bottom:78px}body.rep-quick-mode .topbar{position:sticky;top:0;z-index:45;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);padding-bottom:10px}body.rep-quick-mode .topbar .top-actions{gap:6px}body.rep-quick-mode #repQuickToggle{min-height:42px;border-radius:12px;font-weight:900}body.rep-quick-mode #dashboard.active{padding-top:4px}.rep-quick-home-title h2{font-size:22px}.rep-quick-actions-grid{grid-template-columns:1fr;gap:9px}.rep-quick-action{min-height:64px;flex-direction:row;justify-content:flex-start;padding:13px 16px;font-size:16px}.rep-quick-action .q-icon{width:30px;text-align:center}body.rep-quick-mode #repQuickBottomNav{display:grid;position:fixed;z-index:70;left:10px;right:10px;bottom:10px;grid-template-columns:1fr 1.22fr 1fr;gap:6px;padding:8px 8px 7px;background:rgba(255,255,255,.97);border:1px solid #dbe3ec;border-radius:18px;box-shadow:0 12px 35px rgba(15,23,42,.16);direction:ltr}#repQuickBottomNav button{appearance:none;border:0;background:transparent;border-radius:12px;min-height:50px;font:inherit;font-size:11px;font-weight:800;color:#526071;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;direction:rtl}#repQuickBottomNav button span:first-child{font-size:19px;line-height:1}#repQuickBottomNav button.rep-quick-main{min-height:62px;margin-top:-14px;border-radius:18px;background:#0f766e;color:#fff;font-size:13px;font-weight:900;box-shadow:0 8px 18px rgba(15,118,110,.24)}#repQuickBottomNav button.rep-quick-main span:first-child{font-size:25px}#repQuickBottomNav button:active{background:#f1f5f9}#repQuickBottomNav button.rep-quick-main:active{background:#115e59}}',
    '@media(max-width:520px){.rep-quick-home-title{align-items:flex-start}.rep-quick-badge{font-size:11px;padding:6px 9px}}'
  ].join('\n');
  document.head.appendChild(style);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'repQuickToggle';
  toggle.className = 'btn secondary';
  toggle.textContent = 'الوضع السريع';
  const topActions = document.querySelector('.top-actions');
  if(topActions) topActions.insertBefore(toggle, topActions.firstChild);

  const dashboard = byId('dashboard');
  const slot = byId('marketOpeningDashboardSlot');
  const priority = dashboard ? dashboard.querySelector('.dashboard-priority-grid') : null;
  const cards = dashboard ? dashboard.querySelector('.dashboard-cards') : null;

  const quickHome = document.createElement('div');
  quickHome.id = 'repQuickHome';
  quickHome.innerHTML = '<div class="rep-quick-home-title"><div><h2>شغلي اليوم</h2><div class="small">المهام والمتابعات المطلوبة منك اليوم في مكان واحد</div></div></div>';
  if(dashboard && slot) dashboard.insertBefore(quickHome, slot);

  const quickActions = document.createElement('div');
  quickActions.id = 'repQuickActions';
  quickActions.innerHTML = '<div class="rep-quick-actions-grid"><button class="rep-quick-action primary" type="button" data-quick-action="customer"><span class="q-icon">＋</span><span>إضافة عميل</span></button><button class="rep-quick-action" type="button" data-quick-action="sale"><span class="q-icon">🧾</span><span>تسجيل سحبية</span></button><button class="rep-quick-action" type="button" data-quick-action="complaint"><span class="q-icon">◉</span><span>رفع شكوى / طلب</span></button></div>';
  if(dashboard){
    if(cards) dashboard.insertBefore(quickActions, cards);
    else if(priority) priority.insertAdjacentElement('afterend', quickActions);
    else dashboard.appendChild(quickActions);
  }

  const bottom = document.createElement('nav');
  bottom.id = 'repQuickBottomNav';
  bottom.setAttribute('aria-label','التنقل السريع');
  bottom.innerHTML = '<button type="button" data-quick-page="customers"><span>👤</span><span>العملاء</span></button><button class="rep-quick-main" type="button" data-quick-page="dashboard"><span>⌂</span><span>الرئيسية</span></button><button type="button" data-quick-page="debtAging"><span>📊</span><span>أعمار الديون</span></button>';
  document.body.appendChild(bottom);

  quickActions.addEventListener('click', function(e){
    const btn = e.target.closest('[data-quick-action]');
    if(!btn) return;
    const action = btn.dataset.quickAction;
    if(action === 'customer') openDirect('newCustomerBtn');
    if(action === 'sale') openDirect('newSaleBtn');
    if(action === 'complaint') openDirect('newComplaintBtn');
  });

  bottom.addEventListener('click', function(e){
    const btn = e.target.closest('[data-quick-page]');
    if(btn) go(btn.dataset.quickPage);
  });

  function applyMode(mode, persist){
    if(persist === undefined) persist = true;
    const allowed = isRepresentative();
    const quick = allowed && mode === 'quick';
    document.body.classList.toggle(QUICK_CLASS, quick);
    toggle.textContent = quick ? 'الوضع الكامل' : 'الوضع السريع';
    toggle.setAttribute('aria-pressed', quick ? 'true' : 'false');
    if(persist && allowed) localStorage.setItem(STORAGE_KEY, quick ? 'quick' : 'full');
    if(!allowed) document.body.classList.remove(QUICK_CLASS);
  }

  toggle.addEventListener('click', function(){
    const quick = document.body.classList.contains(QUICK_CLASS);
    applyMode(quick ? 'full' : 'quick', true);
    if(!quick) go('dashboard');
  });

  let lastRepState = null;
  function syncAvailability(){
    const rep = isRepresentative();
    if(rep !== lastRepState){
      lastRepState = rep;
      toggle.classList.toggle('rep-quick-visible', rep);
      if(rep){
        applyMode('quick', false);
        localStorage.setItem(STORAGE_KEY, 'quick');
        go('dashboard');
      }else applyMode('full', false);
    }
  }

  const observer = new MutationObserver(syncAvailability);
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
  syncAvailability();
  window.setInterval(syncAvailability,1200);
})();