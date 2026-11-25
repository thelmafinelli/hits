const { chromium } = require('playwright');
const HOOK = 'https://webhook.site/f8122e1e-31cc-49c9-b0b4-d4678055a1ba';
const SITE = 'https://faucettasks.com';
const EMAIL = 'fx9k2mtq@gmail.com';
const PASS = 'Artex!2026xq';
const post = async (o) => { try { await fetch(HOOK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(o) }); } catch (e) { console.log('postfail', e.message); } };

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 }, locale: 'en-US', timezoneId: 'Europe/Berlin' });
  const page = await ctx.newPage();
  const ck = async () => (await ctx.cookies()).map(c => c.name + '=' + c.value).join('; ');
  try {
    await page.goto(SITE + '/register', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);
    const csrf = await page.evaluate(() => (document.querySelector('input[name=_token]') || {}).value || '');
    const formHtml = await page.evaluate(() => { const f = document.querySelector('form'); return f ? f.outerHTML.slice(0, 3000) : 'NOFORM'; });
    await post({ stage: 'page', csrf, form: formHtml, cookies: await ck(), ua: await page.evaluate(() => navigator.userAgent) });
    let clicked = false;
    try { await page.frameLocator('iframe[title="reCAPTCHA"]').locator('#recaptcha-anchor').click({ timeout: 25000 }); clicked = true; } catch (e) { await post({ stage: 'clickfail', err: e.message }); }
    let solved = false;
    for (let i = 0; i < 55; i++) {
      await page.waitForTimeout(2000);
      const v = await page.evaluate(() => (document.querySelector('[name=g-recaptcha-response]') || {}).value || '');
      if (v && v.length > 20) { solved = true; await post({ stage: 'token', token: v, csrf, cookies: await ck(), ua: await page.evaluate(() => navigator.userAgent) }); break; }
      if (i === 6) { const ch = await page.evaluate(() => { const f = document.querySelector('iframe[src*="bframe"]'); return f ? f.getBoundingClientRect().toJSON() : null; }); if (ch) await post({ stage: 'challenge_shown', rect: ch }); }
    }
    if (!solved) {
      const shot = (await page.screenshot({ type: 'jpeg', quality: 60 })).toString('base64');
      await post({ stage: 'no_token', csrf, shot });
      await browser.close(); return;
    }
    await post({ stage: 'token2', token: await page.evaluate(() => document.querySelector('[name=g-recaptcha-response]').value), cookies: await ck() });
    try {
      const fields = await page.evaluate(() => Array.from(document.querySelectorAll('form input')).map(e => ({ n: e.name, t: e.type })));
      const nMails = fields.filter(f => f.t === 'email').length;
      for (const f of fields) {
        if (f.t === 'email') await page.fill('input[name="' + f.n + '"]', EMAIL).catch(() => {});
        else if (f.t === 'password') { await page.fill('input[name="' + f.n + '"]', PASS).catch(() => {}); }
        else if (f.t === 'text' && /name|user/i.test(f.n)) await page.fill('input[name="' + f.n + '"]', 'ArtexProbe').catch(() => {});
      }
      await post({ stage: 'formfields', count: fields.length, mailFields: nMails });
      await page.click('form button[type=submit], form input[type=submit]', { timeout: 15000 }).catch(async e => { await post({ stage: 'submitfail', err: e.message }); });
      await page.waitForTimeout(7000);
      const html = await page.evaluate(() => document.documentElement.outerHTML.slice(0, 4000));
      await post({ stage: 'register_result', url: page.url(), cookies: await ck(), html });
    } catch (e) { await post({ stage: 'register_error', err: e.message }); }
  } catch (e) { await post({ stage: 'fatal', err: e.message }); }
  await browser.close();
})();
