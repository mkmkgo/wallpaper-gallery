var wallpaperService = require("../../services/wallpaper");

Page({
  data: {
    date: "",
    wallpapers: [],
    currentPage: 1,
    totalPages: 1,
    pageSize: 28,
    loading: true
  },

  onLoad: function(options) {
    if (options && options.date) {
      var date = decodeURIComponent(options.date);
      this.setData({ date: date });
      wx.setNavigationBarTitle({ title: date });
    }
    this.loadWallpapers();
  },

  loadWallpapers: function() {
    var that = this;
    that.setData({ loading: true });
    wallpaperService.fetchLatestWallpapers().then(function(wallpapers) {
      var filtered = [];
      for (var i = 0; i < wallpapers.length; i++) {
        var wp = wallpapers[i];
        var wpDate = "";
        if (wp.createdAt) {
          wpDate = wp.createdAt.split("T")[0];
        } else if (wp.category) {
          wpDate = wp.category;
        }
        if (wpDate === that.data.date) {
          filtered.push(wp);
        }
      }
      var total = filtered.length;
      var totalPages = Math.ceil(total / that.data.pageSize) || 1;
      var start = (that.data.currentPage - 1) * that.data.pageSize;
      var end = start + that.data.pageSize;
      that.setData({
        wallpapers: filtered.slice(start, end),
        totalPages: totalPages,
        loading: false
      });
    }).catch(function() {
      that.setData({ loading: false });
    });
  },

  prevPage: function() {
    if (this.data.currentPage > 1) {
      this.setData({ currentPage: this.data.currentPage - 1 });
      this.loadWallpapers();
    }
  },

  nextPage: function() {
    if (this.data.currentPage < this.data.totalPages) {
      this.setData({ currentPage: this.data.currentPage + 1 });
      this.loadWallpapers();
    }
  },

  onImageError: function(e) {
    var idx = e.currentTarget.dataset.index;
    var item = this.data.wallpapers[idx];
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
  }
});
