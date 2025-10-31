// src/lib/services/referralService.ts
// Servicio para gestionar referidos

import { supabase } from '@/lib/supabase/client';

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  status: 'pending' | 'completed' | 'rewarded';
  reward_amount?: number;
  reward_type?: string;
  created_at: string;
  completed_at?: string;
}

export interface UserReferralCode {
  id: string;
  user_id: string;
  referral_code: string;
  total_referrals: number;
  total_rewards: number;
  created_at: string;
  updated_at: string;
}

export class ReferralService {
  /**
   * Obtiene o crea el código de referido de un usuario
   */
  static async getOrCreateReferralCode(
    userId: string
  ): Promise<string | null> {
    try {
      const { data, error } = await (supabase as any).rpc('get_or_create_referral_code', {
        user_id_param: userId,
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error getting referral code:', error);
      return null;
    }
  }

  /**
   * Procesa un referido cuando un nuevo usuario se registra
   */
  static async processReferral(
    referralCode: string,
    referredUserId: string
  ): Promise<Referral | null> {
    try {
      const { data, error } = await (supabase as any).rpc('process_referral', {
        referral_code_param: referralCode,
        referred_user_id: referredUserId,
      });

      if (error) throw error;

      // Obtener el registro completo
      const { data: referral, error: fetchError } = await supabase
        .from('referrals')
        .select('*')
        .eq('id', data)
        .single();

      if (fetchError) throw fetchError;

      return referral as Referral;
    } catch (error) {
      console.error('Error processing referral:', error);
      return null;
    }
  }

  /**
   * Obtiene el código de referido y estadísticas de un usuario
   */
  static async getUserReferralStats(
    userId: string
  ): Promise<UserReferralCode | null> {
    try {
      const { data, error } = await supabase
        .from('user_referral_codes')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No existe, crear uno
          const code = await this.getOrCreateReferralCode(userId);
          if (code) {
            return await this.getUserReferralStats(userId);
          }
        }
        throw error;
      }

      return data as UserReferralCode;
    } catch (error) {
      console.error('Error getting user referral stats:', error);
      return null;
    }
  }

  /**
   * Obtiene la lista de referidos de un usuario
   */
  static async getUserReferrals(
    userId: string
  ): Promise<Referral[]> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []) as Referral[];
    } catch (error) {
      console.error('Error getting user referrals:', error);
      return [];
    }
  }

  /**
   * Genera la URL de referido completa
   */
  static getReferralUrl(referralCode: string): string {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/sign-up?ref=${referralCode}`;
  }
}

