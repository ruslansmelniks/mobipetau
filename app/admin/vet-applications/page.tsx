"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Check, 
  X, 
  Eye, 
  UserPlus,
  Clock,
  AlertCircle,
  EyeOff
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface VetApplication {
  id: string
  full_name: string
  email: string
  phone?: string
  license_number?: string
  years_experience?: number
  specialties?: string[]
  location?: string
  bio?: string  
  status: 'pending' | 'approved' | 'declined'
  created_at: string
  reviewed_at?: string
  notes?: string
}

export default function VetApplicationsPage() {
  const { toast } = useToast()
  const [applications, setApplications] = useState<VetApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  // Dialog states
  const [selectedApplication, setSelectedApplication] = useState<VetApplication | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  
  // Form states
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const [notes, setNotes] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const fetchApplications = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/vet-waitlist')
      if (!response.ok) throw new Error('Failed to fetch applications')
      
      const data = await response.json()
      setApplications(data.applications || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load applications",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    password += chars.charAt(Math.floor(Math.random() * 26)); // Uppercase
    password += chars.charAt(26 + Math.floor(Math.random() * 26)); // Lowercase
    password += chars.charAt(52 + Math.floor(Math.random() * 10)); // Number
    password += chars.charAt(62 + Math.floor(Math.random() * 8)); // Special
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }

  const handleApprove = async () => {
    if (!selectedApplication) return
    
    setActionLoading(true)
    try {
      const finalPassword = password || generateRandomPassword()
      
      const response = await fetch('/api/admin/vet-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          applicationId: selectedApplication.id,
          password: finalPassword,
          sendEmail,
          notes
        })
      })

      const result = await response.json()
      
      if (!response.ok) throw new Error(result.error)

      toast({
        title: "Success",
        description: sendEmail 
          ? "Application approved and welcome email sent"
          : `Application approved. Password: ${result.password}`,
        duration: sendEmail ? 3000 : 10000
      })

      await fetchApplications()
      setShowApprovalDialog(false)
      resetDialogState()
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve application",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDecline = async () => {
    if (!selectedApplication) return
    
    setActionLoading(true)
    try {
      const response = await fetch('/api/admin/vet-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decline',
          applicationId: selectedApplication.id,
          notes
        })
      })

      const result = await response.json()
      
      if (!response.ok) throw new Error(result.error)

      toast({
        title: "Success",
        description: "Application declined successfully"
      })

      await fetchApplications()
      setShowDeclineDialog(false)
      resetDialogState()
      
    } catch (error: any) {
      toast({
        title: "Error", 
        description: error.message || "Failed to decline application",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const resetDialogState = () => {
    setSelectedApplication(null)
    setPassword("")
    setShowPassword(false)
    setSendEmail(true)
    setNotes("")
  }

  const openApprovalDialog = (application: VetApplication) => {
    setSelectedApplication(application)
    setNotes("")
    setPassword("")
    setShowApprovalDialog(true)
  }

  const openDeclineDialog = (application: VetApplication) => {
    setSelectedApplication(application)
    setNotes("")
    setShowDeclineDialog(true)
  }

  const openDetailsDialog = (application: VetApplication) => {
    setSelectedApplication(application)
    setShowDetailsDialog(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="mr-1 h-3 w-3" />Pending</Badge>
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><Check className="mr-1 h-3 w-3" />Approved</Badge>
      case 'declined':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><X className="mr-1 h-3 w-3" />Declined</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.location && app.location.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === "all" || app.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vet Applications</h1>
          <p className="text-gray-600">Manage veterinarian waitlist applications</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search applications..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <AlertCircle className="h-8 w-8 mb-2" />
                      <p>No applications found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredApplications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell className="font-medium">
                      {application.full_name}
                    </TableCell>
                    <TableCell>{application.email}</TableCell>
                    <TableCell>{application.location || "-"}</TableCell>
                    <TableCell>
                      {application.years_experience ? `${application.years_experience} years` : "-"}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(application.status)}
                    </TableCell>
                    <TableCell>
                      {new Date(application.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailsDialog(application)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {application.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openApprovalDialog(application)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Approve application"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeclineDialog(application)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Decline application"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Review the complete application information
            </DialogDescription>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Full Name</Label>
                  <p className="text-sm">{selectedApplication.full_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Email</Label>
                  <p className="text-sm">{selectedApplication.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Phone</Label>
                  <p className="text-sm">{selectedApplication.phone || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Location</Label>
                  <p className="text-sm">{selectedApplication.location || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">License Number</Label>
                  <p className="text-sm">{selectedApplication.license_number || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Years of Experience</Label>
                  <p className="text-sm">{selectedApplication.years_experience || "-"}</p>
                </div>
              </div>
              
              {selectedApplication.specialties && selectedApplication.specialties.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Specialties</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedApplication.specialties.map((specialty, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedApplication.bio && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Professional Bio</Label>
                  <p className="text-sm bg-gray-50 p-3 rounded-md mt-1">
                    {selectedApplication.bio}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedApplication.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Applied</Label>
                  <p className="text-sm">{new Date(selectedApplication.created_at).toLocaleString()}</p>
                </div>
              </div>
              
              {selectedApplication.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Admin Notes</Label>
                  <p className="text-sm bg-gray-50 p-3 rounded-md mt-1">
                    {selectedApplication.notes}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
            
            {selectedApplication?.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailsDialog(false)
                    openDeclineDialog(selectedApplication)
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="mr-2 h-4 w-4" />
                  Decline
                </Button>
                <Button
                  onClick={() => {
                    setShowDetailsDialog(false)
                    openApprovalDialog(selectedApplication)
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
            <DialogDescription>
              Create a veterinarian account for {selectedApplication?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPassword(generateRandomPassword())}
                >
                  Generate Random
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Leave empty to auto-generate"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                {password ? "Password will be set to the value above." : "If left empty, a secure random password will be generated."}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendEmail"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(!!checked)}
                />
                <Label htmlFor="sendEmail">
                  Send welcome email with login instructions
                </Label>
              </div>
              <p className="text-xs text-gray-500">
                If checked, the vet will receive an email to set their password. 
                If unchecked, you'll need to provide them access manually.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="approveNotes">Notes (Optional)</Label>
              <Textarea
                id="approveNotes"
                placeholder="Add any notes about this approval..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={actionLoading}>
              {actionLoading ? "Approving..." : "Approve & Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline the application from {selectedApplication?.full_name}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="declineNotes">Reason for Decline (Optional)</Label>
              <Textarea
                id="declineNotes"
                placeholder="Add any notes about why this application is being declined..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeclineDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDecline} 
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? "Declining..." : "Decline Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 