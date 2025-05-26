import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { AppointmentService, Appointment, AppointmentWithRelations } from '@/lib/api/appointments';

export function useAppointments() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  const appointmentService = new AppointmentService(supabase);

  const useAppointment = (id: string) => {
    return useQuery({
      queryKey: ['appointment', id],
      queryFn: () => appointmentService.getAppointment(id),
    });
  };

  const useUserAppointments = (userId: string | null) => {
    return useQuery({
      queryKey: ['appointments', userId],
      queryFn: () => {
        if (!userId) return Promise.resolve([]);
        return appointmentService.getAppointmentsByUser(userId);
      },
      enabled: !!userId,
    });
  };

  const useDraftAppointment = (userId: string) => {
    return useQuery({
      queryKey: ['draft-appointment', userId],
      queryFn: () => appointmentService.getOrCreateDraft(userId),
    });
  };

  const useUpdateAppointment = () => {
    return useMutation({
      mutationFn: ({ id, updates }: { id: string; updates: Partial<Appointment> }) =>
        appointmentService.updateAppointment(id, updates),
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['appointment', data.id] });
        queryClient.invalidateQueries({ queryKey: ['appointments', data.pet_owner_id] });
      },
    });
  };

  const useUpdateAppointmentStatus = () => {
    return useMutation({
      mutationFn: ({
        id,
        status,
        options,
      }: {
        id: string;
        status: string;
        options?: {
          proposedDate?: string;
          proposedTime?: string;
          message?: string;
        };
      }) => appointmentService.updateAppointmentStatus(id, status, options),
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['appointment', data.id] });
        queryClient.invalidateQueries({ queryKey: ['appointments', data.pet_owner_id] });
      },
    });
  };

  const useDeleteAppointment = () => {
    return useMutation({
      mutationFn: (id: string) => appointmentService.deleteAppointment(id),
      onSuccess: (_, id) => {
        queryClient.invalidateQueries({ queryKey: ['appointment', id] });
        // Note: We can't invalidate the appointments list without knowing the user ID
        // This should be handled by the component using this hook
      },
    });
  };

  return {
    useAppointment,
    useUserAppointments,
    useDraftAppointment,
    useUpdateAppointment,
    useUpdateAppointmentStatus,
    useDeleteAppointment,
  };
} 