var config = require("./config");
var format = require("./format");

function request(url) {
  return new Promise(function(resolve) {
    wx.request({
      url: url,
      method: "GET",
      timeout: 15000,
      success: function(res) {
        resolve(res.data);
      },
      fail: function(error) {
        console.error("请求失败:", url, error);
        resolve(null);
      }
    });
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
  return request(config.API_CONFIG.BASE_URL + "/data/stats/hot-mobile.json").then(function(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return [];
  });
}

function getLatestWallpapers() {
  return request(config.API_CONFIG.BASE_URL + "/data/mobile/latest.json").then(decodeResponse);
}

function getCategories() {
  return request(config.API_CONFIG.BASE_URL + "/data/mobile/index.json").then(decodeResponse);
}

function getWallpapers(category) {
  return request(config.API_CONFIG.BASE_URL + "/data/mobile/" + encodeURIComponent(category) + ".json").then(decodeResponse);
}

function getCategoryNames() {
  return request(config.API_CONFIG.BASE_URL + "/data/mobile/index.json").then(function(data) {
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

function getAllMobileWallpapers() {
  return getCategoryNames().then(function(names) {
    if (!names || names.length === 0) return [];
    var promises = names.map(function(name) {
      return request(config.API_CONFIG.BASE_URL + "/data/mobile/" + encodeURIComponent(name) + ".json").then(decodeResponse).catch(function() {
        return [];
      });
    });
    return Promise.all(promises).then(function(results) {
      var all = [];
      for (var i = 0; i < results.length; i++) {
        if (Array.isArray(results[i])) {
          all = all.concat(results[i]);
        }
      }
      return all;
    });
  });
}

function getBingWallpapers() {
  return request(config.API_CONFIG.BASE_URL + "/data/bing/latest.json").then(decodeResponse);
}

function getDesktopWallpapers() {
  return request(config.API_CONFIG.BASE_URL + "/data/desktop/latest.json").then(decodeResponse);
}

module.exports = {
  getHotStats: getHotStats,
  getLatestWallpapers: getLatestWallpapers,
  getCategories: getCategories,
  getWallpapers: getWallpapers,
  getAllMobileWallpapers: getAllMobileWallpapers,
  getBingWallpapers: getBingWallpapers,
  getDesktopWallpapers: getDesktopWallpapers
};
