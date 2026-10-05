import router from '../../common/router';
import data from '../../common/data';

export default {
    data: {
        all: [],
        view: [],
        pending: 0,
        done: 0,
        empty: true,
        showDone: false
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
        let self = this;
        data.commit('todo', this.all, function () { self.rebuild(); });
    },
    onLong: function (id) {
        if (id === '__fold') return;
        router.push({ uri: 'pages/edit/edit', params: { kind: 'todo', mode: 'edit', id: id } });
    },
    onAdd: function () {
        router.push({ uri: 'pages/edit/edit', params: { kind: 'todo', mode: 'add' } });
    },
    onNote: function () {
        router.push({ uri: 'pages/note/note' });
    },
    onSwipe: function (e) {
        if (e && e.direction === 'left') this.onNote();
    }
};
