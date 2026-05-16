export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm:   'h-4 w-4 border-2',
    md:   'h-6 w-6 border-2',
    lg:   'h-10 w-10 border-3',
    xl:   'h-16 w-16 border-4',
  }

  return (
    <div
      className={`inline-block rounded-full border-indigo-600 border-t-transparent animate-spin ${sizes[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="xl" />
        <p className="mt-4 text-sm text-gray-500">Loading…</p>
      </div>
    </div>
  )
}
