import { CountUp } from "./CountUp";
import { LEVELS, LEVEL_INFO, scoreNotes, STAGE_INFO, TIER_INFO, type Score, type Tier } from "@/lib/scoring";

const TIER_TEXT: Record<Tier, string> = {
  "human-made": "text-human",
  "human-led": "text-led",
  "ai-assisted": "text-assist",
  "ai-heavy": "text-heavy",
};

const TIER_BG: Record<Tier, string> = {
  "human-made": "bg-human",
  "human-led": "bg-led",
  "ai-assisted": "bg-assist",
  "ai-heavy": "bg-heavy",
};

export function tierColor(tier: string) {
  return TIER_TEXT[tier as Tier] ?? "text-ink";
}

export function TierStamp({ tier, size = "md" }: { tier: string; size?: "sm" | "md" }) {
  const info = TIER_INFO[tier as Tier];
  if (!info) return null;
  return (
    <span
      className={`inline-flex items-center border border-current font-semibold uppercase tracking-[0.1em] ${tierColor(tier)} ${
        size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"
      }`}
    >
      {info.label}
    </span>
  );
}

/** Small "3% AI" label for cards and tables. */
/** `unscanned` marks work no scan could check (video), so the number is only the creator's word. */
export function AiPill({ percent, tier, verified, unscanned }: { percent: number; tier: string; verified?: boolean; unscanned?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
      <span className={`h-2 w-2 rounded-full ${TIER_BG[tier as Tier] ?? "bg-ink"}`} aria-hidden="true" />
      {percent}% AI
      {verified && (
        <span className="text-human" title="Process evidence attached by the creator">
          <CheckIcon className="h-3.5 w-3.5" />
          <span className="sr-only">process evidence attached</span>
        </span>
      )}
      {unscanned && (
        <span className="font-medium text-muted" title="Video can't be scanned for AI. This is the creator's own disclosure.">
          · not scanned
        </span>
      )}
    </span>
  );
}

const UNSCANNED_NOTE =
  "Self-reported. Video can't be scanned for AI, so this rests on the creator's disclosure and any process evidence. Report it if something doesn't add up.";

export function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Each tier gets an equal-ish share of the bar so the low end, where most
// human work sits, stays readable.
const STOPS: [number, number][] = [
  [0, 0],
  [5, 15],
  [20, 40],
  [50, 70],
  [100, 100],
];

// With `intro`, returns the animation class and stagger delay for one piece of
// the forming card (keyframes in globals.css); otherwise nothing.
function introFx(intro: boolean | undefined, cls: string, ms: number) {
  return intro ? { cls: ` ${cls}`, style: { "--d": `${ms}ms` } as React.CSSProperties } : { cls: "", style: undefined };
}

function position(percent: number) {
  for (let i = 1; i < STOPS.length; i++) {
    const [v0, p0] = STOPS[i - 1];
    const [v1, p1] = STOPS[i];
    if (percent <= v1) return p0 + ((percent - v0) / (v1 - v0)) * (p1 - p0);
  }
  return 100;
}

export function AiMeter({ percent, low, high, intro }: { percent: number; low: number; high: number; intro?: boolean }) {
  const lo = position(low);
  const hi = position(high);
  const track = introFx(intro, "si-grow", 750);
  const band = introFx(intro, "si-grow", 1000);
  const mark = introFx(intro, "si-slide", 1050);
  const ticks = introFx(intro, "si-rise", 900);
  return (
    <div>
      <div
        className="relative h-3 rounded-full"
        role="img"
        aria-label={`Estimated ${percent}% AI involvement, likely between ${low}% and ${high}%`}
      >
        <div className={`absolute inset-0 flex overflow-hidden rounded-full${track.cls}`} style={track.style}>
          <div className="h-full w-[15%] bg-human/25" />
          <div className="h-full w-[25%] bg-led/25" />
          <div className="h-full w-[30%] bg-assist/25" />
          <div className="h-full w-[30%] bg-heavy/25" />
        </div>
        <div
          className={`absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink/35${band.cls}`}
          style={{ ...band.style, left: `${lo}%`, width: `${Math.max(hi - lo, 1)}%` }}
        />
        <div
          className={`absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-2 ring-card${mark.cls}`}
          style={{ ...mark.style, left: `${position(percent)}%` }}
        />
      </div>
      <div className={`relative mt-1.5 h-4 text-[10px] font-medium text-muted${ticks.cls}`} style={ticks.style}>
        {STOPS.map(([v, p]) => (
          <span
            key={v}
            className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
            style={{ left: `${p}%` }}
          >
            {v}
            {v === 100 && "%"}
          </span>
        ))}
      </div>
    </div>
  );
}

function levelFor(value: number) {
  return LEVELS.find((l) => LEVEL_INFO[l].value === value) ?? "none";
}

/** `intro` plays the card forming once on load: used for the home page example. */
export function ScoreCard({
  score,
  evidenceCount,
  unscanned,
  intro,
}: {
  score: Score;
  evidenceCount?: number;
  unscanned?: boolean;
  intro?: boolean;
}) {
  // Rebuilt from the score rather than read from it, so stored scores show the current wording.
  const notes = scoreNotes(score);
  const stamp = introFx(intro, "si-pop", 700);
  const head = introFx(intro, "si-rise", 600);
  const label = introFx(intro, "si-rise", 1150);
  const foot = introFx(intro, "si-rise", 1250 + score.stages.length * 80);
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="eyebrow">AI involvement</span>
        <span className={stamp.cls.trim() || undefined} style={stamp.style}>
          <TierStamp tier={score.tier} />
        </span>
      </div>
      {unscanned && <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-xs leading-relaxed text-ink-soft">{UNSCANNED_NOTE}</p>}

      <div className={`mt-2 flex items-baseline gap-3${head.cls}`} style={head.style}>
        <span className={`font-display text-5xl font-light tracking-tight ${tierColor(score.tier)}`}>{intro ? <CountUp to={score.percent} delay={700} /> : score.percent}%</span>
        <span className="text-sm text-ink-soft">
          estimated
          <br />
          likely {score.low}–{score.high}%
        </span>
      </div>

      <div className="mt-4">
        <AiMeter percent={score.percent} low={score.low} high={score.high} intro={intro} />
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <span className={`eyebrow block${label.cls}`} style={label.style}>
          Where AI was used
        </span>
        <ul className="mt-2 space-y-2.5">
          {score.stages.map((s, i) => {
            const level = levelFor(s.disclosed);
            const row = introFx(intro, "si-rise", 1250 + i * 80);
            return (
              <li key={s.stage} className={`text-sm${row.cls}`} style={row.style}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-soft">{STAGE_INFO[s.stage].label}</span>
                  <span className={`font-semibold ${level === "none" ? "text-human" : "text-ink"}`}>
                    {LEVEL_INFO[level].label}
                  </span>
                </div>
                {s.detected !== null && (
                  <div className="mt-0.5 text-xs text-muted">
                    Automated scan: {Math.round(s.detected * 100)}% looks machine-made
                    {s.effective > s.disclosed + 0.005 && <span className="text-assist"> · raised the estimate</span>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className={`mt-4 flex items-center gap-2 border-t border-line pt-4 text-sm${foot.cls}`} style={foot.style}>
        {score.processVerified ? (
          <>
            <CheckIcon className="h-4 w-4 text-human" />
            <span className="font-semibold text-human">Evidence attached</span>
          </>
        ) : (
          <span className="text-ink-soft">Process evidence: {Math.round(score.evidenceStrength * 100)}% strength</span>
        )}
        {evidenceCount !== undefined && (
          <span className="ml-auto text-xs text-muted">
            {evidenceCount} {evidenceCount === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      {notes.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-muted">
          {notes.map((n) => (
            <li key={n}>· {n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
