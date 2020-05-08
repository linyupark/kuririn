## 地表最强(简化)前端业务跟踪错误上报注入
----
### Changelog
 * 2020-5-8 初版，+mod_performance +mod_logicTracker +mod_error +mod_userinfo 目前实现4个模块


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