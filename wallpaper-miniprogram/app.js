var ad = require("./utils/ad");

App({
  onLaunch: function() {
    ad.initAd();
  },
  globalData: {
    currentWallpaper: null
  }
});
