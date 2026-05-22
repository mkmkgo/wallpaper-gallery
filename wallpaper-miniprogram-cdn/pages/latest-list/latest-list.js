var wallpaperService = require("../../services/wallpaper");
var api = require("../../utils/api");

Page({
  data: {
    dateGroups: [],
    selectedDate: "",
    selectedWallpapers: [],
    loading: true,
    statusBarHeight: 44,
    navBarHeight: 44,
    menuButtonTop: 48,
    menuButtonHeight: 32
  },

  _wallpapersByDate: null,
  _allProcessed: null,

  onLoad: function() {
    var that = this;
    wx.getDeviceInfo({
      success: function(res) {
        var statusBarHeight = res.statusBarHeight || 44;
        that.initNavBar(statusBarHeight);
      },
      fail: function() {
        that.initNavBar(44);
      }
    });
    that._wallpapersByDate = {};
    that._allProcessed = {};
    that.loadAllWallpapers();
  },

  initNavBar: function(statusBarHeight) {
    var that = this;
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

  goBack: function() {
    wx.navigateBack({
      delta: 1,
      fail: function() {
        wx.switchTab({ url: "/pages/index/index" });
      }
    });
  },

  loadAllWallpapers: function() {
    var that = this;
    that.setData({ loading: true });

    api.getLatestWallpapers().then(function(wallpapers) {
      if (wallpapers && wallpapers.length > 0) {
        that.addToDateMap(wallpapers);
        that.updateDateList();
        var dates = that.data.dateGroups;
        if (dates.length > 0) {
          that.selectDate(dates[0].date);
        }
      }
      that.setData({ loading: false });
      that.loadCategoriesInBackground();
    }).catch(function() {
      that.setData({ loading: false });
      that.loadCategoriesInBackground();
    });
  },

  loadCategoriesInBackground: function() {
    var that = this;
    api.getCategoryNames().then(function(names) {
      if (!names || names.length === 0) return;

      var loaded = 0;
      var total = names.length;
      var batchSize = 3;
      var batchIndex = 0;

      function loadBatch() {
        if (batchIndex >= names.length) return;
        var batch = names.slice(batchIndex, batchIndex + batchSize);
        batchIndex += batchSize;
        var promises = batch.map(function(catName) {
          return api.getWallpapers(catName).then(function(wps) {
            that.addToDateMap(wps);
            loaded++;
          }).catch(function() {
            loaded++;
          });
        });
        Promise.all(promises).then(function() {
          that.updateDateList();
          if (loaded < total) {
            loadBatch();
          }
        });
      }

      loadBatch();
    });
  },

  addToDateMap: function(wallpapers) {
    var that = this;
    var processed = wallpapers.map(wallpaperService.processWallpaper).filter(Boolean);
    var hadNew = false;

    for (var i = 0; i < processed.length; i++) {
      var wp = processed[i];
      var key = wp.filename || wp.id;
      if (!key || that._allProcessed[key]) continue;
      that._allProcessed[key] = true;
      hadNew = true;

      var date = that.extractDateFromWallpaper(wp);
      if (!that._wallpapersByDate[date]) {
        that._wallpapersByDate[date] = [];
      }
      that._wallpapersByDate[date].push(wp);
    }
    return hadNew;
  },

  updateDateList: function() {
    var that = this;
    var groups = [];
    for (var date in that._wallpapersByDate) {
      groups.push({
        date: date,
        count: that._wallpapersByDate[date].length
      });
    }
    groups.sort(function(a, b) {
      return b.date.localeCompare(a.date);
    });

    var selectedDate = that.data.selectedDate;
    if (!selectedDate && groups.length > 0) {
      selectedDate = groups[0].date;
    }

    var updateData = { dateGroups: groups };
    if (selectedDate !== that.data.selectedDate) {
      updateData.selectedDate = selectedDate;
      updateData.selectedWallpapers = that._wallpapersByDate[selectedDate] || [];
    }
    that.setData(updateData);
  },

  selectDate: function(date) {
    var wallpapers = this._wallpapersByDate[date] || [];
    this.setData({
      selectedDate: date,
      selectedWallpapers: wallpapers
    });
  },

  extractDateFromWallpaper: function(wp) {
    if (wp.createdAt) {
      var utcMs = new Date(wp.createdAt).getTime();
      var bjDate = new Date(utcMs + 8 * 60 * 60 * 1000);
      var y = bjDate.getUTCFullYear();
      var m = bjDate.getUTCMonth() + 1;
      var d = bjDate.getUTCDate();
      return y + "-" + (m < 10 ? "0" + m : "" + m) + "-" + (d < 10 ? "0" + d : "" + d);
    }
    var fname = wp.filename || wp.id || "";
    var match = fname.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
    if (match) {
      return match[1] + "-" + match[2] + "-" + match[3];
    }
    if (wp.category) {
      return wp.category;
    }
    return "未知日期";
  },

  onDateTap: function(e) {
    var date = e.currentTarget.dataset.date;
    this.selectDate(date);
  },

  onImageError: function(e) {
    var wp = e.currentTarget.dataset.item;
    if (!wp) return;
    var wallpapers = this.data.selectedWallpapers;
    for (var w = 0; w < wallpapers.length; w++) {
      if (wallpapers[w].id === wp.id) {
        if (wallpapers[w]._fallbackStep === undefined) {
          wallpapers[w]._fallbackStep = 1;
          this.setData({ ["selectedWallpapers[" + w + "].thumbnailUrl"]: wallpapers[w].thumbnailCdnUrl || wallpapers[w].thumbnailProxyUrl || "" });
        } else if (wallpapers[w]._fallbackStep === 1) {
          wallpapers[w]._fallbackStep = 2;
          this.setData({ ["selectedWallpapers[" + w + "].thumbnailUrl"]: wallpapers[w].thumbnailProxyUrl || "" });
        }
        return;
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
