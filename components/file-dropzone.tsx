"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Camera, CheckCircle2, FileUp, LoaderCircle, X } from "lucide-react";

type Status =
  | { state: "idle" }
  | { state: "preparing"; name: string }
  | { state: "ready"; name: string; sizeLabel: string }
  | { state: "error"; message: string };

export type FileDropzoneProps = {
  /** Called with the (possibly optimized) file once it is validated. */
  onFileSelected: (file: File) => void;
  /** Called when the user removes the selected file. */
  onClear?: () => void;
  /** Called with a friendly message when a file is rejected. */
  onError?: (message: string) => void;
  /** Max size (MB) of the file that will be sent. Default: 4. */
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
};

const ACCEPT = "image/*,application/pdf,text/plain,.pdf,.txt,.heic,.heif";
const HARD_LIMIT_BYTES = 30 * 1024 * 1024; // refuse absurdly large originals up front

function isSupported(file: File) {
  return (
    file.type === "application/pdf" ||
    file.type === "text/plain" ||
    file.type.startsWith("image/") ||
    /\.(pdf|txt|heic|heif)$/i.test(file.name)
  );
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Phone photos are often 5-12 MB. Downscaling to ~2000px JPEG keeps printed
 * text readable for the model and keeps uploads fast. Falls back to the
 * original file if the browser can't decode it (e.g. HEIC in Chrome).
 */
async function shrinkImage(
  file: File,
  maxSide = 2000,
  quality = 0.85,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.fillStyle = "#fff"; // avoid black backgrounds on transparent PNGs
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", quality),
    );
    if (!blob) return file;

    // Keep the original if it's already a model-friendly type and not larger.
    const modelFriendly = /^image\/(jpeg|png|webp)$/.test(file.type);
    if (modelFriendly && blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}

export function FileDropzone({
  onFileSelected,
  onClear,
  onError,
  maxSizeMB = 4,
  disabled = false,
  className = "",
}: FileDropzoneProps) {
  const uid = useId();
  const hintId = `${uid}-hint`;
  const statusId = `${uid}-status`;

  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const runId = useRef(0);

  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const preparing = status.state === "preparing";
  const locked = disabled || preparing;

  // Ignore results from an in-flight preparation after unmount.
  useEffect(() => () => void (runId.current += 1), []);

  const fail = useCallback(
    (message: string) => {
      setStatus({ state: "error", message });
      onError?.(message);
    },
    [onError],
  );

  const handleFile = useCallback(
    async (original: File) => {
      if (!isSupported(original)) {
        return fail(
          "This file type isn't supported. Use a PDF, a photo, or a text file.",
        );
      }
      if (original.size > HARD_LIMIT_BYTES) {
        return fail(
          "This file is too large. Try a smaller file or a photo of the page.",
        );
      }

      const id = ++runId.current;
      setStatus({ state: "preparing", name: original.name });

      const file = await shrinkImage(original);
      if (id !== runId.current) return; // cancelled or superseded

      if (file.size > maxSizeMB * 1024 * 1024) {
        return fail(
          `This file is larger than ${maxSizeMB} MB. Try a smaller file, or a photo of the page instead.`,
        );
      }

      setStatus({
        state: "ready",
        name: file.name,
        sizeLabel: formatSize(file.size),
      });
      onFileSelected(file);
    },
    [fail, maxSizeMB, onFileSelected],
  );

  const reset = () => {
    runId.current += 1;
    setStatus({ state: "idle" });
    if (fileInput.current) fileInput.current.value = "";
    if (cameraInput.current) cameraInput.current.value = "";
    onClear?.();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (locked) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  // Paste a screenshot or copied file while the dropzone has focus.
  const onPaste = (e: React.ClipboardEvent) => {
    if (locked) return;
    const file = Array.from(e.clipboardData.files)[0];
    if (file) {
      e.preventDefault();
      void handleFile(file);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = ""; // allow re-selecting the same file
  };

  return (
    <div
      className={className}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!locked) setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setDragging(false);
      }}
      onDrop={onDrop}
      onPaste={onPaste}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={locked}
          aria-describedby={`${hintId} ${statusId}`}
          className={[
            "flex min-h-24 flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-4 text-center text-sm font-semibold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-60",
            dragging
              ? "border-primary bg-primary/15 text-primary"
              : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10",
          ].join(" ")}
        >
          {preparing ? (
            <LoaderCircle
              className="size-5 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <FileUp className="size-5" aria-hidden="true" />
          )}
          <span>
            {dragging
              ? "Drop your file here"
              : status.state === "ready"
                ? "Choose a different file"
                : "Upload image or PDF"}
          </span>
          <span
            id={hintId}
            className="text-xs font-normal text-muted-foreground"
          >
            Click, drag and drop, or paste a screenshot. PDF, photo or text, up
            to {maxSizeMB} MB.
          </span>
        </button>

        {/* Camera shortcut: only useful on phones and tablets. */}
        <button
          type="button"
          onClick={() => cameraInput.current?.click()}
          disabled={locked}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-input bg-background px-5 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 md:hidden"
        >
          <Camera className="size-5" aria-hidden="true" /> Take a photo
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={onInputChange}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={onInputChange}
      />

      {/* Status is announced politely to screen readers; errors use role="alert". */}
      <div id={statusId} aria-live="polite" className="mt-3 empty:hidden">
        {status.state === "preparing" && (
          <p className="rounded-xl bg-muted p-3 text-sm">
            <span className="font-semibold">{status.name}</span>
            <span className="text-muted-foreground"> · Preparing file…</span>
          </p>
        )}

        {status.state === "ready" && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
            <p className="flex min-w-0 items-center gap-2">
              <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate font-semibold">
                  {status.name}
                </span>
                <span className="block">
                  {status.sizeLabel} · It will be read when you translate.
                </span>
              </span>
            </p>
            <button
              type="button"
              onClick={reset}
              aria-label={`Remove ${status.name}`}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {status.state === "error" && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-900"
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
