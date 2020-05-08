/**
 * 返回性能指标
 */
export default function () {
  if (false === 'performance' in window) return {}
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
  return {
    dnsTime,
    tcpTime,
    firstPaintTime,
    domRenderTime,
    loadTime,
  }
}