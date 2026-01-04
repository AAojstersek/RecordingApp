import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import ThemeToggle from "@/components/ui/ThemeToggle";

export const metadata: Metadata = {
  title: "RecordingApp",
  description: "Audio recording and transcription app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Recording",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const saved = localStorage.getItem('theme');
                  if (saved === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else if (saved === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    // No saved theme - default to dark
                    document.documentElement.classList.add('dark');
                    localStorage.setItem('theme', 'dark');
                  }
                } catch (e) {
                  // Fallback to dark if localStorage fails
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="fixed top-4 right-4 z-40">
          <ThemeToggle />
        </div>
        <div className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </div>
        <PWAInstallPrompt />
      </body>
    </html>
  );
}

