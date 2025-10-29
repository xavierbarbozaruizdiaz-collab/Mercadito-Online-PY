// src/lib/services/securityAuditService.ts
// Servicio para auditoría de seguridad

import { supabase } from '@/lib/supabaseClient';

export interface SecurityAuditResult {
  table_name: string;
  rls_enabled: boolean;
  policy_count: number;
  has_insert_policy: boolean;
  has_select_policy: boolean;
  has_update_policy: boolean;
  has_delete_policy: boolean;
}

export interface SecuritySummary {
  total_tables: number;
  tables_with_rls: number;
  total_policies: number;
  tables_missing_policies: string[];
}

export class SecurityAuditService {
  /**
   * Obtiene el estado de seguridad de todas las tablas
   */
  static async getSecurityStatus(): Promise<SecurityAuditResult[]> {
    try {
      const { data, error } = await supabase.rpc('audit_security_status');

      if (error) throw error;
      return (data || []) as SecurityAuditResult[];
    } catch (error) {
      console.error('Error getting security status:', error);
      return [];
    }
  }

  /**
   * Obtiene un resumen de seguridad
   */
  static async getSecuritySummary(): Promise<SecuritySummary | null> {
    try {
      const status = await this.getSecurityStatus();

      const tables_with_rls = status.filter((s) => s.rls_enabled).length;
      const total_policies = status.reduce((sum, s) => sum + s.policy_count, 0);
      const tables_missing_policies = status
        .filter((s) => s.rls_enabled && s.policy_count === 0)
        .map((s) => s.table_name);

      return {
        total_tables: status.length,
        tables_with_rls,
        total_policies,
        tables_missing_policies,
      };
    } catch (error) {
      console.error('Error getting security summary:', error);
      return null;
    }
  }

  /**
   * Verifica permisos de usuario
   */
  static async verifyUserPermissions(
    userId: string,
    resourceType: string,
    action: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('verify_user_permissions', {
        user_id_param: userId,
        resource_type: resourceType,
        action: action,
      } as any);

      if (error) throw error;
      return (data as boolean) || false;
    } catch (error) {
      console.error('Error verifying permissions:', error);
      return false;
    }
  }
}

