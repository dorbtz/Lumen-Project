/**
 * Inline SVG filter used by `.glass-vibrant` to produce Apple's "liquid" refraction.
 * SPEC §5.2: feTurbulence + feDisplacementMap = the liquid feel.
 *
 * Mount ONCE in the root layout. Filter id is `#lumen-liquid-displace`.
 * Firefox falls back to flat glass (per CSS `@supports`), so this filter is harmless there.
 */

export function LiquidDisplacementFilter() {
  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }} focusable={false}>
      <defs>
        <filter id="lumen-liquid-displace" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.018"
            numOctaves="2"
            seed="3"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="1.6" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale="14"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
