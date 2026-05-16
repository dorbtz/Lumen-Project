"use client";

/**
 * WatchPlayer — Apple-TV+-styled video surface (SPEC §9, decision D1).
 *
 *   CC0 title  → @mux/mux-player-react with a glassy accent theme, idle
 *                fade chrome, hover scrub thumbnails (Mux storyboards).
 *   Otherwise  → YouTube trailer embed fallback.
 *
 * The Mux player's own control bar handles idle-fade + hover thumbnails;
 * we theme it to the Liquid Glass accent and wrap it in a glass frame so it
 * reads as part of the product rather than a bare <iframe>.
 */

import MuxPlayer from "@mux/mux-player-react";

interface MuxProps {
  kind: "mux";
  playbackId: string;
  title: string;
  poster?: string | null;
}

interface YouTubeProps {
  kind: "youtube";
  youtubeKey: string;
  title: string;
}

interface DirectProps {
  kind: "direct";
  src: string;
  title: string;
  poster?: string | null;
}

export type WatchPlayerProps = MuxProps | YouTubeProps | DirectProps;

export function WatchPlayer(props: WatchPlayerProps) {
  if (props.kind === "direct") {
    // Additive path (zero disruption): public-domain titles whose source is
    // a direct Archive.org / Wikimedia file. The Mux + YouTube branches are
    // untouched. Plain themed HTML5 <video> — no new dependency.
    return (
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden ring-1 ring-white/10 bg-black">
        {/* biome-ignore lint/a11y/useMediaCaption: public-domain source ships no caption track */}
        <video
          className="absolute inset-0 w-full h-full"
          src={props.src}
          poster={props.poster ?? undefined}
          controls
          playsInline
          preload="metadata"
          style={{ accentColor: "#3DD3E8" }}
        >
          Your browser cannot play this video.
        </video>
      </div>
    );
  }

  if (props.kind === "mux") {
    return (
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden ring-1 ring-white/10 bg-black">
        <MuxPlayer
          playbackId={props.playbackId}
          metadata={{ video_title: props.title }}
          streamType="on-demand"
          accentColor="#3DD3E8"
          poster={props.poster ?? undefined}
          // Apple-TV+ feel: full-bleed, glassy transport bar that idle-fades
          // (Mux default behaviour), accent = Liquid Glass sapphire.
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden ring-1 ring-white/10 bg-black">
      <iframe
        className="absolute inset-0 w-full h-full"
        src={`https://www.youtube-nocookie.com/embed/${props.youtubeKey}?rel=0&modestbranding=1`}
        title={`${props.title} trailer`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
