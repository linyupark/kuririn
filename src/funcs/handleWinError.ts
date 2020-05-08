/**
 * 全局异常处理 window.onerror
 * @param event 
 */
export default function(event: ErrorEvent) {
  // 避免阻塞
  return new Promise((resolve) => {
    setTimeout(() => {
      let data = {
        filename: event.filename,
        lineno: event.lineno || 0,
        colno: event.colno || 0,
        message: event.message || "无法获取详细错误信息",
      };
      if (event.error && event.error.stack) {
        data.message = event.error.stack.toString();
      }
      resolve({
        type: 'ERROR_JS',
        error: data
      })
    }, 10)
  })
}