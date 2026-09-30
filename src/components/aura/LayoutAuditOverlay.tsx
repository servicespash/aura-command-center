import { useEffect, useState } from "react";

export function LayoutAuditOverlay() {
  const [issues, setIssues] = useState<HTMLElement[]>([]);

  useEffect(() => {
    const checkLayout = () => {
      const problematic: HTMLElement[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const el = node as HTMLElement;
        const style = window.getComputedStyle(el);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.overflow === "hidden"
        ) {
          problematic.push(el);
        }
      }
      setIssues(problematic);
    };
    checkLayout();
  }, []);

  return (
    <>
      {issues.map((el, i) => (
        <div
          key={i}
          className="absolute border-2 border-red-500 bg-red-500/20 z-[1000] pointer-events-none"
          style={{
            top: el.getBoundingClientRect().top,
            left: el.getBoundingClientRect().left,
            width: el.getBoundingClientRect().width,
            height: el.getBoundingClientRect().height,
          }}
        />
      ))}
    </>
  );
}
