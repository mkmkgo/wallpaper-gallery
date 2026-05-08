var DEFAULT_CDN_VERSION = "v1.3.3";
var DEFAULT_CACHE_BUSTER = "?v=v1.3.3";

var API_CONFIG = {
  BASE_URL: "https://wall.202597.xyz",
  CDN_DOMAINS: [
    "cdn.jsdmirror.com",
    "testingcf.jsdelivr.net",
    "cdn.jsdelivr.net"
  ],
  CDN_VERSION: DEFAULT_CDN_VERSION,
  CDN_REPO: "/gh/mkmkgo/nuanXinProPic",
  RAW_BASE: "https://raw.githubusercontent.com/mkmkgo/nuanXinProPic",
  PROXY_BASE: "https://wsrv.nl",
  BING_CDN: "https://cn.bing.com",
  CACHE_BUSTER: DEFAULT_CACHE_BUSTER,
  VERSION_API: "https://api.github.com/repos/mkmkgo/nuanXinProPic/tags?per_page=1"
};

var AD_CONFIG = {
  AD_UNIT_ID: "adunit-xxxxxxxxxxxxxxxx",
  AD_INTERSTITIAL_ID: "adunit-xxxxxxxxxxxxxxxx"
};

var _versionFetched = false;

function fetchLatestCdnVersion() {
  if (_versionFetched) return;
  try {
    var cached = wx.getStorageSync("wp_cdn_version");
    if (cached && cached.version && (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000)) {
      API_CONFIG.CDN_VERSION = cached.version;
      API_CONFIG.CACHE_BUSTER = "?v=" + cached.version;
      _versionFetched = true;
      return;
    }
  } catch (e) {}

  wx.request({
    url: API_CONFIG.VERSION_API,
    method: "GET",
    timeout: 8000,
    success: function(res) {
      if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0) {
        var tag = res.data[0].name;
        if (tag && tag.indexOf("v") === 0) {
          API_CONFIG.CDN_VERSION = tag;
          API_CONFIG.CACHE_BUSTER = "?v=" + tag;
          _versionFetched = true;
          try {
            wx.setStorageSync("wp_cdn_version", { version: tag, timestamp: Date.now() });
          } catch (e) {}
        }
      }
    },
    fail: function() {}
  });
}

module.exports = {
  API_CONFIG: API_CONFIG,
  AD_CONFIG: AD_CONFIG,
  fetchLatestCdnVersion: fetchLatestCdnVersion
};
