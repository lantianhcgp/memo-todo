import fs from './fs';


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
    
    static maxLen(kind) {
        return MAX_LEN[kind] || 60;
    }

    static newId() {
        return Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
    }

    
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
