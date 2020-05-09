/**
 * 更新用户相关数据
 * 注意这里代码会在所有路由变动触发，持久数据不建议放在此处
 */
export default function (historyType, userinfo: IUserinfo) {
  if (userinfo.url !== '') {
    if (historyType === 'pushState') {
      // 前进
      userinfo.history.unshift(userinfo.url)
    } else if (historyType === 'replaceState') {
      // 重定位
      userinfo.history[0] = userinfo.url
    } else {
      // 物理后退
      if (userinfo.history[0] === document.URL) {
        userinfo.history = userinfo.history.slice(1, 5)
      } else {
        // 物理前进
        userinfo.history.unshift(userinfo.url)
      }
    }

    userinfo.history = userinfo.history.slice(0, 5)
  }
  userinfo.url = document.URL
  userinfo.title = document.title
  return userinfo
}