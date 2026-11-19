import Image from "next/image";
import Link from "next/link";

// Real brand assets (FragranceLab_Logo_Assets) — primary lockup is
// 1480x420, symbol mark is 380x400. Dimensions below preserve those actual
// aspect ratios rather than assuming a square mark.
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" aria-label="FragranceLab home" className="inline-flex items-center text-ink">
      {compact ? (
        <Image src="/brand/fragrancelab-symbol.png" alt="FragranceLab" width={380} height={400} className="h-8 w-auto" priority />
      ) : (
        <Image src="/brand/fragrancelab-primary.png" alt="FragranceLab" width={1480} height={420} className="h-8 w-auto" priority />
      )}
    </Link>
  );
}
