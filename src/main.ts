/// <reference path="main.d.ts" />

import qs from './utils/qs'
import resetHistory from './utils/resetHistory'

import handleWinError from './funcs/handleWinError'
import updateUserinfo from './funcs/updateUserinfo'
import updatePerformance from './funcs/updatePerformance'

/**
 * 全部可用功能
 */
const Modules: TModule[] = ['error', 'userinfo', 'performance']

/**
 * 工具函数
 */
const Utils = { qs, resetHistory }

/**
 * 主类
 * @param params 初始化参数
 * @param overrideUserinfo 覆盖用户信息
 */
const Main = class {
  debug: boolean = false

  /**
   * 项目识别
   */
  appId: string | number
  appName: string

  /**
   * 启用功能
   */
  modules: TModule[] = ['error', 'userinfo']

  /**
   * 收集用户信息
   */
  userinfo: IUserinfo = {
    url: '',
    history: [],
    title: '',
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
   * 匹配规则的res上报 { error_no: [334064, ...] }
   */
  matchAPI: object = {}

  /**
   * 构建初始化配置
   * @param params
   */
  constructor(params: IConstructor, overrideUserinfo?: IUserinfo) {
    this.appId = params.appId
    this.appName = params.appName

    if (params.debug) {
      this.debug = params.debug
    }

    if (params.injectAPI) {
      this.injectAPI = params.injectAPI
    }

    if (params.matchAPI) {
      this.matchAPI = params.matchAPI
    }

    // 覆盖默认启用功能
    if (params.modules) {
      this.modules = params.modules.filter(
        (mod: any) => ~Modules.indexOf(mod),
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

    // 逻辑追踪默认开启
    this.mod_logicTracker()

    // 激活
    this.modules.map((mod) => {
      this[`mod_${mod}`].apply(this, [])
    })
  }

  /**
   * log
   */
  protected func_log(...args) {
    if (!this.debug) return
    console.log(...args)
  }

  /**
   * 处理全局错误
   */
  protected func_onError(event: ErrorEvent) {
    handleWinError(event).then(data => this.func_report(data))
    return false
  }

  /**
   * 当历史记录发生变化
   * @param event
   */
  protected func_onPopstate(event) {
    this.userinfo = updateUserinfo(event.type, this.userinfo)
  }

  /**
   * 处理上报
   * @param {Object} 上报的参数
   */
  protected func_report(params) {
    const reportData = {
      appId: this.appId,
      appName: this.appName,
      userinfo: this.userinfo,
      injectData: this.injectAPI(),
      ...params,
    }
    this.func_log('kuririn report:', reportData)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', this.reportUrl, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send(JSON.stringify(reportData))
  }

  /**
   * 注入原生ajax请求重写参数
   */
  protected func_injectXHR() {
    let url = ''
    let method = ''
    let res = ''
    let status = ''
    const xhrOpen = window.XMLHttpRequest.prototype.open
    const xhrSend = window.XMLHttpRequest.prototype.send
    const injectDataQuery = Utils.qs(this.injectAPI())
    const root = this
    window.XMLHttpRequest.prototype.open = function () {
      // 原请求数据
      url = arguments[1]
      method = arguments[0]

      // 如果是get请求需要此刻注入
      if (
        method.toLowerCase() === 'get' &&
        url !== root.reportUrl &&
        injectDataQuery
      ) {
        url += url.indexOf('?') !== -1 ? '&' : '?'
        url += injectDataQuery
        arguments[1] = url
      }
      // console.log("kuririn override xhr.open", { url, method }, arguments);
      xhrOpen.apply(this, [].slice.call(arguments))
    }
    window.XMLHttpRequest.prototype.send = function () {
      let reportData = {
        url,
        method,
        status,
        res,
        data: arguments[0] || {},
      }
      this.addEventListener('readystatechange', function () {
        if (this.readyState === 4) {
          reportData.res = this.response
          reportData.status = this.status
          if (this.status >= 400 && reportData.url !== root.reportUrl) {
            // http status code 不正常的上报
            root.func_report({
              type: 'ERROR_XHR_STATUS',
              error: reportData,
            })
          } else {
            try {
              const resJSON = JSON.parse(reportData.res)
              Object.keys(root.matchAPI).map((field) => {
                const values = root.matchAPI[field].map((v) => String(v))
                const fieldValueStr = String(resJSON[field])
                if (
                  resJSON[field] &&
                  values.indexOf(fieldValueStr) !== -1
                ) {
                  // 匹配规则接口上报
                  root.func_report({
                    type: `ERROR_XHR_${field.toUpperCase()}_${fieldValueStr.toUpperCase()}`,
                    error: reportData,
                  })
                }
              })
            } catch (e) {
              // 解析错误单独上报
              reportData.res = `**非JSON数据**: ${reportData.res}`
              root.func_report({
                type: 'ERROR_XHR_RESPONSE_PARSE',
                error: reportData,
              })
            }
          }
        }
      })
      this.addEventListener('error', function () {
        // 上报
        if (reportData.url === root.reportUrl) return
        root.func_report({
          error: reportData,
        })
      })
      // console.log("kuririn override xhr.send", reportData);
      xhrSend.apply(this, [].slice.call(arguments))
    }
  }

  /**
   * 模块：logicTracker
   * 逻辑追踪
   */
  mod_logicTracker() {
    this.func_log('kuririn: mod_logicTracker ----- on')
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
    this.func_log('kuririn: mod_userinfo ----- on')

    // 基础用户数据
    this.userinfo.agent = navigator.userAgent

    if (false === 'onpopstate' in window) return
    window.history.pushState = Utils.resetHistory('pushState')
    window.history.replaceState = Utils.resetHistory('replaceState')
    window.addEventListener(
      'pushState',
      this.func_onPopstate.bind(this),
      false,
    )
    window.addEventListener(
      'replaceState',
      this.func_onPopstate.bind(this),
      false,
    )
    window.addEventListener(
      'popstate',
      this.func_onPopstate.bind(this),
      false,
    )

  }

  /**
   * 模块：性能
   */
  mod_performance() {
    this.func_log('kuririn: mod_performance ----- on')

    // 上报
    this.func_report({
      type: 'PERFORMANCE',
      performance: updatePerformance(),
    })
  }
}

export default Main
