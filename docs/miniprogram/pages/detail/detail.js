Page({
  data: {
    wallpaper: null,
    showPreview: false
  },

  onLoad(options) {
    if (options.wallpaper) {
      this.setData({ wallpaper: JSON.parse(decodeURIComponent(options.wallpaper)) })
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 下载壁纸
  downloadWallpaper() {
    const wallpaper = this.data.wallpaper
    if (!wallpaper) return

    wx.showLoading({ title: '加载广告中...' })

    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({ title: '广告播放完成，开始下载', icon: 'success' })

      wx.downloadFile({
        url: wallpaper.imageUrl,
        success: (res) => {
          if (res.statusCode === 200) {
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => {
                wx.showToast({ title: '下载成功', icon: 'success' })
              },
              fail: (err) => {
                wx.showToast({ title: '保存失败', icon: 'none' })
                console.error(err)
              }
            })
          }
        },
        fail: (err) => {
          wx.showToast({ title: '下载失败', icon: 'none' })
          console.error(err)
        }
      })
    }, 2000)
  },

  // 显示真机预览
  showDevicePreview() {
    this.setData({ showPreview: true })
  },

  // 关闭真机预览
  closePreview() {
    this.setData({ showPreview: false })
  },

  // 分享壁纸
  shareWallpaper() {
    const wallpaper = this.data.wallpaper
    if (!wallpaper) return

    wx.shareAppMessage({
      title: `超赞壁纸 - ${wallpaper.title}`,
      path: `/pages/detail/detail?wallpaper=${encodeURIComponent(JSON.stringify(wallpaper))}`,
      imageUrl: wallpaper.thumbnailUrl
    })
  },

  // 分享到朋友圈
  onShareAppMessage() {
    const wallpaper = this.data.wallpaper
    return {
      title: `超赞壁纸 - ${wallpaper.title}`,
      path: `/pages/detail/detail?wallpaper=${encodeURIComponent(JSON.stringify(wallpaper))}`,
      imageUrl: wallpaper.thumbnailUrl
    }
  }
})