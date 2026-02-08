# Site Set Launcher (Chrome Extension)

An MV3 extension that saves website sets and launches them all at once with one click or a shortcut.

## Features

- Save multiple sets (Preset CRUD)
- Pick and run a set from the action popup
- Open quick launcher with a keyboard shortcut and run a set
- Edit set name and URL list in the options page
- URL line order in options = tab open order
- Synced storage with `chrome.storage.sync`
- Only `http/https` URLs are executable
  - If any URL is unsupported, the whole run is canceled

## Environment

- Chrome Desktop (Manifest V3)
- Node.js 20+

## Install and Build

```bash
npm install
npm run typecheck
npm run build
```

## Load in Chrome

1. Run `npm run build` to generate `dist`
2. Open `chrome://extensions`
3. Turn on `Developer mode` (top right)
4. Click `Load unpacked`
5. Select the project's `dist` folder

## Basic Usage

1. Click the extension icon, then open `Settings`
2. Add a new set, enter one URL per line, and save
3. Select a set in the popup and click `Run`
4. Or press `Alt+Shift+L` (Mac: `Command+Shift+L`) to open quick launcher

## Manual Test Checklist

1. Data persists after browser restart (create/edit/delete sets)
2. Popup run opens tabs in a new window in URL order
3. Shortcut opens quick launcher tab
4. Run is canceled when set includes `chrome://settings`
5. Empty set shows an error message
