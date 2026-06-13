// app/(auth)/layout.tsx
// Centered card layout for login + signup pages.
// No nav, no sidebar — distraction-free.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / wordmark */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight">ApplierAI</span>
        </div>
        {children}
      </div>
    </div>
  )
}