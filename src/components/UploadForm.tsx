"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const ACCEPTED =
  ".pptx,.ppt,.pdf,.zip,.png,.jpg,.jpeg,.webp,.gif,.bmp,.heic,application/pdf,application/zip,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,image/*";

export function UploadForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [spice, setSpice] = useState<"mild" | "medium" | "spicy">("mild");
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    setFiles((prev) => [...prev, ...arr]);
    if (!title && arr[0])
      setTitle(arr[0].name.replace(/\.[^.]+$/, "").slice(0, 80));
  };

  const submit = async () => {
    if (files.length === 0 || !title) {
      setError("Add at least one file and a title.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("description", description);
    fd.set("tags", tags);
    fd.set("spice", spice);
    for (const f of files) fd.append("files", f);
    const res = await fetch("/api/decks/upload", { method: "POST", body: fd });
    if (!res.ok) {
      setSubmitting(false);
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Upload failed.");
      return;
    }
    const { id } = await res.json();
    router.push(`/library/${id}`);
  };

  const totalMb =
    Math.round((files.reduce((s, f) => s + f.size, 0) / 1024 / 1024) * 10) /
    10;

  return (
    <div className="space-y-6">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onPick(e.dataTransfer.files);
        }}
        className={`card relative cursor-pointer p-12 text-center transition ${
          dragging ? "border-flame bg-flame-soft" : ""
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
        />
        <div className="display text-3xl">
          {dragging ? "Drop them right here." : "Drop slides anywhere."}
        </div>
        <div className="text-mute mt-2 text-sm">
          PPTX, PDF, images, or a pk-deck .zip · up to 100 MB each
        </div>
        {files.length > 0 && (
          <div className="mt-6 text-sm">
            <strong>{files.length}</strong> file
            {files.length === 1 ? "" : "s"} · {totalMb} MB total
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="card p-5">
          <div className="text-xs uppercase tracking-widest text-mute mb-3">
            Files
          </div>
          <ul className="text-sm space-y-2">
            {files.map((f, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 border-b last:border-b-0 pb-2 last:pb-0"
              >
                <span className="truncate font-mono">{f.name}</span>
                <span className="text-xs text-mute shrink-0">
                  {Math.round((f.size / 1024 / 1024) * 10) / 10} MB
                </span>
                <button
                  className="text-xs text-chili"
                  onClick={() =>
                    setFiles((prev) => prev.filter((_, j) => j !== i))
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-mute">
            Title
          </label>
          <input
            className="input mt-1.5"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A History of Spoons"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-mute">
            Tags (comma-separated)
          </label>
          <input
            className="input mt-1.5"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="history, kitchen, weird"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs uppercase tracking-widest text-mute">
            Description
          </label>
          <input
            className="input mt-1.5"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's the vibe?"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs uppercase tracking-widest text-mute">
            Spice level
          </label>
          <div className="mt-2 flex gap-2">
            {(["mild", "medium", "spicy"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpice(s)}
                className={`flex-1 px-4 py-3 rounded-xl border text-sm capitalize transition ${
                  spice === s
                    ? "bg-ink text-canvas border-ink"
                    : "bg-white hover:bg-canvas-2"
                }`}
              >
                <span
                  className={`inline-block size-2 rounded-full mr-2 align-middle ${
                    s === "mild"
                      ? "bg-mint"
                      : s === "medium"
                      ? "bg-amber"
                      : "bg-chili"
                  }`}
                />
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-chili border border-chili/30 bg-chili/5 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          disabled={submitting || files.length === 0 || !title}
          onClick={submit}
          className="btn btn-flame disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Uploading…" : "Upload & process"}
        </button>
      </div>
    </div>
  );
}
