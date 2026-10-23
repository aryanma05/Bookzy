import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { previewHtml, toPreview } from './link';

const APP_URL = 'https://bookzy.no';

describe('forhåndsvisning av bookinglenken', () => {
  test('viser navnet, området og det første bildet', () => {
    const preview = toPreview('negler-hos-lina', {
      name: 'Negler hos Lina',
      category: 'Negler',
      area: 'Grünerløkka',
      address: 'Hjemmegata 1, Oslo',
      photos: ['https://bilder.no/forside.jpg', 'https://bilder.no/to.jpg'],
      published: true,
    });
    assert.ok(preview);
    assert.equal(preview.image, 'https://bilder.no/forside.jpg');
    assert.match(preview.text, /Negler · Grünerløkka/);
    assert.doesNotMatch(preview.text, /Hjemmegata/);
  });

  test('skjulte og ukjente salonger får ingen forhåndsvisning', () => {
    assert.equal(toPreview('a', { name: 'Skjult', published: false }), null);
    assert.equal(toPreview('a', undefined), null);
  });

  test('bare bilder på https', () => {
    assert.equal(toPreview('a', { name: 'Salong', photos: ['http://localhost:9199/x.jpg'] })?.image, null);
  });

  test('tekst fra eieren escapes, og nettleseren sendes til salongsiden', () => {
    const html = previewHtml(
      { id: 'salong-1', name: '<script>alert(1)</script>', text: 'Fin "salong"', image: null },
      `${APP_URL}/salong-1`,
      APP_URL
    );
    assert.doesNotMatch(html, /<script>alert/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /content="Fin &quot;salong&quot;"/);
    assert.match(html, /<meta property="og:image" content="https:\/\/bookzy.no\/icon.png">/);
    assert.match(html, /location.replace\("\/salon\/salong-1"/);
  });
});
