import fs from '../common/fs';

//候选词文件读取相关实现
var chineseCandidateData = [];
var dict_uri = "internal://app/rawfile/inputMethod/chineseCandidate.json";

let globalApp = {};

try {
    if ($app) {
        globalApp = $app;
    }
} catch (e) {
    globalApp = {};
}

var en_uri = "internal://app/rawfile/inputMethod/enWords.json";
var enWords = [];
var st = { cn: false, en: false, cnErr: "" };

function loadJson(uri, onOk, onFail) {
    fs.readLargeFile(uri, (err, data) => {
        if (err) { if (onFail) onFail(String(err)); return; }
        try { onOk(JSON.parse(data)); } catch (e) { if (onFail) onFail(String(e)); }
    });
}

function loadCnDict() {
    if (globalApp.getChineseCandidate) {
        globalApp.getChineseCandidate((data) => { chineseCandidateData = data; st.cn = true; });
    } else {
        loadJson(dict_uri, (d) => { chineseCandidateData = d; st.cn = true; },
                        (e) => { st.cnErr = e; });
    }
}
loadCnDict();
loadJson(en_uri, (d) => { enWords = d; st.en = true; }, (e) => { st.cnErr = st.cnErr || e; });

export default class inputMethod {
    
    static getChineseCandidate(pinyin) {
        if (pinyin.length === 0) return []; //传入空字符串返回空数组
        let firstLetter = pinyin[0]; //获取第一个拼音字母
        let otherLetter = pinyin[1] ? pinyin.slice(1, pinyin.length) : "empty"; //获取其他拼音字母, 不存在则为empty
        let firstStageData = chineseCandidateData[firstLetter]; //获取第一个拼音字母对应的object
        if (firstStageData == undefined) return []; //如果不存在返回空数据
        let secondStageData = firstStageData[otherLetter]; //获取其他字母对应的string
        if (secondStageData == undefined) { //如果不存在, 自动联想到其他拼音上
            if (pinyin.length === 1) { //如果拼音的length只有1且不存在empty项 则自动联想第一个(有待改进)
                let otherLetter = Object.keys(firstStageData)[0];
                return firstStageData[otherLetter].split("");
            }
            let firstStageArr = Object.keys(firstStageData); //如果拼音的length不为1, 则寻找与之类似的拼音
            for (let i = 0, len = firstStageArr.length; i < len; i++) {
                let data = firstStageArr[i];
                if (data.indexOf(otherLetter) !== -1) return firstStageData[data].split("");
            }
            return []; //如果上述方法都无数据, 则返回空数据
        }
        return secondStageData.split(""); //如果存在 则返回原数据
    }

    
    // 字典自检/补载：键盘启动时调用，未加载则重读一次
    static ensureDict(cb) {
        if (st.cn && chineseCandidateData && Object.keys(chineseCandidateData).length > 0) { cb(true); return; }
        loadJson(dict_uri, (d) => { chineseCandidateData = d; st.cn = true; cb(true); },
                        (e) => { st.cnErr = e; cb(false); });
    }

    static dictError() { return st.cn ? "" : String(st.cnErr || "not loaded"); }

    // 英文联想：按词频表前缀匹配，返回完整单词
    static getEnglishCandidate(prefix) {
        if (!prefix || enWords.length === 0) return [];
        var p = prefix.toLowerCase();
        var out = [];
        for (var i = 0; i < enWords.length; i++) {
            var w = enWords[i];
            if (w.length > p.length && w.indexOf(p) === 0) {
                out.push(w);
                if (out.length >= 6) break;
            }
        }
        return out;
    }

    static keyboardTypeData = {
        english: "EN",
        pinyin: "拼音",
        number: "数字",
        symbol: "symbol"
    }

    
    static keyboardCaseData = {
        upper: "upper",
        lower: "lower",
        upperUnlock: "upperUnlock"
    }

    
    static keyboardLayoutData = {
        uppercase: "QWERTYUIOPASDFGHJKLZXCVBNM",
        uppercaseArr: [["W", "E", "R", "T", "Y", "U", "I", "O"], ["S", "D", "F", "G", "H", "J", "K"], ["X", "C", "V", "B", "N"]],
        lowercase: "qwertyuiopasdfghjklzxcvbnm",
        lowercaseArr: [["w", "e", "r", "t", "y", "u", "i", "o"], ["s", "d", "f", "g", "h", "j", "k"], ["x", "c", "v", "b", "n"]],
        symbolLabel: [{
                          value: "数字", arr: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "."]
                      }, {
                          value: "中文",
                          arr: ["？", "！", "，", "。", "、", "；", "：", "@", "#", "＄", "￥", "%", "“", "”", "‘", "’", "《", "》", "【", "】", "（", "）", "＿", "+", "-", "=", "｀", "~", "／", "［", "］", "＜", "＞", "＾", "&", "*", "｛", "｝", "｜", "·"]
                      }, {
                          value: "英文",
                          arr: ["?", "!", ",", ".", "/", "$", "@", "^", "#", "*", "(", ")", "_", "+", "-", "=", "%", "&", "~", ";", "'", "[", "]", "\\", "<", ">", "`", ":", "\"", "{", "}", "|", "·"]
                      }]
    }
}