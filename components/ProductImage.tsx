"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import Icon from "@/components/icons";

type ProductImageProps = Omit<ImageProps, "src" | "alt"> & { src: string | null; alt: string };

export default function ProductImage({ src, alt, className, ...props }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <span className={`product-image-fallback ${className ?? ""}`} aria-label={`${alt} image unavailable`}><Icon name="sparkle" className="size-6" /><span>Image unavailable</span></span>;
  }
  return <Image {...props} src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}
