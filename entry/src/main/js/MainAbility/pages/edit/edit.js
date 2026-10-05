import router from '../../common/router';
import common from '../../common/common';
import data from '../../common/data';

export default {
    data: {
        kind: 'todo',
        mode: 'add',
        id: '',
        text: '',
        hasText: false,
        maxLen: 60,
        kindTitle: '',
        modeTitle: '',
        showDel: false,
        msg: '',
        kbText: ''
    },
    onInit: function () {
        let p = router.getParams();
        if (!p) p = {};
        this.kind = p.kind === 'memo' ? 'memo' : 'todo';
        this.mode = p.mode === 'edit' ? 'edit' : 'add';
        this.id = p.id ? p.id : '';
        this.maxLen = data.maxLen(this.kind);
        this.kindTitle = this.kind === 'memo' ? '\u5907\u5FD8' : '\u5F85\u529E';
        this.modeTitle = this.mode === 'edit' ? '\u7F16\u8F91' : '\u65B0\u5EFA';
        this.showDel = this.mode === 'edit';
        this.syncView();
        if (this.mode === 'edit') this.loadItem();
    },
    onBackPress() {
        router.back();
        return true;
    },
    onShow: function () {
        let self = this;
        common.getParams(this, function () {
            if (self.kbText) {
                self.text = self.kbText;
                self.msg = '';
            }
            self.kbText = '';
            common.clean();
            self.syncView();
        });
    },
    syncView: function () {
        this.hasText = this.text !== '';
    },
    loadItem: function () {
        let self = this;
        data.load(this.kind, function (arr) {
            for (let i = 0; i < arr.length; i++) {
                if (arr[i].id === self.id) { self.text = arr[i].t; break; }
            }
            self.syncView();
        });
    },
    openKeyboard: function () {
        router.push({ uri: 'pages/keyboard/keyboard' });
    },
    onSave: function () {
        let t = String(this.text || '').trim();
        if (t === '') { this.msg = '\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A'; this.syncView(); return; }
        if (t.length > this.maxLen) { t = t.substring(0, this.maxLen); this.msg = '\u5DF2\u622A\u65AD\u5230\u4E0A\u9650'; }
        else { this.msg = ''; }
        this.text = t;
        this.syncView();
        let self = this;
        data.load(this.kind, function (arr) {
            let now = Date.now();
            if (self.mode === 'edit' && self.id !== '') {
                let hit = false;
                for (let i = 0; i < arr.length; i++) {
                    if (arr[i].id === self.id) { arr[i].t = t; arr[i].u = now; hit = true; break; }
                }
                if (!hit) arr.unshift({ id: self.id, t: t, d: 0, c: now, u: now });
            } else {
                let nid = data.newId();
                self.id = nid;
                self.mode = 'edit';
                self.showDel = true;
                arr.unshift({ id: nid, t: t, d: 0, c: now, u: now });
            }
            data.commit(self.kind, arr, function () { router.back(); });
        });
    },
    onRemove: function () {
        if (this.id === '') { router.back(); return; }
        let self = this;
        data.load(this.kind, function (arr) {
            let next = [];
            for (let i = 0; i < arr.length; i++) { if (arr[i].id !== self.id) next.push(arr[i]); }
            data.commit(self.kind, next, function () { router.back(); });
        });
    },
    onSwipe: function (e) {
        if (e && e.direction === 'right') router.back();
    }
};
