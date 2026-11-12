// Kjør med: npm run test:app
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lowestPrice, toSalon, withAddOns, type Service } from './salons.ts';

const LIFT: Service = { id: 'loft', name: 'Vippeløft', category: 'Vipper', durationMin: 60, priceNok: 700 };
const TINT: Service = { id: 'farge', name: 'Brynsfarge', category: 'Tillegg', durationMin: 15, priceNok: 150, addOn: true };
const FRENCH: Service = { id: 'french', name: 'French', category: 'Tillegg', durationMin: 0, priceNok: 50, addOn: true };

test('tilleggene legges til navn, tid og pris', () => {
  assert.deepEqual(withAddOns(LIFT, [TINT, FRENCH]), { name: 'Vippeløft + Brynsfarge + French', durationMin: 75, priceNok: 900 });
});

test('uten tillegg er timen bare tjenesten', () => {
  assert.deepEqual(withAddOns(LIFT, []), { name: 'Vippeløft', durationMin: 60, priceNok: 700 });
});

test('felt med feil form i databasen blir til trygg tekst', () => {
  const salon = toSalon('s', {
    services: [{ ...LIFT, category: { a: 1 }, description: 5 }],
    staff: [{ id: 'lina', name: 'Lina', title: ['Negletekniker'] }],
  });
  assert.equal(salon.services[0].category, 'Behandlinger');
  assert.equal(salon.services[0].description, undefined);
  assert.equal(salon.staff[0].title, '');
});

test('«fra»-prisen ser bort fra tilleggene', () => {
  assert.equal(lowestPrice(toSalon('s', { services: [LIFT, TINT, FRENCH] })), 700);
  assert.equal(lowestPrice(toSalon('s', { services: [TINT] })), null);
});
