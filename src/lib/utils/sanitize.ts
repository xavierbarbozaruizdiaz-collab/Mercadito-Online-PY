// ============================================
// INPUT SANITIZATION UTILITIES
// Utilidades para sanitizar inputs y prevenir XSS
// ============================================

/**
 * Sanitiza un string HTML para prevenir XSS
 * Nota: Para uso simple. Para producción, considerar usar DOMPurify
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== 'string') return '';
  
  // Remover scripts y eventos peligrosos
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '');
}

/**
 * Escapa HTML para prevenir XSS
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') return '';
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Valida que un string sea seguro para usar en queries
 */
export function sanitizeForQuery(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remover caracteres peligrosos
  return input
    .replace(/[;'"\\]/g, '')
    .trim()
    .slice(0, 1000); // Limitar longitud
}

/**
 * Valida y sanitiza un email
 */
export function sanitizeEmail(email: string): string | null {
  if (typeof email !== 'string') return null;
  
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) return null;
  
  return sanitized;
}

/**
 * Valida y sanitiza un número de teléfono paraguayo
 */
export function sanitizePhone(phone: string): string | null {
  if (typeof phone !== 'string') return null;
  
  // Remover todo excepto dígitos
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Validar formato paraguayo (9 o 10 dígitos)
  if (digitsOnly.length < 9 || digitsOnly.length > 10) return null;
  
  return digitsOnly;
}

/**
 * Valida que un string no contenga patrones sospechosos
 */
export function containsSuspiciousPatterns(input: string): boolean {
  if (typeof input !== 'string') return false;
  
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
    /vbscript:/i,
    /expression\(/i,
    /@import/i,
    /url\(javascript:/i,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(input));
}

