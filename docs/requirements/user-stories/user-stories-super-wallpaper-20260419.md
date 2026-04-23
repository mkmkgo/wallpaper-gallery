# User Stories

**Project Name**: Super Wallpaper Mini Program
**Epic**: Wallpaper Discovery and Download
**Date**: 2026-04-19

> **NOTE**: Acceptance criteria are written in EARS format. For details, refer to the EARS format guide.

---

## US-001: Browse Wallpapers on Homepage Showcase

**As a** WeChat user
**I want** to browse a horizontal scrollable showcase of wallpapers on the homepage
**So that** I can quickly discover featured wallpapers

### Acceptance Criteria (EARS Format)

#### AC-1: Horizontal Showcase

**Pattern**: SHALL
```
The system SHALL display a horizontal scrollable showcase with 5-6 wallpaper thumbnails on the homepage
```

**Given-When-Then** (for BDD testing):
- **Given**: I open the Super Wallpaper Mini Program
- **When**: The homepage loads
- **Then**: I see a horizontal scrollable showcase with 5-6 wallpaper thumbnails

---

#### AC-2: View More Button
**Pattern**: WHEN
```
WHEN I click the "View More" button, the system SHALL navigate to the featured wallpapers page
```

**Given-When-Then** (for BDD testing):
- **Given**: I am on the homepage
- **When**: I click the "View More" button
- **Then**: I am taken to the featured wallpapers page

---

#### AC-3: Compressed Images
**Pattern**: SHALL
```
The system SHALL load compressed images on the homepage for faster loading speed
```

**Given-When-Then** (for BDD testing):
- **Given**: I open the Super Wallpaper Mini Program
- **When**: The homepage loads
- **Then**: I see compressed images that load quickly

## US-002: Browse Featured Wallpapers

**As a** WeChat user
**I want** to browse featured wallpapers on a dedicated page
**So that** I can see more curated wallpapers

### Acceptance Criteria (EARS Format)

#### AC-1: Featured Page

**Pattern**: WHEN
```
WHEN I access the featured wallpapers page, the system SHALL display featured wallpapers with infinite scroll
```

**Given-When-Then** (for BDD testing):
- **Given**: I am on the featured wallpapers page
- **When**: I scroll to the bottom
- **Then**: More featured wallpapers load automatically

## US-003: Preview Wallpaper on Device

**As a** WeChat user
**I want** to preview how a wallpaper would look on a real device
**So that** I can better visualize how it will look on my phone

### Acceptance Criteria (EARS Format)

#### AC-1: Device Preview Button

**Pattern**: WHEN
```
WHEN I am on the wallpaper details page, the system SHALL provide a device preview button
```

**Given-When-Then** (for BDD testing):
- **Given**: I am on the wallpaper details page
- **When**: I look at the page
- **Then**: I see a device preview button

---

#### AC-2: Device Preview Display
**Pattern**: WHEN
```
WHEN I tap the device preview button, the system SHALL display the wallpaper on a device mockup
```

**Given-When-Then** (for BDD testing):
- **Given**: I am on the wallpaper details page
- **When**: I tap the device preview button
- **Then**: I see the wallpaper displayed on a device mockup

---

### Estimate: 3 SP
### Priority: High

---

## US-002: Search for Wallpapers

**As a** WeChat user
**I want** to search for wallpapers by keywords
**So that** I can find specific types of wallpapers I'm interested in

### Acceptance Criteria (EARS Format)

#### AC-1: Search Functionality

**Pattern**: WHEN
```
WHEN I enter keywords in the search bar and tap search, the system SHALL display matching wallpapers
```

**Given-When-Then** (for BDD testing):
- **Given**: I am on the search page
- **When**: I enter "nature" in the search bar and tap search
- **Then**: I see wallpapers related to nature

---

#### AC-2: No Results Handling
**Pattern**: IF...THEN
```
IF no wallpapers match my search query, THEN the system SHALL display a "No results found" message
```

**Given-When-Then** (for BDD testing):
- **Given**: I am on the search page
- **When**: I enter a non-existent keyword and tap search
- **Then**: I see a "No results found" message

---

### Estimate: 2 SP
### Priority: High

---

## US-003: View Wallpaper Details

**As a** WeChat user
**I want** to view detailed information about a wallpaper
**So that** I can see the full quality and details before downloading

### Acceptance Criteria (EARS Format)

#### AC-1: Details Page

**Pattern**: WHEN
```
WHEN I tap on a wallpaper thumbnail, the system SHALL open a details page with full preview and metadata
```

**Given-When-Then** (for BDD testing):
- **Given**: I see a wallpaper thumbnail I like
- **When**: I tap on it
- **Then**: I see a full-screen preview and wallpaper details

---

### Estimate: 2 SP
### Priority: High

---

## US-004: Download Wallpapers

**As a** WeChat user
**I want** to download high-quality wallpapers to my device
**So that** I can use them as my phone background

### Acceptance Criteria (EARS Format)

#### AC-1: Download Process

**Pattern**: WHEN
```
WHEN I tap the download button on the details page, the system SHALL initiate the download process
```

**Given-When-Then** (for BDD testing):
- **Given**: I am on the wallpaper details page
- **When**: I tap the download button
- **Then**: The download process starts

---

#### AC-2: Download Completion
**Pattern**: WHEN
```
WHEN the download completes, the system SHALL notify me and save the wallpaper to my device
```

**Given-When-Then** (for BDD testing):
- **Given**: I initiated a wallpaper download
- **When**: The download completes
- **Then**: I receive a notification and the wallpaper is saved to my device

---

### Estimate: 3 SP
### Priority: High

---

## US-005: Watch Rewarded Video Ads

**As a** WeChat user
**I want** to watch rewarded video ads to unlock wallpaper downloads
**So that** I can download wallpapers for free

### Acceptance Criteria (EARS Format)

#### AC-1: Ad Display

**Pattern**: WHEN
```
WHEN I request to download a wallpaper, the system SHALL display a rewarded video ad
```

**Given-When-Then** (for BDD testing):
- **Given**: I tap the download button for a wallpaper
- **When**: The download process starts
- **Then**: A rewarded video ad is displayed

---

#### AC-2: Ad Completion
**Pattern**: IF...THEN
```
IF I watch the complete ad, THEN the system SHALL grant me download access
```

**Given-When-Then** (for BDD testing):
- **Given**: I am watching a rewarded video ad
- **When**: I watch the ad to completion
- **Then**: The download process continues

---

### Estimate: 2 SP
### Priority: High

---

## US-006: Browse Wallpaper Categories

**As a** WeChat user
**I want** to browse wallpapers by categories
**So that** I can easily find wallpapers of specific types

### Acceptance Criteria (EARS Format)

#### AC-1: Category Navigation

**Pattern**: WHEN
```
WHEN I navigate to the categories section, the system SHALL display a list of available categories
```

**Given-When-Then** (for BDD testing):
- **Given**: I am in the mini program
- **When**: I tap on the categories icon
- **Then**: I see a list of wallpaper categories

---

#### AC-2: Category Selection
**Pattern**: WHEN
```
WHEN I select a category, the system SHALL display wallpapers from that category
```

**Given-When-Then** (for BDD testing):
- **Given**: I am in the categories section
- **When**: I tap on the "Nature" category
- **Then**: I see wallpapers related to nature

---

### Estimate: 2 SP
### Priority: Medium

---

## US-007: View Popular Wallpapers

**As a** WeChat user
**I want** to view popular wallpapers in each category
**So that** I can see what other users are downloading

### Acceptance Criteria (EARS Format)

#### AC-1: Popular Section

**Pattern**: SHALL
```
The system SHALL display a section of popular wallpapers in each category
```

**Given-When-Then** (for BDD testing):
- **Given**: I am in a wallpaper category
- **When**: The page loads
- **Then**: I see a section of popular wallpapers at the top

---

### Estimate: 1 SP
### Priority: Medium

---

## US-008: View Download History

**As a** WeChat user
**I want** to view my download history
**So that** I can easily find wallpapers I've downloaded before

### Acceptance Criteria (EARS Format)

#### AC-1: History Display

**Pattern**: WHEN
```
WHEN I navigate to the user center, the system SHALL display my download history
```

**Given-When-Then** (for BDD testing):
- **Given**: I am in the mini program
- **When**: I tap on the user center icon
- **Then**: I see my download history

---

### Estimate: 2 SP
### Priority: Medium

---

## US-009: View Ad Watching History

**As a** WeChat user
**I want** to view my ad watching history and rewards
**So that** I can track how many ads I've watched

### Acceptance Criteria (EARS Format)

#### AC-1: Ad History Display

**Pattern**: WHEN
```
WHEN I navigate to the user center, the system SHALL display my ad watching history
```

**Given-When-Then** (for BDD testing):
- **Given**: I am in the user center
- **When**: I tap on the ad history section
- **Then**: I see my ad watching history and rewards

---

### Estimate: 1 SP
### Priority: Low

---

## US-010: Set Wallpaper Preferences

**As a** WeChat user
**I want** to set my wallpaper preferences
**So that** the system can recommend wallpapers I might like

### Acceptance Criteria (EARS Format)

#### AC-1: Preferences Settings

**Pattern**: WHEN
```
WHEN I navigate to the user center, the system SHALL allow me to set wallpaper preferences
```

**Given-When-Then** (for BDD testing):
- **Given**: I am in the user center
- **When**: I tap on the preferences section
- **Then**: I see options to set my wallpaper preferences

---

### Estimate: 1 SP
### Priority: Low

---