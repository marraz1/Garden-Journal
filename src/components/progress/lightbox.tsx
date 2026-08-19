"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface LightboxPhoto {
  id: string;
  url: string;
}

/** Full-screen photo viewer with keyboard and swipe navigation. */
export function Lightbox({
  photos,
  index,
  onClose,
}: {
  photos: LightboxPhoto[];
  index: number | null;
  onClose: () => void;
}) {
  const tc = useTranslations("common");
  const [current, setCurrent] = useState(index ?? 0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [lastIndex, setLastIndex] = useState(index);

  // Opening on a different thumbnail resets which photo is shown. Adjusted
  // during render rather than in an effect, per the React docs.
  if (lastIndex !== index) {
    setLastIndex(index);
    if (index !== null) setCurrent(index);
  }

  useEffect(() => {
    if (index === null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setCurrent((value) => Math.min(value + 1, photos.length - 1));
      if (event.key === "ArrowLeft") setCurrent((value) => Math.max(value - 1, 0));
    }

    window.addEventListener("keydown", onKeyDown);
    // Stop the page behind the overlay from scrolling.
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [index, photos.length, onClose]);

  if (index === null || photos.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      onTouchStart={(event) => setTouchStartX(event.touches[0].clientX)}
      onTouchEnd={(event) => {
        if (touchStartX === null) return;
        const delta = event.changedTouches[0].clientX - touchStartX;
        if (delta < -50) setCurrent((value) => Math.min(value + 1, photos.length - 1));
        if (delta > 50) setCurrent((value) => Math.max(value - 1, 0));
        setTouchStartX(null);
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={tc("close")}
        className="absolute top-4 right-4 z-10 flex size-11 items-center justify-center rounded-full bg-white/15 text-white"
      >
        <X className="size-6" aria-hidden />
      </button>

      <div className="relative size-full">
        <Image
          src={photos[current].url}
          alt=""
          fill
          sizes="100vw"
          className="object-contain"
          priority
        />
      </div>

      {current > 0 && (
        <button
          type="button"
          onClick={() => setCurrent((value) => value - 1)}
          aria-label={tc("back")}
          className="absolute left-2 flex size-11 items-center justify-center rounded-full bg-white/15 text-white"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </button>
      )}

      {current < photos.length - 1 && (
        <button
          type="button"
          onClick={() => setCurrent((value) => value + 1)}
          aria-label={tc("more")}
          className="absolute right-2 flex size-11 items-center justify-center rounded-full bg-white/15 text-white"
        >
          <ChevronRight className="size-6" aria-hidden />
        </button>
      )}

      <span className="absolute bottom-6 rounded-full bg-white/15 px-3 py-1 text-sm text-white tabular-nums">
        {current + 1} / {photos.length}
      </span>
    </div>
  );
}
