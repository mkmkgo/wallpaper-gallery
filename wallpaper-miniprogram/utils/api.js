var config = require("./config");
var format = require("./format");

var CACHE_PREFIX = "wp_cache_";
var CACHE_DURATION = 30 * 60 * 1000;

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

function request(url, retries) {
  var maxRetries = retries !== undefined ? retries : 2;
  var cached = getCache(url);
  if (cached !== null) {
    return Promise.resolve(cached);
  }

  function attempt(remaining) {
    return new Promise(function(resolve) {
      wx.request({
        url: url,
        method: "GET",
        timeout: 15000,
        success: function(res) {
          if (res.statusCode === 200 && res.data) {
            setCache(url, res.data);
            resolve(res.data);
          } else if (remaining > 0) {
            resolve(attempt(remaining - 1));
          } else {
            resolve(null);
          }
        },
        fail: function(error) {
          console.error("请求失败:", url, error);
          if (remaining > 0) {
            setTimeout(function() {
              resolve(attempt(remaining - 1));
            }, 1000);
          } else {
            resolve(null);
          }
        }
      });
    });
  }

  return attempt(maxRetries);
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

function buildUrl(path) {
  return config.API_CONFIG.BASE_URL + path + config.API_CONFIG.CACHE_BUSTER;
}

function getHotStats() {
  return request(buildUrl("/data/stats/hot-mobile.json"), 1).then(function(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return [];
  });
}

function getLatestWallpapers() {
  return request(buildUrl("/data/mobile/latest.json")).then(decodeResponse);
}

function getCategories() {
  return request(buildUrl("/data/mobile/index.json")).then(decodeResponse);
}

function getWallpapers(category) {
  return request(buildUrl("/data/mobile/" + encodeURIComponent(category) + ".json")).then(decodeResponse);
}

function getCategoryNames() {
  return request(buildUrl("/data/mobile/index.json"), 1).then(function(data) {
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
        return request(buildUrl("/data/mobile/" + encodeURIComponent(name) + ".json"), 1)
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
  return request(buildUrl("/data/bing/latest.json")).then(decodeResponse);
}

function getDesktopWallpapers() {
  return request(buildUrl("/data/desktop/latest.json")).then(decodeResponse);
}

function getDesktopCategories() {
  return request(buildUrl("/data/desktop/index.json")).then(decodeResponse);
}

function getDesktopWallpapersByCategory(category) {
  return request(buildUrl("/data/desktop/" + encodeURIComponent(category) + ".json")).then(decodeResponse);
}

function getCollections() {
  return request(buildUrl("/data/collections.json"), 1).then(function(data) {
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
    return request(buildUrl("/data/mobile/" + encodeURIComponent(cat) + ".json"), 1)
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
  try {
    var res = wx.getStorageInfoSync();
    var keys = res.keys || [];
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf(CACHE_PREFIX) === 0) {
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
