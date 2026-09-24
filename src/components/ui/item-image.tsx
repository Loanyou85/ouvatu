"use client";

import { useState } from "react";
import { CATEGORY_META, type Category } from "@/config/categories";
import { cn } from "@/lib/utils";

/**
 * External thumbnails (TikTok, YouTube, Open Library…) are rendered with a
 * plain lazy <img>: hosts are unbounded and some URLs expire, so we fall back
 * to an on-brand placeholder instead of a broken image.
 */
export function ItemImage({
  src,
  category,
  alt = "",
  className,
  emojiClassName,
}: {
  src: string | null | undefined;
  category: Category;
  alt?: string;
  className?: string;
  emojiClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cn("grid place-items-center bg-gradient-to-br from-accent-soft via-[#f4f3ff] to-[#f7f7f4]", className)} aria-hidden>
        <span className={cn("text-4xl", emojiClassName)}>{CATEGORY_META[category].emoji}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}
