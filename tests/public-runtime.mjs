import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from './browser.js';

const socket = createServer();
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
const url = `http://127.0.0.1:${port}/`;
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { ready = (await fetch(url)).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(ready, 'Preview server started');
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(180000);
  const errors = [], modelRequests = [], externalRequests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => {
    if (/\.(glb|gltf)(\?|$)|\/assets\/vehicles\//.test(r.url())) modelRequests.push(r.url());
    if (/^https?:/.test(r.url()) && !r.url().startsWith(url)) externalRequests.push(r.url());
  });
  await page.goto(url);
  await page.waitForFunction(() => window.__clr?.world && !window.__clr.entering);
  await page.keyboard.press('Enter');
  assert.deepEqual(await page.locator('.car-name').allTextContents(), ['TRAIL MINI', 'COAST CROSSOVER', 'SUNSET GT']);
  assert(await page.locator('.car-card-img').evaluateAll(imgs => imgs.length === 3 && imgs.every(i => i.complete && i.naturalWidth > 0)));
  await mkdir('screenshots/public-review', { recursive: true });
  await mkdir('outputs', { recursive: true });
  await page.screenshot({ path: 'screenshots/public-review/garage.png' });
  await page.locator('#drive-mode').selectOption('free');
  const routes = [['left','left'], ['left','right'], ['right','left'], ['right','right']];
  const expected = [ ['ri-edgewood','ct-mystic-harbor','ny-hudson-shore'], ['ri-edgewood','ct-mystic-harbor','ny-five-boroughs'], ['ri-edgewood','ct-new-london','ny-five-boroughs'], ['ri-edgewood','ct-new-london','ny-brooklyn-bridge'] ];
  const results = [];
  for (let i = 0; i < routes.length; i++) {
    await page.evaluate(async index => { const k = window.__clr; k.game.carIndex = index % 3; await k.game.start(); }, i);
    await page.waitForFunction(() => !window.__clr.entering && window.__clr.game.state === 'drive');
    await page.evaluate(() => { const k = window.__clr; k.game.paused = true; k.captureFrame(); });
    if (i < 3) await page.screenshot({ path: `screenshots/public-review/car-${i}.png` });
    const result = await page.evaluate(async branches => {
      const k = window.__clr, stages = [k.stage.id];
      for (const branch of branches) {
        k.sim.forkChosen = branch; k.P.leg = branch; k.game.finish();
        const deadline = performance.now() + 120000;
        while (k.entering) { if (performance.now() > deadline) throw Error('Stage transition timed out'); await new Promise(resolve => setTimeout(resolve, 20)); }
        k.game.paused = true; k.captureFrame(); stages.push(k.stage.id);
      }
      k.game.paused = false; k.game.finish();
      return stages;
    }, routes[i]);
    await page.waitForFunction(() => window.__clr.game.state === 'results');
    assert.deepEqual(result, expected[i]);
    results.push(result);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(modelRequests, []);
  assert.deepEqual(externalRequests, []);
  await writeFile('outputs/public-runtime.json', JSON.stringify({ routes: results, errors, modelRequests, externalRequests }, null, 2));
  console.log('PASS generic vehicle selections, rendered stage transitions on all 4 routes, results, and local-only assets');
} finally { await browser?.close(); server.kill(); }
