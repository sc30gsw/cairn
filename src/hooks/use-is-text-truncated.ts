import { useLayoutEffect, useState, type RefObject } from "react";

function isElementTruncated(element: HTMLElement): boolean {
  return (
    element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1
  );
}

function hasTruncatedContent(element: HTMLElement): boolean {
  if (isElementTruncated(element)) {
    return true;
  }
  return [...element.querySelectorAll<HTMLElement>("*")].some(isElementTruncated);
}

export function useIsTextTruncated(ref: RefObject<HTMLElement | null>, content: string): boolean {
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null || content === "") {
      setTruncated(false);
      return;
    }

    function update() {
      const current = ref.current;
      if (current === null) {
        return;
      }
      setTruncated(hasTruncatedContent(current));
    }

    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const descendant of element.querySelectorAll<HTMLElement>("*")) {
      observer.observe(descendant);
    }
    return () => observer.disconnect();
  }, [content, ref]);

  return truncated;
}
