var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var Kuririn = {
    /**
   * 全部可用功能
   */
    Modules: ['error', 'userinfo', 'performance'],
    Utils: {
        /**
         * 工具函数: 对象转查询字符串
         * @param {Object} params 参数
         */
        qs: function (params) {
            if (params === void 0) { params = {}; }
            return Object.keys(params)
                .map(function (k) {
                if (~Object.prototype.toString.call(params[k]).search(/Array|Object/)) {
                    params[k] = JSON.stringify(params[k]);
                }
                return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
            })
                .join('&');
        }
    }
};
/**
 * 地表最强(简化)前端业务跟踪错误上报注入脚本
 */
var KuririnClass = /** @class */ (function () {
    /**
     * 构建初始化配置
     * @param params
     */
    function KuririnClass(params, overrideUserinfo) {
        var _this = this;
        /**
         * 启用功能
         */
        this.modules = Kuririn.Modules;
        /**
         * 收集用户信息
         */
        this.userinfo = {
            agent: navigator.userAgent,
            platform: navigator.platform
        };
        /**
         * 上报地址
         * @param params
         */
        this.reportUrl = 'http://api-s1.dynv6.net:10010/kuririn/test';
        /**
         * 注入api请求数据的回调方法
         */
        this.injectAPI = function () {
            return {};
        };
        this.appId = params.appId;
        this.appName = params.appName;
        if (params.injectAPI) {
            this.injectAPI = params.injectAPI;
        }
        // 覆盖默认启用功能
        if (params.modules) {
            this.modules = params.modules.filter(function (mod) { return ~Kuririn.Modules.indexOf(mod); });
        }
        // 覆盖默认上报地址
        if (params.reportUrl) {
            this.reportUrl = params.reportUrl;
        }
        // 覆盖用户信息
        if (overrideUserinfo) {
            this.userinfo = __assign(__assign({}, this.userinfo), overrideUserinfo);
        }
        // 激活
        this.modules.map(function (mod) {
            _this["mod_" + mod].apply(_this, []);
        });
        // 逻辑追踪默认开启
        this.mod_logicTracker();
    }
    /**
     * 处理全局错误
     * @param {String}  msg         错误信息
     * @param {String}  scripturl   出错脚本的url
     * @param {Long}    line        错误行号
     * @param {Long}    col         错误列号
     * @param {Object}  error       错误的详细信息
     */
    KuririnClass.prototype.func_onError = function (msg, scripturl, line, col, error) {
        var _this = this;
        // 跨域脚本的错误，捕获的结果是 Script error.
        if (msg === 'Script error.') {
            return false;
        }
        // 避免阻塞
        setTimeout(function () {
            var data = {
                type: 'js',
                scripturl: scripturl,
                line: line,
                col: col || 'unknow',
                msg: '无法获取详细错误信息'
            };
            if (!!error && !!error.stack) {
                data.msg = error.stack.toString();
            }
            // 上报
            _this.func_report({
                error: data
            });
        }, 0);
        return false;
    };
    /**
     * 获取用户当前基本信息
     */
    KuririnClass.prototype.func_getUserinfo = function () {
        this.userinfo.url = document.URL;
        this.userinfo.title = document.title;
    };
    /**
     * 当hash路由发生变化
     * @param event
     */
    KuririnClass.prototype.func_onHashchange = function (event) {
        this.func_getUserinfo();
    };
    /**
     * 当历史记录发生变化
     * @param event
     */
    KuririnClass.prototype.func_onPopstate = function (event) {
        if (event.state) {
            this.func_getUserinfo();
        }
    };
    /**
     * 处理上报
     * @param {Object} 上报的参数
     */
    KuririnClass.prototype.func_report = function (params) {
        var data = Kuririn.Utils.qs(__assign({ appId: this.appId, appName: this.appName, userinfo: this.userinfo }, params));
        var xhr = new XMLHttpRequest();
        xhr.open('POST', this.reportUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(data);
    };
    /**
     * 注入原生ajax请求重写参数
     */
    KuririnClass.prototype.func_injectXHR = function () {
        var url = '';
        var method = '';
        var res = '';
        var status = '';
        var xhrOpen = window.XMLHttpRequest.prototype.open;
        var xhrSend = window.XMLHttpRequest.prototype.send;
        var injectData = this.injectAPI();
        var root = this;
        window.XMLHttpRequest.prototype.open = function () {
            // 原请求数据
            url = arguments[1];
            method = arguments[0];
            // 如果是get请求需要此刻注入
            if (method.toLowerCase() === 'get') {
                var injectDataQuery = Kuririn.Utils.qs(injectData);
                url += url.indexOf('?') !== -1 ? '&' : '?';
                url += injectDataQuery;
            }
            xhrOpen.apply(this, [].slice.call(arguments));
        };
        window.XMLHttpRequest.prototype.send = function () {
            var reportData = {
                type: 'xhr',
                url: url,
                method: method,
                data: arguments[0] || {},
                status: status,
                res: res
            };
            this.addEventListener('readystatechange', function () {
                if (this.readyState === 4) {
                    // 此处可以取得一些响应信息
                    // 响应信息
                    res = this.response;
                    status = this.status;
                    if (this.status >= 400) {
                        // 上报
                        root.func_report({
                            error: reportData
                        });
                    }
                }
            });
            this.addEventListener('error', function () {
                // 上报
                root.func_report({
                    error: reportData
                });
            });
            xhrSend.apply(this, [].slice.call(arguments));
        };
    };
    /**
     * 模块：logicTracker
     * 逻辑追踪
     */
    KuririnClass.prototype.mod_logicTracker = function () {
        this.func_injectXHR();
    };
    /**
     * 模块：error
     * 捕捉全局错误上报
     */
    KuririnClass.prototype.mod_error = function () {
        window.addEventListener('error', this.func_onError.bind(this), false);
    };
    /**
     * 模块：userinfo
     * 获取用户相关信息
     */
    KuririnClass.prototype.mod_userinfo = function () {
        if ('onhashchange' in window) {
            window.addEventListener('hashchange', this.func_onHashchange.bind(this), false);
        }
        if ('onpopstate' in window) {
            window.addEventListener('popstate', this.func_onPopstate.bind(this), false);
        }
        // 第一次加载数据
        this.func_getUserinfo();
        this.userinfo.agent = navigator.userAgent;
    };
    /**
     * 模块：性能
     */
    KuririnClass.prototype.mod_performance = function () {
        var timing = performance.timing, start = timing.navigationStart, dnsTime = 0, tcpTime = 0, firstPaintTime = 0, domRenderTime = 0, loadTime = 0;
        dnsTime = timing.domainLookupEnd - timing.domainLookupStart;
        tcpTime = timing.connectEnd - timing.connectStart;
        firstPaintTime = timing.responseStart - start;
        domRenderTime = timing.domContentLoadedEventEnd - start;
        loadTime = timing.loadEventEnd - start;
        // 上报
        this.func_report({
            performance: {
                dnsTime: dnsTime,
                tcpTime: tcpTime,
                firstPaintTime: firstPaintTime,
                domRenderTime: domRenderTime,
                loadTime: loadTime
            }
        });
    };
    return KuririnClass;
}());
