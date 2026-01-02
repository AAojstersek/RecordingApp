"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type State = "idle" | "recording" | "uploading";

function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return ""; // Fallback to default
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function getFileExtension(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "mp4";
  return "dat";
}

export default function AudioRecorder() {
  const [state, setState] = useState<State>("idle");
  const [duration, setDuration] = useState(0);
  const [mimeType, setMimeType] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Initialize mimeType
    setMimeType(getSupportedMimeType());

    return () => {
      // Cleanup
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (state === "recording" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx || !analyserRef.current) return;

      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (state !== "recording" || !ctx) return;

        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = "rgb(249, 250, 251)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

          ctx.fillStyle = `rgb(59, 130, 246)`;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
        }
      };

      draw();
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [state]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup audio visualization
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const mime = getSupportedMimeType();
      setMimeType(mime);

      const mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Defensive log
        console.log("Recorded chunks:", chunksRef.current.map((c) => c.size));

        if (chunksRef.current.length === 0) {
          toast.error("Posnetek je prazen.");
          setState("idle");
          setDuration(0);
          return;
        }

        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        const formData = new FormData();
        const extension = getFileExtension(mime || "");
        const filename = `recording.${extension}`;
        formData.append("audio", blob, filename);

        setState("uploading");

        try {
          const loadingToast = toast.loading("Nalagam posnetek...");

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          toast.dismiss(loadingToast);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Neznana napaka" }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          const data = await response.json();
          toast.success("Posnetek uspešno naložen!");

          if (data.recordingId) {
            router.push(`/recordings/${data.recordingId}`);
          } else {
            toast.error("Manjka ID posnetka v odgovoru.");
            setState("idle");
            setDuration(0);
          }
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Napaka pri nalaganju posnetka."
          );
          setState("idle");
          setDuration(0);
        }
      };

      mediaRecorder.start();
      setState("recording");
      startTimeRef.current = Date.now();
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          toast.error("Dostop do mikrofona je zavrnjen. Prosimo, omogočite dostop.");
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          toast.error("Mikrofon ni najden.");
        } else {
          toast.error(`Napaka: ${error.message}`);
        }
      } else {
        toast.error("Napaka pri zagonu snemanja.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === "recording") {
      // Stop the media recorder (onstop callback will handle blob creation and upload)
      mediaRecorderRef.current.stop();
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      
      // Stop the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  if (!MediaRecorder) {
    return (
      <div className="p-4 text-center text-red-600">
        MediaRecorder ni podprt v vašem brskalniku.
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="space-y-4">
        {/* Timer */}
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-gray-800 dark:text-gray-200">
            {formatTime(duration)}
          </div>
        </div>

        {/* Visualizer */}
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={300}
            height={80}
            className="w-full max-w-xs h-20 rounded bg-gray-100 dark:bg-gray-700"
          />
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          {state === "idle" && (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Mic className="w-5 h-5" />
              Začni snemanje
            </button>
          )}

          {state === "recording" && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              <Square className="w-5 h-5" />
              Ustavi snemanje
            </button>
          )}

          {state === "uploading" && (
            <button
              disabled
              className="flex items-center gap-2 px-6 py-3 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              Nalagam...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

