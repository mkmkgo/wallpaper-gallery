Page({
  data: {
    wallpapers: [],
    isLoading: true,
    hasMore: false
  },

  onLoad() {
    this.loadWallpapers()
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

  loadWallpapers() {
    // 直接硬编码CDN地址，避免缓存问题
    const cdnBase = 'https://cdn.jsdelivr.net/gh/mkmkgo/nuanXinProPic@main'

    console.log('Loading featured wallpapers from website...')
    console.log('CDN Base:', cdnBase)

    wx.request({
      url: 'https://wall.202597.xyz/data/mobile/latest.json',
      method: 'GET',
      success: (res) => {
        console.log('Featured wallpapers response:', res)
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
              this.setData({ isLoading: false })
              this.useMockData()
              return
            }
          } else {
            console.error('No blob data found in response')
            this.setData({ isLoading: false })
            this.useMockData()
            return
          }
          
          console.log('Wallpaper list:', wallpaperList)
          
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
            console.log('Processed featured wallpapers:', wallpapers)
            this.setData({
              wallpapers: wallpapers,
              isLoading: false,
              hasMore: false
            })
          } else {
            console.error('No wallpapers found in response')
            this.setData({ isLoading: false })
            this.useMockData()
          }
        } else {
          console.error('Invalid response data for featured wallpapers')
          this.setData({ isLoading: false })
          this.useMockData()
        }
      },
      fail: (err) => {
        console.error('Error fetching featured wallpapers:', err)
        this.setData({ isLoading: false })
        this.useMockData()
      }
    })
  },

  useMockData() {
    console.log('Using mock data as fallback')
    const mockWallpapers = [
      {
        id: 1,
        title: '精选壁纸1',
        tags: ['精选', '高清'],
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20nature%20wallpaper%2C%20high%20quality%2C%204k%20resolution&image_size=portrait_4_3',
        thumbnailUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20nature%20wallpaper%2C%20high%20quality%2C%204k%20resolution&image_size=portrait_4_3'
      },
      {
        id: 2,
        title: '精选壁纸2',
        tags: ['精选', '风景'],
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=scenic%20landscape%20wallpaper%2C%20mountain%20view%2C%20sunset&image_size=portrait_4_3',
        thumbnailUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=scenic%20landscape%20wallpaper%2C%20mountain%20view%2C%20sunset&image_size=portrait_4_3'
      },
      {
        id: 3,
        title: '精选壁纸3',
        tags: ['精选', '抽象'],
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=abstract%20art%20wallpaper%2C%20colorful%20patterns&image_size=portrait_4_3',
        thumbnailUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=abstract%20art%20wallpaper%2C%20colorful%20patterns&image_size=portrait_4_3'
      },
      {
        id: 4,
        title: '精选壁纸4',
        tags: ['精选', '城市'],
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20city%20wallpaper%2C%20skyline%2C%20night%20view&image_size=portrait_4_3',
        thumbnailUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20city%20wallpaper%2C%20skyline%2C%20night%20view&image_size=portrait_4_3'
      },
      {
        id: 5,
        title: '精选壁纸5',
        tags: ['精选', '动物'],
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20animal%20wallpaper%2C%20cat%20in%20nature&image_size=portrait_4_3',
        thumbnailUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20animal%20wallpaper%2C%20cat%20in%20nature&image_size=portrait_4_3'
      }
    ]
    this.setData({
      wallpapers: mockWallpapers,
      isLoading: false,
      hasMore: false
    })
  },

  goToDetail(e) {
    const wallpaper = e.currentTarget.dataset.wallpaper
    wx.navigateTo({
      url: `/pages/detail/detail?wallpaper=${encodeURIComponent(JSON.stringify(wallpaper))}`
    })
  }
})