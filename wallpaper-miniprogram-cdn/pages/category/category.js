var wallpaperService = require("../../services/wallpaper");
var api = require("../../utils/api");

Page({
  data: {
    categories: [],
    selectedCategory: "",
    wallpapers: [],
    allWallpapers: [],
    currentPage: 1,
    pageSize: 28,
    hasMore: true,
    showCategories: true,
    loading: false,
    loadingMore: false
  },

  onLoad: function(options) {
    if (options && options.name) {
      var name = decodeURIComponent(options.name);
      this.setData({ selectedCategory: name, showCategories: false });
      this.loadWallpapers(name);
    }
    this.loadCategories();
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    var selectedCategory = getApp().globalData.selectedCategory;
    if (selectedCategory) {
      getApp().globalData.selectedCategory = null;
      this.setData({
        selectedCategory: selectedCategory,
        showCategories: false,
        currentPage: 1,
        wallpapers: [],
        allWallpapers: [],
        hasMore: true
      });
      this.loadWallpapers(selectedCategory);
    }
  },

  loadCategories: function() {
    var that = this;
    wallpaperService.fetchCategories().then(function(categories) {
      var processed = categories.map(function(c) {
        c.coverUrl = "";
        return c;
      });
      that.setData({ categories: processed });
      that.loadCategoryCovers(categories);
    });
  },

  loadCategoryCovers: function(categories) {
    var that = this;
    var cats = that.data.categories;
    var index = 0;

    function loadNext() {
      if (index >= cats.length) return;
      var c = cats[index];
      index++;
      api.getWallpapers(c.name).then(function(wps) {
        if (wps && wps.length > 0) {
          var cover = wallpaperService.processWallpaper(wps[0]);
          c.coverUrl = cover.thumbnailUrl || cover.previewUrl || "";
        }
        that.setData({ categories: cats });
        setTimeout(loadNext, 100);
      }).catch(function() {
        setTimeout(loadNext, 100);
      });
    }

    loadNext();
  },

  onCategoryTap: function(e) {
    var name = e.currentTarget.dataset.name;
    this.setData({
      selectedCategory: name,
      showCategories: false,
      currentPage: 1,
      wallpapers: [],
      allWallpapers: [],
      hasMore: true
    });
    this.loadWallpapers(name);
  },

  onBackToCategories: function() {
    this.setData({ showCategories: true, wallpapers: [], allWallpapers: [], selectedCategory: "", hasMore: true });
  },

  loadWallpapers: function(category) {
    var that = this;
    that.setData({ loading: true });
    wallpaperService.fetchWallpapers(category).then(function(wallpapers) {
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
    if (that.data.loadingMore || !that.data.hasMore) return;
    var nextPage = that.data.currentPage + 1;
    var start = that.data.currentPage * that.data.pageSize;
    var end = start + that.data.pageSize;
    var moreWallpapers = that.data.allWallpapers.slice(start, end);
    if (moreWallpapers.length === 0) {
      that.setData({ hasMore: false });
      return;
    }
    that.setData({ loadingMore: true });
    var currentWallpapers = that.data.wallpapers.concat(moreWallpapers);
    that.setData({
      wallpapers: currentWallpapers,
      currentPage: nextPage,
      hasMore: end < that.data.allWallpapers.length,
      loadingMore: false
    });
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
