# Quick Start Guide - Testing Your Chrome Extension Side Panel

## Step-by-Step Instructions

### 1. Install Dependencies

Open your terminal in the project directory and run:

```bash
npm install
```

This will install:

- React and React DOM
- TypeScript
- Vite (build tool)
- Tailwind CSS
- Chrome extension types

### 2. Build the Extension

Run the build command:

```bash
npm run build
```

This will:

- Compile your TypeScript/React code
- Bundle everything into the `dist` folder
- Copy `manifest.json` and `sidepanel.html` to `dist`

### 3. Load Extension in Chrome

1. Open Chrome browser
2. Navigate to `chrome://extensions/` (paste this in the address bar)
3. **Enable Developer mode** (toggle switch in the top-right corner)
4. Click **"Load unpacked"** button
5. Navigate to your project folder and select the **`dist`** folder
   - ⚠️ Important: Select the `dist` folder, NOT the root project folder
6. Your extension should now appear in the list

### 4. Open the Side Panel

There are two ways to open the side panel:

**Option A: Via Extension Icon**

1. Click the extension icon in Chrome's toolbar (puzzle piece icon)
2. The side panel should open automatically

**Option B: Via Right-Click Menu**

1. Right-click the extension icon in the toolbar
2. Select "Open side panel" from the context menu

### 5. Development Workflow

When you make changes to your code:

1. **If using watch mode** (recommended for development):

   ```bash
   npm run dev
   ```

   This will automatically rebuild when you save files.

2. **After making changes:**

   - Go to `chrome://extensions/`
   - Click the **reload icon** (↻) on your extension card
   - Refresh the side panel (close and reopen it)

3. **To see changes:**
   - The side panel will reload with your latest changes
   - Check the browser console (F12) for any errors

## Troubleshooting

### Extension won't load

- ✅ Make sure you selected the `dist` folder (not the root folder)
- ✅ Check that `npm run build` completed successfully
- ✅ Look for errors in the Chrome extensions page

### Side panel doesn't open

- ✅ Make sure the extension is enabled (toggle should be ON)
- ✅ Try right-clicking the extension icon
- ✅ Check Chrome's console (F12) for errors

### UI looks broken / no styles

- ✅ Make sure Tailwind CSS is installed: `npm install`
- ✅ Rebuild: `npm run build`
- ✅ Check that `index.css` is being loaded

### Changes not appearing

- ✅ Make sure you rebuilt: `npm run build`
- ✅ Reload the extension in `chrome://extensions/`
- ✅ Close and reopen the side panel

### TypeScript/Build errors

- ✅ Run `npm install` to ensure all dependencies are installed
- ✅ Check the error messages in the terminal
- ✅ Make sure all imports are correct

## File Structure

After building, your `dist` folder should contain:

```
dist/
├── manifest.json
├── sidepanel.html
├── sidepanel.js
├── background.js
├── index.css
└── [other bundled files]
```

## Next Steps

- Make changes to your `.tsx` files
- Run `npm run build` (or `npm run dev` for watch mode)
- Reload the extension
- Test your changes!

## Tips

- **Use Chrome DevTools**: Press F12 while the side panel is open to debug
- **Check Console**: Look for errors in the browser console
- **Hot Reload**: Use `npm run dev` for automatic rebuilding during development
- **Extension Reload**: Always reload the extension after building to see changes
