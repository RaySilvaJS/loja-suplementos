(function () {
  fetch('/api/site-config').then(r => r.json()).then(cfg => {
    if (!cfg) return;
    const name = (cfg.siteName || '').trim();
    const logoUrl = (cfg.logoUrl || '').trim();

    document.querySelectorAll('[data-site-logo]').forEach(el => {
      if (logoUrl) {
        el.innerHTML = '';
        const img = document.createElement('img');
        img.src = logoUrl;
        img.alt = name || 'Logo';
        img.style.cssText = 'height:32px;max-width:160px;object-fit:contain;vertical-align:middle';
        el.appendChild(img);
      } else if (name) {
        const parts = name.split(' ');
        const last = parts.length > 1 ? parts.pop() : '';
        el.innerHTML = last ? `${parts.join(' ')}<span>${last}</span>` : name;
      }
    });

    if (name) {
      document.title = document.title.replace(/POWER FIT/g, name);
      document.querySelectorAll('meta[property="og:site_name"]').forEach(m => m.content = name);
    }
  }).catch(() => {});
})();
