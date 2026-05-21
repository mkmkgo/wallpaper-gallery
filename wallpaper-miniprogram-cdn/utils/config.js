var API_CONFIG = {
  CDN_DOMAINS: [
    "cdn.jsdmirror.com",
    "testingcf.jsdelivr.net",
    "cdn.jsdelivr.net"
  ],
  CDN_REPO: "/gh/mkmkgo/nuanXinProPic",
  RAW_BASE: "https://raw.githubusercontent.com/mkmkgo/nuanXinProPic",
  PROXY_BASE: "https://wsrv.nl",
  BING_CDN: "https://cn.bing.com"
};

var AD_CONFIG = {
  AD_UNIT_ID: "adunit-xxxxxxxxxxxxxxxx",
  AD_INTERSTITIAL_ID: "adunit-xxxxxxxxxxxxxxxx"
};

function fetchLatestCdnVersion(callback) {
  if (callback) callback();
}

module.exports = {
  API_CONFIG: API_CONFIG,
  AD_CONFIG: AD_CONFIG,
  fetchLatestCdnVersion: fetchLatestCdnVersion
};
