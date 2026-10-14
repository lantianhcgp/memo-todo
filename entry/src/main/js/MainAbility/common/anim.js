/* Lite 动效公共模块（memo-todo）
 * 依据：litewearable-api10-dev 实测铁律 —— 任意 data 变化整页重渲染并重启
 * animation-name 非空元素，所以缺省态一律用空串 ''（= 无动画，腕上词典同款写法），
 * 只在交互瞬间切入 pressDown/pressUp/pageIn/pageOut。
 * 按键时序参照 fetch-read 真机工程：按下 60ms → 回弹 → 220ms 清空。
 */
var timers = {};

function later(id, fn, ms) {
    if (timers[id]) clearTimeout(timers[id]);
    timers[id] = setTimeout(function () {
        delete timers[id];
        fn();
    }, ms);
}

export default class anim {

    /* 普通按钮：字段直接绑 animation-name（style="animation-name: {{ bAdd }};"） */
    static press(vm, field) {
        if (!vm) return;
        vm[field] = 'pressDown';
        later(field + '_a', function () { vm[field] = 'pressUp'; }, 60);
        later(field + '_b', function () { vm[field] = ''; }, 220);
    }

    /* 键盘按键：所有键共用 bk（按下的字符）+ bdn（当前相位）两个字段，
     * HML 绑 {{ bk === 'q' ? bdn : '' }}，按谁亮谁，避免几十个独立字段 */
    static key(vm, ch) {
        if (!vm) return;
        vm.bk = ch;
        vm.bdn = 'pressDown';
        later('kb_a', function () { vm.bdn = 'pressUp'; }, 60);
        later('kb_b', function () { vm.bk = ''; vm.bdn = ''; }, 220);
    }

    /* 页面入场：一次性，320ms 后清空（防 timeString 等高频刷新反复重播） */
    static pageIn(vm, field) {
        if (!vm) return;
        vm[field] = 'pageIn';
        later(field + '_i', function () { vm[field] = ''; }, 320);
    }

    /* 页面出场：播 pageOut，约 210ms 后执行真正的跳转；返回 false = 重复触发被忽略 */
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
