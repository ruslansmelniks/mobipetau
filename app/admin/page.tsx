"use client"

import { useEffect, useState } from "react"
import { Users, UserCog, Calendar, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import { toast } from "@/components/ui/use-toast"

export default function AdminDashboard() {
  const supabase = useSupabaseClient()
  const user = useUser();
  const [stats, setStats] = useState({
    totalPetOwners: 0,
    totalVets: 0,
    totalAppointments: 0,
    totalPets: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        // Only allow admins to fetch user stats
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
        // Get counts from each table instead of filtering
        const fetchPetOwners = async () => {
          try {
            const { data, error, count } = await supabase
              .from('users')
              .select('*', { count: 'exact', head: true })
              .eq('role', 'pet_owner');
            
            return error ? 0 : (count || 0);
          } catch (e) {
            console.error("Error counting pet owners:", e);
            return 0;
          }
        };
        
        const fetchVets = async () => {
          try {
            const { data, error, count } = await supabase
              .from('users')
              .select('*', { count: 'exact', head: true })
              .eq('role', 'vet');
            
            return error ? 0 : (count || 0);
          } catch (e) {
            console.error("Error counting vets:", e);
            return 0;
          }
        };

        const fetchAppointments = async () => {
          try {
            const { data, error, count } = await supabase
              .from('appointments')
              .select('*', { count: 'exact', head: true });
            
            return error ? 0 : (count || 0);
          } catch (e) {
            console.error("Error counting appointments:", e);
            return 0;
          }
        };

        const fetchPets = async () => {
          try {
            const { data, error, count } = await supabase
              .from('pets')
              .select('*', { count: 'exact', head: true });
            
            return error ? 0 : (count || 0);
          } catch (e) {
            console.error("Error counting pets:", e);
            return 0;
          }
        };
        
        // Run all queries in parallel
        const [petOwners, vets, appointments, pets] = await Promise.all([
          fetchPetOwners(),
          fetchVets(),
          fetchAppointments(),
          fetchPets()
        ]);
        
        setStats({
          totalPetOwners: petOwners,
          totalVets: vets,
          totalAppointments: appointments,
          totalPets: pets
        });
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
  }, [supabase, user]);

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