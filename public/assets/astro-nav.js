(() => {
  const apply = () => {
    const nav = document.querySelector('[data-site-nav]');
    if (!nav) return;
    const path = location.pathname;
    const routes = [
      ['Home', '/', path === '/'],
      ['Profile', '/work/', path.startsWith('/work/')],
      ['CS Systems', '/cs-systems/', path.startsWith('/cs-systems/')],
      ['Products', '/tools/', path.startsWith('/tools/')],
      ['Startup / YC', '/startup/', path.startsWith('/startup/')],
      ['Build Notes', '/blog/', path.startsWith('/blog/')],
      ['Contact', '/contact/', path.startsWith('/contact/')],
    ];
    nav.innerHTML = routes.map(([label, href, active]) => `<a href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
