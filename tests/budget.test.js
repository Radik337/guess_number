import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,money,allocate,spend,milestone,validate} from '../budget.js';
test('доход сохраняет каждую копейку после распределения',()=>{const s=initial();const parts=allocate(s,10001);assert.equal(Object.values(parts).reduce((a,b)=>a+b,0),10001);assert.equal(s.balances.fuel,1500);assert.equal(s.balances.daily,5501);});
test('платежи резервируются по дате раньше процентов',()=>{const s=initial();s.credits=[{name:'Позже',date:'2026-12-10',amount:20000,saved:0},{name:'Раньше',date:'2026-11-10',amount:7000,saved:0}];allocate(s,10000);assert.equal(s.credits[1].saved,7000);assert.equal(s.credits[0].saved,3000);assert.equal(s.balances.credit,10000);assert.equal(s.balances.daily,0);});
test('частично накопленный кредит получает только недостающее',()=>{const s=initial();s.credits=[{name:'Кредит',date:'2026-11-10',amount:7000,saved:5000}];s.balances.credit=5000;allocate(s,10000);assert.equal(s.balances.credit,7000);assert.equal(s.balances.fuel,1200);});
test('траты не допускают отрицательных остатков',()=>{const s=initial();allocate(s,10000);spend(s,'fuel',1000);assert.equal(s.balances.fuel,500);assert.throws(()=>spend(s,'fuel',501));assert.throws(()=>spend(s,'credit',1));});
test('подушка переключает рубеж на точной границе',()=>{assert.equal(milestone(499999),5000);assert.equal(milestone(500000),10000);assert.equal(milestone(1000000),20000);});
test('неверные суммы и резервные копии отклоняются',()=>{for(const n of [0,-1,'abc',Infinity])assert.throws(()=>money(n));assert.equal(money('123.45'),12345);const s=initial();s.rates.fuel=99;assert.throws(()=>validate(s));assert.throws(()=>validate({}));});
