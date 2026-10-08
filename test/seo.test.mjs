import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({
  root, configFile: false, server: { middlewareMode: true, watch: null },
  resolve: { alias: { '@': root } }, esbuild: { jsx: 'automatic' },
});
after(() => server.close());
const { productStructuredData } = await server.ssrLoadModule('/lib/seo.ts');
const { products, priceText } = await server.ssrLoadModule('/lib/catalog.ts');
const { default: ProductPage } = await server.ssrLoadModule('/app/products/[id]/page.tsx');
const base = products.find(p => p.id === 'industrial-1022377');

for (const [name, changes, expected] of [
  ['confirmed sale', { preliminary: false }, 'Product'],
  ['preliminary price', { preliminary: true }, 'WebPage'],
  ['price on request', { price: null, preliminary: false }, 'WebPage'],
  ['reference price', { preliminary: false, priceType: 'reference' }, 'WebPage'],
  ['starting price', { preliminary: false, priceFrom: true }, 'WebPage'],
  ['zero placeholder', { preliminary: false, price: 0 }, 'WebPage'],
]) {
  test(name + ': rendered JSON-LD and visible content', async () => {
    const p = { ...base, ...changes, id: 'test-' + name.replaceAll(' ', '-') };
    const data = productStructuredData(p);
    assert.equal(data['@type'], expected);
    if (expected === 'Product') {
      assert.equal(data.offers.price, p.price);
      assert.equal(data.offers.priceCurrency, 'UZS');
      assert.equal(data.offers.url, 'https://grundfosuz.uz/products/' + p.id);
      assert.equal(data.offers.availability, undefined);
    } else {
      assert.equal(data.offers, undefined);
      assert.equal(data.primaryImageOfPage.url, 'https://grundfosuz.uz' + p.image);
    }
    // Render the real page with a test-only catalog record; never change source data.
    products.push(p);
    try {
      const html = renderToStaticMarkup(await ProductPage({ params: Promise.resolve({ id: p.id }) }));
      const structured = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]));
      assert.equal(structured.length, 2);
      assert.deepEqual(structured[0], data);
      assert.equal(structured[1]['@type'], 'BreadcrumbList');
      assert.equal(structured[1].itemListElement[1].item, data.url);
      assert.ok(html.includes(p.name));
      assert.ok(html.includes(p.image));
      assert.ok(html.includes(priceText(p)));
      if (p.preliminary) assert.ok(html.includes('Предварительная цена'));
    } finally { products.pop(); }
  });
}

test('current catalog retains prices and emits no incomplete Product snippets', () => {
  assert.equal(products.length, 68);
  assert.equal(base.price, 44500000);
  assert.equal(products.find(p => p.id === 'nbe-65-200-205').price, 87400000);
  for (const p of products) assert.equal(productStructuredData(p)['@type'], 'WebPage');
});

