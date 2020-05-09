// 创建参数
interface IConstructor {
  appId: string | number; // 项目ID
  appName: string; // 项目名
  injectAPI?: Function; // 注入api请求数据的回调方法，比如获取session cookie中的userid
  matchAPI?: object; // 200 status 接口中需要匹配上报的api（eg: { error_no: [334064, ...] })
  modules?: string[]; // 激活功能，不设定则全部激活
  reportUrl?: string; // 上报接口地址
  debug?: boolean; // 开启打印日志
}

// 用户信息接口
interface IUserinfo {
  url?: string; // 当前地址
  history?: string[]; // 历史访问地址保存最近5条
  title?: string; // 页面标题
  agent?: string; // useragent
  platform?: string; // 设备平台
  [propName: string]: any; // 额外自定义数据
}

type TModule = "error" | "userinfo" | "performance" | "action";