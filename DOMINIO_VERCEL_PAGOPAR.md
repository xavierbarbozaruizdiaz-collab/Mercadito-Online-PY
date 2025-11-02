# 🎯 Dominio para Pagopar - Basado en tu Vercel

Veo que tu proyecto está en Vercel. Aquí están los dominios que tienes:

---

## 🌐 Dominios disponibles:

1. **`mercadito-online-py.vercel.app`** ⭐ (Principal - recomendado)
   - Este es el dominio principal de tu proyecto
   - Es el que debes usar para Pagopar

2. `mercadito-online-py-git-main-barboza.vercel.app` (Dominio de branch)
   - Este es específico del branch `main`
   - No uses este

3. `mercadito-online-4ltpf7z75-barboza.vercel.app` (Dominio de deployment)
   - Este es específico de este deployment
   - No uses este

---

## ✅ URLs para Pegar en Pagopar

**Usa el dominio principal:**

### 1. URL DE REDIRECCIONAMIENTO:
```
https://mercadito-online-py.vercel.app/pagopar/retorno/($hash)
```

### 2. URL DE RESPUESTA (Webhook):
```
https://mercadito-online-py.vercel.app/api/webhooks/pagopar
```

---

## 💡 ¿Tienes dominio personalizado?

Si tienes un dominio personalizado (como `xbar.com.py` o `mercadito.com.py`):

1. **Revisa en Vercel** si tienes dominio personalizado configurado:
   - Ve a tu proyecto en Vercel
   - Settings → Domains
   - Si tienes uno configurado, úsalo en lugar de `.vercel.app`

2. **Si tienes dominio personalizado, usa ese:**
   ```
   URL DE REDIRECCIONAMIENTO: https://tu-dominio-personalizado.com/pagopar/retorno/($hash)
   URL DE RESPUESTA: https://tu-dominio-personalizado.com/api/webhooks/pagopar
   ```

---

## ⚠️ IMPORTANTE

- ✅ Usa siempre `https://` (no `http://`)
- ✅ No uses los dominios de branch o deployment específicos
- ✅ Si agregas dominio personalizado después, actualiza las URLs en Pagopar

---

## 🔍 ¿Cómo verificar tu dominio?

1. Ve a tu proyecto en Vercel
2. Settings → Domains
3. Verás todos los dominios asociados
4. El que dice "Production" o tiene un check ✅ es el principal

---

## 📝 Resumen:

**Para Pagopar, usa:**
- **Dominio principal:** `mercadito-online-py.vercel.app`
- **O tu dominio personalizado** si lo tienes configurado



