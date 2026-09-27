(function(){
'use strict';

var app=window.DANA_APP;
if(!app)return;

var map=new Map();
function add(ar,en,ur){
  if(ar)map.set(ar,ur);
  if(en)map.set(en,ur);
}

[
['دانة التاج','Dana Al-Taj','دانة التاج'],
['إدارة مبيعات ديلوكس','Dulux Sales Management','ڈیلکس سیلز مینجمنٹ'],
['نظام إدارة مبيعات ديلوكس','Dulux Sales Management','ڈیلکس سیلز مینجمنٹ'],
['دخول','Sign in','لاگ اِن'],
['تسجيل خروج','Sign out','لاگ آؤٹ'],
['لوحة المتابعة','Dashboard','ڈیش بورڈ'],
['العملاء','Customers','گاہک'],
['السحوبات / الفواتير','Sales / Withdrawals','فروخت / نکاسی'],
['متابعة العملاء','Customer Follow-ups','گاہکوں کی فالو اَپ'],
['الخريطة','Customer Map','گاہکوں کا نقشہ'],
['التقارير','Reports','رپورٹس'],
['سجل العمليات','Activity Log','کارروائیوں کا ریکارڈ'],
['حسابي','My Account','میرا اکاؤنٹ'],
['جديد','New','نیا'],
['نشط','Active','فعال'],
['متردد','Hesitant','متردد'],
['رافض','Rejected','انکار کیا'],
['بدون تغيير الحالة','No status change','حالت تبدیل نہ کریں'],
['تدخل من قبل الإدارة','Management intervention','انتظامیہ کی مداخلت'],
['مراجعة العميل الأسبوع القادم','Review customer next week','اگلے ہفتے گاہک سے فالو اَپ'],
['العميل يريد عينة المنتج','Customer requests product sample','گاہک پروڈکٹ کا نمونہ چاہتا ہے'],
['العميل تم الاتفاق معه','Agreement reached with customer','گاہک سے اتفاق ہو گیا'],
['متابعة الإدارة','Management follow-up','انتظامیہ کی فالو اَپ'],
['اميلشن ديلوكس','Dulux Emulsion','ڈیلکس ایمولشن'],
['زياتي ديلوكس','Dulux Oil-Based','ڈیلکس آئل بیسڈ'],
['تلوينة ليفز','Leafs Tinting','لیفز ٹنٹنگ'],
['بلوريثان ديلوكس','Dulux Polyurethane','ڈیلکس پولی یوریتھین'],
['الشركة','Company','کمپنی'],
['عملاء جدد','New customers','نئے گاہک'],
['عملاء جدد نشطين','Active new customers','فعال نئے گاہک'],
['إجمالي المبيعات','Total sales','کل فروخت'],
['الهدف','Goal','ہدف'],
['المحقق','Achieved','حاصل شدہ'],
['المتبقي','Remaining','باقی'],
['النسبة','Progress','پیش رفت'],
['تعديل','Edit','ترمیم'],
['حذف','Delete','حذف'],
['حفظ','Save','محفوظ کریں'],
['إلغاء','Cancel','منسوخ'],
['عرض','View','دیکھیں'],
['إغلاق','Close','بند کریں'],
['إضافة','Add','شامل کریں'],
['العميل','Customer','گاہک'],
['المندوب','Representative','مندوب'],
['المنطقة','Area','علاقہ'],
['تاريخ الإضافة','Date Added','شامل کرنے کی تاریخ'],
['الجوال','Phone','موبائل'],
['الحالة','Status','حالت'],
['الإجراء','Action','کارروائی'],
['التقرير / السبب','Report / Reason','رپورٹ / وجہ'],
['المنتج','Product','پروڈکٹ'],
['الكمية','Quantity','مقدار'],
['القيمة','Value','قیمت'],
['المرجع','Reference','حوالہ'],
['التاريخ','Date','تاریخ'],
['إجمالي العملاء','Total Customers','کل گاہک'],
['سحوبات الشهر','Sales This Month','اس ماہ کی فروخت'],
['العملاء النشطون','Active Customers','فعال گاہک'],
['العملاء المترددون','Hesitant Customers','متردد گاہک'],
['العملاء الرافضون','Rejected Customers','انکار کرنے والے گاہک'],
['اضغط للعرض','Click to view','دیکھنے کے لیے دبائیں'],
['ملخص المناديب اليومي','Daily Representative Summary','مندوبین کا روزانہ خلاصہ'],
['حالات تحتاج تدخل الإدارة','Management Intervention','انتظامیہ کی مداخلت'],
['الأهداف','Goals','اہداف'],
['الشهر الحالي','Current month','موجودہ مہینہ'],
['تعديل الأهداف','Edit Goals','اہداف میں ترمیم'],
['أداء المندوبين','Representative Performance','مندوبین کی کارکردگی'],
['كل الحالات','All Statuses','تمام حالتیں'],
['ابحث باسم العميل أو المنطقة...','Search customer or area...','گاہک یا علاقہ تلاش کریں...'],
['+ عميل جديد','+ New Customer','+ نیا گاہک'],
['عدد سحوبات الشهر','Sales Count This Month','اس ماہ فروخت کی تعداد'],
['قيمة سحوبات الشهر','Sales Value This Month','اس ماہ فروخت کی قیمت'],
['+ تسجيل سحب / فاتورة','+ Record Sale / Withdrawal','+ فروخت / نکاسی درج کریں'],
['ابحث بالعميل أو المنتج أو المرجع...','Search customer, product or reference...','گاہک، پروڈکٹ یا حوالہ تلاش کریں...'],
['كل التواريخ','All Dates','تمام تاریخیں'],
['هذا اليوم','Today','آج'],
['هذا الأسبوع','This Week','اس ہفتے'],
['هذا الشهر','This Month','اس ماہ'],
['+ إضافة متابعة','+ Add Follow-up','+ فالو اَپ شامل کریں'],
['كل الإجراءات','All Actions','تمام کارروائیاں'],
['وقت التسجيل','Recorded At','اندراج کا وقت'],
['الحالة السابقة','Previous Status','پچھلی حالت'],
['الحالة الجديدة','New Status','نئی حالت'],
['نوع التقرير','Report Type','رپورٹ کی قسم'],
['كل المندوبين','All Representatives','تمام مندوبین'],
['من تاريخ','From','شروع'],
['إلى تاريخ','To','اختتام'],
['عرض التقرير','Generate Report','رپورٹ دکھائیں'],
['تصدير PDF / طباعة','Export PDF / Print','PDF / پرنٹ'],
['اسم المستخدم','Username','صارف نام'],
['كلمة المرور','Password','پاس ورڈ'],
['أمان الحساب','Account Security','اکاؤنٹ سیکیورٹی'],
['لا توجد بيانات.','No data.','کوئی ڈیٹا نہیں۔'],
['الوقت','Time','وقت'],
['المستخدم','User','صارف'],
['الكيان','Entity','ریکارڈ'],
['التفاصيل','Details','تفصیلات'],
['الإجراءات','Actions','کارروائیاں'],
['كل العملاء','All Customers','تمام گاہک'],
['سحب متكرر هذا الشهر','Repeated sale this month','اس ماہ ایک سے زیادہ فروخت'],
['سحب متكرر','Repeated sale','بار بار فروخت'],
['المبيعات والسحوبات','Sales / Withdrawals','فروخت / نکاسی'],
['حركة العملاء','Customer Activity','گاہکوں کی سرگرمی'],
['أداء الأهداف','Goal Performance','اہداف کی کارکردگی'],
['التقرير الإداري الشامل','Management Summary','انتظامی خلاصہ'],
['تقرير المبيعات والسحوبات','Sales / Withdrawals Report','فروخت / نکاسی رپورٹ'],
['عدد المتابعات','Follow-ups','فالو اَپس'],
['تقرير متابعة العملاء','Customer Follow-up Report','گاہک فالو اَپ رپورٹ'],
['تقرير حركة العملاء','Customer Activity Report','گاہک سرگرمی رپورٹ'],
['تقرير أداء المندوبين','Representative Performance Report','مندوب کی کارکردگی رپورٹ'],
['تقرير أداء الأهداف','Goal Performance Report','اہداف کی کارکردگی رپورٹ'],
['شركة دانة التاج التجارية','Dana Al-Taj Trading Company','دانة التاج ٹریڈنگ کمپنی'],
['تاريخ إعداد التقرير','Report date','رپورٹ کی تاریخ'],
['تعديل الموقع','Edit Location','مقام میں ترمیم'],
['تغيير الحالة','Change Status','حالت تبدیل کریں'],
['موقع العميل','Customer Location','گاہک کا مقام'],
['فتح في Google Maps','Open in Google Maps','Google Maps میں کھولیں'],
['غير متوفر','Not available','دستیاب نہیں'],
['آخر سحب','Last Sale','آخری فروخت'],
['تاريخ حالة العميل','Customer Status History','گاہک کی حالت کی تاریخ'],
['بداية','Initial','ابتدائی'],
['إضافة عميل جديد','Add New Customer','نیا گاہک شامل کریں'],
['الحالة الأولية','Initial Status','ابتدائی حالت'],
['سبب الحالة','Status reason','حالت کی وجہ'],
['اكتب السبب بوضوح...','Enter the reason clearly...','وجہ واضح لکھیں...'],
['موقع العميل على الخريطة','Customer Location','گاہک کا مقام'],
['اختر الموقع على الخريطة أو استخدم موقعك الحالي.','Choose the location on the map or use your current location.','نقشے پر مقام منتخب کریں یا اپنا موجودہ مقام استعمال کریں۔'],
['موقعي الحالي','My Location','میرا مقام'],
['سبب تردد العميل','Reason for hesitation','تردد کی وجہ'],
['سبب رفض العميل','Reason for rejection','انکار کی وجہ'],
['تعديل العميل','Edit Customer','گاہک میں ترمیم'],
['تغيير حالة العميل','Change Customer Status','گاہک کی حالت تبدیل کریں'],
['الحالة الحالية','Current Status','موجودہ حالت'],
['تعديل موقع العميل','Edit Customer Location','گاہک کے مقام میں ترمیم'],
['تسجيل سحب / فاتورة','Record Sale / Withdrawal','فروخت / نکاسی درج کریں'],
['تعديل السحب','Edit Sale','فروخت میں ترمیم'],
['إضافة متابعة عميل','Add Customer Follow-up','گاہک کی فالو اَپ شامل کریں'],
['تعديل المتابعة','Edit Follow-up','فالو اَپ میں ترمیم'],
['كلمة المرور الحالية','Current Password','موجودہ پاس ورڈ'],
['كلمة المرور الجديدة','New Password','نیا پاس ورڈ'],
['تأكيد كلمة المرور الجديدة','Confirm New Password','نئے پاس ورڈ کی تصدیق'],
['تغيير كلمة المرور','Change Password','پاس ورڈ تبدیل کریں'],
['تغيير كلمة المرور مطلوب','Password change required','پاس ورڈ تبدیل کرنا ضروری ہے'],
['كلمة المرور الحالية','Current password','موجودہ پاس ورڈ'],
['كلمة المرور الجديدة','New password','نیا پاس ورڈ'],
['تأكيد كلمة المرور','Confirm password','پاس ورڈ کی تصدیق'],
['تغيير كلمة المرور والمتابعة','Change password and continue','پاس ورڈ تبدیل کریں اور جاری رکھیں'],
['لم تُسجل بعد','Not recorded yet','ابھی درج نہیں ہوا'],
['متابعات العملاء المطلوبة','Required customer follow-ups','ضروری گاہک فالو اَپس'],
['عرض قائمة المتابعات','View follow-up list','فالو اَپ فہرست دیکھیں'],
['متابعات اليوم','Follow-ups today','آج کی فالو اَپس'],
['متابعات متأخرة','Overdue follow-ups','تاخیر شدہ فالو اَپس'],
['بانتظار الإدارة','Waiting for management','انتظامیہ کے انتظار میں'],
['المتابعات المطلوبة','Required follow-ups','ضروری فالو اَپس'],
['المالك الحالي','Current owner','موجودہ ذمہ دار'],
['الموعد','Deadline','آخری وقت'],
['التوقيت','Timing','وقت'],
['متابعة الإدارة','Management follow-up','انتظامیہ کی فالو اَپ'],
['تسجيل متابعة الإدارة','Record management follow-up','انتظامیہ کی فالو اَپ درج کریں'],
['تسجيل متابعة','Record follow-up','فالو اَپ درج کریں'],
['الإدارة','Management','انتظامیہ'],
['لا توجد متابعات مطلوبة.','No required follow-ups.','کوئی ضروری فالو اَپ نہیں۔'],
['لا توجد متابعات عاجلة حالياً.','No urgent follow-ups right now.','اس وقت کوئی فوری فالو اَپ نہیں۔'],
['لا يوجد عملاء بانتظار تدخل الإدارة.','No customers are waiting for management intervention.','کوئی گاہک انتظامیہ کی مداخلت کے انتظار میں نہیں۔'],
['مطلوب اليوم','Due today','آج مطلوب ہے']
].forEach(function(x){add(x[0],x[1],x[2]);});

function active(){
  return !!(app.state&&app.state.profile&&app.state.profile.username==='yaqoub');
}

function dynamicText(s){
  var x=s;
  var m;
  if((m=x.match(/^متأخر (\d+) ساعة$/))||(m=x.match(/^Overdue by (\d+) hours?$/)))return m[1]+' گھنٹے تاخیر';
  if((m=x.match(/^متأخر (\d+) يوم$/))||(m=x.match(/^Overdue by (\d+) days?$/)))return m[1]+' دن تاخیر';
  if((m=x.match(/^متبقي (\d+) ساعة$/))||(m=x.match(/^(\d+) hours remaining$/)))return m[1]+' گھنٹے باقی';
  if(/^عملاء جدد اليوم: /.test(x)||/^New customers today: /.test(x)){
    return x
      .replace(/^عملاء جدد اليوم: |^New customers today: /,'آج نئے گاہک: ')
      .replace(' — منهم نشطين: ',' — فعال: ')
      .replace(' — active: ',' — فعال: ')
      .replace(' — سحوبات اليوم: ',' — آج کی فروخت: ')
      .replace(" — today's sales: ",' — آج کی فروخت: ')
      .replace(' — متابعات اليوم: ',' — آج کی فالو اَپس: ')
      .replace(" — today's follow-ups: ",' — آج کی فالو اَپس: ');
  }
  if(/^كلمة المرور: /.test(x)||/^Password: /.test(x)){
    return x
      .replace(/^كلمة المرور: |^Password: /,'پاس ورڈ: ')
      .replace('يجب تغييرها','تبدیلی ضروری')
      .replace('Change required','تبدیلی ضروری')
      .replace('محدثة','اپ ڈیٹ')
      .replace('Updated','اپ ڈیٹ')
      .replace('آخر تغيير: ','آخری تبدیلی: ')
      .replace('Last change: ','آخری تبدیلی: ')
      .replace('الجلسة تُغلق بعد ساعة من عدم الاستخدام وبحد أقصى 8 ساعات.','ایک گھنٹہ غیر فعال رہنے پر سیشن بند ہوگا، زیادہ سے زیادہ 8 گھنٹے۔')
      .replace('Session closes after 1 hour of inactivity and after a maximum of 8 hours.','ایک گھنٹہ غیر فعال رہنے پر سیشن بند ہوگا، زیادہ سے زیادہ 8 گھنٹے۔');
  }
  return map.get(x)||x;
}

function translateTextNode(node){
  if(!active()||!node||node.nodeType!==Node.TEXT_NODE)return;
  var raw=node.nodeValue||'';
  var trimmed=raw.trim();
  if(!trimmed)return;
  var translated=dynamicText(trimmed);
  if(translated!==trimmed){
    node.nodeValue=raw.replace(trimmed,translated);
  }
}

function translateElement(el){
  if(!active()||!el||el.nodeType!==Node.ELEMENT_NODE)return;
  ['placeholder','title','aria-label'].forEach(function(attr){
    if(el.hasAttribute&&el.hasAttribute(attr)){
      var v=el.getAttribute(attr)||'',nv=dynamicText(v.trim());
      if(nv!==v.trim())el.setAttribute(attr,nv);
    }
  });
  if((el.tagName==='INPUT'||el.tagName==='BUTTON')&&el.value){
    var nv=dynamicText(String(el.value).trim());
    if(nv!==String(el.value).trim())el.value=nv;
  }
}

function translateTree(root){
  if(!active())return;
  document.documentElement.lang='ur';
  document.documentElement.dir='rtl';
  var lb=document.getElementById('langBtn');
  if(lb)lb.classList.add('hidden');
  if(root&&root.nodeType===Node.TEXT_NODE){translateTextNode(root);return;}
  if(root&&root.nodeType===Node.ELEMENT_NODE)translateElement(root);
  var walker=document.createTreeWalker(root||document.body,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
  var n;
  while((n=walker.nextNode())){
    if(n.nodeType===Node.TEXT_NODE)translateTextNode(n);else translateElement(n);
  }
}

var observer=new MutationObserver(function(muts){
  if(!active())return;
  muts.forEach(function(m){
    if(m.type==='characterData')translateTextNode(m.target);
    Array.prototype.forEach.call(m.addedNodes||[],function(n){translateTree(n);});
  });
});

function refresh(){
  if(active()){
    translateTree(document.body);
  }
}

observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:false});
window.addEventListener('dana:render',function(){setTimeout(refresh,0);});
document.addEventListener('click',function(){if(active())setTimeout(refresh,0);},true);
setInterval(refresh,1500);
})();