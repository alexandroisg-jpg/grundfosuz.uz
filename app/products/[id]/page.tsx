import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { categories, products, priceText } from '@/lib/catalog';
import { jsonLd, priceNotice, productDescription, productPath, productStructuredData, productUrl, SITE_ORIGIN } from '@/lib/seo';

type Props = { params: Promise<{ id: string }> };
export function generateStaticParams() { return products.map(p => ({ id: p.id })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = products.find(p => p.id === id);
  if (!p) return { title: 'Модель не найдена', robots: { index: false, follow: true } };
  return {
    title: `Grundfos ${p.name}${p.article ? ' · ' + p.article : ''} — цена и характеристики в Узбекистане`,
    description: productDescription(p),
    alternates: { canonical: productUrl(p) },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const p = products.find(p => p.id === id);
  if (!p) notFound();
  const category = categories.find(c => c.id === p.category);
  const related = products.filter(other => other.id !== p.id && other.category === p.category).slice(0, 4);
  const separateItems = products.filter(other => p.relatedProductIds?.includes(other.id));
  const breadcrumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Каталог насосов', item: SITE_ORIGIN + '/' },
      { '@type': 'ListItem', position: 2, name: 'Grundfos ' + p.name, item: productUrl(p) },
    ],
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(productStructuredData(p)) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbs) }} />
    <div className="topline"><div className="container topline-inner"><span>Узбекистан</span><span>Промышленные насосы · Запчасти · Автоматика</span><a href="tel:+998909008805" className="top-phone">+998 90 900 88 05</a></div></div>
    <header className="header"><div className="container header-inner product-page-header">
      <a href="/" className="brand" aria-label="Grundfos Uzbekistan UZ — главная"><strong>GRUNDFOS<span className="brand-slashes" aria-hidden="true">〳</span></strong><span>UZBEKISTAN <b>UZ</b></span><small className="brand-note">Независимый каталог</small></a>
      <a href="/" className="product-back">← Каталог оборудования</a>
    </div></header>
    <main className="container product-page">
      <nav className="product-breadcrumb" aria-label="Хлебные крошки"><a href="/">Каталог насосов</a><span aria-hidden="true">/</span><span>{p.name}</span></nav>
      <div className="product-page-grid">
        <div className="product-page-visual">
          {p.image ? <figure><img src={p.image} alt={'Grundfos ' + p.name} width={600} height={600}/>{p.imageNote && <figcaption>{p.imageNote}</figcaption>}</figure> : <div className="product-page-no-image"><span>GRUNDFOS</span><strong>{p.name}</strong><p>Фотография этого исполнения уточняется</p></div>}
        </div>
        <section className="product-page-summary" aria-labelledby="product-heading">
          <p className="eyebrow">GRUNDFOS · {category?.name}</p>
          <h1 id="product-heading">{p.name}</h1>
          {p.article && <p className="product-page-article">Артикул производителя: <strong>{p.article}</strong></p>}
          <p className="product-page-description">{p.description}</p>
          <div className="product-page-price"><span>{p.price === null ? 'Стоимость исполнения' : p.preliminary ? 'Предварительная цена' : p.priceType === 'reference' ? 'Справочная цена' : 'Цена'}</span><strong>{priceText(p)}</strong><p>{priceNotice(p)}</p></div>
          {separateItems.length > 0 && <aside className="separate-items"><strong>Отдельная позиция</strong>{separateItems.map(item => <a href={productPath(item)} key={item.id}><span>{item.name}</span><b>{priceText(item)}</b></a>)}<p>У каждой позиции своя цена. Стоимость другой позиции не включена.</p></aside>}
          <div className="product-page-actions"><a href="tel:+998909008805" className="primary-button">Уточнить цену и поставку</a><a href={'/?product=' + p.id} className="product-back">Открыть подбор и добавить в список →</a></div>
          <p className="product-page-phone">Подбор оборудования: <a href="tel:+998909008805">+998 90 900 88 05</a></p>
        </section>
      </div>
      <div className="product-page-details">
        <section><h2>Характеристики {p.name}</h2><dl className="spec-table"><div><dt>Производитель</dt><dd>Grundfos</dd></div><div><dt>Модель</dt><dd>{p.name}</dd></div>{p.article && <div><dt>Артикул</dt><dd>{p.article}</dd></div>}{Object.entries(p.specs).map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><p className="minor-note">Рабочую точку, присоединения, напряжение и полное исполнение необходимо сверить с паспортом оборудования перед заказом.</p></section>
        <section className="product-page-terms"><h2>Цена и поставка в Узбекистане</h2><p>{priceNotice(p)}</p><p>Для расчёта подготовьте модель, артикул или фотографию заводской таблички и требуемое количество.</p><p>Данные проверены: <time dateTime={p.checkedAt}>{p.checkedAt.split('-').reverse().join('.')}</time>.</p><p className="minor-note">Источник характеристик: <a href={p.source} rel="noreferrer" target="_blank">{p.sourceName}</a>{p.sourceUpdatedAt ? '. Дата исходного предложения: ' + p.sourceUpdatedAt.split('-').reverse().join('.') : ''}. Дата проверки не подтверждает актуальность складского остатка.</p></section>
      </div>
      {related.length > 0 && <section className="product-related"><h2>Другие модели этой категории</h2><div>{related.map(other => <a key={other.id} href={productPath(other)}><strong>{other.name}</strong><span>{priceText(other)}</span>{other.preliminary && <small>Предварительная цена</small>}</a>)}</div></section>}
    </main>
    <footer className="product-page-footer"><div className="container"><strong>GRUNDFOS UZBEKISTAN UZ</strong><p>Независимый каталог промышленного оборудования. Не является официальным сайтом или подтверждённым дилером Grundfos.</p><a href="/">Все модели и цены</a><a href="tel:+998909008805">+998 90 900 88 05</a></div></footer>
  </>;
}
