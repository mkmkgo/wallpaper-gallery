# 图标大小问题解决方案

## 问题描述

微信小程序的 tabBar 图标大小限制为 40KB，但当前下载的图标每个都约 176KB，超过了限制。

## 解决方案

### 方法 1：使用在线工具压缩图标

1. **访问在线压缩工具**：
   - [TinyPNG](https://tinypng.com/)
   - [Compress PNG](https://compresspng.com/)
   - [Optimizilla](https://imagecompressor.com/)

2. **上传图标文件**：
   - 选择 `images` 目录中的 PNG 图标文件
   - 等待压缩完成
   - 下载压缩后的文件

3. **替换原文件**：
   - 将压缩后的文件替换到 `images` 目录中
   - 确保文件名保持不变

### 方法 2：使用 SVG 图标

1. **修改 app.json**：
   - 将图标路径改为 SVG 文件路径
   - 例如：`"iconPath": "images/tab-home-small.svg"`

2. **使用 SVG 图标**：
   - 我已经创建了小尺寸的 SVG 图标：
     - `tab-home-small.svg`
     - `tab-home-active-small.svg`
     - `tab-category-small.svg`
     - `tab-category-active-small.svg`
     - `tab-user-small.svg`
     - `tab-user-active-small.svg`

### 方法 3：使用系统默认图标

1. **修改 app.json**：
   - 暂时不使用自定义图标，使用系统默认图标
   - 移除 `iconPath` 和 `selectedIconPath` 字段

## 推荐方法

**推荐使用方法 1**：使用在线工具压缩 PNG 图标，这样可以保持图标质量的同时减小文件大小。

**备用方法**：如果压缩后仍然超过限制，使用方法 2，直接使用 SVG 图标。

## 图标文件列表

### 原始 PNG 图标（大文件）：
- `tab-home.png` (176KB)
- `tab-home-active.png` (176KB)
- `tab-category.png` (176KB)
- `tab-category-active.png` (176KB)
- `tab-user.png` (176KB)
- `tab-user-active.png` (176KB)

### 小尺寸 SVG 图标：
- `tab-home-small.svg`
- `tab-home-active-small.svg`
- `tab-category-small.svg`
- `tab-category-active-small.svg`
- `tab-user-small.svg`
- `tab-user-active-small.svg`