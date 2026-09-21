import { categories, priceText, products, type Product } from '@/lib/catalog';

export const SITE_ORIGIN = 'https://grundfosuz.uz';
export const INDEXNOW_KEY = 'd0c8865357fad38f3b5aa894f1ad5415';
export const productPath = (p: Pick<Product, 'id'>) => '/products/' + p.id;
export const productUrl = (p: Pick<Product, 'id'>) => SITE_ORIGIN + productPath(p);
export const catalogUrls = () => [SITE_ORIGIN + '/', ...products.map(productUrl)];
export const priceNotice = (p: Product) => p.priceNote || (p.price === null
  ? 'Цена и возможность поставки этого исполнения требуют подтверждения.'
  : 'Предварительная цена. Комплектация, НДС, наличие, доставка и срок поставки подтверждаются при согласовании заказа.');

export function productDescription(p: Product) {
  return `Grundfos ${p.name}${p.article ? ', артикул ' + p.article : ''}. ${p.description} ${p.price === null ? 'Цена по запросу.' : 'Предварительная цена: ' + priceText(p) + '.'} Подбор и поставка в Узбекистане.`;
}

export function productStructuredData(p: Product) {
  return {
    '@context': 'https://schema.org', '@type': 'Product',
    '@id': productUrl(p) + '#product', url: productUrl(p),
    name: 'Grundfos ' + p.name, model: p.name,
    description: p.description + ' ' + priceNotice(p),
    brand: { '@type': 'Brand', name: 'Grundfos' },
    category: categories.find(c => c.id === p.category)?.name,
    ...(p.article ? { mpn: p.article } : {}),
    additionalProperty: Object.entries(p.specs).map(([name, value]) => ({ '@type': 'PropertyValue', name, value })),
    // An indicative quote is not a confirmed orderable offer or stock record.
    ...(p.price !== null && !p.preliminary && !p.priceFrom && p.priceType === 'sale' ? {
      offers: { '@type': 'Offer', url: productUrl(p), priceCurrency: 'UZS', price: p.price },
    } : {}),
  };
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
