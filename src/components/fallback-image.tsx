import { useState } from "react";

import { cn } from "@/lib/utils";

type FallbackImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: string;
  loading?: "eager" | "lazy";
};

export function FallbackImage({
  src,
  alt,
  className,
  fallback = "Image unavailable",
  loading = "lazy",
}: FallbackImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const available = Boolean(src && src !== failedSource);

  if (!available) {
    return (
      <div
        className={cn(
          "flex size-full items-center justify-center bg-secondary px-3 text-center text-xs text-muted-foreground",
          className,
        )}
        role="img"
        aria-label={`${alt}: ${fallback}`}
      >
        {fallback}
      </div>
    );
  }

  return (
    <img
      src={src ?? undefined}
      alt={alt}
      loading={loading}
      className={className}
      onError={() => {
        if (src) setFailedSource(src);
      }}
    />
  );
}
