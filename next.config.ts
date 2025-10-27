import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
	/* config options here */
	images: {
		remotePatterns: [{ hostname: "**" }],
	},
	webpack: (config) => {
		// Ensure proper path resolution for TypeScript paths
		config.resolve.alias = {
			...config.resolve.alias,
			"@": path.resolve(__dirname, "."),
		};
		return config;
	},
};

export default nextConfig;
