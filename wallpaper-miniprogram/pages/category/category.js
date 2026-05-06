var wallpaperService = require("../../services/wallpaper");

Page({
  data: {
    categories: [],
    selectedCategory: "",
    wallpapers: [],
    currentPage: 1,
    totalPages: 1,
    pageSize: 28,
    showCategories: true,
    loading: false
  },

  onLoad: function(options) {
    if (options && options.name) {
      var name = decodeURIComponent(options.name);
      this.setData({ selectedCategory: name, showCategories: false });
      this.loadWallpapers(name, 1);
    }
    this.loadCategories();
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
  },

  loadCategories: function() {
    var that = this;
    wallpaperService.fetchCategories().then(function(categories) {
      that.setData({ categories: categories });
    });
  },

  onCategoryTap: function(e) {
    var name = e.currentTarget.dataset.name;
    this.setData({
      selectedCategory: name,
      showCategories: false,
      currentPage: 1,
      wallpapers: []
    });
    this.loadWallpapers(name, 1);
  },

  onBackToCategories: function() {
    this.setData({ showCategories: true, wallpapers: [], selectedCategory: "" });
  },

  loadWallpapers: function(category, page) {
    var that = this;
    that.setData({ loading: true });
    wallpaperService.fetchWallpapers(category).then(function(wallpapers) {
      var total = wallpapers.length;
      var totalPages = Math.ceil(total / that.data.pageSize) || 1;
      var start = (page - 1) * that.data.pageSize;
      var end = start + that.data.pageSize;
      that.setData({
        wallpapers: wallpapers.slice(start, end),
        currentPage: page,
        totalPages: totalPages,
        loading: false
      });
    }).catch(function() {
      that.setData({ loading: false });
    });
  },

  prevPage: function() {
    if (this.data.currentPage > 1) {
      this.loadWallpapers(this.data.selectedCategory, this.data.currentPage - 1);
    }
  },

  nextPage: function() {
    if (this.data.currentPage < this.data.totalPages) {
      this.loadWallpapers(this.data.selectedCategory, this.data.currentPage + 1);
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
