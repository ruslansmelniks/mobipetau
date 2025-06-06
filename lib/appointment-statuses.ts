// Centralized appointment status definitions and label helper

export type AppointmentStatus = 
  | 'pending'           // Draft during booking
  | 'waiting_for_vet'   // Payment completed, waiting for vet
  | 'confirmed'         // Vet accepted the appointment
  | 'time_proposed'     // Vet proposed a new time
  | 'in_progress'       // Appointment is happening
  | 'completed'         // Service is done
  | 'cancelled'         // Appointment was cancelled
  | 'declined';         // Vet declined the appointment

interface StatusInfo {
  label: string
  color: string
}

export function getStatusLabel(status: string): StatusInfo {
  switch (status) {
    case 'confirmed':
      return {
        label: 'Confirmed',
        color: 'bg-green-100 text-green-800'
      }
    case 'pending':
      return {
        label: 'Pending',
        color: 'bg-yellow-100 text-yellow-800'
      }
    case 'completed':
      return {
        label: 'Completed',
        color: 'bg-blue-100 text-blue-800'
      }
    case 'cancelled':
      return {
        label: 'Cancelled',
        color: 'bg-red-100 text-red-800'
      }
    case 'proposed':
      return {
        label: 'Time Proposed',
        color: 'bg-orange-100 text-orange-800'
      }
    default:
      return {
        label: status.charAt(0).toUpperCase() + status.slice(1),
        color: 'bg-gray-100 text-gray-800'
      }
  }
} 