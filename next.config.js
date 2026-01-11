const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",

  // ✅ Offline fallback
  fallbacks: {
    document: "/offline.html",
  },

  runtimeCaching: [
    {
      // Cache all app routes (/, /scan, /add-item, etc.)
      urlPattern: ({ request }) =>
        request.mode === "navigate",
      handler: "NetworkFirst",
      options: {
        cacheName: "pages",
        expiration: {
          maxEntries: 50,
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
module.exports = withPWA({
  eslint: {
    ignoreDuringBuilds: true,
  },
});
