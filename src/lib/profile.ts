import { supabase } from './supabase'

export type AppRole = 'Admin' | 'Instructor' | 'Learner'

export interface AppProfile {
  role: AppRole
  is_approved: boolean
  approval_state: 'pending' | 'approved' | 'rejected'
  name: string
}

function normalizeRole(value: unknown): AppRole {
  if (value === 'Admin' || value === 'Instructor' || value === 'Learner') return value
  return 'Learner'
}

export async function ensureProfile(user: any, _roleHint?: AppRole): Promise<AppProfile | null> {
  if (!user?.id) return null

  // ──── ATTEMPT 1: Direct DB read ────
  try {
    const { data, error, status } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    console.log('[profile] DB read result:', { data, error, status })

    if (!error && data) {
      const profile: AppProfile = {
        role: normalizeRole(data.role),
        name: data.name || user?.user_metadata?.name || user.email?.split('@')[0] || 'User',
        is_approved: data.is_approved ?? true,
        approval_state: data.approval_state ?? (data.is_approved === false ? 'pending' : 'approved'),
      }
      console.log('[profile] RESOLVED from DB:', profile)
      return profile
    }

    if (error) {
      console.warn('[profile] DB read error:', error.message, 'code:', error.code, 'status:', status)
    } else {
      console.warn('[profile] No row found for user id:', user.id)
    }
  } catch (e) {
    console.warn('[profile] unexpected error:', e)
  }

  // ──── ATTEMPT 2: Try the RPC ────
  try {
    const { error: rpcError } = await supabase.rpc('ensure_user_profile')
    if (!rpcError) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (data) {
        const profile: AppProfile = {
          role: normalizeRole(data.role),
          name: data.name || user?.user_metadata?.name || user.email?.split('@')[0] || 'User',
          is_approved: data.is_approved ?? true,
          approval_state: data.approval_state ?? (data.is_approved === false ? 'pending' : 'approved'),
        }
        console.log('[profile] RESOLVED after RPC:', profile)
        return profile
      }
    } else {
      console.warn('[profile] RPC failed:', rpcError.message)
    }
  } catch {
    console.warn('[profile] RPC not available')
  }

  // ──── FALLBACK: Auth metadata ────
  const meta = user.user_metadata || {}
  const role = normalizeRole(meta.role || _roleHint)

  const fallback: AppProfile = {
    role,
    name: meta.name || user.email?.split('@')[0] || 'User',
    is_approved: role === 'Learner' || role === 'Admin',
    approval_state: role === 'Instructor' ? 'pending' : 'approved',
  }
  console.log('[profile] FALLBACK used! auth metadata role:', meta.role, '→ resolved:', fallback)
  return fallback
}
