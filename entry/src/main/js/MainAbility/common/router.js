import * as system_router from '@system.router';

let current_uri = ""
let pages_array = []
try {
   var globalApp = $app;
} catch (e) {
   globalApp = undefined;
}

globalApp.getCurrentUri((uri) => {
   current_uri = uri;
});

globalApp.getRouterUriList((pages) => {
   pages_array = pages;
});

export default class router {
   
   static replace(obj) {
      if (globalApp && globalApp.onPageChange) globalApp.onPageChange(obj.uri);
      system_router.default.replace(obj);
   }

   
   static push(obj) {
      pages_array.push(current_uri);
      globalApp.writeRouterUriList(pages_array);
      system_router.default.replace(obj);
      if (globalApp && globalApp.onPageChange) globalApp.onPageChange(obj.uri);
   }

   
   static back(obj) {
      let uri = pages_array.pop();
      if (!uri) uri = "pages/index/index";   // 栈空或首项为空串 → 回首页，避免 replace({uri:''}) 静默失败
      globalApp.writeRouterUriList(pages_array);
      if (obj == undefined) {
         system_router.default.replace({
            uri: uri
         })
      } else {
         system_router.default.replace({
            uri: uri,
            params: obj.params
         })
      }
      if (globalApp && globalApp.onPageChange) globalApp.onPageChange(uri);
   }

   
   
   static getParams() {
      try { return system_router.default.getParams(); } catch (e) { return null; }
   }

   static getLastUri() {
      return pages_array[pages_array.length-1]
   }

   
   static getCurrentUri() {
      return current_uri
   }
}