import { SpinnerIcon } from "@/components/Icons";

export default function AppLoading() {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-slate-400">
      <SpinnerIcon className="h-6 w-6 animate-spin" />
      <span className="text-sm">Loading...</span>
    </div>
  );
}
