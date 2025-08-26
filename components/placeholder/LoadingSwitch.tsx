// components/placeholder/LoadingSwitch.tsx
'use client'
import React from 'react'

export function LoadingSwitch({
  isLoading, placeholder, children,
}: React.PropsWithChildren<{ isLoading: boolean; placeholder: React.ReactNode }>) {
  if (isLoading) return <>{placeholder}</>
  return <>{children}</>
}
