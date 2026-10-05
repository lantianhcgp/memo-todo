import * as system_file from "@system.file";

export default class fs {
    static get(uri, callback=undefined) {
        system_file.default.get({
            uri: uri,
            recursive: false,
            success: (data) => {
                if (callback) callback(undefined, data);
                data = null;
                return;
            },
            fail: (data, code) => {
                if (callback) callback(code, data);
            }
        });
    }

    static delete(uri, callback=undefined) {
        system_file.default.delete({
            uri: uri,
            success: () => {
                if (callback) callback(undefined, true);
            },
            fail: (data, code) => {
                if (callback) callback(code, data);
            }
        })
    }

    static listDir(uri, callback=undefined) {
        system_file.default.list({
            uri: uri,
            success: (data) => {
                if (callback) callback(undefined, data.fileList);
                data = null;
                return;
            },
            fail: (data, code) => {
                if (callback) callback(code, data);
            }
        });
    }

    static rmDir(uri, callback=undefined) {
        system_file.default.rmdir({
            uri: uri,
            recursive: true,
            success: () => {
                if (callback) callback(undefined, true);
            },
            fail: (data, code) => {
                if (callback) callback(code, data);
            }
        });
    }

    static copy(srcUri, dstUri, callback=undefined) {
        system_file.default.copy({
            srcUri: srcUri,
            dstUri: dstUri,
            success: (uri) => {
                if (callback) callback(undefined, uri);
            },
            fail: (data, code) => {
                if (callback) callback(code, data);
            }
        })
    }

    static readFile(uri, callback=undefined) {
        system_file.default.readText({
            uri: uri,
            length: 4096,
            success: (data) => {
                if (callback) callback(undefined, data.text);
            },
            fail: (data, code) => {
                if (callback) callback(code, data);
            }
        })
    }

    static readLargeFile(uri, callback=undefined) {
        // 必须串行分块：并发发起时各块回调顺序不定，JSON 会被拼乱（字典 26KB=7块 正中此雷）；
        // 且失败分支会重复回调/最后一块失败则永不回调。
        system_file.default.get({
            uri: uri,
            success: (data) => {
                let length = data.length;
                let read_count = Math.ceil(length / 4096);
                let temp = "";
                let idx = 0;
                let done = false;
                let step = function () {
                    if (done) return;
                    if (idx >= read_count) {
                        done = true;
                        if (callback) callback(undefined, temp);
                        temp = null;
                        return;
                    }
                    system_file.default.readText({
                        uri: uri,
                        position: idx * 4096,
                        length: 4096,
                        success: (d) => {
                            temp += (d && d.text) ? d.text : "";
                            d.text = null;
                            idx++;
                            step();
                        },
                        fail: (d, code) => {
                            if (idx === 0) {          // 首块就失败 = 文件不可读
                                done = true;
                                if (callback) callback(code, d);
                            } else {                  // 中途失败：按已读到的内容返回
                                idx++;
                                step();
                            }
                        }
                    });
                };
                step();
            },
            fail: (data, code) => {
                if (callback) callback(code, data);
            }
        });
    }

    static access(uri, callback=undefined) {
        system_file.default.access({
            uri: uri,
            success: () => {
                if (callback) callback(undefined, true);
            },
            fail: (data, code) => {
                if (callback) callback((code === 301 ? undefined : code), (code === 301 ? false : data));
            }
        })
    }

    static writeFile(uri, text, callback=undefined) {
        system_file.default.writeText({
            uri: uri,
            text: text,
            success: () => {
                if (callback) callback(undefined, true);
            },
            fail: (data, code) => {
                if (callback) callback(code, data);
            }
        });
    }

    static printGeneralError(code, data, customTag="") {
        console.error(`fs process ${customTag} error, error reason ${data}, error code ${code}`);
    }

    static rawApi = system_file.default;
}