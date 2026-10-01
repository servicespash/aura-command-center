export const auditLayout = (node: HTMLElement) => {
  let current: HTMLElement | null = node;
  console.log(`--- Starting Layout Audit for ${node.tagName}#${node.id} ---`);
  while (current) {
    const style = window.getComputedStyle(current);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      parseFloat(style.opacity) === 0
    ) {
      console.warn(
        `[LayoutAuditor] HIDDEN ANCESTOR:`,
        current,
        `Display: ${style.display}`,
        `Visibility: ${style.visibility}`,
        `Opacity: ${style.opacity}`,
      );
    }
    current = current.parentElement;
  }
  console.log(`--- Layout Audit Complete ---`);
};
