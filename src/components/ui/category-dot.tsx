import { dotStyle } from "@/lib/category-styles";

export function CategoryDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="size-[7px] flex-none rounded-full"
      style={dotStyle(color)}
    />
  );
}
