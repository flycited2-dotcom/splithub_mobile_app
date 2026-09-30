// Автотест: npx http-server -p 8765 . && node tools/e2e.js  (нужны playwright + chromium)
const { chromium } = require('playwright');
const path = require('path');
const APP = 'http://127.0.0.1:8765/index.html';
const SHOTS = path.join(__dirname, 'shots'); require('fs').mkdirSync(SHOTS, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });

  // ---------- Icons: render SVG to PNG ----------
  for (const [name, size, pad] of [['icon-192', 192, 0], ['icon-512', 512, 0], ['icon-maskable-512', 512, 0.1]]) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: size, height: size });
    const inner = Math.round(size * (1 - pad * 2));
    await p.setContent(`<html><body style="margin:0;background:${pad ? '#6c5ce7' : 'transparent'};width:${size}px;height:${size}px;display:grid;place-items:center"><img src="http://127.0.0.1:8765/icons/icon.svg" style="width:${inner}px;height:${inner}px"></body></html>`);
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${path.join(__dirname, '..', 'icons')}/${name}.png`, omitBackground: !pad });
    await p.close();
  }

  // ---------- Onboarding ----------
  await page.goto(APP); await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/01-onboard-1.png`, fullPage: true });
  await page.check('#consentDoctor'); await page.check('#consentAdult');
  await page.click('#onboardNext1'); await page.waitForTimeout(300);
  await page.fill('#childName', 'Миша');
  await page.click('.hero-pick:nth-child(3)');
  await page.screenshot({ path: `${SHOTS}/02-onboard-2.png`, fullPage: true });
  await page.click('#onboardStart'); await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/03-home-empty.png`, fullPage: true });

  // ---------- Enable demo mode via parent settings ----------
  await page.click('#parentBtn'); await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/04-parent-overview.png` });
  await page.click('#parentTabs .tab[data-tab="settings"]'); await page.waitForTimeout(200);
  await page.click(".switch:has(input[data-set=\"demo\"])");
  await page.screenshot({ path: `${SHOTS}/05-parent-settings.png` });
  await page.click('#closeParent'); await page.waitForTimeout(200);

  // ---------- Lesson 1: run all exercises quickly ----------
  await page.click('#todayBtn'); await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/06-lesson-idle.png`, fullPage: true });
  const n = await page.evaluate(() => LESSONS[0].exercises.length);
  for (let i = 0; i < n; i++) {
    await page.click('#startBtn');
    await page.waitForTimeout(700); // ready overlay (demo: quick)
    if (i === 0) await page.screenshot({ path: `${SHOTS}/07-lesson-ready.png` });
    await page.waitForTimeout(1500);
    if (i === 3) await page.screenshot({ path: `${SHOTS}/08-lesson-breath-running.png`, fullPage: true });
    // wait until done
    await page.waitForFunction(() => document.querySelector('#nextBtn').disabled === false, null, { timeout: 30000 });
    if (i === 0) await page.screenshot({ path: `${SHOTS}/09-lesson-done-feedback.png`, fullPage: true });
    await page.click(`.fb[data-fb="${i === 1 ? 'tired' : 'ok'}"]`);
    await page.click('#nextBtn'); await page.waitForTimeout(300);
  }
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/10-finish.png`, fullPage: true });
  const s1 = await page.evaluate(() => JSON.parse(localStorage.getItem('spinaQuest.v2')));
  console.log('SESSION1', JSON.stringify(s1.sessions[0]), 'xp', s1.xp, 'ach', Object.keys(s1.achievements));
  await page.click('#closeFinish'); await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/11-home-after-1.png`, fullPage: true });

  // ---------- Lesson 2 with sides + skip + pain stop ----------
  await page.evaluate(() => openLesson(3)); // Баланс героя: has sides
  await page.waitForTimeout(300);
  await page.click('#skipBtn'); await page.waitForTimeout(300); // skip warmup
  await page.click('#startBtn'); await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/12-lesson-sides.png`, fullPage: true });
  await page.click('#painBtn'); await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/13-pain-modal.png` });
  await page.click('#confirmPain'); await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/14-finish-stopped.png`, fullPage: true });
  await page.click('#closeFinish'); await page.waitForTimeout(300);

  // ---------- Locked lesson tap ----------
  await page.click('.lesson-card.locked'); await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOTS}/15-locked-toast.png` });

  // ---------- Trophies ----------
  await page.click('#trophyBtn'); await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/16-trophies.png`, fullPage: true });
  await page.click('#trophyBack');

  // ---------- Parent history + PIN ----------
  await page.click('#parentBtn'); await page.waitForTimeout(200);
  await page.click('#parentTabs .tab[data-tab="history"]'); await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOTS}/17-parent-history.png` });
  await page.click('#parentTabs .tab[data-tab="settings"]');
  await page.fill('#pinInput', '1234'); await page.click('#pinSave');
  await page.click('#closeParent'); await page.waitForTimeout(200);
  await page.click('#parentBtn'); await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOTS}/18-pin-gate.png` });
  for (const k of ['9', '9', '9', '9']) await page.click(`#pinPad button:text-is("${k}")`);
  await page.waitForTimeout(300);
  const gateStillShown = await page.evaluate(() => !document.querySelector('#pinGate').hidden);
  for (const k of ['1', '2', '3', '4']) await page.click(`#pinPad button:text-is("${k}")`);
  await page.waitForTimeout(300);
  const unlocked = await page.evaluate(() => document.querySelector('#pinGate').hidden && !document.querySelector('#parentBody').hidden);
  console.log('PIN wrong keeps gate:', gateStillShown, ' right unlocks:', unlocked);
  await page.click('#closeParent');

  // ---------- Legacy migration test ----------
  const p2 = await ctx.newPage();
  await p2.goto(APP); await p2.waitForTimeout(200);
  await p2.evaluate(() => { localStorage.clear(); localStorage.setItem('spinaQuestProgress', JSON.stringify({ 0: { stars: 3, date: '2026-09-28', comfort: 'ok' }, 1: { stars: 1, date: '2026-09-29', comfort: 'pain' } })); });
  await p2.goto(APP); await p2.waitForTimeout(300);
  const mig = await p2.evaluate(() => { const s = JSON.parse(localStorage.getItem('spinaQuest.v2') || 'null'); return s && { n: s.sessions.length, xp: s.xp, stars: s.sessions.map(x => x.stars), profile: s.profile }; });
  console.log('MIGRATION', JSON.stringify(mig));
  await p2.close();

  // ---------- All figures render ----------
  const figs = await page.evaluate(() => Object.keys(FIGURES).map(k => { const d = document.createElement('div'); d.innerHTML = figureSVG(k, k); return [k, d.querySelector('svg') ? d.querySelectorAll('polyline,circle').length : 0]; }));
  console.log('FIGURES', JSON.stringify(figs));
  // figure gallery screenshot
  await page.evaluate(() => { document.body.innerHTML = '<div id="gal" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px;background:#fff"></div>'; const g = document.getElementById('gal'); Object.keys(FIGURES).forEach(k => { const d = document.createElement('div'); d.className = 'demo'; d.style.height = '150px'; d.innerHTML = figureSVG(k, k); g.appendChild(d); }); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/19-figures.png`, fullPage: true });

  console.log('ERRORS', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e); process.exit(1); });
