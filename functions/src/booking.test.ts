import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { serviceTitle } from './booking';

describe('navnet på timen i varslene', () => {
  const services = [
    { id: 'loft', name: 'Vippeløft' },
    { id: 'farge', name: 'Brynsfarge', addOn: true },
    { id: 'french', name: 'French', addOn: true },
  ];

  test('tilleggene kommer etter tjenesten', () => {
    assert.equal(serviceTitle(services, 'loft', ['farge', 'french']), 'Vippeløft + Brynsfarge + French');
  });

  test('uten tillegg er det bare tjenesten', () => {
    assert.equal(serviceTitle(services, 'loft', undefined), 'Vippeløft');
  });

  test('ukjente og slettede tillegg hoppes over', () => {
    assert.equal(serviceTitle(services, 'loft', ['borte', 42]), 'Vippeløft');
    assert.equal(serviceTitle(services, 'loft', 'farge'), 'Vippeløft');
  });

  test('tomt når tjenesten er slettet', () => {
    assert.equal(serviceTitle(services, 'borte', ['farge']), '');
  });
});
