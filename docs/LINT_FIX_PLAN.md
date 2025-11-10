# ESLint Cleanup Roadmap (LPMS)

Estado general después de `npm run lint` (nov 2025): ~1834 problemas (1355 errores, 479 warnings). Objetivo: depurar en 3 mini‑sprints sin tocar UI ni lógica, priorizando reglas que señalan bugs reales.

## Sprint 1 – Bugs que rompen funcionalidad
| Checklist | Regla / Clúster | Acción sugerida |
| --- | --- | --- |
| [ ] | `react-hooks/set-state-in-effect` | Evitar `setState` directo dentro de efectos que se re‑disparan; mover lógica a callbacks o añadir flags de montaje. |
| [ ] | `react-hooks/exhaustive-deps` | Memorizar funciones con `useCallback` / incluir deps necesarias. |
| [ ] | `@next/next/no-assign-module-variable` | No reasignar imports; crear copias locales. |
| [ ] | `no-undef`, `no-redeclare` | Declarar variables faltantes / renombrar duplicados. |

**Meta:** Dejar el run “strict” sin errores críticos antes de Sprint 2.

## Sprint 2 – Higiene controlada
| Checklist | Regla / Clúster | Acción sugerida |
| --- | --- | --- |
| [ ] | `no-unused-vars` / `@typescript-eslint/no-unused-vars` | Remover o renombrar argumentos no usados (`_arg`). |
| [ ] | `no-shadow`, `prefer-const`, `consistent-return` | Ajustar según caso (no impacta UI). |
| [ ] | `@typescript-eslint/no-explicit-any` (zonas productivas) | Reemplazar por tipos concretos o `unknown` + type guards. |

**Tip:** Mantener `src/legacy/**` como warn hasta finalizar S3.

## Sprint 3 – Tipado y contratos
| Checklist | Módulo | Acción sugerida |
| --- | --- | --- |
| [ ] | `src/lib/services/**` | Tipar respuestas de API (DTOs), reemplazar `any`. |
| [ ] | `src/lib/utils/**`, `src/types/**` | Consolidar tipos compartidos. |
| [ ] | `supabase/**`, tests | Tipos adecuados para mocks; considerar tipos generados por Supabase. |

**Opcional:** endurecer `tsconfig` (`noImplicitAny`, `strictNullChecks`) después de limpiar.

## Overrides & exclusiones actuales
- `.eslintignore` temporal: `docs/.artifacts/`, `src/legacy/**`, `src/__tests__/**`, `src/__mocks__/**`, scripts y builds.
- `.eslintrc.cjs` overrides: `src/legacy/**` (warnings), `scripts/**` (relaja reglas de Node), tests/mocks.

## Seguimiento
1. Trabajar carpeta por carpeta (`src/components/**`, `src/lib/**`…).  
2. Actualizar este archivo marcando `[x]` conforme se limpian reglas.  
3. Ejecutar:
   ```bash
   source ~/.nvm/nvm.sh && nvm use 22
   npm run lint
   ```
   El objetivo es llegar a `0` errores antes de relajar overrides temporales.

## Checklist global
- [ ] Sprint 1 completado (sin errores en reglas críticas).  
- [ ] Sprint 2 completado (warnings mínimos en legacy).  
- [ ] Sprint 3 completado (tipado consistente).  
- [ ] Restablecer severidad original (`no-explicit-any` como error, etc.).  
- [ ] QA strict pasa en local y CI sin overrides especiales.  

> Una vez finalizados los tres sprints se puede eliminar el bloque `src/legacy/**` del override y volver a la configuración estricta original. Stay LPMS 🚀


