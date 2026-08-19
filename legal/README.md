# DOCUMENTOS LEGALES - MERCADITO ONLINE PY

Este directorio contiene todos los documentos legales obligatorios y recomendados para la operación de Mercadito Online PY como marketplace digital en Paraguay.

---

## 📋 ÍNDICE DE DOCUMENTOS

### 1. [Términos y Condiciones del Marketplace](./01-terminos-y-condiciones.md)
**Propósito:** Establece los términos generales de uso de la plataforma, roles de intermediación, limitación de responsabilidad, y derechos y obligaciones de usuarios.

**Aplicabilidad:** Todos los usuarios de la plataforma (compradores, vendedores, tiendas).

**Contenido principal:**
- Definición del servicio y naturaleza de intermediación
- Obligaciones de compradores y vendedores
- Sistema de comisiones y pagos
- Sistema de subastas
- Resolución de conflictos
- Limitación de responsabilidad de la plataforma

---

### 2. [Política de Privacidad](./02-politica-privacidad.md)
**Propósito:** Cumplimiento de la Ley N° 1682/2001 de protección de datos personales de Paraguay. Describe cómo se recopilan, utilizan y protegen los datos personales.

**Aplicabilidad:** Todos los usuarios y visitantes de la plataforma.

**Contenido principal:**
- Datos personales recopilados
- Finalidad del tratamiento
- Almacenamiento en Supabase
- Uso de Google Analytics 4, Meta Pixel, cookies, WhatsApp Cloud API
- Derechos del titular de datos
- Conservación de datos

---

### 3. [Política de Cookies](./03-politica-cookies.md)
**Propósito:** Informa sobre el uso de cookies y tecnologías de seguimiento en la plataforma.

**Aplicabilidad:** Todos los usuarios y visitantes de la plataforma.

**Contenido principal:**
- Tipos de cookies utilizadas (esenciales, analíticas, publicitarias)
- Cookies de terceros (Google Analytics, Meta Pixel)
- Gestión y consentimiento de cookies
- Derechos del usuario

---

### 4. [Política de Reembolsos y Devoluciones](./04-politica-reembolsos-devoluciones.md)
**Propósito:** Establece los términos y condiciones para devoluciones y reembolsos de productos.

**Aplicabilidad:** Compradores y vendedores en transacciones.

**Contenido principal:**
- Derecho de desistimiento (7 días hábiles)
- Condiciones para devoluciones
- Proceso de devolución y reembolso
- Costos de devolución
- Productos adquiridos en subastas
- Productos no recibidos

---

### 5. [Política de Envíos](./05-politica-envios.md)
**Propósito:** Establece los términos relacionados con el envío y entrega de productos.

**Aplicabilidad:** Compradores y vendedores en transacciones.

**Contenido principal:**
- Responsabilidad del vendedor
- Métodos de envío disponibles
- Costos de envío
- Tiempos de envío
- Seguimiento de envíos
- Productos no recibidos o dañados

---

### 6. [Política de Productos Prohibidos](./06-politica-productos-prohibidos.md)
**Propósito:** Lista completa de productos que NO pueden ser publicados en la plataforma según leyes paraguayas y políticas de la plataforma.

**Aplicabilidad:** Vendedores y tiendas.

**Contenido principal:**
- Productos prohibidos por ley (armas, drogas, falsificados)
- Productos regulados que requieren autorización
- Productos prohibidos por política de la plataforma
- Sanciones por incumplimiento

---

### 7. [Reglamento de Subastas](./07-reglamento-subastas.md)
**Propósito:** Regula específicamente el funcionamiento del sistema de subastas.

**Aplicabilidad:** Vendedores que crean subastas y postores que participan.

**Contenido principal:**
- Creación y gestión de subastas
- Reglas de puja (incrementos mínimos, naturaleza vinculante)
- Sistema anti-sniping (extensión automática de tiempo)
- Cierre de subastas y determinación del ganador
- Obligaciones del postor ganador
- Postor remiso y penalidades

---

### 8. [Acuerdo de Postor](./08-acuerdo-postor.md)
**Propósito:** Contrato específico que aceptan los usuarios al participar como postores en subastas.

**Aplicabilidad:** Usuarios que realizan pujas en subastas.

**Contenido principal:**
- Naturaleza vinculante e irrevocable de las pujas
- Obligaciones del postor ganador
- Penalidades por postor remiso
- Verificación obligatoria
- Prohibiciones

---

### 9. [Contrato de Vendedor](./09-contrato-vendedor.md)
**Propósito:** Contrato específico que aceptan los usuarios al registrarse como vendedores.

**Aplicabilidad:** Usuarios que operan como vendedores.

**Contenido principal:**
- Obligaciones del vendedor (veracidad, cumplimiento legal)
- Gestión de órdenes
- Comisiones y pagos
- Garantías y responsabilidades
- Prohibiciones
- Suspensión y cancelación de cuenta

---

### 10. [Contrato de Adhesión para Tiendas](./10-contrato-adhesion-tiendas.md)
**Propósito:** Contrato específico para usuarios que operan tiendas con membresía.

**Aplicabilidad:** Usuarios que crean y operan tiendas.

**Contenido principal:**
- Creación y gestión de tiendas
- Planes de membresía (gratuito, bronce, plata, oro)
- Obligaciones del titular de la tienda
- Suspensión y cancelación de tienda
- Modificaciones del servicio

---

## 🔍 CARACTERÍSTICAS TÉCNICAS DETECTADAS EN EL CÓDIGO

Estos documentos legales están basados en el análisis completo del código de la aplicación, incluyendo:

### Sistema de Autenticación
- Registro con Supabase Auth
- OAuth (Google, Facebook)
- Verificación de identidad
- Roles de usuario (buyer, seller, admin, affiliate)

### Sistema de Subastas
- Incrementos mínimos configurables (por defecto: 1.000 Gs.)
- Sistema anti-sniping (extensión automática de 2 minutos)
- Pujas vinculantes e irrevocables
- Postor remiso con penalidades

### Sistema de Pagos
- Integración con Pagopar
- Transferencia bancaria
- Efectivo (contra entrega)
- Tarjetas de crédito/débito

### Sistema de Comisiones
- Ventas directas: 10% por defecto (configurable)
- Subastas comprador: 3% por defecto (configurable)
- Subastas vendedor: 5% por defecto (configurable)

### Almacenamiento de Datos
- Supabase (base de datos PostgreSQL)
- Row Level Security (RLS)
- Encriptación en tránsito y reposo

### Integraciones de Terceros
- Google Analytics 4 (analítica)
- Meta Pixel (publicidad)
- WhatsApp Cloud API (comunicaciones)
- Cookies para sesión y tracking

### Sistema de Membresías
- Plan gratuito
- Planes de pago (Bronce, Plata, Oro)
- Renovación automática
- Expiración y degradación automática

---

## 📝 NOTAS IMPORTANTES

### Campos a Completar

Todos los documentos contienen marcadores `[TEXTO]` que deben ser completados con información específica:

- `[FECHA]`: Fecha de última actualización
- `[NOMBRE DE LA EMPRESA]`: Nombre legal de la empresa operadora
- `[NÚMERO]`: RUC de la empresa
- `[DIRECCIÓN]`: Dirección física completa
- `[EMAIL DE CONTACTO]`: Email para consultas generales
- `[EMAIL DE PRIVACIDAD]`: Email específico para temas de privacidad
- `[EMAIL DE SOPORTE]`: Email de soporte técnico
- `[TELÉFONO]`: Teléfono de contacto
- `[HORARIO]`: Horario de atención
- `[CIUDAD]`: Ciudad para jurisdicción legal

### Personalización Necesaria

1. **Completar información de contacto** en todos los documentos
2. **Revisar porcentajes de comisiones** según configuración real
3. **Ajustar plazos** si difieren de los establecidos por defecto
4. **Consultar con abogado** para validación legal final
5. **Adaptar a normativas específicas** de Paraguay si hay cambios recientes

### Cumplimiento Legal

Estos documentos están diseñados para cumplir con:

- ✅ Ley N° 1682/2001 de Protección de Datos Personales (Paraguay)
- ✅ Ley de Protección al Consumidor (Paraguay)
- ✅ Código Civil paraguayo
- ✅ Normativas de comercio electrónico
- ✅ Reglamento General de Protección de Datos (RGPD) - para usuarios europeos

---

## 🚀 PRÓXIMOS PASOS

1. **Revisar y completar** todos los campos marcados con `[TEXTO]`
2. **Validar con abogado** especializado en comercio electrónico paraguayo
3. **Publicar en la plataforma** en secciones accesibles (footer, páginas legales)
4. **Implementar consentimiento** para cookies y políticas
5. **Configurar enlaces** desde registro, checkout y páginas relevantes
6. **Actualizar periódicamente** según cambios en normativas o funcionalidades

---

## 📞 CONTACTO

Para consultas sobre estos documentos legales:

**Mercadito Online PY - Departamento Legal**
- Email: [EMAIL LEGAL]
- Teléfono: [TELÉFONO]

---

**Última actualización del índice:** [FECHA]













