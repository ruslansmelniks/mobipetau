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

export const getStatusLabel = (status: AppointmentStatus | string) => {
  switch (status) {
    case "pending":
      return { label: "Draft", color: "bg-gray-100 text-gray-600" };
    case "waiting_for_vet":
      return { label: "Waiting for vet", color: "bg-yellow-100 text-yellow-800" };
    case "confirmed":
      return { label: "Confirmed", color: "bg-green-100 text-green-800" };
    case "time_proposed":
      return { label: "Time proposed", color: "bg-blue-100 text-blue-800" };
    case "in_progress":
      return { label: "In progress", color: "bg-purple-100 text-purple-800" };
    case "completed":
      return { label: "Completed", color: "bg-gray-100 text-gray-800" };
    case "cancelled":
      return { label: "Cancelled", color: "bg-red-100 text-red-800" };
    case "declined":
      return { label: "Declined", color: "bg-red-100 text-red-800" };
    default:
      return { label: status || "Unknown", color: "bg-gray-100 text-gray-800" };
  }
}; 