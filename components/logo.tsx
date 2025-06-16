import Image from "next/image"

interface LogoProps {
  width?: number
  height?: number
  className?: string
}

export function Logo({ width = 96, height = 32, className = "" }: LogoProps) {
  return (
    <Image 
      src="/logo.png" 
      alt="MobiPet Logo" 
      width={width} 
      height={height} 
      className={className}
      style={{ 
        width: 'auto',
        height: 'auto',
        maxWidth: `${width}px`,
        maxHeight: `${height}px`
      }}
      priority
      onError={(e) => {
        console.error('Logo failed to load');
        const target = e.target as HTMLImageElement;
        target.src = '/placeholder-logo.png';
      }}
    />
  )
} 