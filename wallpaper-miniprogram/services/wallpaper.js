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

function buildCdnUrl(path, cdnTag) {
  if (!path) return "";
  var tag = cdnTag || config.API_CONFIG.CDN_VERSION;
  var domain = config.API_CONFIG.CDN_DOMAINS[0];
  return "https://" + domain + config.API_CONFIG.CDN_REPO + "@" + tag + encodePath(path);
}

function buildFallbackCdnUrl(path, domainIndex, cdnTag) {
  if (!path) return "";
  var tag = cdnTag || config.API_CONFIG.CDN_VERSION;
  var domain = config.API_CONFIG.CDN_DOMAINS[domainIndex];
  if (!domain) return "";
  return "https://" + domain + config.API_CONFIG.CDN_REPO + "@" + tag + encodePath(path);
}

function buildRawUrl(path) {
  if (!path) return "";
  return config.API_CONFIG.RAW_BASE + "/" + config.API_CONFIG.CDN_VERSION.replace("v", "") + encodePath(path);
}

function buildProxyUrl(path) {
  if (!path) return "";
  var rawUrl = buildRawUrl(path);
  return config.API_CONFIG.PROXY_BASE + "/?url=" + encodeURIComponent(rawUrl) + "&w=400&q=80&output=webp";
}

function buildBingThumbnailUrl(urlbase) {
  if (!urlbase) return "";
  return config.API_CONFIG.BING_CDN + urlbase + "_400x240.jpg";
}

function buildBingPreviewUrl(urlbase) {
  if (!urlbase) return "";
  return config.API_CONFIG.BING_CDN + urlbase + "_1920x1080.jpg";
}

function buildBingUHDUrl(urlbase) {
  if (!urlbase) return "";
  return config.API_CONFIG.BING_CDN + urlbase + "_UHD.jpg";
}

function buildImageUrl(path, cdnTag) {
  if (!path) return "";
  return buildCdnUrl(path, cdnTag);
}

function processWallpaper(item) {
  if (!item) return null;
  var cdnTag = item.cdnTag || null;
  var isBing = !!(item.urlbase || item.isBing);

  if (isBing) {
    item.thumbnailUrl = buildBingThumbnailUrl(item.urlbase);
    item.previewUrl = buildBingPreviewUrl(item.urlbase);
    item.url = buildBingUHDUrl(item.urlbase);
    item.downloadUrl = item.url;
    item.thumbnailCdnUrl = item.thumbnailUrl;
    item.previewCdnUrl = item.previewUrl;
    item.thumbnailProxyUrl = "";
    item.previewProxyUrl = "";
    item.urlCdnUrl = item.url;
    item.urlProxyUrl = "";
  } else {
    item.thumbnailUrl = buildImageUrl(item.thumbnailPath || item.path || "", cdnTag);
    item.thumbnailCdnUrl = buildFallbackCdnUrl(item.thumbnailPath || item.path || "", 1, cdnTag);
    item.thumbnailProxyUrl = buildProxyUrl(item.thumbnailPath || item.path || "");
    item.previewUrl = buildImageUrl(item.previewPath || item.path || "", cdnTag);
    item.previewCdnUrl = buildFallbackCdnUrl(item.previewPath || item.path || "", 1, cdnTag);
    item.previewProxyUrl = buildProxyUrl(item.previewPath || item.path || "");
    item.url = buildImageUrl(item.path || "", cdnTag);
    item.urlCdnUrl = buildFallbackCdnUrl(item.path || "", 1, cdnTag);
    item.urlProxyUrl = buildProxyUrl(item.path || "");
    item.downloadUrl = item.url;
  }
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
  return api.getHotStats().then(function(hotStats) {
    if (!Array.isArray(hotStats) || hotStats.length === 0) {
      return api.getLatestWallpapers().then(function(wps) {
        return wps.slice(0, 30).map(processWallpaper).filter(Boolean);
      });
    }
    var statsMap = {};
    for (var i = 0; i < hotStats.length; i++) {
      var stat = hotStats[i];
      statsMap[stat.image_id] = stat;
    }
    var topIds = hotStats.slice(0, 80).map(function(s) { return s.image_id; });
    return api.getWallpapersByIds(topIds).then(function(wallpapers) {
      var wpMap = {};
      for (var k = 0; k < wallpapers.length; k++) {
        var wp = wallpapers[k];
        var fname = wp.filename || wp.id || "";
        if (fname) wpMap[fname] = wp;
      }
      var scored = [];
      for (var j = 0; j < hotStats.length; j++) {
        var stat2 = hotStats[j];
        var matched = wpMap[stat2.image_id];
        if (matched) {
          matched._hotScore = stat2.views + stat2.downloads * 2;
          scored.push(matched);
        }
      }
      scored.sort(function(a, b) { return b._hotScore - a._hotScore; });
      return scored.slice(0, 50).map(processWallpaper).filter(Boolean);
    });
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
  buildFallbackCdnUrl: buildFallbackCdnUrl,
  buildBingThumbnailUrl: buildBingThumbnailUrl,
  buildBingPreviewUrl: buildBingPreviewUrl,
  buildBingUHDUrl: buildBingUHDUrl,
  encodePath: encodePath,
  processWallpaper: processWallpaper,
  fetchHotWallpapers: fetchHotWallpapers,
  fetchLatestWallpapers: fetchLatestWallpapers,
  fetchCategories: fetchCategories,
  fetchWallpapers: fetchWallpapers,
  fetchBingWallpapers: fetchBingWallpapers,
  fetchDesktopWallpapers: fetchDesktopWallpapers
};
