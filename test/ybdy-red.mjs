// v1.14 核心回归：/ybdy 播放页侧栏「红色 = 这一集已经看完」
// 背景：v1.12 曾把红色误读成"当前播放集高亮"而停用颜色判断，导致
//   ① 看完的集被重播，② 全部看完了也不收尾（用户反馈"上完没上完识别不准"）。
// 这里用假页面把三条行为钉死：红集要跳、全红要回列表、全黑不许跳。
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require('jsdom'));
} catch (e) {
  ({ JSDOM, VirtualConsole } = createRequire('C:/Users/18792/.workbuddy/binaries/node/workspace/')('jsdom'));
}

const SRC = fs.readFileSync(new URL('../rdjypx-autoplay.user.js', import.meta.url), 'utf8');
const ORIGIN = 'https://rdjypx.bjut.edu.cn';
const ok = (cond, msg) => console.log((cond ? '  ✅ ' : '  ❌ ') + msg);

const EP = [
  { rid: 65161, name: '锲而不舍落实中央八项规定精神（上）' },
  { rid: 65162, name: '锲而不舍落实中央八项规定精神（中）' },
  { rid: 65163, name: '锲而不舍落实中央八项规定精神（下）' },
];

// redRids：哪些集**文字变红**（= 学习完成）
// dotRid：哪一集前面有个红色圆点（= 正在播放，不是完成）
function playHtml(redRids, dotRid) {
  const lis = EP.map((e) => {
    const red = redRids.indexOf(e.rid) >= 0;
    const dot = e.rid === dotRid;
    const dotHtml = dot ? '<span style="color:#f5222d">●</span> ' : '';
    return '<li>' + dotHtml +
      '<a href="/ybdy/play?v_id=18511&r_id=' + e.rid + '&r=video&pg="' +
      (red ? ' style="color:#f5222d"' : '') + '>' + e.name +
      ' <span style="color:#999">00:38:59</span></a></li>';
  }).join('');
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>学习</title></head><body>' +
    '<div class="course_catalog_list"><ul>' + lis + '</ul></div>' +
    '<div class="player"><video src="https://example.com/a.mp4" preload="none"></video></div>' +
    '</body></html>';
}

async function run(name, html, store, waitMs = 7000, rid = 65161) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (!/Not implemented/i.test(e.message)) console.log('  [err]', e.message); });
  const dom = new JSDOM(html, {
    url: ORIGIN + '/ybdy/play?v_id=18511' + (rid ? '&r_id=' + rid : '') + '&r=video&pg=',
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
      if (store) win.localStorage.setItem('rdjypx:ac', JSON.stringify(store));
    },
  });
  const s = dom.window.document.createElement('script');
  s.textContent = SRC;
  dom.window.document.body.appendChild(s);

  await new Promise((r) => setTimeout(r, waitMs));
  const host = Array.from(dom.window.document.querySelectorAll('div')).find((d) => d.shadowRoot);
  const panel = host && host.shadowRoot ? host.shadowRoot.textContent : '';
  const st = dom.window.__rdjypx ? dom.window.__rdjypx.ac() : {};
  console.log('\n=== ' + name + ' ===');
  console.log('  面板：' + (st['面板状态'] || '(无)'));
  dom.window.close();
  return { panel, st };
}

const manifest = [{
  id: 'V18511', text: '锲而不舍落实中央八项规定精神',
  url: ORIGIN + '/ybdy/play?v_id=18511&r=video&t=2', done: false,
}];
const baseStore = {
  stage: 'play', lesson: 'V18511', lessonText: '锲而不舍', done: [], pending: {},
  listUrl: ORIGIN + '/user/lesson', videoListUrl: '', manifest, manifestAt: Date.now(),
};

// A. 当前这一集已经红了（= 早看完了）→ 应立刻跳下一集，不重播
{
  const { panel, st } = await run('A 第 1 集已红 → 跳到第 2 集', playHtml([65161]), baseStore);
  ok(/切下一集|下一集/.test(panel), '面板出现「切下一集」：' + (panel.match(/当前集已标红[^\n]*/) || '(无)'));
  ok(!/继续播放/.test(st['面板状态'] || '') || /第 1\/3 集/.test(st['面板状态'] || ''),
    '没有卡在「继续播放」：' + st['面板状态']);
}

// B. 第 1、2 集红，第 3 集没红 → 也要把最后一集播完，不能因为"全是红"就以为整门完成
{
  const { st } = await run('B 前两集红、第 3 集未红 → 应该去播第 3 集', playHtml([65161, 65162]), baseStore);
  ok(!/\/user\/lesson$/.test((st['上次跳转'] || '').replace(/^.*→ /, '').trim()),
    '没有误判整门完成回列表：' + st['上次跳转']);
}

// C. 三集全红 → 这门课看完 → 回课程列表核对
{
  const { st } = await run('C 全部标红 → 回课程列表', playHtml([65161, 65162, 65163]), baseStore);
  ok(/\/user\/lesson/.test(st['上次跳转'] || ''), '回课程列表：' + (st['上次跳转'] || '(无)'));
  const pend = st['待平台确认'] || '';
  ok(/锲而不舍|V18511/.test(pend), '记为「待平台确认」而不是直接当完成：' + pend);
}

// D. 一集都没红 → 老老实实播，不许跳
{
  const { panel, st } = await run('D 全黑 → 不跳集', playHtml([]), baseStore);
  ok(!/切下一集/.test(panel), '没有触发切集');
  ok(!/\/user\/lesson/.test(st['上次跳转'] || ''), '没有跳去课程列表：' + (st['上次跳转'] || '(无)'));
}

// E ★v1.15：红点（正在播放）≠ 红字（学习完成）
//    第 2 集前面有红点、文字是黑的，且它就是当前集 → 绝不能因为"看到红色"就切走。
{
  const { panel, st } = await run('E 第 2 集有红点(正在播) + 第 1 集文字红 → 不该跳',
    playHtml([65161], 65162), baseStore, 7000, 65162);
  ok(!/当前集已标红/.test(panel), '当前集（红点、黑字）没被判成已完成');
  ok(/红\(已完成\) 1\/3/.test(panel), '只把文字发红的那 1 集算完成：' + (panel.match(/红\(已完成\)\s*\d+\/\d+/) || '(无)'));
  ok(!/全部走完/.test(st['面板状态'] || ''), '没有误判整门完成：' + st['面板状态']);
}

// F 全部红点、没有红字（全都没看完，只是某集在播）→ 一集都不算完成
{
  const { panel } = await run('F 只有红点没有红字 → 0 集完成', playHtml([], 65162), baseStore, 7000, 65162);
  ok(/红\(已完成\) 0\/3/.test(panel), '完成数 = 0：' + (panel.match(/红\(已完成\)\s*\d+\/\d+/) || '(无)'));
}

// G ★v1.16：URL 不带 r_id（SPA 跳转常态）+ 没有任何记忆 → 必须靠红点认出"正在播第 2 集"
//    旧版这种局面只能靠 K.last 记忆，记忆一失真就「无法确定当前是第几集」→ 播完不敢切。
{
  const { panel, st } = await run('G 无 r_id 无记忆 → 靠红点认出第 2 集', playHtml([], 65162), baseStore, 7000, null);
  ok(/第 2\/3 集/.test(panel), '面板显示「第 2/3 集」（识别而非记忆）：' + (panel.match(/第 \d\/\d 集|未定位集数/) || '(无)'));
  ok(!/未定位集数/.test(panel), '没有退化成「未定位集数」');
}

// I ★v1.16.2：单集课（目录只有 1 项）打开时就已经红 → 平台早记过完成，
//    必须立刻回课程列表核对，不许陪播全程（实机 2026-11-06：v1.16.1 的单集分支
//    无条件 return，把变红轮询的"已完成"信号吞掉，13 分钟的课从头陪播到尾）。
{
  const e = EP[0];
  const html1 = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>学习</title></head><body>' +
    '<div class="course_catalog_list"><ul>' +
    '<li><a href="/ybdy/play?v_id=18511&r_id=' + e.rid + '&r=video&pg=" style="color:#f5222d">' + e.name +
    ' <span style="color:#999">00:13:10</span></a></li>' +
    '</ul></div>' +
    '<div class="player"><video src="https://example.com/a.mp4" preload="none"></video></div>' +
    '</body></html>';
  const { panel, st } = await run('I 单集课已红 → 立即回列表，不陪播', html1, baseStore, 7000, e.rid);
  ok(/\/user\/lesson/.test(st['上次跳转'] || ''), '回课程列表：' + (st['上次跳转'] || '(无)'));
  ok(/单集课.*完成|只有 1 集且平台已标记完成/.test(panel), '面板日志给出单集完成原因：' +
    (panel.match(/[^\n]*单集[^\n]*/) || '(无)'));
  const pend = st['待平台确认'] || '';
  ok(/锲而不舍|V18511/.test(pend), '记为「待平台确认」交列表权威判定：' + pend);
}

// H ★v1.16：SPA 不换 URL 的连播里，每一集的「黑→红」都要触发切集
//    旧版变红基准只看 URL r_id（恒为空），第 1 集变红后基准卡死，第 2 集再变红不触发。
{
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (!/Not implemented/i.test(e.message)) console.log('  [err]', e.message); });
  const dom = new JSDOM(playHtml([], 65161), {
    url: ORIGIN + '/ybdy/play?v_id=18511&r=video&pg=',      // ← 故意不带 r_id
    runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(win) {
      win.Worker = class { constructor() {} postMessage() {} terminate() {} };
      win.URL.createObjectURL = () => 'blob:stub';
      const AC = class {
        constructor() { this.state = 'running'; this.destination = {}; }
        createOscillator() { return { frequency: {}, type: '', connect() {}, start() {} }; }
        createGain() { return { gain: {}, connect() {} }; }
        resume() { return Promise.resolve(); }
      };
      win.AudioContext = AC; win.webkitAudioContext = AC;
      win.localStorage.setItem('rdjypx:ac', JSON.stringify(baseStore));
    },
  });
  const s = dom.window.document.createElement('script');
  s.textContent = SRC;
  dom.window.document.body.appendChild(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const panelText = () => {
    const host = Array.from(dom.window.document.querySelectorAll('div')).find((d) => d.shadowRoot);
    return host && host.shadowRoot ? host.shadowRoot.textContent : '';
  };
  const epA = (rid) => dom.window.document.querySelector('a[href*="r_id=' + rid + '"]');

  console.log('\n=== H SPA 不换地址连播：每集「黑→红」都要触发切集 ===');
  await sleep(3200);                                   // 脚本启动，红点定位第 1 集
  epA(65161).setAttribute('style', 'color:#f5222d');   // 平台：第 1 集看完，文字变红
  await sleep(3400);                                   // 等 2s 轮询触发 + 切集动作落地
  // 平台把红点挪到第 2 集（SPA 连播，地址不变），第 2 集文字还是黑的
  const li1 = epA(65161).closest('li'), li2 = epA(65162).closest('li');
  const dot = li1.querySelector('span');
  if (dot) dot.remove();
  li2.insertBefore(dom.window.document.createElement('span'), li2.firstChild);
  li2.firstChild.setAttribute('style', 'color:#f5222d');
  li2.firstChild.textContent = '●';
  await sleep(2600);                                   // 轮询重建基准：第 2 集黑 → 不触发
  epA(65162).setAttribute('style', 'color:#f5222d');   // 平台：第 2 集也看完了
  await sleep(3400);                                   // 应再次触发「当前集已标红」
  const panel = panelText();
  const hits = (panel.match(/当前集已标红/g) || []).length;
  ok(hits >= 2, '两集的「黑→红」都触发了切集（实际 ' + hits + ' 次）');
  ok(/第 2\/3 集|全部走完|本集已完成|切下一集/.test(panel), '第 2 集变红后有后续动作：' + (panel.match(/全部走完|本集已完成[^\n]*/)?.[0] || '(看日志)'));
  dom.window.close();
}
