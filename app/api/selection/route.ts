import {products} from '@/lib/catalog';
import {MAX_SELECTION_LINES,selectionText} from '@/lib/selection';

export function GET(request:Request) {
 const params=new URL(request.url).searchParams;
 let items:Record<string,number>;
 try {
  const raw=params.get('items')||'{}';
  if(raw.length>12000)throw new Error('too large');
  items=JSON.parse(raw);
  if(!items||Array.isArray(items)||typeof items!=='object'||Object.keys(items).length>MAX_SELECTION_LINES)throw new Error('invalid');
  for(const [id,qty] of Object.entries(items)){
   if(!products.some(p=>p.id===id)||!Number.isInteger(qty)||qty<1||qty>999)throw new Error('invalid item');
  }
 } catch {return new Response('Некорректный список оборудования',{status:400});}
 const rows=products.filter(p=>Object.hasOwn(items,p.id)&&items[p.id]);
 if(!rows.length)return new Response('Список пуст',{status:400});
 return new Response('\uFEFF'+selectionText(items),{headers:{
  'Content-Type':'text/plain; charset=utf-8','Content-Disposition':'attachment; filename="Grundfos_UZ_selection.txt"',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'
 }});
}
