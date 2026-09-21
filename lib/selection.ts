import {products,money,priceText} from '@/lib/catalog';

export const MAX_SELECTION_LINES=100;
export function selectionText(items:Record<string,number>) {
 const rows=products.filter(p=>Object.hasOwn(items,p.id)&&Number.isInteger(items[p.id])&&items[p.id]>0&&items[p.id]<=999);
 const total=rows.reduce((sum,p)=>sum+(p.price??0)*items[p.id],0);
 const unknown=rows.filter(p=>p.price===null).length;
 const from=rows.some(p=>p.priceFrom&&p.price!==null);
 return ['GRUNDFOS UZBEKISTAN UZ','Запрос подбора — не оформленный заказ','',
  ...rows.flatMap(p=>[p.name+(p.article?' · арт. '+p.article:''),'Исполнение: '+(p.specs['Исполнение']||p.name),'Количество: '+items[p.id],
   'Цена '+(p.preliminary?'предварительная':p.priceType==='reference'?'справочная':'')+': '+priceText(p),
   ...(p.priceNote?[p.priceNote]:[]),'']),
  rows.some(p=>p.price!==null)?'Сумма по позициям с ценами: '+(from?'от ':'')+money(total)+' сум':'Сумма уточняется',
  ...(unknown?['Позиций без цены: '+unknown+'. Они не включены в сумму.']:[]),
  'Телефон: +998 90 900 88 05','',
  'Для подбора: среда, рабочие Q и H, температура, питание. Для запчасти: номер изделия и дата производства.',
  'Наличие, комплектация, условия НДС и поставки уточняются. Список не отправляется автоматически.'].join('\n');
}
