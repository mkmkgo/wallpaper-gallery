/**
 * 依赖注入插件（原 CDN 注入插件）
 *
 * 上游原始实现：开发环境用 index.html 里的 importmap 把 vue / vue-router 指向
 * unpkg.com；生产环境再由本插件把 importmap 删掉、换成三份 unpkg 上的 UMD 脚本。
 *
 * [LOCAL] 为什么改掉：
 *   1. unpkg.com 在国内长期不可达或极慢，而这三个 <script> 是**阻塞式**的，
 *      直接卡住首屏解析，实测能拖出数秒白屏；
 *   2. 跨境拉取多 3 次 DNS + TLS 握手，还和主文档不在同一条 HTTP/2 连接上。
 *
 * 现在做法：三份 UMD 产物放在 public/vendor/ 同源自托管。
 *   - 不跨境，和 HTML/CSS/JS 同源同连接，走 EdgeOne 边缘；
 *   - 加 defer，去掉渲染阻塞。classic defer 与 module 脚本同属「解析完成后按序执行」
 *     队列，顺序仍在 app 主模块之前，Vue → VueDemi → VueRouter 的依赖顺序不变。
 *
 * 升级依赖时：替换 public/vendor/ 下对应文件，并同步修改 VENDOR_JS 里的文件名。
 */

import process from 'node:process'

// 同源自托管的三份 UMD 产物（部署在站点根路径下）
const VENDOR_JS = [
  '/vendor/vue-3.5.24.global.prod.js',
  '/vendor/vue-demi-0.14.10.iife.js',
  '/vendor/vue-router-4.6.4.global.prod.js',
]

// 保留字段以兼容既有调用签名，默认不再走任何第三方 CDN
const cdn = {
  css: [],
  js: VENDOR_JS,
}

/**
 * 依赖注入插件
 * @param {object} options 配置选项
 * @param {string[]} options.css - 需要注入的样式表列表
 * @param {string[]} options.js - 需要注入的脚本列表（默认同源 vendor）
 * @returns {import('vite').Plugin}
 */
export function cdnPlugin(options = {}) {
  const { css = cdn.css, js = cdn.js } = options
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    name: 'vite-plugin-cdn',
    transformIndexHtml: {
      order: 'post', // 在 Vite 注入脚本之后执行
      handler(html) {
        if (!isProduction)
          return html

        // 移除 Import Map（生产环境使用 UMD 全局变量）
        html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/g, '')

        // [LOCAL] 预连接提示指向真正的图床域名：构建期由 VITE_CDN_DOMAIN 注入，
        // 否则 index.html 里写死的 cdn.jsdmirror.com 会白占一次握手（实际取图已换成自有域名）。
        const imageCdn = process.env.VITE_CDN_DOMAIN
        if (imageCdn)
          html = html.replaceAll('https://cdn.jsdmirror.com', `https://${imageCdn}`)

        // 在第一个 <script type="module" 之前注入 vendor 脚本（defer 避免阻塞解析）
        const cdnScripts = js.map(url => `    <script src="${url}" defer></script>`).join('\n')
        const cdnStyles = css.map(url => `    <link rel="stylesheet" href="${url}">`).join('\n')

        html = html.replace(
          /(<script type="module")/,
          `${cdnStyles}\n${cdnScripts}\n    $1`,
        )

        return html
      },
    },
  }
}

export default cdnPlugin
