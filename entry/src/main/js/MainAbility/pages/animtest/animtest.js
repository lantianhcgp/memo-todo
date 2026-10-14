import anim from '../../common/anim';

var flip = null;

export default {
    data: {
        pg: 'pageIdle',
        cName: 'cSwap',
        dOp: 1,
        tick: 0
    },
    onInit() {
        this.pg = 'pageIdle';
    },
    onReady() {
        anim.pageIn(this, 'pg');
        // C/D 通道：运行时换名 + JS 改 opacity，300ms 翻转一次，无限循环供采集观察
        var self = this;
        var on = false;
        flip = setInterval(function () {
            on = !on;
            self.cName = on ? 'cSwap2' : 'cSwap';
            self.dOp = on ? 0.2 : 1;
            self.tick = self.tick + 1;
        }, 300);
    },
    onDestroy() {
        if (flip) { clearInterval(flip); flip = null; }
        anim.clearAll();
    }
};
