import router from '../../common/router';
import common from '../../common/common';
import data from '../../common/data';
import anim from '../../common/anim';

export default {
    data: {
        view: [],
        count: 0,
        empty: true,
        confirming: false,
        delId: '',
        pg: 'pageIdle',
        bBack: 'pressNone',
        bAdd: 'pressNone',
        bNo: 'pressNone',
        bYes: 'pressNone'
    },
    onInit: function () { this.reload(); },
    onReady: function () { anim.pageIn(this, 'pg'); },
    onShow: function () { this.reload(); },
    reload: function () {
        let self = this;
        data.load('memo', function (arr) {
            let out = [];
            for (let i = 0; i < arr.length; i++) {
                let it = arr[i];
                let t = String(it.t || '').split('\n').join(' ');
                if (t.length > 24) t = t.substring(0, 24);
                out.push({ id: it.id, t: t, d: self.fmt(it.c || 0) });
            }
            self.view = out;
            self.count = out.length;
            self.empty = out.length === 0;
            self.confirming = false;
            self.delId = '';
        });
    },
    fmt: function (ts) {
        let d = new Date(ts);
        let mo = d.getMonth() + 1;
        let da = d.getDate();
        let hh = d.getHours();
        let mi = d.getMinutes();
        return (mo < 10 ? '0' + mo : mo) + '-' + (da < 10 ? '0' + da : da) + ' ' +
               (hh < 10 ? '0' + hh : hh) + ':' + (mi < 10 ? '0' + mi : mi);
    },
    onOpen: function (id) {
        if (this.confirming) return;
        common.writeMultiParams({ kind: 'memo', mode: 'edit', id: id }, function () {
            router.push({ uri: 'pages/edit/edit', params: { kind: 'memo', mode: 'edit', id: id } });
        });
    },
    onAskDel: function (id) {
        this.delId = id;
        this.confirming = true;
    },
    cancelDel: function () {
        anim.press(this, 'bNo');
        this.confirming = false;
        this.delId = '';
    },
    doDel: function () {
        anim.press(this, 'bYes');
        let self = this;
        data.load('memo', function (arr) {
            let next = [];
            for (let i = 0; i < arr.length; i++) {
                if (arr[i].id !== self.delId) next.push(arr[i]);
            }
            data.commit('memo', next, function () { self.reload(); });
        });
    },
    onAdd: function () {
        anim.press(this, 'bAdd');
        if (this.confirming) return;
        common.writeMultiParams({ kind: 'memo', mode: 'add' }, function () {
            router.push({ uri: 'pages/edit/edit', params: { kind: 'memo', mode: 'add' } });
        });
    },
    onBack: function () {
        anim.pageOut(this, 'pg', function () { router.back(); });
    },
    onBackPress() {
        anim.pageOut(this, 'pg', function () { router.back(); });
        return true;
    },
    onSwipe: function (e) {
        if (e && e.direction === 'right') anim.pageOut(this, 'pg', function () { router.back(); });
    },
    onDestroy: function () { anim.clearAll(); }
};
