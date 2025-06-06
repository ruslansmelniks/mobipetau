import { useEffect, useRef } from 'react'

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio('/notification.mp3')
    audioRef.current.volume = 0.5
  }, [])

  const playNotification = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => {
        console.log('Could not play notification sound:', e)
      })
    }
  }

  return { playNotification }
} 