// -----------------------------------------------------------------------------
// useTypingOnTouchScreen
//
// True while the on-screen keyboard is likely up: a field that takes typing
// (or a dropdown, which opens its own picker) has focus on a touch screen. The
// bottom bars hide while it is, because the keyboard doesn't shrink the page
// on phones: a bar pinned to the bottom would float over the field being typed
// in, or sit just above the keyboard covering the page.
//
// Focus alone isn't enough on Android: its back button closes the keyboard but
// leaves the field focused. So the visible height (visualViewport) is watched
// too: it shrinks when the keyboard opens and grows back when it closes, on
// iPhone and Android alike.
//
// Mouse and keyboard users always get false, so the bars never hide on them.
// -----------------------------------------------------------------------------

import { useEffect, useState } from "react";

// Inputs that don't bring up a keyboard.
const NON_TYPING_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

function isTypingField(element: Element | null): boolean {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    return true;
  }

  if (element instanceof HTMLInputElement) {
    return !NON_TYPING_INPUT_TYPES.has(element.type);
  }

  return element instanceof HTMLElement && element.isContentEditable;
}

function isTouchScreen(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

export default function useTypingOnTouchScreen(): boolean {
  const [isTyping, setIsTyping] = useState(
    () => isTouchScreen() && isTypingField(document.activeElement),
  );

  useEffect(() => {
    let timer = 0;
    // The visible height when typing began (0 while not typing), and whether
    // the keyboard has come up since.
    let fullHeight = 0;
    let keyboardSeen = false;

    const visibleHeight = () => window.visualViewport?.height ?? window.innerHeight;

    // Moving from one field to the next fires focusout before the next field
    // has focus, so check a tick later, or the bar would flash up in between.
    const checkFocus = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const typing = isTouchScreen() && isTypingField(document.activeElement);

        if (!typing) {
          fullHeight = 0;
          keyboardSeen = false;
        } else if (!fullHeight) {
          // Typing just began, so the keyboard isn't up yet: remember the full height.
          fullHeight = visibleHeight();
        }

        setIsTyping(typing);
      }, 0);
    };

    // While a field is focused: a much shorter screen means the keyboard is up;
    // back to full height means it was closed (e.g. Android's back button).
    const checkHeight = () => {
      if (!fullHeight) {
        return;
      }

      const height = visibleHeight();

      if (height < fullHeight * 0.8) {
        keyboardSeen = true;
        setIsTyping(true);
      } else if (keyboardSeen && height > fullHeight * 0.9) {
        setIsTyping(false);
      }
    };

    const viewport = window.visualViewport ?? window;

    document.addEventListener("focusin", checkFocus);
    document.addEventListener("focusout", checkFocus);
    viewport.addEventListener("resize", checkHeight);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("focusin", checkFocus);
      document.removeEventListener("focusout", checkFocus);
      viewport.removeEventListener("resize", checkHeight);
    };
  }, []);

  return isTyping;
}
