import file from '@system.file';

export default class common {

    
    static addMultiParams(paramsObj, callback=undefined) {
        $app.addAllParams(paramsObj);
        if (callback) callback();
    }

    
    static writeMultiParams(paramsObj, callback=undefined) {
        this.clean();
        this.addMultiParams(paramsObj, callback);
    }

    
    static getParams(context, callback=undefined) {
        $app.getAllParams((params) => {
            for (let name in params) {
                context[name] = params[name];
            }
            if (callback) callback();
        })
    }

    
    static clean() {
        $app.cleanAllParams();
    }
}