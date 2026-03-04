export const ROLES = ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'] as const
export type Role = (typeof ROLES)[number]

export type User = {
  id: string
  email: string
  name: string
  avatar_url: string | null
  role: Role
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}
