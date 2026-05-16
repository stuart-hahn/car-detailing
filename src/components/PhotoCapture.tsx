import { useEffect, useRef, useState } from "react";
import {
  getJobPhotoUrl,
  revokePhotoUrl,
  saveJobPhoto,
} from "../lib/photos/storage";

interface PhotoCaptureProps {
  jobId: string;
  tag: string;
  label: string;
  required?: boolean;
  /** When true, re-load preview (e.g. dev tools filled this tag). */
  photoReady?: boolean;
  onUploaded: () => void;
}

export function PhotoCapture({
  jobId,
  tag,
  label,
  required,
  photoReady,
  onUploaded,
}: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    void getJobPhotoUrl(jobId, tag).then((u) => {
      if (cancelled) {
        if (u) revokePhotoUrl(u);
        return;
      }
      if (u) {
        url = u;
        setPreview(u);
        setStatus("done");
      } else if (!photoReady) {
        setPreview((prev) => {
          if (prev) revokePhotoUrl(prev);
          return null;
        });
        setStatus("idle");
      }
    });
    return () => {
      cancelled = true;
      if (url) revokePhotoUrl(url);
    };
  }, [jobId, tag, photoReady]);

  async function handleFile(file: File) {
    setStatus("uploading");
    setMessage(null);
    const result = await saveJobPhoto(jobId, tag, file);
    if (result.error) {
      setStatus("error");
      setMessage(result.error);
      return;
    }
    const url = await getJobPhotoUrl(jobId, tag);
    setPreview((prev) => {
      if (prev) revokePhotoUrl(prev);
      return url;
    });
    setStatus("done");
    if (result.warning) setMessage(result.warning);
    onUploaded();
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {label}
            {required && <span className="text-red-400"> *</span>}
          </p>
          <p className="text-xs text-slate-500">{tag}</p>
        </div>
        {status === "done" && (
          <span className="text-xs text-emerald-400">✓</span>
        )}
      </div>
      {preview && (
        <img
          src={preview}
          alt={label}
          className="mt-2 aspect-video w-full rounded-lg object-cover"
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === "uploading"}
        className="mt-2 w-full rounded-lg border border-slate-700 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
      >
        {status === "uploading" ? "Saving…" : preview ? "Retake" : "Capture"}
      </button>
      {message && <p className="mt-1 text-xs text-amber-400">{message}</p>}
    </div>
  );
}
