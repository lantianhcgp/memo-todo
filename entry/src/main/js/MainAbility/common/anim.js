/* Lite 动效公共模块 v2（memo-todo）
 * v1 教训（2026-10-14 真机：完全无效果）：缺省 animation-name 用空串 = 元素平时没有动画，
 * 交互时运行时"凭空新增"动画 —— 真机引擎不触发。
 * v2 改用 fetch-read 真机实证配方（litewearable-api10-dev 附录 B）：
 * 所有元素常驻一个 identity 动画（pressNone / pageIdle），交互时只做"换名"，
 * 重渲染重启也因 identity 帧不可见。时序参照 bounce.trigger。
 */
var timers = {};

function later(id, fn, ms) {
    if (timers[id]) clearTimeout(timers[id]);
    timers[id] = setTimeout(function () {
        delete timers[id];
        fn();
    }, ms);
}

var NONE = 'pressNone';
var IDLE = 'pageIdle';

export default class anim {

    /* 普通按钮：字段直接绑 animation-name，缺省值 pressNone（数据初值就要是 pressNone） */
    static press(vm, field) {
        if (!vm) return;
        vm[field] = 'pressDown';
        later(field + '_a', function () { vm[field] = 'pressUp'; }, 90);
        later(field + '_b', function () { vm[field] = NONE; }, 340);
    }

    /* 键盘按键：bk=按下的字符，bdn=当前相位（缺省 pressNone），
     * HML 绑 {{ bk === 'q' ? bdn : 'pressNone' }} */
    static key(vm, ch) {
        if (!vm) return;
        vm.bk = ch;
        vm.bdn = 'pressDown';
        later('kb_a', function () { vm.bdn = 'pressUp'; }, 90);
        later('kb_b', function () { vm.bdn = NONE; vm.bk = ''; }, 340);
    }

    /* 页面入场：onReady 里调用（初始态 pageIdle → 换名 pageIn 才能触发），
     * 360ms 后回落 pageIdle（防 timeString 等高频刷新反复重播） */
    static pageIn(vm, field) {
        if (!vm) return;
        vm[field] = 'pageIn';
        later(field + '_i', function () { vm[field] = IDLE; }, 360);
    }

    /* 页面出场：换名 pageOut，约 210ms 后执行真正的跳转；false = 重复触发被忽略 */
    static pageOut(vm, field, cb) {
        if (!vm) { if (cb) cb(); return true; }
        if (vm[field] === 'pageOut') return false;
        vm[field] = 'pageOut';
        later(field + '_o', function () { if (cb) cb(); }, 210);
        return true;
    }

    /* 页面 onDestroy 必须调用：清掉所有遗留定时器 */
    static clearAll() {
        for (var k in timers) {
            clearTimeout(timers[k]);
            delete timers[k];
        }
    }
}
