import { CountUp } from "./CountUp";
import { LEVELS, LEVEL_INFO, scoreNotes, upgradeScore, STAGE_INFO, TIER_INFO, type Score, type Tier } from "@/lib/scoring";

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

// Light tier-colored backgrounds for the pill version of the label (the feed).
const TIER_TINT: Record<Tier, string> = {
  "human-made": "bg-human/10 text-human",
  "human-led": "bg-led/10 text-led",
  "ai-assisted": "bg-assist/10 text-assist",
  "ai-heavy": "bg-heavy/10 text-heavy",
};

/** Small "3% AI" label for cards and tables. */
/** `unscanned` marks work no scan could check (video), so the number is only the creator's word. */
/** `tinted` sets it in a pill colored by its tier, for the phone feed. */
export function AiPill({
  percent,
  tier,
  verified,
  unscanned,
  tinted,
}: {
  percent: number;
  tier: string;
  verified?: boolean;
  unscanned?: boolean;
  tinted?: boolean;
}) {
  const look = tinted
    ? `h-[26px] rounded-full px-2.5 font-bold ${TIER_TINT[tier as Tier] ?? "bg-field text-ink-soft"}`
    : "font-semibold text-ink-soft";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${look}`}>
      <span className={`h-2 w-2 rounded-full ${TIER_BG[tier as Tier] ?? "bg-ink"}`} aria-hidden="true" />
      {percent}% AI score
      {verified && (
        <span className="text-human" title="Process evidence reviewed by a moderator">
          <CheckIcon className="h-3.5 w-3.5" />
          <span className="sr-only">process evidence reviewed</span>
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

function introFx(intro: boolean | undefined, cls: string, ms: number) {
  return intro ? { cls: ` ${cls}`, style: { "--d": `${ms}ms` } as React.CSSProperties } : { cls: "", style: undefined };
}

function levelFor(value: number) {
  return LEVELS.find((l) => LEVEL_INFO[l].value === value) ?? "none";
}

/** `intro` plays the card forming once on load: used for the home page example. */
export function ScoreCard({
  score: storedScore,
  evidenceCount,
  unscanned,
  intro,
}: {
  score: Score;
  evidenceCount?: number;
  unscanned?: boolean;
  intro?: boolean;
}) {
  const score = upgradeScore(storedScore);
  // Rebuilt from the score rather than read from it, so stored scores show the current wording.
  const notes = scoreNotes(score);
  const stamp = introFx(intro, "si-pop", 700);
  const head = introFx(intro, "si-rise", 600);
  const label = introFx(intro, "si-rise", 1150);
  const foot = introFx(intro, "si-rise", 1250 + score.stages.length * 80);
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="eyebrow">AI disclosure & scan score</span>
        <span className={stamp.cls.trim() || undefined} style={stamp.style}>
          <TierStamp tier={score.tier} />
        </span>
      </div>
      {unscanned && <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-xs leading-relaxed text-ink-soft">{UNSCANNED_NOTE}</p>}

      <div className={`mt-2 flex items-baseline gap-3${head.cls}`} style={head.style}>
        <span className={`font-display text-5xl font-light tracking-tight ${tierColor(score.tier)}`}>{intro ? <CountUp to={score.percent} delay={700} /> : score.percent}%</span>
        <span className="text-sm text-ink-soft">
          uncalibrated heuristic
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">A weighted disclosure and scan score, not a measured share of AI or a probability. No validated confidence interval is available.</p>

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
            <span className="font-semibold text-human">Evidence reviewed</span>
          </>
        ) : (
          <span className="text-ink-soft">{evidenceCount ? "Evidence attached · not reviewed" : "No reviewed process evidence"}</span>
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
