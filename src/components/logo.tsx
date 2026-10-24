import { LOGO_DATA_URI } from "@/lib/logo";

// The MenaxhoRentin monogram. Pass a className to size it (e.g. "h-9 w-9").
export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={LOGO_DATA_URI} alt="MenaxhoRentin" className={className} style={{ objectFit: "contain" }} />;
}
