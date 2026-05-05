import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Split heavy vendor libraries into separate cacheable chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — rarely changes, cached long-term
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Charting library — only needed on pages with charts
          "vendor-recharts": ["recharts"],
          // Supabase SDK
          "vendor-supabase": ["@supabase/supabase-js"],
          // TanStack query
          "vendor-query": ["@tanstack/react-query"],
          // Vega charting — lazy-loaded only when assistant generates charts
          "vendor-vega": ["vega", "vega-lite", "vega-embed"],
          // UI primitives — Radix
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-tabs",
            "@radix-ui/react-select",
            "@radix-ui/react-popover",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-separator",
            "@radix-ui/react-slot",
            "@radix-ui/react-toggle",
            "@radix-ui/react-toggle-group",
          ],
        },
      },
    },
    // Raise the warning limit since we're now chunking properly
    chunkSizeWarningLimit: 500,
  },
}));
