## 地表最强(简化)前端业务跟踪错误上报注入
----
### Changelog
 * 2020-5-9 参考国金参数，路由更改后扫描页面元素上报自定义动作、事件
 * 2020-5-8 初版，+mod_performance +mod_logicTracker +mod_error +mod_userinfo 目前实现4个模块

----

### 模块说明

#### `mod_actionEvent` 

行为事件，当路由变化后扫描元素属性 
 * krin-eid （事件id）
 * krin-ename （事件名称）

```html
<!-- 举例一个下载链接点击的上报 -->
<a href='下载' krin-eid='503021' krin-ename='download'>下载App</a>
```

```js
// 举例点击后会上报的数据结构
{
  type: 'action',
  event: {
    id: '503021',
    name: 'download'
  }，
  // 其他 userinfo 等其他模块数据
}
```

#### `mod_error` 

捕获全局js错误，并尽可能将错误相关信息上报

```js
{
  type: 'error',
  reason: 'js file',
  error: {
    filename, // 出错文件或页面地址
    lineno, // 第几行，捕捉不到则显示0
    colno, // 第几列
    message, // 出错消息
    // ... 未来可继续添加
  },
  // 其他模块数据
}
```

#### `mod_mod_logicTracker` 

默认开启，设定需要捕获的本地数据粘附到每个api请求链接地址中

通过设置 injectAPI配置的函数回调来获取数据，
比如在用户登录后获取session中的user_id数据粘附到每次ajax请求中

```js
injectAPI: function() {
  return sessionStorage.getItem('user_id')
}
```


#### `mod_userinfo` 用户设备数据

每当页面历史记录发生变化（包括载入跟hash变动）会生成一份用户设备相关的数据，在每次上报的时候带入

#### `mod_performance` 性能指标（可选，待完善）

可选择在首次进入或切换页面生成一份页面渲染以及网络相关的性能数据上报

----

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
<script src="https://cdn.jsdelivr.net/npm/@lpjs/kuririn/dist/kuririn.min.js"></script>
<script>
  new Kuririn({
    appId: 'shop-hapc',
    appName: '华安积分商城',
    injectAPI: function() {
      const user_info = JSON.parse(sessionStorage.getItem('user_info') || '{}')
      return user_info.regcust_id
    },
    matchAPI: { error_no: [334064] },
    debug: true
  })
</script>
```

#### CDN

https://cdn.jsdelivr.net/npm/@lpjs/kuririn/dist/kuririn.min.js

https://unpkg.com/@lpjs/kuririn/dist/kuririn.min.js