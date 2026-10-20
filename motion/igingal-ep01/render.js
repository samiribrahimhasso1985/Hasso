// Renders index.html frame-by-frame with Playwright and pipes the frames into ffmpeg.
// Usage: node render.js [out.mp4] [fps]          — full render
//        node render.js --stills 5,15,30 dir     — PNG stills at given seconds
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

(async () => {
  const args = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.waitForFunction(() => window.READY === true);
  const stage = await page.$('#stage');

  if (args[0] === '--stills') {
    const dir = args[2] || 'stills';
    fs.mkdirSync(dir, { recursive: true });
    for (const s of args[1].split(',').map(Number)) {
      await page.evaluate(t => renderAt(t), s);
      await stage.screenshot({ path: path.join(dir, `t${String(s).padStart(5, '0')}.png`) });
    }
    await browser.close();
    return;
  }

  const out = args[0] || 'video-silent.mp4';
  const fps = Number(args[1] || 30);
  const duration = await page.evaluate(() => window.DURATION);
  const total = Math.round(duration * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    await page.evaluate(t => renderAt(t), f / fps);
    const buf = await stage.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % (fps * 10) === 0) console.log(`frame ${f}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('done', out);
})();
