"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    // Check current session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        // Redirect if authenticated
        if (currentUser) {
          router.replace("/recordings");
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      // Redirect if authenticated
      if (currentUser) {
        router.replace("/recordings");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Log error details for debugging (without secrets)
        console.error("Login error:", {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        
        // Show user-friendly error message
        const errorMessage = error.message || "Nepričakovana napaka pri prijavi";
        toast.error(`Prijava ni uspela: ${errorMessage}`);
        setLoading(false);
        return;
      }

      // Success - redirect will happen via onAuthStateChange
      toast.success("Prijava uspešna");
      // Small delay to ensure session is set
      setTimeout(() => {
        router.replace("/recordings");
      }, 100);
    } catch (error) {
      console.error("Login exception:", error);
      const errorMessage = error instanceof Error ? error.message : "Nepričakovana napaka";
      toast.error(`Prijava ni uspela: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(`Odjava ni uspela: ${error.message}`);
        return;
      }
      toast.success("Odjavljen");
      setUser(null);
    } catch (error) {
      toast.error("Odjava ni uspela");
      console.error("Logout error:", error);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Nalagam...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white dark:bg-gray-800 p-8 border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Prijava
        </h1>

        {/* Status */}
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4">
          {user ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Prijavljen kot: <span className="font-medium">{user.email}</span>
            </p>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Nisi prijavljen.
            </p>
          )}
        </div>

        {/* Login Form */}
        {!user && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                E-pošta
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                placeholder="vas@email.si"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Geslo
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-4 py-2.5 font-medium text-white transition-colors shadow-sm hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Prijavljam..." : "Prijavi se"}
            </button>
          </form>
        )}

        {/* Logout Button */}
        {user && (
          <button
            onClick={handleLogout}
            className="w-full rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 px-4 py-2.5 font-medium text-white transition-colors shadow-sm hover:shadow"
          >
            Odjavi se
          </button>
        )}
      </div>
    </div>
  );
}

