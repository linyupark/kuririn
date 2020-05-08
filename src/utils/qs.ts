/**
* 对象转查询字符串
* @param {Object} params 参数
*/
export default function (params = {}) {
  const copy = { ...params };
  return Object.keys(copy)
    .map((k) => {
      if (~Object.prototype.toString.call(copy[k]).search(/Array|Object/)) {
        copy[k] = JSON.stringify(copy[k]);
      }
      return `${encodeURIComponent(k)}=${encodeURIComponent(copy[k])}`;
    })
    .join("&");
}