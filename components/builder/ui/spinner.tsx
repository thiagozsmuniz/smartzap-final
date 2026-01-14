import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/builder/utils"

export interface SpinnerProps extends React.ComponentProps<"svg"> {
  /** Additional CSS classes */
  className?: string
}

function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
