/** Достаёт картинку, название и цену со страницы товара по OpenGraph-тегам */
export async function fetchLinkPreview(url: string): Promise<{ title?: string; image?: string; price?: number }> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' } });
    const html = (await res.text()).slice(0, 400_000);
    const meta = (prop: string) => {
      const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i');
      const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i');
      return html.match(re)?.[1] ?? html.match(re2)?.[1];
    };
    const decode = (s?: string) =>
      s
        ?.replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    let image = decode(meta('og:image') ?? meta('twitter:image'));
    if (image && image.startsWith('/')) image = new URL(image, url).toString();
    const priceRaw = meta('product:price:amount') ?? meta('og:price:amount');
    return {
      title: decode(meta('og:title') ?? html.match(/<title>([^<]+)<\/title>/i)?.[1]),
      image,
      price: priceRaw ? Number(priceRaw.replace(/[^\d.]/g, '')) || undefined : undefined,
    };
  } catch {
    return {};
  }
}
