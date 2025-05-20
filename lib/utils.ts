import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function redirectBasedOnRole(role: string | undefined, router: any) {
  console.log("redirectBasedOnRole called with role:", role);
  
  if (role === 'admin') {
    router.push('/admin');
  } else if (role === 'vet') {
    router.push('/vet');
  } else if (role === 'pet_owner') {
    console.log("Redirecting to pet owner portal");
    router.push('/portal/bookings');
  } else {
    console.log("No valid role found, defaulting to home page");
    // If no recognized role, default to pet owner portal
    router.push('/portal/bookings');
  }
}
