import { isUat } from "@/lib/appEnv";

export function UatBanner() {
  if (!isUat) return null;

  return (
    <div className="sticky top-0 z-[100] bg-amber-500 px-4 py-1.5 text-center text-sm font-semibold text-black">
      UAT — School Cab Admin acceptance testing
    </div>
  );
}
