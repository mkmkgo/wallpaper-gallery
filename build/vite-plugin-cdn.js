import process from 'node:process'

const cdn = {
  css: [],
  js: [
    'https://unpkg.com/vue@3.5.24/dist/vue.global.prod.js',
    'https://unpkg.com/vue-demi@0.14.10/lib/index.iife.js',
    'https://unpkg.com/vue-router@4.6.4/dist/vue-router.global.prod.js',
  ],
}

export function cdnPlugin(options = {}) {
  const { css = cdn.css, js = cdn.js } = options
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    name: 'vite-plugin-cdn',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!isProduction)
          return html

        html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/g, '')

        const cdnPreloads = js.map(url => `    <link rel="preload" href="${url}" as="script" crossorigin />`).join('\n')
        const cdnScripts = js.map(url => `    <script src="${url}" defer crossorigin></script>`).join('\n')
        const cdnStyles = css.map(url => `    <link rel="stylesheet" href="${url}">`).join('\n')

        html = html.replace(
          /<\/head>/,
          `${cdnPreloads}\n${cdnScripts}\n${cdnStyles}\n  </head>`,
        )

        html = html.replace(
          /(<script type="module")/,
          `    $1`,
        )

        const swScript = `    <script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){})}</script>`

        const prefetchScript = `    <script>(function(){var s=/Mobi|Android/i.test(navigator.userAgent)?'mobile':'desktop';var b='/data/'+s+'/';['index.json','latest.json'].forEach(function(f){var l=document.createElement('link');l.rel='prefetch';l.href=b+f;l.as='fetch';l.crossOrigin='';document.head.appendChild(l)})})()</script>`

        html = html.replace(
          /<\/head>/,
          `${swScript}\n${prefetchScript}\n  </head>`,
        )

        return html
      },
    },
  }
}

export default cdnPlugin
