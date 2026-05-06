Component({
  data: {
    selected: 0,
    visible: true,
    list: [
      { pagePath: "/pages/index/index", text: "首页", icon: "home" },
      { pagePath: "/pages/category/category", text: "分类", icon: "grid" },
      { pagePath: "/pages/latest/latest", text: "最新", icon: "clock" }
    ]
  },

  pageLifetimes: {
    show: function() {
      var that = this;
      var pages = getCurrentPages();
      var currentPage = pages[pages.length - 1];
      if (!currentPage) return;
      var route = "/" + currentPage.route;
      var isTab = false;
      var list = that.data.list;
      for (var i = 0; i < list.length; i++) {
        if (list[i].pagePath === route) {
          isTab = true;
          that.setData({ selected: i, visible: true });
          break;
        }
      }
      if (!isTab) {
        that.setData({ visible: false });
      }
    }
  },

  methods: {
    switchTab: function(e) {
      var data = e.currentTarget.dataset;
      var url = data.path;
      wx.switchTab({ url: url });
    }
  }
});
