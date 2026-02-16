/** @type {import('next').NextConfig} */

const nextConfig = {
  // Allow large file uploads through the API proxy (default is 10MB)
  experimental: {
    middlewareClientMaxBodySize: "500mb",
  },

  // Move dev indicator to bottom-right corner
  devIndicators: {
    position: "bottom-right",
  },

  // Expose server-side env vars to the browser via NEXT_PUBLIC_ prefix
  env: {
    NEXT_PUBLIC_UNIVERSITY_NAME: process.env.UNIVERSITY_NAME || process.env.NEXT_PUBLIC_UNIVERSITY_NAME || "University",
  },

  // Proxy API calls through Next.js so auth cookies are included.
  // The browser sends cookies to the frontend origin (port 3782).
  // Without this proxy, API calls to port 8001 wouldn't include cookies.
  // Note: Uses BACKEND_PORT env var at runtime; defaults to 8001.
  async rewrites() {
    const port = process.env.BACKEND_PORT || "8001";
    return [
      {
        source: "/api/v1/:path*",
        destination: `http://localhost:${port}/api/v1/:path*`,
      },
      {
        source: "/api/outputs/:path*",
        destination: `http://localhost:${port}/api/outputs/:path*`,
      },
    ];
  },

  // Transpile mermaid and related packages for proper ESM handling
  transpilePackages: ["mermaid"],

  // Turbopack configuration (Next.js 16+ uses Turbopack by default for dev)
  turbopack: {
    resolveAlias: {
      // Fix for mermaid's cytoscape dependency - use CJS version
      cytoscape: "cytoscape/dist/cytoscape.cjs.js",
    },
  },

  // Webpack configuration (used for production builds - next build)
  webpack: (config) => {
    const path = require("path");
    config.resolve.alias = {
      ...config.resolve.alias,
      cytoscape: path.resolve(
        __dirname,
        "node_modules/cytoscape/dist/cytoscape.cjs.js",
      ),
    };
    return config;
  },
};

module.exports = nextConfig;
