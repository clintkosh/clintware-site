addEventListener('fetch', event => {
  event.respondWith(new Response(
    'This legacy Clintware surface has been retired. Visit https://www.clintware.com/.\n',
    {
      status: 410,
      statusText: 'Gone',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
        'Link': '<https://www.clintware.com/>; rel="canonical"'
      }
    }
  ));
});
