#!/usr/bin/env node
/**
 * 把图床仓库最新 tag 写进小程序的远程配置文件 public/miniapp/config.json。
 *
 * ── 为什么需要这个脚本 ─────────────────────────────────────────────
 * 小程序内置的兜底 CDN 版本号（DEFAULT_CDN_TAG / REPO_DEFAULT_TAGS）写在代码里，
 * 一旦图仓发布了新 tag 它就落后——表现为「上次发版之后上传的图片全部 404」，
 * 而修正只能靠重新发版微信小程序。
 *
 * 解决办法：把版本号放进部署出去的静态配置 public/miniapp/config.json，
 * 小程序每次启动拉取该文件的 cdnTag 覆盖内置值 → 图仓发新 tag 后
 * 只要站点重新部署，已上线的小程序无需重新发版即可取到新图。
 *
 * ── 设计原则 ──────────────────────────────────────────────────────
 * 这是部署流水线里的一步，绝不能因为配置文件的意外状况拖垮整个部署：
 * 参数非法 / 文件缺失 / JSON 损坏，一律打印原因后 exit 0 跳过，
 * 此时保留仓库里已有的 cdnTag 值。
 *
 * ── 用法 ───────────────────────────────────────────────────────────
 *   node scripts/set-miniapp-cdn-tag.js v1.5.11
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'

const TARGET = 'public/miniapp/config.json'
const VERSION_RE = /^v\d+(?:\.\d+)*$/

const tag = String(process.argv[2] || '').trim()

if (!VERSION_RE.test(tag)) {
  console.log(`跳过 cdnTag 同步：未取到合法版本号（收到 ${JSON.stringify(tag)}）`)
  process.exit(0)
}

if (!existsSync(TARGET)) {
  console.log(`跳过 cdnTag 同步：${TARGET} 不存在`)
  process.exit(0)
}

let config
try {
  config = JSON.parse(readFileSync(TARGET, 'utf8'))
}
catch (error) {
  console.log(`跳过 cdnTag 同步：${TARGET} 不是合法 JSON（${error.message}）`)
  process.exit(0)
}

if (config.cdnTag === tag) {
  console.log(`cdnTag 已是 ${tag}，无需更新`)
  process.exit(0)
}

config.cdnTag = tag
writeFileSync(TARGET, `${JSON.stringify(config, null, 2)}\n`)
console.log(`✅ ${TARGET} 的 cdnTag 已同步为 ${tag}`)
