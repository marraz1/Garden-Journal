"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { upload } from "@vercel/blob/client";
import { Camera, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { prepareImage } from "@/lib/images";

export interface UploadedPhoto {
  url: string;
  pathname: string;
  width: number;
  height: number;
}

interface Draft {
  id: string;
  previewUrl: string;
  progress: number;
  uploaded?: UploadedPhoto;
  failed?: boolean;
}

const MAX_PHOTOS = 10;

/**
 * Camera-first photo picker: compresses in the browser, uploads straight to
 * blob storage with a real progress bar, and previews before the entry is saved.
 */
export function PhotoUploader({
  gardenId,
  onChange,
}: {
  gardenId: string;
  onChange: (photos: UploadedPhoto[]) => void;
}) {
  const t = useTranslations("progress");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);

  function publish(next: Draft[]) {
    setDrafts(next);
    onChange(next.flatMap((draft) => (draft.uploaded ? [draft.uploaded] : [])));
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    const room = MAX_PHOTOS - drafts.length;
    const files = Array.from(fileList).slice(0, Math.max(0, room));
    if (files.length === 0) return;

    setBusy(true);

    // Sequential rather than parallel: a phone on mobile data does better with
    // one upload at a time, and the progress bar stays meaningful.
    for (const file of files) {
      const id = crypto.randomUUID();
      let previewUrl = "";

      try {
        const prepared = await prepareImage(file);
        previewUrl = prepared.previewUrl;

        setDrafts((current) => [...current, { id, previewUrl, progress: 0 }]);

        const blob = await upload(`gardens/${gardenId}/${id}.jpg`, prepared.file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
          clientPayload: gardenId,
          onUploadProgress: ({ percentage }) => {
            setDrafts((current) =>
              current.map((draft) =>
                draft.id === id ? { ...draft, progress: Math.round(percentage) } : draft,
              ),
            );
          },
        });

        setDrafts((current) => {
          const next = current.map((draft) =>
            draft.id === id
              ? {
                  ...draft,
                  progress: 100,
                  uploaded: {
                    url: blob.url,
                    pathname: blob.pathname,
                    width: prepared.width,
                    height: prepared.height,
                  },
                }
              : draft,
          );
          onChange(next.flatMap((draft) => (draft.uploaded ? [draft.uploaded] : [])));
          return next;
        });
      } catch (error) {
        console.error(error);
        toast.error(tErr("uploadFailed"));
        setDrafts((current) =>
          current.map((draft) => (draft.id === id ? { ...draft, failed: true } : draft)),
        );
      }
    }

    setBusy(false);
  }

  function remove(id: string) {
    const draft = drafts.find((item) => item.id === id);
    if (draft?.previewUrl) URL.revokeObjectURL(draft.previewUrl);
    publish(drafts.filter((item) => item.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="touch"
          disabled={busy || drafts.length >= MAX_PHOTOS}
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="size-5" aria-hidden />
          {t("takePhoto")}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="touch"
          disabled={busy || drafts.length >= MAX_PHOTOS}
          onClick={() => galleryInputRef.current?.click()}
        >
          <ImagePlus className="size-5" aria-hidden />
          {t("chooseFiles")}
        </Button>
      </div>

      {/* `capture` opens the camera directly instead of the file browser. */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {drafts.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {drafts.map((draft) => (
            <li key={draft.id} className="relative aspect-square overflow-hidden rounded-xl">
              {/* Local object URL, so next/image would only add overhead. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.previewUrl} alt="" className="size-full object-cover" />

              {!draft.uploaded && !draft.failed && (
                <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1">
                  <div className="h-1 overflow-hidden rounded-full bg-white/30">
                    <div
                      className="h-full bg-primary transition-[width]"
                      style={{ width: `${draft.progress}%` }}
                    />
                  </div>
                  <span className="mt-0.5 block text-[0.65rem] text-white">
                    {draft.progress > 0
                      ? t("uploading", { percent: draft.progress })
                      : t("compressing")}
                  </span>
                </div>
              )}

              {draft.failed && (
                <span className="absolute inset-0 flex items-center justify-center bg-destructive/80 p-1 text-center text-[0.65rem] text-white">
                  {tErr("uploadFailed")}
                </span>
              )}

              <button
                type="button"
                onClick={() => remove(draft.id)}
                aria-label={t("removePhoto")}
                className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {drafts.length >= MAX_PHOTOS && (
        <p className="text-xs text-muted-foreground">
          {tc("more")}: {MAX_PHOTOS}
        </p>
      )}
    </div>
  );
}
