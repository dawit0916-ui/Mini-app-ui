export const config = { matcher: '/((?!fallback\\.html).*)' };

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  const blocked = /curl|wget|httpie|python|axios|node-fetch|go-http|postman|insomnia|libwww|java|okhttp|scrapy|spider|crawl|bot/i;
  if (!ua || blocked.test(ua)) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/fallback.html' },
    });
  }
}
