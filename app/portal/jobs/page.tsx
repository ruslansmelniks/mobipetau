import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'

export default async function JobsPage() {
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

    // Get user's posted jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        *,
        pets (
          id,
          name,
          type,
          breed
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
    }

    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Jobs</h1>
          <a
            href="/portal/jobs/new"
            className="bg-[#4e968f] hover:bg-[#43847e] text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Post New Job
          </a>
        </div>

        {jobs && jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white rounded-lg border shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{job.title}</h3>
                    <p className="text-gray-600">
                      {job.pets?.name} • {job.pets?.type} {job.pets?.breed && `• ${job.pets.breed}`}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    job.status === 'open' ? 'bg-green-100 text-green-800' :
                    job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </span>
                </div>

                <p className="text-gray-700 mb-4">{job.description}</p>

                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                  <a
                    href={`/portal/jobs/${job.id}`}
                    className="text-teal-600 hover:text-teal-700 font-medium"
                  >
                    View Details
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">No jobs posted yet</h2>
            <p className="text-gray-600 mb-6">
              You haven't posted any jobs yet. Post a job to find a vet for your pet.
            </p>
            <a
              href="/portal/jobs/new"
              className="bg-[#4e968f] hover:bg-[#43847e] text-white px-4 py-2 rounded-md text-sm font-medium inline-block"
            >
              Post Your First Job
            </a>
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error('Unexpected error in JobsPage:', error)
    redirect('/login')
  }
} 