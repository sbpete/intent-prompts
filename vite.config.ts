import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';

import { readFileSync, writeFileSync } from 'fs';

// Plugin to copy manifest.json and HTML files to dist, and inject CSS link
const copyManifestPlugin = () => {
  return {
    name: 'copy-manifest',
    writeBundle() {
      const distDir = resolve(__dirname, 'dist');
      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true });
      }
      
      // Copy manifest.json
      if (existsSync(resolve(__dirname, 'manifest.json'))) {
        copyFileSync(
          resolve(__dirname, 'manifest.json'),
          resolve(distDir, 'manifest.json')
        );
      }
      
      // Copy logo.png
      if (existsSync(resolve(__dirname, 'logo.png'))) {
        copyFileSync(
          resolve(__dirname, 'logo.png'),
          resolve(distDir, 'logo.png')
        );
      }
      
      // Copy and process sidepanel.html to inject CSS link
      if (existsSync(resolve(__dirname, 'sidepanel.html'))) {
        let htmlContent = readFileSync(
          resolve(__dirname, 'sidepanel.html'),
          'utf-8'
        );
        
        // Check if CSS file exists and inject link tag if not already present
        const cssFile = resolve(distDir, 'sidepanel.css');
        if (existsSync(cssFile) && !htmlContent.includes('sidepanel.css')) {
          // Inject CSS link before the closing </head> tag
          htmlContent = htmlContent.replace(
            '</head>',
            '  <link rel="stylesheet" href="./sidepanel.css">\n</head>'
          );
        }
        
        writeFileSync(
          resolve(distDir, 'sidepanel.html'),
          htmlContent,
          'utf-8'
        );
      }
    },
  };
};

export default defineConfig({
  plugins: [react(), copyManifestPlugin()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'sidepanel.tsx'),
        background: resolve(__dirname, 'background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name].[ext]',
        // Ensure service worker is output as ES module
        format: 'es',
      },
    },
    emptyOutDir: true,
    // Don't minify in development to help with debugging
    minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});

