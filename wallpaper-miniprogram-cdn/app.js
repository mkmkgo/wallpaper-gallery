var ad = require("./utils/ad");

App({
  onLaunch: function() {
    ad.initAd();
    this.cleanExpiredCache();
  },
  globalData: {
    currentWallpaper: null,
    selectedCategory: null,
    dateWallpapers: null
  },
  cleanExpiredCache: function() {
    try {
      var res = wx.getStorageInfoSync();
      var keys = res.keys || [];
      var now = Date.now();
      var CACHE_DURATION = 30 * 60 * 1000;
      for (var i = 0; i < keys.length; i++) {
        if (keys[i].indexOf("wp_cache_") === 0) {
          try {
            var cached = wx.getStorageSync(keys[i]);
            if (cached && now - cached.timestamp > CACHE_DURATION * 2) {
              wx.removeStorageSync(keys[i]);
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }
});
