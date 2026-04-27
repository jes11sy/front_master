import { cn } from "@/lib/utils"

type FieldSize = "sm" | "md" | "lg"

const fieldSizeMap: Record<FieldSize, string> = {
  sm: "h-9 text-sm",
  md: "h-10 text-sm",
  lg: "h-11 text-[15px]",
}

export const formControlResetClass =
  "outline-none ring-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"

export function getFormFieldClass(isDark: boolean, size: FieldSize = "md") {
  return cn(
    "w-full rounded-2xl border px-3 py-2 transition-all shadow-sm",
    formControlResetClass,
    fieldSizeMap[size],
    isDark
      ? "bg-white/[0.04] border-white/15 text-white placeholder:text-white/30"
      : "bg-white border-[#cfd2d8] text-[#111113] placeholder:text-[#8e8e93] shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
  )
}

export function getFormSelectTriggerClass(isDark: boolean, size: FieldSize = "md") {
  return cn(
    getFormFieldClass(isDark, size),
    "justify-between",
    "[&_[data-placeholder]]:text-[#8e8e93] dark:[&_[data-placeholder]]:text-white/35",
    "[&_svg]:text-[#6f7177] dark:[&_svg]:text-white/65",
    "data-[state=open]:border-[rgba(10,79,66,0.55)] data-[state=open]:ring-2 data-[state=open]:ring-[rgba(10,79,66,0.22)]",
    "dark:data-[state=open]:!border-white/30 dark:data-[state=open]:!ring-[rgba(255,255,255,0.2)]"
  )
}

export function getFormSelectContentClass(isDark: boolean) {
  return cn(
    "rounded-2xl border-0 shadow-xl",
    isDark ? "bg-[#1e1e20] text-white" : "bg-white text-[#111113]"
  )
}

export function getFormSelectItemClass(isDark: boolean) {
  return cn(
    "rounded-xl mx-1 my-0.5 cursor-pointer",
    isDark
      ? "text-white focus:bg-white/10 focus:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white"
      : "text-[#111113] focus:bg-black/5 focus:text-[#111113] data-[highlighted]:bg-black/5 data-[highlighted]:text-[#111113]"
  )
}
