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
        kbText: '',
        previewText: ''
    },
    onInit: function () {
        // 参数统一走 $app 参数仓（system router 的 getParams 在本工程读不稳，导致备忘存成待办/编辑变新建）
        let self = this;
        common.getParams(this, function () {
            self.kind = self.kind === 'memo' ? 'memo' : 'todo';
            self.mode = self.mode === 'edit' ? 'edit' : 'add';
            self.id = self.id ? self.id : '';
            self.maxLen = data.maxLen(self.kind);
            self.kindTitle = self.kind === 'memo' ? '\u5907\u5FD8' : '\u5F85\u529E';
            self.modeTitle = self.mode === 'edit' ? '\u7F16\u8F91' : '\u65B0\u5EFA';
            self.showDel = self.mode === 'edit';
            self.syncView();
            if (self.mode === 'edit') self.loadItem();
        });
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
        this.previewText = this.fit(this.text, 330, 31);
    },
    // 按可见宽度从头截断：预览区永远从第一个字符开始显示
    fit: function (s, maxW, fs) {
        var w = 0;
        var out = '';
        var lines = 1;
        for (var i = 0; i < s.length; i++) {
            var c = s.charCodeAt(i);
            if (c === 10) {
                lines++;
                if (lines > 4) { out += '\u2026'; break; }
                out += '\n';
                w = 0;
                continue;
            }
            var cw = (c > 0x2E80) ? fs : Math.round(fs * 0.56);
            if (w + cw > maxW) {
                lines++;
                if (lines > 4) { out += '\u2026'; break; }
                w = 0;
            }
            w += cw;
            out += s.charAt(i);
        }
        return out;
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
        common.writeMultiParams({ kbInit: this.text }, function () {
            router.push({ uri: 'pages/keyboard/keyboard' });
        });
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
