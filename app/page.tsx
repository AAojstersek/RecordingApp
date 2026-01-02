import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Recording App – deluje
      </h1>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Prijava
        </Link>
        <Link
          href="/recordings"
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Zaznamki
        </Link>
      </div>
    </main>
  );
}
