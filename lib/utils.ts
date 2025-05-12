import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function redirectBasedOnRole(role: string | undefined, router: any) {
  if (role === 'vet') {
    router.push('/vet');
  } else if (role === 'pet_owner') {
    router.push('/portal/bookings');
  } else {
    router.push('/'); // fallback
  }
}
