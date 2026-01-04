"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if user has visited before (don't show on first visit)
    const hasVisited = localStorage.getItem("pwa_has_visited") === "true";
    if (!hasVisited) {
      localStorage.setItem("pwa_has_visited", "true");
      return;
    }

    // Check if already installed
    const checkInstalled = () => {
      // Check for standalone mode (Android/Chrome)
      if (window.matchMedia("(display-mode: standalone)").matches) {
        setIsInstalled(true);
        return true;
      }

      // Check for iOS standalone mode
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return true;
      }

      setIsInstalled(false);
      return false;
    };

    if (checkInstalled()) {
      return; // Already installed, don't show prompt
    }

    // Listen for beforeinstallprompt event (Chrome/Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      // Only show if user has visited before
      if (hasVisited) {
        setShowPrompt(true);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;

      // Hide prompt regardless of outcome
      setShowPrompt(false);
      setDeferredPrompt(null);

      if (outcome === "accepted") {
        setIsInstalled(true);
      }
    } catch (error) {
      // If prompt fails, hide it anyway
      console.error("Install prompt error:", error);
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  // Don't show if already installed or no prompt available
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all text-sm font-medium border border-blue-700 dark:border-blue-500"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Namesti</span>
      </button>
    </div>
  );
}

