interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer circle */}
      <circle cx="50" cy="50" r="47" stroke="white" strokeWidth="2" fill="none" />

      {/* Perch bar */}
      <line x1="6" y1="66" x2="94" y2="66" stroke="white" strokeWidth="3" strokeLinecap="round" />

      {/* Bird body — rounded egg rotated slightly forward */}
      <ellipse cx="42" cy="57" rx="17" ry="10" fill="white" transform="rotate(-12 42 57)" />

      {/* Head — overlaps body to form continuous silhouette */}
      <circle cx="58" cy="47" r="10" fill="white" />

      {/* Tail — extends left from body */}
      <polygon points="26,63 7,53 28,61" fill="white" />

      {/* Beak */}
      <polygon points="68,47 80,43 68,51" fill="white" />

      {/* Eye */}
      <circle cx="61" cy="45" r="1.8" fill="black" />

      {/* Subtle 420 */}
      <text
        x="67"
        y="31"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="8"
        fill="white"
        opacity="0.35"
        letterSpacing="0.5"
      >
        420
      </text>
    </svg>
  );
}
