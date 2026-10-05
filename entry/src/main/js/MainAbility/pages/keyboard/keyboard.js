import utils from '../../common/utils';
import router from '../../common/router';
import storage from '@system.storage';
import vibrator from '@system.vibrator';
import common from '../../common/common';
import inputMethod from '../../common/inputMethod';


let timeInterval
let toastTimeout = null;

export default {
    data: {
        timeString: "",
        search_type: '',
        isShowSearchTips: false,
        RounderBackgroundValue: {
            candidateBackground: "transparent",
            candidateRadius: 0,
            searchBackground: "transparent",
            searchRadius: 0,
            background: "transparent",
            radius: 0
        },
        toast: {
            show: false,
            width: 0,
            left: 0,
            text: ""
        },
        typeData: "",
        bootErr: "",
        
        kbRow1: [],
        kbRow2: [],
        kbRow3: [],
        inputMethod: {
            chineseCandidateWord: "",
            keyboardType: "",
            keyboardCase: "",
            keyboardLayoutData: "",
            keyboardLayoutDataArr: [],
            candidateArr: [],
            menuType: "back",
            show: {
                keyboard: true,
                candidate: false
            }
        }
    },
    onInit() {
        try {
            this.bootInit();
        } catch (e) {
            this.bootErr = '\u542F\u52A8\u5931\u8D25: ' + String((e && e.message) || e);
        }
    },
    bootInit() {
        var K = inputMethod.keyboardLayoutData;
        var im = this.inputMethod;
        im.keyboardType = inputMethod.keyboardTypeData.english;
        im.keyboardCase = inputMethod.keyboardCaseData.lower;
        im.keyboardLayoutData = K.lowercase;
        im.keyboardLayoutDataArr = K.lowercaseArr;
        im.candidateArr = [];
        im.menuType = "back";
        im.show = { keyboard: true, candidate: false };
        this.kbRow1 = K.lowercase.split("").slice(0, 10);
        this.kbRow2 = K.lowercase.split("").slice(10, 19);
        this.kbRow3 = K.lowercase.split("").slice(19, 26);
        if (!this.kbRow1.length) {
            this.bootErr = "\u952E\u76D8\u5E03\u5C40\u4E3A\u7A7A typeof=" + typeof K;
        }
        this.getTime();
        this.getBackgroundSettings();
        common.clean();
        let that = this;
        storage.get({
            key: 'default_dict',
            default: 'a',
            success: function (data) {
                that.search_type = data
            }
        });
        $app.getData(data => {
            if (data.searchType) {
                this.inputMethod.keyboardType = data.searchType === 'chinese' ? inputMethod.keyboardTypeData.pinyin : inputMethod.keyboardTypeData.english;
            }
            $app.cleanData();
        });
        
        this.getSearchText();
    },
    getTime() {
        var getTime = () => {
            var date = new Date();
            var hh = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours());
            var mm = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
            let timeString = hh + ':' + mm;
            if (this.timeString != timeString) this.timeString = timeString;
        }
        timeInterval = setInterval(getTime, 1000);
        getTime();
    },
    getBackgroundSettings() {
        storage.get({
            key: 'RounderBackground',
            default: '1',
            success: (data) => {
                if (data == '1') {
                    this.RounderBackgroundValue.candidateBackground = "rgb(29,30,34)";
                    this.RounderBackgroundValue.candidateRadius = 18;
                    this.RounderBackgroundValue.searchBackground = "rgb(31,113,255)";
                    this.RounderBackgroundValue.searchRadius = 18;
                    this.RounderBackgroundValue.background = "rgb(36,36,36)";
                    this.RounderBackgroundValue.radius = 18;
                }
            }
        });
    },
    getSearchText() {
        let that = this;
        storage.get({
            key: that.getUserSearchType(),
            default: '',
            success: function (data) {
                that.typeData = data
            },
            fail: function () {
                that.typeData = ''
            }
        });
    },
    
    doNotSwipe(e) {
        utils.stopPropagation(e);
        return;
    },
    
    switchInputMethodType() {
        this.saveKeyboardWord();
        this.inputMethod.candidateArr = [];
        this.typeData = "";
        this.inputMethod.menuType = "back"
        //看着这么长一坨, 实际功能实现很简单, 不做注释咯
        if (this.inputMethod.keyboardType === inputMethod.keyboardTypeData.english) {
            this.inputMethod.keyboardType = inputMethod.keyboardTypeData.pinyin;
        } else if (this.inputMethod.keyboardType === inputMethod.keyboardTypeData.pinyin) {
            this.inputMethod.keyboardType = inputMethod.keyboardTypeData.english;
        }
        this.getSearchText();
    },
    
    keyboardReplaceCandidate() {
        if (this.inputMethod.keyboardType !== inputMethod.keyboardTypeData.english && this.inputMethod.candidateArr.length !== 0) {
            this.inputMethod.show.keyboard = false;
            this.inputMethod.show.candidate = true;
            utils.rotationFocus(this, "candidate", false);
            utils.rotationFocus(this, "list", true);
        } else {
            router.back()
        }
    },
    
    candidateSwipe(e) {
        if (utils.checkIsSwipingBack(e)) this.keyboardBackMain();
    },
    
    keyboardBackMain() {
        utils.rotationFocus(this, "list", false);
        utils.rotationFocus(this, "candidate", true);
        this.inputMethod.show.candidate = false;
        this.inputMethod.show.keyboard = true;
        utils.scrollTo(this, "list", 0);
    },
    
    addLetter(text) {
        if (this.inputMethod.keyboardType === inputMethod.keyboardTypeData.pinyin) {
            //如果输入法在拼音界面, 添加到候选词输入内容里而非便条输入内容里
            this.inputMethod.chineseCandidateWord += text;
            this.getKeyboardPinyinCandidateData(this.inputMethod.chineseCandidateWord);
            return;
        }
        this.typeData += text;
    },
    
    addCandidate(text) {
        if (text === "" || text === null) return; //不添加空内容
        this.typeData += text;
        if (this.inputMethod.show.candidate) {
            //用户输入候选词时应退出候选词界面回键盘界面
            this.keyboardBackMain();
        }
        if (this.inputMethod.keyboardType === inputMethod.keyboardTypeData.pinyin) {
            //拼音输入法用户输入候选词后应该清空之前候选词带来的所有数据
            this.inputMethod.chineseCandidateWord = "";
            this.inputMethod.candidateArr = [];
            this.inputMethod.menuType = "back"
        }
    },
    
    getKeyboardPinyinCandidateData(pinyin) {
        this.inputMethod.candidateArr = inputMethod.getChineseCandidate(pinyin);
        if (this.inputMethod.candidateArr.length !== 0) {
            this.inputMethod.menuType = "expand"
            utils.scrollTo(this, "candidate", 0);
            utils.scrollTo(this, "list", 0);
        } else {
            this.inputMethod.menuType = "back"
        }
    },
    
    deleteLetter() {
        if (this.inputMethod.keyboardType === inputMethod.keyboardTypeData.pinyin && this.inputMethod.chineseCandidateWord.length !== 0) {
            //如果输入法在拼音界面并且候选词输入内容不为空, 删除候选词输入内容而非便条内容
            this.inputMethod.chineseCandidateWord = this.inputMethod.chineseCandidateWord.substring(0, this.inputMethod.chineseCandidateWord.length - 1);
            this.getKeyboardPinyinCandidateData(this.inputMethod.chineseCandidateWord);
            return;
        }
        //用substring截取舍弃最后一位数据, 实现删除功能
        //删除前先看看最后一位字符是不是双码点字符，如果是的话得删两个字节 因为jerryscript未更新到es6
        var deleteCount = 0;
        var charCode = this.typeData.charCodeAt(this.typeData.length - 2);
        if (charCode >= 0xD800 && charCode <= 0xDBFF) {
            deleteCount = 2;
        } else {
            deleteCount = 1;
        }
        this.typeData = this.typeData.substring(0, this.typeData.length - deleteCount);
    },
    
    deleteAllLetter() {
        //震动提醒用户全部删除
        if (this.inputMethod.keyboardType === inputMethod.keyboardTypeData.pinyin && this.inputMethod.chineseCandidateWord.length !== 0) {
            //如果输入法在拼音界面并且候选词输入内容不为空, 删除候选词输入内容而非便条内容
            this.inputMethod.chineseCandidateWord = "";
            this.getKeyboardPinyinCandidateData(this.inputMethod.chineseCandidateWord);
            return;
        }
        this.typeData = "";
    },
    getLeftStr(text) {
        return { str: text };
    },
    handleSeeTips() {
        storage.set({
            key: 'isShowSearchTips',
            value: "0"
        });
        this.isShowSearchTips = false;
    },
    handleTipsClick(e) {
        utils.stopPropagation(e);
    },
    saveKeyboardWord() {
        let that = this;
        storage.get({
            key: 'SaveKeyboardWord',
            default: '1',
            success: function (data) {
                if (data == '1') {
                    storage.set({
                        key: that.getUserSearchType(),
                        value: that.typeData
                    });
                }
            }
        });
    },
    onShow() {
        if (this.$refs && this.$refs.candidate && this.$refs.candidate.rotation) {
            this.$refs.candidate.rotation();
        }
    },
    onHide() {
        if (this.$refs && this.$refs.candidate && this.$refs.candidate.rotation) {
            this.$refs.candidate.rotation({
                focus: false
            });
        }
    },
    onBackPress() {
        router.back();
        return true;
    },
    onDestroy() {
        clearInterval(timeInterval);
        this.saveKeyboardWord();
    },
    handleReplaceSearchSettings() {
        this.showToast('\u6682\u65e0\u8bbe\u7f6e', 240, 1500);
    },
    search() {
        if (this.toast.show == true) return;
        if (this.typeData == '') {
            this.showToast('\u5185\u5bb9\u4e0d\u53ef\u4e3a\u7a7a', 320, 2000);
            return;
        }
        // 回写草稿到 $app 参数仓，再返回上一页（edit 页 onShow 用 common.getParams 接收）
        let text = this.typeData;
        common.writeMultiParams({ kbText: text, kbKind: this.getUserSearchType() }, () => {
            router.back();
        });
    },
    getUserSearchType() {
        return this.inputMethod.keyboardType === inputMethod.keyboardTypeData.pinyin ? 'chinese' : 'english';
    },
    onswipe(e) {
        if (e.direction == "right" || e.distance >= 150) {
            router.back()
        }
    },
    showToast(text, width, time) {
        clearTimeout(toastTimeout);
        this.toast.text = text;
        this.toast.width = width;
        this.toast.left = (408 - this.toast.width) / 2;
        this.toast.show = true;
        toastTimeout = setTimeout(() => {
            this.toast.show = false;
            clearTimeout(toastTimeout);
        }, time);
    },
}
