import { products } from '@/lib/catalog';
import { productImageUrl, productUrl, SITE_ORIGIN } from '@/lib/seo';

export function GET() {
  const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const latest = products.map(p => p.updatedAt).filter(Boolean).sort().at(-1);
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
    `  <url><loc>${SITE_ORIGIN}/</loc>${latest ? `<lastmod>${latest}</lastmod>` : ''}</url>\n` +
    products.map(p => `  <url><loc>${escapeXml(productUrl(p))}</loc>${p.updatedAt ? `<lastmod>${escapeXml(p.updatedAt)}</lastmod>` : ''}${p.image ? `<image:image><image:loc>${escapeXml(productImageUrl(p)!)}</image:loc></image:image>` : ''}</url>`).join('\n') + '\n</urlset>\n';
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
