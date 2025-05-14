export default function TestPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      <p>If you're seeing this, the App Router is working!</p>
      <p className="mt-4">
        <a href="/signup" className="text-blue-600 underline">Try signup page now</a>
      </p>
    </div>
  )
} 