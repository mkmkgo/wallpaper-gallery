Page({
  data: {
    category: null,
    categories: [],
    wallpapers: [],
    isLoading: true
  },

  onLoad(options) {
    this.checkSelectedCategory()
  },

  onShow() {
    this.checkSelectedCategory()
  },

  checkSelectedCategory() {
    const app = getApp()
    const selectedCategory = app.globalData.selectedCategory

    if (selectedCategory) {
      this.setData({ category: selectedCategory })
      this.loadCategoryWallpapers()
      app.globalData.selectedCategory = null
    } else {
      this.loadCategories()
    }
  },

  decodeData(encoded) {
    const VERSION_PREFIX = 'v1.'
    const CHAR_MAP_DECODE = {
      'Q': 'A', 'W': 'B', 'E': 'C', 'R': 'D', 'T': 'E', 'Y': 'F', 'U': 'G', 'I': 'H', 'O': 'I', 'P': 'J',
      'A': 'K', 'S': 'L', 'D': 'M', 'F': 'N', 'G': 'O', 'H': 'P', 'J': 'Q', 'K': 'R', 'L': 'S', 'Z': 'T',
      'X': 'U', 'C': 'V', 'V': 'W', 'B': 'X', 'N': 'Y', 'M': 'Z',
      'q': 'a', 'w': 'b', 'e': 'c', 'r': 'd', 't': 'e', 'y': 'f', 'u': 'g', 'i': 'h', 'o': 'i', 'p': 'j',
      'a': 'k', 's': 'l', 'd': 'm', 'f': 'n', 'g': 'o', 'h': 'p', 'j': 'q', 'k': 'r', 'l': 's', 'z': 't',
      'x': 'u', 'c': 'v', 'v': 'w', 'b': 'x', 'n': 'y', 'm': 'z',
      '5': '0', '6': '1', '7': '2', '8': '3', '9': '4', '0': '5', '1': '6', '2': '7', '3': '8', '4': '9',
      '-': '+', '_': '/', '.': '='
    }

    if (!encoded.startsWith(VERSION_PREFIX)) {
      throw new Error('Invalid data format')
    }
    const reversed = encoded.slice(VERSION_PREFIX.length).split('').reverse().join('')
    const base64 = reversed.split('').map(c => CHAR_MAP_DECODE[c] || c).join('')
    return decodeURIComponent(escape(atob(base64)))
  },

  loadCategories() {
    const app = getApp()
    const cdnBase = app.globalData.cdnBase

    console.log('Loading categories from website...')

    wx.request({
      url: 'https://wall.202597.xyz/data/mobile/index.json?v=1.2.66',
      method: 'GET',
      success: (res) => {
        console.log('Categories response:', res)
        if (res.statusCode === 200 && res.data) {
          let categories = []

          if (res.data.blob) {
            try {
              const decodedData = this.decodeData(res.data.blob)
              const indexData = JSON.parse(decodedData)
              console.log('Decoded index data from blob:', indexData)

              if (indexData.categories) {
                if (Array.isArray(indexData.categories)) {
                  categories = indexData.categories.map(category => ({
                    id: category.id || category._id || Math.random().toString(36).substr(2, 9),
                    name: category.name || '分类',
                    thumbnail: category.cover ? cdnBase + category.cover : ''
                  }))
                } else if (typeof indexData.categories === 'object') {
                  categories = Object.keys(indexData.categories).map(key => {
                    const category = indexData.categories[key]
                    return {
                      id: key,
                      name: category.name || key,
                      thumbnail: category.cover ? cdnBase + category.cover : ''
                    }
                  })
                }
              }
            } catch (e) {
              console.error('Error decoding index blob data:', e)
            }
          }

          console.log('Processed categories:', categories)
          this.setData({ categories })
        }
      },
      fail: (err) => {
        console.error('Error fetching categories:', err)
      },
      complete: () => {
        this.setData({ isLoading: false })
      }
    })
  },

  loadCategoryWallpapers() {
    const app = getApp()
    const cdnBase = app.globalData.cdnBase
    const category = this.data.category

    if (!category) return

    console.log('Loading category wallpapers from website for:', category.name)

    wx.request({
      url: `https://wall.202597.xyz/data/mobile/${category.id}.json?v=1.2.66`,
      method: 'GET',
      success: (res) => {
        console.log('Category wallpapers response:', res)
        if (res.statusCode === 200 && res.data) {
          let wallpaperList = []

          if (res.data.blob) {
            try {
              const decodedData = this.decodeData(res.data.blob)
              wallpaperList = JSON.parse(decodedData)
              console.log('Decoded wallpaper list from blob:', wallpaperList)
            } catch (e) {
              console.error('Error decoding blob data:', e)
            }
          }

          if (wallpaperList.length > 0) {
            const wallpapers = wallpaperList.map(item => {
              return {
                id: item.id || item._id || Math.random().toString(36).substr(2, 9),
                title: item.title || item.filename || '壁纸',
                tags: item.tags || [],
                imageUrl: cdnBase + item.path,
                thumbnailUrl: item.thumbnailPath ? cdnBase + item.thumbnailPath : cdnBase + item.path
              }
            })
            console.log('Processed category wallpapers:', wallpapers)
            this.setData({ wallpapers })
          }
        }
      },
      fail: (err) => {
        console.error('Error fetching category wallpapers:', err)
      },
      complete: () => {
        this.setData({ isLoading: false })
      }
    })
  },

  goToCategoryWallpapers(e) {
    const category = e.currentTarget.dataset.category
    wx.navigateTo({
      url: `/pages/category/category?category=${encodeURIComponent(JSON.stringify(category))}`
    })
  },

  goToDetail(e) {
    const wallpaper = e.currentTarget.dataset.wallpaper
    wx.navigateTo({
      url: `/pages/detail/detail?wallpaper=${encodeURIComponent(JSON.stringify(wallpaper))}`
    })
  }
})