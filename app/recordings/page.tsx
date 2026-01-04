import Link from "next/link";
import { listMyRecordings } from "@/lib/supabase";
import AudioRecorderPanel from "@/components/AudioRecorderPanel";
import RecordingCard from "@/components/RecordingCard";

export default async function RecordingsPage() {
  const recordings = await listMyRecordings();

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Zaznamki
        </h1>
        <Link
          href="/"
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
        >
          Nazaj
        </Link>
      </div>

      <AudioRecorderPanel />

      {recordings.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Posnetki ({recordings.length})
          </h2>
          <div className="space-y-3">
            {recordings.map((recording) => (
              <RecordingCard key={recording.id} recording={recording} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Nimate še nobenih posnetkov.
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
            Začnite z novim posnetkom zgoraj.
          </p>
        </div>
      )}
    </div>
  );
}

