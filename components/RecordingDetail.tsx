"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { Copy, Edit2, Check, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import type { Recording } from "@/types";

interface RecordingDetailProps {
  id: string;
}

interface RecordingResponse {
  recording: Recording;
  audioUrl?: string;
}

const fetcher = async (url: string): Promise<RecordingResponse> => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Napaka pri nalaganju posnetka");
  }
  return res.json();
};

export default function RecordingDetail({ id }: RecordingDetailProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const processingTriggeredRef = useRef(false);

  const { data, error, mutate } = useSWR<RecordingResponse>(
    `/api/recordings/${id}`,
    fetcher,
    {
      refreshInterval: (data) => {
        // Poll every 3 seconds only if status is 'processing'
        return data?.recording.status === "processing" ? 3000 : 0;
      },
    }
  );

  useEffect(() => {
    if (data?.recording) {
      setEditedTitle(data.recording.title);
    }
  }, [data?.recording?.title]);

  // Trigger processing once when status is "processing"
  useEffect(() => {
    if (
      data?.recording?.status === "processing" &&
      !processingTriggeredRef.current
    ) {
      processingTriggeredRef.current = true;

      // Fire-and-forget: trigger processing
      fetch("/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recordingId: id }),
        credentials: "include",
      }).catch((error) => {
        console.error("Failed to trigger processing:", error);
        // Don't show error toast - polling will handle status updates
      });
    }

    // Reset trigger if status changes away from processing
    if (data?.recording?.status !== "processing") {
      processingTriggeredRef.current = false;
    }
  }, [data?.recording?.status, id]);

  const handleCopyTranscript = async () => {
    if (!data?.recording?.transcript) return;

    try {
      await navigator.clipboard.writeText(data.recording.transcript);
      toast.success("Prepís kopiran!");
    } catch (error) {
      toast.error("Napaka pri kopiranju prepisa.");
    }
  };

  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || editedTitle === data?.recording.title) {
      setIsEditingTitle(false);
      return;
    }

    setIsSavingTitle(true);
    try {
      const response = await fetch(`/api/recordings/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: editedTitle.trim() }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Napaka pri shranjevanju naslova");
      }

      const updated = await response.json();
      await mutate({ ...data!, recording: updated.recording }, false);
      setIsEditingTitle(false);
      toast.success("Naslov shranjen!");
    } catch (error) {
      toast.error("Napaka pri shranjevanju naslova.");
      setEditedTitle(data?.recording.title || "");
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedTitle(data?.recording.title || "");
    setIsEditingTitle(false);
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 dark:text-red-400">
          Napaka pri nalaganju posnetka.
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const { recording, audioUrl } = data;

  if (recording.status === "processing") {
    return (
      <div className="p-6 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
        <div className="text-lg text-gray-700 dark:text-gray-300">
          Obdelujem...
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Posnetek se obdeluje. Prosimo počakajte...
        </div>
      </div>
    );
  }

  if (recording.status === "failed") {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="text-red-600 dark:text-red-400 text-lg">
          Obdelava posnetka ni uspela.
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Poskusite znova naložiti posnetek.
        </div>
      </div>
    );
  }

  if (recording.status !== "completed") {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-600 dark:text-gray-400">
          Neznan status: {recording.status}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Title */}
      <div className="flex items-center gap-2">
        {isEditingTitle ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveTitle();
                } else if (e.key === "Escape") {
                  handleCancelEdit();
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              disabled={isSavingTitle}
            />
            <button
              onClick={handleSaveTitle}
              disabled={isSavingTitle}
              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isSavingTitle}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            <h1
              className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              onClick={() => setIsEditingTitle(true)}
            >
              {recording.title}
            </h1>
            <button
              onClick={() => setIsEditingTitle(true)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Audio Player */}
      {audioUrl && (
        <div className="w-full">
          <audio
            controls
            src={audioUrl}
            className="w-full"
          >
            Vaš brskalnik ne podpira predvajanja zvoka.
          </audio>
        </div>
      )}

      {/* Transcript */}
      {recording.transcript && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Prepís
            </h2>
            <button
              onClick={handleCopyTranscript}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
              Kopiraj
            </button>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-64 overflow-y-auto">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {recording.transcript}
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      {recording.summary && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Povzetek
          </h2>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {recording.summary}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

