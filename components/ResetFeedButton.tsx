"use client";

export function ResetFeedButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("reset-feed"))}
      className="flex items-center gap-2 cursor-pointer group"
      aria-label="Back to feed"
    >
      <div className="relative w-8 h-8 sm:w-10 sm:h-10 shrink-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/flockify.png"
          alt="Flockify logo"
          className="h-8 sm:h-10 w-auto invert"
          style={{ maxWidth: "none" }}
        />
        <span className="absolute bottom-0 right-0 text-[6px] text-white/40 font-mono leading-none">4.2.0</span>
      </div>
      <span className="text-white font-bold text-base tracking-wide">
        flockify<span className="text-zinc-500 font-normal text-sm ml-0.5">discographies</span>
      </span>
    </button>
  );
}
