import * as React from "react"
import { cn } from "@/lib/utils"

export interface CustomInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const CustomInput = React.forwardRef<HTMLInputElement, CustomInputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        style={{
          outline: 'none',
          boxShadow: 'none',
          border: '2px solid #d1d5db',
          transition: 'all 0.3s ease'
        }}
        onFocus={(e) => {
          e.target.style.outline = 'none'
          e.target.style.boxShadow = 'none'
          e.target.style.borderColor = '#14b8a6'
          e.target.style.boxShadow = '0 0 0 2px rgba(20, 184, 166, 0.2)'
        }}
        onBlur={(e) => {
          e.target.style.outline = 'none'
          e.target.style.boxShadow = 'none'
          e.target.style.borderColor = '#d1d5db'
        }}
        {...props}
      />
    )
  }
)
CustomInput.displayName = "CustomInput"

export { CustomInput }
