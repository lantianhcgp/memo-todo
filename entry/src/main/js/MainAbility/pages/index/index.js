import router from '../../common/router';
import common from '../../common/common';
import data from '../../common/data';

let lastLongAt = 0;
let lastFoldAt = 0;

export default {
    data: {
        all: [],
        view: [],
        pending: 0,
        done: 0,
        empty: true,
        showDone: false,
    },
    onInit: function () { this.reload(); },
    onShow: function () { this.reload(); },
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
                t: (this.showDone ? '\u6536\u8D77' : '\u5DF2\u5B8C\u6210') + ' ' + fin.length,
                fold: 1,
                d: 0
            }]);
            if (this.showDone) view = view.concat(fin);
        }
        this.view = view;
        this.pending = pend.length;
        this.done = fin.length;
        this.empty = this.all.length === 0;
    },
    onTap: function (id) {
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
        // 乐观更新：先立刻刷新界面，再后台落盘。
        // 原先等 writeText 回调才 rebuild，UI 无即时反馈时用户会连续点，
        // 每点一次压一个全量序列化+写盘任务，队列堆积直接卡死。
        this.rebuild();
        data.commit('todo', this.all, null);
    },
    onLong: function (id) {
        if (id === '__fold') return;
        // @longpress 与 onlongpress 双绑 + 冒泡可能重复触发，这里防重入：
        // 跳转是不可逆操作，重复执行会压出多个页面实例导致卡死
        let now = Date.now();
        if (now - lastLongAt < 700) return;
        lastLongAt = now;
        common.writeMultiParams({ kind: 'todo', mode: 'edit', id: id }, function () {
            router.push({ uri: 'pages/edit/edit', params: { kind: 'todo', mode: 'edit', id: id } });
        });
    },
    onAdd: function () {
        common.writeMultiParams({ kind: 'todo', mode: 'add' }, function () {
            router.push({ uri: 'pages/edit/edit', params: { kind: 'todo', mode: 'add' } });
        });
    },
    onNote: function () {
        router.push({ uri: 'pages/note/note' });
    },
    onSwipe: function (e) {
        if (e && e.direction === 'left') this.onNote();
    }
};
