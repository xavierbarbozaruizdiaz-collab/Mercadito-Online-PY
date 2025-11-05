# ✅ Checklist de Despliegue - GTM E-commerce

**Mercadito Online PY**  
**Sitio:** mercaditonlinepy.com  
**GTM ID:** GTM-PQ8Q6JGW  
**GA4 Measurement ID:** G-52EMX80KW5  
**Moneda:** PYG

## 📦 Fase 1: Importación
- [ ] Descargué el archivo `gtm-ecommerce-container.json` desde `/public/`
- [ ] Accedí a Google Tag Manager con permisos de administrador
- [ ] Importé el contenedor usando **Admin** → **Import Container**
- [ ] Seleccioné el modo **Merge** (preservar configuración existente)
- [ ] Confirmé la importación exitosa

## ⚙️ Fase 2: Configuración
- [ ] Configuré la variable **{{FB Pixel ID}}** con mi Pixel ID de Facebook
  - Si no uso Facebook Pixel, dejé la variable vacía (ok)
- [ ] Verifiqué que todas las variables estén presentes:
  - [ ] {{event}}
  - [ ] {{ecommerce}}
  - [ ] {{currency}}
  - [ ] {{value}}
  - [ ] {{transaction_id}}
  - [ ] {{items}}
  - [ ] Variables derivadas (contents, num_items, etc.)

## 🧪 Fase 3: Preview y Testing
- [ ] Activé **Preview Mode** en GTM
- [ ] Abrí mi sitio en modo Preview
- [ ] Verifiqué que Tag Assistant se abrió correctamente
- [ ] Probé el evento **view_item**:
  - [ ] Abrí una página de producto
  - [ ] Verifiqué que el evento aparece en Tag Assistant
  - [ ] Verifiqué que el tag "GA4 – view_item" se dispara
  - [ ] Verifiqué que el tag "FB – ViewContent" se dispara (si tengo Pixel ID)
- [ ] Probé el evento **add_to_cart**:
  - [ ] Agregué un producto al carrito
  - [ ] Verifiqué que el evento aparece en Tag Assistant
  - [ ] Verifiqué que los tags GA4 y FB se disparan
- [ ] Probé el evento **begin_checkout**:
  - [ ] Entré a la página de checkout
  - [ ] Verifiqué que el evento aparece con todos los items
  - [ ] Verifiqué que los tags se disparan correctamente
- [ ] Probé el evento **purchase**:
  - [ ] Completé una compra de prueba
  - [ ] Verifiqué que el evento aparece con `transaction_id`
  - [ ] Verifiqué que los tags se disparan correctamente

## 📊 Fase 4: Verificación en Plataformas
- [ ] **Google Analytics 4**:
  - [ ] Accedí a GA4 DebugView
  - [ ] Conecté mi sesión para testing
  - [ ] Verifiqué que todos los eventos aparecen en DebugView
  - [ ] Verifiqué que los parámetros están correctos (items, value, currency)
  - [ ] Revisé Reports → Monetization para verificar compras
- [ ] **Facebook Events Manager** (si aplica):
  - [ ] Accedí a Events Manager → Test Events
  - [ ] Verifiqué que los eventos aparecen en tiempo real
  - [ ] Verifiqué que los parámetros están correctos (content_ids, contents, value)

## 🚀 Fase 5: Publicación
- [ ] Revisé todos los cambios en el workspace
- [ ] Creé una versión del contenedor
- [ ] Agregué notas descriptivas en la versión
- [ ] Publiqué el contenedor en producción
- [ ] Verifiqué que el contenedor está activo

## 🔍 Fase 6: Validación Post-Producción
- [ ] Verifiqué en producción que los eventos se disparan correctamente
- [ ] Revisé GA4 Realtime Reports para confirmar eventos
- [ ] Revisé Facebook Events Manager (si aplica)
- [ ] Documenté cualquier ajuste necesario

## 📝 Notas Finales
- [ ] Moneda configurada: PYG ✅
- [ ] Measurement ID GA4: G-52EMX80KW5 ✅
- [ ] Facebook Pixel ID: [________] (completar o dejar vacío)
- [ ] Fecha de despliegue: [________]
- [ ] Versión del contenedor: [________]

---

## ✅ Estado Final
- [ ] **COMPLETADO**: Todos los eventos funcionan correctamente
- [ ] **PENDIENTE**: Requiere ajustes (especificar en notas)

**Firma del despliegue:**
- Nombre: _________________
- Fecha: _________________
- Versión del contenedor: _________________

