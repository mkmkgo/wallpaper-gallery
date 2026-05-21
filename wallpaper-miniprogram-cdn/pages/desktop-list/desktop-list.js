var wallpaperService = require("../../services/wallpaper");

Page({
  data: {
    wallpapers: [],
    loading: true,
    statusBarHeight: 44,
    navBarHeight: 44,
    menuButtonTop: 48,
    menuButtonHeight: 32
  },

  onLoad: function() {
    var that = this;
    wx.getDeviceInfo({
      success: function(res) {
        var statusBarHeight = res.statusBarHeight || 44;
        try {
          var menuButton = wx.getMenuButtonBoundingClientRect();
          var navBarHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height;
          that.setData({
            statusBarHeight: statusBarHeight,
            navBarHeight: navBarHeight,
            menuButtonTop: menuButton.top,
            menuButtonHeight: menuButton.height
          });
        } catch (e) {
          that.setData({
            statusBarHeight: statusBarHeight,
            navBarHeight: 44,
            menuButtonTop: statusBarHeight + 6,
            menuButtonHeight: 32
          });
        }
      },
      fail: function() {
        that.setData({
          statusBarHeight: 44,
          navBarHeight: 44,
          menuButtonTop: 50,
          menuButtonHeight: 32
        });
      }
    });
    that.loadDesktopWallpapers();
  },

  goBack: function() {
    wx.navigateBack({
      delta: 1,
      fail: function() {
        wx.switchTab({ url: "/pages/index/index" });
      }
    });
  },

  loadDesktopWallpapers: function() {
    var that = this;
    that.setData({ loading: true });
    wallpaperService.fetchDesktopWallpapers().then(function(wallpapers) {
      that.setData({
        wallpapers: wallpapers,
        loading: false
      });
    }).catch(function() {
      that.setData({ loading: false });
    });
  },

  onImageError: function(e) {
    var idx = e.currentTarget.dataset.index;
    var item = this.data.wallpapers[idx];
    if (!item) return;
    var key = "wallpapers[" + idx + "].";
    if (item._fallbackStep === undefined) {
      item._fallbackStep = 1;
      this.setData({ [key + "thumbnailUrl"]: item.thumbnailCdnUrl || item.thumbnailProxyUrl || "" });
    } else if (item._fallbackStep === 1) {
      item._fallbackStep = 2;
      this.setData({ [key + "thumbnailUrl"]: item.thumbnailProxyUrl || "" });
    }
  },

  onWallpaperTap: function(e) {
    var wallpaper = e.currentTarget.dataset.item;
    if (wallpaper && wallpaper.id) {
      getApp().globalData.currentWallpaper = {
        category: wallpaper.category || "", subcategory: wallpaper.subcategory || "",
        filename: wallpaper.filename || wallpaper.id || "", displayTitle: wallpaper.displayTitle || "",
        resolution: wallpaper.resolution || null, size: wallpaper.size || 0, format: wallpaper.format || "",
        path: wallpaper.path || "", thumbnailPath: wallpaper.thumbnailPath || "",
        previewPath: wallpaper.previewPath || "", cdnTag: wallpaper.cdnTag || "",
        urlbase: wallpaper.urlbase || "", isBing: !!(wallpaper.urlbase || wallpaper.isBing)
      };
      wx.navigateTo({
        url: "/pages/detail/detail?id=" + wallpaper.id + "&url=" + encodeURIComponent(wallpaper.url || wallpaper.thumbnailUrl || "") + "&preview=" + encodeURIComponent(wallpaper.previewUrl || wallpaper.thumbnailUrl || "")
      });
    }
  }
});
