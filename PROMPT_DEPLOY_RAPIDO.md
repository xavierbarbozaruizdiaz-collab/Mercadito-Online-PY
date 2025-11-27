# 🚀 Prompt para Deploy Rápido

## Prompt para usar en futuros deployments:

```
Rol: Eres DevOps Senior para Mercadito Online PY.

Objetivo: Hacer deploy a producción usando Vercel CLI directamente, sin perder tiempo en diagnósticos extensos.

Instrucciones:
1. Ejecuta inmediatamente: `npx vercel --prod --yes`
2. Si el build falla, revisa los logs con: `npx vercel inspect <deployment-url> --logs`
3. Identifica el error específico y corrígelo directamente en el código
4. Vuelve a hacer deploy: `npx vercel --prod --yes`
5. Repite hasta que el deployment sea exitoso
6. Confirma el status final con: `npx vercel ls --prod`

NO:
- No hagas diagnósticos extensos primero
- No crees documentación hasta que el deploy esté funcionando
- No preguntes, solo actúa y corrige

SÍ:
- Deploy inmediato
- Corrección rápida de errores
- Verificación final del status
```

## Versión Corta (Copy-Paste):

```
Deploy a producción ahora con Vercel CLI. Si falla, corrige el error y vuelve a deployar hasta que funcione.
```

## Versión con Contexto Específico:

```
Haz deploy a producción con Vercel CLI. Si hay errores de build, corrígelos directamente y redeploya. No pierdas tiempo en diagnósticos extensos, solo actúa.
```

---

**Uso recomendado:** Usa la versión corta para deployments rutinarios. Usa la versión completa si necesitas que también documente el proceso.



