import React from "react";

interface YouTubeBackgroundVideoProps {
  url: string;
}

const getYoutubeEmbedUrl = (url: string) => {
  const trimmed = url.trim();

  if (!trimmed) return null;

  try {
    const parsedUrl = new URL(trimmed);
    const host = parsedUrl.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const videoId = parsedUrl.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&rel=0&modestbranding=1&showinfo=0&enablejsapi=1` : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const videoId = parsedUrl.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&rel=0&modestbranding=1&showinfo=0&enablejsapi=1` : null;
    }
  } catch {
    return null;
  }

  return null;
};

const YouTubeBackgroundVideo: React.FC<YouTubeBackgroundVideoProps> = ({ url }) => {
  const embedUrl = getYoutubeEmbedUrl(url);

  if (!embedUrl) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
      <iframe
        className="absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 scale-110"
        src={embedUrl}
        title="Background video"
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/45" />
    </div>
  );
};

export default YouTubeBackgroundVideo;
