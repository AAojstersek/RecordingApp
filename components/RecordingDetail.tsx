"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { Copy, Edit2, Check, X, Loader2, RefreshCw, AlertCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const processingTriggeredRef = useRef(false);
  const router = useRouter();

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
    if (data?.recording?.title) {
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
    const textToCopy = data?.recording?.transcript_body || data?.recording?.transcript;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
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

  const handleRefresh = async () => {
    await mutate();
  };

  const handleRetry = async () => {
    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recordingId: id }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Napaka pri ponovni obdelavi");
      }

      toast.success("Obdelava znova zagnana");
      await mutate();
    } catch (error) {
      toast.error("Napaka pri ponovni obdelavi posnetka.");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/recordings/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Brisanje ni uspelo");
      }

      toast.success("Posnetek izbrisan");
      router.push("/recordings");
    } catch (error) {
      toast.error("Brisanje ni uspelo.");
      setIsDeleting(false);
    }
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
      <div className="space-y-6">
        <div className="p-8 text-center space-y-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
          <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Obdelujem...
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Posnetek se obdeluje. Prosimo počakajte...
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Osveži
          </button>
        </div>
      </div>
    );
  }

  if (recording.status === "failed") {
    return (
      <div className="space-y-6">
        <div className="p-8 space-y-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-600 dark:text-red-400 mb-4" />
            <div className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">
              Obdelava posnetka ni uspela
            </div>
            <div className="text-sm text-red-700 dark:text-red-300 mb-6">
              Posnetek ni bil uspešno obdelan. Poskusite znova obdelati posnetek ali ga izbrišite.
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Poskusi znova
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Izbriši
            </button>
          </div>
        </div>
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Izbrišem posnetek?"
          message="Ali želiš izbrisati posnetek? Tega ni mogoče razveljaviti."
          confirmText="Izbriši"
          cancelText="Prekliči"
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setIsDeleting(false);
          }}
        />
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
    <div className="w-full space-y-6">
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
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              aria-label="Izbriši posnetek"
            >
              <Trash2 className="w-5 h-5" />
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
      {(recording.transcript_body || recording.transcript) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Prepís
            </h2>
            <button
              onClick={handleCopyTranscript}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
            >
              <Copy className="w-4 h-4" />
              Kopiraj
            </button>
          </div>
          <div className="p-5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {recording.transcript_body || recording.transcript}
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      {recording.summary && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Povzetek
          </h2>
          <div className="p-5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {recording.summary}
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Izbrišem posnetek?"
        message="Ali želiš izbrisati posnetek? Tega ni mogoče razveljaviti."
        confirmText="Izbriši"
        cancelText="Prekliči"
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setIsDeleting(false);
        }}
      />
    </div>
  );
}

