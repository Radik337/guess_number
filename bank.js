const clean=s=>s.replace(/\u00a0|\u202f/g,' ').replace(/\s+/g,' ').trim();
const amounts=s=>[...s.matchAll(/[+−–-]?\s*\d[\d ]*,\d{2}(?!\d)/g)].map(m=>Math.round(Number(m[0].replace(/ /g,'').replace(/[−–]/g,'-').replace(',','.'))*100));
const iso=s=>s.split('.').reverse().join('-');
export function bankCategory(text){const s=text.toLowerCase();if(/азс|бензин|топлив|лукойл|газпромнефть|fuel/.test(s))return 'Бензин';if(/ремонт|автосервис|шиномонтаж/.test(s))return 'Ремонт машины';if(/супермаркет|продукт/.test(s))return 'Продукты';if(/кафе|ресторан|доставка еды/.test(s))return 'Кафе и рестораны';if(/здоровье|аптек|красота/.test(s))return 'Здоровье';if(/перевод|sbol/.test(s))return 'Переводы';return 'Прочее';}
// Input is grouped by visual line, in PDF reading order. No bank credentials or network.
export function parseSberLines(lines){const rows=[];const summary=[];let income=null,expense=null,current=null,account=null;
for(const raw of lines){const text=clean(raw.text);if(!text)continue;const acc=text.match(/^Номер сч[её]та\s+([\d ]+)/i);if(acc)account=acc[1].replace(/ /g,'');
 if(/ОСТАТОК СРЕДСТВ/i.test(text)&&/СУММА/i.test(text)){current=null;continue;}
 if(/Остаток на\s+\d{2}\.\d{2}\.\d{4}/i.test(text)){const d=text.match(/\d{2}\.\d{2}\.\d{4}/)[0],ns=amounts(text.slice(text.indexOf(d)+d.length));if(ns.length)summary.push({date:iso(d),balance:ns.at(-1)});current=null;continue;}
 if(/^Пополнение(?:\s|$)/i.test(text)){income=amounts(text).at(-1)??null;current=null;continue;}
 if(/^Списание(?:\s|$)/i.test(text)){expense=amounts(text).at(-1)??null;current=null;continue;}
 const start=text.match(/^(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})\b/);
 if(start){const ns=amounts(text);if(ns.length!==2)throw Error('Не удалось разобрать сумму и остаток одной из операций. Импорт остановлен.');current={date:iso(start[1]),time:start[2],amount:Math.abs(ns[0]),balance:ns[1],description:clean(text.replace(start[0],'').replace(/[+−–-]?\s*\d[\d ]*,\d{2}/g,''))};rows.push(current);continue;}
 const detail=text.match(/^\d{2}\.\d{2}\.\d{4}\s+\S+\s+(.+)$/);if(current&&detail){current.description+=' '+detail[1];continue;}
 if(/Продолжение|Страница|Для проверки|Действителен|Предоставляя|Зайдите|Получите|Нажмите/i.test(text)){current=null;continue;}
 if(current&&/^\*{4}\d{4}$/.test(text))continue;

}
if(!rows.length)throw Error('Операции не найдены. Поддерживается текстовая выписка Сбера с датой, временем, суммой и остатком. Скан и фото пока не поддерживаются.');
summary.sort((a,b)=>a.date.localeCompare(b.date));if(summary.length<2||income===null||expense===null)throw Error('Нужна полная выписка: начальный и конечный остаток, пополнения и списания за период.');
const opening=summary[0],closing=summary.at(-1);
let totalIn=0,totalOut=0;
rows.forEach((r,i)=>{const previous=i+1<rows.length?rows[i+1].balance:opening.balance,delta=r.balance-previous;if(Math.abs(delta)!==r.amount)throw Error('Остатки и суммы операций не сходятся. Возможно, выписка неполная или формат отличается — данные не сохранены.');r.amount=delta;r.description=clean(r.description);r.category=bankCategory(r.description);if(delta>0)totalIn+=delta;else totalOut-=delta;});
if(rows[0].balance!==closing.balance||totalIn!==income||totalOut!==expense||opening.balance+income-expense!==closing.balance)throw Error('Итоги выписки не совпали с операциями. Импорт остановлен, чтобы не показать неверный баланс.');
return {account,opening,closing,income,expense,transactions:rows};}
export function groupPdfItems(items){const groups=[];for(const item of items){if(!item.str?.trim())continue;const y=item.transform[5],x=item.transform[4];let line=groups.find(l=>Math.abs(l.y-y)<2.5);if(!line){line={y,items:[]};groups.push(line);}line.items.push({x,text:item.str});}return groups.sort((a,b)=>b.y-a.y).map(l=>({text:l.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' ')}));}
export function mergeStatement(bank,statement,hash){if(bank?.accountHash&&bank.accountHash!==statement.accountHash)throw Error('Эта выписка другого счёта. Сейчас поддерживается один счёт. Сначала экспортируйте копию и удалите банковские данные.');const next=structuredClone(bank||{transactions:[],files:[]});next.accountHash=statement.accountHash;if(next.files.includes(hash))throw Error('Этот PDF уже импортирован');const key=r=>JSON.stringify([r.date,r.time,r.amount,r.balance,r.description]);const oldCounts=new Map();for(const r of next.transactions){const k=key(r);oldCounts.set(k,(oldCounts.get(k)||0)+1);}const seen=new Map();let added=0;for(const r of statement.transactions){const k=key(r),count=(seen.get(k)||0)+1;seen.set(k,count);if(count>(oldCounts.get(k)||0)){next.transactions.push({...r,id:crypto.randomUUID()});added++;}}next.transactions.sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));next.files.push(hash);if(!next.closing||statement.closing.date>=next.closing.date){next.closing=statement.closing;next.opening=statement.opening;next.income=statement.income;next.expense=statement.expense;}return {bank:next,added};}
