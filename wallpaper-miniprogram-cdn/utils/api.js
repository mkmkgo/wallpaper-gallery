var config = require("./config");
var format = require("./format");

var CACHE_PREFIX = "wp_cache_";
var CACHE_DURATION = 5 * 60 * 1000;

var _cdnVersion = null;
var _cdnVersionTime = 0;
var _versionPromise = null;
var VERSION_CACHE_MS = 2 * 60 * 1000;

function getCdnVersion() {
  if (_cdnVersion && Date.now() - _cdnVersionTime < VERSION_CACHE_MS) {
    return Promise.resolve(_cdnVersion);
  }
  _cdnVersion = null;
  if (_versionPromise) return _versionPromise;
  _versionPromise = new Promise(function(resolve) {
    var cached = wx.getStorageSync("wp_cdn_ver");
    if (cached && Date.now() - cached.ts < VERSION_CACHE_MS) {
      _cdnVersion = cached.v;
      _cdnVersionTime = Date.now();
      _versionPromise = null;
      resolve(_cdnVersion);
      return;
    }
    wx.request({
      url: "https://data.jsdelivr.com/v1/packages/gh/mkmkgo/nuanXinProPic",
      method: "GET",
      timeout: 8000,
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.versions && res.data.versions.length > 0) {
          _cdnVersion = res.data.versions[0].version;
          _cdnVersionTime = Date.now();
          try { wx.setStorageSync("wp_cdn_ver", { v: _cdnVersion, ts: Date.now() }); } catch (e) {}
          _versionPromise = null;
          resolve(_cdnVersion);
        } else {
          _versionPromise = null;
          resolve(null);
        }
      },
      fail: function() {
        _versionPromise = null;
        resolve(null);
      }
    });
  });
  return _versionPromise;
}

function getCacheKey(url) {
  return CACHE_PREFIX + url.replace(/[^a-zA-Z0-9]/g, "_");
}

function getCache(url) {
  try {
    var key = getCacheKey(url);
    var cached = wx.getStorageSync(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      wx.removeStorageSync(key);
      return null;
    }
    return cached.data;
  } catch (e) {
    return null;
  }
}

function setCache(url, data) {
  try {
    var key = getCacheKey(url);
    wx.setStorageSync(key, { data: data, timestamp: Date.now() });
  } catch (e) {
    try {
      wx.clearStorageSync();
      var key2 = getCacheKey(url);
      wx.setStorageSync(key2, { data: data, timestamp: Date.now() });
    } catch (e2) {}
  }
}

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

function buildCacheBuster() {
  var now = new Date();
  var y = now.getFullYear();
  var m = now.getMonth() + 1;
  var d = now.getDate();
  var h = now.getHours();
  var mi = now.getMinutes();
  return "" + y + (m < 10 ? "0" + m : "" + m) + (d < 10 ? "0" + d : "" + d) + (h < 10 ? "0" + h : "" + h) + (mi < 10 ? "0" + mi : "" + mi);
}

function buildCdnUrl(path, domainIndex, version) {
  var idx = domainIndex || 0;
  var domain = config.API_CONFIG.CDN_DOMAINS[idx] || config.API_CONFIG.CDN_DOMAINS[0];
  var ref = version ? "@" + version : "@main";
  var cleanPath = encodePath(path).replace(/^\//, "");
  return "https://" + domain + config.API_CONFIG.CDN_REPO + ref + "/" + cleanPath + "?v=" + buildCacheBuster();
}

function buildAllUrls(path, version) {
  var urls = [];
  for (var i = 0; i < config.API_CONFIG.CDN_DOMAINS.length; i++) {
    urls.push(buildCdnUrl(path, i, version));
  }
  return urls;
}

function request(path, retries) {
  var maxRetries = retries !== undefined ? retries : 2;
  return getCdnVersion().then(function(version) {
    var allUrls = buildAllUrls(path, version);
    var cacheKey = allUrls[0];
    var cached = getCache(cacheKey);
    if (cached !== null) {
      return Promise.resolve(cached);
    }
    function tryUrl(index, remaining) {
      if (index >= allUrls.length) return Promise.resolve(null);
      var currentUrl = allUrls[index];
      return new Promise(function(resolve) {
        wx.request({
          url: currentUrl,
          method: "GET",
          timeout: 15000,
          success: function(res) {
            if (res.statusCode === 200 && res.data) {
              setCache(cacheKey, res.data);
              resolve(res.data);
            } else if (remaining > 0) {
              resolve(tryUrl(index, remaining - 1));
            } else {
              resolve(tryUrl(index + 1, maxRetries));
            }
          },
          fail: function(error) {
            console.error("请求失败:", currentUrl, error);
            if (remaining > 0) {
              setTimeout(function() {
                resolve(tryUrl(index, remaining - 1));
              }, 500);
            } else {
              resolve(tryUrl(index + 1, maxRetries));
            }
          }
        });
      });
    }
    return tryUrl(0, maxRetries);
  });
}

function decodeResponse(data) {
  if (!data) return [];
  try {
    if (data.blob) {
      var decoded = format.decodeData(data.blob);
      var parsed = JSON.parse(decoded);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && parsed.wallpapers && Array.isArray(parsed.wallpapers)) return parsed.wallpapers;
      if (parsed && parsed.categories && Array.isArray(parsed.categories)) return parsed.categories;
      return [];
    }
    if (data.payload) {
      var decoded2 = format.decodeData(data.payload);
      var parsed2 = JSON.parse(decoded2);
      if (Array.isArray(parsed2)) return parsed2;
      if (parsed2 && parsed2.wallpapers && Array.isArray(parsed2.wallpapers)) return parsed2.wallpapers;
      if (parsed2 && parsed2.categories && Array.isArray(parsed2.categories)) return parsed2.categories;
      return [];
    }
    if (Array.isArray(data)) return data;
    if (data.wallpapers && Array.isArray(data.wallpapers)) return data.wallpapers;
    if (data.categories && Array.isArray(data.categories)) return data.categories;
    return [];
  } catch (error) {
    console.error("解析数据失败:", error);
    return [];
  }
}

function getHotStats() {
  return request("/data/stats/hot-mobile.json", 1).then(function(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return [];
  });
}

function getLatestWallpapers() {
  return request("/data/mobile/latest.json").then(decodeResponse);
}

function getCategories() {
  return request("/data/mobile/index.json").then(decodeResponse);
}

function getWallpapers(category) {
  return request("/data/mobile/" + encodeURIComponent(category) + ".json").then(decodeResponse);
}

function getCategoryNames() {
  return request("/data/mobile/index.json", 1).then(function(data) {
    if (!data) return [];
    var categories = [];
    try {
      if (data.blob) {
        var decoded = format.decodeData(data.blob);
        var parsed = JSON.parse(decoded);
        if (parsed && parsed.categories && Array.isArray(parsed.categories)) {
          categories = parsed.categories;
        } else if (Array.isArray(parsed)) {
          categories = parsed;
        }
      } else if (Array.isArray(data)) {
        categories = data;
      } else if (data.categories && Array.isArray(data.categories)) {
        categories = data.categories;
      }
    } catch (e) {
      console.error("解析分类数据失败:", e);
    }
    return categories.map(function(c) {
      return c.name || c;
    }).filter(function(n) {
      return n && typeof n === "string";
    });
  });
}

function getWallpapersByIds(ids) {
  if (!ids || ids.length === 0) return Promise.resolve([]);
  return getCategoryNames().then(function(names) {
    if (!names || names.length === 0) return [];
    var idSet = {};
    for (var i = 0; i < ids.length; i++) {
      idSet[ids[i]] = true;
    }
    var batchSize = 3;
    var results = [];
    var index = 0;
    function loadBatch() {
      if (index >= names.length) {
        return Promise.resolve(results);
      }
      var batch = names.slice(index, index + batchSize);
      index += batchSize;
      var promises = batch.map(function(name) {
        return request("/data/mobile/" + encodeURIComponent(name) + ".json", 1)
          .then(decodeResponse)
          .catch(function() { return []; });
      });
      return Promise.all(promises).then(function(batchResults) {
        for (var b = 0; b < batchResults.length; b++) {
          var wps = batchResults[b];
          for (var w = 0; w < wps.length; w++) {
            var wp = wps[w];
            var fname = wp.filename || wp.id || "";
            if (idSet[fname]) {
              results.push(wp);
            }
          }
        }
        if (results.length >= ids.length || index >= names.length) {
          return results;
        }
        return loadBatch();
      });
    }
    return loadBatch();
  });
}

function getBingWallpapers() {
  return request("/data/bing/latest.json").then(decodeResponse);
}

function getDesktopWallpapers() {
  return request("/data/desktop/latest.json").then(decodeResponse);
}

function getDesktopCategories() {
  return request("/data/desktop/index.json").then(decodeResponse);
}

function getDesktopWallpapersByCategory(category) {
  return request("/data/desktop/" + encodeURIComponent(category) + ".json").then(decodeResponse);
}

function getCollections() {
  return request("/data/collections.json", 1).then(function(data) {
    if (!data) return [];
    if (data.collections && Array.isArray(data.collections)) return data.collections;
    if (Array.isArray(data)) return data;
    return [];
  });
}

function getCollectionWallpapers(items) {
  if (!items || items.length === 0) return Promise.resolve([]);
  var categoryMap = {};
  for (var i = 0; i < items.length; i++) {
    var cat = items[i].category;
    if (!categoryMap[cat]) categoryMap[cat] = [];
    categoryMap[cat].push(items[i].filename);
  }
  var categories = Object.keys(categoryMap);
  var promises = categories.map(function(cat) {
    return request("/data/mobile/" + encodeURIComponent(cat) + ".json", 1)
      .then(decodeResponse)
      .catch(function() { return []; });
  });
  return Promise.all(promises).then(function(results) {
    var filenameSet = {};
    for (var j = 0; j < items.length; j++) {
      filenameSet[items[j].filename] = true;
    }
    var matched = [];
    for (var r = 0; r < results.length; r++) {
      var wps = results[r];
      for (var w = 0; w < wps.length; w++) {
        var fname = wps[w].filename || wps[w].id || "";
        if (filenameSet[fname]) {
          matched.push(wps[w]);
        }
      }
    }
    return matched;
  });
}

function clearCache() {
  _cdnVersion = null;
  _cdnVersionTime = 0;
  _versionPromise = null;
  try {
    var res = wx.getStorageInfoSync();
    var keys = res.keys || [];
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf(CACHE_PREFIX) === 0 || keys[i] === "wp_cdn_ver") {
        wx.removeStorageSync(keys[i]);
      }
    }
  } catch (e) {}
}

module.exports = {
  getHotStats: getHotStats,
  getLatestWallpapers: getLatestWallpapers,
  getCategories: getCategories,
  getWallpapers: getWallpapers,
  getCategoryNames: getCategoryNames,
  getWallpapersByIds: getWallpapersByIds,
  getBingWallpapers: getBingWallpapers,
  getDesktopWallpapers: getDesktopWallpapers,
  getDesktopCategories: getDesktopCategories,
  getDesktopWallpapersByCategory: getDesktopWallpapersByCategory,
  getCollections: getCollections,
  getCollectionWallpapers: getCollectionWallpapers,
  clearCache: clearCache
};
