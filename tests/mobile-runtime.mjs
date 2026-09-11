import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from './browser.js';
import { webkit } from 'playwright';
const engine = process.env.CLR_TEST_ENGINE === 'webkit' ? webkit : chromium;
const engineName = process.env.CLR_TEST_ENGINE === 'webkit' ? 'webkit' : 'chromium';
const socket = createServer();
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(url)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  browser = await engine.launch();
  const page = await browser.newPage({ viewport: { width: 932, height: 430 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await mkdir('screenshots/mobile-trial', { recursive: true });
  if (process.env.CLR_TEST_AUDIO_FALLBACK === '1') await page.addInitScript(() => {
    window.OfflineAudioContext = undefined;
    window.webkitOfflineAudioContext = undefined;
    HTMLMediaElement.prototype.canPlayType = () => '';
    window.decodedAudioCount = 0;
    const original = AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData = function (...args) {
      return original.apply(this, args).then(buffer => { window.decodedAudioCount++; return buffer; });
    };
  });
  await page.goto(url);
  await page.waitForFunction(() => window.__clr?.world && !window.__clr.entering);
  assert.equal(await page.locator('#device-notice').isVisible(), false);
  assert.equal(await page.evaluate(() => window.__clr.quality.level), 2);
  assert.equal(await page.evaluate(() => localStorage.getItem('coastline.mobileFrameLimit')), '30');
  await page.locator('#btn-start').tap();
  await page.waitForFunction(() => window.__clr.game.state === 'select');
  await page.screenshot({ path: 'screenshots/mobile-trial/garage.png' });
  await page.locator('#drive-mode').selectOption('free');
  await page.locator('#btn-go').tap();
  await page.waitForFunction(() => window.__clr.game.state === 'drive' && !document.querySelector('#race-sequence'));
  await page.waitForFunction(() => window.__clr.P.speed > 5);
  if (process.env.CLR_TEST_AUDIO_FALLBACK === '1') await page.waitForFunction(() => window.decodedAudioCount > 5);
  assert.equal(await page.locator('#touch-driving').count(), 1);

  const left = await page.locator('[data-steer="-1"]').boundingBox();
  const brake = await page.locator('#touch-brake').boundingBox();
  const point = (b, id) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2, id });
  if (engineName === 'chromium') {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(left, 1), point(brake, 2)] });
  await page.waitForFunction(() => window.__clr.input.steer < -0.1 && window.__clr.input.brake > 0.5);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  } else {
    await page.mouse.move(left.x + left.width / 2, left.y + left.height / 2);
    await page.mouse.down();
    await page.waitForFunction(() => window.__clr.input.steer < -0.1);
    await page.mouse.up();
    await page.locator('#touch-brake').tap();
  }
  await page.waitForFunction(() => window.__clr.input.touchSteer === 0 && window.__clr.input.touchBrake === 0);
  await page.locator('#pause-drive').tap();
  assert.equal(await page.evaluate(() => window.__clr.game.paused), true);
  assert.equal(await page.locator('#touch-driving').isVisible(), false);
  await page.locator('#resume-drive').tap();
  await page.waitForFunction(() => window.__clr.input.touchActive);
  await page.setViewportSize({ width: 430, height: 932 });
  await page.waitForFunction(() => window.__clr.game.paused);
  assert.equal(await page.locator('#device-notice').isVisible(), true);
  await page.setViewportSize({ width: 932, height: 430 });
  assert.equal(await page.evaluate(() => window.__clr.game.paused), true);
  await page.locator('#resume-drive').tap();
  await page.screenshot({ path: 'screenshots/mobile-trial/driving.png' });
  for (const [branch, stage] of [['left', 'ct-mystic-harbor'], ['right', 'ny-five-boroughs']]) {
    await page.evaluate(branch => { const k = window.__clr; k.sim.forkChosen = branch; k.P.leg = branch; k.game.finish(); }, branch);
    await page.waitForFunction(id => window.__clr.stage.id === id && !window.__clr.entering, stage);
  }
  const clearance = await page.evaluate(() => {
    const k = window.__clr, T = k.THREE;
    const bridges = k.world.landmarks.placed.filter(e => e.row.kind === 'span');
    const scenery = [k.world.scenery, ...k.world.chapters.map(c => c.scenery)];
    const matrix = new T.Matrix4(), position = new T.Vector3();
    let checked = 0, overlaps = 0;
    for (const group of scenery) for (const mesh of group.meshes) {
      if (!mesh.userData.facade) continue;
      mesh.geometry.computeBoundingBox();
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        const box = mesh.geometry.boundingBox.clone().applyMatrix4(matrix);
        for (const bridge of bridges) {
          const b = bridge.row, anchor = bridge.position, inverse = new T.Matrix4().makeRotationY(-b.heading);
          const local = new T.Box3();
          for (const x of [box.min.x, box.max.x]) for (const z of [box.min.z, box.max.z]) {
            position.set(x - anchor.x, 0, z - anchor.z).applyMatrix4(inverse); local.expandByPoint(position);
          }
          checked++;
          if (local.min.x < b.footprint.w * b.scale / 2 && local.max.x > -b.footprint.w * b.scale / 2 && local.min.z < b.footprint.d * b.scale / 2 && local.max.z > -b.footprint.d * b.scale / 2) overlaps++;
        }
      }
    }
    return { checked, overlaps, bridges: bridges.length };
  });
  assert(clearance.checked > 100);
  assert.equal(clearance.bridges, 2);
  assert.equal(clearance.overlaps, 0);
  for (const s of [0.18, 0.65, 0.7]) {
    await page.evaluate(s => {
      const k = window.__clr; k.game.paused = true; k.P.leg = 'main'; k.P.s = s; k.P.lateral = 0; k.P.speed = 0; k.P.slip = 0;
      const c = k.LEGS.main, t = c.getTangentAt(s); k.P.pos.copy(c.getPointAt(s)); k.P.heading = k.P.velDir = Math.atan2(t.x, t.z);
      k.sim._placeMesh(); k.chase.snapTo(k.P); k.world.updateChapters(k.sim.progress(), k.lighting, k.stage.lighting); k.frameOnce(0); k.captureFrame();
    }, s);
    await page.screenshot({ path: `screenshots/mobile-trial/bridge-${s}.png` });
  }
  assert.deepEqual(errors, []);
  await mkdir('outputs', { recursive: true });
  await writeFile(`outputs/mobile-runtime-${engineName}.json`, JSON.stringify({ engineName, audio: await page.evaluate(() => ({ supported: !!(window.AudioContext || window.webkitAudioContext), fallbackDecoded: window.decodedAudioCount || 0 })), clearance, errors, tests: ['touch launch', 'automatic acceleration', engineName === 'chromium' ? 'simultaneous steering and braking with touch cancellation' : 'held steering and brake tap', 'pause/resume', 'rotation pause', 'city bridge clearance'] }, null, 2));
  console.log(engineName, 'PASS mobile flow, input release, rotation pause, and bridge clearance', clearance);
} finally { await browser?.close(); server.kill(); }
