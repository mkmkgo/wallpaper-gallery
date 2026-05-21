var ad = require("../../utils/ad");
var config = require("../../utils/config");
var wallpaperService = require("../../services/wallpaper");

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + "KB";
  return (bytes / (1024 * 1024)).toFixed(1) + "MB";
}

Page({
  data: {
    wallpaperId: "",
    imageUrl: "",
    previewUrl: "",
    imageUrlCdn: "",
    previewUrlCdn: "",
    imageUrlProxy: "",
    previewUrlProxy: "",
    downloadUrl: "",
    downloading: false,
    showDevicePreview: false,
    showDownloadModal: false,
    wpCategory: "",
    wpFilename: "",
    wpResolution: "",
    wpSize: "",
    wpFormat: "",
    _fallbackStep: 0,
    imageLoaded: false
  },

  onLoad: function(options) {
    ad.initAd();
    var wp = getApp().globalData.currentWallpaper || {};
    var res = wp.resolution || {};
    var resText = "";
    if (res.width && res.height) {
      resText = res.width + "x" + res.height;
      if (res.label) resText += " " + res.label;
    }
    this.setData({
      wpCategory: (wp.category || "") + (wp.subcategory ? " / " + wp.subcategory : ""),
      wpFilename: wp.displayTitle || wp.filename || "",
      wpResolution: resText,
      wpSize: formatFileSize(wp.size),
      wpFormat: wp.format || ""
    });

    if (options) {
      var imageUrl = options.url ? decodeURIComponent(options.url) : "";
      var previewUrl = options.preview ? decodeURIComponent(options.preview) : "";
      var isBing = wp.isBing;
      var imageUrlCdn = "";
      var previewUrlCdn = "";
      var imageUrlProxy = "";
      var previewUrlProxy = "";

      if (isBing) {
        imageUrlCdn = imageUrl;
        previewUrlCdn = previewUrl;
      } else {
        if (wp.path) {
          imageUrlCdn = wallpaperService.buildFallbackCdnUrl(wp.path, 1, wp.cdnTag);
          imageUrlProxy = wallpaperService.buildProxyUrl(wp.path);
        } else if (imageUrl) {
          var primaryDomain = config.API_CONFIG.CDN_DOMAINS[0];
          var fallbackDomain = config.API_CONFIG.CDN_DOMAINS[1] || "";
          if (fallbackDomain) {
            imageUrlCdn = imageUrl.replace(primaryDomain, fallbackDomain);
          }
          imageUrlProxy = wallpaperService.buildProxyUrl(wp.path || "");
        }
        if (wp.previewPath) {
          previewUrlCdn = wallpaperService.buildFallbackCdnUrl(wp.previewPath, 1, wp.cdnTag);
          previewUrlProxy = wallpaperService.buildProxyUrl(wp.previewPath);
        } else if (previewUrl) {
          var primaryDomain2 = config.API_CONFIG.CDN_DOMAINS[0];
          var fallbackDomain2 = config.API_CONFIG.CDN_DOMAINS[1] || "";
          if (fallbackDomain2) {
            previewUrlCdn = previewUrl.replace(primaryDomain2, fallbackDomain2);
          }
          previewUrlProxy = wallpaperService.buildProxyUrl(wp.previewPath || wp.path || "");
        }
      }

      this.setData({
        wallpaperId: options.id || "",
        imageUrl: imageUrl,
        previewUrl: previewUrl,
        imageUrlCdn: imageUrlCdn,
        previewUrlCdn: previewUrlCdn,
        imageUrlProxy: imageUrlProxy,
        previewUrlProxy: previewUrlProxy,
        downloadUrl: imageUrl
      });
    }
  },

  goBack: function() {
    wx.navigateBack({
      delta: 1,
      fail: function() {
        wx.switchTab({ url: "/pages/index/index" });
      }
    });
  },

  onPreviewError: function() {
    var step = this.data._fallbackStep;
    if (step === 0) {
      this.setData({
        _fallbackStep: 1,
        previewUrl: this.data.previewUrlCdn || this.data.previewUrlProxy || "",
        imageUrl: this.data.imageUrlCdn || this.data.imageUrlProxy || ""
      });
    } else if (step === 1) {
      this.setData({
        _fallbackStep: 2,
        previewUrl: this.data.previewUrlProxy || "",
        imageUrl: this.data.imageUrlProxy || ""
      });
    }
  },

  onImageLoaded: function() {
    this.setData({ imageLoaded: true });
  },

  onImageTap: function() {
    this.setData({ showDevicePreview: true });
  },

  onShareAppMessage: function() {
    return {
      title: "精美壁纸 - " + (this.data.wpFilename || this.data.wallpaperId || ""),
      path: "/pages/detail/detail?id=" + this.data.wallpaperId
    };
  },

  showDownload: function() {
    this.setData({ showDownloadModal: true });
  },

  closeDownloadModal: function() {
    this.setData({ showDownloadModal: false });
  },

  confirmDownload: function() {
    var that = this;
    that.setData({ showDownloadModal: false });
    if (that.data.downloading) return;
    ad.showRewardedVideo(function() {
      that.doDownload(that.data.downloadUrl || that.data.imageUrl || that.data.previewUrl);
    });
  },

  doDownload: function(url) {
    if (!url) {
      wx.showToast({ title: "图片地址无效", icon: "none" });
      return;
    }
    var that = this;
    that.setData({ downloading: true });

    wx.downloadFile({
      url: url,
      success: function(res) {
        if (res.statusCode === 200) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: function() {
              that.setData({ downloading: false });
              wx.showToast({ title: "已保存到相册", icon: "success" });
            },
            fail: function(err) {
              that.setData({ downloading: false });
              if (err.errMsg.indexOf("auth deny") !== -1 || err.errMsg.indexOf("authorize") !== -1) {
                wx.showModal({
                  title: "提示",
                  content: "需要您授权保存图片到相册",
                  confirmText: "去授权",
                  success: function(res) {
                    if (res.confirm) {
                      wx.openSetting();
                    }
                  }
                });
              } else {
                wx.showToast({ title: "保存失败", icon: "none" });
              }
            }
          });
        } else {
          that.setData({ downloading: false });
          wx.showToast({ title: "下载失败", icon: "none" });
        }
      },
      fail: function() {
        that.setData({ downloading: false });
        wx.showToast({ title: "下载失败，请重试", icon: "none" });
      }
    });
  },

  previewImage: function() {
    this.setData({ showDevicePreview: true });
  },

  closeDevicePreview: function() {
    this.setData({ showDevicePreview: false });
  },

  onPreviewImageError: function() {
    var step = this.data._fallbackStep;
    if (step === 0) {
      this.setData({
        _fallbackStep: 1,
        previewUrl: this.data.previewUrlCdn || this.data.previewUrlProxy || "",
        imageUrl: this.data.imageUrlCdn || this.data.imageUrlProxy || ""
      });
    } else if (step === 1) {
      this.setData({
        _fallbackStep: 2,
        previewUrl: this.data.previewUrlProxy || "",
        imageUrl: this.data.imageUrlProxy || ""
      });
    }
  }
});
