// Kjør med: npm run test:app
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPhone, toE164 } from './phone.ts';

test('norske nummer får +47', () => {
  assert.equal(toE164('912 34 567'), '+4791234567');
  assert.equal(toE164('+47 912 34 567'), '+4791234567');
  assert.equal(toE164('0047 91234567'), '+4791234567');
  assert.equal(toE164('(+47) 912-34-567'), '+4791234567');
});

test('utenlandske nummer beholdes', () => {
  assert.equal(toE164('+46 70 123 45 67'), '+46701234567');
});

test('ugyldige nummer avvises', () => {
  assert.equal(toE164(''), null);
  assert.equal(toE164('1234567'), null);
  assert.equal(toE164('+47 912 34 5678'), null);
  assert.equal(toE164('912 34 567 eller noe'), null);
});

test('norske nummer vises med mellomrom', () => {
  assert.equal(formatPhone('+4791234567'), '+47 912 34 567');
  assert.equal(formatPhone('+46701234567'), '+46701234567');
});
