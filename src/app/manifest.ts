import type { MetadataRoute } from "next";

// Installable to the home screen. No offline service worker in v1 — the spec
// keeps offline support for a later phase.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sodo žurnalas",
    short_name: "Sodas",
    description: "Planuokite lysves, sekite darbus ir fiksuokite derlių.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf8f3",
    theme_color: "#faf8f3",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
