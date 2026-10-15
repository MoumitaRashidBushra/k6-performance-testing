import type { Metadata } from "next";
import Script from "next/script";
import PWAProvider from "@/components/PWAProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "dMoney — QA Practice Platform | Mobile Financial Service",
  description:
    "dMoney is a fully-functional open-source Mobile Financial Service (MFS) platform — similar to bKash & Nagad — built for QA engineers to practise manual testing, API testing, security testing, database testing, and test automation on real fintech workflows including OTP login, Stripe payments, P2P transfers, and role-based access control.",
  keywords: [
    "QA practice platform",
    "software testing practice",
    "API testing",
    "manual testing",
    "test automation",
    "fintech testing",
    "mobile financial service",
    "MFS platform",
    "bKash clone",
    "Nagad clone",
    "digital wallet",
    "QA engineer",
    "SDET",
    "Postman",
    "Cypress",
    "Playwright",
    "REST API testing",
    "JWT authentication",
    "OTP login",
    "Stripe payment testing",
    "role-based access control testing",
    "Next.js",
    "Node.js",
    "MySQL",
    "open source QA",
    "Road to Career",
    "dmoney",
  ],
  authors: [{ name: "Road to Career", url: "https://roadtocareer.net" }],
  creator: "Road to Career",
  metadataBase: new URL("https://dmoney.roadtocareer.net"),
  openGraph: {
    type: "website",
    url: "https://dmoney.roadtocareer.net",
    title: "dMoney — QA Practice Platform | Mobile Financial Service",
    description:
      "An open-source fintech web app built for QA engineers. Practise manual testing, API testing, security testing, database validation, and end-to-end automation on realistic MFS workflows — deposits, withdrawals, P2P transfers, Stripe cash-in, OTP 2FA, and more.",
    siteName: "dMoney QA Lab",
    images: [
      {
        url: "/dmoney-favicon.ico",
        width: 32,
        height: 32,
        alt: "dMoney logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "dMoney — QA Practice Platform | Mobile Financial Service",
    description:
      "Open-source MFS platform for QA engineers. Practise manual, API, security, DB, and automation testing on real fintech flows.",
    creator: "@roadtocareer",
  },
  icons: {
    icon: "/dmoney-favicon.ico",
    apple: "/dmoney-favicon.ico",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-N6J384KBBD"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-N6J384KBBD');
          `}
        </Script>
      </head>
      <body className="antialiased">
        {children}
        <PWAProvider />
      </body>
    </html>
  );
}
