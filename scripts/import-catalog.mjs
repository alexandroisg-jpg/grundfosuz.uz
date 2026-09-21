import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [file,mode]=process.argv.slice(2);
if(!file){console.error('Использование: node scripts/import-catalog.mjs supplier.json [--replace]');process.exit(1);}
if(mode&&mode!=='--replace')throw new Error('Допустим только параметр --replace');
const schema=z.object({
 id:z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).refine(id=>!['constructor','prototype'].includes(id),'Зарезервированный id'),
 name:z.string().min(1),
 category:z.enum(['multistage','endsuction','inline','boosters','dosing','wastewater','borehole','controls','fire']),
 description:z.string().min(1),article:z.string().optional(),
 image:z.string().refine(s=>/^https:\/\//.test(s)||/^\/images\/[a-zA-Z0-9._/-]+$/.test(s),'Нужен HTTPS URL или локальное изображение /images/...').optional(),
 imageNote:z.string().optional(),price:z.number().finite().nonnegative().nullable(),
 priceType:z.enum(['reference','sale']),preliminary:z.boolean().optional(),source:z.string().url().refine(s=>s.startsWith('https://')),sourceName:z.string().min(1),
 checkedAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),specs:z.record(z.string()),
 priceFrom:z.boolean().optional(),sourceUpdatedAt:z.string().optional(),priceNote:z.string().optional()
});
const rows=z.array(schema).min(1).parse(JSON.parse(fs.readFileSync(path.resolve(file),'utf8').replace(/^\uFEFF/,'')));
if(new Set(rows.map(p=>p.id)).size!==rows.length)throw new Error('В файле повторяются id. Импорт отменён.');
const target=path.join(root,'data/products.json');
const old=JSON.parse(fs.readFileSync(target,'utf8'));
const merged=new Map((mode==='--replace'?[]:old).map(p=>[p.id,p]));
for(const row of rows)merged.set(row.id,row);
const result=[...merged.values()];
fs.mkdirSync(path.join(root,'.catalog-backups'),{recursive:true});
fs.copyFileSync(target,path.join(root,'.catalog-backups',`products-${Date.now()}.json`));
const temp=target+'.tmp';fs.writeFileSync(temp,JSON.stringify(result,null,2)+'\n');fs.renameSync(temp,target);
console.log(`Готово: импортировано ${rows.length}; всего ${result.length}. Резервная копия сохранена. Выполните сборку для обновления сайта.`);
