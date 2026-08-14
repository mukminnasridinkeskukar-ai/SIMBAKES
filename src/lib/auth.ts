import { createClient } from '@/lib/supabase/server'

export type UserRole = 'pendaftar' | 'admin'

export interface UserProfile {
  id: string
  email: string
  nama_lengkap: string | null
  nik: string | null
  role: UserRole
  created_at: string
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  // Get user profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    ...user,
    profile: profile as UserProfile | null
  }
}

export async function getUserRole(): Promise<UserRole | null> {
  const user = await getCurrentUser()
  return user?.profile?.role || null
}

export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'admin'
}

export async function isPendaftar(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'pendaftar'
}
