var wallpaperService = require("../../services/wallpaper");

Page({
  data: {
    wallpapers: [],
    loading: true,
    hasMore: false,
    allWallpapers: [],
    pageSize: 20,
    currentPage: 0,
    statusBarHeight: 44,
    navBarHeight: 44,
    menuButtonTop: 48,
    menuButtonHeight: 32
  },

  onLoad: function() {
    var that = this;
    var sysInfo = wx.getSystemInfoSync();
    var statusBarHeight = sysInfo.statusBarHeight || 44;
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
    that.loadHotWallpapers();
  },

  goBack: function() {
    wx.navigateBack({
      delta: 1,
      fail: function() {
        wx.switchTab({ url: "/pages/index/index" });
      }
    });
  },

  loadHotWallpapers: function() {
    var that = this;
    that.setData({ loading: true });
    wallpaperService.fetchHotWallpapers().then(function(wallpapers) {
      var firstPage = wallpapers.slice(0, that.data.pageSize);
      that.setData({
        allWallpapers: wallpapers,
        wallpapers: firstPage,
        currentPage: 1,
        hasMore: wallpapers.length > that.data.pageSize,
        loading: false
      });
    }).catch(function() {
      that.setData({ loading: false });
    });
  },

  onLoadMore: function() {
    var that = this;
    var allWallpapers = that.data.allWallpapers;
    var nextPage = that.data.currentPage + 1;
    var start = nextPage * that.data.pageSize;
    var end = start + that.data.pageSize;
    var moreWallpapers = allWallpapers.slice(start, end);

    if (moreWallpapers.length === 0) {
      that.setData({ hasMore: false });
      return;
    }

    var currentWallpapers = that.data.wallpapers.concat(moreWallpapers);
    that.setData({
      wallpapers: currentWallpapers,
      currentPage: nextPage,
      hasMore: end < allWallpapers.length
    });
  }
});
