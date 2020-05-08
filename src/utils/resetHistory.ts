/**
* 添加额外 history state 事件
* @param type
*/
export default function resetHistory(type) {
  let orig = history[type];
  return function () {
    let rv = orig.apply(this, arguments);
    let e: any = new Event(type);
    e.arguments = arguments;
    window.dispatchEvent(e);
    return rv;
  };
}