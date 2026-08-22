import { useLayoutEffect, useState, type RefObject } from "react";

function isElementTruncated(element: HTMLElement): boolean {
  return (
    element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1
  );
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
      setTruncated(isElementTruncated(current));
    }

    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [content, ref]);

  return truncated;
}
