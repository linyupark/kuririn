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
/**
 * Kuririn
 */
var Kuririn = (function () {
    /**
     * 全部可用功能
     */
    var Modules = ["error", "userinfo", "performance"];
    /**
     * 工具函数
     */
    var Utils = {
        /**
         * 对象转查询字符串
         * @param {Object} params 参数
         */
        qs: function (params) {
            if (params === void 0) { params = {}; }
            var copy = __assign({}, params);
            return Object.keys(copy)
                .map(function (k) {
                if (~Object.prototype.toString.call(copy[k]).search(/Array|Object/)) {
                    copy[k] = JSON.stringify(copy[k]);
                }
                return encodeURIComponent(k) + "=" + encodeURIComponent(copy[k]);
            })
                .join("&");
        },
        /**
         * 添加额外 history state 事件
         * @param type
         */
        resetHistory: function (type) {
            var orig = history[type];
            return function () {
                var rv = orig.apply(this, arguments);
                var e = new Event(type);
                e.arguments = arguments;
                window.dispatchEvent(e);
                return rv;
            };
        }
    };
    window.history.pushState = Utils.resetHistory("pushState");
    window.history.replaceState = Utils.resetHistory("replaceState");
    /**
     * 主类
     * @param params 初始化参数
     * @param overrideUserinfo 覆盖用户信息
     */
    var Main = /** @class */ (function () {
        /**
         * 构建初始化配置
         * @param params
         */
        function class_1(params, overrideUserinfo) {
            var _this = this;
            this.debug = false;
            /**
             * 启用功能
             */
            this.modules = ["error", "userinfo"];
            /**
             * 收集用户信息
             */
            this.userinfo = {
                url: "",
                history: [],
                title: "",
                agent: navigator.userAgent,
                platform: navigator.platform
            };
            /**
             * 上报地址
             * @param params
             */
            this.reportUrl = "http://api-s1.dynv6.net:10010/kuririn/test";
            /**
             * 注入api请求数据的回调方法
             */
            this.injectAPI = function () {
                return {};
            };
            /**
             * 匹配规则的res上报 { error_no: [334064, ...] }
             */
            this.matchAPI = {};
            this.appId = params.appId;
            this.appName = params.appName;
            if (params.debug) {
                this.debug = params.debug;
            }
            if (params.injectAPI) {
                this.injectAPI = params.injectAPI;
            }
            if (params.matchAPI) {
                this.matchAPI = params.matchAPI;
            }
            // 覆盖默认启用功能
            if (params.modules) {
                this.modules = params.modules.filter(function (mod) { return ~Modules.indexOf(mod); });
            }
            // 覆盖默认上报地址
            if (params.reportUrl) {
                this.reportUrl = params.reportUrl;
            }
            // 覆盖用户信息
            if (overrideUserinfo) {
                this.userinfo = __assign(__assign({}, this.userinfo), overrideUserinfo);
            }
            // 逻辑追踪默认开启
            this.mod_logicTracker();
            // 激活
            this.modules.map(function (mod) {
                _this["mod_" + mod].apply(_this, []);
            });
        }
        /**
         * log
         */
        class_1.prototype.func_log = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            if (!this.debug)
                return;
            console.log.apply(console, args);
        };
        /**
         * 处理全局错误
         */
        class_1.prototype.func_onError = function (event) {
            var _this = this;
            // 避免阻塞
            setTimeout(function () {
                var data = {
                    type: "js",
                    filename: event.filename,
                    lineno: event.lineno || 0,
                    colno: event.colno || 0,
                    message: event.message || "无法获取详细错误信息"
                };
                if (event.error && event.error.stack) {
                    data.message = event.error.stack.toString();
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
        class_1.prototype.func_getUserinfo = function (type) {
            // console.log("func_getUserinfo type", type);
            if (this.userinfo.url !== "") {
                if (type === "pushState") {
                    // 前进
                    this.userinfo.history.unshift(this.userinfo.url);
                }
                else if (type === "replaceState") {
                    // 重定位
                    this.userinfo.history[0] = this.userinfo.url;
                }
                else {
                    // 物理后退
                    if (this.userinfo.history[0] === document.URL) {
                        this.userinfo.history = this.userinfo.history.slice(1, 5);
                    }
                    else {
                        // 物理前进
                        this.userinfo.history.unshift(this.userinfo.url);
                    }
                }
                this.userinfo.history = this.userinfo.history.slice(0, 5);
            }
            this.userinfo.url = document.URL;
            this.userinfo.title = document.title;
            this.func_log("kuririn update userinfo:", this.userinfo);
        };
        /**
         * 当hash路由发生变化
         * @param event
         */
        // protected func_onHashchange(event) {
        //   this.func_getUserinfo(event.type);
        // }
        /**
         * 当历史记录发生变化
         * @param event
         */
        class_1.prototype.func_onPopstate = function (event) {
            this.func_getUserinfo(event.type);
        };
        /**
         * 处理上报
         * @param {Object} 上报的参数
         */
        class_1.prototype.func_report = function (params) {
            var reportData = __assign({ appId: this.appId, appName: this.appName, userinfo: this.userinfo, injectData: this.injectAPI() }, params);
            this.func_log("kuririn report:", reportData);
            var xhr = new XMLHttpRequest();
            xhr.open("POST", this.reportUrl, true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(JSON.stringify(reportData));
        };
        /**
         * 注入原生ajax请求重写参数
         */
        class_1.prototype.func_injectXHR = function () {
            var url = "";
            var method = "";
            var res = "";
            var status = "";
            var xhrOpen = window.XMLHttpRequest.prototype.open;
            var xhrSend = window.XMLHttpRequest.prototype.send;
            var injectDataQuery = Utils.qs(this.injectAPI());
            var root = this;
            window.XMLHttpRequest.prototype.open = function () {
                // 原请求数据
                url = arguments[1];
                method = arguments[0];
                // 如果是get请求需要此刻注入
                if (method.toLowerCase() === "get" &&
                    url !== root.reportUrl &&
                    injectDataQuery) {
                    url += url.indexOf("?") !== -1 ? "&" : "?";
                    url += injectDataQuery;
                    arguments[1] = url;
                }
                // console.log("kuririn override xhr.open", { url, method }, arguments);
                xhrOpen.apply(this, [].slice.call(arguments));
            };
            window.XMLHttpRequest.prototype.send = function () {
                var reportData = {
                    type: "xhr",
                    url: url,
                    method: method,
                    status: status,
                    res: res,
                    data: arguments[0] || {}
                };
                this.addEventListener("readystatechange", function () {
                    if (this.readyState === 4) {
                        reportData.res = this.response;
                        reportData.status = this.status;
                        if (this.status >= 400 && reportData.url !== root.reportUrl) {
                            // http status code 不正常的上报
                            root.func_report({
                                error: reportData
                            });
                        }
                        else {
                            try {
                                var resJSON_1 = JSON.parse(reportData.res);
                                Object.keys(root.matchAPI).map(function (field) {
                                    var values = root.matchAPI[field].map(function (v) { return String(v); });
                                    if (resJSON_1[field] &&
                                        values.indexOf(String(resJSON_1[field])) !== -1) {
                                        // 匹配规则接口上报
                                        root.func_report({
                                            error: reportData
                                        });
                                    }
                                });
                            }
                            catch (e) {
                                // 解析错误单独上报
                                reportData.res = "**\u975EJSON\u6570\u636E**: " + reportData.res;
                                root.func_report({
                                    error: reportData
                                });
                            }
                        }
                    }
                });
                this.addEventListener("error", function () {
                    // 上报
                    if (reportData.url === root.reportUrl)
                        return;
                    root.func_report({
                        error: reportData
                    });
                });
                // console.log("kuririn override xhr.send", reportData);
                xhrSend.apply(this, [].slice.call(arguments));
            };
        };
        /**
         * 模块：logicTracker
         * 逻辑追踪
         */
        class_1.prototype.mod_logicTracker = function () {
            this.func_log("kuririn: mod_logicTracker ----- on");
            this.func_injectXHR();
        };
        /**
         * 模块：error
         * 捕捉全局错误上报
         */
        class_1.prototype.mod_error = function () {
            window.addEventListener("error", this.func_onError.bind(this), false);
        };
        /**
         * 模块：userinfo
         * 获取用户相关信息
         */
        class_1.prototype.mod_userinfo = function () {
            this.func_log("kuririn: mod_userinfo ----- on");
            // if ("onhashchange" in window) {
            //   window.addEventListener(
            //     "hashchange",
            //     this.func_onHashchange.bind(this),
            //     false
            //   );
            // }
            if ("onpopstate" in window) {
                window.addEventListener("pushState", this.func_onPopstate.bind(this), false);
                window.addEventListener("replaceState", this.func_onPopstate.bind(this), false);
                window.addEventListener("popstate", this.func_onPopstate.bind(this), false);
            }
            // 第一次加载数据
            this.userinfo.agent = navigator.userAgent;
        };
        /**
         * 模块：性能
         */
        class_1.prototype.mod_performance = function () {
            this.func_log("kuririn: mod_performance ----- on");
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
        return class_1;
    }());
    return Main;
})();
