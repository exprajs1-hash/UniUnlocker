import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UniUnlocker Mobile Solution",
    short_name: "UniUnlocker",
    description: "UniUnlocker – mobile software solution: unlocking, FRP, IMEI, repair and tool rental.",
    start_url: "/",
    display: "standalone",
    background_color: "#030817",
    theme_color: "#030817",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
