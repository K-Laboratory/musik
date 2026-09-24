import type { Provider } from "@supabase/supabase-js";

export type OAuthIcon = "google" | "facebook" | "github";

export interface OAuthProviderConfig {
  /** Supabase provider id. Must match the provider name in Supabase Auth. */
  id: Provider;
  /** Text shown on the sign-in button. */
  label: string;
  /** Which inline SVG icon to render. */
  icon: OAuthIcon;
  /** Tailwind classes for the button. */
  className: string;
}

/**
 * Social login providers.
 *
 * To add another provider (e.g. GitHub) simply add an entry below AND enable
 * that provider in Supabase: Authentication -> Providers. Nothing else in the
 * app needs to change - the login page renders this list automatically.
 */
export const OAUTH_PROVIDERS: OAuthProviderConfig[] = [
  {
    id: "google",
    label: "Google",
    icon: "google",
    className:
      "bg-white text-slate-900 hover:bg-slate-100 focus-visible:outline-white",
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: "facebook",
    className:
      "bg-[#1877F2] text-white hover:bg-[#166fe5] focus-visible:outline-[#1877F2]",
  },
  // Example for later:
  // {
  //   id: "github",
  //   label: "GitHub",
  //   icon: "github",
  //   className: "bg-slate-800 text-white hover:bg-slate-700",
  // },
];
