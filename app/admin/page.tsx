"use client"

import { useEffect, useState } from "react"
import { Users, UserCog, Calendar, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSupabaseClient, useUser } from "@/hooks/useSupabase"
import { toast } from "@/components/ui/use-toast"

export default function AdminDashboard() {
  const supabase = useSupabaseClient()
  const { user } = useUser();
  const [stats, setStats] = useState({
    totalPetOwners: 0,
    totalVets: 0,
    totalAppointments: 0,
    totalPets: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Only allow admins to fetch stats
        const isAdmin = user?.user_metadata?.role === 'admin' || user?.app_metadata?.role === 'admin';
        if (!isAdmin) {
          toast({
            title: "Access Denied",
            description: "Only admins can view user stats.",
            variant: "destructive",
          });
          setStats({
            totalPetOwners: 0,
            totalVets: 0,
            totalAppointments: 0,
            totalPets: 0,
          });
          setLoading(false);
          return;
        }
        // Create an API endpoint for stats instead of direct queries
        const response = await fetch('/api/admin/stats');
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
        toast({
          title: "Error",
          description: "Failed to load stats. Please try again.",
          variant: "destructive",
        });
        setStats({
          totalPetOwners: 0,
          totalVets: 0,
          totalAppointments: 0,
          totalPets: 0,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pet Owners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-8 w-8 text-teal-500 mr-3" />
              <div className="text-2xl font-bold">{stats.totalPetOwners}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Veterinarians</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <UserCog className="h-8 w-8 text-teal-500 mr-3" />
              <div className="text-2xl font-bold">{stats.totalVets}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-teal-500 mr-3" />
              <div className="text-2xl font-bold">{stats.totalAppointments}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-teal-500 mr-3" />
              <div className="text-2xl font-bold">{stats.totalPets}</div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Additional dashboard components can be added here */}
    </div>
  )
} 