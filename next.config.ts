import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
	/* config options here */
	images: {
		remotePatterns: [{ hostname: "**" }],
	},
};

export default nextConfig;
