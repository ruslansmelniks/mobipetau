"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSupabaseClient, useUser } from "@/hooks/useSupabase"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, Plus, Edit, Trash2, Mail, AlertCircle, Key, Eye, EyeOff } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

interface User {
  id: string
  email: string
  role: string
  first_name: string
  last_name: string
  created_at: string
  phone?: string
}

export default function AdminUsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false)
  const [userToEdit, setUserToEdit] = useState<User | null>(null)
  const [newUser, setNewUser] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    role: "pet_owner",
    password: "",
    sendEmail: true,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const [formError, setFormError] = useState('')
  const [emailError, setEmailError] = useState('')
  const supabase = useSupabaseClient()
  const { user } = useUser();

  const fetchUsers = async () => {
    setLoading(true);
    setUsers([]);
    
    try {
      // Add a cache-busting parameter to prevent cached responses
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/admin/users?t=${timestamp}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `API error: ${response.status} - ${errorData.error || response.statusText}`
        );
      }
      
      const data = await response.json();
      console.log('Fetched users count:', data?.length || 0);
      setUsers(data || []);
      
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Users state updated:", users.length, users);
  }, [users]);

  useEffect(() => {
    fetchUsers();
  }, [supabase, user]);

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
  };

  const resetForm = () => {
    setNewUser({
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
      role: "pet_owner",
      password: "",
      sendEmail: true,
    });
    setSendEmail(true);
    setFormError('');
    setEmailError('');
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.first_name || !newUser.last_name) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    setFormError('');
    setEmailError('');
    setLoading(true);
    try {
      const userPassword = newUser.password || generateRandomPassword();
      const response = await fetch('/api/admin/user-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          userData: {
            email: newUser.email,
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            phone: newUser.phone,
            role: newUser.role,
            password: userPassword,
            send_email: sendEmail,
          }
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409 || result.code === 'user_exists') {
          setFormError('email');
          setEmailError('A user with this email already exists');
          setLoading(false);
          return;
        }
        throw new Error(result.error || 'Failed to create user');
      }
      if (!sendEmail) {
        toast({
          title: "User Created Successfully",
          description: (
            <div>
              <p>Password for {newUser.email}:</p>
              <p className="font-mono bg-gray-100 p-2 mt-1 rounded border">{userPassword}</p>
              <p className="text-xs mt-1">Make sure to copy this password now!</p>
            </div>
          ),
          duration: 10000,
        });
      } else {
        toast({
          title: "Success",
          description: "User has been created and password reset email has been sent.",
        });
      }
      setIsAddUserDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!userToEdit) return;
    console.log("Updating user:", userToEdit);
    setLoading(true);
    try {
      const response = await fetch('/api/admin/user-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          userData: {
            id: userToEdit.id,
            first_name: userToEdit.first_name,
            last_name: userToEdit.last_name,
            phone: userToEdit.phone,
            role: userToEdit.role,
          }
        }),
      });
      const result = await response.json();
      console.log("Update response:", result);
      if (!response.ok) {
        throw new Error(result.error || `Failed to update user: ${response.status}`);
      }
      // Immediately update the local state with the updated user
      if (result.success && result.user) {
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userToEdit.id ? { ...user, ...result.user } : user
          )
        );
      }
      toast({
        title: "Success",
        description: "User has been updated successfully.",
      });
      setIsEditUserDialogOpen(false);
      // Then refresh the full list
      await fetchUsers();
      console.log("Users refetched after update");
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/user-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          userData: { id: userId }
        }),
      });
      const result = await response.json();
      // Even if we get a non-200 response, check if we partially succeeded
      if (response.ok || (result.details && (result.details.authUserDeleted || result.details.dbUserDeleted))) {
        // Consider it a success if we deleted from at least one system
        toast({
          title: "Success",
          description: result.message || "User has been deleted successfully.",
        });
        fetchUsers(); // Refresh the user list
        return;
      }
      // Handle specific error codes
      if (response.status === 404 || result.code === 'user_not_found') {
        toast({
          title: "User Not Found",
          description: "This user may have already been deleted. The user list will be refreshed.",
          variant: "default",
        });
        fetchUsers(); // Refresh to be sure
        return;
      }
      // For other errors
      throw new Error(result.error || 'Failed to delete user');
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    try {
      const newPassword = Math.random().toString(36).slice(-8) + "A1!";
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          password: newPassword,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }
      toast({
        title: "Password Reset",
        description: `New password for ${email}: ${newPassword}`,
        duration: 10000,
      });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(
    (user) => {
      const matchesSearch = 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      
      return matchesSearch && matchesRole;
    }
  )

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800"
      case "vet":
        return "bg-blue-100 text-blue-800"
      case "pet_owner":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Dialog
          open={isAddUserDialogOpen}
          onOpenChange={(open) => {
            setIsAddUserDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account. They will receive an email to set their password.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await handleAddUser();
              }}
              className="space-y-4 py-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="user@example.com"
                  value={newUser.email}
                  onChange={(e) => {
                    setNewUser({ ...newUser, email: e.target.value });
                    if (formError === 'email') {
                      setFormError('');
                      setEmailError('');
                    }
                  }}
                  className={formError === 'email' ? "border-red-300 focus:border-red-500" : ""}
                />
                {formError === 'email' && (
                  <p className="text-sm text-red-500 mt-1">{emailError}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="First name"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Last name"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="Phone number"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const randomPassword = generateRandomPassword();
                      setNewUser({ ...newUser, password: randomPassword });
                    }}
                  >
                    Generate Random
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Leave empty to auto-generate"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
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
                  {newUser.password ? "Password will be set to the value above." : "If left empty, a secure random password will be generated."}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pet_owner">Pet Owner</SelectItem>
                    <SelectItem value="vet">Veterinarian</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sendEmail"
                    checked={sendEmail}
                    onCheckedChange={(checked) => setSendEmail(!!checked)}
                  />
                  <Label htmlFor="sendEmail">
                    Send password reset email to user
                  </Label>
                </div>
                <p className="text-xs text-gray-500">
                  If checked, the user will receive an email to set their password. 
                  If unchecked, you'll need to provide them access manually.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsAddUserDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Adding..." : "Add User"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <Select
              value={roleFilter}
              onValueChange={setRoleFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="pet_owner">Pet Owners</SelectItem>
                <SelectItem value="vet">Veterinarians</SelectItem>
                <SelectItem value="admin">Administrators</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <AlertCircle className="h-8 w-8 mb-2" />
                        <p>No users found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                          {user.role === "pet_owner" ? "Pet Owner" : user.role === "vet" ? "Veterinarian" : "Administrator"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUserToEdit(user)
                              setIsEditUserDialogOpen(true)
                            }}
                            title="Edit user"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetPassword(user.id, user.email)}
                            title="Reset password"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Delete user"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the user {user.first_name} {user.last_name} ({user.email}).
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 text-white hover:bg-red-700"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details and permissions.
            </DialogDescription>
          </DialogHeader>
          {userToEdit && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  value={userToEdit.email}
                  readOnly
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input
                    id="edit-firstName"
                    value={userToEdit.first_name || ""}
                    onChange={(e) => setUserToEdit({ ...userToEdit, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input
                    id="edit-lastName"
                    value={userToEdit.last_name || ""}
                    onChange={(e) => setUserToEdit({ ...userToEdit, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  value={userToEdit.phone || ""}
                  onChange={(e) => setUserToEdit({ ...userToEdit, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={userToEdit.role}
                  onValueChange={(value) => setUserToEdit({ ...userToEdit, role: value })}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pet_owner">Pet Owner</SelectItem>
                    <SelectItem value="vet">Veterinarian</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 