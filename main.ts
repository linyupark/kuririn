// 创建参数
interface IConstructor {
  appId: string | number // 项目ID
  appName: string // 项目名
  injectAPI?: Function // 注入api请求数据的回调方法，比如获取session cookie中的userid
  modules?: string[] // 激活功能，不设定则全部激活
  reportUrl?: string // 上报接口地址
}

// 用户信息接口
interface IUserinfo {
  url?: string // 当前地址
  title?: string // 页面标题
  agent?: string // useragent
  platform?: string // 设备平台
}

type TModule = 'error' | 'userinfo' | 'performance'

const Kuririn = {
  /**
 * 全部可用功能
 */
  Modules: ['error', 'userinfo', 'performance'] as TModule[],
  Utils: {
    /**
     * 工具函数: 对象转查询字符串
     * @param {Object} params 参数
     */
    qs(params = {}) {
      return Object.keys(params)
        .map((k) => {
          if (~Object.prototype.toString.call(params[k]).search(/Array|Object/)) {
            params[k] = JSON.stringify(params[k])
          }
          return `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`
        })
        .join('&')
    }
  }
}

/**
 * 地表最强(简化)前端业务跟踪错误上报注入脚本
 */
class KuririnClass {
  /**
   * 项目识别
   */
  appId: string | number
  appName: string

  /**
   * 启用功能
   */
  modules: TModule[] = Kuririn.Modules

  /**
   * 收集用户信息
   */
  userinfo: IUserinfo = {
    agent: navigator.userAgent,
    platform: navigator.platform,
  }

  /**
   * 上报地址
   * @param params
   */
  reportUrl: string = 'http://api-s1.dynv6.net:10010/kuririn/test'

  /**
   * 注入api请求数据的回调方法
   */
  injectAPI: Function = function () {
    return {}
  }

  /**
   * 构建初始化配置
   * @param params
   */
  constructor(params: IConstructor, overrideUserinfo?: IUserinfo) {
    this.appId = params.appId
    this.appName = params.appName

    if (params.injectAPI) {
      this.injectAPI = params.injectAPI
    }

    // 覆盖默认启用功能
    if (params.modules) {
      this.modules = params.modules.filter(
        (mod: any) => ~Kuririn.Modules.indexOf(mod),
      ) as TModule[]
    }

    // 覆盖默认上报地址
    if (params.reportUrl) {
      this.reportUrl = params.reportUrl
    }

    // 覆盖用户信息
    if (overrideUserinfo) {
      this.userinfo = {
        ...this.userinfo,
        ...overrideUserinfo,
      }
    }

    // 激活
    this.modules.map((mod) => {
      this[`mod_${mod}`].apply(this, [])
    })

    // 逻辑追踪默认开启
    this.mod_logicTracker()
  }

  /**
   * 处理全局错误
   * @param {String}  msg         错误信息
   * @param {String}  scripturl   出错脚本的url
   * @param {Long}    line        错误行号
   * @param {Long}    col         错误列号
   * @param {Object}  error       错误的详细信息
   */
  protected func_onError(msg, scripturl, line, col, error) {
    // 跨域脚本的错误，捕获的结果是 Script error.
    if (msg === 'Script error.') {
      return false
    }

    // 避免阻塞
    setTimeout(() => {
      let data = {
        type: 'js',
        scripturl,
        line,
        col: col || 'unknow',
        msg: '无法获取详细错误信息',
      }
      if (!!error && !!error.stack) {
        data.msg = error.stack.toString()
      }
      // 上报
      this.func_report({
        error: data,
      })
    }, 0)

    return false
  }

  /**
   * 获取用户当前基本信息
   */
  protected func_getUserinfo() {
    this.userinfo.url = document.URL
    this.userinfo.title = document.title
  }

  /**
   * 当hash路由发生变化
   * @param event
   */
  protected func_onHashchange(event) {
    this.func_getUserinfo()
  }

  /**
   * 当历史记录发生变化
   * @param event
   */
  protected func_onPopstate(event) {
    if (event.state) {
      this.func_getUserinfo()
    }
  }

  /**
   * 处理上报
   * @param {Object} 上报的参数
   */
  protected func_report(params) {
    const data = Kuririn.Utils.qs({
      appId: this.appId,
      appName: this.appName,
      userinfo: this.userinfo,
      ...params,
    })
    const xhr = new XMLHttpRequest()
    xhr.open('POST', this.reportUrl, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send(data)
  }

  /**
   * 注入原生ajax请求重写参数
   */
  protected func_injectXHR() {
    let url = ''
    let method = ''
    let res = ''
    let status = ''
    let xhrOpen = window.XMLHttpRequest.prototype.open
    let xhrSend = window.XMLHttpRequest.prototype.send
    let injectData = this.injectAPI()
    const root = this
    window.XMLHttpRequest.prototype.open = function () {
      // 原请求数据
      url = arguments[1]
      method = arguments[0]
      // 如果是get请求需要此刻注入
      if (method.toLowerCase() === 'get') {
        const injectDataQuery = Kuririn.Utils.qs(injectData)
        url += url.indexOf('?') !== -1 ? '&' : '?'
        url += injectDataQuery
      }
      xhrOpen.apply(this, [].slice.call(arguments))
    }
    window.XMLHttpRequest.prototype.send = function () {
      let reportData = {
        type: 'xhr',
        url,
        method,
        data: arguments[0] || {},
        status,
        res,
      }
      this.addEventListener('readystatechange', function () {
        if (this.readyState === 4) {
          // 此处可以取得一些响应信息
          // 响应信息
          res = this.response
          status = this.status
          if (this.status >= 400) {
            // 上报
            root.func_report({
              error: reportData,
            })
          }
        }
      })
      this.addEventListener('error', function () {
        // 上报
        root.func_report({
          error: reportData,
        })
      })
      xhrSend.apply(this, [].slice.call(arguments))
    }
  }

  /**
   * 模块：logicTracker
   * 逻辑追踪
   */
  mod_logicTracker() {
    this.func_injectXHR()
  }

  /**
   * 模块：error
   * 捕捉全局错误上报
   */
  mod_error() {
    window.addEventListener('error', this.func_onError.bind(this), false)
  }

  /**
   * 模块：userinfo
   * 获取用户相关信息
   */
  mod_userinfo() {
    if ('onhashchange' in window) {
      window.addEventListener(
        'hashchange',
        this.func_onHashchange.bind(this),
        false,
      )
    }
    if ('onpopstate' in window) {
      window.addEventListener(
        'popstate',
        this.func_onPopstate.bind(this),
        false,
      )
    }
    // 第一次加载数据
    this.func_getUserinfo()
    this.userinfo.agent = navigator.userAgent
  }

  /**
   * 模块：性能
   */
  mod_performance() {
    let timing = performance.timing,
      start = timing.navigationStart,
      dnsTime = 0,
      tcpTime = 0,
      firstPaintTime = 0,
      domRenderTime = 0,
      loadTime = 0

    dnsTime = timing.domainLookupEnd - timing.domainLookupStart
    tcpTime = timing.connectEnd - timing.connectStart
    firstPaintTime = timing.responseStart - start
    domRenderTime = timing.domContentLoadedEventEnd - start
    loadTime = timing.loadEventEnd - start
    // 上报
    this.func_report({
      performance: {
        dnsTime,
        tcpTime,
        firstPaintTime,
        domRenderTime,
        loadTime,
      },
    })
  }
}
