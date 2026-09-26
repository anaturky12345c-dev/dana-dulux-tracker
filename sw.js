self.addEventListener('push',function(event){
  var data={};
  try{data=event.data?event.data.json():{};}catch(_){data={title:'Dana Al-Taj',body:event.data?event.data.text():''};}
  var title=data.title||'Dana Al-Taj';
  var options={
    body:data.body||'',
    icon:'./icon.svg',
    badge:'./icon.svg',
    tag:data.notificationId?'dana-'+data.notificationId:undefined,
    renotify:true,
    data:{url:data.url||'./'}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',function(event){
  event.notification.close();
  var url=new URL((event.notification.data&&event.notification.data.url)||'./',self.registration.scope).href;
  event.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){
      for(var i=0;i<list.length;i++){
        var client=list[i];
        if(client.url.indexOf(self.registration.scope)===0){
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});