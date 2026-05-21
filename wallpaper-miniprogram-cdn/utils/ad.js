var config = require("./config");

var rewardedVideoAd = null;
var adCallback = null;

function initAd() {
  if (wx.createRewardedVideoAd) {
    rewardedVideoAd = wx.createRewardedVideoAd({
      adUnitId: config.AD_CONFIG.AD_UNIT_ID
    });
    rewardedVideoAd.onError(function(err) {
      console.error("激励视频广告错误:", err);
    });
    rewardedVideoAd.onClose(function(res) {
      if (res && res.isEnded) {
        if (adCallback) {
          var cb = adCallback;
          adCallback = null;
          cb();
        }
      } else {
        wx.showToast({
          title: "请观看完整广告后下载",
          icon: "none",
          duration: 2000
        });
      }
    });
  }
}

function showRewardedVideo(callback) {
  if (!rewardedVideoAd) {
    if (callback) callback();
    return;
  }
  adCallback = callback;
  rewardedVideoAd.show().catch(function() {
    rewardedVideoAd.load().then(function() {
      return rewardedVideoAd.show();
    }).catch(function(err) {
      console.error("激励视频广告展示失败:", err);
      adCallback = null;
      if (callback) callback();
    });
  });
}

module.exports = {
  initAd: initAd,
  showRewardedVideo: showRewardedVideo
};
