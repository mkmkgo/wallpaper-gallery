<script setup>
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PageLoadingScene from '@/components/common/feedback/PageLoadingScene.vue'
import UpdateNotification from '@/components/common/feedback/UpdateNotification.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import GridSkeleton from '@/components/wallpaper/WallpaperGrid/GridSkeleton.vue'
import { useVersionCheck } from '@/composables/useVersionCheck'

// Version check (启动版本检测)
useVersionCheck()

// Route
const route = useRoute()

// 根据路由 meta 动态获取骨架屏宽高比
const skeletonAspectType = computed(() => route.meta?.aspectType || 'landscape')

// 是否隐藏导航栏（用于下载页等独立页面）
const hideHeader = computed(() => route.meta?.hideHeader === true)
const useSceneLoadingFallback = computed(() => route.meta?.loadingScene === true)
const loadingSceneTitle = computed(() => route.meta?.loadingTitle || '页面加载中')
const loadingSceneText = computed(() => route.meta?.loadingText || '请稍候...')
const compactMain = computed(() => route.meta?.compactMain === true)
</script>

<template>
  <ElConfigProvider :locale="zhCn">
    <div class="app" :class="{ 'compact-main': compactMain, 'no-header': hideHeader }">
      <AppHeader v-if="!hideHeader" />

      <main class="main-content" :class="{ 'compact-page': compactMain, 'no-padding': hideHeader }">
        <RouterView v-slot="{ Component }">
          <Suspense v-if="Component">
            <template #default>
              <component :is="Component" />
            </template>
            <template #fallback>
              <div class="route-loading-fallback">
                <div class="container">
                  <PageLoadingScene
                    v-if="useSceneLoadingFallback"
                    :text="loadingSceneText"
                    :title="loadingSceneTitle"
                  />
                  <GridSkeleton v-else :count="12" :aspect-type="skeletonAspectType" />
                </div>
              </div>
            </template>
          </Suspense>
        </RouterView>
      </main>

      <!-- 版本更新提示 -->
      <UpdateNotification v-if="!hideHeader" />

      <footer v-if="!hideHeader" class="seo-footer">
        <nav class="seo-footer-links" aria-label="站点底部导航">
          <a href="/desktop">电脑壁纸</a>
          <a href="/mobile">手机壁纸</a>
          <a href="/avatar">高清头像</a>
          <a href="/bing">Bing壁纸</a>
          <a href="/video">视频壁纸</a>
          <a href="/about">关于我们</a>
        </nav>
        <p class="seo-footer-copy">&copy; 2024-2026 超赞壁纸 - 4K高清壁纸免费下载</p>
      </footer>
    </div>
  </ElConfigProvider>
</template>

<style lang="scss">
@use '@/assets/styles/main.scss';
</style>

<style lang="scss" scoped>
@use '@/assets/styles/variables' as *;

.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;

  &.compact-main {
    min-height: auto;
  }

  &.no-header {
    min-height: 100vh;
    min-height: 100dvh;
  }
}

.main-content {
  flex: 1;
  padding-top: $header-height;

  &.compact-page {
    flex: 0 0 auto;
  }

  &.no-padding {
    padding-top: 0;
  }
}

.seo-footer {
  padding: 32px 16px 24px;
  text-align: center;
  border-top: 1px solid var(--color-border);
  margin-top: auto;
}

.seo-footer-links {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-bottom: 12px;

  a {
    font-size: 13px;
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color var(--transition-fast);

    &:hover {
      color: var(--color-accent);
    }
  }
}

.seo-footer-copy {
  font-size: 12px;
  color: var(--color-text-muted);
  opacity: 0.6;
}
</style>
