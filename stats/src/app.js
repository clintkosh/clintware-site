export const APP_JS = String.raw`
(function () {
  'use strict';

  var state = { data: window.__CLINTWARE_STATS_DATA__ || null };
  var loginView = document.getElementById('login-view');
  var dashboardView = document.getElementById('dashboard-view');
  var passwordInput = document.getElementById('stats-password');
  var revealButton = document.getElementById('reveal-password');

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatNumber(value) {
    var number = Number(value || 0);
    return new Intl.NumberFormat('en-US', {
      notation: number >= 100000 ? 'compact' : 'standard',
      maximumFractionDigits: 1
    }).format(number);
  }

  function chartMarkup(points) {
    if (!points || !points.length) {
      return '<div class="chart-empty"><div><strong>Traffic trend ready</strong><br>Connect GA4 reporting credentials to plot the last 30 days.</div></div>';
    }
    var width = 760;
    var height = 230;
    var padX = 28;
    var padY = 24;
    var max = Math.max.apply(null, points.map(function (point) { return Number(point.pageViews || 0); }).concat([1]));
    var step = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;
    var coords = points.map(function (point, index) {
      return {
        x: padX + index * step,
        y: height - padY - (Number(point.pageViews || 0) / max) * (height - padY * 2),
        value: Number(point.pageViews || 0),
        date: point.date
      };
    });
    var line = coords.map(function (point, index) {
      return (index ? 'L' : 'M') + point.x.toFixed(1) + ',' + point.y.toFixed(1);
    }).join(' ');
    var area = line + ' L' + coords[coords.length - 1].x.toFixed(1) + ',' + (height - padY) + ' L' + coords[0].x.toFixed(1) + ',' + (height - padY) + ' Z';
    var grid = [0, .25, .5, .75, 1].map(function (ratio) {
      var y = padY + ratio * (height - padY * 2);
      var label = Math.round(max * (1 - ratio));
      return '<line class="chart-grid" x1="' + padX + '" y1="' + y + '" x2="' + (width - padX) + '" y2="' + y + '"></line><text class="chart-label" x="' + (padX + 4) + '" y="' + (y - 5) + '">' + formatNumber(label) + '</text>';
    }).join('');
    var dots = coords.filter(function (_, index) {
      return index === coords.length - 1 || index % Math.max(1, Math.floor(coords.length / 7)) === 0;
    }).map(function (point) {
      return '<circle class="chart-dot" cx="' + point.x + '" cy="' + point.y + '" r="3.5"><title>' + escapeHtml(point.date) + ': ' + formatNumber(point.value) + ' views</title></circle>';
    }).join('');
    var labels = coords.filter(function (_, index) {
      return index === 0 || index === coords.length - 1 || index % Math.max(1, Math.floor(coords.length / 4)) === 0;
    }).map(function (point) {
      var date = point.date && point.date.length === 8 ? point.date.slice(4, 6) + '/' + point.date.slice(6, 8) : point.date;
      return '<text class="chart-label" text-anchor="middle" x="' + point.x + '" y="' + (height - 5) + '">' + escapeHtml(date) + '</text>';
    }).join('');
    return '<svg role="img" aria-label="30 day page-view trend" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#35d7ff" stop-opacity=".24"></stop><stop offset="1" stop-color="#35d7ff" stop-opacity="0"></stop></linearGradient></defs>' + grid + '<path class="chart-area" d="' + area + '"></path><path class="chart-line" d="' + line + '"></path>' + dots + labels + '</svg>';
  }

  function topPagesMarkup(analytics) {
    if (!analytics || analytics.status !== 'connected' || !analytics.topPages.length) {
      return '<div class="chart-empty"><div><strong>No reporting rows yet</strong><br>Collection coverage remains verified independently.</div></div>';
    }
    return analytics.topPages.slice(0, 8).map(function (page) {
      return '<div class="page-row"><div class="page-path" title="' + escapeHtml(page.path) + '">' + escapeHtml(page.path) + '</div><div class="page-count">' + formatNumber(page.views) + '</div></div>';
    }).join('');
  }

  function portfolioMarkup(data) {
    var analytics = data.analytics || {};
    var crmViews = analytics.crmViews || {};
    return data.portfolio.map(function (crm) {
      var health = data.health.find(function (item) { return item.id === crm.id; }) || {};
      var views = analytics.status === 'connected' ? formatNumber(crmViews[crm.id] || 0) : '—';
      var statusText = health.ok ? 'Live' : health.status ? 'Issue ' + health.status : 'Unavailable';
      return '<div class="crm-row">' +
        '<div class="crm-identity"><div class="crm-mark crm-' + escapeHtml(crm.id) + '">' + escapeHtml(crm.shortName) + '</div><div><div class="crm-name">' + escapeHtml(crm.name) + '</div><div class="crm-host">' + escapeHtml(crm.hostname) + '</div></div></div>' +
        '<div class="namespace"><code>' + escapeHtml(crm.pathPrefix) + '</code></div>' +
        '<div class="coverage"><b>Verified</b>' + escapeHtml(crm.coverage) + '</div>' +
        '<div class="live ' + (health.ok ? 'up' : 'down') + '">' + escapeHtml(statusText) + '</div>' +
        '<div class="views">' + views + '<small>30d views</small></div>' +
      '</div>';
    }).join('');
  }

  function render(data) {
    var analytics = data.analytics || {};
    var connected = analytics.status === 'connected';
    var liveCount = data.health.filter(function (item) { return item.ok; }).length;
    document.getElementById('metric-crms').textContent = String(data.portfolio.length);
    document.getElementById('metric-coverage').textContent = data.coveragePercent + '%';
    document.getElementById('metric-live').textContent = liveCount + '/' + data.portfolio.length;
    document.getElementById('metric-views').textContent = connected ? formatNumber(analytics.summary.pageViews) : 'Ready';
    document.getElementById('metric-views-note').textContent = connected ? 'Google Analytics · last 30 days' : 'GA4 collection verified';
    document.getElementById('metric-users').textContent = connected ? formatNumber(analytics.summary.activeUsers) + ' active users' : 'Awaiting report access';
    document.getElementById('last-refresh').textContent = 'Updated ' + new Date(data.generatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    document.getElementById('chart').innerHTML = chartMarkup(connected ? analytics.daily : []);
    document.getElementById('top-pages').innerHTML = topPagesMarkup(analytics);
    document.getElementById('portfolio-rows').innerHTML = portfolioMarkup(data);
    var notice = document.getElementById('reporting-notice');
    if (connected) {
      notice.classList.add('hidden');
    } else {
      notice.classList.remove('hidden');
      document.getElementById('reporting-message').textContent = analytics.message || 'GA4 reporting is not connected.';
    }
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
  }

  if (revealButton && passwordInput) {
    revealButton.addEventListener('click', function () {
      var reveal = passwordInput.type === 'password';
      passwordInput.type = reveal ? 'text' : 'password';
      revealButton.textContent = reveal ? 'Hide' : 'Show';
      passwordInput.focus();
    });
  }

  if (state.data) {
    render(state.data);
    setTimeout(function () { window.location.reload(); }, 300000);
  } else {
    dashboardView.classList.add('hidden');
    loginView.classList.remove('hidden');
    if (passwordInput) passwordInput.focus();
  }
})();
`;
