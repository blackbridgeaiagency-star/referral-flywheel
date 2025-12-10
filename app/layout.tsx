import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
	subsets: ["latin"],
	variable: "--font-inter"
});

export const metadata: Metadata = {
	title: "Referral Flywheel - Turn Members Into Affiliates",
	description: "Every member becomes an automatic affiliate earning 10% lifetime commissions. The viral growth engine for Whop communities.",
	metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://referral-flywheel.vercel.app'),
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${inter.variable} antialiased`}
			>
				{children}
			</body>
		</html>
	);
}
