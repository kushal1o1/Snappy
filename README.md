<p align="center">
  <img src="icons/icon128.png" alt="Snappy" width="96">
</p>

<h1 align="center">Snappy</h1>

<p align="center">
  Capture and restore browser tab snapshots.
</p>

## Install

The extension needs a file called `manifest.json` to load. We have two versions:

| File | Browser |
|------|---------|
| `manifest-chrome.json` | Chrome, Edge, Brave, Chromium |
| `manifest-firefox.json` | Firefox |

### Step 1: Copy the right manifest

**Chrome / Edge / Brave / Chromium:**
```bash
cp manifest-chrome.json manifest.json
```

**Firefox:**
```bash
cp manifest-firefox.json manifest.json
```

### Step 2: Load the extension

**Chrome / Edge / Brave / Chromium:**
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `Snappy` folder

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json` from the `Snappy` folder
4. Open via View > Sidebar > Snappy

## Usage

- Click the **capture button** (centered on border) to save current tabs
- Click a **snapshot card** to expand and preview tabs
- Click **restore** (play icon) to reopen tabs
- Click **settings** (gear icon) to configure restore behavior
- **Search** icon to filter snapshots
- Remove individual tabs with the X in expanded view

## Demo

<p align="center">
  <img src="assets/snappyhome.png" alt="Snappy Home" width="250" height="400">
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="assets/sessions.png" alt="Sessions" width="250" height="400">
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="assets/settings.png" alt="Settings" width="250" height="400">
</p>

## License

[MIT](LICENSE)