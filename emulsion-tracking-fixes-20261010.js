(function(){
'use strict';
const app=window.DANA_APP;if(!app||!app.state)return;
const isYaqoub=()=>String(app.state?.profile?.username||'').toLowerCase()==='yaqoub';
const urdu=new Map([
 ['سبب حالة العميل — تسجيل صوتي','گاہک کی حالت کی وجہ — آواز کی ریکارڈنگ'],
 ['إلزامي • بحد أقصى دقيقتين','ضروری • زیادہ سے زیادہ 2 منٹ'],
 ['ابدأ التسجيل','ریکارڈنگ شروع کریں'],
 ['إيقاف التسجيل','ریکارڈنگ بند کریں'],
 ['إعادة التسجيل','دوبارہ ریکارڈ کریں'],
 ['اضغط واذكر السبب بوضوح','دبائیں اور وجہ واضح طور پر بتائیں'],
 ['جاري التسجيل...','ریکارڈنگ جاری ہے...'],
 ['تم التسجيل — اسمعه قبل الحفظ','ریکارڈنگ مکمل — محفوظ کرنے سے پہلے سنیں'],
 ['حذف وإعادة','حذف کریں اور دوبارہ ریکارڈ کریں'],
 ['تفاصيل إضافية — اختياري','اضافی تفصیلات — اختیاری'],
 ['اكتب ملاحظة إضافية إذا احتجت...','اگر ضرورت ہو تو اضافی نوٹ لکھیں...'],
 ['المنتج المتفق عليه','طے شدہ پروڈکٹ'],
 ['لا يمكن حفظ «متفق – بانتظار الطلبية» بدون تحديد المنتج.','پروڈکٹ منتخب کیے بغیر "متفق — آرڈر کا انتظار" محفوظ نہیں ہو سکتا۔'],
 ['حدد المنتج الذي اتفق عليه العميل قبل الحفظ.','محفوظ کرنے سے پہلے طے شدہ پروڈکٹ منتخب کریں۔'],
 ['بيانات العميل','گاہک کی معلومات'],
 ['ملخص السحوبات','آرڈرز کا خلاصہ'],
 ['الإجراءات','کارروائیاں'],
 ['وضع العميل التجاري','گاہک کی تجارتی حالت'],
 ['نشاط الإميلشن','ایمولشن سرگرمی'],
 ['آخر طلبية إميلشن','آخری ایمولشن آرڈر'],
 ['عدد طلبيات الإميلشن','ایمولشن آرڈرز کی تعداد'],
 ['إجمالي الإميلشن','کل ایمولشن فروخت'],
 ['حالة الاتفاق','معاہدے کی حالت'],
 ['تاريخ الاتفاق','معاہدے کی تاریخ'],
 ['نهاية المهلة','مہلت کا اختتام'],
 ['متردد — انتهت مهلة الاتفاق','متردد — معاہدے کی مہلت ختم'],
 ['كان متفقًا على: ','طے شدہ پروڈکٹ: '],
 ['عملاء جدد نشطين بالإميلشن (5,000 ر.س+)','نئے فعال ایمولشن گاہک (5,000 ریال+)'],
 ['يُحسب من سحوبات الإميلشن فقط','صرف ایمولشن فروخت سے شمار ہوتا ہے']
]);
function fixCustomerTypeAlias(){
 const src=document.getElementById('fCustomerType');if(!src)return;
 let alias=document.getElementById('fType');
 if(!alias){alias=document.createElement('input');alias.type='hidden';alias.id='fType';src.insertAdjacentElement('afterend',alias);}
 alias.value=src.value;
 if(!src.dataset.emuAliasBound){src.dataset.emuAliasBound='1';src.addEventListener('change',()=>{const a=document.getElementById('fType');if(a)a.value=src.value;});}
}
function hideInternalRepData(){if(app.canManage?.())return;document.querySelectorAll('.customer-insight,.emu-dashboard-card').forEach(x=>x.remove());}
function translateNode(root){if(!isYaqoub()||!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode())){const raw=n.nodeValue||'',t=raw.trim(),u=urdu.get(t);if(u)n.nodeValue=raw.replace(t,u);}
 root.querySelectorAll?.('[placeholder]').forEach(el=>{const t=(el.getAttribute('placeholder')||'').trim(),u=urdu.get(t);if(u)el.setAttribute('placeholder',u);});
}
function run(){fixCustomerTypeAlias();hideInternalRepData();if(isYaqoub()){document.querySelectorAll('#fInitialVoiceWrap,#fAgreementProductWrap,#sAgreementProductWrap,.customer-section-title,.customer-actions-title,.customer-insight,#emuActiveNewCard').forEach(translateNode);}}
const mo=new MutationObserver(m=>{m.forEach(x=>Array.from(x.addedNodes||[]).forEach(n=>{if(n.nodeType===1)translateNode(n)}));setTimeout(run,0);});mo.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('dana:render',()=>setTimeout(run,0));setInterval(run,1200);run();
})();