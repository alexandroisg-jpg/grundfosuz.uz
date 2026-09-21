import rawProducts from '@/data/products.json';
import rawFamilies from '@/data/families.json';
import {z} from 'zod';
export type Product = {
 id: string; name: string; category: string; description: string; article?: string;
 image?: string; imageNote?: string; price: number | null; priceType: 'reference' | 'sale'; preliminary?: boolean;
 source: string; sourceName: string; checkedAt: string; specs: Record<string,string>;
 priceFrom?: boolean; priceNote?: string; sourceUpdatedAt?: string;
};
export type Family = {name: string; category: string; description: string; url: string; image?: string};
const productSchema = z.object({id:z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).refine(id=>!['constructor','prototype'].includes(id)),name:z.string().min(1),category:z.string(),description:z.string(),article:z.string().optional(),image:z.string().optional(),imageNote:z.string().optional(),price:z.number().finite().nonnegative().nullable(),priceType:z.enum(['reference','sale']),preliminary:z.boolean().optional(),source:z.string().url(),sourceName:z.string(),checkedAt:z.string(),specs:z.record(z.string()),priceFrom:z.boolean().optional(),priceNote:z.string().optional(),sourceUpdatedAt:z.string().optional()});
export const products: Product[] = z.array(productSchema).parse(rawProducts);
export const families = rawFamilies as Family[];
export const categories = [
 {id:'all',name:'Всё оборудование',short:'Все насосы',hint:'Промышленный сектор'},
 {id:'multistage',name:'Многоступенчатые',short:'Многоступенчатые',hint:'CR · CRE · CRN'},
 {id:'endsuction',name:'Консольные',short:'Консольные',hint:'NB · NK · NBG'},
 {id:'inline',name:'Насосы in-line',short:'In-line',hint:'TP · TPE · MAGNA'},
 {id:'boosters',name:'Насосные станции',short:'Насосные станции',hint:'Hydro MPC · Multi-E'},
 {id:'dosing',name:'Дозирование',short:'Дозирование',hint:'DDA · DDC · DMH'},
 {id:'wastewater',name:'Сточные воды',short:'Сточные воды',hint:'SE · SL · S'},
 {id:'borehole',name:'Скважинные SP',short:'Скважинные SP',hint:'Водоснабжение и орошение'},
 {id:'fire',name:'Пожарные установки',short:'Пожаротушение',hint:'Hydro EN'},
 {id:'controls',name:'Автоматика',short:'Автоматика',hint:'Управление и защита'},
];
export function money(value: number) {return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(value);}
export function normalized(value: string) {return value.toLowerCase().replace(/ё/g,'е').replace(/грундфос/g,'grundfos').replace(/[\s\-–—/.,]/g,'');}
const genericWords = new Set(['насос','насосы','насоса','насосов']);
export function matchesSearch(fields:string[],query:string) {
 const tokens=query.toLowerCase().trim().split(/\s+/).filter(word=>!genericWords.has(word)).map(normalized).filter(Boolean);
 const searchable=fields.map(normalized);
 return tokens.every(token=>searchable.some(field=>field.includes(token)));
}
export function matchesProduct(p:Product,query:string) {
 const category=categories.find(c=>c.id===p.category);
 return matchesSearch(['Grundfos',p.name,p.article||'',p.description,p.category,category?.name||'',...Object.values(p.specs)],query);
}

export function priceText(p:Product){return p.price===null?'Уточнить цену':(p.priceFrom?'от ':'')+money(p.price)+' сум';}

export function matchesFamily(f:Family,query:string){const c=categories.find(c=>c.id===f.category);return matchesSearch(['Grundfos',f.name,f.description,c?.name||'',c?.short||'',c?.hint||''],query);}
