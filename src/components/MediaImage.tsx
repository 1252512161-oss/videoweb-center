import {Camera} from 'lucide-react';
import {useState} from 'react';

interface MediaImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectClass?: string;
  priority?: boolean;
}

export function MediaImage({
  src,
  alt,
  className = '',
  aspectClass = 'aspect-[4/3]',
  priority = false,
}: MediaImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`${aspectClass} w-full bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex flex-col items-center justify-center p-6 text-center border border-zinc-800 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Camera className="w-8 h-8 text-zinc-600 mb-2" strokeWidth={1.5} />
        <span className="text-xs text-zinc-500 max-w-[200px] line-clamp-2">{alt}</span>
      </div>
    );
  }

  const webpSrc = src.endsWith('.jpg') ? `${src.slice(0, -4)}.webp` : null;

  return (
    <picture className="block w-full h-full">
      {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onError={() => setFailed(true)}
        className={`${aspectClass} w-full object-cover ${className}`}
      />
    </picture>
  );
}
