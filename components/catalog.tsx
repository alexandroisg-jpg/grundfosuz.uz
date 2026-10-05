'use client';

import {useEffect, useMemo, useState} from 'react';
import {Search, ShoppingBag, ArrowUpRight, ArrowRight, ChevronRight, SlidersHorizontal, X, Plus, Minus, Download, Check, MapPin, Droplets, Thermometer, Waves, Factory, Gauge, Settings2, Wrench, LayoutGrid, List, Info, RotateCcw, ExternalLink, Package, Trash2, Phone} from 'lucide-react';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Checkbox} from '@/components/ui/checkbox';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Toaster} from '@/components/ui/sonner';
import {toast} from 'sonner';
import {products,families,categories,money,priceText,matchesFamily,matchesProduct,type Product} from '@/lib/catalog';

import {MAX_SELECTION_LINES,selectionText} from '@/lib/selection';
import {productPath} from '@/lib/seo';

const iconMap: Record<string,typeof Droplets> = {fire:Droplets,all:LayoutGrid,multistage:Gauge,endsuction:Factory,inline:Thermometer,boosters:Droplets,dosing:Settings2,wastewater:Waves,borehole:Waves,controls:Settings2};
type Cart = Record<string,number>;
type Section = 'products'|'families'|'spares';
const STORAGE_KEY='grundfos-uz-selection-v1';

function ProductImage({product,large=false}:{product:Product;large?:boolean}) {
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[product.id,product.image]);
 return <div className={'product-image'+(large?' large':'')}>
  {product.image&&!failed ? <img src={product.image} alt={'Grundfos '+product.name} width={600} height={600} loading={large?'eager':'lazy'} onError={()=>setFailed(true)}/> : <div className="image-missing"><Package size={35} strokeWidth={1}/><span>Фото временно недоступно</span></div>}
 </div>;
}

export default function Catalog(){
 const [section,setSection]=useState<Section>('products');
 const [category,setCategory]=useState('all');
 const [query,setQuery]=useState('');
 const [sort,setSort]=useState('default');
 const [pricedOnly,setPricedOnly]=useState(false);
 const [minPrice,setMinPrice]=useState('');
 const [maxPrice,setMaxPrice]=useState('');
 const [view,setView]=useState<'grid'|'list'>('grid');
 const [selected,setSelected]=useState<Product|null>(null);
 const [cart,setCart]=useState<Cart>({});
 const [hydrated,setHydrated]=useState(false);
 const [cartOpen,setCartOpen]=useState(false);
 const [mobileFilters,setMobileFilters]=useState(false);
 const [aboutOpen,setAboutOpen]=useState(false);
 const [partModel,setPartModel]=useState('');
 const [visibleCount,setVisibleCount]=useState(24);

 useEffect(()=>{
  try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved)){const safe:Cart={};for(const [id,n] of Object.entries(saved)) if(products.some(p=>p.id===id)&&Number.isInteger(n)&&Number(n)>0&&Number(n)<=999&&Object.keys(safe).length<MAX_SELECTION_LINES) safe[id]=Number(n);setCart(safe);}}catch{}
  setHydrated(true);
  const restore=()=>{const params=new URLSearchParams(location.search);setSelected(products.find(p=>p.id===params.get('product'))||null);};
  restore();window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore);
 },[]);
 useEffect(()=>{if(hydrated)try{localStorage.setItem(STORAGE_KEY,JSON.stringify(cart));}catch{}},[cart,hydrated]);
 useEffect(()=>setVisibleCount(24),[query,category,section,sort,pricedOnly,minPrice,maxPrice]);
 useEffect(()=>{
  type MC={registerTool:(tool:unknown,options:{signal:AbortSignal})=>void|Promise<void>};
  const ctx=(document as Document&{modelContext?:MC}).modelContext;if(!ctx?.registerTool)return;
  const lifecycle=new AbortController();
  const tool={name:'search_grundfos_catalog',title:'Поиск в каталоге Grundfos',description:'Ищет модели и справочные цены в каталоге. Не оформляет заказ.',inputSchema:{type:'object',properties:{query:{type:'string',maxLength:120}},required:['query'],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input:unknown){const q=(input as {query?:unknown})?.query;if(typeof q!=='string'||q.length>120)throw new Error('query must be a string of at most 120 characters');return products.filter(p=>matchesProduct(p,q)).map(p=>({id:p.id,name:p.name,priceUZS:p.price,priceType:p.priceType,source:p.source,checkedAt:p.checkedAt}));}};
  try{Promise.resolve(ctx.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
  return()=>lifecycle.abort();
 },[]);

 const matchingProducts=useMemo(()=>products.filter(p=>(category==='all'||p.category===category)&&matchesProduct(p,query)),[category,query]);
 const invalidPriceRange=!!minPrice&&!!maxPrice&&Number(minPrice)>Number(maxPrice);
 const filtered=useMemo(()=>{
  const result=matchingProducts.filter(p=>(!pricedOnly||p.price!==null)&&(!minPrice||(p.price!==null&&p.price>=Number(minPrice)))&&(!maxPrice||(p.price!==null&&p.price<=Number(maxPrice))));
  if(sort==='price-asc')result.sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));
  if(sort==='price-desc')result.sort((a,b)=>(b.price??-Infinity)-(a.price??-Infinity));
  if(sort==='name')result.sort((a,b)=>a.name.localeCompare(b.name));return result;
 },[matchingProducts,sort,pricedOnly,minPrice,maxPrice]);
 const filteredFamilies=useMemo(()=>families.filter(f=>(category==='all'||f.category===category)&&matchesFamily(f,query)).sort((a,b)=>a.name.localeCompare(b.name)),[category,query]);
 const nearestProduct=useMemo(()=>{
  if(invalidPriceRange||(!minPrice&&!maxPrice)||filtered.length)return null;
  const distance=(p:Product)=>Math.max(Number(minPrice||0)-(p.price??0),(p.price??0)-Number(maxPrice||Infinity),0);
  return matchingProducts.filter(p=>p.price!==null).sort((a,b)=>distance(a)-distance(b))[0]||null;
 },[matchingProducts,filtered,invalidPriceRange,minPrice,maxPrice]);
 const cartItems=products.filter(p=>Object.hasOwn(cart,p.id)&&cart[p.id]);
 const hasPricedCart=cartItems.some(p=>p.price!==null);
 const unpricedCount=cartItems.filter(p=>p.price===null).length;
 const totalFrom=cartItems.some(p=>p.priceFrom&&p.price!==null);
 const cartCount=Object.values(cart).reduce((a,b)=>a+b,0);
 const total=cartItems.reduce((a,p)=>a+(p.price||0)*cart[p.id],0);
 const showSeriesFallback=section==='products'&&filtered.length===0&&!pricedOnly&&!minPrice&&!maxPrice&&filteredFamilies.length>0;
 const selectedCategory=categories.find(c=>c.id===category)!;
 const hasFilters=category!=='all'||!!query||pricedOnly||!!minPrice||!!maxPrice;

 function openProduct(p:Product){setSelected(p);const u=new URL(location.href);u.searchParams.set('product',p.id);history.pushState({},'',u);}
 function closeProduct(){setSelected(null);const u=new URL(location.href);u.searchParams.delete('product');history.replaceState({},'',u);}
 function add(p:Product){if(!Object.hasOwn(cart,p.id)&&Object.keys(cart).length>=MAX_SELECTION_LINES){toast.error('В одном списке максимум '+MAX_SELECTION_LINES+' позиций. Сохраните текущий список.');return;}setCart(prev=>({...prev,[p.id]:Math.min(999,(Object.hasOwn(prev,p.id)?prev[p.id]:0)+1)}));toast.success(p.name+' добавлен в список');}
 async function copySelection(){try{await navigator.clipboard.writeText(selectionText(cart));toast.success('Список скопирован. Его можно вставить в сообщение.');}catch{toast.error('Не удалось скопировать. Используйте «Скачать список».');}}
 function quantity(id:string,delta:number){setCart(prev=>{const next={...prev};next[id]=Math.min(999,(next[id]||0)+delta);if(next[id]<=0)delete next[id];return next;});}
 function resetPrices(){setMinPrice('');setMaxPrice('');}
 function reset(){setQuery('');setCategory('all');setPricedOnly(false);setMinPrice('');setMaxPrice('');}
 function navigate(next:Section){setSection(next);reset();}

 function Filters(){return <div className="filters">
  <div className="filter-heading"><h2>Категории</h2><SlidersHorizontal size={17}/></div>
  <div className="category-list">{categories.map(c=>{const Icon=iconMap[c.id];const count=section==='families'?families.filter(f=>c.id==='all'||f.category===c.id).length:products.filter(p=>c.id==='all'||p.category===c.id).length;return <button key={c.id} className={category===c.id?'active':''} onClick={()=>setCategory(c.id)} aria-pressed={category===c.id}><Icon size={18}/><span>{c.name}</span><small>{count||families.filter(f=>f.category===c.id).length}{!count&&section!=='families'?' сер.':''}</small></button>;})}</div>
  {section==='products'&&<><div className="filter-block"><h3>Цена, сум</h3><div className="price-inputs"><label><span>От</span><input aria-label="Минимальная цена" type="number" min="0" inputMode="numeric" placeholder="0" value={minPrice} onChange={e=>setMinPrice(e.target.value)}/></label><label><span>До</span><input aria-label="Максимальная цена" type="number" min="0" inputMode="numeric" placeholder="Любая" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)}/></label></div>{invalidPriceRange&&<p className="validation-error">Минимум должен быть меньше максимума</p>}<label className="check-label"><Checkbox checked={pricedOnly} onCheckedChange={v=>setPricedOnly(v===true)}/>Только с ценой</label></div><div className="filter-block"><h3>Производитель</h3><div className="fixed-brand"><Check size={15}/> Grundfos</div></div></>}
  {hasFilters&&<button className="reset-button" onClick={reset}><RotateCcw size={15}/>Сбросить фильтры</button>}
  <div className="spare-callout"><Wrench size={24} strokeWidth={1.4}/><h3>Нужна запчасть?</h3><p>Подберите её по артикулу вашего насоса.</p><button onClick={()=>{navigate('spares');setMobileFilters(false);}}>Перейти к запчастям<ArrowRight size={17}/></button></div>
 </div>;}

 return <>
  <div className="topline"><div className="container topline-inner"><span><MapPin size={14}/>Узбекистан</span><span>Промышленные насосы · Запчасти · Автоматика</span><a href="tel:+998909008805" className="top-phone"><Phone size={14}/>+998 90 900 88 05</a></div></div>
  <header className="header"><div className="container header-inner">
   <a href="/" className="brand" aria-label="Grundfos Uzbekistan UZ — главная"><strong>GRUNDFOS<span className="brand-slashes" aria-hidden="true">〳</span></strong><span>UZBEKISTAN <b>UZ</b></span><small className="brand-note">Независимый каталог</small></a>
   <form className="searchbar" onSubmit={e=>{e.preventDefault();document.getElementById('results')?.scrollIntoView({behavior:'smooth',block:'start'});}}><Search size={21}/><input value={query} onChange={e=>{setQuery(e.target.value);if(section==='spares')setSection('products');}} placeholder="Модель, артикул или назначение" aria-label="Поиск по каталогу"/>{query&&<button type="button" aria-label="Очистить поиск" onClick={()=>setQuery('')}><X size={18}/></button>}<button type="submit" className="search-submit">Найти</button></form>
   <button className="cart-button" onClick={()=>setCartOpen(true)} aria-label={'Список подбора: '+cartCount+' шт.'}><span className="cart-icon"><ShoppingBag size={24}/>{cartCount>0&&<b>{cartCount}</b>}</span><span>Мой список<small>{cartCount?(hasPricedCart?(totalFrom?'от ':'')+money(total)+' сум'+(unpricedCount?' + уточнение':''):'Сумма уточняется'):'Для подбора и заказа'}</small></span></button>
  </div></header>
  <nav className="navigation"><div className="container navigation-inner"><button className={section==='products'?'active':''} onClick={()=>navigate('products')}><LayoutGrid size={17}/>Каталог насосов</button><button className={section==='spares'?'active':''} onClick={()=>navigate('spares')}>Запчасти и комплектующие</button><button className={section==='families'?'active':''} onClick={()=>navigate('families')}>Серии A–Z</button><button className="about-link" onClick={()=>setAboutOpen(true)}>О каталоге<ArrowUpRight size={15}/></button></div></nav>

  <main className="container main">
   <div className="breadcrumb"><button onClick={()=>navigate('products')}>Главная</button><ChevronRight size={13}/><span>{section==='spares'?'Запчасти':section==='families'?'Серии A–Z':'Каталог насосов'}</span></div>
   <div className="page-title"><div><h1>{section==='spares'?'Запчасти и комплектующие':section==='families'?'Промышленные серии A–Z':'Промышленные насосы'}<span className="title-dot">.</span></h1></div><span className="title-meta">{section==='families'?families.length+' серий':section==='products'?products.length+' позиций':'Подбор по артикулу'}<br/><strong>Цены в узбекских сумах</strong></span></div>

   <p className="catalog-scope">{products.length} позиций · {products.filter(p=>p.price!==null).length} с предварительными ценами · {families.length} серии</p>
   {section!=='spares'&&<div className="quick-categories">{categories.slice(1,7).map(c=>{const Icon=iconMap[c.id];return <button key={c.id} onClick={()=>setCategory(category===c.id?'all':c.id)} className={category===c.id?'active':''}><Icon size={24} strokeWidth={1.3}/><span>{c.short}</span><ArrowUpRight size={13}/></button>;})}</div>}

   {section==='spares'?<section className="parts-layout">
    <div className="parts-main"><p className="eyebrow">ПОДБОР ПО ДАННЫМ НАСОСА</p><h2>Запчасти для<br/>промышленных насосов.</h2><p>У одной модели бывают разные исполнения. Номер изделия с заводской таблички помогает найти подходящую деталь.</p><label htmlFor="part-model">Модель или номер изделия</label><div className="part-search"><input id="part-model" placeholder="Например, CR 10-8 или номер изделия" value={partModel} onChange={e=>setPartModel(e.target.value)}/><button disabled={!partModel.trim()} onClick={async()=>{try{await navigator.clipboard.writeText(partModel.trim());toast.success('Номер скопирован. Вставьте его в Grundfos Product Center.');}catch{toast.error('Скопируйте номер вручную: '+partModel);}}}>Скопировать<Search size={18}/></button></div><a className="primary-button" href="https://product-selection.grundfos.com/" target="_blank" rel="noreferrer">Открыть каталог запчастей Grundfos<ArrowUpRight size={18}/></a><p className="minor-note">В Product Center выберите точное исполнение насоса → «Запчасти» → список по дате производства. Полная база запчастей пока не загружена. Для подбора подготовьте номер изделия, дату производства и фото заводской таблички.</p><a href="tel:+998909008805" className="detail-contact"><Phone size={17}/>Подбор запчасти: +998 90 900 88 05</a><button className="text-button" onClick={()=>{navigate('products');setCategory('controls');}}>Комплектующие с ценами<ArrowRight size={17}/></button></div>
    <div className="parts-types">{[['Уплотнения и ремкомплекты','Торцевые уплотнения, прокладки и кольца'],['Рабочие колёса и гидравлика','Детали проточной части насоса'],['Электродвигатели','Замена по исполнению и мощности'],['Электроника и управление','Модули, датчики и блоки управления']].map(([name,desc],i)=><div key={name}><span className="part-number">0{i+1}</span><div><h3>{name}</h3><p>{desc}</p></div><Wrench size={20}/></div>)}</div>
   </section>:<div className="catalog-layout">
    <aside className="desktop-filters">{Filters()}</aside>
    <section id="results" className="results">
     <div className="results-toolbar"><div className="results-title"><h2>{query?'Результаты поиска':selectedCategory.name}</h2><span aria-live="polite">{section==='families'||showSeriesFallback?filteredFamilies.length:filtered.length}</span></div><div className="toolbar-actions"><button className="mobile-filter-button" onClick={()=>setMobileFilters(true)}><SlidersHorizontal size={18}/>Фильтры</button>{section==='products'&&<><Select value={sort} onValueChange={setSort}><SelectTrigger className="sort-select" aria-label="Сортировка"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="default">По умолчанию</SelectItem><SelectItem value="price-asc">Сначала дешевле</SelectItem><SelectItem value="price-desc">Сначала дороже</SelectItem><SelectItem value="name">По названию</SelectItem></SelectContent></Select><div className="view-switch"><button aria-label="Плитка" aria-pressed={view==='grid'} className={view==='grid'?'active':''} onClick={()=>setView('grid')}><LayoutGrid size={18}/></button><button aria-label="Список" aria-pressed={view==='list'} className={view==='list'?'active':''} onClick={()=>setView('list')}><List size={18}/></button></div></>}</div></div>
     {hasFilters&&<div className="active-filters" aria-label="Применённые фильтры">{query&&<button onClick={()=>setQuery('')}>Поиск: {query}<X size={14}/></button>}{category!=='all'&&<button onClick={()=>setCategory('all')}>{selectedCategory.name}<X size={14}/></button>}{minPrice&&<button onClick={()=>setMinPrice('')}>От {money(Number(minPrice))} сум<X size={14}/></button>}{maxPrice&&<button onClick={()=>setMaxPrice('')}>До {money(Number(maxPrice))} сум<X size={14}/></button>}{pricedOnly&&<button onClick={()=>setPricedOnly(false)}>Только с ценой<X size={14}/></button>}</div>}
     {section==='products'&&!showSeriesFallback&&<div className="price-notice"><Info size={16}/><span>Предварительные цены в сумах. Комплектация, НДС и доставка — по условиям выбранной позиции.</span><button aria-label="Подробнее о ценах" onClick={()=>setAboutOpen(true)}><ArrowUpRight size={16}/></button></div>}
     {(section==='families'||showSeriesFallback)&&<div className="price-notice"><Info size={16}/><span>Справочник серий. Цены на все исполнения пока не опубликованы. Подбор: +998 90 900 88 05.</span></div>}
     {section==='products'&&!showSeriesFallback?<div className={'product-grid '+(view==='list'?'list-view':'')}>{filtered.slice(0,visibleCount).map(p=><article className="product-card" key={p.id}>
      <button className="product-photo-button" onClick={()=>openProduct(p)} aria-label={'Открыть '+p.name}><span className="product-tag">{categories.find(c=>c.id===p.category)?.short}</span><ProductImage product={p}/><span className="photo-arrow"><ArrowUpRight size={18}/></span></button>
      <div className="product-body"><p className="product-brand">GRUNDFOS</p><a className="product-name" href={productPath(p)}>{p.name}</a>{p.article&&<span className="article-number">Арт. {p.article}</span>}<p className="product-description">{p.description}</p><div className="product-specs">{Object.entries(p.specs).filter(([key])=>key!=='Исполнение').slice(0,2).map(([key,value])=><span key={key}><small>{key}</small><b>{value}</b></span>)}</div><div className="price-block"><span className="price-label">{p.price===null?'Стоимость исполнения':p.preliminary?'Предварительная цена':p.priceType==='reference'?'Справочная цена':'Цена'}</span><strong>{p.price!==null?<>{p.priceFrom?'от ':''}{money(p.price)} <small>сум</small></>:'Уточнить цену'}</strong><a href="tel:+998909008805">Уточнить поставку<Phone size={12}/></a>{p.priceNote&&<p className="card-price-note">{p.priceNote}</p>}</div><button className={'add-button '+(cart[p.id]?'added':'')} onClick={()=>add(p)}>{cart[p.id]?<><Check size={17}/>В списке: {cart[p.id]}</>:<><Plus size={17}/>В список подбора</>}</button></div>
     </article>)}</div>:<div className="family-grid">{filteredFamilies.slice(0,visibleCount).map(f=><a key={f.name} className="family-card" href={f.url} target="_blank" rel="noreferrer"><span className="family-category">{categories.find(c=>c.id===f.category)?.name}</span><h3>{f.name}<ArrowUpRight size={22}/></h3><p>{f.description}</p><span className="family-bottom">Исполнения и документация<ExternalLink size={14}/></span></a>)}</div>}
     {!showSeriesFallback&&(section==='products'?filtered.length:filteredFamilies.length)===0&&<div className="empty-state" role="status"><Search size={36} strokeWidth={1}/><h3>{section==='products'&&invalidPriceRange?'Проверьте диапазон цены':nearestProduct&&section==='products'?'В этом диапазоне цен моделей нет':'Модель пока не найдена'}</h3>
      <p>{section==='products'&&invalidPriceRange?'Цена «От» должна быть не больше цены «До».':nearestProduct&&section==='products'?'Ближайшая цена среди моделей, подходящих под ваш поиск:':`В каталоге пока ${products.length} моделей. Если нужной нет, уточните подбор по телефону.`}</p>
      {nearestProduct&&section==='products'&&<button className="nearest-product" onClick={()=>openProduct(nearestProduct)}><span><b>{nearestProduct.name}</b><small>{maxPrice&&nearestProduct.price!>Number(maxPrice)?'Выше вашего бюджета на '+money(nearestProduct.price!-Number(maxPrice))+' сум':'Ниже указанного минимума на '+money(Number(minPrice)-nearestProduct.price!)+' сум'}</small></span><strong>{priceText(nearestProduct)}<ArrowUpRight size={18}/></strong></button>}
      <div>{section==='products'&&(minPrice||maxPrice)?<button className="primary-button" onClick={resetPrices}>Убрать ограничение цены</button>:<button className="primary-button" onClick={reset}>Сбросить фильтры</button>}<a className="text-button" href="tel:+998909008805"><Phone size={16}/>Уточнить подбор</a></div>
      <p className="minor-note">Можно искать «насос CR 32-1» или «Грундфос TPE3». Цены предварительные.</p>
     </div>}
     {(section==='products'&&!showSeriesFallback?filtered.length:filteredFamilies.length)>visibleCount&&<button className="load-more" onClick={()=>setVisibleCount(v=>v+12)}>Показать ещё<Plus size={18}/></button>}
     <div className="catalog-bottom"><span>Показано {Math.min(visibleCount,section==='products'&&!showSeriesFallback?filtered.length:filteredFamilies.length)} из {section==='products'&&!showSeriesFallback?filtered.length:filteredFamilies.length}</span><a href="https://product-selection.grundfos.com/" target="_blank" rel="noreferrer">Полный каталог производителя<ArrowUpRight size={16}/></a></div>
    </section>
   </div>}
   <section className="model-directory" aria-labelledby="model-directory-title"><h2 id="model-directory-title">Все модели каталога</h2><p>Перейдите к характеристикам, фотографии и условиям поставки нужного исполнения.</p><div>{categories.filter(c=>c.id!=='all'&&products.some(p=>p.category===c.id)).map(c=><details key={c.id}><summary>{c.name}<span>{products.filter(p=>p.category===c.id).length}</span></summary><ul>{products.filter(p=>p.category===c.id).map(p=><li key={p.id}><a href={productPath(p)}>{p.name}{p.article&&<small> · {p.article}</small>}</a></li>)}</ul></details>)}</div></section>
   <section className="technical-strip"><div><Settings2 size={29} strokeWidth={1.2}/><div><h3>Каждая деталь имеет значение.</h3><p>Проверьте исполнение, напряжение и присоединительные размеры перед заказом.</p></div></div><button onClick={()=>navigate('families')}>Техническая документация<ArrowUpRight size={19}/></button></section>
  </main>

  <footer className="footer"><div className="container"><div className="footer-top"><div><strong>GRUNDFOS<span>UZBEKISTAN UZ</span></strong><p>Промышленное насосное оборудование для Узбекистана</p></div><div className="footer-contact"><a href="tel:+998909008805"><Phone size={18}/>+998 90 900 88 05</a><span>Подбор оборудования и связь с нами</span></div></div><div className="footer-bottom"><p>Независимый проект. Не является официальным сайтом или подтверждённым дилером Grundfos. Товарные знаки принадлежат их владельцам.</p><button onClick={()=>setAboutOpen(true)}>Информация о ценах</button></div></div></footer>

  <Sheet open={!!selected} onOpenChange={open=>{if(!open)closeProduct();}}><SheetContent className="product-sheet" showCloseButton={false}>{selected&&<><button className="panel-close" onClick={closeProduct} aria-label="Закрыть карточку"><X size={23}/></button><SheetHeader><p className="eyebrow">GRUNDFOS · {categories.find(c=>c.id===selected.category)?.name}</p><SheetTitle className="detail-title">{selected.name}</SheetTitle><SheetDescription>{selected.description}</SheetDescription></SheetHeader><ProductImage product={selected} large/>{selected.imageNote&&<p className="image-note">{selected.imageNote}</p>}<div className="detail-content"><a className="product-page-link" href={productPath(selected)}>Открыть страницу модели<ArrowUpRight size={16}/></a><div className="detail-price"><div><span className="price-label">{selected.price===null?'Стоимость исполнения':selected.preliminary?'Предварительная цена':selected.priceType==='reference'?'Справочная цена':'Цена'}</span><strong>{priceText(selected)}</strong>{selected.priceNote&&<p className="card-price-note">{selected.priceNote}</p>}</div><button className="primary-button" onClick={()=>add(selected)}><Plus size={18}/>В список</button></div><a href="tel:+998909008805" className="detail-contact"><Phone size={17}/>Обсудить подбор: +998 90 900 88 05</a><Tabs defaultValue="specs"><TabsList variant="line"><TabsTrigger value="specs">Характеристики</TabsTrigger><TabsTrigger value="source">Цена и поставка</TabsTrigger></TabsList><TabsContent value="specs"><dl className="spec-table"><div><dt>Производитель</dt><dd>Grundfos</dd></div><div><dt>Модель</dt><dd>{selected.name}</dd></div>{selected.article&&<div><dt>Артикул</dt><dd>{selected.article}</dd></div>}{Object.entries(selected.specs).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><p className="minor-note">Рабочую точку, присоединения и напряжение подтвердите для вашего проекта. {selected.sourceName.startsWith('Grundfos')?'Характеристики из каталога производителя.':'Характеристики из источника продавца.'} Сверьте полное исполнение с паспортом оборудования.</p></TabsContent><TabsContent value="source"><div className="source-detail"><h3>Условия поставки</h3><p>{selected.price===null?'Цена на это исполнение пока не подтверждена. Позвоните для уточнения подбора и поставки.':selected.preliminary?'Предварительная цена для указанной модели. Итоговая стоимость, комплектность, условия НДС и сроки поставки подтверждаются при согласовании заказа.':selected.priceType==='reference'?'Справочная цена стороннего продавца. Это не наша продажная цена и не подтверждение наличия.':'Продажная цена из загруженного прайса. Условия и наличие уточняются при заказе.'}</p><p>{'Данные проверены'}: {selected.checkedAt.split('-').reverse().join('.')}</p><a href="tel:+998909008805"><Phone size={17}/>+998 90 900 88 05</a></div></TabsContent></Tabs></div></>}</SheetContent></Sheet>

  <Sheet open={cartOpen} onOpenChange={setCartOpen}><SheetContent className="cart-sheet" showCloseButton={false}><button className="panel-close" onClick={()=>setCartOpen(false)} aria-label="Закрыть список"><X size={23}/></button><SheetHeader><p className="eyebrow">ВАШ ПОДБОР</p><SheetTitle>Мой список <span className="count">{cartCount}</span></SheetTitle><SheetDescription>Сохраните выбранные модели для уточнения поставки.</SheetDescription></SheetHeader>{cartItems.length?<><div className="cart-items">{cartItems.map(p=><div className="cart-item" key={p.id}><ProductImage product={p}/><div><h3>{p.name}</h3><p>{priceText(p)}</p><div className="quantity"><button aria-label={'Уменьшить '+p.name} onClick={()=>quantity(p.id,-1)}><Minus size={14}/></button><span>{cart[p.id]}</span><button aria-label={'Увеличить '+p.name} onClick={()=>quantity(p.id,1)}><Plus size={14}/></button></div></div><button className="remove-item" aria-label={'Удалить '+p.name} onClick={()=>setCart(prev=>{const next={...prev};delete next[p.id];return next;})}><Trash2 size={17}/></button></div>)}</div><div className="cart-summary"><span>По позициям с ценами</span><strong>{hasPricedCart?(totalFrom?'от ':'')+money(total)+' сум':'Сумма уточняется'}</strong>{unpricedCount>0&&<p className="unpriced-note">Без цены: {unpricedCount} поз. Они не включены в сумму.</p>}<p>Предварительная сумма. Наличие и условия поставки уточняются. Заказ автоматически не оформляется.</p><a className="primary-button" href={'/api/selection?items='+encodeURIComponent(JSON.stringify(cart))} download="Grundfos_UZ_selection.txt"><Download size={19}/>Скачать список</a><button className="detail-contact copy-selection" onClick={copySelection}>Скопировать список для сообщения</button><a href="tel:+998909008805" className="detail-contact"><Phone size={17}/>+998 90 900 88 05</a></div></>:<div className="empty-state"><ShoppingBag size={38} strokeWidth={1}/><h3>В списке пока пусто</h3><p>Добавьте насосы из каталога.</p><button className="primary-button" onClick={()=>setCartOpen(false)}>К каталогу<ArrowRight size={17}/></button></div>}</SheetContent></Sheet>

  <Sheet open={mobileFilters} onOpenChange={setMobileFilters}><SheetContent side="left" className="filter-sheet"><SheetHeader><SheetTitle>Фильтры каталога</SheetTitle><SheetDescription>Выберите категорию и диапазон цены.</SheetDescription></SheetHeader>{Filters()}<button className="primary-button apply-filters" onClick={()=>setMobileFilters(false)}>Показать результаты</button></SheetContent></Sheet>
  <Dialog open={aboutOpen} onOpenChange={setAboutOpen}><DialogContent className="about-dialog"><DialogHeader><DialogTitle>О каталоге и ценах</DialogTitle><DialogDescription>Grundfos Uzbekistan UZ · предварительная версия</DialogDescription></DialogHeader><p>Независимый каталог для рынка Узбекистана. Статус официального дилера не заявлен.</p><p>Цены в карточках — предварительные продажные цены. Конечная стоимость, комплектация, условия НДС, наличие и сроки поставки подтверждаются отдельно.</p><p>Сейчас в каталоге {products.length} моделей и {families.length} серий. Полная номенклатура, база запчастей и складские остатки ещё не подключены.</p><p>«Мой список» хранится только в вашем браузере. Скачивание списка не оформляет заказ и не отправляет его менеджеру.</p><a className="text-button" href="https://product-selection.grundfos.com/" target="_blank" rel="noreferrer">Grundfos Product Center<ArrowUpRight size={17}/></a></DialogContent></Dialog>
  <Toaster position="bottom-right"/>
 </>;
}
