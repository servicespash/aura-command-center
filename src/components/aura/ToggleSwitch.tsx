import { useState } from "react";

export function ToggleSwitch({
  labelLeft,
  labelRight,
  onChange,
}: {
  labelLeft: string;
  labelRight: string;
  onChange: (value: "left" | "right") => void;
}) {
  const [value, setValue] = useState<"left" | "right">("left");

  const toggle = () => {
    const newValue = value === "left" ? "right" : "left";
    setValue(newValue);
    onChange(newValue);
  };

  return (
    <button
      onClick={toggle}
      className="panel flex items-center rounded border border-border bg-background p-0.5"
    >
      <span
        className={`rounded px-2 py-1 text-[10px] uppercase tracking-wider transition-colors ${
          value === "left" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
        }`}
      >
        {labelLeft}
      </span>
      <span
        className={`rounded px-2 py-1 text-[10px] uppercase tracking-wider transition-colors ${
          value === "right" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
        }`}
      >
        {labelRight}
      </span>
    </button>
  );
}
