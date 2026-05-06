Component({
  properties: {
    wallpapers: {
      type: Array,
      value: []
    },
    loading: {
      type: Boolean,
      value: false
    },
    showRank: {
      type: Boolean,
      value: false
    },
    hasMore: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onWallpaperTap: function(e) {
      var wallpaper = e.currentTarget.dataset.item;
      if (wallpaper && wallpaper.id) {
        getApp().globalData.currentWallpaper = {
          category: wallpaper.category || "", subcategory: wallpaper.subcategory || "",
          filename: wallpaper.filename || wallpaper.id || "", displayTitle: wallpaper.displayTitle || "",
          resolution: wallpaper.resolution || null, size: wallpaper.size || 0, format: wallpaper.format || ""
        };
        wx.navigateTo({
          url: "/pages/detail/detail?id=" + wallpaper.id + "&url=" + encodeURIComponent(wallpaper.url || wallpaper.thumbnailUrl || "") + "&preview=" + encodeURIComponent(wallpaper.previewUrl || wallpaper.thumbnailUrl || "")
        });
      }
    },

    onImageError: function(e) {
      var idx = e.currentTarget.dataset.index;
      var list = this.data.wallpapers;
      var item = list[idx];
      if (!item) return;
      var key = "wallpapers[" + idx + "].";
      if (item._fallbackStep === undefined) {
        item._fallbackStep = 1;
        this.setData({ [key + "thumbnailUrl"]: item.thumbnailCdnUrl || "" });
      } else if (item._fallbackStep === 1) {
        item._fallbackStep = 2;
        this.setData({ [key + "thumbnailUrl"]: item.thumbnailProxyUrl || "" });
      }
    },

    onLoadMore: function() {
      this.triggerEvent("loadmore");
    }
  }
});
