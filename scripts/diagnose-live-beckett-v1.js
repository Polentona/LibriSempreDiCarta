const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const read = page => page.evaluate(() => ({
  title: document.getElementById('editTitle')?.value || '',
  author: document.getElementById('editAuthor')?.value || '',
  publisher: document.getElementById('editPublisher')?.value || '',
  saga: document.getElementById('editSaga')?.value || '',
  prequel: document.getElementById('editPrequel')?.value || '',
  sequel: document.getElementById('editSequel')?.value || '',
  status: document.getElementById('lookupStatus')?.innerText || '',
  policy: window.__LIB_SERIES_RELATION_POLICY || '',
  resolver: typeof window.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS,
  runtimeV6: !!window.__LIB_SERIES_AUTHORITATIVE_RUNTIME_V6,
  guard: !!window.__LIB_SERIES_SINGLE_OWNER_GUARD_V1,
  sanitizer: !!window.__LIB_ISBN_FIELD_SANITIZER_V1,
  cleanedPublisher: typeof window.__LIB_CLEAN_PUBLISHER === 'function' ? window.__LIB_CLEAN_PUBLISHER(document.getElementById('editPublisher')?.value || '') : ''
}));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1200 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => {
    if (r.status() >= 400) console.log('HTTP_ERROR', r.status(), r.url());
  });
  try {
    await page.goto('https://polentona.github.io/LibriSempreDiCarta/?beckett-diagnostic=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('#addBookBtn').click();
    await page.locator('#editDialog[open]').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('#editCode').fill('9788845279553');
    await page.locator('#lookupMetadataBtn').click();

    let lastKey = '';
    for (let i = 0; i < 70; i++) {
      await sleep(1000);
      const s = await read(page);
      const key = JSON.stringify(s);
      if (key !== lastKey) {
        console.log('STATE', i + 1, key);
        lastKey = key;
      }
      if (i === 12 || i === 30 || i === 55) {
        const direct = await page.evaluate(async () => {
          const fn = window.__LIB_RESOLVE_AUTHORITATIVE_SERIES_NEIGHBORS;
          if (typeof fn !== 'function') return { error: 'resolver missing' };
          const input = {
            code: document.getElementById('editCode')?.value || '',
            title: document.getElementById('editTitle')?.value || '',
            author: document.getElementById('editAuthor')?.value || '',
            saga: document.getElementById('editSaga')?.value || ''
          };
          try { return await fn(input); } catch (e) { return { error: String(e?.stack || e) }; }
        });
        console.log('DIRECT_RESOLVER', i + 1, JSON.stringify(direct));
      }
    }
    console.log('FINAL', JSON.stringify(await read(page)));
    if (errors.length) console.log('PAGE_ERRORS', JSON.stringify(errors));
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('DIAGNOSTIC_FAIL', e.stack || e); process.exit(1); });
