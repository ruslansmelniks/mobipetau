"use client"

import { useEffect, useState } from "react"
import { Users, UserCog } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSupabaseClient } from "@supabase/auth-helpers-react"

export default function AdminDashboard() {
  const supabase = useSupabaseClient()
  const [stats, setStats] = useState({
    totalPetOwners: 0,
    totalVets: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      
      try {
        // Get pet owners count
        const { count: petOwnersCount, error: petOwnersError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'pet_owner')
        
        if (petOwnersError) throw petOwnersError;
        
        // Get vets count
        const { count: vetsCount, error: vetsError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'vet')
        
        if (vetsError) throw vetsError;
        
        setStats({
          totalPetOwners: petOwnersCount || 0,
          totalVets: vetsCount || 0,
        })
      } catch (error) {
        console.error("Error fetching dashboard stats:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
  }, [supabase])

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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Pet Owners</CardTitle>
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
            <CardTitle className="text-sm font-medium text-gray-500">Total Veterinarians</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <UserCog className="h-8 w-8 text-teal-500 mr-3" />
              <div className="text-2xl font-bold">{stats.totalVets}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 