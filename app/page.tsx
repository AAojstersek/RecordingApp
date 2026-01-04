import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          Recording App
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Snemajte in prepišite posnetke
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow"
        >
          Prijava
        </Link>
        <Link
          href="/recordings"
          className="px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition-colors border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow"
        >
          Zaznamki
        </Link>
      </div>
    </main>
  );
}
