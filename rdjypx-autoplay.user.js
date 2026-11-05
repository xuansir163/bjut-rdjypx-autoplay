// ==UserScript==
// @name         北工大党校网课 · 自动连播
// @namespace    ClaireC.rdjypx.autoplay
// @version      1.13.1
// @description  自动点掉"当前视频播放完毕"提示框、自动切到下一集、点掉"继续观看"续播框与暂停框、被暂停自动续播；v1.12 按北工大党旗飘飘在线实测修正：播放页有侧栏多集（上/中/下），红色=当前播放集而非已完成；「我的课程」识别目录 → 一门刷完自动跳下一门。
// @author       ClaireC
// @homepageURL  https://github.com/xuansir163/bjut-rdjypx-autoplay
// @supportURL   https://github.com/xuansir163/bjut-rdjypx-autoplay/issues
// @updateURL    https://raw.githubusercontent.com/xuansir163/bjut-rdjypx-autoplay/main/rdjypx-autoplay.user.js
// @downloadURL  https://raw.githubusercontent.com/xuansir163/bjut-rdjypx-autoplay/main/rdjypx-autoplay.user.js
// @match        *://rdjypx.bjut.edu.cn/*
// @match        *://rdyplx.bjut.edu.cn/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

/*
  用法
  ────
  1) 浏览器装 Tampermonkey → 新建脚本 → 把本文件全部内容粘进去 → Ctrl+S 保存。
  2) 打开平台任意页面（推荐直接打开「我的课程」那一页），左上角会出现一个小面板。
  3) 播放页第一次用：如果面板写"未定位当前集"，在右侧目录里手动点一下你正在看的那一集，
     脚本会记住这个位置，之后全自动。

  ★ v1.12 按在线实测修正（2026-11-05，浏览器直连真实页面核实）
  ────────
  ① 播放页 /ybdy/play?v_id=…&r=video&t=2 有侧栏目录！
     一门课常拆成上/中/下好几集，每集是 /ybdy/play?v_id=…&r_id=…（r_id 才是单集标识）。
     侧栏红字/红点 = 当前正在播放的那一集，**不是"已完成"**（已完成课程的那集也照样红）。
     所以 /ybdy 页面上所有"红=完成"的判断都停用了；集数推进只认"真的播到结尾"。
  ② 打开带观看进度的视频会弹「温馨提示：该课程视频你上次观看到: XX:XX」，
     按钮「从头开始 / 继续观看」——脚本会自动点「继续观看」，从上次的地方接着播。
  ③ /ybdy/lesson、/ybdy/lesson/video 是「选课」页（有「选课」按钮），脚本永不介入，
     也不会把选课页当成课程列表去点里面的东西。选课必须你自己来。
  ④ 最后一集播完 → 回「我的课程」核对（卡片上的「已完成/未完成」才是权威结论），
     核对完自动跳清单里的下一门。

  ★ v1.11 结构备忘（/user/lesson 卡片）
  ────────
  实测结构（2026-11-05 由用户保存的真实页面确认）：
      我的课程  /user/lesson      ← 每门课一张卡片 div.study_plan2
                                    卡片里 <a class="plan_a" href="/ybdy/play?v_id=…">课名</a>
                                    状态就写在卡片里：绿色「已完成」/ 红色「未完成」
  注意：这里**红色 = 未完成**，跟老脚本"红=已完成"的假设正好相反，所以现在一律按
        「已完成 / 未完成」这几个字判断，不看颜色。

  流程：进 /user/lesson → 点「识别目录」→ 脚本抄下 11 门课的名字+地址+完成状态
        → 跳到第一门没完成的 /ybdy/play?v_id=… → 原速播完
        → 等 12 秒（给平台记学时）→ 回 /user/lesson 核对
        → 那门变「已完成」→ 自动跳下一门 → 直到 11 门全完成。

  ★v1.10 通用流程（其他模块 / 多集课程也适用）
  ────────
  1) 你自己打开课程列表页（能看到一门门课的地方），登录好。
  2) 点面板上的「识别目录」。
     脚本会把这一页的每门课的**名字 + 真实地址**抄下来存进本地，面板显示"清单 N 门"。
  3) 然后就别管了：一门刷完 → 直接跳到清单里的下一门课的地址 → 一直到最后。
     完成一门就在清单里打勾，浏览器关了重开也接着上次的进度。
  4) 课程有更新：回目录页再点一次「识别目录」。多集课程另外支持 /jjfz/… 那套结构。

  为什么要"手动点一下识别"，而不是全自动猜？
      平台三个页面的地址（课程列表 / 视频列表 / 播放页）脚本是认得出来的，
      但万一平台改了路径、或者你从别的入口进来，自动猜就会认错、甚至把别的按钮当播放页按钮点。
      由你指定"哪一页是课程目录"，之后每一步都走你这一页上抄下来的真实地址，最不容易出错。

  ★ 想让它"不用点、自己猜着跑"（v1.9 老办法）
  ────────
  控制台执行 __rdjypx.acBlind(true)，之后不点「识别目录」也会按老办法边看边猜：
      课程列表 /jjfz/lesson  →  视频列表 /jjfz/lesson/video?lesson_id=N  →  播放页 /jjfz/play
  默认是关的。原因很实在：自动跳会在你打开目录页两秒后就把你拽进第 1 门课，
  你根本来不及点「识别目录」。定位准不准另说，先别抢人的操作。

  已知边界
  ────────
  · 只有"看视频"这一段被自动化。章节测试 / 综合考试一律不碰（脚本见到 /exam 页面直接不动作）。
  · 平台如果给某集加了"必须看完 X 分钟才计入"的限制，脚本会按原速完整播完，不会跳。
  · 课程是否刷完靠"目录标红 + 视频列表全红"两个信号，平台改版后这两个信号可能失效，
    失效时面板会写"自动刷课已停"，控制台 __rdjypx.ac() 可以看当前状态和识别到的清单。

  设计原则
  ────────
  · 不写死 class 名。弹窗靠"文字 + 按钮文字"识别，目录靠"每项都带 mm:ss 时长"识别。
  · 「已完成」看目录文字是否变红 —— 平台原生规则就是"看完的标红"。
  · 视频没播到结尾时，绝不因为看到"播放完毕"字样就切集（曾因此跳掉没看完的集）。
  · 开头那个「我知道了」只关不切，判据是"最远播到过哪儿"(maxSeen)。
  · 定位不确定时绝不乱点（宁可停下等待，也不跳集漏学时）。
  · 倍速：面板「倍速」按钮循环 1.0→1.25→1.5→1.75→2.0（封顶 2 倍）。播放中平台把速度改回 1
    会被立刻掰回来并记日志。⚠️ 但要自己盯着学时涨幅：如果平台按真实时长记学时，倍速会少记，
    发现不对就调回 1.0——脚本不替你判断平台怎么记账。
——————————
主要功能： 
1.伪装页面可见。平台一旦发现切后台/最小化，就 player.pause() 并弹「视频已暂停，点击按钮后继续学习！」。但浏览器本身是允许后台播视频的，所以这里让它永远读到 visible：属性层面改掉，事件层面拦掉。
2.后台保活（这个看个人设置和电脑配置，不包全通。。）三个互相独立的机制：
       ① Worker 心跳  —— Worker 里的定时器不受"后台标签页节流"（主线程会被压到 1 分钟一次）
       ② 静音音频    —— 有音频输出的标签页，Chrome 不施加 intensive throttling、也不被内存节省丢弃
       ③ 画中画      —— 视频有独立可见窗口，浏览器完全按"正在播放"对待，最彻底
     前两个自动开，画中画要用户点一下（浏览器要求手势）。  
3.切集：一组课程内自动下一集。
let lastSwitchAt = 0;      // 上次切集的时刻，防止 ended 与弹窗两条路径重复触发
  let endStallAt = 0;        // 视频停在结尾、又没有提示框时的计时起点
  let allowEarlySwitchUntil = 0;  // 刚确认"平台已标红"时，允许不等播完就切（30 秒窗口）
  let navAtConfirm = '';          // 点"确认完成"那一刻的地址，用来判断平台有没有自己跳走
  let stallNudgeAt = 0;           // 上次"缓冲卡顿"推播放的时刻，防止连续狂推
  let noCatAt = 0;                // 找不到课程目录的起始时刻
  let allDone = false;            // 最后一集已被平台标红：不再切集，但脚本继续活着（暂停框还要点）
  let lastEpPending = false;      // 走到最后一集、平台还没记完成：哪怕到结尾也要把它推完
  let noNextAt = 0;               // 走到最后一集却还没标红：这条提示最多每分钟说一次
  let replayAt = 0;               // 最后一集"平台没记完成"时的重播计时起点
  let replayTries = 0;            // 重播次数（硬上限 1 次，防止无限循环）
4.课程目录识别。比如第几课里有几个分支。
5.防止暂停，点弹窗。这个没问题，但是建议全程放在前台。
6.本脚本可以记录播放效率，碰到低效率情况可以自行查看面板日志和事件，确认是网卡/被ban/还是放后台了跑不动。
*/

(function () {
  'use strict';

  if (window.top !== window.self) return;         // 只在顶层运行，内部再遍历同源 iframe
  if (window.__rdjypxAuto) return;                // 防重复注入
  window.__rdjypxAuto = true;

  /* ───────────────────────── 配置 ───────────────────────── */

  const CFG = {
    enabled: true,          // 总开关
    speed: 1,               // 倍速。1 = 原速。面板「倍速」按钮可调（1.0~2.0），存本地；播放中平台改回 1 会被立刻改回来
    autoNext: true,         // 自动切下一集
    skipDone: true,         // 遇到"已标红"的集跳过
    useColor: true,         // 用目录文字变红判断"已完成"（平台的完成标记就是红色）
    keepPlaying: true,      // 被暂停时自动续播
    confirmWait: 3000,      // 点完"确认完成"后等多久再切集（给平台记学时/提交完成留余地）
    switchJitter: [1400, 3200], // 切集前的随机延迟，避免机械节奏
    tickMs: 900,            // 轮询间隔
    autoCourse: true,       // ★v1.9 自动刷课：课程列表→视频列表→播放页 全自动串联
    acBlind: false,         // ★v1.10 盲跑模式：没识别过目录也自动猜着跳（老 v1.9 行为）。默认关，必须先点「识别目录」
    autoLocate: true,       // ★v1.9 定位不到当前集时，自动从第一集未完成的开始（不用手动点）
    acNavDelay: 1500,       // ★v1.9 确认要跳转后等多久再走（给页面留时间）
    singleWait: 12000,      // ★v1.10 单视频课程播完后等多久再回列表（给平台记学时/完成留余地）
  };

  const K = {
    on: 'rdjypx:on',
    last: 'rdjypx:last',
    done: 'rdjypx:done',
    fold: 'rdjypx:fold',
  };

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} },
  };

  /* ───────────────────────── 小工具 ───────────────────────── */

  const norm = (s) => (s == null ? '' : String(s)).replace(/\s+/g, ' ').trim();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = ([a, b]) => a + Math.random() * (b - a);
  const fmt = (s) => {
    if (!isFinite(s) || s < 0) return '--:--';
    const m = Math.floor(s / 60), x = Math.floor(s % 60);
    return m + ':' + String(x).padStart(2, '0');
  };
  const hash = (str) => {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  };

  /* ─────────────────── "已完成"判定：目录文字是否变红 ─────────────────── */
  // 平台规则（学员操作指南原文）："看完的视频会标红"。所以红色是权威信号，
  // 比猜 class 名可靠得多。只有"整份目录都发红"时才认定是站点主题色并停用。

  const RGB_RE = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/;

  function isRedish(css) {
    const m = (css || '').match(RGB_RE);
    if (!m) return false;
    const r = +m[1], g = +m[2], b = +m[3];
    // 红要够深、且明显压过绿蓝：排除白、黑、灰，也排除偏橙的"进行中"色
    return r >= 120 && r - g >= 55 && r - b >= 45 && g <= 100 && b <= 110;
  }

  // 红色往往落在子元素上（<li> 自身可能是 rgb(50,50,50)），所以要连子元素一起看。
  // 返回命中的色值与标签，方便诊断。
  function redInfo(el) {
    const test = (x) => {
      try {
        const c = getComputedStyle(x).color;
        return isRedish(c) ? c : '';
      } catch (e) { return ''; }
    };
    const own = test(el);
    if (own) return { red: true, color: own, tag: el.tagName.toLowerCase() };

    let kids;
    try { kids = el.querySelectorAll('*'); } catch (e) { kids = []; }
    let n = 0;
    for (const k of kids) {
      if (n++ >= 24) break;
      const t = k.textContent;
      if (!t || !t.trim()) continue;
      const c = test(k);
      if (c) return { red: true, color: c, tag: k.tagName.toLowerCase() };
    }
    return { red: false, color: '', tag: '' };
  }

  function hasRedText(el) {
    return redInfo(el).red;
  }

  const DONE_POS = /^(done|finish|finished|complete|completed|pass|passed|success|learned)$/i;
  const DONE_NEG = /^(un|not|no|in|dis|non|undone)$/i;

  function classSaysDone(el) {
    const nodes = [el].concat(Array.from((() => { try { return el.querySelectorAll('*'); } catch (e) { return []; } })()).slice(0, 6));
    for (const nd of nodes) {
      let cls = '';
      try { cls = nd.getAttribute('class') || ''; } catch (e) {}
      for (const tok of cls.split(/\s+/)) {
        if (!tok) continue;
        const parts = tok.split(/[-_]/);
        for (let i = 0; i < parts.length; i++) {
          if (!DONE_POS.test(parts[i])) continue;
          if (i > 0 && DONE_NEG.test(parts[i - 1])) continue;   // 否定前缀，如 un-finished / not-complete
          if (/^(un|dis|non)/i.test(parts[i])) continue;        // 单词自带否定
          return true;
        }
      }
    }
    return false;
  }

  /* ─────────────────────── 跨 iframe 遍历 ─────────────────────── */

  function allDocs() {
    const out = [document];
    const stack = [document];
    const seen = new Set([document]);
    while (stack.length && out.length < 12) {
      const d = stack.pop();
      let frames;
      try { frames = d.querySelectorAll('iframe, frame'); } catch (e) { continue; }
      for (const f of frames) {
        let cd = null;
        try { cd = f.contentDocument; } catch (e) { cd = null; }  // 跨域会抛错，跳过
        if (cd && !seen.has(cd)) { seen.add(cd); out.push(cd); stack.push(cd); }
      }
    }
    return out;
  }

  /* ───────────────────────── 视频 ───────────────────────── */

  let boundVideo = null;

  function findVideo() {
    let best = null, bestScore = -1;
    for (const d of allDocs()) {
      let vs;
      try { vs = d.querySelectorAll('video'); } catch (e) { continue; }
      for (const v of vs) {
        const dur = isFinite(v.duration) ? v.duration : 0;
        const area = (v.offsetWidth || 0) * (v.offsetHeight || 0);
        const score = dur * 1000 + area;
        if (score > bestScore) { bestScore = score; best = v; }
      }
    }
    return best;
  }

  function bindVideo(v) {
    if (!v || v === boundVideo) return;
    boundVideo = v;
    endStallAt = 0;                              // 换播放器重设"停在结尾"计时；maxSeen 不能清（同一集内重建会丢进度）
    try {
      v.addEventListener('ended', onEnded);
      v.addEventListener('play', () => { userPausedUntil = 0; autoStartNext = false; });
      v.addEventListener('pause', onPause);
      // 缓冲卡顿统计
      v.addEventListener('waiting', () => { if (!perf.stallStart) perf.stallStart = Date.now(); });
      v.addEventListener('playing', () => {
        if (perf.stallStart) { perf.stallMs += Date.now() - perf.stallStart; perf.stallStart = 0; }
      });
      // 倍速监察：不是我们要的速度 → 立刻掰回来并留证（平台播放器会主动改回 1）
      v.addEventListener('ratechange', () => {
        const want = CFG.speed || 1;
        const now = v.playbackRate || 1;
        if (Math.abs(now - want) > 0.01) {
          v.playbackRate = want;
          if (!bindVideo._rateLog || Date.now() - bindVideo._rateLog > 30000) {
            bindVideo._rateLog = Date.now();
            log('平台把倍速改回 ' + now + '，已重新设为 ' + want + 'x（每 30 秒最多提醒一次）');
          }
        }
      });
      // 后台保活：timeupdate 由媒体管线驱动，不受"页面隐藏后定时器降频"的影响。
      // 最小化放着时靠它继续跑主循环，弹窗才能被及时点掉——这是"比实际时间慢"的关键一环。
      v.addEventListener('timeupdate', () => {
        perfSample(v);                                   // 隐藏时定时器被降频，靠它保证统计不断
        enforceSpeed(v);                                 // 平台在 play/换源时会重置倍速，这里兜底
        if (perf.stallStart) {                           // 还在出进度 = 缓冲已恢复，结掉这段卡顿
          perf.stallMs += Date.now() - perf.stallStart;
          perf.stallStart = 0;
        }
        if (!realHidden) return;
        if (Date.now() - lastTickAt < 500) return;
        if (CFG.enabled && !switching) tick();
      });
      enforceSpeed(v);
      log('已接管播放器');
    } catch (e) {}
    autoStartNext = true;
  }

  // 把视频掰到用户要的倍速（每帧调用很便宜：只是读一个属性）
  function enforceSpeed(v) {
    if (!v || !CFG.speed || CFG.speed === 1) return;
    try {
      if (Math.abs((v.playbackRate || 1) - CFG.speed) > 0.01) v.playbackRate = CFG.speed;
    } catch (e) {}
  }

  function onEnded(e) {
    const v = (e && e.target) || findVideo();
    if (v && isFinite(v.duration) && v.duration > 0) { maxSeen = v.duration; seenRid = urlId('r_id') || seenRid; }   // 记下"确实播到底了"
    log('视频播放到结尾');
    markDone(currentKey());
    setTimeout(() => {
      if (findFinishDialog()) return;      // 弹窗还在，交给 handleFinish
      if (switchTimer) return;
      log('没等到完成提示，直接切下一集');
      scheduleNext();
    }, 3000);
  }

  let userPausedUntil = 0;
  let lastPointerAt = 0;
  let selfClickUntil = 0;        // 我们自己刚点过页面的时间窗（这期间的暂停不算"用户手动暂停"）

  function onPause() {
    // 关键：点「继续」这个动作本身会派出 mousedown，被下面的"用户点过页面"监听记成手动操作，
    // 于是平台紧接着再暂停一次时，脚本就以为是你按的，锁 2 分钟不动——日志里
    // "点「继续」恢复播放" 和 "检测到手动暂停" 同一秒出现，就是这么来的。
    if (Date.now() < selfClickUntil) return;

    // 用户刚点过就暂停 → 认为是他自己想停，2 分钟内不打扰
    if (Date.now() - lastPointerAt < 2000) {
      userPausedUntil = Date.now() + 120000;
      log('检测到手动暂停，2 分钟内不自动恢复');
      return;
    }

    // 不是用户按的 → 平台自己暂停的（切后台 / 每 5 分钟的 loop_pause）。
    if (!CFG.enabled || switching || Date.now() < userPausedUntil) return;

    // ★ 先同步拉一把（微任务，不受"后台定时器降频"影响）。
    //   以前只靠下面那个 700ms 的 setTimeout：页面隐藏满 5 分钟后 Chrome 把定时器压到
    //   一分钟一次，于是"等 700 毫秒"实际变成"等 30~60 秒"，这几十秒视频纯停着，
    //   面板上「停 13:46 / 效率 62%」大半是这么来的。
    Promise.resolve().then(() => {
      if (!CFG.enabled || switching || Date.now() < userPausedUntil) return;
      const nv = findVideo();
      if (!nv || !nv.paused || nv.ended) return;
      if (nearEnd(nv)) {
        // 到了结尾还停着：只有"这是最后一集且还没记完成"才需要继续把它推完
        if (!lastEpPending) return;
      }
      const p = findPauseDialog();
      if (p) { handlePause(p); return; }
      tryPlay(nv);
    });

    setTimeout(() => {
      if (!CFG.enabled || switching || Date.now() < userPausedUntil) return;
      const nv = findVideo();
      if (!nv || !nv.paused || nv.ended) return;
      if (nearEnd(nv) && !lastEpPending) return;      // 真的播完了，别硬拉回来重播
      const p = findPauseDialog();
      if (p) { handlePause(p); return; }              // 有「继续」框就点它
      tryPlay(nv);                                    // 没框也把视频拉回来
    }, 700);
  }

  let lastPlayAt = 0;

  function tryPlay(v) {
    if (!v) return;
    if (Date.now() - lastPlayAt < 1500) return;
    lastPlayAt = Date.now();
    let p;
    try { p = v.play(); } catch (e) { return; }
    if (p && p.catch) {
      p.catch(() => {
        if (!v.muted) {
          v.muted = true;
          log('自动播放被浏览器拦截，已静音重试（左下角喇叭可取消静音）');
          try { v.play().catch(() => {}); } catch (e) {}
        }
      });
    }
  }

  function ensurePlaying(v) {
    if (!CFG.keepPlaying || !v || switching) return;
    if (v.ended || !v.paused) return;
    if (Date.now() < userPausedUntil) return;
    const atEnd = isFinite(v.duration) && v.duration > 0 && v.currentTime >= v.duration - 1.2;
    if (atEnd) return;
    if (v.currentTime <= 0 && !autoStartNext) return;   // 还没开播，等用户点第一下
    if (v.readyState < 2) return;
    tryPlay(v);
  }

  /* v1.9：有些播放器不认 video.play()，必须先点一下它的大播放按钮（覆盖层）。
     只在"进页面 6 秒还停在 0 秒且暂停"时试一次，且只点播放器相关的选择器，
     绝不乱点页面上的其他按钮。 */
  let coldStartAt = 0;
  let bigPlayAt = 0;

  function nudgeBigPlay() {
    if (!CFG.enabled || switching) return;
    if (Date.now() - bigPlayAt < 8000) return;
    if (Date.now() - lastPointerAt < 15000) return;       // 用户刚动过，别抢
    const sels = [
      '.plyr__control[data-plyr="play"]', '.vjs-big-play-button', '.prism-big-play-btn',
      '.dplayer .dplayer-icons-play', '[class*="big-play"]', '[class*="bigplay"]',
      '.player .play', '.video-play-btn', '.play-btn',
    ];
    for (const d of allDocs()) {
      for (const s of sels) {
        let el;
        try { el = d.querySelector(s); } catch (e) { continue; }
        if (el && isVisible(el)) {
          bigPlayAt = Date.now();
          log('播放器没自动开播，点了一下它的大播放按钮');
          clickNative(el);
          return;
        }
      }
    }
  }

  /* ───────────────────────── 完成弹窗 ───────────────────────── */

  // 关键区分：视频开头也是"进度 0 + 暂停"，播完后播放器清零也是"进度 0 + 暂停"。
  // 只看当前进度永远分不清，所以记 maxSeen —— 这一集最远播到过哪儿。
  // 没播到过片头之后 = 还在开头（提示框只关、不切集）；到过结尾 = 真的播完了（可以切）。
  // ★ 硬门槛：任何"自动切集"都必须先过这一关 —— 视频真的到过结尾 8 秒以内。
  //   以前是百分比（96%）：30 分钟的片子 96% = 28:48，白砍最后 1~2 分钟，平台不记完成。
  //   改成秒数后又宽到 20 秒，实测在 25:04/25:20 就误判"已播完"，同样白砍 16 秒。
  //   采样是 250ms 一次，8 秒足够兜住 loop 提前回跳；再宽就是拿"看不完"换"少卡一下"，不划算。
  const END_TOLERANCE = 8;
  let maxSeen = 0;
  let seenRid = '';        // maxSeen 属于哪一集（r_id）。只有真换集才重置，播放器重建不清零
  let lastCur = -1;
  let lastCurAt = 0;
  let curWasRed = null;    // 当前集上一次检测到的"红"状态（null=还没建立基准）
  let redRid = '';         // curWasRed 基准属于哪一集（r_id）
  let loopCount = 0;       // 这一集视频 loop 重播（从结尾跳回开头）的次数
  let lastSampleTime = -1; // 上一次采样的 currentTime，用于检测 loop 归零

  function trackProgress(v) {
    if (!v) return;
    const rid = urlId('r_id') || '';
    if (rid !== seenRid) {                        // 真换集（r_id 变了）才重置最远进度
      seenRid = rid;
      maxSeen = 0;
      lastCur = -1; lastCurAt = 0;
      curWasRed = null; redRid = '';              // 换集，重新建立"红"状态基准
      loopCount = 0; lastSampleTime = -1;
    }
    const c = isFinite(v.currentTime) ? v.currentTime : 0;
    const d = isFinite(v.duration) ? v.duration : 0;
    if (c > maxSeen) maxSeen = c;
    // loop 重播检测：上一帧还在结尾(>80%)，这一帧突然回到片头(<15%)，说明整集播完被自动重播。
    // 这是比"停在结尾"更可靠的"播完过"铁证——平台常设 loop，ended 事件会被吞掉。
    // 判据收紧到"上一次采样已经在结尾 20 秒以内"。以前是 80%，播放器中途 seek 回 0
    // 就会被误判成"整遍播完"，进而提前切集。
    if (d > 0 && lastSampleTime >= d - END_TOLERANCE && c < Math.max(3, d * 0.15)) {
      loopCount++;
      log('检测到第 ' + loopCount + ' 次整遍重播（' + fmt(lastSampleTime) + ' → ' + fmt(c) + '）');
    }
    lastSampleTime = c;
    if (Math.abs(c - lastCur) > 0.05) { lastCur = c; lastCurAt = Date.now(); }
  }
  function stalledMs() {
    return lastCurAt ? Date.now() - lastCurAt : 0;
  }

  /* ───────────── 播放效率：视频真的推进了多少 vs 现实时间过了多少 ─────────────
     最小化放着时最容易被问的一句话是"怎么比实际时间慢"。慢的原因只有三类：
     ① 弹窗把视频暂停了，等脚本去点（浏览器在后台会把定时器降频，等得更久）；
     ② 缓冲卡顿；
     ③ 播放器把倍速改小了。
     这里把三类全部量化：效率 = 视频真实推进秒数 ÷ 墙上时钟秒数。 */
  const perf = {
    rid: '', wall0: 0, played: 0, pausedMs: 0, stallMs: 0, hiddenMs: 0,
    pauseStart: 0, stallStart: 0, hiddenAt: 0, lastC: -1, lastAt: 0,
  };

  function perfReset(rid) {
    perf.rid = rid; perf.wall0 = Date.now(); perf.played = 0;
    perf.pausedMs = 0; perf.stallMs = 0;
    perf.pauseStart = 0; perf.stallStart = 0;
    perf.lastC = -1; perf.lastAt = 0;
  }

  function perfSample(v) {
    if (!v) return;
    const rid = urlId('r_id') || '';
    // 注意：r_id 拿不到时（未定位集数）两个值都是空串，只比 rid 会漏掉初始化，
    // 导致 wall0 一直是 0、效率永远算成 0%。所以 wall0 为 0 也必须重置。
    if (rid !== perf.rid || !perf.wall0) perfReset(rid);
    const c = isFinite(v.currentTime) ? v.currentTime : 0;
    const now = Date.now();
    if (perf.lastC >= 0 && perf.lastAt) {
      const dc = c - perf.lastC;
      const dw = (now - perf.lastAt) / 1000;
      // 只累计"正常播放"的推进：跳转/倒退/大幅跳跃不算
      if (dc > 0 && dc <= dw * 3 + 2 && !v.paused) perf.played += dc;
    }
    perf.lastC = c; perf.lastAt = now;
    if (v.paused) { if (!perf.pauseStart) perf.pauseStart = now; }
    else if (perf.pauseStart) { perf.pausedMs += now - perf.pauseStart; perf.pauseStart = 0; }
  }

  function perfStat() {
    const wall = perf.wall0 ? Math.max(1, (Date.now() - perf.wall0) / 1000) : 1;
    const clamp = (s) => Math.min(wall, Math.max(0, s));
    const paused = clamp((perf.pausedMs + (perf.pauseStart ? Date.now() - perf.pauseStart : 0)) / 1000);
    const stall = clamp((perf.stallMs + (perf.stallStart ? Date.now() - perf.stallStart : 0)) / 1000);
    const hidden = (perf.hiddenMs + (perf.hiddenAt ? Date.now() - perf.hiddenAt : 0)) / 1000;
    const eff = Math.max(0, Math.min(100, Math.round(perf.played / wall * 100)));
    return {
      eff, wall, played: perf.played, paused, stall, hidden,
      text: '效率 ' + eff + '% · 停 ' + fmt(paused) + ' · 卡 ' + fmt(stall),
    };
  }

  // ★ 唯一的"播完了"判据。满足任意一条才算，全部锚在"结尾附近"，绝不按百分比砍：
  //   ① 浏览器明确报 ended；
  //   ② 现在就停在结尾 3 秒内；
  //   ③ 最远播到过 结尾-8 秒 以内（应对 loop 提前 seek 回 0）；
  //   ④ 检测到整遍重播（该检测本身已要求"从结尾 20 秒内跳回片头"）；
  //   ⑤ 极端兜底：卡在最后 90 秒内且整整 1 分钟没动（播放器重建把采样漏了，别永远卡死）。
  //   不满足就是"没播完"，谁都不许切集。
  function nearEnd(v) {
    if (!v) return false;
    if (v.ended) return true;
    const d = isFinite(v.duration) ? v.duration : 0;
    const c = isFinite(v.currentTime) ? v.currentTime : 0;
    if (d <= 0) return maxSeen > 30 && stalledMs() > 120000;   // 拿不到时长：只能靠"长时间不动"保守判断
    if (c >= d - 3) return true;
    if (maxSeen >= d - END_TOLERANCE) return true;
    if (loopCount >= 1) return true;
    if (maxSeen >= d - 90 && stalledMs() > 60000) return true;  // ⑤ 极端兜底
    return false;
  }

  // 'ended'   确实播完了 —— 可以点按钮、可以切下一集
  // 'start'   这一集还没真正开始 —— 只关提示框，绝不切集
  // 'playing' 播到中途（平台提前弹窗）—— 只关提示框，让它继续播
  // 'unknown' 拿不到时长 —— 保守处理，只关提示框
  function progressState(v) {
    if (!v) return 'unknown';
    const d = isFinite(v.duration) ? v.duration : 0;
    if (nearEnd(v)) return 'ended';
    if (d <= 0) return 'unknown';
    if (maxSeen < Math.min(6, d * 0.12)) return 'start';   // 连片头都没过去
    return 'playing';
  }

  function stateText(st, v) {
    const c = v ? fmt(v.currentTime) : '--:--';
    if (st === 'start') return '视频还在开头（' + c + '）';
    if (st === 'playing') return '视频才播到 ' + c + '，没到结尾';
    return '拿不到视频进度';
  }

  // 核心信号：当前这一集在目录里"由黑变红"。
  // 平台规则是"看完的视频会标红"，而且用户实测"播第一遍黑的、第二遍就红了"——
  // 也就是说第一遍播完、平台记上完成的那一刻，目录项会变红。这是比 maxSeen 采样更可靠的"播完了"信号，
  // 因为 loop 重播时进度条采样可能永远够不到结尾（播放器提前 seek 回 0）。
  // 只在"从黑变红"那一刻触发一次，避免误判（刚打开就已是红色的集不会触发，避免重看被立即切走）。
  function checkCurTurnedRed() {
    if (onYbdyPage()) return false;   // ★/ybdy 页面红色=当前播放集，"黑→红"在开播瞬间就会误触发，整段停用
    // 每次都强制重扫目录：平台"变红"常伴随目录 DOM 重建/替换，缓存里的旧 <li> 会变成
    // 脱离文档的死引用，永远读不到新颜色——这是之前"第二遍都红了却不切"的头号嫌疑。
    const cat = getCatalog(true);
    if (!cat || !cat.redUsable) return false;      // 整份目录都红/没有红色判定时，信号不可靠
    const idx = locateCurrent(cat);
    if (idx < 0) return false;
    const it = cat.items[idx];
    const rid = urlId('r_id') || '';
    let nowRed = false;
    try { nowRed = CFG.useColor ? it.red : !!it.doneHint; } catch (e) { nowRed = false; }
    if (redRid !== rid) {
      // 换集（或整页刷新后重新加载）时重建基准。
      // 关键：如果新集"本来就已经红"，说明脚本停在了一个历史已完成集上——
      // 之前这里 return false 会把基准锁成"红"，"黑→红"永远不再触发，于是卡在红集不动。
      // 改成 return nowRed：新集已红 → 返回 true 让调用方立即跳到下一个未完成集。
      redRid = rid;
      curWasRed = nowRed;
      return nowRed;
    }
    if (nowRed && !curWasRed) { curWasRed = true; return true; }             // 黑 → 红
    curWasRed = nowRed;
    return false;
  }

  // 完成弹窗正文的常见措辞。放宽一点：平台如果写的是"恭喜您完成本节学习"，
  // 原来的"学习完毕/学习完成"都匹配不上，就会漏掉整个确认环节（不点确认 = 平台不记完成）。
  const DONE_TXT = /播放完毕|观看完毕|学习完毕|已播完|播放完成|观看完成|学习完成|已学完|恭喜|已完成|完成本节|本节学习完成/;
  // 平台权威的"真的播完了"措辞（实测原文：当前视频播放完毕！）。
  // 这句话只会出现在结尾，比我自己采样进度更可信——视频重置回 0、采样漏掉最后几秒时，它是唯一铁证。
  const DONE_STRONG = /播放完毕|观看完毕|学习完毕|已播完/;
  const OK_BTN = /^(我知道了|知道了|确定|确认|好的|继续观看|继续学习|确定完成|确认完成|提交|完成|已完成|是|OK|ok)$/;
  // 「视频已暂停，点击按钮后继续学习！」——平台每 5 分钟用 loop_pause() 弹一次的中断框。
  // 它的按钮只有一个「继续」，既不在上面的白名单里、正文也不含任何"播放完毕"字样，
  // 所以旧版完全不认识它：框一直挂着，视频就一直停着，一集能白丢好几分钟。
  // 「视频已暂停…」中断框 + 「该课程视频你上次观看到: XX:XX」续播框（2026-11-05 实测）。
  // 续播框正文没有"暂停"字样，只有"上次观看到"，靠这段匹配；按钮是「继续观看」/「从头开始」。
  const PAUSE_TXT = /视频已暂停|已暂停|暂停播放|点击按钮后继续|点击.{0,6}继续学习|继续学习|上次观看/;
  const PAUSE_BTN = /^(继续|继续播放|继续学习|继续观看|点击继续|继续播放学习)$/;
  const BTN_SEL = 'button, input[type=button], input[type=submit], a, [onclick], [role=button], .layui-layer-btn a, .el-button, .ivu-btn';

  function isVisible(el) {
    try {
      if (el.getClientRects().length === 0) return false;         // display:none 在这就挡掉了
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
      if (parseFloat(cs.opacity) < 0.05) return false;
      return true;
    } catch (e) { return true; }
  }

  function findFinishDialog() {
    for (const d of allDocs()) {
      let btns;
      try { btns = d.querySelectorAll(BTN_SEL); } catch (e) { continue; }
      for (const b of btns) {
        const label = norm(b.textContent || b.value || '');
        if (!label || label.length > 10 || !OK_BTN.test(label)) continue;
        if (!isVisible(b)) continue;                                  // 隐藏的模板按钮不算
        let p = b.parentElement, depth = 0;
        while (p && depth < 7) {
          const t = p.textContent || '';
          if (t.length > 400) break;                       // 爬到整页了，收手
          if (DONE_TXT.test(t)) {                          // 只认按钮本身可见，容器不苛求
            return { btn: b, box: p, strong: DONE_STRONG.test(t) };
          }
          p = p.parentElement; depth++;
        }
      }
    }
    return null;
  }

  // 识别"视频已暂停"这个中断框。它不是完成提示，点它只是恢复播放。
  // 注意：面板本身在 Shadow DOM 里，document.querySelectorAll 看不到，不会被误点。
  function findPauseDialog() {
    for (const d of allDocs()) {
      let btns;
      try { btns = d.querySelectorAll(BTN_SEL); } catch (e) { continue; }
      for (const b of btns) {
        const label = norm(b.textContent || b.value || '');
        if (!label || label.length > 8 || !PAUSE_BTN.test(label)) continue;
        if (!isVisible(b)) continue;
        let p = b.parentElement, depth = 0;
        while (p && depth < 7) {
          const t = p.textContent || '';
          if (t.length > 400) break;                    // 爬到整页了，收手
          if (PAUSE_TXT.test(t)) return { btn: b, box: p };
          p = p.parentElement; depth++;
        }
      }
    }
    return null;
  }

  let lastPauseClickAt = 0;

  // 点「继续」。只恢复播放，永远不切集、也不动完成状态。
  function handlePause(dlg) {
    // 用户自己刚按了暂停：这个框很可能是平台对"pause"事件的反应，别跟他抢。
    if (Date.now() < userPausedUntil) return true;
    const v = findVideo();
    // 只有"视频真的结束了"（ended）才交给切集逻辑收尾。
    // ★ 这里以前写的是 nearEnd(v)（距结尾 20 秒内），酿成过最严重的一次死结：
    //   平台在 25:04/25:20 弹出「视频已暂停…继续学习」，脚本认为"已经到结尾、不必点"，
    //   框就一直挂着、视频停着；随后切集逻辑发现"这是最后一集"，把脚本自己关掉，
    //   最后那 16 秒永远播不到 → 平台永远不记完成 → 目录永远是黑的。别再放宽这个条件。
    if (v && v.ended) return false;
    if (Date.now() - lastPauseClickAt < 1500) return true;   // 刚点过，等它自己消失
    lastPauseClickAt = Date.now();
    const pausedSec = perf.pauseStart ? Math.round((Date.now() - perf.pauseStart) / 1000) : 0;
    clickNative(dlg.btn);
    log('点「继续」恢复播放' + (pausedSec >= 2 ? '（视频已停 ' + fmt(pausedSec) + '）' : ''));
    setStatus('已恢复播放', '点了「继续」，视频继续走');
    // 框关掉了、视频却还暂停着的情况也见过，补一手。
    setTimeout(() => {
      const nv = findVideo();
      if (nv && nv.paused && !nv.ended) tryPlay(nv);
    }, 900);
    return true;
  }

  let lastConfirmAt = 0;
  let confirmTries = 0;          // 同一个"确认完成"框点了几次（点不掉就补点，绝不硬切）
  let dismissAt = 0;             // 上次关"开头提示框"的时刻，防止连点
  let dismissCount = 0;          // 同一个框点了几次还没消失
  let dialogSince = 0;           // 这一轮弹窗从什么时候开始一直挂着
  let awaitingSwitchUntil = 0;   // 已确认完成、正在等切集，期间不再碰弹窗

  function handleFinish(dlg) {
    // 已经点过确认、正在等切集：如果框还赖着不走，说明刚才那一下没点着（被遮挡/没绑事件）。
    // 这时绝不能硬切——补点一次并把切集往后推，确保平台真的收到"确认完成"再走。
    if (Date.now() < awaitingSwitchUntil) {
      if (Date.now() - lastConfirmAt > 3000 && confirmTries < 3) {
        confirmTries++;
        lastConfirmAt = Date.now();
        clickNative(dlg.btn);
        if (switchTimer !== null) { clearTimeout(switchTimer); switchTimer = null; }
        awaitingSwitchUntil = Date.now() + 20000;
        log('确认框还没消失，补点第 ' + confirmTries + ' 次（不切集）');
        setStatus('确认中', '确认框未消失，正在补点');
      }
      return;
    }

    const v = findVideo();
    // 平台弹出"当前视频播放完毕！"→ 权威的播完信号，直接认。
    // 但必须加一道前提：这一集真的播过（maxSeen > 30 秒）。
    // 否则"页面一打开就残留着上集的播放完毕弹窗"时，会把没看过的一集直接跳掉。
    let st = progressState(v);
    if (dlg.strong && maxSeen > 30) st = 'ended';

    // 没播到结尾：这就是"视频开头那个「我知道了」"，只关掉，绝不切集。
    // 以前没做这个区分，一点就跳到下一集，整集白看。
    if (st !== 'ended') {
      // 例外：提示框反复冒出来很久、而且视频**确实已经到过结尾附近**，才按播完处理。
      // 以前这里只要求 maxSeen > 60（播过 1 分钟就算），于是"5 分钟弹一次"的提示框
      // 一旦连着卡住 90 秒，脚本就会在任意进度（比如 28 分钟）把整集切走。这里必须收紧。
      const stuck = dialogSince && Date.now() - dialogSince > 180000 && nearEnd(v);
      if (!stuck) {
        // 同一个框反复点不掉时逐步放慢（4s → 8s → 12s，最多 30s），别每 4 秒骚扰一次
        const cool = Math.min(4000 * Math.max(1, dismissCount), 30000);
        if (Date.now() - dismissAt < cool) return;
        dismissCount++;
        dismissAt = Date.now();
        const t = norm(dlg.btn.textContent || dlg.btn.value || '');
        const pausedSec = perf.pauseStart ? Math.round((Date.now() - perf.pauseStart) / 1000) : 0;
        clickNative(dlg.btn);
        log('关掉提示「' + t + '」：' + stateText(st, v) + '，不切集' +
            (pausedSec >= 2 ? '（视频已暂停 ' + pausedSec + ' 秒才被点掉）' : ''));
        setStatus('已关提示', stateText(st, v) + '，继续播放');
        // 弹窗期间主循环是直接 return 的，ensurePlaying 不会跑；这里补一手，
        // 免得框关掉了、视频却一直暂停着不动。
        if (maxSeen > 30 && v && v.paused) setTimeout(() => { tryPlay(findVideo()); }, 800);
        return;
      }
      log('提示框卡了 3 分钟以上，且视频已到过结尾，按已看完处理');
    }

    if (Date.now() - lastConfirmAt < 2500) return;
    lastConfirmAt = Date.now();
    confirmTries = 0;                                 // 新的一次确认，重算计次
    // 平台已经明说"播放完毕"，即便我的进度采样没跟上（播放器重建把最后几秒漏了），也放行总闸。
    if (dlg.strong && maxSeen > 30 && !nearEnd(v)) allowEarlySwitchUntil = Date.now() + 30000;
    awaitingSwitchUntil = Date.now() + 20000;        // 20 秒后仍未切走才允许重试
    const label = norm(dlg.btn.textContent || dlg.btn.value || '');
    navAtConfirm = location.href;                     // 记下点确认时的地址，用来发现"平台自己跳走了"
    log('播到底（' + (v ? fmt(v.currentTime) + '/' + fmt(v.duration) : '无视频') + '）' +
        (dlg.strong ? '，平台提示「播放完毕」' : '') + '，点「' + label + '」');
    clickNative(dlg.btn);
    markDone(currentKey());
    setStatus('本集已完成', '等待切换下一集…');
    scheduleNext();
  }

  function clickNative(el) {
    if (!el) return;
    selfClickUntil = Date.now() + 1800;      // 这一段内的暂停是"我们点出来的"，不是用户按的
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
    const opt = { bubbles: true, cancelable: true, view: window };
    try { el.dispatchEvent(new MouseEvent('mousedown', opt)); } catch (e) {}
    try { el.dispatchEvent(new MouseEvent('mouseup', opt)); } catch (e) {}
    try { el.click(); } catch (e) {}
    lastPointerAt = 0;                       // 派出去的 mousedown 会被"用户点过页面"监听记一笔，撤掉
  }

  /* ─────────────────────── 课程目录识别 ─────────────────────── */

  const TIME_RE = /\d{1,2}:\d{2}/;
  let catalogCache = null;
  let catalogAt = 0;

  const isLive = (c) => { try { return !!c && !!c.container && c.container.isConnected; } catch (e) { return false; } };

  function getCatalog(force) {
    if (!force && isLive(catalogCache) && Date.now() - catalogAt < 30000) return catalogCache;

    const cat = discoverCatalog();
    if (cat) {
      catalogCache = cat;
      catalogAt = Date.now();
      saveSnap(cat);
      return cat;
    }
    // 扫描落空时别把好结果扔掉：弹窗遮挡、局部重绘都会让某一次扫描什么都找不到。
    // 以前这里直接把缓存清成 null，于是"点完确认、却提示找不到目录、不切集"。
    if (isLive(catalogCache)) return catalogCache;

    const snap = loadSnap();
    if (snap) { log('目录暂时扫不到，改用上次记住的 ' + snap.items.length + ' 项'); return snap; }
    return null;
  }

  /* 目录快照：整页重绘把 <ul> 整个换掉时，仍能按 r_id 找到下一集的链接 */
  function saveSnap(cat) {
    try {
      store.set('rdjypx:snap', JSON.stringify({
        t: Date.now(),
        v: urlId('v_id'),
        items: cat.items.map((it) => ({ i: it.i, text: it.text, rid: it.rid, vid: it.vid, href: it.href, key: it.key })),
      }));
    } catch (e) {}
  }

  function loadSnap() {
    try {
      const s = JSON.parse(store.get('rdjypx:snap', '') || 'null');
      if (!s || !Array.isArray(s.items) || s.items.length < 1) return null;
      if (Date.now() - s.t > 6 * 3600 * 1000) return null;
      const vid = urlId('v_id');
      if (s.v && vid && s.v !== vid) return null;          // 换了门课就不能用
      const items = s.items.map((x) => ({
        i: x.i, text: x.text, raw: x.text, time: '', rid: x.rid, vid: x.vid,
        href: x.href, key: x.key, el: null, target: null, active: false, doneHint: false, red: false,
      }));
      return { container: null, items, redCount: 0, redUsable: false, fromSnap: true };
    } catch (e) { return null; }
  }

  function discoverCatalog() {
    const cands = [];
    let nodes;
    try { nodes = document.querySelectorAll('div, ul, ol, dl, table, tbody'); } catch (e) { return null; }

    for (const el of nodes) {
      const kids = el.children;
      if (kids.length < 1 || kids.length > 200) continue;
      let withTime = 0;
      for (const c of kids) {
        const t = c.textContent || '';
        if (t.length < 160 && TIME_RE.test(t)) withTime++;
      }
      // 门槛改成"按条目数缩放"：1 集的课也要能认出来（原来写死 ≥3，1~2 集的课永远找不到目录）
      const need = Math.max(1, Math.min(3, Math.ceil(kids.length * 0.5)));
      if (withTime >= need) {
        const links = el.querySelectorAll('a[href*="r_id"], a[href*="r_id="]').length;
        cands.push({ el, withTime, links });
      }
    }

    // 先挑"带播放链接"的容器，再比时长条目数——防止把无关的列表当成目录
    let cat = null;
    if (cands.length) {
      const fill = (c) => c.withTime / c.el.children.length;   // "几乎每个子项都带时长"的容器更像目录
      cands.sort((a, b) => (b.links > 0) - (a.links > 0) || fill(b) - fill(a) ||
        b.withTime - a.withTime || (b.el.contains(a.el) ? 1 : -1));
      cat = buildCatalog(cands[0].el);
    }
    if (cat && cat.items.length >= 3) return cat;

    // 通用扫描落空（或只扫出一两项，可能是认错了容器）：退一步，
    // 直接按"带 r_id 的播放链接"分组找目录。这条不依赖时长文本、也不依赖条目数量，
    // 1 集 / 2 集的课就靠它。
    const byLink = discoverByLinks();
    if (byLink && (!cat || byLink.items.length >= cat.items.length)) return byLink;
    return cat;
  }

  // 兜底识别：把页面上所有"带 r_id 的链接"按祖先容器归组，取最像目录的那个当目录。
  // 不依赖时长文本、也不依赖条目数量——1 集 / 2 集的课就靠它。
  function discoverByLinks() {
    let as;
    try { as = document.querySelectorAll('a[href*="r_id"]'); } catch (e) { return null; }
    if (!as.length) return null;

    const holders = new Set();
    for (const a of as) {
      let p = a.closest('li') || a.parentElement;
      // 往上试 3 层：目录可能是 ul>li、也可能是 div>div.row>span>a
      for (let k = 0; k < 3 && p && p.parentElement; k++) {
        holders.add(p.parentElement);
        p = p.parentElement;
      }
    }

    let best = null;
    for (const h of holders) {
      let links;
      try { links = h.querySelectorAll('a[href*="r_id"]').length; } catch (e) { continue; }
      if (!links) continue;
      // 子项数和链接数越接近，越像"一行一集"的目录；差太多说明抓到的是外层容器
      const score = links * 10 - Math.abs(h.children.length - links) * 3;
      if (!best || score > best.score) best = { h, score };
    }
    if (!best) return null;
    return buildCatalog(best.h);
  }

  function mkItem(el, raw, idx) {
    const m = raw.match(/(\d{1,2}:\d{2}(?::\d{2})?)\s*$/);
    const ids = extractIds(el);
    return {
      i: idx,
      el,
      raw,
      text: m ? raw.slice(0, m.index).trim() : raw,
      time: m ? m[1] : '',
      key: hash(raw),
      vid: ids.vid,
      rid: ids.rid,
      href: extractHref(el),
      target: pickClickable(el),
      active: isActive(el),
      red: CFG.useColor ? hasRedText(el) : false,
    };
  }

  /* 「第几课里有几个分支」：平台常把一章做成一个 <li>，里面塞好几条播放链接。
     按 container.children 拆只会得到"几章"，切集就整章整章地跳，中间那几个分支永远播不到。
     这里把含 ≥2 条播放链接的条目按链接拆成一集一条；没有嵌套的目录原样返回。 */
  function expandBranches(items) {
    const out = [];
    let groups = 0;
    for (const it of items) {
      let as = [];
      try { as = it.el.querySelectorAll('a[href*="r_id"], a[href*="v_id"]'); } catch (e) { as = []; }
      if (it.el.tagName === 'A') as = [];
      if (as.length < 2) { out.push(it); continue; }
      groups++;
      for (const a of as) {
        const row = a.closest('li') || a.parentElement || a;
        const host = row === it.el ? a : row;          // 链接直接在容器里时，用 <a> 自己当行
        const raw = norm(host.textContent) || norm(a.textContent);
        if (!raw) continue;
        out.push(mkItem(host, raw, out.length));
      }
    }
    out.forEach((it, i) => { it.i = i; });
    if (groups) log('目录里有 ' + groups + ' 个分组含多集，已按集拆开（共 ' + out.length + ' 集）');
    return out;
  }

  function buildCatalog(container) {
    const flat = [];
    Array.from(container.children).forEach((el) => {
      const raw = norm(el.textContent);
      if (!raw) return;
      flat.push(mkItem(el, raw, flat.length));
    });
    if (!flat.length) return null;

    const items = expandBranches(flat);
    if (!items.length) return null;
    // 少于 3 项时加一道验证：不能是页面上随便一个"两行文字的 div"。
    // 认得出 r_id / 播放链接 / onclick，或者容器 class 看起来就是目录/课程列表，才收。
    if (items.length < 3) {
      let cls = '';
      try { cls = container.getAttribute('class') || ''; } catch (e) {}
      const looksLikeList = /list|menu|catalog|chapter|course|lesson|section|jjfz|dir/i.test(cls);
      const hasHandle = items.some((it) => it.rid || it.href ||
        (it.el && it.el.hasAttribute && it.el.hasAttribute('onclick')) ||
        (it.target && it.target !== it.el));
      if (!hasHandle && !looksLikeList) return null;
    }

    // 红色是"已完成"的权威标记。但如果整份目录都发红，那是站点主题色，不能当完成标记用。
    const redCount = items.filter((it) => it.red).length;
    const redUsable = redCount < items.length;   // 只有"全部发红"才判定为主题色并停用；全黑时红色判断照样有效

    items.forEach((it) => {
      it.doneHint = (redUsable && it.red) || classSaysDone(it.el) || /[✓✔√]/.test(it.raw);
    });

    return { container, items, redCount, redUsable };
  }

  function extractIds(el) {
    const bag = [
      el.getAttribute('href') || '',
      el.getAttribute('onclick') || '',
      el.outerHTML.slice(0, 700),
    ].join(' ');
    const vid = (bag.match(/v_?id\s*[=:]\s*['"]?(\d+)/i) || [])[1] || '';
    const rid = (bag.match(/r_?id\s*[=:]\s*['"]?(\d+)/i) || [])[1] || '';
    return { vid, rid };
  }

  function extractHref(el) {
    let a = el.tagName === 'A' ? el : el.querySelector('a[href]');
    if (!a) return '';
    const href = a.getAttribute('href') || '';
    if (!href || href === '#' || /^javascript:/i.test(href)) return '';
    try { return new URL(href, location.href).href; } catch (e) { return ''; }
  }

  function pickClickable(el) {
    // 优先点真正能导航的 <a>（有 href）。点 <li> 本身不会触发链接跳转——这是之前的一个坑。
    if (el.tagName === 'A') return el;
    const a = el.querySelector('a[href]');
    if (a) return a;
    if (el.hasAttribute('onclick')) return el;
    const on = el.querySelector('[onclick], button');
    if (on) return on;
    return el;
  }

  function isActive(el) {
    const nodes = [el].concat(Array.from(el.querySelectorAll('*')).slice(0, 5));
    for (const n of nodes) {
      let cls = '';
      try { cls = n.getAttribute('class') || ''; } catch (e) {}
      if (/(^|[\s_-])(active|current|selected|playing|checked|cur|now)([\s_-]|$)/i.test(cls)) return true;
    }
    try { if (el.getAttribute('aria-current')) return true; } catch (e) {}
    return false;
  }

  function urlId(name) {
    const m = location.href.match(new RegExp('[?&]' + name + '=(\\d+)', 'i'));
    return m ? m[1] : '';
  }

  function locateCurrent(cat) {
    // r_id 才是单集标识；v_id 是整门课的 ID，所有集都一样，不能用来定位
    const rid = urlId('r_id');
    if (rid) {
      const i = cat.items.findIndex((it) => it.rid === rid);
      if (i >= 0) return i;
    }
    const vid = urlId('v_id');
    if (vid) {
      const hit = cat.items.filter((it) => it.vid === vid);
      if (hit.length === 1) return hit[0].i;   // 所有项 v_id 相同时不算数
    }
    const act = cat.items.filter((it) => it.active);
    if (act.length === 1) return act[0].i;

    const last = store.get(K.last, '');
    if (last) {
      const i = cat.items.findIndex((it) => it.key === last);
      if (i >= 0) return i;
    }
    if (cat.items.length === 1) return 0;      // 单集课程（目录只有一项）：只可能是它
    return -1;
  }

  function currentKey() {
    const cat = getCatalog();
    if (cat) {
      const i = locateCurrent(cat);
      if (i >= 0) return cat.items[i].key;
    }
    return 'url:' + location.href;
  }

  function getDoneSet() {
    try { return new Set(JSON.parse(store.get(K.done, '[]'))); } catch (e) { return new Set(); }
  }
  function markDone(key) {
    const s = getDoneSet();
    s.add(key);
    store.set(K.done, JSON.stringify(Array.from(s).slice(-500)));
    updateUI();
  }

  /* ───────────────────────── 切集 ───────────────────────── */

  let switchTimer = null;
  let switching = false;
  let autoStartNext = false;
  let lastSwitchAt = 0;      // 上次切集的时刻，防止 ended 与弹窗两条路径重复触发
  let endStallAt = 0;        // 视频停在结尾、又没有提示框时的计时起点
  let allowEarlySwitchUntil = 0;  // 刚确认"平台已标红"时，允许不等播完就切（30 秒窗口）
  let navAtConfirm = '';          // 点"确认完成"那一刻的地址，用来判断平台有没有自己跳走
  let stallNudgeAt = 0;           // 上次"缓冲卡顿"推播放的时刻，防止连续狂推
  let noCatAt = 0;                // 找不到课程目录的起始时刻
  let allDone = false;            // 最后一集已被平台标红：不再切集，但脚本继续活着（暂停框还要点）
  let lastEpPending = false;      // 走到最后一集、平台还没记完成：哪怕到结尾也要把它推完
  let noNextAt = 0;               // 走到最后一集却还没标红：这条提示最多每分钟说一次
  let replayAt = 0;               // 最后一集"平台没记完成"时的重播计时起点
  let replayTries = 0;            // 重播次数（硬上限 1 次，防止无限循环）
  let singleEndedAt = 0;          // ★v1.10 单视频课程（一门课=一个 v_id）播完的时刻：等平台记完再回列表

  function scheduleNext() {
    if (!CFG.enabled || !CFG.autoNext) return;
    if (switchTimer !== null || switching) return;
    if (Date.now() - lastSwitchAt < 10000) return;
    const wait = CFG.confirmWait + rand([0, 1200]);
    setStatus('本集已完成', Math.round(wait / 1000) + ' 秒后切下一集');
    switchTimer = setTimeout(() => {
      switchTimer = null;
      goNext(false);
    }, wait);
  }

  async function goNext(manual) {
    if (switching) return;
    if (!manual && Date.now() - lastSwitchAt < 10000) return;

    // 平台经常"点完确认自己就跳走了"（实测日志：点确认后 1 秒地址就变了）。
    // 这时再照原计划点一次下一集，就是连跳两集；而且新页面目录还没加载，还会报"没找到目录"。
    if (!manual && navAtConfirm && location.href !== navAtConfirm) {
      navAtConfirm = '';
      awaitingSwitchUntil = 0;
      log('平台已自行跳转，取消这次重复切集');
      return;
    }
    navAtConfirm = '';

    // ★ 总闸：自动切集一律先验"真的播完了"。前面 4 条路径（ended 事件 / 完成弹窗 / 兜底计时 /
    //   变红检测）任何一条判错，都在这里被拦下。宁可卡住让我看见，也不白砍用户 2 分钟内容。
    if (!manual && Date.now() > allowEarlySwitchUntil) {
      const v0 = findVideo();
      if (!nearEnd(v0)) {
        const d0 = v0 && isFinite(v0.duration) ? v0.duration : 0;
        const c0 = v0 && isFinite(v0.currentTime) ? v0.currentTime : 0;
        awaitingSwitchUntil = 0;
        log('拒绝切集：还没播完（' + fmt(c0) + '/' + fmt(d0) + '，距结尾还有 ' +
            fmt(Math.max(0, d0 - Math.max(c0, maxSeen))) + '），继续播放');
        setStatus('继续播放', '还没到结尾，不切集');
        return;
      }
    }

    switching = true;
    lastSwitchAt = Date.now();
    try {
      const cat = getCatalog(true);
      if (!cat) {
        awaitingSwitchUntil = 0;
        log('页面上没找到课程目录');
        setStatus('找不到目录', '请确认右侧目录已加载');
        return;
      }
      const idx = locateCurrent(cat);
      if (idx < 0) {
        awaitingSwitchUntil = 0;
        log('无法确定当前是第几集，已暂停切集');
        setStatus('未定位当前集', '请在目录里手动点一集，脚本会记住');
        return;
      }

      let target = null;
      const skipped = [];
      for (let i = idx + 1; i < cat.items.length; i++) {
        const it = cat.items[i];
        if (CFG.skipDone && it.doneHint) { skipped.push(it); continue; }
        target = it;
        break;
      }
      if (skipped.length) {
        log('跳过已完成 ' + skipped.length + ' 集：第 ' + skipped.map((s) => s.i + 1).join('、') + ' 集');
      }

      if (!target) {
        // ★ 最后一集：绝对不许因为"没有下一集"就把脚本关掉。
        //   旧版这里 CFG.enabled = false，等于在还差 16 秒的地方自杀：视频停了没人点「继续」，
        //   平台永远不记完成，这一集白看。正确做法是——判断这一集本身完成了没有，
        //   没完成就继续活着播下去；完成了也只是"不再切集"，暂停框照旧处理。
        awaitingSwitchUntil = 0;
        const cur = cat.items[idx];
        // ★/ybdy（党旗飘飘）：目录里没有"已完成"标记（红=当前播放集），播到最后一集结尾
        //   就该回「我的课程」核对——平台上这门课记没记完成，只有列表页那行字说了算。
        if (onYbdyPage()) {
          allDone = true;
          lastEpPending = false;
          log('本门课的最后一集已播完（共 ' + cat.items.length + ' 集）：回「我的课程」核对完成状态');
          setStatus('本课播完', '回课程列表核对');
          acSingleDone();
          return;
        }
        let curDone = false;
        try { curDone = !!cur.doneHint; } catch (e) {}
        if (!curDone && CFG.useColor) {
          try { curDone = hasRedText(cur.el); } catch (e) {}
        }
        if (curDone) {
          allDone = true;
          lastEpPending = false;
          log('全部走完：最后一集已标红（共 ' + cat.items.length + ' 集）');
          setStatus('全部走完', '共 ' + cat.items.length + ' 集 · 脚本继续值守');
          acLessonDone();                 // v1.9：这门课完了 → 回视频列表核对 / 进下一门
        } else {
          lastEpPending = true;
          if (!noNextAt || Date.now() - noNextAt > 60000) {
            noNextAt = Date.now();
            log('这是最后一集，平台还没记为完成：继续播，不切集（会自动点「继续」）');
            setStatus('最后一集', '等平台记完成，脚本不退出');
          }
        }
        return;
      }

      const beforeHref = location.href;
      store.set(K.last, target.key);
      log('切到第 ' + (target.i + 1) + ' 集：' + target.text + '（rid=' + (target.rid || '?') + '）');
      setStatus('切换中', target.text);

      // 首选：真实点击侧边栏里那个 <a>，让浏览器按平台自己的导航逻辑跳。
      // 以前用 location.href 硬跳，会绕过平台的点击委托/帧导航，导致"跳完还停在原集"。
      const clickable = target.target || target.el;
      try { clickable.scrollIntoView({ block: 'center' }); } catch (e) {}
      await sleep(250);
      clickNative(clickable);
      await sleep(2200);

      // 点击没触发导航时，退回硬跳兜底
      if (location.href === beforeHref && !videoChanged()) {
        if (target.href && target.href !== location.href) {
          log('点击没反应，改用链接跳转');
          try { location.href = target.href; } catch (e) {}
        } else {
          log('点击没生效，可能需要你手动点一下这一集');
        }
      }
    } catch (e) {
      log('切集出错：' + (e && e.message ? e.message : e));
    } finally {
      switching = false;
      autoStartNext = true;
    }
  }

  let lastVideoSrc = '';

  function videoChanged() {
    const v = findVideo();
    const src = v ? (v.currentSrc || v.src || '') : '';
    const prev = lastVideoSrc;
    lastVideoSrc = src;
    if (!prev) return false;          // 还没有基准，不算"变了"
    return !!src && src !== prev;
  }

  /* ═════════════ 自动刷课：课程串联层（v1.9 起，v1.10 改为"清单驱动"） ═════════════
     播放页只管"这一门课从这一集往后播完"。真正烦人的是跨课程：
     最后一集标红后脚本停下，人还得自己回课程列表点下一门、再点第一个视频。

     v1.10 的做法是"人认一次，机器跑到底"：
        ① 你打开「我的课程」页（能看到一门门课的那一页）→ 点面板「识别目录」
           脚本把这一页每门课的 名字 + 真实地址 抄进本地清单（localStorage: rdjypx:ac.manifest）
        ② 之后按清单跑：
            清单第 1 门课的地址 → 视频列表 → 播放页 一集集播完 → 整页全红 = 这门完
            → 清单里打勾 → 直接跳第 2 门课的地址 → …… 直到清单跑完
        ③ 关了浏览器重开，清单和打勾都还在，接着上次的进度走。

     为什么不让脚本自己全自动猜：平台三个页面的地址脚本是认得的，但一旦平台改路径
     或你从别的入口进来，自动猜就可能认错页、甚至误点。由人指定"哪一页是课程目录"，
     之后每一步都走这一页上抄下来的真实地址，最不容易出错。

     设计红线（沿用原脚本的原则）：
     · 只做"人本来会做的那个点击"，跳转一律走平台页面上抄下来的真实地址，不伪造学时、不调提交接口。
     · 判断"这门课完了"只用两个可见信号：① 播放页报 allDone（最后一集已标红）；
       ② 回到视频列表后所有视频链接都变红。两者同时满足才进下一门。
     · 考试页（/exam）一律不动作。走错页面宁可停下，也不乱点。                        */

  const AC = {
    on: true,
    stage: '',           // 上一段所在页面类型
    lesson: '',          // 当前课程 id
    lessonText: '',      // 当前课程名（日志用）
    done: [],            // 已刷完的课程 id
    listUrl: '',         // 课程列表页地址（回列表用）
    videoListUrl: '',    // 当前课程的视频列表页地址
    manifest: [],        // ★v1.10 手动识别出来的课程清单 [{id,text,url,done}]
    manifestAt: 0,       // 上次"识别目录"的时刻
    navAt: 0,            // 上次自动跳转时刻
    navTo: '',           // 上次自动跳转目标
    hops: [],            // 跳转历史（防死循环）
    quiet: 0,            // 日志冷却
  };
  let acAllSaid = false;      // "全部课程的刷完了"只说一次
  let acAutoLocatedAt = 0;    // 上次"自动定位集数"的时刻
  let acNeedScanSaid = 0;     // 上次提示"请点识别目录"的时刻（每分钟最多一次）
  let acElectiveSaid = false; // "选读课程还差学时"只提醒一次

  function acLoad() {
    try {
      const s = JSON.parse(store.get('rdjypx:ac', '') || '{}');
      if (s && typeof s === 'object') {
        ['stage', 'lesson', 'lessonText', 'done', 'listUrl', 'videoListUrl', 'manifest', 'manifestAt']
          .forEach((k) => {
            if (s[k] !== undefined && s[k] !== null) AC[k] = s[k];
          });
      }
    } catch (e) {}
    if (!Array.isArray(AC.done)) AC.done = [];
    if (!Array.isArray(AC.manifest)) AC.manifest = [];
    AC.manifest = AC.manifest.filter((x) => x && x.id && x.url);
    // v1.9 → v1.10 迁移：老版本存的是纯数字课程 id，统一补成 L<数字>，免得新旧混着对不上
    AC.lesson = AC.lesson ? acKey(AC.lesson) : '';
    AC.done = AC.done.map(acKey).filter(Boolean);
  }

  function acSave() {
    store.set('rdjypx:ac', JSON.stringify({
      stage: AC.stage,
      lesson: AC.lesson,
      lessonText: AC.lessonText,
      done: AC.done.slice(-300),
      listUrl: AC.listUrl,
      videoListUrl: AC.videoListUrl,
      manifest: AC.manifest.slice(0, 200),
      manifestAt: AC.manifestAt,
    }));
  }

  function acLog(msg) {
    if (Date.now() - AC.quiet < 3500) return;
    AC.quiet = Date.now();
    log('自动刷课：' + msg);
  }

  function pageKind() {
    const p = location.pathname;
    if (/\/exam/i.test(p)) return 'other';               // 考试页绝对不碰
    if (/\/ybdy\/play(\/|$)/i.test(p)) return 'play';     // 党旗飘飘播放页（有侧栏目录：/ybdy/play?v_id=&r_id=）
    if (/\/jjfz\/play(\/|$)/i.test(p)) return 'play';
    if (/^\/ybdy\/lesson/i.test(p)) return 'other';       // ★/ybdy/lesson、/ybdy/lesson/video 都是「选课」页，脚本绝不介入（有「选课」按钮）
    if (/\/jjfz\/lesson\/video(\/|$)/i.test(p)) return 'videoList';
    if (/\/jjfz\/lesson(\/)?$/i.test(p)) return 'courseList';
    if (/^\/user\/lesson(\/|$)/i.test(p)) return 'courseList';   // 党旗飘飘「我的课程」
    if (/\/jjfz(\/)?$/i.test(p)) return 'home';
    return 'other';
  }

  // 党旗飘飘（/ybdy）播放页：侧栏目录里的红字/红点 = 当前正在播放的集，不是"已完成"。
  // 2026-11-05 实测：已完成课程的播放页，它唯一的一集照样显示红色（因为它就是当前集）。
  // 所以在 /ybdy 页面上，一切"红色=完成"的判断都必须停用。
  function onYbdyPage() {
    return /^\/ybdy\//i.test(location.pathname);
  }

  // 课程 id 统一成字符串键：有 lesson_id 用 L<数字>，认不出来就用真实地址算个短哈希（H开头）
  function acKey(v) {
    const s = String(v == null ? '' : v).trim();
    if (!s) return '';
    if (/^\d+$/.test(s)) return 'L' + s;
    return s;
  }

  // 课程列表页：一门课一条。支持两种真实结构——
  //   ① 「党旗飘飘」/user/lesson 卡片：
  //        <div class="study_plan2">
  //          <a class="plan_a" href="/ybdy/play?v_id=18198&r=video&t=2">课程名</a>
  //          …<div style="color:green">已完成</div> / <div style="color:red">未完成</div>
  //        </div>
  //      一门课就是一个 v_id（点进去直接播），完成状态靠"已完成/未完成"文字。
  //   ② 老结构：<a href="...?lesson_id=N"> 一门课一条（多集课程，进去还有视频列表）
  function scanLessons() {
    const map = new Map();
    for (const d of allDocs()) {
      // ① 卡片式
      let cards = [];
      try { cards = d.querySelectorAll('.study_plan2'); } catch (e) { cards = []; }
      for (const c of cards) {
        const a = c.querySelector('a.plan_a[href]') || c.querySelector('a.study_a[href]') || c.querySelector('a[href*="v_id="]');
        if (!a) continue;
        let abs;
        try { abs = new URL(a.getAttribute('href'), location.href).href.split('#')[0]; } catch (e) { continue; }
        if (!/\/play/i.test(abs)) continue;                    // 卡片里的标题/学习按钮都指向播放页
        const vid = (abs.match(/[?&]v_id=(\d+)/i) || [])[1] || '';
        const id = vid ? ('V' + vid) : ('H' + hash(abs));
        if (map.has(id)) continue;
        const cardTxt = norm(c.textContent);
        const name = norm(a.textContent).slice(0, 60) || cardTxt.slice(0, 40);
        map.set(id, {
          id,
          num: vid,
          href: abs,
          text: name,
          done: /已完成/.test(cardTxt) && !/未完成/.test(cardTxt),
          single: true,                                        // 一门课 = 一个视频
        });
      }

      // ② 老结构（lesson_id）
      let as;
      try { as = d.querySelectorAll('a[href]'); } catch (e) { continue; }
      for (const a of as) {
        const raw = a.getAttribute('href') || '';
        if (!raw || /^javascript:/i.test(raw) || raw === '#') continue;
        if (/v_id=|r_id=|vid=/i.test(raw)) continue;            // 播放链接不算课程
        if (a.classList && (a.classList.contains('plan_a') || a.classList.contains('study_a'))) continue;
        let abs;
        try { abs = new URL(raw, location.href).href.split('#')[0]; } catch (e) { continue; }
        if (!/\/jjfz\//i.test(abs)) continue;                   // 站外链接 / 静态资源不认
        const m = raw.match(/lesson_id=(\d+)/i) || raw.match(/lesson\/video\/(\d+)/i);
        if (!m && !/\/lesson\/(video|detail|info|content)/i.test(abs)) continue;
        const id = m ? ('L' + m[1]) : ('H' + hash(abs));
        if (map.has(id)) continue;
        const row = a.closest('li') || a.parentElement || a;
        const txt = norm(row.textContent || a.textContent).slice(0, 60);
        map.set(id, {
          id,
          num: m ? m[1] : '',
          href: abs,
          text: txt,
          done: /已完成|已学完|已修完|100%/.test(txt),
        });
      }
    }
    return Array.from(map.values());
  }

  // 视频列表页：<a href="/jjfz/play?v_id=N&r_id=M&r=video&pg=1"> 一集一条
  function scanVideos() {
    const out = [];
    const seen = new Set();
    for (const d of allDocs()) {
      let as;
      try { as = d.querySelectorAll('a[href]'); } catch (e) { continue; }
      for (const a of as) {
        const href = a.getAttribute('href') || '';
        if (!/\/jjfz\/play/i.test(href)) continue;
        if (!/v_?id=\d+/i.test(href) && !/video_?id=\d+/i.test(href)) continue;
        const vid = (href.match(/v_?id=(\d+)/i) || [])[1] || '';
        const rid = (href.match(/r_?id=(\d+)/i) || [])[1] || '';
        const k = vid + '/' + rid;
        if (seen.has(k)) continue;
        seen.add(k);
        const row = a.closest('li') || a.parentElement || a;
        out.push({
          href: new URL(href, location.href).href,
          vid, rid,
          text: norm(row.textContent || a.textContent).slice(0, 50),
          red: hasRedText(row),
        });
      }
    }
    return out;
  }

  /* ── v1.10 课程清单：人点一次「识别目录」，之后就按这份清单跑 ── */

  function acIsDone(item) {
    if (!item) return false;
    return !!item.done || AC.done.indexOf(item.id) >= 0;
  }

  function acMarkDone(id) {
    const k = acKey(id);
    if (!k) return false;
    let changed = false;
    if (AC.done.indexOf(k) < 0) { AC.done.push(k); changed = true; }
    const it = AC.manifest.find((x) => x.id === k);
    if (it && !it.done) { it.done = true; changed = true; }
    if (changed) { AC.hops = []; acSave(); }   // 有进展就清空防循环计数，免得"回列表核对"被误判成死循环
    return changed;
  }

  function acProgress() {
    const n = AC.manifest.length;
    const d = AC.manifest.filter(acIsDone).length;
    return { n, d };
  }

  // 清单里"下一门要刷的课"：先往后找，找不到再从头找（跳过已完成的）
  function acNextLesson() {
    if (!AC.manifest.length) return null;
    const cur = AC.manifest.findIndex((x) => x.id === AC.lesson);
    for (let i = cur + 1; i < AC.manifest.length; i++) if (!acIsDone(AC.manifest[i])) return AC.manifest[i];
    for (let i = 0; i <= cur && i < AC.manifest.length; i++) if (!acIsDone(AC.manifest[i])) return AC.manifest[i];
    return null;
  }

  // 跳到清单里的某一门课（用识别时抄下来的真实地址，不自己拼 URL）
  function acJumpLesson(item, why) {
    if (!item || !item.url) return false;
    AC.lesson = item.id;
    AC.lessonText = item.text || '';
    AC.videoListUrl = item.url;
    acAllSaid = false;
    acSave();
    return acGo(item.url, why);
  }

  // ★「识别目录」核心：把当前页看到的课程（名字 + 真实地址）抄进本地清单
  //   返回 {kind, n}：lesson = 记下了课程清单；video = 只记下了当前这门的视频列表；none = 什么都没认出来
  function acRecognize() {
    const kind = pageKind();
    const lessons = scanLessons();
    const vids = scanVideos();

    // 情况一：这一页能列出课程（并且不是"视频列表页那种一集一条"的地方）
    if (lessons.length && !(kind === 'videoList' && vids.length > lessons.length)) {
      const old = new Map(AC.manifest.map((x) => [x.id, x]));
      AC.manifest = lessons.map((l) => {
        const p = old.get(l.id);
        return {
          id: l.id,
          text: l.text || (p && p.text) || ('第 ' + (l.num || l.id) + ' 门课'),
          url: l.href,
          done: (p && p.done) || l.done || AC.done.indexOf(l.id) >= 0,
        };
      });
      AC.listUrl = location.href.split('#')[0];
      AC.manifestAt = Date.now();
      acSave();
      const pr = acProgress();
      log('已识别目录：' + pr.n + ' 门课（其中 ' + pr.d + ' 门已完成）');
      log('目录页地址已记住：' + AC.listUrl);
      AC.manifest.slice(0, 6).forEach((x, i) => {
        log('  ' + (i + 1) + '. ' + (acIsDone(x) ? '✔ ' : '') + (x.text || x.id).slice(0, 24));
      });
      if (pr.n > 6) log('  …… 还有 ' + (pr.n - 6) + ' 门（点「看清单」看全部）');
      log('之后一门刷完会自动跳到下一门，不用管了');
      setStatus('目录已识别', pr.n + ' 门课 · 已完成 ' + pr.d + ' 门');
      updateUI();
      return { kind: 'lesson', n: pr.n };
    }

    // 播放页：这里只有"某一集"，抄下来的地址不可能是"整门课的入口"，别记进清单
    if (kind === 'play') {
      log('这是播放页，只能看单集，记不了整门课的地址清单');
      log('请到"我的课程"那一页（能看到一门门课的地方）点「识别目录」');
      log('界面提示：也可以在某一门课的视频列表页点，脚本会把那一门单独补进清单');
      setStatus('请到目录页识别', '播放页不能识别');
      updateUI();
      return { kind: 'play', n: 0 };
    }

    // 情况二：这一页是某门课的视频列表 → 记下这门课的地址，顺手补进清单
    if (vids.length) {
      const url = location.href.split('#')[0];
      const m = location.search.match(/lesson_id=(\d+)/i);
      const id = m ? acKey(m[1]) : ('H' + hash(url));   // 没有 lesson_id 就用地址算键，别借用别的课的 id
      let it = AC.manifest.find((x) => x.id === id);
      if (!it) {
        const nm = (AC.lesson === id && AC.lessonText) ? AC.lessonText : ('第 ' + (m ? m[1] : '?') + ' 门课');
        it = { id, text: nm, url, done: false };
        AC.manifest.push(it);
      } else if (!it.url) {
        it.url = url;
      }
      AC.lesson = id;
      AC.videoListUrl = url;
      AC.manifestAt = Date.now();
      acSave();
      const red = vids.filter((v) => v.red).length;
      log('已识别：这是「' + (it.text || id).slice(0, 22) + '」的视频列表，共 ' + vids.length + ' 个视频（已标红 ' + red + ' 个）');
      log('地址已记住：' + url);
      setStatus('单课已识别', vids.length + ' 个视频 · 红 ' + red);
      updateUI();
      return { kind: 'video', n: vids.length };
    }

    log('这个页面上没找到课程链接，也没找到视频链接');
    log('请到"我的课程"那一页（能看到一门门课的地方）再点「识别目录」');
    setStatus('识别失败', '请在课程列表页点');
    updateUI();
    return { kind: 'none', n: 0 };
  }

  // 唯一出口：所有自动跳转都从这里走，方便统一做延时 + 死循环保护
  function acGo(url, why) {
    if (!url) return false;
    if (Date.now() - AC.navAt < 8000) return false;
    const now = Date.now();
    AC.hops = (AC.hops || []).filter((h) => now - h.t < 300000);
    const same = AC.hops.filter((h) => h.u === url).length;
    if (same >= 2) {
      CFG.autoCourse = false;
      store.set('rdjypx:acoff', '1');
      log('自动刷课：同一地址跳了 ' + (same + 1) + ' 次仍没进展，已自动停用（防死循环）');
      setStatus('自动刷课已停', '疑似卡在同一门课，等你手动看一眼');
      updateUI();
      return false;
    }
    AC.hops.push({ u: url, t: now });
    AC.navAt = now;
    AC.navTo = url;
    acSave();
    log('自动刷课：' + why);
    setStatus('自动跳转', why);
    setTimeout(() => { try { location.href = url; } catch (e) {} }, CFG.acNavDelay || 1500);
    return true;
  }

  // 单视频课程（一门课 = 一个 v_id）播完：回课程列表核对。
  // 不在播放页这边判"完成"——列表页上「已完成/未完成」才是平台的权威结论，
  // 回去让列表自己挑下一门，平台没记完成的话还会再点回这一门（跳两次就自动停，不会死循环）。
  function acSingleDone() {
    if (!CFG.enabled || !CFG.autoCourse) return;
    if (!AC.manifest.length && !AC.listUrl) {
      log('没有课程清单，播完就不自动跳了（面板上点「识别目录」之后能一门门自动跑）');
      return;
    }
    const back = AC.listUrl || (location.origin + '/user/lesson');
    acGo(back, '这门课播完了，回课程列表核对（已完成的会自动跳过）');
  }

  // 播放页说"最后一集也红了"——先回这门课的视频列表核对，全红才算这门完（然后自动跳下一门）
  function acLessonDone() {
    if (!CFG.autoCourse || !CFG.enabled) return;
    let back = AC.videoListUrl || '';
    // 单视频课程里 videoListUrl 存的就是播放页本身，回去等于原地打转 → 改回课程列表
    if (back) {
      try { if (/\/play(\/|$)/i.test(new URL(back, location.href).pathname)) back = ''; } catch (e) {}
    }
    if (back && AC.lesson) {
      const m = back.match(/lesson_id=(\d+)/i);
      if (m && acKey(m[1]) !== AC.lesson) back = '';   // 这个地址属于别的课，不能用（否则会跳错课、错记完成）
    }
    if (!back) {
      const it = AC.manifest.find((x) => x.id === AC.lesson);
      if (it && it.url && !/\/play(\/|$)/i.test(new URL(it.url, location.href).pathname)) {
        back = it.url;                                 // 用识别时抄下来的真实地址（但不能是播放页）
      }
    }
    if (back) {
      acGo(back, '这门课最后一集已播完，回视频列表核对（还有没红的会继续播）');
      return;
    }
    // 拿不到可用的核对地址：只能信播放页的信号，记完成并直接跳清单里的下一门
    acMarkDone(AC.lesson);
    const nx = acNextLesson();
    if (nx) { acJumpLesson(nx, '换下一门课：' + (nx.text || nx.id).slice(0, 18)); return; }
    const homeList = (AC.manifest.some((x) => /^V/.test(x.id)) || onYbdyPage())
      ? (location.origin + '/user/lesson')
      : (location.origin + '/jjfz/lesson');
    acGo(AC.listUrl || homeList, '清单里没有更多课了，回目录页');
  }

  let acLastTick = 0;

  function acTick() {
    if (!CFG.enabled || !CFG.autoCourse) return;
    if (Date.now() - acLastTick < 2500) return;
    acLastTick = Date.now();

    let kind = pageKind();
    AC.stage = kind;
    if (/\/exam/i.test(location.pathname)) return;            // 考试/答题页永不介入
    if (kind === 'other' || kind === 'home') {
      // 平台万一换了课程列表的路径：只要页面上有 ≥2 条课程链接，就按课程列表处理
      // （/ybdy 的「选课」页上也有课程卡片，但绝不能当课程列表跑——那里一按就真的是选课）
      if (!onYbdyPage() && scanLessons().length >= 2) kind = 'courseList';
    }
    if (kind !== 'courseList' && kind !== 'videoList') {
      if (kind === 'play') return;   // 播放页由主循环管（点弹窗/切集/收尾），这里不吭声
      if (kind === 'home') acLog('当前在首页：点开「我的课程」后就不用管了');
      else if (AC.manifest.length) acLog('这一页脚本不认识：去「我的课程」页，或直接打开清单里某门课的地址');
      return;
    }
    if (AC.navAt && Date.now() - AC.navAt < 4500) return;        // 刚跳过来，等页面渲染完

    if (kind === 'courseList') {
      // ★v1.10：没识别过这一页就不自动跳 —— 否则你一打开目录页就被拽走，根本来不及点「识别目录」
      if (!AC.manifest.length && !CFG.acBlind) {
        if (!acNeedScanSaid || Date.now() - acNeedScanSaid > 60000) {
          acNeedScanSaid = Date.now();
          log('这一页脚本还没认过：点面板上的「识别目录」，之后一门刷完会自动跳下一门');
          log('（想让它自己猜着跑老办法：控制台 __rdjypx.acBlind(true)）');
        }
        setStatus('待识别目录', '点面板「识别目录」');
        return;
      }
      AC.listUrl = location.href.split('#')[0];
      const lessons = scanLessons();
      if (!lessons.length) { acLog('课程列表页没找到课程链接（lesson_id）'); return; }
      // v1.10：每回到目录页就把这一页的课同步进清单（保住已完成标记），之后按清单走
      const doneBefore = AC.manifest.filter(acIsDone).length;
      const old = new Map(AC.manifest.map((x) => [x.id, x]));
      AC.manifest = lessons.map((l) => {
        const p = old.get(l.id);
        return {
          id: l.id,
          text: l.text || (p && p.text) || ('第 ' + (l.num || l.id) + ' 门课'),
          url: l.href,
          done: (p && p.done) || l.done || AC.done.indexOf(l.id) >= 0,
          single: !!(l.single || (p && p.single)),
        };
      });
      if (!AC.manifestAt) AC.manifestAt = Date.now();
      // 这一页上「已完成」比上次多 → 说明上一门确实刷完了，清空防循环计数
      if (AC.manifest.filter(acIsDone).length > doneBefore) AC.hops = [];
      acSave();

      // 顺手看一眼"选读课程还差多少学时"：这是脚本不碰的地方（要你自己去选课），但必须提醒
      if (!acElectiveSaid) {
        const bodyTxt = norm(document.body ? document.body.textContent : '');
        const need = bodyTxt.match(/还需选择\s*([\d.]+)\s*个学时/);
        if (need && parseFloat(need[1]) > 0) {
          acElectiveSaid = true;
          log('注意：选读课程还要选 ' + need[1] + ' 个学时（点页面上的「去选课」自己选，脚本不替你选课）');
          log('选完后回到这一页再点一次「识别目录」，新选的课就会进清单');
        }
      }
      const next = AC.manifest.find((x) => !acIsDone(x));
      if (!next) {
        if (!acAllSaid) {
          acAllSaid = true;
          log('自动刷课：课程列表里已经没有未完成的课了（共 ' + lessons.length + ' 门）');
          setStatus('全部刷完', '共 ' + lessons.length + ' 门课 · 脚本继续值守');
        }
        return;
      }
      acAllSaid = false;
      if (AC.lesson !== next.id) {
        AC.lesson = next.id;
        AC.lessonText = next.text;
        AC.videoListUrl = '';
        acSave();
      }
      const no = AC.manifest.indexOf(next) + 1;
      acGo(next.url, '进入第 ' + no + '/' + AC.manifest.length + ' 门课：' + (next.text || next.id).slice(0, 18));
      return;
    }

    // videoList
    AC.videoListUrl = location.href.split('#')[0];
    const m = location.search.match(/lesson_id=(\d+)/i);
    const curKey = m ? acKey(m[1]) : AC.lesson;
    if (curKey && curKey !== AC.lesson) {
      AC.lesson = curKey;
      AC.lessonText = AC.lessonText || ('第 ' + m[1] + ' 门课');
      acSave();
    }
    const vids = scanVideos();
    if (!vids.length) {
      acLog('视频列表页没找到视频链接（v_id），可能还在加载');
      return;
    }
    const undone = vids.filter((v) => !v.red);
    if (!undone.length) {
      // 整页视频都标红了 —— 这门课就是刷完了
      const changed = acMarkDone(AC.lesson);
      const pr = acProgress();
      if (changed) {
        log('自动刷课：本门 ' + vids.length + ' 个视频已全部标红 → 这门刷完' +
          (pr.n ? '（清单进度 ' + pr.d + '/' + pr.n + '）' : ''));
      }
      // ★v1.10：直接用清单里抄下来的地址跳到下一门，不用先回目录页
      const nx = acNextLesson();
      if (nx) {
        acJumpLesson(nx, '换下一门课：' + (nx.text || nx.id).slice(0, 18));
        return;
      }
      if (pr.n) {
        const curInList = AC.manifest.some((x) => x.id === AC.lesson);
        if (!acAllSaid) {
          acAllSaid = true;
          log(curInList
            ? '自动刷课：清单里 ' + pr.n + ' 门课全部刷完了 🎉'
            : '自动刷课：这门不在清单里（已刷完）；清单里 ' + pr.n + ' 门也都没有未完成的了');
          setStatus('全部刷完', '清单 ' + pr.n + ' 门 · 全部已完成');
        }
        return;
      }
      acGo(AC.listUrl || (location.origin + '/jjfz/lesson'), '本门课刷完，回课程列表选下一门');
      return;
    }
    const t = undone[0];
    acGo(t.href, '播放第 ' + (vids.indexOf(t) + 1) + '/' + vids.length + ' 个：' + (t.text || ('v_id=' + t.vid)).slice(0, 20));
  }

  // 播放页：URL 里没写 r_id、又定位不到当前集时，自动从第一集未完成的开始
  function autoLocateIfNeeded(cat) {
    if (!CFG.autoLocate || !CFG.enabled || switching) return;
    if (locateCurrent(cat) >= 0) return;
    if (urlId('r_id')) return;                       // URL 已经指明是哪一集，不用猜
    if (cat.items.length < 2) return;
    if (Date.now() - acAutoLocatedAt < 60000) return;
    const t = cat.items.filter((it) => !it.doneHint)[0];
    if (!t) return;
    acAutoLocatedAt = Date.now();
    log('定位不到当前集，自动从第 ' + (t.i + 1) + ' 集开始：' + t.text.slice(0, 20));
    clickNative(t.target || t.el);
  }

  function acStatusText() {
    if (!CFG.autoCourse) return '自动刷课：关';
    const pr = acProgress();
    const tail = pr.n ? ' · 清单 ' + pr.d + '/' + pr.n : '';
    if (AC.lesson) return '自动刷课：第 ' + AC.lesson + ' 门' + (AC.done.indexOf(AC.lesson) >= 0 ? '（已完成）' : '') + tail;
    return '自动刷课：' + (pr.n ? '清单已就绪' : '待识别目录') + tail;
  }

  function acReset() {
    AC.done = [];
    AC.manifest.forEach((x) => { x.done = false; });
    AC.lesson = '';
    AC.lessonText = '';
    AC.videoListUrl = '';
    AC.hops = [];
    acAllSaid = false;
    acSave();
    log('自动刷课：已完成记录已清空' +
      (AC.manifest.length ? '（清单里 ' + AC.manifest.length + ' 门课全部重置为未完成，清单和地址都还在）' : ''));
    updateUI();
  }

  /* ───────────────────────── 主循环 ───────────────────────── */

  let timer = null;
  let statusMain = '待命';
  let statusSub = '';

  let lastTickAt = 0;

  function tick() {
    if (!CFG.enabled) return;
    if (Date.now() - lastTickAt < 300) return;   // 防抖：定时器与 timeupdate 可能同时触发
    lastTickAt = Date.now();

    const v = findVideo();
    // v1.9：不是在播放页、又没视频 → 立即退出。否则课程列表页上任何「确定/完成」按钮
    // 都可能被 findFinishDialog 认成"播完确认"给点掉，这是绝不能发生的误操作。
    if (!v && pageKind() !== 'play') return;
    if (v) {
      bindVideo(v);
      if (v.currentSrc && !lastVideoSrc) lastVideoSrc = v.currentSrc;
      // v1.9：定位不到当前集时自动挑一集（只在不带 r_id 的链接上做，且有 1 分钟冷却）
      if (!switching) {
        const c0 = getCatalog();
        if (c0) autoLocateIfNeeded(c0);
      }
    }

    // 先处理"视频已暂停"的中断框：它一挂着，视频就是停的，其他判断都没意义。
    // 这类框只点「继续」，绝不切集。
    const pauseDlg = findPauseDialog();
    if (pauseDlg && handlePause(pauseDlg)) return;

    const dlg = findFinishDialog();
    if (dlg) {
      if (!dialogSince) dialogSince = Date.now();
      handleFinish(dlg);
      return;
    }
    dialogSince = 0;                      // 弹窗消失了，下一轮重新计时
    dismissCount = 0;
    confirmTries = 0;

    if (v) {
      // 卡顿自愈：最小化时浏览器压低分片请求优先级，hls 常常拉不动，视频就"缓冲中"停着。
      // 分三档：轻推 play（没用）→ 轻微 seek 逼它重拉当前分片（通常有效）→ 再退一点重拉。
      // 单纯 play() 治不了"没数据"，只有改变播放位置才会让播放器重新请求分片。
      if (perf.stallStart && !v.paused) {
        const waited = Date.now() - perf.stallStart;
        if (waited > 8000 && (!stallNudgeAt || Date.now() - stallNudgeAt > 20000)) {
          stallNudgeAt = Date.now();
          const secs = Math.round(waited / 1000);
          const rs = v.readyState;
          if (waited > 45000) {
            const t = isFinite(v.currentTime) ? v.currentTime : 0;
            log('缓冲卡了 ' + secs + ' 秒（readyState=' + rs + '），往回退 1 秒逼它重拉流');
            try { v.currentTime = Math.max(0, t - 1); } catch (e) {}
            tryPlay(v);
          } else if (waited > 18000) {
            const t = isFinite(v.currentTime) ? v.currentTime : 0;
            log('缓冲卡了 ' + secs + ' 秒（readyState=' + rs + '），轻跳一下让它重拉');
            try { v.currentTime = t + 0.08; } catch (e) {}
          } else {
            log('缓冲卡了 ' + secs + ' 秒，先推一下播放');
            tryPlay(v);
          }
        }
      }

      // 兜底：这一集确实播到过结尾附近，却没走到"点确认→切集"（ended 被 loop 吞掉、或提示框没弹）。
      // loop 重播时进度采样会漏掉精确结尾，所以阈值放宽到 96%，且用 maxSeen 判断（不要求暂停）。
      // 已经"整遍重播"过（loopCount>=1）就说明这集确实播完过，等 3 秒即切；否则多给平台几秒记学时。
      if (!switching && !switchTimer && !allDone && progressState(v) === 'ended') {
        // ★v1.10 单视频课程（党旗飘飘 /ybdy/play：一门课就是一个 v_id，页面上没有侧栏目录）：
        //   没有"下一集"可切，播完就等平台记完成，然后回课程列表核对（列表上有「已完成/未完成」）。
        if (!getCatalog()) {
          if (!singleEndedAt) {
            singleEndedAt = Date.now();
            log('这门课只有一个视频，已播完：等平台记完成，' +
              Math.round((CFG.singleWait || 12000) / 1000) + ' 秒后回课程列表核对');
            setStatus('单集播完', '等平台记完成');
          } else if (Date.now() - singleEndedAt > (CFG.singleWait || 12000)) {
            singleEndedAt = 0;
            acSingleDone();
          }
          return;                       // 单视频页面没有"切下一集"这回事
        }
        const grace = loopCount >= 1 ? 3000 : 8000;
        if (!endStallAt) endStallAt = Date.now();
        else if (Date.now() - endStallAt > grace && Date.now() - lastSwitchAt > 10000) {
          endStallAt = 0;
          const dd = isFinite(v.duration) ? v.duration : 0;
          const tag = fmt(Math.max(v.currentTime, maxSeen)) + '/' + fmt(dd);
          log(loopCount >= 1
            ? '已整遍重播过（' + loopCount + ' 遍，' + tag + '），切下一集'
            : (v.paused ? '停在结尾（' + tag + '）、没有提示框，切下一集' : '已播完（' + tag + '，正在重播），切下一集'));
          markDone(currentKey());
          scheduleNext();
        }
      } else {
        endStallAt = 0;
      }

      // 最后一集的最后一道保险：视频已经到结尾停住、平台却一直没标红（完成标记通常要
      // "整遍播完"才落库，停在结尾不算），就从头再播一遍，最多 1 次。
      // 只在这一集确实还没完成时才做，避免平台早已记完成、只是颜色没刷出来时白播一轮。
      if (lastEpPending && !allDone && replayTries < 1 && v.paused && nearEnd(v)) {
        if (!replayAt) replayAt = Date.now();
        else if (Date.now() - replayAt > 20000) {
          replayAt = 0; replayTries++;
          log('最后一集平台还没记为完成，从头再播一遍（仅此 1 次）');
          try { v.currentTime = 0; } catch (e) {}
          maxSeen = 0; loopCount = 0; endStallAt = 0;
          tryPlay(v);
        }
      } else if (!lastEpPending) {
        replayAt = 0;
      }

      if (autoStartNext && !v.paused) autoStartNext = false;
      if (!switching) ensurePlaying(v);
      // 进页面 6 秒仍停在 0 秒：推一把播放器自己的大播放按钮（v1.9）
      if (!switching) {
        if (v.paused && (v.currentTime || 0) < 0.5) {
          if (!coldStartAt) coldStartAt = Date.now();
          else if (Date.now() - coldStartAt > 6000) { coldStartAt = 0; nudgeBigPlay(); }
        } else coldStartAt = 0;
      }
      updatePlayerStatus(v);
    }
  }

  function updatePlayerStatus(v) {
    const cat = getCatalog();
    let pos = '';
    if (cat) {
      const i = locateCurrent(cat);
      if (i >= 0) pos = '第 ' + (i + 1) + '/' + cat.items.length + ' 集';
      const cnt = root && root.getElementById('cnt');
      if (cnt) cnt.textContent = '红(已完成) ' + cat.redCount + '/' + cat.items.length;
    }
    if (!pos) pos = '未定位集数';
    if (!cat) {
      if (!noCatAt) noCatAt = Date.now();
      else if (Date.now() - noCatAt > 30000) {
        noCatAt = 0;
        log('仍未识别到课程目录：视频能播，但没法自动切集（可点「重扫目录」；仍不行请在控制台跑 __rdjypx.dom() 发我）');
      }
    } else noCatAt = 0;
    const t = isFinite(v.duration) && v.duration > 0
      ? fmt(v.currentTime) + ' / ' + fmt(v.duration)
      : fmt(v.currentTime);
    if (elEff) {
      const p = perfStat();
      const k = keepStat();
      elEff.textContent = p.text + (k.pip ? ' · 画中画' : (realHidden ? ' · 后台值守' + (k.worker ? '✓' : '') : ''));
      elEff.title = '效率 = 视频真实推进秒数 ÷ 现实时间（低于 100% 说明有暂停/卡顿）\n保活：' + k.text;
      elEff.style.color = p.eff < 90 ? '#c0873f' : '#7d8894';
    }
    // 全部走完时就别再被"播放中"覆盖掉了（脚本还活着，只是不再切集）
    if (allDone) { setStatus('全部走完', '共 ' + (cat ? cat.items.length : 1) + ' 集 · 脚本继续值守'); return; }
    setStatus('播放中', pos + ' · ' + t);
  }

  /* ───────────────────────── 面板 ───────────────────────── */

  let host = null, root = null, elMain = null, elSub = null, elDot = null, elLog = null, elBtnOn = null, elEff = null;

  const CSS = `
  .panel { width: 238px; background: #161a1f; border: 1px solid #2a323b; border-radius: 5px;
    font: 12px/1.6 -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif; color: #dbe3ea;
    box-shadow: 0 6px 24px rgba(0,0,0,.35); overflow: hidden; }
  .hd { display: flex; align-items: center; gap: 6px; padding: 7px 9px; background: #1d232a;
    border-bottom: 1px solid #2a323b; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: #4b9e7f; }
  .dot.off { background: #6d7681; }
  .dot.warn { background: #c0873f; }
  .tt { flex: 1; font-size: 12px; color: #eef3f7; letter-spacing: .3px; }
  .mini { background: none; border: 0; color: #8d99a6; font-size: 13px; line-height: 1;
    cursor: pointer; padding: 0 2px; font-family: inherit; }
  .mini:hover { color: #fff; }
  .bd { padding: 9px; }
  .st { font-size: 12px; color: #eef3f7; }
  .sb { font-size: 11px; color: #8d99a6; margin-bottom: 8px; min-height: 15px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row { display: flex; gap: 6px; margin-bottom: 8px; }
  .b { flex: 1; padding: 5px 0; background: #232a32; color: #c9d4de; border: 1px solid #333c46;
    border-radius: 3px; font-size: 11px; cursor: pointer; font-family: inherit; }
  .b:hover { background: #2b333c; color: #fff; }
  .b.on { background: #1f4536; border-color: #2f6b53; color: #cfe8dd; }
  .log { font-size: 10.5px; color: #7d8894; line-height: 1.55; max-height: 68px;
    overflow: auto; font-family: Consolas, Menlo, monospace; }
  .log div { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ft { font-size: 10px; color: #5f6b77; margin-top: 6px; border-top: 1px solid #232a32;
    padding-top: 5px; display: flex; justify-content: space-between; }
  .collapsed .bd { display: none; }
  `;

  function buildUI() {
    if (host) return;
    host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:12px;top:72px;z-index:2147483000;';
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<style>' + CSS + '</style>' +
      '<div class="panel" id="panel">' +
      '  <div class="hd"><span class="dot" id="dot"></span><span class="tt">自动连播</span>' +
      '    <button class="mini" id="fold" title="收起">—</button></div>' +
      '  <div class="bd">' +
      '    <div class="st" id="main">待命</div>' +
      '    <div class="sb" id="sub"></div>' +
      '    <div class="row">' +
      '      <button class="b on" id="btnOn">暂停</button>' +
      '      <button class="b" id="btnNext">下一集</button>' +
      '    </div>' +
      '    <div class="row">' +
      '      <button class="b on" id="btnSkip" title="目录里标红的集视为已完成，自动跳过">跳过红项</button>' +
      '      <button class="b" id="btnScan">重扫目录</button>' +
      '    </div>' +
      '    <div class="row">' +
      '      <button class="b on" id="btnAc" title="课程列表 → 视频列表 → 播放页 全自动串完整轮；考试页不碰">自动刷课</button>' +
      '      <button class="b" id="btnAcReset" title="只清「哪门已刷完」的打勾，识别出来的课程清单和地址都保留">清空记录</button>' +
      '    </div>' +
      '    <div class="row">' +
      '      <button class="b" id="btnAcScan" title="在你打开的那一页（能看到一门门课的地方）点这个：脚本把每门课的名字和真实地址抄进本地清单，之后一门刷完自动跳下一门">识别目录</button>' +
      '      <button class="b" id="btnAcList" title="在日志里列出已识别的课程清单（✔ 已完成）">看清单</button>' +
      '    </div>' +
      '    <div class="row">' +
      '      <button class="b" id="btnSpeed" title="倍速循环 1.0→1.25→1.5→1.75→2.0，选择存在本地。⚠️ 平台若按真实时长记学时，倍速可能少记学时——开完看面板效率和学时涨幅，不对就调回 1.0">1.0x</button>' +
      '      <button class="b" id="btnPip" title="把视频放进画中画小窗：浏览器不会再把这个标签页降级，最小化也不卡">画中画保活</button>' +
      '    </div>' +
      '    <div id="eff" title="效率 = 视频真实推进的秒数 ÷ 现实时间。低于 100% 说明有暂停/卡顿" ' +
      '      style="font-size:10.5px;color:#7d8894;margin:0 0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">效率 —</div>' +
      '    <div class="log" id="log"></div>' +
      '    <div class="ft"><span id="spd">' + CFG.speed.toFixed(2) + 'x</span><span id="cnt">已连播 0 集</span></div>' +
      '  </div>' +
      '</div>';

    document.documentElement.appendChild(host);

    elMain = root.getElementById('main');
    elSub = root.getElementById('sub');
    elDot = root.getElementById('dot');
    elLog = root.getElementById('log');
    elBtnOn = root.getElementById('btnOn');
    elEff = root.getElementById('eff');

    const panel = root.getElementById('panel');
    if (store.get(K.fold, '0') === '1') panel.classList.add('collapsed');
    root.getElementById('fold').addEventListener('click', () => {
      const c = panel.classList.toggle('collapsed');
      store.set(K.fold, c ? '1' : '0');
    });

    elBtnOn.addEventListener('click', () => {
      CFG.enabled = !CFG.enabled;
      store.set(K.on, CFG.enabled ? '1' : '0');
      log(CFG.enabled ? '已开启' : '已暂停');
      if (CFG.enabled) autoStartNext = true;
      updateUI();
    });

    root.getElementById('btnNext').addEventListener('click', () => {
      if (switchTimer) { clearTimeout(switchTimer); switchTimer = null; }
      goNext(true);
    });

    root.getElementById('btnSkip').addEventListener('click', () => {
      CFG.skipDone = !CFG.skipDone;
      store.set('rdjypx:skip', CFG.skipDone ? '1' : '0');
      log(CFG.skipDone ? '跳过红项：开' : '跳过红项：关（按顺序播）');
      updateUI();
    });

    root.getElementById('btnPip').addEventListener('click', () => {
      keepAwake();                 // 顺手把 Worker + 静音音频也拉起来
      resumeAudio();
      enterPip(false);
    });

    root.getElementById('btnScan').addEventListener('click', () => {
      catalogCache = null;
      const cat = getCatalog(true);
      if (!cat) { log('没识别到课程目录'); return; }
      const i = locateCurrent(cat);
      log('目录 ' + cat.items.length + ' 项，当前第 ' + (i >= 0 ? i + 1 : '?') + ' 项');
      log('红色(已完成) ' + cat.redCount + ' 项' + (cat.redUsable ? '' : '，但整份目录都发红，已停用红色判断'));
      log('下一项：' + (i + 1 < cat.items.length ? cat.items[i + 1].text : '已到末尾'));
      updateUI();
    });

    root.getElementById('btnAc').addEventListener('click', () => {
      CFG.autoCourse = !CFG.autoCourse;
      store.set('rdjypx:acoff', CFG.autoCourse ? '0' : '1');
      if (CFG.autoCourse) acAllSaid = false;
      log(CFG.autoCourse ? '自动刷课：开（课程列表→视频列表→播放页 整轮串联）' : '自动刷课：关（只处理当前播放页）');
      updateUI();
    });

    root.getElementById('btnAcReset').addEventListener('click', acReset);

    root.getElementById('btnSpeed').addEventListener('click', () => {
      const steps = [1, 1.25, 1.5, 1.75, 2];
      const i = steps.findIndex((s) => Math.abs(s - (CFG.speed || 1)) < 0.01);
      CFG.speed = steps[(i + 1) % steps.length];
      store.set('rdjypx:speed', String(CFG.speed));
      if (boundVideo) enforceSpeed(boundVideo);
      log('倍速：' + CFG.speed.toFixed(2) + 'x' + (CFG.speed === 1 ? '（原速）' : '（平台改回 1 会立刻掰回来）'));
      updateUI();
    });

    root.getElementById('btnAcScan').addEventListener('click', () => {
      acRecognize();
    });

    root.getElementById('btnAcList').addEventListener('click', () => {
      const pr = acProgress();
      if (!pr.n) {
        log('还没有识别过目录：去「我的课程」那一页（能看到一门门课的地方），点「识别目录」');
        return;
      }
      log('清单 ' + pr.n + ' 门 · 已完成 ' + pr.d + ' 门' + (AC.listUrl ? ' · 目录页：' + AC.listUrl : ''));
      AC.manifest.forEach((x, i) => {
        log((i + 1) + '. ' + (acIsDone(x) ? '✔ ' : '○ ') + (x.text || x.id).slice(0, 24) + ' → ' + x.url);
      });
      const nx = acNextLesson();
      if (nx) log('下一门：' + (nx.text || nx.id).slice(0, 24));
    });

    updateUI();
  }

  function log(msg) {
    if (!elLog) return;
    const d = document.createElement('div');
    const t = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    d.textContent = t + '  ' + msg;
    elLog.insertBefore(d, elLog.firstChild);
    while (elLog.children.length > 30) elLog.removeChild(elLog.lastChild);
  }

  function setStatus(main, sub) {
    statusMain = main;
    statusSub = sub != null ? sub : statusSub;
    if (elMain) elMain.textContent = statusMain;
    if (elSub) elSub.textContent = statusSub;
  }

  function updateUI() {
    if (!elDot) return;
    elDot.className = 'dot' + (!CFG.enabled ? ' off' : (statusMain === '未定位当前集' || statusMain === '找不到目录' ? ' warn' : ''));
    if (elBtnOn) {
      elBtnOn.textContent = CFG.enabled ? '暂停' : '继续';
      elBtnOn.className = 'b' + (CFG.enabled ? ' on' : '');
    }
    const bs = root.getElementById('btnSkip');
    if (bs) bs.className = 'b' + (CFG.skipDone ? ' on' : '');
    const ba = root.getElementById('btnAc');
    if (ba) {
      ba.className = 'b' + (CFG.autoCourse ? ' on' : '');
      ba.textContent = CFG.autoCourse ? '自动刷课' : '刷课已关';
    }
    const bscan = root.getElementById('btnAcScan');
    if (bscan) {
      const pr = acProgress();
      bscan.className = 'b' + (pr.n ? ' on' : '');
      bscan.textContent = pr.n ? ('识别目录 ' + pr.d + '/' + pr.n) : '识别目录';
    }
    const bspd = root.getElementById('btnSpeed');
    if (bspd) {
      bspd.className = 'b' + (CFG.speed && CFG.speed !== 1 ? ' on' : '');
      bspd.textContent = (CFG.speed || 1).toFixed(2) + 'x';
    }
    const spd = root.getElementById('spd');
    if (spd) spd.textContent = (CFG.speed || 1).toFixed(2) + 'x' + (CFG.speed === 1 ? ' 原速' : '');
    const cnt = root.getElementById('cnt');
    if (cnt) {
      const pr = acProgress();
      const cat = getCatalog();
      if (cat) cnt.textContent = '红(已完成) ' + cat.redCount + '/' + cat.items.length + (pr.n ? ' · 课 ' + pr.d + '/' + pr.n : '');
      else if (pr.n) cnt.textContent = '课程 ' + pr.d + '/' + pr.n + ' 门';
      else cnt.textContent = '已连播 ' + getDoneSet().size + ' 集';
    }
  }

  /* ───────────────────────── 启动 ───────────────────────── */

  CFG.enabled = store.get(K.on, '1') !== '0';
  if (store.get('rdjypx:skip', '1') === '0') CFG.skipDone = false;
  // 倍速（1.0~2.0，超出范围一律拉回，防止 localStorage 被手改成离谱值）
  {
    const sp = parseFloat(store.get('rdjypx:speed', '1'));
    CFG.speed = (sp >= 1 && sp <= 2) ? sp : 1;
  }

  // 用户手动点目录时记住他的选择，用于"教"脚本当前位置
  document.addEventListener('mousedown', () => { lastPointerAt = Date.now(); }, true);
  // 空格键也能暂停，键盘操作同样算"用户在场"，别把它当成平台暂停给拉回来
  document.addEventListener('keydown', () => { lastPointerAt = Date.now(); }, true);
  document.addEventListener('click', (e) => {
    const cat = catalogCache;
    if (!cat) return;
    let n = e.target;
    while (n && n !== document.body) {
      if (n.parentElement === cat.container) {
        const item = cat.items.find((it) => it.el === n);
        if (item) {
          store.set(K.last, item.key);
          log('已记住当前集：' + item.text);
          catalogAt = 0;
        }
        break;
      }
      n = n.parentElement;
    }
  }, true);

  // 页面标题变化时清缓存（SPA 换集）
  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      catalogAt = 0;
      log('页面已切换');
    }
  }, 1000);

  /* ─────────────── 伪装"页面始终可见" ─────────────── */

  let realHidden = false;
  let origHiddenGet = null;

  function readRealHidden() {
    try { return origHiddenGet ? !!origHiddenGet.call(document) : false; } catch (e) { return realHidden; }
  }

  // 平台一旦发现你切后台/最小化，就 player.pause() 并弹「视频已暂停，点击按钮后继续学习！」。
  // 浏览器本身是允许后台播视频的，所以这里让它永远读到 visible：属性层面改掉，事件层面拦掉。
  function spoofVisibility() {
    try { origHiddenGet = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden').get; } catch (e) { origHiddenGet = null; }
    realHidden = readRealHidden();

    // ① 自己的记账监听先装在 window 上（必须早于下面的拦截器，否则连自己都收不到事件）
    const onVis = () => {
      realHidden = readRealHidden();
      if (realHidden) {
        if (!perf.hiddenAt) perf.hiddenAt = Date.now();
        log('页面切到后台：已伪装成"可见"，平台不会因此暂停');
      } else if (perf.hiddenAt) {
        perf.hiddenMs += Date.now() - perf.hiddenAt;
        perf.hiddenAt = 0;
        log('页面回到前台（本次后台 ' + fmt(perf.hiddenMs / 1000) + '）');
      }
    };
    window.addEventListener('visibilitychange', onVis, true);

    // ② 骗属性：document.hidden / visibilityState / hasFocus 全都说"我在前台"
    const fake = (obj, key, val) => {
      try { Object.defineProperty(obj, key, { get: () => val, configurable: true }); } catch (e) {}
    };
    fake(document, 'hidden', false);
    fake(document, 'visibilityState', 'visible');
    try { fake(Document.prototype, 'hidden', false); } catch (e) {}
    try { fake(Document.prototype, 'visibilityState', 'visible'); } catch (e) {}
    try { document.hasFocus = () => true; } catch (e) {}
    try { window.onblur = null; } catch (e) {}
    try { document.onvisibilitychange = null; } catch (e) {}

    // ③ 拦事件：window 捕获阶段就掐掉，平台挂在 document/body 上的监听一律收不到
    ['visibilitychange', 'webkitvisibilitychange', 'blur'].forEach((t) => {
      window.addEventListener(t, (e) => {
        try { e.stopImmediatePropagation(); e.stopPropagation(); } catch (err) {}
      }, true);
    });
  }

  /* ─────────── 后台保活：Chrome 一最小化就把标签页"降级"，这才是卡的真凶 ───────────
     三个互相独立的机制，一起上：
       ① Worker 心跳  —— Worker 里的定时器不受"后台标签页节流"（主线程会被压到 1 分钟一次）
       ② 静音音频    —— 有音频输出的标签页，Chrome 不施加 intensive throttling、也不被内存节省丢弃
       ③ 画中画      —— 视频有独立可见窗口，浏览器完全按"正在播放"对待，最彻底
     前两个自动开，画中画要用户点一下（浏览器要求手势）。                              */

  let keepWorker = null;
  let keepCtx = null;
  let keepOsc = null;         // 必须留引用，否则会被 GC 回收，静音链就断了
  let keepGain = null;
  let keepBeats = 0;          // Worker 心跳次数（诊断用）
  let keepBeatAt = 0;         // 上一次心跳时刻
  let keepOn = false;

  function startWorkerBeat() {
    if (keepWorker) return true;
    try {
      const src = 'var n=0;setInterval(function(){n++;postMessage(n);},400);';
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      keepWorker = new Worker(url);
      keepWorker.onmessage = () => {
        keepBeats++;
        keepBeatAt = Date.now();
        if (!CFG.enabled || switching) return;
        tick();                       // 后台也能维持 400ms 一次的响应
      };
      keepWorker.onerror = () => {
        log('后台心跳被页面限制，退回视频事件值守（仍能用，反应慢一点）');
        try { keepWorker.terminate(); } catch (e) {}
        keepWorker = null;
      };
      return true;
    } catch (e) {
      keepWorker = null;
      return false;
    }
  }

  function startSilentAudio() {
    if (keepCtx) { resumeAudio(); return true; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      keepCtx = new AC();
      const osc = keepCtx.createOscillator();
      const gain = keepCtx.createGain();
      gain.gain.value = 0;            // 完全静音，人耳听不到
      osc.frequency.value = 60;
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(keepCtx.destination);
      osc.start();
      keepOsc = osc; keepGain = gain;  // 留引用防 GC
      resumeAudio();
      return true;
    } catch (e) {
      keepCtx = null;
      return false;
    }
  }

  function resumeAudio() {
    try { if (keepCtx && keepCtx.state === 'suspended') keepCtx.resume().catch(() => {}); } catch (e) {}
  }

  function keepAwake() {
    if (keepOn) { resumeAudio(); return; }
    keepOn = true;
    const w = startWorkerBeat();
    const a = startSilentAudio();
    log('后台保活已开：' + (w ? 'Worker 心跳' : '无 Worker') + ' + ' + (a ? '静音音频' : '无音频') +
        '（想更稳就点「画中画」）');
    // AudioContext 一般要用户碰过页面才肯运行，补几次
    const wake = () => { resumeAudio(); };
    window.addEventListener('pointerdown', wake, true);
    window.addEventListener('keydown', wake, true);
    // 每次回到后台再试一次（有的浏览器切后台会 suspend 音频）
    window.addEventListener('visibilitychange', () => { if (readRealHidden()) resumeAudio(); }, true);
  }

  async function enterPip(silent) {
    const v = findVideo();
    if (!v) { if (!silent) log('没找到视频，稍后再点'); return false; }
    if (document.pictureInPictureElement === v) return true;
    if (!document.pictureInPictureEnabled || typeof v.requestPictureInPicture !== 'function') {
      if (!silent) log('这个浏览器不支持画中画');
      return false;
    }
    try {
      await v.requestPictureInPicture();
      log('已进入画中画：标签页不会再被降级，最小化也不卡了');
      return true;
    } catch (e) {
      if (!silent) log('画中画启动失败（先点一下视频画面再点按钮）：' + ((e && e.message) || e));
      return false;
    }
  }

  function keepStat() {
    return {
      worker: !!keepWorker,
      beats: keepBeats,
      beatAgo: keepBeatAt ? Math.round((Date.now() - keepBeatAt) / 1000) : -1,
      audio: keepCtx ? keepCtx.state : '未创建',
      pip: !!document.pictureInPictureElement,
      hidden: readRealHidden(),
      text: (keepWorker ? 'Worker✓(' + keepBeats + ')' : 'Worker✗') +
            ' · 音频' + (keepCtx ? keepCtx.state : '✗') +
            ' · ' + (document.pictureInPictureElement ? '画中画✓' : '画中画✗'),
    };
  }

  function boot() {
    buildUI();
    acLoad();
    CFG.autoCourse = store.get('rdjypx:acoff', '0') !== '1';
    CFG.acBlind = store.get('rdjypx:acblind', '0') === '1';
    log('脚本已加载 v1.12.0 【识别目录 → 逐门刷课 · 后台保活】');
    log('开关：' + (CFG.enabled ? '开' : '关') + ' · 跳过红项：' + (CFG.skipDone ? '开' : '关') + ' · 开头提示只关不切：是');
    log(acStatusText() + (CFG.autoCourse ? '（课程列表→视频列表→播放页 整轮串联，考试页不碰）' : ''));
    const pr0 = acProgress();
    if (pr0.n) {
      log('已记着 ' + pr0.n + ' 门课的清单（完成 ' + pr0.d + ' 门）：一门刷完自动跳下一门');
    } else {
      log('第一次用：到「我的课程」那一页点面板上的「识别目录」');
    }
    spoofVisibility();
    log('已伪装"页面始终可见"：切后台/最小化不会再被平台暂停');
    keepAwake();
    timer = setInterval(tick, CFG.tickMs);
    // 独立高频采样：主 tick 900ms 可能漏掉"视频播到结尾又被 loop 秒回 0"的那一瞬，
    // 这里每 250ms 采一次 currentTime，更准地记录 maxSeen 和"整遍重播"，同时统计播放效率。
    setInterval(() => {
      if (!CFG.enabled) return;
      const v = findVideo();
      trackProgress(v);
      perfSample(v);
    }, 250);

    // 切后台/回前台的记账已经挪到 spoofVisibility() 里（那边能拿到真实的 hidden 值）
    // 独立变红检测：每次强制重扫目录，捕捉"当前集由黑变红"（平台完成标记）。
    // 放独立轮询、与采样节奏解耦；2 秒检测延迟对"第二遍才变红"完全够用。
    setInterval(() => {
      if (!CFG.enabled || switching || switchTimer) return;
      if (checkCurTurnedRed()) {
        // 平台自己都标红了，这是权威信号，允许不等进度到结尾就切（绕过 goNext 的总闸）。
        allowEarlySwitchUntil = Date.now() + 30000;
        log('当前集已标红（平台记为完成），切下一集');
        markDone(currentKey());
        scheduleNext();
      }
    }, 2000);
    // v1.9：课程串联循环（课程列表 / 视频列表页才动作）
    setInterval(acTick, 2500);

    const kind0 = pageKind();
    if (kind0 !== 'play') {
      setStatus('自动刷课', '正在识别本页可点的课程/视频…');
      updateUI();
      setTimeout(acTick, 1200);
      return;                       // 非播放页：下面那套"认目录"的逻辑用不上
    }

    // 播放页地址里偶尔带 lesson_id，顺手记下来，播完才知道回到哪门课的视频列表
    const lm = location.search.match(/lesson_id=(\d+)/i);
    if (lm && acKey(lm[1]) !== AC.lesson) { AC.lesson = acKey(lm[1]); acSave(); }

    tick();
    setTimeout(() => {
      const cat = getCatalog(true);
      if (!cat) {
        log('暂未识别到目录，稍后自动重试');
        setStatus('等待目录', '若一直如此，请把页面截图发我');
      } else {
        const i = locateCurrent(cat);
        log('目录 ' + cat.items.length + ' 项，当前第 ' + (i >= 0 ? i + 1 : '?') + ' 项');
        log('红色(已完成) ' + cat.redCount + ' 项' + (cat.redUsable ? '' : '，但整份目录都发红，已停用红色判断'));
        if (i < 0) setStatus('未定位当前集', '请在目录里手动点一集，脚本会记住');
        updateUI();
      }
    }, 2000);
  }

  // 控制台诊断入口：__rdjypx.dump() 打印每一集的颜色与完成判断
  window.__rdjypx = {
    dump() {
      const cat = getCatalog(true);
      if (!cat) { console.log('没有识别到目录'); return ''; }
      const cur = locateCurrent(cat);
      const lines = cat.items.map((it) => {
        const ri = redInfo(it.el);
        const mark = it.i === cur ? ' ←当前' : '';
        return '#' + (it.i + 1) + (it.doneHint ? '  [红·已完成]' : '  [黑·未完成]') +
          '  ' + it.text + '  rid=' + (it.rid || '?') +
          '  红源=' + (ri.red ? ri.tag + ' ' + ri.color : '无') + mark;
      });
      lines.unshift('共 ' + cat.items.length + ' 项，红色 ' + cat.redCount + ' 项，红色判断' +
        (cat.redUsable ? '已启用' : '已停用') + '；URL r_id=' + (urlId('r_id') || '?') +
        '，当前定位第 ' + (cur >= 0 ? cur + 1 : '?') + ' 项');
      const s = lines.join('\n');
      console.log(s);
      try { copy(s); } catch (e) {}
      return s;
    },
    skip(on) {
      CFG.skipDone = on !== false;
      store.set('rdjypx:skip', CFG.skipDone ? '1' : '0');
      log('跳过红项：' + (CFG.skipDone ? '开' : '关'));
      updateUI();
    },
    stop() { CFG.enabled = false; store.set(K.on, '0'); updateUI(); log('已暂停'); },
    start() { CFG.enabled = true; store.set(K.on, '1'); autoStartNext = true; updateUI(); log('已开启'); },
    // __rdjypx.keep()：看"后台保活"到底成没成（换了电脑/浏览器后先跑这个）
    keep() {
      keepAwake();
      resumeAudio();
      const k = keepStat();
      const line = '保活：' + k.text + '；心跳 ' + k.beats + ' 次（' + k.beatAgo + 's 前）；音频 ' + k.audio +
        '；画中画 ' + (k.pip ? '开' : '关') + '；页面真实 hidden=' + k.hidden;
      console.log(line);
      try { copy(line); } catch (e) {}
      return line;
    },
    pip() { return enterPip(false); },
    // __rdjypx.ac()：看"自动刷课"这一层现在看到了什么、为什么不动
    ac() {
      const kind = pageKind();
      const lessons = kind === 'courseList' ? scanLessons() : [];
      const vids = kind === 'videoList' ? scanVideos() : [];
      const pr = acProgress();
      const nx = acNextLesson();
      const rows = {
        页面类型: kind,
        面板状态: (statusMain || '') + (statusSub ? ' / ' + statusSub : ''),
        自动刷课: CFG.autoCourse ? '开' : '关',
        盲跑模式: CFG.acBlind ? '开（不识别也跳）' : '关（必须先识别目录）',
        课程清单: pr.n ? (pr.n + ' 门 · 已完成 ' + pr.d + ' 门') : '（还没识别，去目录页点「识别目录」）',
        清单识别时间: AC.manifestAt ? new Date(AC.manifestAt).toLocaleString('zh-CN', { hour12: false }) : '（无）',
        当前课程: AC.lesson ? AC.lesson + ' ' + AC.lessonText : '（未知）',
        下一门课: nx ? (nx.id + ' ' + (nx.text || '').slice(0, 20) + ' → ' + nx.url) : '（清单里没有未完成的）',
        已完成课程: AC.done.length ? AC.done.join(', ') : '（无）',
        课程列表地址: AC.listUrl || '（还没识别过目录页）',
        视频列表地址: AC.videoListUrl || '（还没访问过视频列表）',
        上次跳转: AC.navTo ? Math.round((Date.now() - AC.navAt) / 1000) + 's 前 → ' + AC.navTo : '（无）',
        跳转历史: (AC.hops || []).map((h) => Math.round((Date.now() - h.t) / 1000) + 's前').join(' / ') || '（无）',
      };
      if (kind === 'courseList') {
        rows['本页课程数'] = lessons.length;
        rows['未完成课程'] = lessons.filter((l) => !acIsDone(l))
          .map((l) => l.id + ':' + l.text.slice(0, 16)).join(' | ') || '（都完成了）';
      }
      if (kind === 'videoList') {
        rows['本页视频数'] = vids.length;
        rows['未标红视频'] = vids.filter((v) => !v.red).length;
      }
      console.table(rows);
      if (AC.manifest.length) {
        console.table(AC.manifest.map((x, i) => ({
          序: i + 1,
          课程: (x.text || '').slice(0, 24),
          id: x.id,
          完成: acIsDone(x) ? '✔' : '',
          地址: x.url,
        })));
      }
      return rows;
    },
    // __rdjypx.acScan()：等同于点面板上的「识别目录」
    acScan() { return acRecognize(); },
    // __rdjypx.acBlind(true)：打开"不看清单也自己猜着跑"的老 v1.9 行为（默认关）
    acBlind(on) {
      CFG.acBlind = !!on;
      store.set('rdjypx:acblind', CFG.acBlind ? '1' : '0');
      return '盲跑模式：' + (CFG.acBlind ? '开（不识别也自动跳）' : '关（必须先点「识别目录」）');
    },
    acReset() { acReset(); return '已清空完成记录（清单保留）'; },
    // 一句话说清现在为什么不动：__rdjypx.why()
    why() {
      const v = findVideo();
      const dlg = findFinishDialog();
      const cat = getCatalog(true);
      const i = cat ? locateCurrent(cat) : -1;
      const rows = {
        开关: CFG.enabled ? '开' : '关（点面板「继续」）',
        跳过红项: CFG.skipDone ? '开' : '关',
        识别到弹窗: dlg ? '有，按钮「' + norm(dlg.btn.textContent || dlg.btn.value || '') + '」' : '没有',
        暂停框: findPauseDialog() ? '有，会点「继续」恢复' : '没有',
        视频: v ? fmt(v.currentTime) + ' / ' + fmt(v.duration) + '，' + (v.paused ? '暂停' : '播放') + (v.ended ? '，已结束' : '') : '没找到 video',
        进度状态: progressState(v) + '（最远播到 ' + fmt(maxSeen) + '）',
        进度已停: Math.round(stalledMs() / 1000) + 's',
        播放效率: (() => {
          const p = perfStat();
          return p.text + '（视频走了 ' + fmt(p.played) + '，现实过了 ' + fmt(p.wall) + '）';
        })(),
        后台时长: fmt(perfStat().hidden) + (realHidden ? '（现在正在后台，已伪装可见）' : '（前台）'),
        判定门槛: (() => {
          if (!v) return '没视频';
          const d = isFinite(v.duration) ? v.duration : 0;
          if (d <= 0) return '拿不到时长';
          const far = Math.max(maxSeen, isFinite(v.currentTime) ? v.currentTime : 0);
          return '已到 ' + (far / d * 100).toFixed(1) + '%，距结尾还差 ' +
            Math.max(0, d - far).toFixed(0) + ' 秒（≤' + END_TOLERANCE + ' 秒才允许自动切）';
        })(),
        这次会: nearEnd(v) ? '点按钮并切下一集' : '只关提示框，不切集',
        当前集: cat ? '第 ' + (i >= 0 ? i + 1 : '?') + '/' + cat.items.length + '（' + urlId('r_id') + '）' : '没识别到目录',
        等切集锁: awaitingSwitchUntil > Date.now() ? '剩 ' + Math.round((awaitingSwitchUntil - Date.now()) / 1000) + 's' : '无',
        整遍重播: loopCount + ' 遍',
        保活: keepStat().text + '（心跳 ' + keepStat().beatAgo + 's 前）',
        缓冲: (() => {
          if (!v) return '没视频';
          let buf = 0;
          try { if (v.buffered.length) buf = v.buffered.end(v.buffered.length - 1) - v.currentTime; } catch (e) {}
          return 'readyState=' + v.readyState + '，前方已缓冲 ' + Math.max(0, buf).toFixed(1) + 's' +
            (perf.stallStart ? '，正在卡（' + Math.round((Date.now() - perf.stallStart) / 1000) + 's）' : '');
        })(),
        当前集颜色: (() => { const c = getCatalog(true); if (!c) return '?'; const j = locateCurrent(c); return j >= 0 ? (c.items[j].red ? '红' : '黑') + '（红色判断' + (c.redUsable ? '启用' : '停用') + '）' : '?'; })(),
      };
      console.table(rows);
      return rows;
    },
    // __rdjypx.dom()：目录认不出来时用它，列出所有"像目录"的容器，一眼看出真实结构
    dom() {
      let nodes = [];
      try { nodes = document.querySelectorAll('div, ul, ol, dl, table, tbody'); } catch (e) { nodes = []; }
      const rows = [];
      for (const el of nodes) {
        const kids = el.children;
        if (!kids.length || kids.length > 200) continue;
        let withTime = 0, sample = '';
        for (const c of kids) {
          const t = (c.textContent || '').replace(/\s+/g, ' ').trim();
          if (t.length < 160 && /\d{1,2}:\d{2}/.test(t)) withTime++;
          if (!sample && t) sample = t.slice(0, 36);
        }
        if (!withTime) continue;
        let links = 0, ridLinks = 0;
        try { links = el.querySelectorAll('a[href]').length; } catch (e) {}
        try { ridLinks = el.querySelectorAll('a[href*="r_id"]').length; } catch (e) {}
        rows.push({
          子项: kids.length, 带时间: withTime, 链接: links, r_id链接: ridLinks,
          标签: el.tagName.toLowerCase(),
          class: (el.getAttribute('class') || '').slice(0, 40),
          首条: sample,
        });
      }
      console.table(rows.slice(0, 40));
      const s = JSON.stringify(rows.slice(0, 40), null, 1);
      try { copy(s); } catch (e) {}
      if (!rows.length) console.log('页面上找不到任何"带时间文本"的列表容器');
      return rows;
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
