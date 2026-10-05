import fs from './fs';

/**
 * 数据层：待办 + 备忘
 * - 存储走 @system.file（storage value<128B 红线，不能存 JSON 大 value）
 * - 写入串行队列：同一文件不并发写
 * - 读取按 4096 字节分片【串行】追加（fs.readLargeFile 是并行乱序追加，本层不用）
 * - 结构：[{ id, t, d, c, u }]  id=唯一id  t=文本  d=完成(待办)  c=创建  u=更新
 */
const URI = {
    todo: 'internal://app/todo.json',
    memo: 'internal://app/memo.json'
};
const MAX_ITEMS = 100;
const MAX_LEN = { todo: 60, memo: 300 };
const CHUNK = 4096;

let queue = [];
let writing = false;

function pump() {
    if (writing || queue.length === 0) return;
    writing = true;
    let job = queue.shift();
    fs.writeFile(job.uri, job.text, (err) => {
        writing = false;
        if (job.cb) job.cb(err ? false : true);
        job = null;
        pump();
    });
}

export default class data {
    /** 单条文本上限（字） */
    static maxLen(kind) {
        return MAX_LEN[kind] || 60;
    }

    static newId() {
        return Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
    }

    /** 分片串行读全量 */
    static readAll(uri, pos, acc, cb) {
        fs.rawApi.readText({
            uri: uri,
            position: pos,
            length: CHUNK,
            success: (d) => {
                const txt = (d && d.text) ? d.text : '';
                acc += txt;
                if (txt.length < CHUNK || acc.length > 65536) {
                    cb(null, acc);
                    return;
                }
                data.readAll(uri, pos + CHUNK, acc, cb);
            },
            fail: (d, code) => {
                // 301 = 文件不存在
                if (pos === 0) cb(code, null);
                else cb(null, acc);
            }
        });
    }

    /** cb(list) 永远回调；文件不存在/损坏返回 [] */
    static load(kind, cb) {
        const uri = URI[kind];
        fs.access(uri, (err, ok) => {
            if (ok === false) { cb([]); return; }
            data.readAll(uri, 0, '', (code, text) => {
                if (code !== null || !text) { cb([]); return; }
                let arr = null;
                try { arr = JSON.parse(text); } catch (e) { arr = null; }
                if (!arr || arr.length === undefined) { cb([]); return; }
                cb(arr);
            });
        });
    }

    /** 提交整表（自动截断上限）；cb(ok) 可省 */
    static commit(kind, list, cb) {
        let arr = list || [];
        if (arr.length > MAX_ITEMS) arr = arr.slice(0, MAX_ITEMS);
        queue.push({ uri: URI[kind], text: JSON.stringify(arr), cb: cb });
        pump();
    }

    static limit(kind) {
        return MAX_ITEMS;
    }
}
