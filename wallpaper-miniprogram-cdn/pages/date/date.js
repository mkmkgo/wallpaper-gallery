var wallpaperService = require("../../services/wallpaper");
var api = require("../../utils/api");

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
    var cached = getApp().globalData.dateWallpapers;
    if (cached && cached.length > 0) {
      getApp().globalData.dateWallpapers = null;
      this.displayWallpapers(cached);
    } else {
      this.loadWallpapers();
    }
  },

  displayWallpapers: function(wallpapers) {
    var total = wallpapers.length;
    var totalPages = Math.ceil(total / this.data.pageSize) || 1;
    var start = (this.data.currentPage - 1) * this.data.pageSize;
    var end = start + this.data.pageSize;
    this.setData({
      wallpapers: wallpapers.slice(start, end),
      totalPages: totalPages,
      loading: false
    });
  },

  loadWallpapers: function() {
    var that = this;
    that.setData({ loading: true });

    wallpaperService.fetchLatestWallpapers().then(function(wallpapers) {
      var filtered = that.filterByDate(wallpapers);
      if (filtered.length > 0) {
        that.displayWallpapers(filtered);
        return;
      }
      that.loadFromCategories();
    }).catch(function() {
      that.loadFromCategories();
    });
  },

  loadFromCategories: function() {
    var that = this;
    api.getCategoryNames().then(function(names) {
      if (!names || names.length === 0) {
        that.setData({ loading: false });
        return;
      }

      var allWallpapers = [];
      var loaded = 0;
      var total = names.length;

      for (var i = 0; i < names.length; i++) {
        (function(catName) {
          api.getWallpapers(catName).then(function(wps) {
            for (var w = 0; w < wps.length; w++) {
              allWallpapers.push(wps[w]);
            }
            loaded++;
            if (loaded === total) {
              var processed = allWallpapers.map(wallpaperService.processWallpaper).filter(Boolean);
              var filtered = that.filterByDate(processed);
              that.displayWallpapers(filtered);
            }
          }).catch(function() {
            loaded++;
            if (loaded === total) {
              var processed = allWallpapers.map(wallpaperService.processWallpaper).filter(Boolean);
              var filtered = that.filterByDate(processed);
              if (filtered.length > 0) {
                that.displayWallpapers(filtered);
              } else {
                that.setData({ loading: false });
              }
            }
          });
        })(names[i]);
      }
    }).catch(function() {
      that.setData({ loading: false });
    });
  },

  filterByDate: function(wallpapers) {
    var that = this;
    var filtered = [];
    for (var i = 0; i < wallpapers.length; i++) {
      var wp = wallpapers[i];
      var wpDate = that.extractDateFromWallpaper(wp);
      if (wpDate === that.data.date) {
        filtered.push(wp);
      }
    }
    return filtered;
  },

  extractDateFromWallpaper: function(wp) {
    if (wp.createdAt) {
      var d = wp.createdAt.split("T")[0];
      if (d) return d;
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
      this.setData({ [key + "thumbnailUrl"]: item.thumbnailCdnUrl || item.thumbnailProxyUrl || "" });
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
