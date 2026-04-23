# 微信小程序项目说明

## 项目位置

由于权限限制，小程序项目创建在以下位置：
`wallpaper-gallery/docs/miniprogram/`

## 使用方法

1. **复制小程序目录**
   - 将 `wallpaper-gallery/docs/miniprogram/` 目录下的所有文件复制到微信开发者工具中可访问的位置
   - 建议将其复制到 `wallpaper-miniprogram/` 目录

2. **在微信开发者工具中导入项目**
   - 打开微信开发者工具
   - 点击"导入项目"
   - 选择复制后的 `wallpaper-miniprogram` 目录
   - 设置 AppID: `wxc75d3ce79697ea40`

3. **添加图标文件**
   - 在 `images/` 目录下添加以下图标文件：
     - `tab-home.png` - 首页图标
     - `tab-home-active.png` - 首页活跃图标
     - `tab-category.png` - 分类图标
     - `tab-category-active.png` - 分类活跃图标
     - `tab-user.png` - 我的图标
     - `tab-user-active.png` - 我的活跃图标
     - `avatar-default.png` - 默认头像

4. **安装 Vant Weapp 组件库**（可选）
   - 如果需要使用 Vant 组件，在微信开发者工具中执行：
   ```
   npm install @vant/weapp
   ```

## 项目结构

```
miniprogram/
├── app.js              # 应用入口
├── app.json            # 全局配置
├── app.wxss            # 全局样式
├── sitemap.json        # 站点地图
├── pages/
│   ├── index/          # 首页
│   │   ├── index.wxml
│   │   ├── index.js
│   │   ├── index.json
│   │   └── index.wxss
│   ├── featured/       # 精选壁纸
│   │   ├── featured.wxml
│   │   ├── featured.js
│   │   ├── featured.json
│   │   └── featured.wxss
│   ├── detail/         # 壁纸详情
│   │   ├── detail.wxml
│   │   ├── detail.js
│   │   ├── detail.json
│   │   └── detail.wxss
│   ├── category/       # 分类
│   │   ├── category.wxml
│   │   ├── category.js
│   │   ├── category.json
│   │   └── category.wxss
│   └── user/          # 个人中心
│       ├── user.wxml
│       ├── user.js
│       ├── user.json
│       └── user.wxss
└── images/            # 图标目录（需手动添加）
```

## 功能说明

- **首页**：精选壁纸轮播、热门分类、最新壁纸
- **精选壁纸**：壁纸列表展示
- **壁纸详情**：壁纸展示、真机预览、下载功能
- **分类**：分类列表、分类壁纸
- **个人中心**：用户信息、功能入口

## 数据来源

小程序使用您现有的壁纸网站数据：
- API 地址：`https://wall.202597.xyz`
- CDN 地址：`https://cdn.jsdelivr.net/gh/mkmkgo/nuanXinProPic@v1.2.66`

## 后续开发建议

1. 添加微信登录功能
2. 实现收藏功能
3. 添加搜索功能
4. 集成真实的激励视频广告
5. 添加数据分析