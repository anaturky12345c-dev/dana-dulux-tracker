window.DANA_CONFIG = {
  SUPABASE_URL: "https://bmpxtvhqpjvlyeoseuvz.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_E2JHCYNOa1bI7tQkFH2Eag_zR8B8RDR"
};

(() => {
  for (const src of [
    './ai-sources-20260927.js?v=20260927-merged2',
    './ai-opportunities-20260927.js?v=20260927-projects2'
  ]) {
    const s=document.createElement('script');
    s.src=src;
    s.defer=true;
    document.head.appendChild(s);
  }
})();