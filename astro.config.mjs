// @ts-check
import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
import angular from '@analogjs/astro-angular';

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [
    sitemap(), 
    angular()
  ],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['@angular/**', '@rx-angular/**'],
    },
    optimizeDeps: {
      include: ['@angular/core', '@angular/common', '@angular/platform-browser']
    }
  },
  adapter: node({
    mode: "standalone",
  }),
});