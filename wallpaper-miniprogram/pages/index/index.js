var wallpaperService = require("../../services/wallpaper");
var api = require("../../utils/api");
var config = require("../../utils/config");

Page({
  data: {
    quickNav: [
      { id: "hot", name: "热门", color: "#FF6B6B" },
      { id: "new", name: "最新", color: "#4ECDC4" },
      { id: "bing", name: "Bing", color: "#45B7D1" },
      { id: "4k", name: "4K", color: "#96CEB4" },
      { id: "category", name: "分类", color: "#DDA0DD" }
    ],
    collections: [],
    latestWallpapers: [],
    portraitWallpapers: [],
    animeWallpapers: [],
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
      this.setData({ statusBarHeight: statusBarHeight, navBarHeight: navBarHeight });
    } catch (e) {
      this.setData({ statusBarHeight: statusBarHeight, navBarHeight: 44 });
    }
    this.loadData();
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  onPullDownRefresh: function() {
    api.clearCache();
    this.loadData();
  },

  loadData: function() {
    var that = this;
    that.setData({ loading: true });

    api.getCollections().then(function(collections) {
      if (collections.length > 0) {
        var processed = collections.map(function(c) {
          c.coverUrl = c.cover ? wallpaperService.buildImageUrl(c.cover) : "";
          return c;
        });
        that.setData({ collections: processed });
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

    wallpaperService.fetchWallpapers("人像").then(function(wallpapers) {
      var shuffled = that.shuffleArray(wallpapers);
      that.setData({ portraitWallpapers: shuffled.slice(0, 20) });
    });

    wallpaperService.fetchWallpapers("动漫").then(function(animeWps) {
      wallpaperService.fetchWallpapers("游戏").then(function(gameWps) {
        var combined = animeWps.concat(gameWps);
        var shuffled = that.shuffleArray(combined);
        that.setData({ animeWallpapers: shuffled.slice(0, 20) });
      });
    });
  },

  shuffleArray: function(arr) {
    var array = arr.slice();
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  },

  onQuickNav: function(e) {
    var id = e.currentTarget.dataset.id;
    if (id === "hot") {
      wx.navigateTo({ url: "/pages/hot/hot" });
    } else if (id === "new") {
      wx.navigateTo({ url: "/pages/latest-list/latest-list" });
    } else if (id === "bing") {
      wx.navigateTo({ url: "/pages/bing-list/bing-list" });
    } else if (id === "4k") {
      wx.navigateTo({ url: "/pages/desktop-list/desktop-list" });
    } else if (id === "category") {
      wx.switchTab({ url: "/pages/category/category" });
    }
  },

  onCollectionTap: function(e) {
    var collection = e.currentTarget.dataset.item;
    if (!collection) return;
    wx.navigateTo({
      url: "/pages/collection-detail/collection-detail?data=" + encodeURIComponent(JSON.stringify({
        name: collection.name,
        items: collection.items || []
      }))
    });
  },

  onWallpaperTap: function(e) {
    var wallpaper = e.currentTarget.dataset.item;
    if (wallpaper && wallpaper.id) {
      this.navigateToDetail(wallpaper);
    }
  },

  navigateToDetail: function(wallpaper) {
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
  },

  onImageError: function(e) {
    var list = e.currentTarget.dataset.list;
    var idx = e.currentTarget.dataset.index;
    var item = this.data[list][idx];
    if (!item) return;
    var key = list + "[" + idx + "].";
    if (item._fallbackStep === undefined) {
      item._fallbackStep = 1;
      this.setData({ [key + "thumbnailUrl"]: item.thumbnailCdnUrl || item.thumbnailProxyUrl || "" });
    } else if (item._fallbackStep === 1) {
      item._fallbackStep = 2;
      this.setData({ [key + "thumbnailUrl"]: item.thumbnailProxyUrl || "" });
    }
  },

  navigateToLatestList: function() {
    wx.navigateTo({ url: "/pages/latest-list/latest-list" });
  },

  navigateToCategory: function(e) {
    var name = e.currentTarget.dataset.name;
    wx.navigateTo({
      url: "/pages/category/category?name=" + encodeURIComponent(name)
    });
  }
});
