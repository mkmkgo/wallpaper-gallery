#!/usr/bin/env node
/**
 * CDN tag 同步保底检查（gallery 侧主动轮询）。
 *
 * ── 为什么需要这个保险 ─────────────────────────────────────────────
 * 实时链路的主路径是「图仓处理完 → dispatch(wallpaper-updated) → 本站三
 * 条部署流重建」。但那条链路依赖图仓侧的 REPO_TOKEN 对 wallpaper-gallery
 * 具备写权限；若 PAT 是 fine-grained 且未包含本站，GitHub 会返回 401/404，
 * 而图仓流水线「不该因通知失败而标红」，只会打一条 warning —— 结果就是
 * cdnTag 静默停在旧值，要等本站的每日定时任务才恢复。
 *
 * 本脚本从反方向兜底：**本站**主动去查图仓最新 tag，和已部署的
 * public/miniapp/config.json 里的 cdnTag 比对，不一致就给自己发一次
 * repository_dispatch，触发三条部署流重建。
 *
 * 优势：
 *   · 图仓是公开仓库，`git ls-remote` 匿名可读 —— 不需要任何额外凭据；
 *   · 只使用 Actions 内置的 GITHUB_TOKEN 对本仓库发 dispatch（GitHub 明确
 *     允许 GITHUB_TOKEN 触发 repository_dispatch，不会像其他事件那样被
 *     抑制），无需配置 secrets；
 *   · 不 commit 任何文件，零 git 历史污染。
 *
 * ── 用法 ───────────────────────────────────────────────────────────
 *   node scripts/watch-cdn-tag.js            # 检查并在需要时触发重建
 *   GITHUB_TOKEN=xxx node scripts/watch-cdn-tag.js   # 本地显式传 token
 *
 * 退出码恒为 0：这不属关键路径，失败只告警，避免让定时任务每 15 分钟标红。
 */

import { execFileSync } from 'node:child_process'
import process from 'node:process'

const REPO_SLUG = process.env.WATCH_REPO || process.env.GITHUB_REPOSITORY || 'mkmkgo/wallpaper-gallery'
const IMAGE_REPO_SLUG = process.env.CDN_REPO_SLUG || 'mkmkgo/nuanXinProPic'
const EVENT_TYPE = process.env.WATCH_EVENT_TYPE || 'wallpaper-updated'

const warn = msg => console.error(`::warning::${msg}`)
const info = msg => console.error(msg)

/** 复用已有的取版本号脚本，保持「同一份降级策略」（git ls-remote → API → 本地兜底） */
function resolveLatestTag() {
  try {
    const out = execFileSync(
      'node',
      ['scripts/get-latest-cdn-tag.js'],
      {
        encoding: 'utf8',
        timeout: 120_000,
        env: { ...process.env, CDN_REPO_SLUG: IMAGE_REPO_SLUG },
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    )
    const tag = out.trim()
    if (!tag) {
      warn('未能解析出图仓最新 tag（脚本返回空）')
      return ''
    }
    return tag
  }
  catch (error) {
    warn(`调用 get-latest-cdn-tag.js 失败：${error?.message || error}`)
    return ''
  }
}

/**
 * 读取「线上实际生效」的 cdnTag。
 *
 * ⚠️ 必须查线上 URL，不能读仓库里的 public/miniapp/config.json ——
 * 部署时的「Sync cdnTag to miniapp config」步骤是**在构建产物里**把 cdnTag
 * 改写为最新 tag 并直接部署，不会 commit 回仓库。因此仓库里的那份永远停在
 * 上次手工提交的值；拿它来比对会恒被判为「滞后」，于是每 15 分钟白白触发
 * 一次三站重建。真正要对齐的是**线上正在下发的**那个值。
 *
 * 默认查 CN 站（小程序 DATA_BASE 指向它，是最关键的一端）。
 * 取不到就返回空串，由调用方跳过本轮 ——宁可不触发，也不要误判刷部署。
 */
async function readDeployedTag() {
  const url = process.env.WATCH_LIVE_CONFIG_URL || 'https://wall.202486.xyz/miniapp/config.json'
  try {
    const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
      headers: { 'User-Agent': 'wallpaper-gallery-cdn-tag-watcher' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      warn(`读取线上配置失败：HTTP ${res.status}（${url}）`)
      return ''
    }
    const body = await res.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      warn(`线上配置不是合法 JSON：${url}`)
      return ''
    }
    return body.cdnTag || ''
  }
  catch (error) {
    warn(`读取线上配置异常：${error?.message || error}`)
    return ''
  }
}

async function dispatchSelf(tag, previousTag) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  if (!token) {
    warn('GITHUB_TOKEN 未注入，无法触发重建（权限不足时流水线会缺少该变量）')
    return false
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO_SLUG}/dispatches`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'wallpaper-gallery-cdn-tag-watcher',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        event_type: EVENT_TYPE,
        client_payload: {
          source: 'watch-cdn-tag',
          tag,
          previousTag,
          imageRepo: IMAGE_REPO_SLUG,
        },
      }),
      signal: AbortSignal.timeout(20_000),
    })

    if (res.status === 204) {
      info(`✅ 已触发 ${REPO_SLUG} 三站重建（${previousTag || '空'} → ${tag}）`)
      return true
    }

    const body = await res.text().catch(() => '')
    warn(`触发重建失败：HTTP ${res.status} ${body.slice(0, 200)}`)
    warn('若为 401/403，请检查本工作流的 permissions 是否含 contents: write')
    return false
  }
  catch (error) {
    warn(`触发重建请求异常：${error?.message || error}`)
    return false
  }
}

/**
 * 用 git ls-remote 直接确认 tag 是否真实存在于图仓。
 * 防御：万一 get-latest-cdn-tag.js 回退到本地 constants.js 的旧值，
 * 这里能拦住「拿一个根本不存在的 tag 去覆盖线上」的情况。
 */
function tagExistsInImageRepo(tag) {
  if (!tag)
    return false
  try {
    const out = execFileSync(
      'git',
      ['ls-remote', '--tags', '--refs', `https://github.com/${IMAGE_REPO_SLUG}.git`, `refs/tags/${tag}`],
      { encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'ignore'] },
    )
    return out.trim().length > 0
  }
  catch {
    warn(`无法确认 ${tag} 是否存在于 ${IMAGE_REPO_SLUG}，本次跳过触发`)
    return false
  }
}

async function main() {
  const latestTag = resolveLatestTag()
  if (!latestTag) {
    info('跳过：未能获取图仓最新 tag')
    return
  }

  if (!tagExistsInImageRepo(latestTag)) {
    return
  }

  const deployedTag = await readDeployedTag()
  if (!deployedTag) {
    // 取不到就放弃本轮判断：宁可不触发，也不要因为读失败而误判成滞后
    info('跳过：未能确认线上生效的 cdnTag')
    return
  }

  info(`图仓最新 tag：${latestTag}`)
  info(`线上生效 cdnTag：${deployedTag}`)

  if (deployedTag === latestTag) {
    info('✅ cdnTag 已同步，无需重建')
    return
  }

  info(`⚠️ 检测到滞后，触发重建`)
  await dispatchSelf(latestTag, deployedTag)
}

await main()
// 恒 0：保底检查失败不应让定时任务标红，主线 privilege 问题另有专项排查
process.exit(0)
