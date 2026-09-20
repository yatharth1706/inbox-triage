import { pillStyle } from "@/lib/category-styles";

export function CategoryPill({
  label,
  color,
  size = "sm",
}: {
  label: string;
  color: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={[
        "whitespace-nowrap rounded-full border font-mono uppercase",
        size === "sm"
          ? "px-[9px] py-1 text-[9.5px] tracking-[0.07em]"
          : "px-[11px] py-[5px] text-[10.5px] tracking-[0.06em]",
      ].join(" ")}
      style={pillStyle(color)}
    >
      {label}
    </span>
  );
}
