// Render outro_animated.html to MP4:  node render_outro.js <w> <h> <out.mp4> [fps]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const [w, h, out, fps = 30] = [+process.argv[2], +process.argv[3], process.argv[4], +(process.argv[5] || 30)];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, 'outro_animated.html') + `?w=${w}&h=${h}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const dur = await page.evaluate(() => window.DUR);
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps),
    '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(dur * fps);
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.render(t), i / fps);
    ff.stdin.write(await page.screenshot({ type: 'png' }));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  if (errs.length) { console.error('page errors:', errs); process.exit(1); }
  console.log('wrote', out, n, 'frames');
})();
