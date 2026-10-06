"use client";

import { DocumentIcon, MusicIcon } from "@/components/Icons";
import { useDisguise, useLabels } from "@/lib/disguise";

/** Login heading block that follows the active disguise. */
export function LoginBrand() {
  const { isWork } = useDisguise();
  const labels = useLabels();

  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-300">
        {isWork ? (
          <DocumentIcon className="h-7 w-7" />
        ) : (
          <MusicIcon className="h-7 w-7" />
        )}
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        {labels.brand}
      </h1>
      <p className="mt-2 text-sm text-slate-400">{labels.loginTagline}</p>
    </div>
  );
}

/** Login legal footnote that follows the active disguise. */
export function LoginFooter() {
  const labels = useLabels();

  return (
    <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
      {labels.loginFooter}
    </p>
  );
}
