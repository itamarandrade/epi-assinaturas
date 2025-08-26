// components/ui/SimpleSkeleton.tsx
'use client'
import clsx from 'clsx'

type Props = React.HTMLAttributes<HTMLDivElement> & {
  rounded?: string
}

export function SimpleSkeleton({
  className,
  rounded = 'rounded-md',
  ...rest
}: Props) {
  return (
    <div
      aria-hidden
      {...rest} // <— inclui style, aria-*, onClick etc.
      className={clsx(
        'animate-pulse bg-gray-200/80 dark:bg-gray-700/60',
        rounded,
        className
      )}
    />
  )
}
