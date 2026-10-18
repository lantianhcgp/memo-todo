import router from '../../common/router';
import common from '../../common/common';
import data from '../../common/data';
import anim from '../../common/anim';

let lastFoldAt = 0;
let tapTimer = null;   // 合并渲染定时器（连点时 UI 刷新最多 3.3 次/秒）
// 导航闸（2026-10-18 真机反馈：划列表误触 swipe 连发 push 备忘页 → 页面实例堆积死机）
// 所有导航入口共用：闸内再调用其他入口也不会重复放行
let lastNavAt = 0;
function navGuard(gap) {
    let now = Date.now();
    if (now - lastNavAt < (gap || 800)) return false;
    lastNavAt = now;
    return true;
}

export default {
    data: {
        all: [],
        view: [],
        pending: 0,
        done: 0,
        empty: true,
        showDone: false,
        pg: 'pageIdle',
        bAdd: 'pressNone',
    },
    onInit: function () { this.reload(); },
    onReady: function () { anim.pageIn(this, 'pg'); },
    onShow: function () {
        this.reload();
        this.enableRotation(true);   // 表冠滚动（elcton 同款 list.rotation）
    },
    onHide: function () { this.enableRotation(false); },
    enableRotation: function (value) {
        var r = this.$refs.list;
        if (r && r.rotation) r.rotation({ focus: value });
    },
    reload: function () {
        let self = this;
        data.load('todo', function (arr) {
            self.all = arr;
            self.rebuild();
        });
    },
    rebuild: function () {
        let pend = [];
        let fin = [];
        for (let i = 0; i < this.all.length; i++) {
            let it = this.all[i];
            if (it.d === 1) fin.push(it); else pend.push(it);
        }
        let view = pend;
        if (fin.length > 0) {
            view = view.concat([{
                id: '__fold',
                t: (this.showDone ? '收起' : '已完成') + ' ' + fin.length,
                fold: 1,
                d: 0
            }]);
            if (this.showDone) {
                // 2026-10-18 真机反馈：展开已完成即崩 —— 全量塞 list 一次建 200 个
                // item 节点树打爆 JS 堆（MAX_ITEMS=100）。只展开最近 20 条 + 超限提示行。
                if (fin.length > 20) {
                    view = view.concat(fin.slice(0, 20));
                    view = view.concat([{
                        id: '__more',
                        t: '仅显示最近 20 条，共 ' + fin.length + ' 条',
                        fold: 1,
                        d: 0
                    }]);
                } else {
                    view = view.concat(fin);
                }
            }
        }
        this.view = view;
        this.pending = pend.length;
        this.done = fin.length;
        this.empty = this.all.length === 0;
    },
    onTap: function (id) {
        if (id === '__more') return;   // 提示行不可交互
        if (id === '__fold') {
            // 展开后列表重排，抬手可能落到相邻 item 上触发级联 onTap（那条路径会写文件）。
            // 折叠/展开是低频操作，500ms 内忽略重复点击。
            let now = Date.now();
            if (now - lastFoldAt < 500) return;
            lastFoldAt = now;
            this.showDone = !this.showDone;
            this.rebuild();
            return;
        }
        for (let i = 0; i < this.all.length; i++) {
            if (this.all[i].id === id) {
                this.all[i].d = this.all[i].d === 1 ? 0 : 1;
                this.all[i].u = Date.now();
                break;
            }
        }
        // 落盘照旧：commit 队列对同 uri 无回调任务去重，只写最后一份
        data.commit('todo', this.all, null);
        // 2026-10-18 真机反馈连点卡死（二次修复）：翻数据=同步内存操作每击必生效；
        // UI 刷新合并到 300ms 定时器 —— 真机整页重渲染实测 204ms/次，每击必刷时
        // 渲染永远追不上点击频率，队列积压到卡死。合并后渲染频率被钳制 ≤3.3 次/秒。
        let self = this;
        if (!tapTimer) {
            tapTimer = setTimeout(function () {
                tapTimer = null;
                self.flushTap();
            }, 300);
        }
    },
    // 合并渲染：连点期间数据已在内存最新，这里只做 UI 侧的顺序保持重绘+计数刷新
    flushTap: function () {
        // 原地翻转不重排：rebuild 会把打勾条目立刻挪进「已完成」组，手指下方条目
        // 瞬间换人 → 连点落点漂移形成级联误触（用户感觉"完成又未完成"），且整页
        // 重渲染风暴（官方 sim 实测 204ms/次）打爆 JS 堆直接崩表。
        // 顺序重排只在 reload（进页面）与 fold 展开收起时做。
        let v = [];
        let pend = 0;
        let fin = 0;
        for (let i = 0; i < this.all.length; i++) {
            if (this.all[i].d === 1) fin++; else pend++;
        }
        for (let i = 0; i < this.view.length; i++) {
            v.push(this.view[i]);
            // 折叠态的「已完成 N」行是字符串快照，计数变了就地刷新
            if (!this.showDone && this.view[i].fold === 1) {
                this.view[i].t = '\u5DF2\u5B8C\u6210 ' + fin;
            }
        }
        this.view = v;      // 新数组引用触发重渲染，条目顺序不变
        this.pending = pend;
        this.done = fin;
    },
    onLong: function (id) {
        if (id === '__fold') return;
        // @longpress 与 onlongpress 双绑 + 冒泡可能重复触发 → 导航闸防重入
        if (!navGuard(700)) return;
        common.writeMultiParams({ kind: 'todo', mode: 'edit', id: id }, function () {
            router.push({ uri: 'pages/edit/edit', params: { kind: 'todo', mode: 'edit', id: id } });
        });
    },
    onAdd: function () {
        anim.press(this, 'bAdd');
        if (!navGuard()) return;
        common.writeMultiParams({ kind: 'todo', mode: 'add' }, function () {
            router.push({ uri: 'pages/edit/edit', params: { kind: 'todo', mode: 'add' } });
        });
    },

    onDestroy: function () {
        if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; }
        this.enableRotation(false);
        anim.clearAll();
    }
};
