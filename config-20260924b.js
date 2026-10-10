window.DANA_CONFIG = {
  SUPABASE_URL: "https://bmpxtvhqpjvlyeoseuvz.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_E2JHCYNOa1bI7tQkFH2Eag_zR8B8RDR"
};

window.addEventListener('load', function(){
  if(document.getElementById('danaEmulsionTrackingScript')) return;
  var s=document.createElement('script');
  s.id='danaEmulsionTrackingScript';
  s.src='./emulsion-tracking-20261010.js?v=20261010-1';
  document.body.appendChild(s);
});
