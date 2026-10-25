// Listings without an uploaded image get a generated pattern cover, drawn
// from the listing slug so it stays the same everywhere.

const PALETTES = [
  { bg: "#e9dcc6", ink: "#3d2f1f", accent: "#b5441b" },
  { bg: "#d8e0d1", ink: "#24352a", accent: "#4f7a3a" },
  { bg: "#d9dde4", ink: "#1f2a3a", accent: "#3a6189" },
  { bg: "#ecd5cc", ink: "#3b211b", accent: "#a33a2a" },
  { bg: "#e6e0cf", ink: "#2d2a20", accent: "#8a6a17" },
  { bg: "#dcd3e0", ink: "#2c2133", accent: "#6b4785" },
];

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function Cover({
  slug,
  category,
  coverFile,
  title,
  className = "",
}: {
  slug: string;
  category: string;
  coverFile?: string | null;
  title: string;
  className?: string;
}) {
  if (coverFile) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user uploads are served by our own route
      <img src={`/api/files/${coverFile}`} alt={title} className={`h-full w-full object-cover ${className}`} />
    );
  }

  const r = rng(slug);
  const p = PALETTES[Math.floor(r() * PALETTES.length)];

  return (
    <svg viewBox="0 0 400 300" className={`h-full w-full ${className}`} role="img" aria-label={title} preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="300" fill={p.bg} />
      <Pattern category={category} r={r} ink={p.ink} accent={p.accent} />
    </svg>
  );
}

function Pattern({ category, r, ink, accent }: { category: string; r: () => number; ink: string; accent: string }) {
  switch (category) {
    case "writing":
    case "idea": {
      const lines = Array.from({ length: 9 }, (_, i) => {
        const y = 70 + i * 22;
        const w = i === 8 ? 90 + r() * 80 : 220 + r() * 90;
        return <path key={i} d={`M60 ${y} q ${w / 2} ${r() * 4 - 2} ${w} 0`} stroke={ink} strokeOpacity={0.55} strokeWidth="2.5" fill="none" strokeLinecap="round" />;
      });
      return (
        <>
          {lines}
          {category === "idea" ? (
            <circle cx={300 + r() * 40} cy={70} r={22} fill="none" stroke={accent} strokeWidth="3" />
          ) : (
            <path d="M48 50 v200" stroke={accent} strokeWidth="2" />
          )}
        </>
      );
    }
    case "poetry": {
      return (
        <>
          {Array.from({ length: 4 }, (_, s) =>
            Array.from({ length: 3 }, (_, l) => {
              const y = 60 + s * 58 + l * 15;
              return (
                <path key={`${s}-${l}`} d={`M${110 + (l % 2) * 18} ${y} h ${70 + r() * 110}`} stroke={ink} strokeOpacity={0.6} strokeWidth="2.5" strokeLinecap="round" />
              );
            }),
          )}
          <path d={`M70 ${80 + r() * 100} c 10 -30, 30 -30, 20 10`} stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    }
    case "code":
    case "website": {
      const rows = Array.from({ length: 10 }, (_, i) => {
        const indent = [0, 1, 2, 2, 1, 2, 3, 2, 1, 0][i] * 22;
        const segs = 1 + Math.floor(r() * 3);
        let x = 70 + indent;
        return Array.from({ length: segs }, (_, j) => {
          const w = 24 + r() * 70;
          const el = <rect key={`${i}-${j}`} x={x} y={62 + i * 19} width={w} height={8} rx={4} fill={j === 0 && r() > 0.6 ? accent : ink} fillOpacity={j === 0 ? 0.75 : 0.35} />;
          x += w + 10;
          return el;
        });
      });
      return (
        <>
          {category === "website" && (
            <>
              <rect x="40" y="30" width="320" height="240" rx="10" fill="none" stroke={ink} strokeOpacity="0.5" strokeWidth="2" />
              <path d="M40 50 h320" stroke={ink} strokeOpacity="0.5" strokeWidth="2" />
              <circle cx="54" cy="40" r="3.5" fill={accent} />
            </>
          )}
          {rows}
        </>
      );
    }
    case "music": {
      return (
        <>
          {Array.from({ length: 38 }, (_, i) => {
            const h = 10 + Math.abs(Math.sin(i * 0.45 + r() * 2)) * 110 * (0.4 + r() * 0.6);
            return <rect key={i} x={48 + i * 8.2} y={150 - h / 2} width={4} height={h} rx={2} fill={i % 9 === 0 ? accent : ink} fillOpacity={0.7} />;
          })}
        </>
      );
    }
    case "photography": {
      const cx = 160 + r() * 80;
      const cy = 130 + r() * 40;
      return (
        <>
          {[110, 80, 50, 22].map((rad, i) => (
            <circle key={rad} cx={cx} cy={cy} r={rad} fill="none" stroke={i === 3 ? accent : ink} strokeOpacity={i === 3 ? 1 : 0.45} strokeWidth={i === 3 ? 4 : 2} />
          ))}
          <rect x="24" y="24" width="352" height="252" fill="none" stroke={ink} strokeOpacity="0.3" strokeWidth="2" strokeDasharray="2 8" />
        </>
      );
    }
    case "design": {
      return (
        <>
          {Array.from({ length: 5 }, (_, i) => (
            <path key={`v${i}`} d={`M${80 + i * 60} 30 v240`} stroke={ink} strokeOpacity="0.15" />
          ))}
          <rect x={90 + r() * 30} y={70} width={110} height={110} fill={ink} fillOpacity="0.8" />
          <circle cx={240 + r() * 30} cy={170} r={55} fill={accent} fillOpacity="0.85" />
          <path d={`M110 240 L 170 200 L 230 240 Z`} fill="none" stroke={ink} strokeWidth="3" />
        </>
      );
    }
    case "art": {
      return (
        <>
          {Array.from({ length: 6 }, (_, i) => {
            const x = 70 + r() * 260;
            const y = 60 + r() * 180;
            const w = 40 + r() * 90;
            return (
              <path
                key={i}
                d={`M${x} ${y} c ${w * 0.5} ${-w * 0.6}, ${w * 1.2} ${-w * 0.1}, ${w} ${w * 0.5} s ${-w * 0.9} ${w * 0.7}, ${-w} 0 z`}
                fill={i % 3 === 0 ? accent : ink}
                fillOpacity={i % 3 === 0 ? 0.75 : 0.25 + r() * 0.35}
              />
            );
          })}
        </>
      );
    }
    default: {
      return (
        <>
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={`M${-60 + i * 40} 300 L ${60 + i * 40} 0`} stroke={i % 4 === 0 ? accent : ink} strokeOpacity={i % 4 === 0 ? 0.8 : 0.3} strokeWidth="6" />
          ))}
        </>
      );
    }
  }
}
