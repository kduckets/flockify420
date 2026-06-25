"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAlbumStore } from "@/store/albumStore";
import { hasSetUsername } from "@/lib/identity";

const START_DEG = 135;
const SWEEP_DEG = 270;

function getLabel(v: number): string {
  if (v <= 0)  return "";
  if (v < 20)  return "Skip";
  if (v < 40)  return "Meh";
  if (v < 60)  return "Solid";
  if (v < 75)  return "Great";
  if (v < 90)  return "Excellent";
  return "Essential";
}

interface Props {
  albumId: string;
  compact?: boolean;
}

export function InlineStarRating({ albumId, compact = false }: Props) {
  const [nudge, setNudge]           = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startY: number; startVal: number } | null>(null);

  const rating    = useAlbumStore((s) => s.ratings[albumId] ?? 0);
  const setRating = useAlbumStore((s) => s.setRating);

  function nudgeUser() {
    setNudge(true);
    setTimeout(() => setNudge(false), 2500);
  }

  function onPointerDown(clientY: number) {
    if (!hasSetUsername()) { nudgeUser(); return; }
    dragRef.current = { startY: clientY, startVal: rating };
    setIsDragging(true);
  }

  const onPointerMove = useCallback((clientY: number) => {
    if (!dragRef.current) return;
    const delta = dragRef.current.startY - clientY;
    setRating(albumId, Math.min(100, Math.max(0, Math.round(dragRef.current.startVal + delta))));
  }, [albumId, setRating]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    document.body.style.cursor = "grabbing";
    const mm = (e: MouseEvent) => onPointerMove(e.clientY);
    const tm = (e: TouchEvent) => onPointerMove(e.touches[0].clientY);
    document.addEventListener("mousemove", mm);
    document.addEventListener("mouseup", onPointerUp);
    document.addEventListener("touchmove", tm, { passive: true });
    document.addEventListener("touchend", onPointerUp);
    return () => {
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", mm);
      document.removeEventListener("mouseup", onPointerUp);
      document.removeEventListener("touchmove", tm);
      document.removeEventListener("touchend", onPointerUp);
    };
  }, [isDragging, onPointerMove, onPointerUp]);

  // SVG geometry
  const sz     = compact ? 40 : 52;
  const cx     = sz / 2;
  const cy     = sz / 2;
  const rTrack = compact ? 17 : 22;
  const rKnob  = compact ? 12 : 15;
  const rDot   = compact ? 7.5 : 9.5;
  const sw     = compact ? 2.5 : 3;

  const circ   = 2 * Math.PI * rTrack;
  const arcLen = (SWEEP_DEG / 360) * circ;
  const active = (rating / 100) * arcLen;

  const indDeg = START_DEG + (rating / 100) * SWEEP_DEG;
  const indRad = (indDeg * Math.PI) / 180;
  const dotX   = cx + rDot * Math.cos(indRad);
  const dotY   = cy + rDot * Math.sin(indRad);

  const dial = (
    <svg
      width={sz} height={sz}
      viewBox={`0 0 ${sz} ${sz}`}
      onMouseDown={(e) => { e.preventDefault(); onPointerDown(e.clientY); }}
      onTouchStart={(e) => onPointerDown(e.touches[0].clientY)}
      onDoubleClick={() => hasSetUsername() && setRating(albumId, 0)}
      className={`select-none shrink-0 ${hasSetUsername() ? "cursor-grab" : "cursor-default"}`}
      aria-label={`Rating ${rating}/100. Drag up or down to adjust.`}
    >
      {/* Background arc */}
      <circle
        cx={cx} cy={cy} r={rTrack}
        fill="none"
        stroke="#27272a"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={`${arcLen} ${circ - arcLen}`}
        transform={`rotate(${START_DEG} ${cx} ${cy})`}
      />
      {/* Active arc */}
      {rating > 0 && (
        <circle
          cx={cx} cy={cy} r={rTrack}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${active} ${circ - active}`}
          transform={`rotate(${START_DEG} ${cx} ${cy})`}
        />
      )}
      {/* Knob body */}
      <circle cx={cx} cy={cy} r={rKnob} fill="#18181b" />
      <circle cx={cx} cy={cy} r={rKnob - 0.5} fill="none" stroke="#3f3f46" strokeWidth="0.75" />
      {/* Indicator dot */}
      <circle
        cx={dotX} cy={dotY}
        r={compact ? 2 : 2.5}
        fill={rating > 0 ? "#f59e0b" : "#52525b"}
      />
    </svg>
  );

  const trackBg = rating > 0
    ? `linear-gradient(to right, #f59e0b ${rating}%, #27272a ${rating}%)`
    : "#27272a";

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!hasSetUsername()) return;
    setRating(albumId, Number(e.target.value));
  }

  const slider = (
    <input
      type="range"
      min={0}
      max={100}
      value={rating}
      onChange={handleSliderChange}
      onClick={() => !hasSetUsername() && nudgeUser()}
      className="rating-slider w-full h-1.5 rounded-full appearance-none focus:outline-none"
      style={{ background: trackBg }}
    />
  );

  if (compact) {
    return (
      <div className="flex items-center gap-2.5 flex-1">
        {/* Mobile: slider */}
        <div className="flex items-center gap-2.5 flex-1 sm:hidden">
          <span className={`text-sm font-bold tabular-nums w-7 text-right shrink-0 leading-none ${rating > 0 ? "text-amber-400" : "text-zinc-600"}`}>
            {rating > 0 ? rating : "—"}
          </span>
          {slider}
          {nudge && <span className="text-zinc-400 text-[10px] shrink-0">Set a username</span>}
        </div>
        {/* Desktop: dial */}
        <div className="hidden sm:flex items-center gap-2.5">
          {dial}
          <div className="flex flex-col gap-0.5">
            <span className={`text-base font-bold tabular-nums leading-none ${rating > 0 ? "text-amber-400" : "text-zinc-600"}`}>
              {rating > 0 ? rating : "—"}
            </span>
            {nudge && <span className="text-zinc-400 text-[10px]">Set a username</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Mobile: slider */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Your rating</p>
          <div className="flex items-center gap-1.5">
            {rating > 0 && <span className="text-zinc-500 text-[11px]">{getLabel(rating)}</span>}
            <span className={`text-xl font-bold leading-none tabular-nums ${rating > 0 ? "text-amber-400" : "text-zinc-600"}`}>
              {rating > 0 ? rating : "—"}
            </span>
          </div>
        </div>
        {slider}
        {nudge && <p className="text-[11px] mt-1.5 text-zinc-400">Set a username to rate</p>}
      </div>
      {/* Desktop: dial */}
      <div className="hidden sm:block">
        <div className="flex items-center gap-3">
          {dial}
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold tabular-nums leading-none ${rating > 0 ? "text-amber-400" : "text-zinc-600"}`}>
                {rating > 0 ? rating : "—"}
              </span>
              {rating > 0 && <span className="text-zinc-600 text-xs">/100</span>}
            </div>
            <p className="text-[10px] uppercase tracking-widest font-semibold mt-1 text-zinc-500">
              {rating > 0 ? getLabel(rating) : "your rating"}
            </p>
          </div>
        </div>
        {nudge && <p className="text-[11px] mt-2 text-zinc-400">Set a username to rate</p>}
      </div>
    </div>
  );
}
