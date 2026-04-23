Page({
  data: {},

  onLoad() {},

  goToDownloadHistory() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  goToFavorites() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  goToAdHistory() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  goToAbout() {
    wx.showModal({
      title: '关于超赞壁纸',
      content: '超赞壁纸小程序 v1.0.0\n\n提供高质量壁纸下载服务\n\n© 2026 超赞壁纸',
      showCancel: false
    })
  }
})