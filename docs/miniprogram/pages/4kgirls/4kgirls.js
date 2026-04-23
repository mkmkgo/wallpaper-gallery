Page({
  data: {
    wallpapers: [],
    isLoading: true,
    hasMore: false
  },

  onLoad() {
    this.load4kGirlsWallpapers()
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

  load4kGirlsWallpapers() {
    const cdnBase = 'https://cdn.jsdelivr.net/gh/mkmkgo/nuanXinProPic@main'

    console.log('Loading 4K girls wallpapers with CDN:', cdnBase)

    wx.request({
      url: 'https://wall.202597.xyz/data/mobile/人像.json',
      method: 'GET',
      success: (res) => {
        console.log('4K girls response status:', res.statusCode)
        if (res.statusCode === 200 && res.data) {
          let wallpaperList = []

          if (res.data.blob) {
            try {
              const decodedData = this.decodeData(res.data.blob)
              wallpaperList = JSON.parse(decodedData)
              console.log('Decoded wallpaper count:', wallpaperList.length)
            } catch (e) {
              console.error('Error decoding blob data:', e)
              this.setData({ isLoading: false })
              return
            }
          }

          console.log('First 5 wallpapers paths:', wallpaperList.slice(0, 5).map(item => item.path))

          const pureWallpapers = wallpaperList.filter(item => {
            const includesFresh = item.path && item.path.includes('清新')
            const includesCharm = item.path && item.path.includes('魅力')
            const result = includesFresh || includesCharm
            if (result) {
              console.log('Including wallpaper with path:', item.path)
            }
            return result
          })

          console.log('Filtered wallpapers count:', pureWallpapers.length)

          if (pureWallpapers.length > 0) {
            const wallpapers = pureWallpapers.map((item, index) => {
              const thumbnailUrl = item.thumbnailPath
                ? cdnBase + item.thumbnailPath
                : cdnBase + item.path
              console.log(`Wallpaper ${index}:`, item.id, item.path, thumbnailUrl)
              return {
                id: item.id || item._id || Math.random().toString(36).substr(2, 9),
                title: item.title || item.filename || '壁纸',
                tags: item.tags || [],
                imageUrl: cdnBase + item.path,
                thumbnailUrl: thumbnailUrl
              }
            })
            console.log('Total wallpapers to display:', wallpapers.length)
            this.setData({
              wallpapers: wallpapers,
              isLoading: false,
              hasMore: false
            })
            console.log('Data set completed')
          } else {
            console.error('No pure wallpapers found')
            this.setData({ isLoading: false })
          }
        } else {
          console.error('Invalid response data for 4K girls')
          this.setData({ isLoading: false })
        }
      },
      fail: (err) => {
        console.error('Error fetching 4K girls wallpapers:', err)
        this.setData({ isLoading: false })
      }
    })
  },

  goToDetail(e) {
    const wallpaper = e.currentTarget.dataset.wallpaper
    wx.navigateTo({
      url: `/pages/detail/detail?wallpaper=${encodeURIComponent(JSON.stringify(wallpaper))}`
    })
  }
})