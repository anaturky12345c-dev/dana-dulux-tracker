(function(){
'use strict';

var app=window.DANA_APP;
if(!app||!app.sb)return;
var sb=app.sb;
var followupStates=[];
var tasks=[];
var loading=false;
var initialized=false;
var lastProfileId=null;

function isAr(){return app.getLang()==='ar';}
function tx(ar,en){return isAr()?ar:en;}
function e(v){return app.esc(v);}
function byId(id){return document.getElementById(id);}
function customerFor(id){return app.state.customers.find(function(c){return Number(c.id)===Number(id);})||null;}
function followupFor(id){return followupStates.find(function(x){return Number(x.customer_id)===Number(id);})||null;}
function repName(c){return c&&c.rep&&c.rep.full_name?c.rep.full_name:'-';}
function nowMs(){return Date.now();}
function deadlineMs(v){return v?new Date(v).getTime():0;}
function dateKey(iso){return app.dateKeyRiyadh(iso);}
function today(){return app.todayRiyadh();}
function month(){return app.monthRiyadh();}
function isManagement(){return app.canManage();}
function statusBadge(s){return app.badgeStatus(s);}

function dueLabel(iso){
  if(!iso)return '-';
  var diff=deadlineMs(iso)-nowMs();
  var hours=Math.max(1,Math.ceil(Math.abs(diff)/3600000));
  if(diff<0){
    if(hours<24)return tx('متأخر '+hours+' ساعة','Overdue by '+hours+' hour'+(hours===1?'':'s'));
    var days=Math.ceil(hours/24);
    return tx('متأخر '+days+' يوم','Overdue by '+days+' day'+(days===1?'':'s'));
  }
  if(dateKey(iso)===today())return tx('مطلوب اليوم','Due today');
  if(diff<48*3600000)return tx('متبقي '+hours+' ساعة',hours+' hours remaining');
  return app.dateTime(iso);
}

function taskTypeLabel(k){
  var ar={product_presentation:'عرض منتج',customer_visit:'زيارة عميل',collection:'تحصيل',open_customer:'فتح عميل جديد',deliver_sample:'تسليم عينة',other:'مهمة أخرى'};
  var en={product_presentation:'Product presentation',customer_visit:'Customer visit',collection:'Collection',open_customer:'Open new customer',deliver_sample:'Deliver sample',other:'Other task'};
  return (isAr()?ar:en)[k]||k||'-';
}
function priorityLabel(k){
  var ar={normal:'عادية',high:'عالية',urgent:'عاجلة'};
  var en={normal:'Normal',high:'High',urgent:'Urgent'};
  return (isAr()?ar:en)[k]||k||'-';
}
function taskDerivedStatus(x){
  if(x.status==='completed')return 'completed';
  if(deadlineMs(x.deadline)<nowMs())return 'overdue';
  return x.status;
}
function taskStatusLabel(k){
  var ar={open:'مفتوحة',completed:'مكتملة',overdue:'متأخرة'};
  var en={open:'Open',completed:'Completed',overdue:'Overdue'};
  return (isAr()?ar:en)[k]||k||'-';
}
function taskBadge(k){
  var cls={open:'b-info',completed:'b-good',overdue:'b-bad'}[k]||'b-gray';
  return '<span class="badge '+cls+'">'+e(taskStatusLabel(k))+'</span>';
}
function deadlineInputValue(iso){
  if(!iso)return '';
  var p={};
  new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso)).forEach(function(x){if(x.type!=='literal')p[x.type]=x.value;});
  return p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute;
}
function deadlineIso(v){
  if(!v)return null;
  return new Date(v+':00+03:00').toISOString();
}

function injectStyle(){
  if(byId('workloadStyles'))return;
  var st=document.createElement('style');
  st.id='workloadStyles';
  st.textContent=[
    '.workload-card{margin-top:14px}',
    '.workload-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}',
    '.workload-head h3{margin:0}',
    '.workload-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:9px;margin-bottom:10px}',
    '.workload-metric{border:1px solid var(--line);border-radius:11px;background:#fafafa;padding:11px}',
    '.workload-metric b{display:block;font-size:23px;margin-top:5px}',
    '.workload-list{display:grid;gap:7px}',
    '.workload-row-overdue td{background:#fff7f7}',
    '.due-bad{color:var(--bad)}',
    '.due-ok{color:var(--good)}',
    '.task-actions{display:flex;gap:5px;flex-wrap:wrap}',
    '.workload-note{line-height:1.65}',
    '@media(max-width:600px){.workload-metrics{grid-template-columns:1fr 1fr}}'
  ].join('');
  document.head.appendChild(st);
}

function injectUi(){
  injectStyle();

  var nav=document.querySelector('.nav-grid');
  if(nav&&!nav.querySelector('[data-page="tasks"]')){
    var btn=document.createElement('button');
    btn.setAttribute('data-page','tasks');
    btn.id='tasksNavBtn';
    var reportsBtn=nav.querySelector('[data-page="reports"]');
    if(reportsBtn&&reportsBtn.nextSibling)nav.insertBefore(btn,reportsBtn.nextSibling);else nav.appendChild(btn);
  }

  var dashboard=byId('dashboard');
  if(dashboard&&!byId('workloadFollowupDashboard')){
    var repSummary=dashboard.querySelector('.dashboard-panels');
    var f=document.createElement('div');
    f.className='card workload-card';
    f.id='workloadFollowupDashboard';
    f.innerHTML='<div class="workload-head"><h3 id="workloadFollowupDashboardTitle"></h3><button class="btn secondary mini" id="openFollowupsBtn"></button></div><div class="workload-metrics"><div class="workload-metric"><span id="followTodayLabel"></span><b id="followTodayCount">0</b></div><div class="workload-metric"><span id="followOverdueLabel"></span><b id="followOverdueCount">0</b></div><div class="workload-metric"><span id="followManagementLabel"></span><b id="followManagementCount">0</b></div></div><div id="workloadFollowupPreview" class="workload-list"></div>';
    if(repSummary&&repSummary.nextSibling)dashboard.insertBefore(f,repSummary.nextSibling);else dashboard.appendChild(f);
  }
  if(dashboard&&!byId('workloadTaskDashboard')){
    var f2=document.createElement('div');
    f2.className='card workload-card';
    f2.id='workloadTaskDashboard';
    f2.innerHTML='<div class="workload-head"><h3 id="workloadTaskDashboardTitle"></h3><button class="btn secondary mini" id="openTasksBtn"></button></div><div class="workload-metrics"><div class="workload-metric"><span id="taskTodayLabel"></span><b id="taskTodayCount">0</b></div><div class="workload-metric"><span id="taskOverdueLabel"></span><b id="taskOverdueCount">0</b></div><div class="workload-metric"><span id="taskUpcomingLabel"></span><b id="taskUpcomingCount">0</b></div><div class="workload-metric"><span id="taskCompletedLabel"></span><b id="taskCompletedCount">0</b></div></div><div id="workloadTaskPreview" class="workload-list"></div>';
    var att=dashboard.querySelector('.dashboard-attention');
    if(att&&att.nextSibling)dashboard.insertBefore(f2,att.nextSibling);else dashboard.appendChild(f2);
  }

  var reports=byId('reports');
  if(reports&&!byId('followupQueueCard')){
    var q=document.createElement('div');
    q.className='card workload-card';
    q.id='followupQueueCard';
    q.innerHTML='<div class="workload-head"><h3 id="followupQueueTitle"></h3></div><div class="table-wrap"><table id="followupQueue"><thead><tr><th id="fqCustomer"></th><th id="fqRep"></th><th id="fqStatus"></th><th id="fqOwner"></th><th id="fqDeadline"></th><th id="fqTiming"></th><th id="fqAction"></th></tr></thead><tbody id="followupQueueBody"></tbody></table></div>';
    reports.insertBefore(q,reports.firstChild);
  }

  var main=document.querySelector('main');
  if(main&&!byId('tasks')){
    var sec=document.createElement('section');
    sec.id='tasks';
    sec.className='section';
    sec.innerHTML='<div class="toolbar"><button class="btn" id="newTaskBtn"></button><input id="taskSearch" class="search"><select id="taskStatusFilter"><option value=""></option><option value="open"></option><option value="overdue"></option><option value="completed"></option></select></div><div class="table-wrap"><table id="tasksTable"><thead><tr><th id="thDeadline"></th><th id="thTask"></th><th id="thType"></th><th id="thCustomer"></th><th id="thRep"></th><th id="thPriority"></th><th id="thTaskStatus"></th><th id="thResult"></th><th id="thActions"></th></tr></thead><tbody id="tasksBody"></tbody></table></div>';
    main.appendChild(sec);
  }

  bindEvents();
}

function setText(id,value){
  var x=byId(id);if(x)x.textContent=value;
}
function renderLabels(){
  setText('tasksNavBtn',tx('المهام','Tasks'));
  if(byId('tasks')&&byId('tasks').classList.contains('active'))setText('pageTitle',tx('المهام','Tasks'));
  setText('workloadFollowupDashboardTitle',tx('متابعة العملاء المطلوبة','Required customer follow-ups'));
  setText('openFollowupsBtn',tx('عرض قائمة المتابعات','View follow-up list'));
  setText('followTodayLabel',tx('متابعات اليوم','Follow-ups today'));
  setText('followOverdueLabel',tx('متابعات متأخرة','Overdue follow-ups'));
  setText('followManagementLabel',tx('بانتظار تدخل الإدارة','Waiting for management'));
  setText('workloadTaskDashboardTitle',tx('المهام','Tasks'));
  setText('openTasksBtn',tx('عرض كل المهام','View all tasks'));
  setText('taskTodayLabel',tx('مهام اليوم','Tasks today'));
  setText('taskOverdueLabel',tx('مهام متأخرة','Overdue tasks'));
  setText('taskUpcomingLabel',tx('مهام قادمة','Upcoming tasks'));
  setText('taskCompletedLabel',tx('مكتملة هذا الشهر','Completed this month'));
  setText('followupQueueTitle',tx('المتابعات المطلوبة','Required follow-ups'));
  setText('fqCustomer',tx('العميل','Customer'));
  setText('fqRep',tx('المندوب','Representative'));
  setText('fqStatus',tx('الحالة','Status'));
  setText('fqOwner',tx('المسؤول الآن','Current owner'));
  setText('fqDeadline',tx('الموعد','Deadline'));
  setText('fqTiming',tx('التوقيت','Timing'));
  setText('fqAction',tx('الإجراء','Action'));
  setText('newTaskBtn',tx('+ إضافة مهمة','+ Add Task'));
  var n=byId('newTaskBtn');if(n)n.classList.toggle('hidden',!isManagement());
  var s=byId('taskSearch');if(s)s.placeholder=tx('ابحث بالمهمة أو العميل أو المندوب...','Search task, customer or representative...');
  var f=byId('taskStatusFilter');
  if(f){
    var labs={'':tx('كل حالات المهام','All task statuses'),open:tx('مفتوحة','Open'),overdue:tx('متأخرة','Overdue'),completed:tx('مكتملة','Completed')};
    Array.prototype.forEach.call(f.options,function(o){o.textContent=labs[o.value]||o.value;});
  }
  setText('thDeadline',tx('الموعد النهائي','Deadline'));
  setText('thTask',tx('المهمة','Task'));
  setText('thType',tx('النوع','Type'));
  setText('thCustomer',tx('العميل','Customer'));
  setText('thRep',tx('المندوب','Representative'));
  setText('thPriority',tx('الأولوية','Priority'));
  setText('thTaskStatus',tx('الحالة','Status'));
  setText('thResult',tx('النتيجة','Result'));
  setText('thActions',tx('الإجراءات','Actions'));
  var rf=byId('reportActionFilter');
  if(rf){
    var mr=Array.prototype.find.call(rf.options,function(o){return o.value==='management_response';});
    if(!mr){mr=document.createElement('option');mr.value='management_response';rf.appendChild(mr);}
    mr.textContent=tx('متابعة الإدارة','Management follow-up');
  }
}

function followupRows(){
  return followupStates.map(function(fs){
    return {fs:fs,customer:customerFor(fs.customer_id)};
  }).filter(function(x){
    return x.customer&&x.customer.status!=='active'&&x.fs.next_due_at;
  }).sort(function(a,b){
    return deadlineMs(a.fs.next_due_at)-deadlineMs(b.fs.next_due_at);
  });
}

function followupAction(row,mini){
  var c=row.customer,fs=row.fs,cl=mini?' mini':'';
  if(fs.owner_mode==='management'){
    if(isManagement())return '<button class="btn warn'+cl+'" data-w-resolve="'+c.id+'">'+tx('تسجيل متابعة الإدارة','Record management follow-up')+'</button>';
    return '<span class="badge b-purple">'+tx('بانتظار الإدارة','Waiting for management')+'</span>';
  }
  return '<button class="btn secondary'+cl+'" data-w-follow="'+c.id+'">'+tx('تسجيل متابعة','Record follow-up')+'</button>';
}

function renderFollowups(){
  var rows=followupRows(),body=byId('followupQueueBody');
  if(body){
    body.innerHTML=rows.length?rows.map(function(x){
      var c=x.customer,fs=x.fs,late=deadlineMs(fs.next_due_at)<nowMs();
      return '<tr class="'+(late?'workload-row-overdue':'')+'"><td><b>'+e(c.name)+'</b></td><td>'+e(repName(c))+'</td><td>'+statusBadge(c.status)+'</td><td>'+(fs.owner_mode==='management'?'<span class="badge b-purple">'+tx('الإدارة','Management')+'</span>':'<span class="badge b-info">'+tx('المندوب','Representative')+'</span>')+'</td><td>'+app.dateTime(fs.next_due_at)+'</td><td><b class="'+(late?'due-bad':'due-ok')+'">'+e(dueLabel(fs.next_due_at))+'</b></td><td>'+followupAction(x,true)+'</td></tr>';
    }).join(''):'<tr><td colspan="7" class="empty">'+tx('لا توجد متابعات مطلوبة.','No required follow-ups.')+'</td></tr>';
  }

  var n=nowMs(),td=today();
  var repRows=rows.filter(function(x){return x.fs.owner_mode==='rep';});
  var overdue=repRows.filter(function(x){return deadlineMs(x.fs.next_due_at)<n;});
  var dueToday=repRows.filter(function(x){return deadlineMs(x.fs.next_due_at)>=n&&dateKey(x.fs.next_due_at)===td;});
  var waiting=rows.filter(function(x){return x.fs.owner_mode==='management';});
  setText('followTodayCount',String(dueToday.length));
  setText('followOverdueCount',String(overdue.length));
  setText('followManagementCount',String(waiting.length));

  var preview=overdue.concat(waiting).concat(dueToday);
  var seen={};
  preview=preview.filter(function(x){if(seen[x.customer.id])return false;seen[x.customer.id]=1;return true;}).slice(0,6);
  var p=byId('workloadFollowupPreview');
  if(p)p.innerHTML=preview.length?preview.map(function(x){
    return '<div class="event"><b>'+e(x.customer.name)+'</b><div class="small">'+e(repName(x.customer))+' — '+(x.fs.owner_mode==='management'?tx('بانتظار تدخل الإدارة','Waiting for management'):e(dueLabel(x.fs.next_due_at)))+'</div><div style="margin-top:6px">'+followupAction(x,true)+'</div></div>';
  }).join(''):'<div class="small">'+tx('لا توجد متابعات عاجلة الآن.','No urgent follow-ups right now.')+'</div>';

  var attention=byId('attentionList');
  if(attention){
    attention.innerHTML=waiting.length?waiting.slice(0,8).map(function(x){
      var r=app.state.reports.find(function(y){return Number(y.id)===Number(x.fs.management_report_id);});
      return '<div class="event"><b>'+e(x.customer.name)+'</b><div class="workload-note">'+e(r&&r.note?r.note:'')+'</div><div class="small">'+e(repName(x.customer))+' — '+e(dueLabel(x.fs.next_due_at))+' — '+app.dateTime(x.fs.next_due_at)+'</div><div style="margin-top:6px">'+followupAction(x,true)+'</div></div>';
    }).join(''):'<div class="small">'+tx('لا توجد حالات بانتظار تدخل الإدارة.','No customers are waiting for management intervention.')+'</div>';
  }
}

function renderTasks(){
  var q=(byId('taskSearch')&&byId('taskSearch').value||'').trim().toLowerCase();
  var filter=byId('taskStatusFilter')?byId('taskStatusFilter').value:'';
  var rows=tasks.filter(function(x){
    var ds=taskDerivedStatus(x);
    var hay=(x.title+' '+(x.details||'')+' '+(x.customer&&x.customer.name||'')+' '+(x.rep&&x.rep.full_name||'')+' '+(x.product_code?app.productLabel(x.product_code):'')).toLowerCase();
    return (!filter||ds===filter)&&(!q||hay.indexOf(q)>=0);
  }).sort(function(a,b){
    var aa=taskDerivedStatus(a),bb=taskDerivedStatus(b);
    if(aa==='completed'&&bb!=='completed')return 1;
    if(bb==='completed'&&aa!=='completed')return -1;
    if(aa==='overdue'&&bb!=='overdue')return -1;
    if(bb==='overdue'&&aa!=='overdue')return 1;
    return deadlineMs(a.deadline)-deadlineMs(b.deadline);
  });

  var body=byId('tasksBody');
  if(body){
    body.innerHTML=rows.length?rows.map(function(x){
      var ds=taskDerivedStatus(x),actions=[];
      if(!isManagement()&&x.status!=='completed'){
        actions.push('<button class="btn good mini" data-w-complete-task="'+x.id+'">'+tx('إكمال المهمة','Complete task')+'</button>');
      }
      if(isManagement()){
        if(x.status!=='completed')actions.push('<button class="btn secondary mini" data-w-edit-task="'+x.id+'">'+tx('تعديل','Edit')+'</button>');
        actions.push('<button class="btn bad mini" data-w-delete-task="'+x.id+'">'+tx('حذف','Delete')+'</button>');
      }
      return '<tr class="'+(ds==='overdue'?'workload-row-overdue':'')+'"><td>'+app.dateTime(x.deadline)+(ds==='overdue'?'<div class="small due-bad">'+e(dueLabel(x.deadline))+'</div>':'')+'</td><td><b>'+e(x.title)+'</b>'+(x.details?'<div class="small">'+e(x.details)+'</div>':'')+'</td><td>'+e(taskTypeLabel(x.task_type))+(x.product_code?'<div class="small">'+e(app.productLabel(x.product_code))+'</div>':'')+'</td><td>'+e(x.customer&&x.customer.name||'-')+'</td><td>'+e(x.rep&&x.rep.full_name||'-')+'</td><td>'+e(priorityLabel(x.priority))+'</td><td>'+taskBadge(ds)+'</td><td>'+e(x.result||'-')+'</td><td><div class="task-actions">'+actions.join('')+'</div></td></tr>';
    }).join(''):'<tr><td colspan="9" class="empty">'+tx('لا توجد مهام.','No tasks.')+'</td></tr>';
  }

  var n=nowMs(),td=today();
  var open=tasks.filter(function(x){return x.status!=='completed';});
  var overdue=open.filter(function(x){return taskDerivedStatus(x)==='overdue';});
  var todayTasks=open.filter(function(x){return taskDerivedStatus(x)!=='overdue'&&dateKey(x.deadline)===td;});
  var upcoming=open.filter(function(x){return taskDerivedStatus(x)!=='overdue'&&dateKey(x.deadline)!==td;});
  var completed=tasks.filter(function(x){return x.status==='completed'&&String(x.completed_at||'').slice(0,7)===month();});
  setText('taskTodayCount',String(todayTasks.length));
  setText('taskOverdueCount',String(overdue.length));
  setText('taskUpcomingCount',String(upcoming.length));
  setText('taskCompletedCount',String(completed.length));

  var preview=overdue.concat(todayTasks).concat(upcoming).slice(0,6);
  var p=byId('workloadTaskPreview');
  if(p)p.innerHTML=preview.length?preview.map(function(x){
    return '<div class="event"><b>'+e(x.title)+'</b><div class="small">'+e(x.rep&&x.rep.full_name||'-')+' — '+taskStatusBadge(taskDerivedStatus(x))+' — '+app.dateTime(x.deadline)+'</div></div>';
  }).join(''):'<div class="small">'+tx('لا توجد مهام مفتوحة.','No open tasks.')+'</div>';
}

function renderAll(){
  injectUi();
  renderLabels();
  renderFollowups();
  renderTasks();
}

async function loadAll(){
  if(loading)return;
  if(!app.state.profile){followupStates=[];tasks=[];lastProfileId=null;renderAll();return;}
  var currentProfileId=app.state.profile.id;
  if(lastProfileId&&lastProfileId!==currentProfileId){followupStates=[];tasks=[];renderAll();}
  lastProfileId=currentProfileId;
  loading=true;
  try{
    var results=await Promise.all([
      sb.from('customer_followup_state').select('customer_id,owner_mode,next_due_at,management_report_id,management_requested_at,management_resolved_at,updated_at'),
      sb.from('tasks').select('id,title,details,task_type,assigned_rep,customer_id,product_code,priority,deadline,status,result,created_at,updated_at,completed_at,customer:customers(name),rep:profiles!tasks_assigned_rep_fkey(full_name)').order('deadline',{ascending:true})
    ]);
    if(results[0].error)console.error(results[0].error);else followupStates=results[0].data||[];
    if(results[1].error)console.error(results[1].error);else tasks=results[1].data||[];
    renderAll();
  }finally{
    loading=false;
  }
}

function repOptions(selected){
  return app.state.profiles.filter(function(p){return p.role==='rep';}).map(function(p){
    return '<option value="'+e(p.id)+'" '+(p.id===selected?'selected':'')+'>'+e(p.full_name)+'</option>';
  }).join('');
}
function customerOptions(repId,selected){
  var out='<option value="">'+tx('بدون عميل محدد','No specific customer')+'</option>';
  out+=app.state.customers.filter(function(c){return c.assigned_rep===repId;}).map(function(c){
    return '<option value="'+c.id+'" '+(Number(c.id)===Number(selected)?'selected':'')+'>'+e(c.name)+'</option>';
  }).join('');
  return out;
}
function productOptions(selected){
  var keys=['dulux_emulsion','dulux_oil','leafs_tinting','dulux_polyurethane'];
  var out='<option value="">'+tx('بدون منتج محدد','No specific product')+'</option>';
  out+=keys.map(function(k){
    return '<option value="'+k+'" '+(k===selected?'selected':'')+'>'+e(app.productLabel(k))+'</option>';
  }).join('');
  return out;
}
function typeOptions(selected){
  var keys=['product_presentation','customer_visit','collection','open_customer','deliver_sample','other'];
  return keys.map(function(k){return '<option value="'+k+'" '+(k===selected?'selected':'')+'>'+e(taskTypeLabel(k))+'</option>';}).join('');
}
function priorityOptions(selected){
  var keys=['normal','high','urgent'];
  return keys.map(function(k){return '<option value="'+k+'" '+(k===selected?'selected':'')+'>'+e(priorityLabel(k))+'</option>';}).join('');
}

function openTaskForm(id){
  if(!isManagement())return;
  var x=id?tasks.find(function(z){return Number(z.id)===Number(id);}):null;
  var reps=app.state.profiles.filter(function(p){return p.role==='rep';});
  if(!reps.length)return app.flash(tx('لا يوجد مندوب متاح.','No representative available.'),true);
  var repId=x&&x.assigned_rep?x.assigned_rep:reps[0].id;
  var html='<div class="form-grid">'
    +'<div class="full"><label>'+tx('عنوان المهمة','Task title')+'</label><input id="wTaskTitle" value="'+e(x&&x.title||'')+'"></div>'
    +'<div class="full"><label>'+tx('تفاصيل المهمة','Task details')+'</label><textarea id="wTaskDetails" rows="4">'+e(x&&x.details||'')+'</textarea></div>'
    +'<div><label>'+tx('نوع المهمة','Task type')+'</label><input id="wTaskType" maxlength="20" value="'+e(x&&x.task_type?taskTypeLabel(x.task_type):'')+'" placeholder="'+tx('مثال: عرض منتج','Example: Product demo')+'"><div class="small">'+tx('حد أقصى 20 حرف','Maximum 20 characters')+'</div></div>'
    +'<div><label>'+tx('الأولوية','Priority')+'</label><select id="wTaskPriority">'+priorityOptions(x&&x.priority||'normal')+'</select></div>'
    +'<div><label>'+tx('المندوب','Representative')+'</label><select id="wTaskRep">'+repOptions(repId)+'</select></div>'
    +'<div><label>'+tx('العميل','Customer')+'</label><select id="wTaskCustomer">'+customerOptions(repId,x&&x.customer_id)+'</select></div>'
    +'<div><label>'+tx('المنتج','Product')+'</label><select id="wTaskProduct">'+productOptions(x&&x.product_code)+'</select></div>'
    +'<div><label>'+tx('الموعد النهائي','Deadline')+'</label><input id="wTaskDeadline" type="datetime-local" value="'+e(deadlineInputValue(x&&x.deadline))+'"></div>'
    +'<div class="full"><button class="btn" id="wSaveTask" data-id="'+(x?x.id:'')+'">'+tx('حفظ','Save')+'</button></div>'
    +'</div>';
  app.openModal(x?tx('تعديل المهمة','Edit task'):tx('إضافة مهمة','Add task'),html);
  setTimeout(function(){
    var r=byId('wTaskRep');
    if(r)r.addEventListener('change',function(){
      var c=byId('wTaskCustomer');if(c)c.innerHTML=customerOptions(r.value,null);
    });
  },0);
}

async function saveTask(id){
  var title=(byId('wTaskTitle')&&byId('wTaskTitle').value||'').trim();
  var details=(byId('wTaskDetails')&&byId('wTaskDetails').value||'').trim();
  var type=(byId('wTaskType')&&byId('wTaskType').value||'').trim();
  var rep=byId('wTaskRep')&&byId('wTaskRep').value;
  var customer=byId('wTaskCustomer')&&byId('wTaskCustomer').value||null;
  var product=byId('wTaskProduct')&&byId('wTaskProduct').value||null;
  var priority=byId('wTaskPriority')&&byId('wTaskPriority').value;
  var deadline=byId('wTaskDeadline')&&byId('wTaskDeadline').value;
  if(title.length<3)return app.flash(tx('اكتب عنوان المهمة.','Enter a task title.'),true);
  if(type.length<1||type.length>20)return app.flash(tx('نوع المهمة يجب أن يكون من 1 إلى 20 حرف.','Task type must be 1 to 20 characters.'),true);
  if(!rep)return app.flash(tx('اختر المندوب.','Select a representative.'),true);
  if(!deadline)return app.flash(tx('حدد الموعد النهائي.','Set the deadline.'),true);
  var args={p_title:title,p_details:details||null,p_task_type:type,p_assigned_rep:rep,p_customer_id:customer?Number(customer):null,p_product_code:product,p_priority:priority,p_deadline:deadlineIso(deadline)};
  var res;
  if(id){
    args.p_task_id=Number(id);
    res=await sb.rpc('admin_update_task',args);
  }else{
    res=await sb.rpc('create_task',args);
  }
  if(res.error){
    var msg=res.error.message==='deadline must be in the future'?tx('الموعد النهائي يجب أن يكون في المستقبل.','Deadline must be in the future.'):res.error.message;
    return app.flash(msg,true);
  }
  app.closeModal();
  app.flash(tx('تم حفظ المهمة.','Task saved.'));
  await app.refreshAll();
}

function openCompleteTask(id){
  var x=tasks.find(function(z){return Number(z.id)===Number(id);});if(!x)return;
  app.openModal(tx('إكمال المهمة','Complete task'),'<div><b>'+e(x.title)+'</b></div><div style="margin-top:12px"><label>'+tx('نتيجة المهمة','Task result')+'</label><textarea id="wTaskResult" rows="5"></textarea></div><button class="btn good" style="margin-top:12px" id="wConfirmCompleteTask" data-id="'+x.id+'">'+tx('إكمال المهمة','Complete task')+'</button>');
}
async function completeTask(id){
  var result=(byId('wTaskResult')&&byId('wTaskResult').value||'').trim();
  if(result.length<3)return app.flash(tx('اكتب نتيجة المهمة.','Enter the task result.'),true);
  var res=await sb.rpc('update_task_status',{p_task_id:Number(id),p_status:'completed',p_result:result});
  if(res.error)return app.flash(res.error.message,true);
  app.closeModal();
  app.flash(tx('تم إكمال المهمة.','Task completed.'));
  await app.refreshAll();
}
async function deleteTask(id){
  if(!isManagement()||!confirm(tx('هل أنت متأكد من حذف المهمة؟','Are you sure you want to delete this task?')))return;
  var res=await sb.rpc('admin_delete_task',{p_task_id:Number(id)});
  if(res.error)return app.flash(res.error.message,true);
  app.flash(tx('تم حذف المهمة.','Task deleted.'));
  await app.refreshAll();
}

function openManagementResolution(id){
  if(!isManagement())return;
  var c=customerFor(id),fs=followupFor(id);
  if(!c||!fs||fs.owner_mode!=='management')return app.flash(tx('هذه الحالة لم تعد بانتظار الإدارة.','This customer is no longer waiting for management.'),true);
  var opts='<option value="">'+tx('بدون تغيير الحالة','No status change')+'</option>';
  ['active','hesitant','rejected'].forEach(function(k){
    if(k!==c.status)opts+='<option value="'+k+'">'+e(app.statusLabel(k))+'</option>';
  });
  var html='<div class="security-warn">'+tx('المهلة المحددة لتدخل الإدارة: 48 ساعة.','Management intervention deadline: 48 hours.')+'<br><b>'+e(c.name)+'</b> — '+e(dueLabel(fs.next_due_at))+' — '+app.dateTime(fs.next_due_at)+'</div>'
    +'<div class="form-grid" style="margin-top:12px"><div><label>'+tx('الحالة الحالية','Current status')+'</label><input value="'+e(app.statusLabel(c.status))+'" readonly></div>'
    +'<div><label>'+tx('الحالة الجديدة','New status')+'</label><select id="wManagementStatus">'+opts+'</select></div>'
    +'<div class="full"><label>'+tx('نتيجة متابعة الإدارة','Management follow-up result')+'</label><textarea id="wManagementNote" rows="5"></textarea></div>'
    +'<div class="full"><button class="btn" id="wSaveManagement" data-id="'+c.id+'">'+tx('حفظ المتابعة','Save follow-up')+'</button></div></div>';
  app.openModal(tx('متابعة الإدارة','Management follow-up'),html);
}
async function saveManagementResolution(id){
  var note=(byId('wManagementNote')&&byId('wManagementNote').value||'').trim();
  var st=byId('wManagementStatus')&&byId('wManagementStatus').value||null;
  if(note.length<5)return app.flash(tx('اكتب نتيجة واضحة لمتابعة الإدارة.','Enter a clear management follow-up result.'),true);
  var res=await sb.rpc('resolve_management_intervention',{p_customer_id:Number(id),p_note:note,p_new_status:st});
  if(res.error)return app.flash(res.error.message,true);
  app.closeModal();
  app.flash(tx('تم حفظ متابعة الإدارة.','Management follow-up saved.'));
  await app.refreshAll();
}

function bindEvents(){
  if(initialized)return;
  initialized=true;
  document.addEventListener('click',function(ev){
    var b;
    if((b=ev.target.closest('#tasksNavBtn'))){app.gotoPage('tasks');return;}
    if((b=ev.target.closest('#openFollowupsBtn'))){app.gotoPage('reports');return;}
    if((b=ev.target.closest('#openTasksBtn'))){app.gotoPage('tasks');return;}
    if((b=ev.target.closest('#newTaskBtn'))){openTaskForm(null);return;}
    if((b=ev.target.closest('[data-w-follow]'))){app.openReportForm(Number(b.getAttribute('data-w-follow')));return;}
    if((b=ev.target.closest('[data-w-resolve]'))){openManagementResolution(Number(b.getAttribute('data-w-resolve')));return;}
    if((b=ev.target.closest('[data-w-complete-task]'))){openCompleteTask(Number(b.getAttribute('data-w-complete-task')));return;}
    if((b=ev.target.closest('[data-w-edit-task]'))){openTaskForm(Number(b.getAttribute('data-w-edit-task')));return;}
    if((b=ev.target.closest('[data-w-delete-task]'))){deleteTask(Number(b.getAttribute('data-w-delete-task')));return;}
    if((b=ev.target.closest('#wSaveTask'))){saveTask(b.getAttribute('data-id')||null);return;}
    if((b=ev.target.closest('#wConfirmCompleteTask'))){completeTask(Number(b.getAttribute('data-id')));return;}
    if((b=ev.target.closest('#wSaveManagement'))){saveManagementResolution(Number(b.getAttribute('data-id')));return;}
  });
  document.addEventListener('input',function(ev){
    if(ev.target&&ev.target.id==='taskSearch')renderTasks();
  });
  document.addEventListener('change',function(ev){
    if(ev.target&&ev.target.id==='taskStatusFilter')renderTasks();
  });
}

window.DANA_WORKLOAD={load:loadAll,render:renderAll,getFollowups:function(){return followupStates.slice();},getTasks:function(){return tasks.slice();}};
window.addEventListener('dana:render',function(){injectUi();loadAll();});
injectUi();
renderLabels();
setTimeout(loadAll,0);
})();