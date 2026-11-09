// node render_demo.js <url> <w> <h> <out.mp4>   (page must define window.render(t) and window.DUR)
const { chromium } = require('playwright'); const { spawn } = require('child_process');
(async () => {
  const [url, w, h, out] = [process.argv[2], +process.argv[3], +process.argv[4], process.argv[5]]; const fps = 30;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: w, height: h } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const dur = await p.evaluate(() => window.DUR);
  const ff = spawn('ffmpeg', ['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate',String(fps),'-i','-',
    '-c:v','libx264','-pix_fmt','yuv420p','-crf','17','-movflags','+faststart',out], { stdio: ['pipe','inherit','inherit'] });
  for (let i = 0; i < Math.round(dur * fps); i++) { await p.evaluate(t => window.render(t), i / fps); ff.stdin.write(await p.screenshot({ type: 'png' })); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
  if (errs.length) { console.error(errs); process.exit(1); } console.log('wrote', out);
})();
