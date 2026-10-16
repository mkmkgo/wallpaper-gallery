#!/usr/bin/env node
/**
 * 获取图床仓库（nuanXinProPic）最新 tag，用作 CDN_VERSION。
 *
 * ── 为什么需要这个脚本 ─────────────────────────────────────────────
 * 原实现（deploy.yml / deploy-edgeone.yml / deploy-edgeone-cn.yml）为：
 *
 *   LATEST_TAG=$(curl -s "https://api.github.com/repos/mkmkgo/nuanXinProPic/tags" \
 *                 | jq -r '.[0].name // "v1.3.35"')
 *
 * 存在两个致命缺陷：
 *   1. 未鉴权访问 api.github.com 限额为 60 次/小时（按出口 IP 计），
 *      GitHub Actions runner 共享出口 IP，极易被限流；
 *   2. 限流时 API 返回的是错误【对象】而非数组：
 *        {"message":"API rate limit exceeded for ...","documentation_url":"..."}
 *      `jq -r '.[0].name'` 于是报
 *        jq: error (at <stdin>:1): Cannot index object with number
 *      以 exit code 5 退出（管道失败 + set -e），
 *      **整个工作流在「Get latest CDN version」第一步就挂掉**，
 *      后续 build/deploy 全部不执行。
 *
 * ── 现在的取数策略（逐级降级，永远有值可用）──────────────────────
 *   A. `git ls-remote --tags` —— 走 git 协议，公开仓库无需鉴权、无 API 配额，
 *      且能取到全部 tag（不是 API 的分页前 N 条），排序后取语义最大版本号；
 *   B. GitHub REST API —— 带 jq 类型守卫，兼容限流/错误对象/非数组响应；
 *   C. 仓库内 src/utils/config/constants.js 的 CDN_VERSION —— 本地兜底；
 *   D. 硬编码 CDN_VERSION_FALLBACK —— 最后一道保险。
 *
 * 任何一级拿到值即返回，保证「取版本号」这一步不会拖垮整条流水线。
 *
 * ── 用法 ───────────────────────────────────────────────────────────
 *   node scripts/get-latest-cdn-tag.js            # 带 v 前缀，如 v1.4.94
 *   node scripts/get-latest-cdn-tag.js --no-v     # 去掉 v 前缀，如 1.4.94
 *   node scripts/get-latest-cdn-tag.js --json     # 输出 {tag,version,source}
 *
 * 可用环境变量覆盖：
 *   CDN_REPO_SLUG         默认 mkmkgo/nuanXinProPic
 *   CDN_CONSTANTS_FILE    默认 src/utils/config/constants.js
 *   CDN_VERSION_FALLBACK  默认 v1.4.94
 *   GH_TOKEN_FOR_API      可选；带上会以鉴权方式调 API（提升匿名限额）
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import process from 'node:process'

const REPO_SLUG = process.env.CDN_REPO_SLUG || 'mkmkgo/nuanXinProPic'
const CONSTANTS_FILE = process.env.CDN_CONSTANTS_FILE || 'src/utils/config/constants.js'
const HARD_FALLBACK = process.env.CDN_VERSION_FALLBACK || 'v1.4.94'

// 版本号形状：可带 v 前缀，形如 1 / 1.2 / 1.2.3 / 1.2.3.4
const VERSION_RE = /^v?\d+(?:\.\d+)*$/

const warn = msg => console.error(`::warning::${msg}`)
const info = msg => console.error(msg)

/** 把 v1.2.10 与 v1.2.9 正确排序所需的数值比较（逐段比数字） */
function compareVersions(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i += 1) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na !== nb)
      return na - nb
  }
  return 0
}

function pickMax(candidates) {
  const valid = candidates
    .map(s => String(s || '').trim())
    .filter(s => VERSION_RE.test(s))
  if (valid.length === 0)
    return ''
  return valid.reduce((max, cur) => (compareVersions(cur, max) > 0 ? cur : max))
}

/** 方案 A：git ls-remote --tags（无鉴权、无 API 配额） */
function fromGitLsRemote() {
  try {
    const out = execFileSync(
      'git',
      ['ls-remote', '--tags', '--refs', `https://github.com/${REPO_SLUG}.git`],
      { encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'ignore'] },
    )
    const names = out
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.split(/\s+/).pop())
      .map(ref => ref.replace(/^refs\/tags\//, ''))
    return pickMax(names)
  }
  catch {
    return ''
  }
}

/** 方案 B：GitHub REST API（兼容限流/错误对象；最多翻 API_MAX_PAGES 页） */
const API_MAX_PAGES = 3

async function fromGitHubApi() {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'wallpaper-gallery-cdn-version-resolver',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (process.env.GH_TOKEN_FOR_API) {
    headers.Authorization = `Bearer ${process.env.GH_TOKEN_FOR_API}`
  }

  const names = []
  for (let page = 1; page <= API_MAX_PAGES; page += 1) {
    let res
    let body
    try {
      res = await fetch(
        `https://api.github.com/repos/${REPO_SLUG}/tags?per_page=100&page=${page}`,
        { headers, signal: AbortSignal.timeout(20_000) },
      )
      body = await res.json().catch(() => null)
    }
    catch (error) {
      warn(`GitHub API 请求失败（${error?.message || error}）`)
      break
    }

    // 关键守卫：限流/出错时 body 是对象而非数组，
    // 旧代码直接 .[0].name 就会崩在 "Cannot index object with number"。
    if (!Array.isArray(body)) {
      warn(
        `GitHub API 未返回数组（HTTP ${res.status}，body: ${JSON.stringify(body)?.slice(0, 160)}）`,
      )
      break
    }

    names.push(...body.map(item => item?.name))
    // 不足一页说明已到末尾
    if (body.length < 100)
      break
  }

  if (names.length === 0)
    return ''
  return pickMax(names)
}

/** 方案 C：仓库内 constants.js 的 CDN_VERSION */
function fromLocalConstants() {
  try {
    const src = readFileSync(CONSTANTS_FILE, 'utf8')
    const m = src.match(/CDN_VERSION\s*=\s*['"]([^'"]+)['"]/)
    return m ? m[1] : ''
  }
  catch {
    return ''
  }
}

async function resolve() {
  const gitTag = fromGitLsRemote()
  if (gitTag) {
    info(`✅ [git ls-remote] 最新 tag：${gitTag}`)
    return { tag: gitTag, source: 'git-ls-remote' }
  }

  const apiTag = await fromGitHubApi()
  if (apiTag) {
    info(`✅ [GitHub API] 最新 tag：${apiTag}`)
    return { tag: apiTag, source: 'github-api' }
  }

  const localTag = fromLocalConstants()
  if (localTag) {
    warn(`远端取值全部失败，回退到本地 ${CONSTANTS_FILE} 的 CDN_VERSION：${localTag}`)
    return { tag: localTag, source: 'local-constants' }
  }

  warn(`远端与本地均未取到版本号，使用硬编码兜底：${HARD_FALLBACK}`)
  return { tag: HARD_FALLBACK, source: 'hardcoded' }
}

const { tag, source } = await resolve()
const version = tag.replace(/^v/, '')

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify({ tag, version, source })}\n`)
}
else if (process.argv.includes('--no-v')) {
  process.stdout.write(`${version}\n`)
}
else {
  process.stdout.write(`${tag}\n`)
}
