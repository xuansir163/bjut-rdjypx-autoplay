// 用用户真实保存的「我的课程」页面（党旗飘飘 /user/lesson）验证识别与跳转
// 数据源：test/fixtures/my-courses-ybdy.html（2026-11-05 从平台 /user/lesson 保存的真实页面，已脱敏：无学号/姓名/会话）
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
const REAL = new URL('./fixtures/my-courses-ybdy.html', import.meta.url);
const ORIGIN = 'https://rdjypx.bjut.edu.cn';
const HTML = fs.readFileSync(REAL, 'utf8');

const ok = (cond, msg) => console.log((cond ? '  ✅ ' : '  ❌ ') + msg);

async function load(name, url, html, { store = null, act = null, wait = 4200 } = {}) {
  const vc = new VirtualConsole();
  const logs = [];
  vc.on('jsdomError', (e) => { if (!/Not implemented: navigation/i.test(e.message)) logs.push('[err] ' + e.message); });

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

  if (store) dom.window.localStorage.setItem('rdjypx:ac', store);
  dom.window.localStorage.setItem('rdjypx:on', '1');
  dom.window.localStorage.setItem('rdjypx:acoff', '0');

  const s = dom.window.document.createElement('script');
  s.textContent = SRC;
  dom.window.document.body.appendChild(s);

  await new Promise((r) => setTimeout(r, 500));
  let ret = null;
  if (act) { try { ret = act(dom.window); } catch (e) { logs.push('[act] ' + e.message); } }
  await new Promise((r) => setTimeout(r, wait));

  const st = dom.window.__rdjypx.ac();
  const saved = JSON.parse(dom.window.localStorage.getItem('rdjypx:ac') || '{}');
  const hostEl = Array.from(dom.window.document.querySelectorAll('div')).find((d) => d.shadowRoot);
  const panel = hostEl && hostEl.shadowRoot ? hostEl.shadowRoot.textContent : '';
  console.log('\n=== ' + name + ' ===');
  console.log('   页面类型: ' + st['页面类型'] + ' | 清单: ' + st['课程清单'] + ' | 上次跳转: ' + st['上次跳转']);
  dom.window.close();
  return { st, saved, panel, ret, logs };
}

// ① 真实页面：点「识别目录」应认出 11 门必读课，其中第 1 门已完成
{
  const { st, saved, panel } = await load('① 真实「我的课程」页 · 识别目录', ORIGIN + '/user/lesson', HTML, {
    act: (w) => w.__rdjypx.acScan(),
  });
  const mf = saved.manifest || [];
  ok(mf.length === 11, '认出 11 门课（实际 ' + mf.length + '）');
  ok(mf.filter((x) => x.done).length === 1, '其中 1 门已完成（实际 ' + mf.filter((x) => x.done).length + '）');
  ok(mf[0] && mf[0].done === true, '第 1 门「马克思主义的世界观和方法论」= 已完成');
  ok(/v_id=18511/.test((mf[1] || {}).url || ''), '第 2 门地址抄对了：' + (mf[1] || {}).url);
  ok(saved.listUrl === ORIGIN + '/user/lesson', '目录页地址：' + saved.listUrl);
  ok(/\/ybdy\/play\?v_id=18511/.test(st['上次跳转'] || ''), '识别后直接跳到第 2 门（第 1 门已完成，跳过）');
  ok(/选读课程还要选 11\.9 个学时/.test(panel), '提醒了选读课程还差 11.9 学时');
  console.log('   前 3 门: ' + mf.slice(0, 3).map((x) => (x.done ? '✔' : '○') + x.text.slice(0, 12)).join(' / '));
}

// ② 真实页面 + 已有清单（前两门已完成）→ 应跳到第 3 门
{
  const manifest = [
    { id: 'V18198', text: '马克思主义的世界观和方法论', url: ORIGIN + '/ybdy/play?v_id=18198&r=video&t=2', done: true },
    { id: 'V18511', text: '锲而不舍落实中央八项规定精神', url: ORIGIN + '/ybdy/play?v_id=18511&r=video&t=2', done: true },
  ];
  const store = JSON.stringify({
    stage: 'play', lesson: 'V18511', lessonText: '', done: ['V18198', 'V18511'],
    listUrl: ORIGIN + '/user/lesson', videoListUrl: '', manifest, manifestAt: Date.now(),
  });
  const { st, saved } = await load('② 回到列表 · 前两门已完成 → 跳第 3 门', ORIGIN + '/user/lesson', HTML, { store });
  ok(/v_id=18624/.test(st['上次跳转'] || ''), '跳到第 3 门 v_id=18624：' + st['上次跳转']);
  ok((saved.manifest || []).length === 11, '清单被刷新成 11 门（同一页的权威数据）');
}

// ③ 全部 11 门都完成 → 应停下，不再跳
{
  const manifest = [{ id: 'V1', text: 'x', url: ORIGIN + '/ybdy/play?v_id=1', done: true }];
  const allDone = HTML.replace(/未完成/g, '已完成');
  const store = JSON.stringify({ stage: 'courseList', lesson: '', done: [], listUrl: ORIGIN + '/user/lesson', videoListUrl: '', manifest, manifestAt: Date.now() });
  const { st } = await load('③ 全完成 → 停', ORIGIN + '/user/lesson', allDone, { store });
  ok(!/前 →/.test(st['上次跳转'] || ''), '没有跳转：' + st['上次跳转']);
  ok(/全部刷完/.test(st['面板状态'] || ''), '面板显示全部刷完：' + st['面板状态']);
}

// ④ 播放页（/ybdy/play）→ 不识别、不乱跳
{
  const play = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>学习</title></head><body>' +
    '<div class="player"><video src="https://example.com/a.mp4" preload="none"></video></div></body></html>';
  const store = JSON.stringify({
    stage: 'courseList', lesson: 'V18511', lessonText: '锲而不舍', done: ['V18198'],
    listUrl: ORIGIN + '/user/lesson', videoListUrl: '', manifestAt: Date.now(),
    manifest: [{ id: 'V18511', text: '锲而不舍', url: ORIGIN + '/ybdy/play?v_id=18511&r=video&t=2', done: false }],
  });
  const { st, panel } = await load('④ 播放页 · 不乱跳', ORIGIN + '/ybdy/play?v_id=18511&r=video&t=2', play, { store, wait: 5000 });
  ok(!/前 →/.test(st['上次跳转'] || ''), '播放页没有自动跳：' + st['上次跳转']);
  ok(st['页面类型'] === 'play', '页面类型识别为 play');
  ok(/播放|单集|目录/.test(panel), '面板有播放状态（不是识别失败）');
}
