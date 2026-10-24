// -----------------------------------------------------------------------------
// Banner Description
//
// A classroom description inside a violet classroom banner. On phones and
// tablets a long description stops at three lines, with a "Read more" button
// to show the rest. Desktop always shows all of it, with no button.
//
// Used by: StudentClassroomDetail || ClassroomDetail
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";

type BannerDescriptionProps = {
  text: string;
  // Spacing, text size and colour, which differ between the banners.
  className: string;
};

export default function BannerDescription({ text, className }: BannerDescriptionProps) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isCutOff, setIsCutOff] = useState(false);

  // Checks whether three lines hide part of the text, so short descriptions
  // get no button. Runs again whenever the text's box changes size, e.g. when
  // a phone turns sideways or the description is opened and closed.
  useEffect(() => {
    const element = textRef.current;
    if (!element) {
      return;
    }

    const checkIfCutOff = () => {
      setIsCutOff(element.scrollHeight > element.clientHeight + 1);
    };

    checkIfCutOff();
    const observer = new ResizeObserver(checkIfCutOff);
    observer.observe(element);

    return () => observer.disconnect();
  }, [text]);

  // While open, nothing is cut off, but the button stays so it can close again.
  const showButton = expanded || isCutOff;

  return (
    <>
      <p
        ref={textRef}
        className={`${className} ${expanded ? "" : "line-clamp-3"} lg:line-clamp-none`}
      >
        {text}
      </p>
      {showButton && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="mt-1 rounded py-1 text-xs font-semibold text-white underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:hidden"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </>
  );
}
