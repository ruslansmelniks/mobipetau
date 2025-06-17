"use client";

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: string;
  created_at?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push('/login');
        return;
      }

      // Fetch user profile from users table
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setError('Failed to load profile');
        return;
      }

      setProfile(profileData);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={loadProfile}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>
      
      {profile && (
        <div className="bg-white shadow rounded-lg p-6 max-w-2xl">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="mt-1">{profile.email}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">First Name</label>
                <p className="mt-1">{profile.first_name || 'Not set'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Last Name</label>
                <p className="mt-1">{profile.last_name || 'Not set'}</p>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              <p className="mt-1">{profile.phone || 'Not set'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Account Type</label>
              <p className="mt-1 capitalize">{profile.role || 'pet_owner'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Member Since</label>
              <p className="mt-1">
                {profile.created_at 
                  ? new Date(profile.created_at).toLocaleDateString()
                  : 'Unknown'}
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex gap-4">
            <button 
              onClick={() => router.push('/dashboard/profile/edit')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Edit Profile
            </button>
            
            <button 
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 