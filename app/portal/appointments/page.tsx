import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'

export default async function AppointmentsPage() {
  try {
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      redirect('/login')
    }

    // Get user's appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        *,
        pets (
          id,
          name,
          type,
          breed
        ),
        vets (
          id,
          first_name,
          last_name
        )
      `)
      .eq('pet_owner_id', user.id)
      .order('date', { ascending: true })

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
    }

    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Appointments</h1>
          <a
            href="/book"
            className="bg-[#4e968f] hover:bg-[#43847e] text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Book New Appointment
          </a>
        </div>

        {appointments && appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="bg-white rounded-lg border shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {appointment.pets?.name || 'Unknown Pet'}
                    </h3>
                    <p className="text-gray-600">
                      {appointment.pets?.type} {appointment.pets?.breed && `• ${appointment.pets.breed}`}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="h-5 w-5 text-teal-500 mt-0.5 mr-3">📅</div>
                    <div>
                      <p className="font-medium">Date & Time</p>
                      <p className="text-gray-600">
                        {new Date(appointment.date).toLocaleDateString()} • {appointment.time_slot}
                      </p>
                    </div>
                  </div>

                  {appointment.vets && (
                    <div className="flex items-start">
                      <div className="h-5 w-5 text-teal-500 mt-0.5 mr-3">👨‍⚕️</div>
                      <div>
                        <p className="font-medium">Veterinarian</p>
                        <p className="text-gray-600">
                          Dr. {appointment.vets.first_name} {appointment.vets.last_name}
                        </p>
                      </div>
                    </div>
                  )}

                  {appointment.services && appointment.services.length > 0 && (
                    <div>
                      <p className="font-medium mb-1">Services</p>
                      <ul className="text-gray-600 text-sm space-y-1">
                        {appointment.services.map((service: any, index: number) => (
                          <li key={index}>• {service.name || service}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {appointment.notes && (
                    <div>
                      <p className="font-medium">Notes</p>
                      <p className="text-gray-600">{appointment.notes}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t flex justify-between items-center">
                  <p className="text-sm text-gray-500">ID: {appointment.id.slice(0, 8)}</p>
                  <a
                    href={`/portal/messages?appointment=${appointment.id}`}
                    className="text-teal-600 hover:text-teal-700 font-medium text-sm"
                  >
                    View Messages
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">No appointments yet</h2>
            <p className="text-gray-600 mb-6">
              You don't have any appointments scheduled. Book an appointment to get started.
            </p>
            <a
              href="/book"
              className="bg-[#4e968f] hover:bg-[#43847e] text-white px-4 py-2 rounded-md text-sm font-medium inline-block"
            >
              Book Your First Appointment
            </a>
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error('Unexpected error in AppointmentsPage:', error)
    redirect('/login')
  }
} 