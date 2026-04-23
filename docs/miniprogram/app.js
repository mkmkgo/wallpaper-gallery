App({
  onLaunch() {
    this.initData()
  },

  initData() {
    // 初始化全局数据
    this.globalData = {
      cdnBase: "https://cdn.jsdelivr.net/gh/mkmkgo/nuanXinProPic@main",
      apiBase: "",
      imageProxy: "https://wsrv.nl/",
      isLoading: false,
      dataBasePath: "data",
      selectedCategory: null
    }
  },

  globalData: {
    cdnBase: "https://cdn.jsdelivr.net/gh/mkmkgo/nuanXinProPic@main",
    apiBase: "",
    imageProxy: "https://wsrv.nl/",
    isLoading: false,
    dataBasePath: "data",
    selectedCategory: null
  }
})