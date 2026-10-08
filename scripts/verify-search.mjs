import { readFile } from 'node:fs/promises';

const project = new URL('../', import.meta.url);
const products = JSON.parse(await readFile(new URL('data/products.json', project), 'utf8'));
const canonicalOrigin = 'https://grundfosuz.uz';
const args = process.argv.slice(2);
const originIndex = args.indexOf('--origin');
const origin = originIndex < 0 ? canonicalOrigin : new URL(args[originIndex + 1]).origin;
const submit = args.includes('--submit');
if (submit && origin !== canonicalOrigin) throw new Error('IndexNow submissions require the canonical production domain.');
const key = 'd0c8865357fad38f3b5aa894f1ad5415';
const urls = [canonicalOrigin + '/', ...products.map(p => canonicalOrigin + '/products/' + p.id)];
const failures = [];
const checkedImages = new Set();
const recordFailure = message => { failures.push(message); console.error('FAIL ' + message); };

async function request(path) {
  const response = await fetch(origin + path, { redirect: 'error', signal: AbortSignal.timeout(20000) });
  if (response.status !== 200) throw new Error(`${path}: HTTP ${response.status}`);
  if (/noindex/i.test(response.headers.get('x-robots-tag') || '')) throw new Error(`${path}: X-Robots-Tag noindex`);
  return { body: await response.text(), headers: response.headers };
}
function checkHtml(html, path) {
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (/name=["'](?:robots|googlebot|yandex)["']/i.test(tag) && /noindex|nofollow/i.test(tag)) throw new Error(path + ': indexing blocked in metadata');
  }
  const canonical = [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => tag).find(tag => /rel=["']canonical["']/i.test(tag));
  const canonicalHref = canonical?.match(/href=["']([^"']+)["']/i)?.[1];
  if (!canonicalHref || new URL(canonicalHref).href !== new URL(canonicalOrigin + path).href) throw new Error(path + ': missing or incorrect canonical');
  if (!/<h1[\s>]/i.test(html)) throw new Error(path + ': no server-rendered h1');
  const structured = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if (!structured.length) throw new Error(path + ': structured data missing');
  for (const [,data] of structured) JSON.parse(data);
}

try {
  const { body: robots } = await request('/robots.txt');
  if (!robots.includes('Sitemap: ' + canonicalOrigin + '/sitemap.xml') || /^Disallow:\s*\/\s*$/mi.test(robots)) throw new Error('robots.txt does not allow canonical discovery');
  const { body: xml, headers } = await request('/sitemap.xml');
  if (!/xml/i.test(headers.get('content-type') || '')) throw new Error('sitemap.xml wrong content type');
  const actual = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  if (actual.length !== urls.length || urls.some(url => !actual.includes(url))) throw new Error('sitemap.xml URL mismatch');
  const { body: publishedKey } = await request('/' + key + '.txt');
  if (publishedKey.trim() !== key) throw new Error('IndexNow verification file mismatch');
  const { body: root } = await request('/');
  checkHtml(root, '/');
  for (const p of products) if (!root.includes('href="/products/' + p.id + '"')) throw new Error('Homepage does not link to ' + p.id);
  console.log('PASS robots, sitemap, IndexNow file and all homepage product links');
} catch (error) { recordFailure(error.message); }

if (!failures.length) {
  for (const p of products) {
    try {
      const path = '/products/' + p.id;
      const { body } = await request(path);
      checkHtml(body, path);
      if (!p.image || !body.includes(p.image)) throw new Error(path + ': product image missing');
      const productData = [...body.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => JSON.parse(m[1])).find(data => data['@type'] === 'Product');
      const hasOffer = p.price !== null && Number.isFinite(p.price) && p.price > 0 && !p.preliminary && !p.priceFrom && p.priceType === 'sale';
      if (hasOffer) {
        if (!productData?.image?.includes(new URL(p.image, canonicalOrigin).href)) throw new Error(path + ': structured image missing');
        if (productData.offers?.price !== p.price || productData.offers?.priceCurrency !== 'UZS') throw new Error(path + ': confirmed offer missing or incorrect');
      } else {
        if (productData) throw new Error(path + ': Product rich-result markup without a confirmed offer');
        const webpage = [...body.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => JSON.parse(m[1])).find(data => data['@type'] === 'WebPage');
        if (webpage?.url !== canonicalOrigin + path || webpage?.primaryImageOfPage?.url !== new URL(p.image, canonicalOrigin).href) throw new Error(path + ': webpage metadata missing or incorrect');
      }
      if (!checkedImages.has(p.image)) {
        const imageUrl = new URL(p.image, origin);
        const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
        if (imageResponse.status !== 200 || !/^image\//.test(imageResponse.headers.get('content-type') || '')) throw new Error(path + ': image fails to load');
        await imageResponse.arrayBuffer();
        checkedImages.add(p.image);
      }
      if (!body.includes(p.name)) throw new Error(path + ': model missing from HTML');
      if (p.article && !body.includes(p.article)) throw new Error(path + ': article missing from HTML');
      if (p.price !== null && !body.replace(/[^0-9]/g, '').includes(String(p.price))) throw new Error(path + ': price missing from HTML');
      if (p.preliminary && !body.includes('Предварительная цена')) throw new Error(path + ': preliminary price label missing');
      console.log('PASS ' + path);
    } catch (error) { recordFailure(error.message); }
  }
}
if (failures.length) {
  console.error('Not ready for search submission. No URLs submitted.');
  process.exitCode = 1;
} else if (submit) {
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(canonicalOrigin).hostname, key, keyLocation: `${canonicalOrigin}/${key}.txt`, urlList: urls }),
    signal: AbortSignal.timeout(20000),
  });
  if (![200,202].includes(response.status)) throw new Error('IndexNow rejected submission: HTTP ' + response.status);
  console.log(`IndexNow HTTP ${response.status}: ${urls.length} URLs received; this is not confirmation of indexing.`);
} else {
  console.log(`READY ${urls.length} canonical pages. No submission requested.`);
}
