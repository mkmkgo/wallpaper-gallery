var config = require("../utils/config");

function encodePath(path) {
  if (!path) return "";
  var segments = path.split("/");
  for (var i = 0; i < segments.length; i++) {
    if (segments[i]) {
      segments[i] = encodeURIComponent(decodeURIComponent(segments[i]))
        .replace(/\(/g, "%28")
        .replace(/\)/g, "%29");
    }
  }
  return segments.join("/");
}

function buildRawUrl(path) {
  if (!path) return "";
  return config.API_CONFIG.RAW_BASE + encodePath(path);
}

function buildCdnUrl(path) {
  if (!path) return "";
  return config.API_CONFIG.CDN_BASE + "@" + config.API_CONFIG.CDN_VERSION + encodePath(path);
}

function buildProxyUrl(path) {
  if (!path) return "";
  var rawUrl = config.API_CONFIG.RAW_BASE + encodePath(path);
  return config.API_CONFIG.PROXY_BASE + "/?url=" + encodeURIComponent(rawUrl) + "&w=400&q=80&output=webp";
}

function buildImageUrl(path) {
  if (!path) return "";
  return buildRawUrl(path);
}

function processWallpaper(item) {
  if (!item) return null;
  item.thumbnailUrl = buildImageUrl(item.thumbnailPath || item.path || "");
  item.thumbnailCdnUrl = buildCdnUrl(item.thumbnailPath || item.path || "");
  item.thumbnailProxyUrl = buildProxyUrl(item.thumbnailPath || item.path || "");
  item.previewUrl = buildImageUrl(item.previewPath || item.path || "");
  item.previewCdnUrl = buildCdnUrl(item.previewPath || item.path || "");
  item.previewProxyUrl = buildProxyUrl(item.previewPath || item.path || "");
  item.url = buildImageUrl(item.path || "");
  item.urlCdnUrl = buildCdnUrl(item.path || "");
  item.urlProxyUrl = buildProxyUrl(item.path || "");
  item.downloadUrl = item.url;
  return item;
}

function fetchLatestWallpapers() {
  var api = require("../utils/api");
  return api.getLatestWallpapers().then(function(wallpapers) {
    if (!Array.isArray(wallpapers)) return [];
    return wallpapers.map(processWallpaper).filter(Boolean);
  }).catch(function(error) {
    console.error("获取最新壁纸失败:", error);
    return [];
  });
}

function fetchHotWallpapers() {
  var api = require("../utils/api");
  var statsPromise = api.getHotStats();
  var wallpapersPromise = api.getAllMobileWallpapers();

  return Promise.all([statsPromise, wallpapersPromise]).then(function(results) {
    var hotStats = results[0];
    var wallpapers = results[1];

    if (!Array.isArray(hotStats) || hotStats.length === 0) {
      return wallpapers.slice(0, 30).map(processWallpaper).filter(Boolean);
    }

    var statsMap = {};
    for (var i = 0; i < hotStats.length; i++) {
      var stat = hotStats[i];
      statsMap[stat.image_id] = stat.views + stat.downloads * 2;
    }

    var wallpaperMap = {};
    for (var k = 0; k < wallpapers.length; k++) {
      var wp = wallpapers[k];
      var fname = wp.filename || wp.id || "";
      if (fname) {
        wallpaperMap[fname] = wp;
      }
    }

    var scored = [];
    for (var j = 0; j < hotStats.length; j++) {
      var stat2 = hotStats[j];
      var matched = wallpaperMap[stat2.image_id];
      if (matched) {
        matched._hotScore = stat2.views + stat2.downloads * 2;
        matched._hotViews = stat2.views;
        matched._hotDownloads = stat2.downloads;
        scored.push(matched);
      }
    }

    scored.sort(function(a, b) {
      return b._hotScore - a._hotScore;
    });

    return scored.slice(0, 50).map(processWallpaper).filter(Boolean);
  }).catch(function(error) {
    console.error("获取热门壁纸失败:", error);
    return [];
  });
}

function fetchCategories() {
  var api = require("../utils/api");
  return api.getCategories().then(function(categories) {
    if (!Array.isArray(categories)) return [];
    return categories;
  }).catch(function(error) {
    console.error("获取分类失败:", error);
    return [];
  });
}

function fetchWallpapers(category) {
  var api = require("../utils/api");
  return api.getWallpapers(category).then(function(wallpapers) {
    if (!Array.isArray(wallpapers)) return [];
    return wallpapers.map(processWallpaper).filter(Boolean);
  }).catch(function(error) {
    console.error("获取壁纸失败:", error);
    return [];
  });
}

function fetchBingWallpapers() {
  var api = require("../utils/api");
  return api.getBingWallpapers().then(function(wallpapers) {
    if (!Array.isArray(wallpapers)) return [];
    return wallpapers.map(processWallpaper).filter(Boolean);
  }).catch(function(error) {
    console.error("获取Bing壁纸失败:", error);
    return [];
  });
}

function fetchDesktopWallpapers() {
  var api = require("../utils/api");
  return api.getDesktopWallpapers().then(function(wallpapers) {
    if (!Array.isArray(wallpapers)) return [];
    return wallpapers.map(processWallpaper).filter(Boolean);
  }).catch(function(error) {
    console.error("获取4K壁纸失败:", error);
    return [];
  });
}

module.exports = {
  buildImageUrl: buildImageUrl,
  buildCdnUrl: buildCdnUrl,
  buildRawUrl: buildRawUrl,
  buildProxyUrl: buildProxyUrl,
  encodePath: encodePath,
  fetchHotWallpapers: fetchHotWallpapers,
  fetchLatestWallpapers: fetchLatestWallpapers,
  fetchCategories: fetchCategories,
  fetchWallpapers: fetchWallpapers,
  fetchBingWallpapers: fetchBingWallpapers,
  fetchDesktopWallpapers: fetchDesktopWallpapers
};
