// ============================================
// MARKETING INTEGRATIONS - ZOD SCHEMA
// Validación para IDs de marketing por tienda
// ============================================

import { z } from 'zod';

export const MarketingIntegrationsSchema = z.object({
  fb_pixel_id: z
    .string()
    .trim()
    .min(0)
    .max(32)
    .optional()
    .or(z.literal('')),
  ga_measurement_id: z
    .string()
    .trim()
    .regex(/^$|^G-[A-Z0-9]+$/, 'Formato inválido. Debe ser G-XXXXXXXXXX o vacío')
    .optional()
    .or(z.literal('')),
  gtm_id: z
    .string()
    .trim()
    .regex(/^$|^GTM-[A-Z0-9]+$/, 'Formato inválido. Debe ser GTM-XXXXXXX o vacío')
    .optional()
    .or(z.literal('')),
}).transform((v) => ({
  fb_pixel_id: v.fb_pixel_id?.trim() || null,
  ga_measurement_id: v.ga_measurement_id?.trim() || null,
  gtm_id: v.gtm_id?.trim() || null,
}));

export type MarketingIntegrationsInput = z.infer<typeof MarketingIntegrationsSchema>;

