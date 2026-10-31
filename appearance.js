(() => {
  const read = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
  const theme = read('budget-theme', 'system');
  const accent = read('budget-accent', 'violet');
  const hidden = read('budget-hidden', 'false') === 'true';
  const media = matchMedia('(prefers-color-scheme: dark)');
  const prefs = {theme: ['light','dark','system'].includes(theme)?theme:'system', accent: ['violet','mint','peach'].includes(accent)?accent:'violet', hidden};
  const apply = () => {
    const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && media.matches);
    document.documentElement.dataset.theme = dark?'dark':'light';
    document.documentElement.dataset.accent = prefs.accent;
    document.documentElement.style.colorScheme = dark?'dark':'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark?'#14151b':'#f7f7fb');
  };
  window.budgetAppearance = {prefs, set(key,value){
    if(key==='theme'&&!['light','dark','system'].includes(value))return;
    if(key==='accent'&&!['violet','mint','peach'].includes(value))return;
    prefs[key]=value; try{localStorage.setItem('budget-'+key,String(value));}catch{}
    apply();
  }};
  media.addEventListener('change', apply);
  apply();
})();
