"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import StatusBadge from "@/components/ui/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { Recording } from "@/types";

interface RecordingCardProps {
  recording: Recording;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Ravno zdaj";
  if (diffMins < 60) return `Pred ${diffMins} min`;
  if (diffHours < 24) return `Pred ${diffHours} h`;
  if (diffDays < 7) return `Pred ${diffDays} dnevi`;
  
  return date.toLocaleDateString("sl-SI", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function RecordingCard({ recording }: RecordingCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/recordings/${recording.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Brisanje ni uspelo");
      }

      toast.success("Posnetek izbrisan");
      setShowConfirm(false);
      // Refresh the page to update the list
      router.refresh();
    } catch (error) {
      toast.error("Brisanje ni uspelo.");
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(true);
  };

  return (
    <>
      <div className="group relative p-5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
        <Link
          href={`/recordings/${recording.id}`}
          className="block"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {recording.title}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span>{formatDate(recording.created_at)}</span>
                {recording.client_company && (
                  <>
                    <span>•</span>
                    <span>{recording.client_company}</span>
                  </>
                )}
                {recording.client_person && (
                  <>
                    <span>•</span>
                    <span>{recording.client_person}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={recording.status} />
              <button
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Izbriši posnetek"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Link>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Izbrišem posnetek?"
        message="Izbrišem posnetek? Tega ni mogoče razveljaviti."
        confirmText="Izbriši"
        cancelText="Prekliči"
        onConfirm={handleDelete}
        onCancel={() => {
          setShowConfirm(false);
          setIsDeleting(false);
        }}
      />
    </>
  );
}

