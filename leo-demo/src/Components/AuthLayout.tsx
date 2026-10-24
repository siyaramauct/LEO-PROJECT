// -----------------------------------------------------------------------------
// Auth Layout
//
// The shared frame around the login and signup forms.
//
//   Phone and tablet (under 1024px)   a photo across the top, the form below,
//                                     scrolling together as one page
//   Desktop (1024px and up)           a violet branding panel on the left,
//                                     the form centred on the right
//
// The page passes its heading, subheading and form as props and children.
//
// Used by: Login || Signup
// -----------------------------------------------------------------------------

import type { ReactNode } from "react";
import { projectImageUrl } from "../utils/images";

type AuthLayoutProps = {
  heading: string;
  subheading: string;
  children: ReactNode;
};

export default function AuthLayout({ heading, subheading, children }: AuthLayoutProps) {
  // -- Photo header, phones and tablets only --

  const mobileHeader = (
    <div className="h-56 w-full flex-shrink-0 overflow-hidden md:h-72 lg:hidden">
      <img
        src={projectImageUrl("language-header-signup.jpg")}
        alt="Language learning"
        className="h-full w-full object-cover brightness-[1.04] contrast-[1.06]"
      />
    </div>
  );

  // -- Branding panel, desktop only --

  const desktopPanel = (
    <div className="hidden flex-shrink-0 bg-violet-700 lg:flex lg:h-full lg:w-[46%] lg:flex-col lg:items-center lg:justify-between lg:px-12 lg:py-12">
      <div className="text-center">
        <h1 className="whitespace-nowrap text-base font-extrabold tracking-wide text-white lg:mb-2 lg:text-[2rem]">
          Learn English Online
        </h1>
        <p className="text-[11px] leading-relaxed text-violet-200 lg:mt-1 lg:text-sm">
          Language learning for the real world.
        </p>
      </div>

      <div className="hidden w-full flex-1 items-center justify-center lg:flex">
        <div className="h-[70%] w-[88%] overflow-hidden rounded-3xl shadow-2xl shadow-violet-900/40">
          {/* Lazy, so phones and tablets, where this panel is hidden, never
              download the picture. Desktop still loads it straight away. */}
          <img
            src={projectImageUrl("stockPhotoHandCards.png")}
            alt="Language learning illustration"
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <p className="hidden text-center text-[11px] text-violet-300/40 lg:block">
        &copy; 2026 Learn English Online
      </p>
    </div>
  );

  // -- Form column --
  // Centred vertically on desktop. On phones it doesn't scroll by itself: the
  // whole page does, so the browser can lift a field above the keyboard.

  const formColumn = (
    <div className="flex flex-1 flex-col justify-start px-6 pb-8 pt-6 lg:justify-center lg:overflow-hidden lg:px-0 lg:py-0">
      <div className="mx-auto w-full max-w-xs md:max-w-sm">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold tracking-tight text-gray-900 lg:text-2xl">{heading}</h2>
          <p className="mt-1 text-xs text-gray-400">{subheading}</p>
        </div>
        {children}
      </div>
    </div>
  );

  // Only desktop locks the page to the screen height. Locking it on phones
  // stops Chrome on iPhone from scrolling a field out from under the keyboard.
  return (
    <div className="flex min-h-dvh w-full flex-col bg-white lg:h-screen lg:flex-row lg:overflow-hidden">
      {mobileHeader}
      {desktopPanel}
      {formColumn}
    </div>
  );
}

// The "or sign in with email" line between the Google button and the form.
export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-[11px] font-medium text-gray-400">{label}</span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}
