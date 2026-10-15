var wallpaperService = require("../../services/wallpaper");
var api = require("../../utils/api");

var CATEGORY_COVER_CACHE_KEY = "wp_cat_covers";

var CATEGORY_GRADIENTS = {
  "风景": ["#1a5276", "#2e86c1"],
  "动漫": ["#6c3483", "#a569bd"],
  "游戏": ["#1b4f72", "#2196f3"],
  "人像": ["#922b21", "#e74c3c"],
  "插画": ["#7d3c98", "#c39bd3"],
  "萌宠": ["#1e8449", "#58d68d"],
  "影视": ["#784212", "#d4ac0d"],
  "创意": ["#1a5276", "#48c9b0"],
  "通用": ["#2c3e50", "#7f8c8d"],
  "表情包": ["#b9770e", "#f5b041"],
  "IP形象": ["#884ea0", "#d2b4de"],
  "政治": ["#922b21", "#c0392b"]
};

function getCachedCovers() {
  try {
    var cached = wx.getStorageSync(CATEGORY_COVER_CACHE_KEY);
    if (cached && cached.ts && Date.now() - cached.ts < 24 * 60 * 60 * 1000) {
      return cached.covers || {};
    }
  } catch (e) {}
  return {};
}

function saveCachedCovers(covers) {
  try {
    wx.setStorageSync(CATEGORY_COVER_CACHE_KEY, { covers: covers, ts: Date.now() });
  } catch (e) {}
}

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
    var cachedCovers = getCachedCovers();
    wallpaperService.fetchCategories().then(function(categories) {
      var processed = categories.map(function(c) {
        if (cachedCovers[c.name]) {
          c.coverUrl = cachedCovers[c.name];
        } else {
          c.coverUrl = "";
        }
        var grad = CATEGORY_GRADIENTS[c.name] || ["#2c3e50", "#4a6fa5"];
        c.gradientFrom = grad[0];
        c.gradientTo = grad[1];
        return c;
      });
      that.setData({ categories: processed });
      that.refreshCoversInBackground(categories, cachedCovers);
    });
  },

  refreshCoversInBackground: function(categories, cachedCovers) {
    var that = this;
    var needsRefresh = [];
    for (var i = 0; i < categories.length; i++) {
      if (!cachedCovers[categories[i].name]) {
        needsRefresh.push(categories[i]);
      }
    }
    if (needsRefresh.length === 0) return;

    var index = 0;
    var updatedCovers = {};
    function loadNext() {
      if (index >= needsRefresh.length) {
        saveCachedCovers(updatedCovers);
        return;
      }
      var c = needsRefresh[index];
      index++;
      api.getWallpapers(c.name).then(function(wps) {
        if (wps && wps.length > 0) {
          var cover = wallpaperService.processWallpaper(wps[0]);
          var coverUrl = cover.thumbnailUrl || cover.previewUrl || "";
          if (coverUrl) {
            updatedCovers[c.name] = coverUrl;
            var cats = that.data.categories;
            for (var j = 0; j < cats.length; j++) {
              if (cats[j].name === c.name) {
                cats[j].coverUrl = coverUrl;
                break;
              }
            }
            that.setData({ categories: cats });
          }
        }
        setTimeout(loadNext, 200);
      }).catch(function() {
        setTimeout(loadNext, 200);
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
