import router from '../../common/router';
import common from '../../common/common';
import data from '../../common/data';
import anim from '../../common/anim';

let lastFoldAt = 0;
let lastTapAt = 0;
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
        bNote: 'pressNone',
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
        // 2026-10-18 真机反馈：快速连点复选框崩表。200ms 节流（闸必须在 toggle 之前，
        // 放后面会翻了数据不刷 UI 造成状态错乱）
        let now2 = Date.now();
        if (now2 - lastTapAt < 200) return;
        lastTapAt = now2;
        for (let i = 0; i < this.all.length; i++) {
            if (this.all[i].id === id) {
                this.all[i].d = this.all[i].d === 1 ? 0 : 1;
                this.all[i].u = Date.now();
                break;
            }
        }
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
        // 落盘照旧：commit 队列对同 uri 无回调任务去重，只写最后一份
        data.commit('todo', this.all, null);
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
    onNote: function () {
        anim.press(this, 'bNote');
        if (!navGuard()) return;
        router.push({ uri: 'pages/note/note' });
    },
    onSwipe: function (e) {
        // 真机反馈：列表滑动的水平分量误触 swipe 连发 → 导航闸节流，闸吞掉的滑动不做任何事
        if (e && e.direction === 'left' && navGuard()) {
            anim.press(this, 'bNote');
            router.push({ uri: 'pages/note/note' });
        }
    },
    onDestroy: function () { anim.clearAll(); }
};
