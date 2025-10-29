// ============================================
// MERCADITO ONLINE PY - SUPABASE CLIENT
// Configuración mejorada del cliente Supabase
// ============================================

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZGF0emhsaWFvcmRsc3F0amVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MTk1NzQsImV4cCI6MjA3NzA5NTU3NH0.u1VFWCN4yHZ_v_bR4MNw5wt7jTPdfpIwjhDRYfQ5qRw';

// Singleton para el cliente principal (evitar múltiples instancias)
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;
let supabaseAdminInstance: ReturnType<typeof createClient<Database>> | null = null;

// Cliente principal de Supabase (singleton)
function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'mercadito-supabase-auth', // Clave única para evitar conflictos
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return supabaseInstance;
}

// Cliente para operaciones del servidor (singleton)
function getSupabaseAdminClient() {
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient<Database>(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return supabaseAdminInstance;
}

export const supabase = getSupabaseClient();
export const supabaseAdmin = getSupabaseAdminClient();

// ============================================
// FUNCIONES DE AUTENTICACIÓN
// ============================================

export interface AuthUser {
  id: string;
  email: string;
  role: 'buyer' | 'seller' | 'admin';
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  cover_url?: string;
  bio?: string;
  location?: string;
  verified: boolean;
  membership_level: 'free' | 'bronze' | 'silver' | 'gold';
  membership_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: 'buyer' | 'seller';
}

export interface SignInData {
  email: string;
  password: string;
}

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
  cover_url?: string;
}

// Función para obtener el usuario actual con perfil
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Si hay error y no es 404, loguear pero no fallar silenciosamente
    if (profileError) {
      // Error 500 sugiere problema de RLS, reintentar una vez
      if (profileError.code === 'PGRST500' || profileError.message?.includes('500')) {
        console.warn('Profile query returned 500, retrying...');
        // Reintentar una vez después de un breve delay
        await new Promise(resolve => setTimeout(resolve, 100));
        const { data: retryProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (retryProfile) {
          // Usar el resultado del reintento
          const profile = retryProfile;
          return {
            id: (profile as any).id,
            email: (profile as any).email || user.email,
            role: (profile as any).role || 'buyer',
            first_name: (profile as any).first_name,
            last_name: (profile as any).last_name,
            phone: (profile as any).phone,
            avatar_url: (profile as any).avatar_url,
            cover_url: (profile as any).cover_url,
            bio: (profile as any).bio,
            location: (profile as any).location,
            verified: (profile as any).verified,
            membership_level: (profile as any).membership_level,
            membership_expires_at: (profile as any).membership_expires_at,
            created_at: (profile as any).created_at,
            updated_at: (profile as any).updated_at,
          };
        }
      }
      // Si sigue fallando o es otro error, retornar null
      console.warn('Could not load profile:', profileError.message);
      return null;
    }

    if (!profile) {
      return null;
    }

    return {
      id: (profile as any).id,
      email: (profile as any).email,
      role: (profile as any).role,
      first_name: (profile as any).first_name,
      last_name: (profile as any).last_name,
      phone: (profile as any).phone,
      avatar_url: (profile as any).avatar_url,
      cover_url: (profile as any).cover_url,
      bio: (profile as any).bio,
      location: (profile as any).location,
      verified: (profile as any).verified,
      membership_level: (profile as any).membership_level,
      membership_expires_at: (profile as any).membership_expires_at,
      created_at: (profile as any).created_at,
      updated_at: (profile as any).updated_at,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Función para registrar un nuevo usuario
export async function signUp(data: SignUpData) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      throw authError;
    }

    if (authData.user) {
      // Crear perfil del usuario
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: data.email,
          role: data.role || 'buyer',
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }

    return { data: authData, error: authError };
  } catch (error) {
    console.error('Error signing up:', error);
    return { data: null, error };
  }
}

// Función para iniciar sesión
export async function signIn(credentials: SignInData) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    return { data, error };
  } catch (error) {
    console.error('Error signing in:', error);
    return { data: null, error };
  }
}

// Función para cerrar sesión
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error };
  }
}

// Función para actualizar el perfil del usuario
export async function updateProfile(profileData: UpdateProfileData) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await (supabase as any)
      .from('profiles')
      .update(profileData)
      .eq('id', user.id)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { data: null, error };
  }
}

// Función para cambiar la contraseña
export async function changePassword(newPassword: string) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return { data, error };
  } catch (error) {
    console.error('Error changing password:', error);
    return { data: null, error };
  }
}

// Función para restablecer la contraseña
export async function resetPassword(email: string) {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    return { data, error };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { data: null, error };
  }
}

// Función para verificar si el usuario es admin
export async function isAdmin(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    return user?.role === 'admin' || false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// Función para verificar si el usuario es vendedor
export async function isSeller(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    return user?.role === 'seller' || user?.role === 'admin' || false;
  } catch (error) {
    console.error('Error checking seller status:', error);
    return false;
  }
}

// Función para obtener la tienda del usuario actual
export async function getCurrentUserStore() {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'seller') {
      return null;
    }

    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('seller_id', user.id)
      .single();

    if (error) {
      console.error('Error getting user store:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting user store:', error);
    return null;
  }
}

// Función para crear una tienda
export async function createStore(storeData: {
  name: string;
  slug: string;
  description?: string;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
}) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'seller') {
      throw new Error('Solo los vendedores pueden crear tiendas');
    }

    const { data, error } = await (supabase as any)
      .from('stores')
      .insert({
        seller_id: user.id,
        ...storeData,
      })
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error creating store:', error);
    return { data: null, error };
  }
}

// ============================================
// FUNCIONES DE SESIÓN
// ============================================

// Función para escuchar cambios en la autenticación
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = await getCurrentUser();
      callback(user);
    } else {
      callback(null);
    }
  });
}

// Función para obtener la sesión actual
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
  } catch (error) {
    console.error('Error getting session:', error);
    return { data: null, error };
  }
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

// Función para formatear el nombre del usuario
export function formatUserName(user: AuthUser): string {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  } else if (user.first_name) {
    return user.first_name;
  } else {
    return user.email.split('@')[0];
  }
}

// Función para obtener las iniciales del usuario
export function getUserInitials(user: AuthUser): string {
  if (user.first_name && user.last_name) {
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  } else if (user.first_name) {
    return user.first_name[0].toUpperCase();
  } else {
    return user.email[0].toUpperCase();
  }
}

// Función para verificar si el usuario tiene membresía activa
export function hasActiveMembership(user: AuthUser): boolean {
  if (user.membership_level === 'free') {
    return true;
  }

  if (!user.membership_expires_at) {
    return false;
  }

  return new Date(user.membership_expires_at) > new Date();
}

// Función para obtener el límite de puja según la membresía
export function getBidLimit(membershipLevel: string): number {
  switch (membershipLevel) {
    case 'free':
      return 500000;
    case 'bronze':
      return 2500000;
    case 'silver':
      return 10000000;
    case 'gold':
      return Infinity;
    default:
      return 500000;
  }
}

// ============================================
// EXPORTACIONES
// ============================================

export default supabase;
