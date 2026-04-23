Component({
  properties: {
    active: {
      type: String,
      value: 'index'
    }
  },

  methods: {
    switchTab(e) {
      const tab = e.currentTarget.dataset.tab
      let url = '/pages/index/index'
      
      if (tab === 'index') {
        url = '/pages/index/index'
      } else if (tab === 'category') {
        url = '/pages/category/category'
      } else if (tab === 'user') {
        url = '/pages/user/user'
      }
      
      wx.navigateTo({
        url: url
      })
    }
  }
})