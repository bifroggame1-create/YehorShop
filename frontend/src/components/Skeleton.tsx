'use client'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-light-border dark:bg-dark-border rounded ${className}`}
    />
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-light-card dark:bg-dark-card rounded-2xl overflow-hidden border border-light-border dark:border-dark-border">
      <Skeleton className="aspect-square w-full" />
      <div className="p-4">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-3" />
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-3 w-24 mb-3" />
        <div className="flex gap-2">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="flex-1 h-10 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-5 w-20 mb-1" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  )
}

export function ChatItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border">
      <Skeleton className="w-12 h-12 rounded-full" />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-lg mb-6" />
      <div className="grid grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-8 w-full mb-1" />
            <Skeleton className="h-3 w-12 mx-auto" />
          </div>
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-2xl mb-4" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-square w-full mb-4" />
      <div className="px-4">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-6 w-3/4 mb-4" />
        <Skeleton className="h-24 w-full rounded-2xl mb-4" />
        <Skeleton className="h-32 w-full rounded-2xl mb-4" />
        <Skeleton className="h-20 w-full rounded-2xl mb-4" />
      </div>
    </div>
  )
}
