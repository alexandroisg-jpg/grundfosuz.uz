import Catalog from '@/components/catalog';
import { products } from '@/lib/catalog';
import { jsonLd, productUrl, SITE_ORIGIN } from '@/lib/seo';

export default function Page() {
  const catalog = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: 'Промышленные насосы Grundfos в Узбекистане', url: SITE_ORIGIN + '/',
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: 'Grundfos ' + p.name, url: productUrl(p) })),
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(catalog) }} /><Catalog /></>;
}
