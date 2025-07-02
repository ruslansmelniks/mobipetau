'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 border border-red-500 rounded bg-red-50">
          <p className="text-red-800 font-medium">Something went wrong in this component.</p>
          <details className="mt-2">
            <summary className="text-red-600 cursor-pointer text-sm">Error details</summary>
            <pre className="text-xs text-red-700 mt-2 whitespace-pre-wrap">{this.state.error?.toString()}</pre>
          </details>
        </div>
      )
    }

    return this.props.children
  }
} 