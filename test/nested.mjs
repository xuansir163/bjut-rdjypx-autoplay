// 验证「一课多分支」的目录能被拆成一集一条
import fs from 'node:fs';
import { createRequire } from 'node:module';

// jsdom 优先用本项目 node_modules；没有就退回本机预装的存放路径（CI/裸机可自行 npm i jsdom）
const require = createRequire(import.meta.url);
let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require('jsdom'));
} catch (e) {
  ({ JSDOM, VirtualConsole } = createRequire('C:/Users/18792/.workbuddy/binaries/node/workspace/')('jsdom'));
}

const SRC = fs.readFileSync(new URL('../rdjypx-autoplay.user.js', import.meta.url), 'utf8');

const nested = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>播放</title></head><body>
<div class="video_lists"><ul>
  <li><span>第一章 党的性质</span>
    <a href="/jjfz/play?v_id=1&r_id=11&r=video&pg=1">第一节 党的性质 10:00</a>
    <a href="/jjfz/play?v_id=2&r_id=12&r=video&pg=1">第二节 党的宗旨 12:00</a>
  </li>
  <li><span>第二章 党的纲领</span>
    <a href="/jjfz/play?v_id=3&r_id=13&r=video&pg=1">第三节 最高纲领 09:30</a>
    <a href="/jjfz/play?v_id=4&r_id=14&r=video&pg=1">第四节 最低纲领 11:00</a>
  </li>
</ul></div>
<video src="https://example.com/a.mp4" preload="none"></video>
</body></html>`;

const flat = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>播放</title></head><body>
<div class="video_lists"><ul>
  <li><a href="/jjfz/play?v_id=1&r_id=11&r=video&pg=1">1. 第一节 党的性质 10:00</a></li>
  <li><a href="/jjfz/play?v_id=2&r_id=12&r=video&pg=1">2. 第二节 党的宗旨 12:00</a></li>
  <li><a href="/jjfz/play?v_id=3&r_id=13&r=video&pg=1">3. 第三节 最高纲领 09:30</a></li>
</ul></div>
<video src="https://example.com/a.mp4" preload="none"></video>
</body></html>`;

async function probe(name, html, url) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (!/navigation/i.test(e.message)) console.log('[err]', e.message); });
  const dom = new JSDOM(html, {
    url,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) {
      win.Worker = class { constructor() {} postMessage() {} terminate() {} };
      win.URL.createObjectURL = () => 'blob:stub';
      const AC = class {
        constructor() { this.state = 'running'; this.destination = {}; }
        createOscillator() { return { frequency: {}, type: '', connect() {}, start() {} }; }
        createGain() { return { gain: {}, connect() {} }; }
        resume() { return Promise.resolve(); }
      };
      win.AudioContext = AC;
      win.webkitAudioContext = AC;
    },
  });
  const s = dom.window.document.createElement('script');
  s.textContent = SRC;
  dom.window.document.body.appendChild(s);
  await new Promise((r) => setTimeout(r, 3500));
  console.log('\n=== ' + name + ' ===');
  console.log(dom.window.__rdjypx.dump());
  dom.window.close();
}

await probe('嵌套目录（2章×2集）→ 应拆成 4 集', nested, 'https://rdjypx.bjut.edu.cn/jjfz/play?v_id=1&r_id=11&r=video&pg=1');
await probe('平铺目录（3集）→ 应保持 3 集', flat, 'https://rdjypx.bjut.edu.cn/jjfz/play?v_id=1&r_id=11&r=video&pg=1');
