<script setup>
import LottieScene from '@/components/common/ui/LottieScene.vue'

defineProps({
  aspectType: {
    type: String,
    default: 'landscape',
  },
  currentSeriesName: {
    type: String,
    default: '壁纸',
  },
  displayViewMode: {
    type: String,
    default: 'grid',
  },
  isMobileOrTablet: {
    type: Boolean,
    default: false,
  },
  skeletonCount: {
    type: Number,
    default: 6,
  },
})

const loadingAnimationSrc = `${import.meta.env.BASE_URL}lottie/Loading%20animation%20blue.lottie`
</script>

<template>
  <div class="loading-state">
    <div class="loading-shell">
      <div class="loading-visual">
        <LottieScene
          :src="loadingAnimationSrc"
          :speed="0.95"
          fit="contain"
        />
      </div>
      <p class="loading-title">
        即将呈现{{ currentSeriesName }}
      </p>
      <p class="loading-text">
        请稍候...
      </p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.loading-state {
  position: relative;
  min-height: clamp(320px, 48vh, 520px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(32px, 8vw, 72px) 0;
}

.loading-shell {
  width: min(100%, 420px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-md;
  text-align: center;
}

.loading-visual {
  width: clamp(140px, 24vw, 220px);
  aspect-ratio: 1;
  filter: drop-shadow(0 16px 36px rgba(37, 99, 235, 0.14));
}

.loading-title {
  margin: 0;
  font-size: clamp(18px, 2vw, 22px);
  font-weight: $font-weight-semibold;
  color: var(--color-text-primary);
}

.loading-text {
  margin: 0;
  max-width: 28ch;
  font-size: $font-size-sm;
  line-height: 1.6;
  color: var(--color-text-muted);
}
</style>
