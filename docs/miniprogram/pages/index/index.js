Page({
  data: {
    featuredWallpapers: [],
    latestWallpapers: [],
    categories: [],
    isLoading: true
  },

  onLoad() {
    const cdnBase = 'https://cdn.jsdelivr.net/gh/mkmkgo/nuanXinProPic@main'

    console.log('CDN Base:', cdnBase)

    this.loadLocalData(cdnBase)
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

  loadLocalData(cdnBase) {
    console.log('Loading data from website...')

    wx.request({
      url: 'https://wall.202597.xyz/data/mobile/latest.json',
      method: 'GET',
      success: (res) => {
        console.log('Latest wallpapers response:', res)
        if (res.statusCode === 200 && res.data) {
          let wallpaperList = []

          if (res.data.blob) {
            console.log('Response has blob, decoding...')
            try {
              const decodedData = this.decodeData(res.data.blob)
              wallpaperList = JSON.parse(decodedData)
              console.log('Decoded wallpaper list from blob:', wallpaperList)
            } catch (e) {
              console.error('Error decoding blob data:', e)
              if (res.data.blob) {
                console.error('Blob data preview:', res.data.blob.substring(0, 100))
              }
              this.useMockData()
              return
            }
          } else {
            console.error('No blob data found in response')
            this.useMockData()
            return
          }

          console.log('Final wallpaper list:', wallpaperList)
          console.log('Wallpaper list length:', wallpaperList.length)

          if (wallpaperList.length > 0) {
            const wallpapers = wallpaperList.slice(0, 6).map(item => {
              return {
                id: item.id || item._id || Math.random().toString(36).substr(2, 9),
                title: item.title || item.filename || '壁纸',
                tags: item.tags || [],
                imageUrl: cdnBase + item.path,
                thumbnailUrl: item.thumbnailPath ? cdnBase + item.thumbnailPath : cdnBase + item.path
              }
            })
            console.log('Processed wallpapers:', wallpapers)
            this.setData({
              featuredWallpapers: wallpapers.slice(0, 3),
              latestWallpapers: wallpapers.slice(3, 6)
            })
          } else {
            console.error('No wallpapers found in response')
            this.useMockData()
          }
        } else {
          console.error('Invalid response data for latest wallpapers')
          this.useMockData()
        }
      },
      fail: (err) => {
        console.error('Error fetching latest wallpapers:', err)
        this.useMockData()
      },
      complete: () => {
        this.setData({ isLoading: false })
      }
    })

    wx.request({
      url: 'https://wall.202597.xyz/data/mobile/index.json',
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
        } else {
          console.error('Invalid response data for categories')
        }
      },
      fail: (err) => {
        console.error('Error fetching categories:', err)
      }
    })
  },

  useMockData() {
    console.log('Using mock data as fallback')
    const mockWallpapers = [
      {
        id: 1,
        title: '梦幻星空',
        tags: ['星空', '梦幻', '蓝色'],
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20starry%20night%20sky%20wallpaper%2C%20cosmic%20background%2C%20deep%20space&image_size=landscape_16_9',
        thumbnailUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20starry%20night%20sky%20wallpaper%2C%20cosmic%20background%2C%20deep%20space&image_size=landscape_16_9'
      },
      {
        id: 2,
        title: '森林日出',
        tags: ['森林', '日出', '自然'],
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=forest%20sunrise%20landscape%2C%20misty%20forest%2C%20sunlight%20through%20trees&image_size=landscape_16_9',
        thumbnailUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=forest%20sunrise%20landscape%2C%20misty%20forest%2C%20sunlight%20through%20trees&image_size=landscape_16_9'
      },
      {
        id: 3,
        title: '城市夜景',
        tags: ['城市', '夜景', '现代'],
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=city%20night%20view%2C%20modern%20skyline%2C%20lights%20reflection&image_size=landscape_16_9',
        thumbnailUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=city%20night%20view%2C%20modern%20skyline%2C%20lights%20reflection&image_size=landscape_16_9'
      }
    ]
    this.setData({
      featuredWallpapers: mockWallpapers,
      latestWallpapers: mockWallpapers
    })
  },

  goToDetail(e) {
    const wallpaper = e.currentTarget.dataset.wallpaper
    wx.navigateTo({
      url: `/pages/detail/detail?wallpaper=${encodeURIComponent(JSON.stringify(wallpaper))}`
    })
  },

  goToFeatured() {
    wx.navigateTo({
      url: '/pages/featured/featured'
    })
  },

  goTo4kGirls() {
    console.log('4K小姐姐 button clicked, navigating to 4kgirls page')
    wx.navigateTo({
      url: '/pages/4kgirls/4kgirls',
      success: function(res) {
        console.log('Navigation success:', res)
      },
      fail: function(err) {
        console.error('Navigation failed:', err)
      }
    })
  },

  goToCategory(e) {
    console.log('goToCategory called:', e)
    const category = e.currentTarget.dataset.category
    console.log('Category data:', category)

    try {
      const app = getApp()
      app.globalData.selectedCategory = category

      wx.navigateTo({
        url: '/pages/category/category',
        success: function(res) {
          console.log('Navigation success:', res)
        },
        fail: function(err) {
          console.error('Navigation failed:', err)
        }
      })
    } catch (error) {
      console.error('Error in goToCategory:', error)
    }
  }
})