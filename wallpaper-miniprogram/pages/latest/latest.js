var wallpaperService = require("../../services/wallpaper");

Page({
  data: {
    dateGroups: [],
    currentDate: "",
    wallpapers: [],
    currentPage: 1,
    totalPages: 1,
    pageSize: 28,
    loading: true
  },

  onLoad: function() {
    this.loadLatestWallpapers();
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },

  loadLatestWallpapers: function() {
    var that = this;
    that.setData({ loading: true });
    wallpaperService.fetchLatestWallpapers().then(function(wallpapers) {
      var dateGroups = {};
      for (var i = 0; i < wallpapers.length; i++) {
        var wp = wallpapers[i];
        var date = "未知日期";
        if (wp.createdAt) {
          date = wp.createdAt.split("T")[0];
        } else if (wp.category) {
          date = wp.category;
        }
        if (!dateGroups[date]) {
          dateGroups[date] = [];
        }
        dateGroups[date].push(wp);
      }
      var groups = [];
      for (var key in dateGroups) {
        groups.push({
          date: key,
          wallpapers: dateGroups[key],
          count: dateGroups[key].length
        });
      }
      groups.sort(function(a, b) {
        return b.date.localeCompare(a.date);
      });
      that.setData({
        dateGroups: groups,
        loading: false
      });
    }).catch(function() {
      that.setData({ loading: false });
    });
  },

  onDateTap: function(e) {
    var date = e.currentTarget.dataset.date;
    wx.navigateTo({
      url: "/pages/date/date?date=" + encodeURIComponent(date)
    });
  },

  onImageError: function(e) {
    var wp = e.currentTarget.dataset.item;
    if (!wp) return;
    var groups = this.data.dateGroups;
    for (var g = 0; g < groups.length; g++) {
      var wps = groups[g].wallpapers;
      for (var w = 0; w < wps.length; w++) {
        if (wps[w].id === wp.id) {
          if (wps[w]._fallbackStep === undefined) {
            wps[w]._fallbackStep = 1;
            this.setData({ ["dateGroups[" + g + "].wallpapers[" + w + "].thumbnailUrl"]: wps[w].thumbnailCdnUrl || wps[w].thumbnailProxyUrl || "" });
          } else if (wps[w]._fallbackStep === 1) {
            wps[w]._fallbackStep = 2;
            this.setData({ ["dateGroups[" + g + "].wallpapers[" + w + "].thumbnailUrl"]: wps[w].thumbnailProxyUrl || "" });
          }
          return;
        }
      }
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
