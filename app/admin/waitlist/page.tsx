'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface WaitlistEntry {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  location: string;
  license_number: string;
  years_experience: number;
  specialties: string[];
  bio: string;
  status: string;
  created_at: string;
}

export default function AdminWaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchWaitlist();
  }, []);

  const fetchWaitlist = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vet_waitlist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching waitlist:', error);
        setError('Failed to load waitlist entries');
        return;
      }

      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching waitlist:', error);
      setError('Failed to load waitlist entries');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (entryId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('vet_waitlist')
        .update({ status: newStatus })
        .eq('id', entryId);

      if (error) {
        console.error('Error updating status:', error);
        return;
      }

      // Refresh the list
      await fetchWaitlist();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-semibold">Error</h3>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vet Provider Waitlist</h1>
        <p className="text-gray-600 mt-2">
          Manage applications from veterinarians wanting to join the platform
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Applications ({entries.length})
            </h2>
            <button
              onClick={fetchWaitlist}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {entries.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No applications found
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="px-6 py-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {entry.full_name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        entry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        entry.status === 'approved' ? 'bg-green-100 text-green-800' :
                        entry.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {entry.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p><strong>Email:</strong> {entry.email}</p>
                        <p><strong>Phone:</strong> {entry.phone_number}</p>
                        <p><strong>Location:</strong> {entry.location}</p>
                        <p><strong>License:</strong> {entry.license_number}</p>
                      </div>
                      <div>
                        <p><strong>Experience:</strong> {entry.years_experience} years</p>
                        <p><strong>Specialties:</strong> {entry.specialties?.join(', ') || 'None specified'}</p>
                        <p><strong>Applied:</strong> {new Date(entry.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {entry.bio && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600">
                          <strong>Bio:</strong> {entry.bio}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    {entry.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(entry.id, 'approved')}
                          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(entry.id, 'rejected')}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 