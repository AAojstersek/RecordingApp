import Link from "next/link";
import { listMyRecordings } from "@/lib/supabase";
import AudioRecorderPanel from "@/components/AudioRecorderPanel";

export default async function RecordingsPage() {
  const recordings = await listMyRecordings();

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Zaznamki
        </h1>
        <Link
          href="/"
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          Nazaj
        </Link>
      </div>

      <AudioRecorderPanel />

      {recordings.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Zadnji posnetki ({recordings.length})
          </h2>
          <ul className="space-y-2">
            {recordings.slice(0, 10).map((recording) => (
              <li key={recording.id}>
                <Link
                  href={`/recordings/${recording.id}`}
                  className="block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {recording.title}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Status: {recording.status} •{" "}
                    {new Date(recording.created_at).toLocaleDateString("sl-SI")}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recordings.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            Nimate še nobenih posnetkov.
          </p>
        </div>
      )}
    </div>
  );
}

