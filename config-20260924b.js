window.DANA_CONFIG = {
  SUPABASE_URL: "https://bmpxtvhqpjvlyeoseuvz.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_E2JHCYNOa1bI7tQkFH2Eag_zR8B8RDR"
};

window.addEventListener('load', function(){
  if(document.getElementById('danaStatusProductSafeScript')) return;
  var s=document.createElement('script');
  s.id='danaStatusProductSafeScript';
  s.src='./status-product-safe-20261010.js?v=20261010-pcmvoice1';
  document.body.appendChild(s);
});
