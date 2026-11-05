// v1.10 课程清单（识别目录 → 逐门跳转）的本地模拟测试
// 不联外网、不需要登录：用 jsdom 造出平台三种页面，验证清单能不能记住、能不能按清单跳下一门
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

const head = (t) => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t}</title></head><body>`;

const courseListHtml =
  head('我的课程') +
  '<div class="course_list"><ul>' +
  '<li><a href="/jjfz/lesson/video?lesson_id=1">专题一 党的性质与指导思想 8个视频</a></li>' +
  '<li><a href="/jjfz/lesson/video?lesson_id=2">专题二 党的纲领 6个视频</a></li>' +
  '<li><a href="/jjfz/lesson/video?lesson_id=3">专题三 党的组织制度 5个视频</a></li>' +
  '</ul></div></body></html>';

const red = (v, r, t) => `<li style="color:#d32f2f"><a href="/jjfz/play?v_id=${v}&r_id=${r}&r=video&pg=1">${t} 12:30</a></li>`;
const black = (v, r, t) => `<li><a href="/jjfz/play?v_id=${v}&r_id=${r}&r=video&pg=1">${t} 18:05</a></li>`;

const vlAllRed = head('视频列表') + '<div class="video_lists"><ul>' +
  red(101, 201, '1. 第一讲') + red(102, 202, '2. 第二讲') + '</ul></div></body></html>';

const vlOneLeft = head('视频列表') + '<div class="video_lists"><ul>' +
  red(101, 201, '1. 第一讲') + red(102, 202, '2. 第二讲') + black(103, 203, '3. 第三讲') +
  '</ul></div></body></html>';

// 清单里两门课都完成的情形（用来验证"全部刷完"不会继续乱跳）
const doneStore = (obj) => JSON.stringify(obj);

function acState(manifest, extra = {}) {
  return doneStore(Object.assign({
    stage: 'videoList',
    lesson: '',
    lessonText: '',
    done: [],
    listUrl: ORIGIN + '/jjfz/lesson',
    videoListUrl: '',
    manifest,
    manifestAt: Date.now(),
  }, extra));
}

async function load(name, url, html, { store = null, act = null, wait = 4200 } = {}) {
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

  await new Promise((r) => setTimeout(r, 600));
  if (act) { try { act(dom.window); } catch (e) { logs.push('[act error] ' + e.message); } }
  await new Promise((r) => setTimeout(r, wait));

  const st = dom.window.__rdjypx ? dom.window.__rdjypx.ac() : {};
  const saved = JSON.parse(dom.window.localStorage.getItem('rdjypx:ac') || '{}');
  // 面板是 shadow DOM，脚本的 log() 写进面板、不走 console，所以直接读它的文字
  const hostEl = Array.from(dom.window.document.querySelectorAll('div')).find(function (d) { return d.shadowRoot; });
  const panel = hostEl && hostEl.shadowRoot ? hostEl.shadowRoot.textContent : '';
  console.log('\n=== ' + name + ' ===');
  logs.filter((l) => /识别|清单|刷课|跳转|目录/.test(l)).slice(-6).forEach((l) => console.log('   log: ' + l));
  console.log('   清单: ' + (st['课程清单'] || '?') + ' | 上次跳转: ' + (st['上次跳转'] || '?'));
  if (st['下一门课']) console.log('   下一门: ' + st['下一门课']);
  dom.window.close();
  return { st, saved, logs, panel };
}

const ok = (cond, msg) => console.log((cond ? '   ✅ ' : '   ❌ ') + msg);

// ① 课程列表页：点「识别目录」→ 应记下 3 门课 + 目录页地址，并自动进入第 1 门
{
  const { st, saved } = await load('① 课程列表页 · 点识别目录', ORIGIN + '/jjfz/lesson', courseListHtml, {
    act: (w) => w.__rdjypx.acScan(),
  });
  ok(saved.manifest && saved.manifest.length === 3, '清单记录 3 门课（实际 ' + (saved.manifest || []).length + '）');
  ok(saved.listUrl === ORIGIN + '/jjfz/lesson', '目录页地址已记住：' + saved.listUrl);
  ok(/lesson_id=1/.test((saved.manifest[0] || {}).url || ''), '第 1 门地址=清单第 1 条：' + (saved.manifest[0] || {}).url);
  ok(/lesson_id=2/.test((saved.manifest[1] || {}).url || ''), '第 2 门地址已抄下来（用于跳转）');
  ok(/video_list|lesson_id=1/.test(st['上次跳转'] || ''), '识别后自动进入第 1 门');
}

// ② 视频列表页（全红）+ 有清单 → 这门完 → 应直接跳清单里的第 2 门
{
  const manifest = [
    { id: 'L1', text: '专题一 党的性质与指导思想', url: ORIGIN + '/jjfz/lesson/video?lesson_id=1', done: false },
    { id: 'L2', text: '专题二 党的纲领', url: ORIGIN + '/jjfz/lesson/video?lesson_id=2', done: false },
    { id: 'L3', text: '专题三 党的组织制度', url: ORIGIN + '/jjfz/lesson/video?lesson_id=3', done: false },
  ];
  const { st, saved } = await load('② 视频列表全红 → 跳下一门', ORIGIN + '/jjfz/lesson/video?lesson_id=1', vlAllRed, {
    store: acState(manifest),
  });
  ok(/lesson_id=2/.test(st['上次跳转'] || ''), '直接跳到第 2 门（不先回目录页）：' + st['上次跳转']);
  ok((saved.done || []).includes('L1'), '第 1 门已打勾：' + JSON.stringify(saved.done));
  ok(saved.lesson === 'L2', '当前课程切到第 2 门：' + saved.lesson);
  ok((saved.manifest.find((x) => x.id === 'L1') || {}).done === true, '清单里第 1 门标记完成');
}

// ③ 视频列表页（还剩 1 个没红）+ 有清单 → 应播那一个，不该乱跳下一门
{
  const manifest = [
    { id: 'L1', text: '专题一', url: ORIGIN + '/jjfz/lesson/video?lesson_id=1', done: false },
    { id: 'L2', text: '专题二', url: ORIGIN + '/jjfz/lesson/video?lesson_id=2', done: false },
  ];
  const { st } = await load('③ 还剩 1 个视频 → 播它', ORIGIN + '/jjfz/lesson/video?lesson_id=1', vlOneLeft, {
    store: acState(manifest),
  });
  ok(/v_id=103/.test(st['上次跳转'] || ''), '跳到未标红的 v_id=103：' + st['上次跳转']);
  ok(!/lesson_id=2/.test(st['上次跳转'] || ''), '没有提前跳到下一门课');
}

// ④ 清单最后一门也刷完 → 应停下，不再跳
{
  const manifest = [
    { id: 'L1', text: '专题一', url: ORIGIN + '/jjfz/lesson/video?lesson_id=1', done: true },
    { id: 'L2', text: '专题二', url: ORIGIN + '/jjfz/lesson/video?lesson_id=2', done: false },
  ];
  const { st, saved } = await load('④ 清单最后一门刷完 → 停', ORIGIN + '/jjfz/lesson/video?lesson_id=2', vlAllRed, {
    store: acState(manifest, { lesson: 'L2' }),
  });
  ok(!st['上次跳转'] || /无/.test(st['上次跳转']), '没有继续跳转：' + st['上次跳转']);
  ok((saved.done || []).includes('L2'), '第 2 门已打勾：' + JSON.stringify(saved.done));
}

// ⑤ 平台路径不标准（不是 /jjfz/lesson，链接也没有 lesson_id）→ 仍要按"真实地址"记住
{
  const weird =
    head('我的课程') +
    '<div class="course_list"><ul>' +
    '<li><a href="/jjfz/lesson/detail/abc123">专题一 党的性质</a></li>' +
    '<li><a href="/jjfz/lesson/detail/def456">专题二 党的纲领</a></li>' +
    '</ul></div></body></html>';
  const { st, saved } = await load('⑤ 不标准路径 · 仍按真实地址记', ORIGIN + '/jjfz/myCourse', weird, {
    act: (w) => w.__rdjypx.acScan(),
  });
  ok((saved.manifest || []).length === 2, '清单记录 2 门（实际 ' + (saved.manifest || []).length + '）');
  ok(saved.listUrl === ORIGIN + '/jjfz/myCourse', '记住了这个不标准目录页地址：' + saved.listUrl);
  ok(/detail\/abc123/.test((saved.manifest[0] || {}).url || ''), '第 1 门存的是真实地址：' + (saved.manifest[0] || {}).url);
  ok(/detail\/def456/.test(st['上次跳转'] || '') || /\d+s 前/.test(st['上次跳转'] || ''), '能往外跳（自动进入第 1 门）');
}

// ⑥ 播放页点「识别目录」→ 必须拒绝，不能把某一集的地址当成课程入口
{
  const playHtml = head('播放') +
    '<div class="video_lists"><ul>' + red(101, 201, '1. 第一讲') + '</ul></div>' +
    '<div class="player"><video src="https://example.com/a.mp4" preload="none"></video></div></body></html>';
  const { st, saved, logs, panel } = await load('⑥ 播放页点识别 → 拒绝', ORIGIN + '/jjfz/play?v_id=101&r_id=201', playHtml, {
    act: (w) => w.__rdjypx.acScan(),
    wait: 2500,
  });
  ok(!saved.manifest || saved.manifest.length === 0, '播放页没有往清单里塞东西（' + JSON.stringify(saved.manifest || []) + '）');
  ok(/记不了整门课的地址清单/.test(panel), '面板给了明确提示：' + (panel.match(/[^ ]*记不了整门课的地址清单/) ? '有' : '（无）'));
}

