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
        previewText: '',
        _k: '',
        _m: '',
        _i: '',
        _saving: false
    },
    onInit: function () {
        // 通道A: system router(便条/词典同款)兜底; 通道B: $app 参数仓, 读后覆盖、优先生效
        let self = this;
        let sp = router.getParams();
        if (sp) {
            if (sp.kind) this.kind = sp.kind;
            if (sp.mode) this.mode = sp.mode;
            if (sp.id) this.id = sp.id;
        }
        common.getParams(this, function () {
            self.kind = self.kind === 'memo' ? 'memo' : 'todo';
            self.mode = self.mode === 'edit' ? 'edit' : 'add';
            self.id = self.id ? self.id : '';
            self.maxLen = data.maxLen(self.kind);
            self.kindTitle = self.kind === 'memo' ? '\u5907\u5FD8' : '\u5F85\u529E';
            self.modeTitle = self.mode === 'edit' ? '\u7F16\u8F91' : '\u65B0\u5EFA';
            self.showDel = self.mode === 'edit';
            // 固化入口参数：此后 kind/mode/id 不再接受任何 params 覆盖（曾被 onShow 拷贝冲掉）
            self._k = self.kind;
            self._m = self.mode;
            self._i = self.id;
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
            // 只接收键盘回传的文本，kind/mode/id 一律还原为入口固化值
            if (self._k) { self.kind = self._k; self.mode = self._m; self.id = self._i; }
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
        let kind = this._k || this.kind;
        data.load(kind, function (arr) {
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
        if (this._saving) return;          // 防双击：commit 异步，二次进入会重复插入
        let t = String(this.text || '').trim();
        if (t === '') { this.msg = '\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A'; this.syncView(); return; }
        if (t.length > this.maxLen) { t = t.substring(0, this.maxLen); this.msg = '\u5DF2\u622A\u65AD\u5230\u4E0A\u9650'; }
        else { this.msg = ''; }
        this.text = t;
        this.syncView();
        let self = this;
        this._saving = true;
        let kind = this._k || this.kind;
        let mode = this._m || this.mode;
        let itemId = this._i || this.id;
        data.load(kind, function (arr) {
            let now = Date.now();
            if (mode === 'edit' && itemId !== '') {
                let hit = false;
                for (let i = 0; i < arr.length; i++) {
                    if (arr[i].id === itemId) { arr[i].t = t; arr[i].u = now; hit = true; break; }
                }
                if (!hit) arr.unshift({ id: itemId, t: t, d: 0, c: now, u: now });
            } else {
                let nid = data.newId();
                self._i = nid;
                self.id = nid;
                self._m = 'edit';
                self.mode = 'edit';
                self.showDel = true;
                arr.unshift({ id: nid, t: t, d: 0, c: now, u: now });
            }
            data.commit(kind, arr, function () {
                self._saving = false;
                router.back();
            });
        });
    },
    onRemove: function () {
        if (this._saving) return;
        let id = this._i || this.id;
        if (id === '') { router.back(); return; }
        this._saving = true;
        let kind = this._k || this.kind;
        let self = this;
        data.load(kind, function (arr) {
            let next = [];
            for (let i = 0; i < arr.length; i++) { if (arr[i].id !== id) next.push(arr[i]); }
            data.commit(kind, next, function () { self._saving = false; router.back(); });
        });
    },
    onSwipe: function (e) {
        if (e && e.direction === 'right') router.back();
    }
};
