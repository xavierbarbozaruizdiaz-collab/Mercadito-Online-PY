/**
 * Config pública de Supabase (sin secrets hardcodeados).
 * Requiere NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */

export function getSupabaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  if (!url) {
    throw new Error(
      'Falta NEXT_PUBLIC_SUPABASE_URL. Configurala en .env.local o en Vercel.'
    );
  }

  return url;
}

export function getSupabaseAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (!key) {
    throw new Error(
      'Falta NEXT_PUBLIC_SUPABASE_ANON_KEY. Configurala en .env.local o en Vercel.'
    );
  }

  return key;
}

/** Hostname del proyecto (para allowlists de imágenes). */
export function getSupabaseHostname(): string {
  try {
    return new URL(getSupabaseUrl()).hostname;
  } catch {
    return '';
  }
}
