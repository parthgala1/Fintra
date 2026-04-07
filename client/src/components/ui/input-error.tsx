import * as React from "react"
import { cn } from "@/lib/utils"

const InputError = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-red-500", className)}
    {...props}
  />
))
InputError.displayName = "InputError"

export { InputError }
