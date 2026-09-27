window.DANA_CONFIG = {
  SUPABASE_URL: "https://bmpxtvhqpjvlyeoseuvz.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_E2JHCYNOa1bI7tQkFH2Eag_zR8B8RDR"
};

(() => {
  for (const src of [
    './ai-admin-20260927.js?v=20260927-aiaccess1',
    './ai-sources-20260927.js?v=20260927-aisources1'
  ]) {
    const s=document.createElement('script');
    s.src=src;
    s.defer=true;
    document.head.appendChild(s);
  }
})();