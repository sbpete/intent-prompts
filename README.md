# Intent Prompts Chrome Extension

A Chrome extension for managing AI prompts and labels.

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Extension

For development with watch mode:
```bash
npm run dev
```

For production build:
```bash
npm run build
```

### 3. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder (created after building)
5. The extension will be loaded

### 4. Open the Side Panel

1. Click the extension icon in the Chrome toolbar
2. Or right-click the extension icon and select "Open side panel"
3. The side panel will open with your React UI

### 5. Development Workflow

1. Make changes to your `.tsx` or `.ts` files
2. The build will automatically recompile (if using `npm run dev`)
3. Go to `chrome://extensions/` and click the reload icon (↻) on your extension
4. Refresh the side panel to see changes

## OpenAI API Key Setup

The prompt refinement feature requires an OpenAI API key to be stored in Chrome's storage.

### Setting the API Key

You can set the API key programmatically in the browser console or by creating a utility script. The key is stored in `chrome.storage.local` with the key `"openai_api_key"`.

**Option 1: Using Chrome DevTools Console**
1. Open the extension's service worker (go to `chrome://extensions/`, find your extension, click "service worker" link)
2. In the console, run:
   ```javascript
   chrome.storage.local.set({ openai_api_key: 'your-api-key-here' })
   ```

**Option 2: Using Browser Console on Any Page**
1. Open any webpage and press F12 to open DevTools
2. In the console, run:
   ```javascript
   chrome.storage.local.set({ openai_api_key: 'your-api-key-here' }, () => {
     console.log('API key saved');
   })
   ```

Replace `'your-api-key-here'` with your actual OpenAI API key.

**Note**: The API key is stored locally in your browser and never sent anywhere except to OpenAI's API when refining prompts.

## Project Structure

- `sidepanel.tsx` - Entry point for the side panel React app
- `SidePanelShell.tsx` - Main shell component
- `PromptList.tsx` - Prompt list component
- `PromptEditor.tsx` - Prompt editor component
- `background.ts` - Background service worker
- `storage.ts` - Storage utilities
- `refinePrompt.ts` - Prompt refinement module with two-tier gating system
- `manifest.json` - Chrome extension manifest
- `sidepanel.html` - HTML file for side panel

## Troubleshooting

- **Extension not loading**: Make sure you're selecting the `dist` folder, not the root folder
- **Changes not appearing**: Reload the extension in `chrome://extensions/` after building
- **Build errors**: Check that all dependencies are installed with `npm install`
- **TypeScript errors**: Run `npm run build` to see detailed error messages

