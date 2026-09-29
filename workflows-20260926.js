(function(){
'use strict';

var app=window.DANA_APP;
if(!app||!app.sb)return;
var sb=app.sb;
var followupStates=[];
var salesFollowupStates=[];
var tasks=[];
var loading=false;
var initialized=false;
var TASKS_ENABLED=false;
var lastProfileId=null;

function isAr(){return app.getLang()==='ar';}
function tx(ar,en){return isAr()?ar:en;}
function e(v){return app.esc(v);}
function byId(id){return document.getElementById(id);}
function customerFor(id){return app.state.customers.find(function(c){return Number(c.id)===Number(id);})||null;}
function followupFor(id){return followupStates.find(function(x){return Number(x.customer_id)===Number(id);})||null;}
function salesFollowupFor(id){return salesFollowupStates.find(function(x){return Number(x.customer_id)===Number(id);})||null;}
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
    '.workload-collapsed-head{display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;user-select:none}',
    '.workload-collapsed-head h3{margin:0}',
    '.workload-collapse-count{min-width:30px;text-align:center}',
    '.workload-collapse-arrow{font-size:18px;transition:transform .15s ease}',
    '.workload-collapsed-head.open .workload-collapse-arrow{transform:rotate(180deg)}',
    '.workload-collapse-body{margin-top:12px}',
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
    '.followup-mobile-list{display:none;gap:8px}',
    '.followup-mobile-card{border:1px solid var(--line);border-radius:11px;padding:11px;background:#fff}',
    '.followup-mobile-card .small{margin-top:5px;line-height:1.6}',
    '@media(max-width:600px){.workload-metrics{grid-template-columns:1fr 1fr}.followup-desktop-table{display:none}.followup-mobile-list{display:grid}}'
  ].join('');
  document.head.appendChild(st);
}

function injectUi(){
  injectStyle();

  var nav=document.querySelector('.nav-grid');
  if(TASKS_ENABLED&&nav&&!nav.querySelector('[data-page="tasks"]')){
    var btn=document.createElement('button');
    btn.setAttribute('data-page','tasks');
    btn.id='tasksNavBtn';
    var reportsBtn=nav.querySelector('[data-page="reports"]');
    if(reportsBtn&&reportsBtn.nextSibling)nav.insertBefore(btn,reportsBtn.nextSibling);else nav.appendChild(btn);
  }

  var dashboard=byId('dashboard');
  if(TASKS_ENABLED&&dashboard&&!byId('workloadTaskDashboard')){
    var f2=document.createElement('div');
    f2.className='card workload-card';
    f2.id='workloadTaskDashboard';
    f2.innerHTML='<div class="workload-head"><h3 id="workloadTaskDashboardTitle"></h3><button class="btn secondary mini" id="openTasksBtn"></button></div><div class="workload-metrics"><div class="workload-metric"><span id="taskTodayLabel"></span><b id="taskTodayCount">0</b></div><div class="workload-metric"><span id="taskOverdueLabel"></span><b id="taskOverdueCount">0</b></div><div class="workload-metric"><span id="taskUpcomingLabel"></span><b id="taskUpcomingCount">0</b></div><div class="workload-metric"><span id="taskCompletedLabel"></span><b id="taskCompletedCount">0</b></div></div><div id="workloadTaskPreview" class="workload-list"></div>';
    var att=dashboard.querySelector('.dashboard-attention');
    if(att&&att.nextSibling)dashboard.insertBefore(f2,att.nextSibling);else dashboard.appendChild(f2);
  }

  var main=document.querySelector('main');
  if(TASKS_ENABLED&&main&&!byId('tasks')){
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
function refreshFollowupRepFilter(){
  var el=byId('followupRepFilter'),wrap=byId('followupRepFilterWrap');if(!el)return;
  if(wrap)wrap.classList.toggle('hidden',!isManagement());
  if(!isManagement())return;
  var selected=el.value;
  var reps=app.state.profiles.filter(function(p){return p.role==='rep';});
  el.innerHTML='<option value="">'+tx('كل المندوبين','All Representatives')+'</option>'+
    reps.map(function(p){return '<option value="'+e(p.id)+'">'+e(p.full_name)+'</option>';}).join('');
  if(reps.some(function(p){return p.id===selected;}))el.value=selected;
}
function renderLabels(){
  setText('requiredFollowupTitle',tx('المتابعات المطلوبة','Required Sales Follow-ups'));
  setText('requiredFollowupHint',tx('للعملاء المترددين والرافضين — كل 3 أيام عمل، من السبت إلى الخميس.','For hesitant and rejected customers — every 3 workdays, Saturday through Thursday.'));
  setText('rfCustomer',tx('العميل','Customer'));
  setText('rfRep',tx('المندوب','Representative'));
  setText('rfStatus',tx('الحالة','Status'));
  setText('rfDue',tx('موعد المتابعة','Follow-up due'));
  setText('rfTiming',tx('التوقيت','Timing'));
  setText('rfAction',tx('الإجراء','Action'));
  refreshFollowupRepFilter();
  if(TASKS_ENABLED)setText('tasksNavBtn',tx('المهام','Tasks'));
  if(byId('tasks')&&byId('tasks').classList.contains('active'))setText('pageTitle',tx('المهام','Tasks'));
  setText('workloadTaskDashboardTitle',tx('المهام','Tasks'));
  setText('openTasksBtn',tx('عرض كل المهام','View all tasks'));
  setText('taskTodayLabel',tx('مهام اليوم','Tasks today'));
  setText('taskOverdueLabel',tx('مهام متأخرة','Overdue tasks'));
  setText('taskUpcomingLabel',tx('مهام قادمة','Upcoming tasks'));
  setText('taskCompletedLabel',tx('مكتملة هذا الشهر','Completed this month'));
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

function managementRows(){
  return followupStates.map(function(fs){
    return {fs:fs,customer:customerFor(fs.customer_id)};
  }).filter(function(x){
    return x.customer&&x.fs.owner_mode==='management'&&x.fs.next_due_at;
  }).sort(function(a,b){
    return deadlineMs(a.fs.next_due_at)-deadlineMs(b.fs.next_due_at);
  });
}

function salesFollowupRows(){
  return salesFollowupStates.map(function(fs){
    return {fs:fs,customer:customerFor(fs.customer_id)};
  }).filter(function(x){
    return x.customer&&['hesitant','rejected'].includes(x.customer.status)&&x.fs.next_due_at;
  }).sort(function(a,b){
    return deadlineMs(a.fs.next_due_at)-deadlineMs(b.fs.next_due_at);
  });
}

function followupAction(row,mini){
  var c=row.customer,cl=mini?' mini':'';
  return '<button class="btn secondary'+cl+'" data-sales-followup="'+c.id+'">'+tx('تسجيل متابعة','Record follow-up')+'</button>';
}

function renderFollowups(){
  var repFilter=byId('followupRepFilter')?byId('followupRepFilter').value:'';
  var salesRows=salesFollowupRows().filter(function(x){return !repFilter||x.customer.assigned_rep===repFilter;});
  var body=byId('requiredFollowupBody');

  setText('requiredFollowupCount',String(salesRows.length));

  if(body){
    body.innerHTML=salesRows.length?salesRows.map(function(x){
      var c=x.customer,fs=x.fs,late=deadlineMs(fs.next_due_at)<nowMs();
      return '<tr class="'+(late?'workload-row-overdue':'')+'">'
        +'<td><b>'+e(c.name)+'</b></td>'
        +'<td>'+e(repName(c))+'</td>'
        +'<td>'+statusBadge(c.status)+'</td>'
        +'<td>'+app.dateTime(fs.next_due_at)+'</td>'
        +'<td><b class="'+(late?'due-bad':'due-ok')+'">'+e(dueLabel(fs.next_due_at))+'</b></td>'
        +'<td>'+followupAction(x,true)+'</td>'
        +'</tr>';
    }).join(''):'<tr><td colspan="6" class="empty">'+tx('لا توجد متابعات مطلوبة حالياً.','No required follow-ups right now.')+'</td></tr>';
  }

  var mobile=byId('requiredFollowupMobile');
  if(mobile){
    mobile.innerHTML=salesRows.length?salesRows.map(function(x){
      var c=x.customer,fs=x.fs,late=deadlineMs(fs.next_due_at)<nowMs();
      return '<div class="followup-mobile-card">'
        +'<div class="dashboard-head" style="margin-bottom:5px"><b>'+e(c.name)+'</b>'+statusBadge(c.status)+'</div>'
        +'<div class="small">'+tx('المندوب: ','Representative: ')+e(repName(c))+'</div>'
        +'<div class="small">'+tx('موعد المتابعة: ','Follow-up due: ')+app.dateTime(fs.next_due_at)+'</div>'
        +'<div class="small '+(late?'due-bad':'due-ok')+'"><b>'+e(dueLabel(fs.next_due_at))+'</b></div>'
        +'<div style="margin-top:8px">'+followupAction(x,true)+'</div></div>';
    }).join(''):'<div class="small">'+tx('لا توجد متابعات مطلوبة حالياً.','No required follow-ups right now.')+'</div>';
  }

  var waiting=managementRows();
  setText('attentionCount',String(waiting.length));
  setText('attentionSub',waiting.length?tx('طلبات تدخل إدارة مفتوحة — المهلة 3 أيام عمل.','Open management-intervention requests — 3-workday deadline.'):tx('لا توجد حالات مفتوحة تحتاج تدخل الإدارة.','No open management-intervention cases.'));

  var attention=byId('attentionList');
  if(attention){
    attention.innerHTML=waiting.length?waiting.slice(0,8).map(function(x){
      var r=app.state.reports.find(function(y){return Number(y.id)===Number(x.fs.management_report_id);});
      return '<button type="button" class="attention-item" data-w-resolve="'+x.customer.id+'">'
        +'<span class="attention-main"><b>'+e(x.customer.name)+'</b><span>'+e(r&&r.note?r.note:'')+'</span></span>'
        +'<span class="attention-meta">'+e(repName(x.customer))+'<small>'+e(dueLabel(x.fs.next_due_at))+' — '+app.dateTime(x.fs.next_due_at)+'</small></span>'
        +'<span class="attention-open">'+tx('رد الإدارة','Respond')+'</span></button>';
    }).join(''):'<div class="attention-empty">'+tx('لا توجد حالات تحتاج تدخل الإدارة حالياً.','No cases need management intervention right now.')+'</div>';
  }
}


function renderTasks(){
  if(!TASKS_ENABLED)return;
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
  if(!app.state.profile){followupStates=[];salesFollowupStates=[];tasks=[];lastProfileId=null;renderAll();return;}
  var currentProfileId=app.state.profile.id;
  if(lastProfileId&&lastProfileId!==currentProfileId){followupStates=[];salesFollowupStates=[];tasks=[];renderAll();}
  lastProfileId=currentProfileId;
  loading=true;
  try{
    var results=await Promise.all([
      sb.from('customer_followup_state').select('customer_id,owner_mode,next_due_at,management_report_id,management_requested_at,management_resolved_at,updated_at'),
      sb.from('sales_followup_state').select('customer_id,next_due_at,updated_at'),
      sb.from('tasks').select('id,title,details,task_type,assigned_rep,customer_id,product_code,priority,deadline,status,result,created_at,updated_at,completed_at,customer:customers(name),rep:profiles!tasks_assigned_rep_fkey(full_name)').order('deadline',{ascending:true})
    ]);
    if(results[0].error)console.error(results[0].error);else followupStates=results[0].data||[];
    if(results[1].error)console.error(results[1].error);else salesFollowupStates=results[1].data||[];
    if(results[2].error)console.error(results[2].error);else tasks=results[2].data||[];
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
  var html='<div class="security-warn">'+tx('هذه متابعة خدمة فقط ولا تغيّر حالة العميل. المهلة المحددة لتدخل الإدارة: 3 أيام عمل (السبت إلى الخميس).','This is a service response only and does not change customer status. Management intervention deadline: 3 workdays (Saturday through Thursday).')+'<br><b>'+e(c.name)+'</b> — '+e(dueLabel(fs.next_due_at))+' — '+app.dateTime(fs.next_due_at)+'</div>'
    +'<div class="form-grid" style="margin-top:12px"><div class="full"><label>'+tx('رد / نتيجة متابعة الإدارة','Management response / result')+'</label><textarea id="wManagementNote" rows="5"></textarea></div>'
    +'<div class="full"><button class="btn" id="wSaveManagement" data-id="'+c.id+'">'+tx('حفظ رد الإدارة','Save management response')+'</button></div></div>';
  app.openModal(tx('رد الإدارة','Management Response'),html);
}
async function saveManagementResolution(id){
  var note=(byId('wManagementNote')&&byId('wManagementNote').value||'').trim();
  if(note.length<5)return app.flash(tx('اكتب نتيجة واضحة لمتابعة الإدارة.','Enter a clear management response.'),true);
  var res=await sb.rpc('resolve_management_intervention',{p_customer_id:Number(id),p_note:note,p_new_status:null});
  if(res.error)return app.flash(res.error.message,true);
  app.closeModal();
  app.flash(tx('تم حفظ رد الإدارة بدون تغيير حالة العميل.','Management response saved without changing customer status.'));
  await app.refreshAll();
}

function toggleFollowupDashboard(){
  var body=byId('workloadFollowupBody'),head=byId('workloadFollowupToggle');if(!body||!head)return;
  var opening=body.classList.contains('hidden');
  body.classList.toggle('hidden',!opening);
  head.classList.toggle('open',opening);
  head.setAttribute('aria-expanded',opening?'true':'false');
}
function toggleFollowupQueue(){
  var body=byId('followupQueueContent'),head=byId('followupQueueToggle');if(!body||!head)return;
  var opening=body.classList.contains('hidden');
  body.classList.toggle('hidden',!opening);
  head.classList.toggle('open',opening);
  head.setAttribute('aria-expanded',opening?'true':'false');
}

function bindEvents(){
  if(initialized)return;
  initialized=true;
  document.addEventListener('click',function(ev){
    var b;
    if((b=ev.target.closest('[data-sales-followup]'))){app.openSalesFollowupForm(Number(b.getAttribute('data-sales-followup')));return;}
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
    if(ev.target&&ev.target.id==='followupRepFilter')renderFollowups();
    if(ev.target&&ev.target.id==='followupRepFilter')renderFollowups();
  });
}

window.DANA_WORKLOAD={load:loadAll,render:renderAll,getFollowups:function(){return salesFollowupStates.slice();},getManagementCases:function(){return followupStates.slice();},getTasks:function(){return tasks.slice();}};
window.addEventListener('dana:render',function(){injectUi();loadAll();});
injectUi();
renderLabels();
setTimeout(loadAll,0);
})();