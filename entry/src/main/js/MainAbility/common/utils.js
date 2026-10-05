import app from '@system.app';
import brightness from '@system.brightness';

var SWIPE_DISTANCE = 150; //判断为返回手势的滑动距离阈值
var timeoutList = {};

export default class utils {
    
    static checkIsSwipingBack(params) {
        return params.direction === "right" && (params.distance ? (params.distance >= SWIPE_DISTANCE) : true);
    }

    
    static rotationFocus(context, name, focus) {
        if (!context) return;
        if (!context.$refs) return;
        if (!context.$refs[name]) return;
        if (!context.$refs[name].rotation) return;
        context.$refs[name].rotation({
            focus: focus
        });
    }

    
    static scrollTo(context, name, index) {
        if (!context) return;
        if (!context.$refs) return;
        if (!context.$refs[name]) return;
        if (!context.$refs[name].scrollTo) return;
        context.$refs[name].scrollTo({
            index: index
        });
    }

    
    static scrollBy(context, name, distance) {
        if (!context) return;
        if (!context.$refs) return;
        if (!context.$refs[name]) return;
        if (!context.$refs[name].scrollBy) return;
        context.$refs[name].scrollBy({
            distance: distance
        });
    }

    
    static createTimeout(name, func, time) {
        timeoutList[name] = setTimeout(func, time);
    }

    
    static deleteTimeout(name) {
        if (timeoutList[name]) {
            clearTimeout(timeoutList[name]);
            delete timeoutList[name];
        }
    }

    
    static deleteAllTimeout() {
        if (!timeoutList) return;
        for (let name in timeoutList) {
            clearTimeout(timeoutList[name]);
            delete timeoutList[name];
        }
    }

    
    static setAlwaysOn(isAlwaysOn) {
        brightness.setKeepScreenOn({
            keepScreenOn: isAlwaysOn
        });
    }

    
    static setAppSave(isAppSave) {
        app.screenOnVisible({
            visible: isAppSave
        });
    }

    
    static formatTimeStamp(ts) {
        if (ts != null && !isNaN(ts)) {
            var date = new Date(ts);
            var YY = date.getFullYear();
            var MM = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1);
            var DD = (date.getDate() < 10 ? '0' + date.getDate() : date.getDate());
            var hh = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours());
            var mm = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
            var ss = (date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds());
            return YY + '/' + MM + '/' + DD + ' ' + hh + ':' + mm + ':' + ss;
        } else {
            return "\u672A\u77E5\u65F6\u95F4";
        }
    }

    
    static formatSize(size) {
        let value = Number(size);
        if (size && !isNaN(value)) {
            const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'BB'];
            let index = 0;
            let k = value;
            if (value >= 1024) {
                while (k > 1024) {
                    k = k / 1024;
                    index++;
                }
            }
            return `${(k).toFixed(2)}${units[index]}`;
        }
        return '0B';
    }

    
    static isNewDevice() {
        return !!app.setSwipeToDismiss;
    }

    
    static stopPropagation(event) {
        //停止事件冒泡的一系列操作
        if (event.stopPropagation) event.stopPropagation();
        if (event.StopPropagation) event.StopPropagation();
    }

    
    static nullObjectData(object) {
        for (let name in object) {
            object[name] = null;
        }
    }
}