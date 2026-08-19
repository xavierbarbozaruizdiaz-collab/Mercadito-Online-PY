'use client';

/**
 * Deshabilitado por seguridad (pre-producción).
 * La auto-asignación de rol admin via RPC/upsert está bloqueada.
 * Los admins se asignan solo desde Supabase (SQL / dashboard).
 */
export default function AdminRoleAssigner() {
  return null;
}
