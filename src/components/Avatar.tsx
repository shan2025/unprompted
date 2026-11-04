/** A person's photo, or their first initial when they haven't added one. */
export function Avatar({ name, file, className = "" }: { name: string; file: string | null; className?: string }) {
  if (file) {
    // eslint-disable-next-line @next/next/no-img-element -- served from our own file route
    return <img src={`/api/files/${file}`} alt="" className={`rounded-full object-cover ${className}`} />;
  }
  return (
    <span className={`flex items-center justify-center rounded-full bg-ink font-semibold uppercase text-white ${className}`}>
      {name.trim().charAt(0) || "?"}
    </span>
  );
}
