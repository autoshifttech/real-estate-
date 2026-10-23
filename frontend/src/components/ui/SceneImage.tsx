import { useState } from "react";
import { sceneUrl, srcSetFor } from "../../config/media.config";
import { mediaUrl } from "../../lib/api";

/**
 * Responsive scene image with a blurred placeholder. Pass either a scene slug
 * (from scripts/build_media.sh) or a full URL (e.g. a CMS upload).
 */
export function SceneImage({
  scene,
  src,
  alt,
  sizes = "100vw",
  className = "",
  imgClassName = "",
  priority = false,
}: {
  scene?: string;
  src?: string | null;
  alt: string;
  sizes?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const full = scene ? sceneUrl(scene, 1600) : mediaUrl(src);
  const srcSet = scene ? `${sceneUrl(scene, 800)} 800w, ${sceneUrl(scene, 1600)} 1600w` : srcSetFor(src ?? "");
  const lqipMatch = full.match(/^\/media\/scenes\/(.+)-1600\.webp$/);
  const lqip = lqipMatch ? sceneUrl(lqipMatch[1], "lqip") : undefined;

  return (
    <div
      className={`relative overflow-hidden bg-ink-800 ${className}`}
      style={lqip ? { backgroundImage: `url(${lqip})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      <img
        src={full}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        width={1600}
        height={900}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"} ${imgClassName}`}
      />
    </div>
  );
}
