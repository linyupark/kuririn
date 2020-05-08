## 地表最强(简化)前端业务跟踪错误上报注入
----
### Changelog
 * 2020-5-8 初版，+mod_performance +mod_logicTracker +mod_error +mod_userinfo 目前实现4个模块


### API

new Kuririn(options: IConstructor, overrideUserinfo: IUserinfo)

```ts
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
}

```

### 调用范例

```html
<script src="http://api-s1.dynv6.net:9001/images/temp/kuririn.min.js?v=1.0.0"></script>
<script>
  new Kuririn({
    appId: 'shop-hapc',
    appName: '华安积分商城',
    injectAPI: function() {
      const user_info = JSON.parse(sessionStorage.getItem('user_info') || '{}')
      return user_info.regcust_id ? { regcust_id: user_info.regcust_id } : {}
    },
    matchAPI: { error_no: [334064] },
    debug: true
  })
</script>
```