var wallpaperService = require("../../services/wallpaper");

Page({
  data: {
    collections: [
      { id: "hot", name: "热门推荐" },
      { id: "new", name: "最新上传" },
      { id: "bing", name: "Bing每日" },
      { id: "4k", name: "4K超清" }
    ],
    navButtons: [
      { id: "hd", name: "超清壁纸" },
      { id: "collection", name: "壁纸合集" },
      { id: "rank", name: "排行榜" },
      { id: "custom", name: "传图定制" }
    ],
    categories: [],
    latestWallpapers: [],
    loading: true,
    statusBarHeight: 44,
    navBarHeight: 44
  },

  onLoad: function() {
    var sysInfo = wx.getSystemInfoSync();
    var statusBarHeight = sysInfo.statusBarHeight || 44;
    try {
      var menuButton = wx.getMenuButtonBoundingClientRect();
      var navBarHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height;
      this.setData({
        statusBarHeight: statusBarHeight,
        navBarHeight: navBarHeight
      });
    } catch (e) {
      this.setData({
        statusBarHeight: statusBarHeight,
        navBarHeight: 44
      });
    }
    this.loadData();
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  onPullDownRefresh: function() {
    this.loadData();
  },

  loadData: function() {
    var that = this;
    that.setData({ loading: true });

    wallpaperService.fetchCategories().then(function(categories) {
      if (categories.length > 0) {
        that.setData({ categories: categories.slice(0, 8) });
      }
    });

    wallpaperService.fetchLatestWallpapers().then(function(wallpapers) {
      that.setData({
        latestWallpapers: wallpapers.slice(0, 20),
        loading: false
      });
      wx.stopPullDownRefresh();
    }).catch(function() {
      that.setData({ loading: false });
      wx.stopPullDownRefresh();
    });
  },

  onCollectionTap: function(e) {
    var id = e.currentTarget.dataset.id;
    if (id === "hot") {
      wx.navigateTo({
        url: "/pages/hot/hot"
      });
    } else if (id === "new") {
      wx.navigateTo({
        url: "/pages/latest-list/latest-list"
      });
    } else if (id === "bing") {
      wx.navigateTo({
        url: "/pages/bing-list/bing-list"
      });
    } else if (id === "4k") {
      wx.navigateTo({
        url: "/pages/desktop-list/desktop-list"
      });
    } else {
      wx.switchTab({
        url: "/pages/category/category"
      });
    }
  },

  onNavTap: function(e) {
    var id = e.currentTarget.dataset.id;
    if (id === "hd" || id === "collection") {
      wx.switchTab({
        url: "/pages/category/category"
      });
    } else if (id === "rank") {
      wx.navigateTo({
        url: "/pages/hot/hot"
      });
    } else if (id === "custom") {
      wx.switchTab({
        url: "/pages/category/category"
      });
    }
  },

  onCategoryMore: function() {
    wx.switchTab({
      url: "/pages/category/category"
    });
  },

  onCategoryTap: function(e) {
    var name = e.currentTarget.dataset.name;
    wx.navigateTo({
      url: "/pages/category/category?name=" + encodeURIComponent(name)
    });
  },

  onWallpaperTap: function(e) {
    var wallpaper = e.currentTarget.dataset.item;
    if (wallpaper && wallpaper.id) {
      getApp().globalData.currentWallpaper = {
        category: wallpaper.category || "",
        subcategory: wallpaper.subcategory || "",
        filename: wallpaper.filename || wallpaper.id || "",
        displayTitle: wallpaper.displayTitle || "",
        resolution: wallpaper.resolution || null,
        size: wallpaper.size || 0,
        format: wallpaper.format || ""
      };
      wx.navigateTo({
        url: "/pages/detail/detail?id=" + wallpaper.id + "&url=" + encodeURIComponent(wallpaper.url || wallpaper.thumbnailUrl || "") + "&preview=" + encodeURIComponent(wallpaper.previewUrl || wallpaper.thumbnailUrl || "")
      });
    }
  },

  onImageError: function(e) {
    var list = e.currentTarget.dataset.list;
    var idx = e.currentTarget.dataset.index;
    var item = this.data[list][idx];
    if (!item) return;
    var key = list + "[" + idx + "].";
    if (item._fallbackStep === undefined) {
      item._fallbackStep = 1;
      this.setData({ [key + "thumbnailUrl"]: item.thumbnailCdnUrl || "" });
    } else if (item._fallbackStep === 1) {
      item._fallbackStep = 2;
      this.setData({ [key + "thumbnailUrl"]: item.thumbnailProxyUrl || "" });
    }
  },

  navigateToLatestList: function() {
    wx.navigateTo({
      url: "/pages/latest-list/latest-list"
    });
  }
});
