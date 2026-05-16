"use client";

/**
 * WatchPlayer — Apple-TV+-styled video surface (SPEC §9, decision D1).
 *
 *   CC0 title  → @mux/mux-player-react with a glassy accent theme, idle
 *                fade chrome, hover scrub thumbnails (Mux storyboards).
 *   Direct     → themed HTML5 <video> for Archive.org / Wikimedia files.
 *   Otherwise  → YouTube trailer embed fallback.
 *
 * The Mux + direct branches also report resume position / completion to
 * `watch_progress` (throttled) and seek back to the saved position on
 * load. The YouTube (trailer) branch is intentionally untracked.
 */

import { recordWatchProgressAction } from "@/app/(app)/title/[tmdb_id]/watch-actions";
import MuxPlayer from "@mux/mux-player-react";
import { useCallback, useRef } from "react";

/** Persisted resume context — present only for tracked CC0 streams. */
export interface WatchProgressCtx {
  tmdbId: number;
  episodeIndex: number;
  /** Seconds to resume from (0 = start / already finished). */
  startAt: number;
}

interface MuxProps {
  kind: "mux";
  playbackId: string;
  title: string;
  poster?: string | null;
  progress?: WatchProgressCtx;
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
  progress?: WatchProgressCtx;
}

export type WatchPlayerProps = MuxProps | YouTubeProps | DirectProps;

// Mark complete at ≥90% watched (or on the native `ended` event). Tolerant
// of credits / trailing black, matching Netflix/Prime behaviour.
const COMPLETE_RATIO = 0.9;
// Don't hammer the DB — at most one write per this many seconds of playback.
const SAVE_EVERY_SEC = 10;

/** Shared throttled progress reporter for the timeupdate/ended handlers. */
function useProgressReporter(ctx: WatchProgressCtx | undefined) {
  const lastSavedAt = useRef(0);

  const save = useCallback(
    (positionSec: number, durationSec: number | null, completed: boolean) => {
      if (!ctx) return;
      void recordWatchProgressAction({
        tmdbId: ctx.tmdbId,
        episodeIndex: ctx.episodeIndex,
        positionSec,
        durationSec,
        completed,
      });
    },
    [ctx],
  );

  const onTime = useCallback(
    (positionSec: number, durationSec: number | null) => {
      if (!ctx || !Number.isFinite(positionSec)) return;
      const done =
        durationSec != null && durationSec > 0 && positionSec / durationSec >= COMPLETE_RATIO;
      if (positionSec - lastSavedAt.current < SAVE_EVERY_SEC && !done) return;
      lastSavedAt.current = positionSec;
      save(Math.floor(positionSec), durationSec, done);
    },
    [ctx, save],
  );

  const onEnded = useCallback(
    (durationSec: number | null) => {
      if (!ctx) return;
      save(Math.floor(durationSec ?? 0), durationSec, true);
    },
    [ctx, save],
  );

  return { onTime, onEnded };
}

export function WatchPlayer(props: WatchPlayerProps) {
  const trackedCtx = props.kind === "youtube" ? undefined : props.progress;
  const { onTime, onEnded } = useProgressReporter(trackedCtx);

  if (props.kind === "direct") {
    const startAt = props.progress?.startAt ?? 0;
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
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (startAt > 1 && Number.isFinite(v.duration) && startAt < v.duration - 5) {
              v.currentTime = startAt;
            }
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            onTime(v.currentTime, Number.isFinite(v.duration) ? v.duration : null);
          }}
          onEnded={(e) => onEnded(e.currentTarget.duration || null)}
        >
          Your browser cannot play this video.
        </video>
      </div>
    );
  }

  if (props.kind === "mux") {
    const startAt = props.progress?.startAt ?? 0;
    return (
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden ring-1 ring-white/10 bg-black">
        <MuxPlayer
          playbackId={props.playbackId}
          metadata={{ video_title: props.title }}
          streamType="on-demand"
          accentColor="#3DD3E8"
          poster={props.poster ?? undefined}
          startTime={startAt > 1 ? startAt : undefined}
          onTimeUpdate={(e) => {
            const el = e.target as unknown as { currentTime?: number; duration?: number };
            const ct = el?.currentTime ?? 0;
            const d = el?.duration;
            onTime(ct, typeof d === "number" && Number.isFinite(d) ? d : null);
          }}
          onEnded={(e) => {
            const el = e.target as unknown as { duration?: number };
            onEnded(typeof el?.duration === "number" ? el.duration : null);
          }}
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
