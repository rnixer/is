// Proxy only public raster uploads from the configured CMS, never arbitrary URLs.
export function mediaUrl(src: string): string {
  const base = new URL(process.env.STRAPI_URL || 'http://127.0.0.1:1337');
  const url = new URL(src, base);
  if (url.origin === base.origin && /^\/uploads\/[A-Za-z0-9_-]+\.(webp|png|jpe?g|gif|avif)$/i.test(url.pathname)) {
    return '/media/' + url.pathname.slice('/uploads/'.length);
  }
  return url.href;
}

export async function fetchMedia(filename: string): Promise<Response> {
  if (!/^[A-Za-z0-9_-]+\.(webp|png|jpe?g|gif|avif)$/i.test(filename)) {
    return new Response('Not found', { status: 404 });
  }
  try {
    const base = new URL(process.env.STRAPI_URL || 'http://127.0.0.1:1337');
    const response = await fetch(new URL('/uploads/' + filename, base), {
      headers: { 'ngrok-skip-browser-warning': '1' },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    const type = response.headers.get('content-type') || '';
    if (!response.ok || !/^image\/(webp|png|jpeg|gif|avif)(;|$)/i.test(type)) {
      return new Response('Image unavailable', { status: 502 });
    }
    return new Response(response.body, {
      headers: {
        'content-type': type,
        'cache-control': 'public, max-age=3600, s-maxage=86400',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return new Response('Image unavailable', { status: 502 });
  }
}
