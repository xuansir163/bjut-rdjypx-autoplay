// 本地模拟三页结构，验证 v1.9 课程串联层的判断（不联外网、不需要登录）
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
const ORIGIN = 'https://rdjypx.bjut.edu.cn';

const head = (title) => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>`;

const courseListHtml =
  head('我的课程') +
  '<div class="course_list"><ul>' +
  '<li><a href="/jjfz/lesson/video?lesson_id=1">专题一 党的性质与指导思想 8个视频</a></li>' +
  '<li><a href="/jjfz/lesson/video?lesson_id=2">专题二 党的纲领 6个视频</a></li>' +
  '<li><a href="/jjfz/lesson/video?lesson_id=3">专题三 党的组织制度 5个视频</a></li>' +
  '</ul></div></body></html>';

const videoListHtml =
  head('视频列表') +
  '<div class="video_lists"><ul>' +
  '<li style="color:#d32f2f"><a href="/jjfz/play?v_id=101&r_id=201&r=video&pg=1">1. 第一讲 12:30</a></li>' +
  '<li style="color:#d32f2f"><a href="/jjfz/play?v_id=102&r_id=202&r=video&pg=1">2. 第二讲 15:20</a></li>' +
  '<li><a href="/jjfz/play?v_id=103&r_id=203&r=video&pg=1">3. 第三讲 18:05</a></li>' +
  '</ul></div></body></html>';

const videoListAllRedHtml =
  head('视频列表') +
  '<div class="video_lists"><ul>' +
  '<li style="color:#d32f2f"><a href="/jjfz/play?v_id=101&r_id=201&r=video&pg=1">1. 第一讲 12:30</a></li>' +
  '<li style="color:#d32f2f"><a href="/jjfz/play?v_id=102&r_id=202&r=video&pg=1">2. 第二讲 15:20</a></li>' +
  '</ul></div></body></html>';

const playHtml =
  head('播放') +
  '<div class="video_lists"><ul>' +
  '<li><a href="/jjfz/play?v_id=101&r_id=201&r=video&pg=1">1. 第一讲 12:30</a></li>' +
  '<li class="active"><a href="/jjfz/play?v_id=102&r_id=202&r=video&pg=1">2. 第二讲 15:20</a></li>' +
  '</ul></div>' +
  '<div class="player"><video src="https://example.com/a.mp4" preload="none"></video></div>' +
  '</body></html>';

async function run(name, url, html, waitMs = 9000) {
  const vc = new VirtualConsole();
  const logs = [];
  vc.on('log', (...a) => logs.push(a.join(' ')));
  vc.on('jsdomError', (e) => {
    if (!/Not implemented: navigation/i.test(e.message)) logs.push('[jsdomError] ' + e.message);
  });

  const dom = new JSDOM(html, {
    url,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) {
      // 桩：Worker 不真的跑（否则心跳会和 setInterval 叠在一起）
      win.Worker = class {
        constructor() { this.onmessage = null; this.onerror = null; }
        postMessage() {}
        terminate() {}
      };
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

  await new Promise((r) => setTimeout(r, waitMs));
  const relevant = logs.filter((l) => /自动刷课|目录|脚本已加载|自动跳转/.test(l));
  console.log('\n=== ' + name + ' ===');
  relevant.slice(-8).forEach((l) => console.log('  ' + l));
  const acState = dom.window.__rdjypx ? dom.window.__rdjypx.ac() : null;
  if (acState) {
    console.log('  [state] 页面类型=' + acState['页面类型'] + ' 上次跳转=' + acState['上次跳转'] +
      ' 面板=' + acState['面板状态']);
  }
  dom.window.close();
  return acState || {};
}

const ok = (cond, msg) => console.log((cond ? '  ✅ ' : '  ❌ ') + msg);

// v1.10 起：目录页没识别过就不自动跳（否则人就来不及点「识别目录」），
// 这条只验证"不跳 + 提示"，识别后的跳转在 test/manifest.mjs 里验。
let r1 = await run('课程列表页（未识别）→ 不应跳，只提示识别', ORIGIN + '/jjfz/lesson', courseListHtml);
ok(!/前 →/.test(r1['上次跳转'] || ''), '未识别目录 → 没有自动跳走');
ok(/待识别目录/.test(r1['面板状态'] || ''), '面板提示「待识别目录」');

let r2 = await run('视频列表页（2红1黑）→ 应播第 3 个', ORIGIN + '/jjfz/lesson/video?lesson_id=1', videoListHtml);
ok(/v_id=103/.test(r2['上次跳转'] || ''), '跳到未标红的 v_id=103');

let r3 = await run('视频列表页（全红）→ 应回课程列表', ORIGIN + '/jjfz/lesson/video?lesson_id=1', videoListAllRedHtml);
ok(/\/jjfz\/lesson$/.test((r3['上次跳转'] || '').replace(/^.*→ /, '').trim()), '全红 → 回课程列表');

await run('播放页 → 不应抛错、不应乱跳', ORIGIN + '/jjfz/play?v_id=102&r_id=202&r=video&pg=1', playHtml, 6000);
