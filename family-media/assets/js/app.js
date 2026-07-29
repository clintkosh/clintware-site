(() => {
  const config = window.CLINTWARE_PAYPAL || {};
  document.querySelectorAll('[data-payment]').forEach((button) => {
    const packageKey = button.dataset.payment;
    const paymentUrl = typeof config[packageKey] === 'string' ? config[packageKey].trim() : '';
    if (paymentUrl) {
      button.href = paymentUrl;
      button.textContent = 'Pay securely with PayPal';
      button.rel = 'noopener noreferrer';
    } else {
      button.href = `order.html?package=${encodeURIComponent(packageKey)}`;
      button.textContent = 'Request PayPal invoice';
    }
  });

  const upload = document.querySelector('#demo-upload');
  const preview = document.querySelector('#customer-preview');
  const status = document.querySelector('#demo-status');
  const generate = document.querySelector('#demo-generate');
  const style = document.querySelector('#demo-style');
  const title = document.querySelector('#demo-caption-title');
  const text = document.querySelector('#demo-caption-text');
  const descriptions = {
    'game-day': ['Maroon Game Day', 'A generic college-stadium scene without university names, logos, or mascots.'],
    skyline: ['Skyline Adventure', 'An original rooftop scene with dramatic city lights.'],
    storybook: ['Storybook Garden', 'A whimsical original garden scene for keepsakes and coloring pages.']
  };
  if (generate) generate.addEventListener('click', () => {
    const file = upload?.files?.[0];
    if (!file) { status.textContent = 'Choose an image first. The file stays in your browser for this demo.'; return; }
    if (!file.type.startsWith('image/')) { status.textContent = 'Choose a JPG, PNG, or WebP image.'; return; }
    const pair = descriptions[style.value] || descriptions['game-day'];
    title.textContent = pair[0]; text.textContent = pair[1];
    preview.src = URL.createObjectURL(file); preview.hidden = false;
    status.textContent = 'Preview created locally. Nothing was uploaded.';
  });
})();
