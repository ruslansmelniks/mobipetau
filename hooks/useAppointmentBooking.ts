import { useState } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { useAppointments } from './useAppointments';
import { Appointment } from '@/lib/api/appointments';

export function useAppointmentBooking() {
  const user = useUser();
  const { useDraftAppointment, useUpdateAppointment } = useAppointments();
  
  const { data: draftAppointment, isLoading: isLoadingDraft } = useDraftAppointment(user?.id ?? '');
  const updateAppointment = useUpdateAppointment();

  const [error, setError] = useState<string | null>(null);

  const updateDraft = async (updates: Partial<Appointment>) => {
    if (!draftAppointment?.id) {
      setError('No draft appointment found');
      return;
    }

    try {
      await updateAppointment.mutateAsync({
        id: draftAppointment.id,
        updates,
      });
      setError(null);
    } catch (err) {
      setError('Failed to update appointment details');
      console.error(err);
    }
  };

  const updateAddress = async (address: string, latitude: number, longitude: number, isInPerth: boolean) => {
    await updateDraft({
      address,
      latitude,
      longitude,
      is_in_perth: isInPerth,
    });
  };

  const updateDateTime = async (date: Date, timeSlot: string, timeOfDay: string) => {
    await updateDraft({
      date: date.toISOString(),
      time_slot: timeSlot,
      time_of_day: timeOfDay,
    });
  };

  const updateAdditionalInfo = async (additionalInfo: string) => {
    await updateDraft({
      additional_info: additionalInfo,
    });
  };

  const updateServices = async (services: any[], totalPrice: number) => {
    await updateDraft({
      services,
      total_price: totalPrice,
    });
  };

  return {
    draftAppointment,
    isLoadingDraft,
    error,
    updateAddress,
    updateDateTime,
    updateAdditionalInfo,
    updateServices,
    isUpdating: updateAppointment.isPending,
  };
} 