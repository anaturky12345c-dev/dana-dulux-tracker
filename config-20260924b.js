window.DANA_CONFIG = {
  SUPABASE_URL: "https://bmpxtvhqpjvlyeoseuvz.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_E2JHCYNOa1bI7tQkFH2Eag_zR8B8RDR"
};

window.addEventListener('load', function(){
  if(document.getElementById('danaEmulsionTrackingScript')) return;
  var s=document.createElement('script');
  s.id='danaEmulsionTrackingScript';
  s.src='./emulsion-tracking-20261010.js?v=20261010-2';
  s.onload=function(){
    if(document.getElementById('danaEmulsionTrackingFixScript')) return;
    var f=document.createElement('script');
    f.id='danaEmulsionTrackingFixScript';
    f.src='./emulsion-tracking-fixes-20261010.js?v=20261010-2';
    document.body.appendChild(f);
  };
  document.body.appendChild(s);
});
