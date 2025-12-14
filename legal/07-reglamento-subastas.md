# REGLAMENTO DE SUBASTAS
## Mercadito Online PY

**Última actualización:** [FECHA]

---

## 1. DEFINICIONES Y ALCANCE

### 1.1. Definiciones

Para los efectos de este Reglamento:

- **"Subasta"**: Modalidad de venta mediante pujas competitivas donde el postor que ofrezca el mayor monto al cierre resulta ganador.

- **"Vendedor"**: Usuario que crea y publica una subasta.

- **"Postor"**: Usuario que participa en una subasta mediante pujas.

- **"Puja"**: Oferta monetaria realizada por un postor en una subasta.

- **"Puja Ganadora"**: La puja más alta al momento del cierre de la subasta.

- **"Postor Ganador"**: El postor que realizó la puja ganadora.

- **"Postor Remiso"**: Postor ganador que incumple su obligación de pago en los plazos establecidos.

- **"Precio Inicial"**: Monto mínimo establecido por el Vendedor para iniciar la subasta.

- **"Incremento Mínimo"**: Monto mínimo que debe aumentar cada nueva puja sobre la puja anterior.

- **"Anti-Sniping"**: Sistema que extiende automáticamente el tiempo de la subasta cuando hay pujas en los últimos minutos.

- **"Bonus Time"**: Tiempo adicional otorgado automáticamente cuando se detecta una puja cerca del cierre.

### 1.2. Alcance

Este Reglamento regula:

- La creación y gestión de subastas
- La participación de postores
- Las reglas de puja
- El sistema anti-sniping
- Las obligaciones del postor ganador
- Las penalidades por incumplimiento
- La resolución de conflictos

---

## 2. CREACIÓN DE SUBASTAS

### 2.1. Requisitos del Vendedor

Para crear una subasta, el Vendedor debe:

- Tener una cuenta activa como Vendedor
- Tener el producto físicamente disponible
- Tener derecho legal a vender el producto
- Cumplir con todas las normativas aplicables
- Proporcionar información veraz y completa

### 2.2. Información Requerida

Al crear una subasta, el Vendedor debe proporcionar:

- **Descripción detallada** del producto
- **Fotografías** reales y representativas (mínimo 3)
- **Precio inicial** de la subasta
- **Incremento mínimo** de puja (por defecto: 1.000 guaraníes)
- **Duración** de la subasta (fecha y hora de inicio y fin)
- **Condición** del producto (nuevo, usado, usado como nuevo)
- **Método de envío** disponible
- **Información de contacto**

### 2.3. Configuración de la Subasta

**Duración:**
- Mínimo: 24 horas
- Máximo: 30 días
- Se puede configurar fecha y hora específicas de inicio y fin

**Precio Inicial:**
- Debe ser mayor a 0
- Puede ser cualquier monto razonable

**Incremento Mínimo:**
- Por defecto: 1.000 guaraníes
- Puede ser configurado por el Vendedor
- Debe ser razonable según el valor del producto

### 2.4. Modificaciones y Cancelaciones

**Modificaciones:**
- El Vendedor puede modificar la subasta ANTES de recibir la primera puja válida
- Después de la primera puja, solo se pueden hacer modificaciones menores (descripción, fotos adicionales)
- NO se puede modificar precio inicial, incremento mínimo o duración después de la primera puja

**Cancelaciones:**
- El Vendedor puede cancelar ANTES de recibir la primera puja válida
- Después de la primera puja, solo se puede cancelar por causas de fuerza mayor justificadas
- La cancelación requiere autorización de la Plataforma en casos excepcionales

---

## 3. REGLAS DE PUJA

### 3.1. Requisitos para Pujar

Para participar en una subasta, el Postor debe:

- Tener una cuenta activa
- Estar autenticado en la Plataforma
- No ser el Vendedor de la subasta (no puede pujar en sus propias subastas)
- Tener capacidad legal para contratar

### 3.2. Monto de la Puja

**Regla General:**
- Cada nueva puja debe ser mayor que la puja anterior
- El incremento mínimo es el establecido por el Vendedor (por defecto: 1.000 guaraníes)
- La fórmula es: **Nueva Puja ≥ Puja Anterior + Incremento Mínimo**

**Ejemplo:**
- Puja actual: 50.000 Gs.
- Incremento mínimo: 1.000 Gs.
- Puja mínima aceptada: 51.000 Gs.

### 3.3. Naturaleza Vinculante de las Pujas

**Las pujas son VINCULANTES e IRREVOCABLES:**

- Una vez realizada, la puja NO puede ser retirada
- El Postor se obliga a pagar el monto de su puja si resulta ganador
- No hay "pujas de prueba" o "pujas condicionales"
- Todas las pujas son compromisos serios de compra

### 3.4. Validación de Pujas

El sistema valida automáticamente:

- Que el monto cumpla con el incremento mínimo
- Que la subasta esté activa
- Que no haya expirado el tiempo
- Que el Postor no sea el Vendedor
- Que el Postor tenga cuenta activa

### 3.5. Actualización en Tiempo Real

- Las pujas se actualizan en tiempo real para todos los usuarios
- El sistema muestra la puja actual y el tiempo restante
- Los Postores reciben notificaciones de nuevas pujas (si están suscritos)

---

## 4. SISTEMA ANTI-SNIPING

### 4.1. Objetivo

El sistema anti-sniping previene que postores realicen pujas en los últimos segundos para evitar que otros postores puedan responder, asegurando una competencia justa.

### 4.2. Funcionamiento

**Regla de Extensión Automática:**

- Si se realiza una puja dentro de los **últimos 2 minutos** antes del cierre programado
- El tiempo de la subasta se extiende automáticamente en **2 minutos adicionales**
- Esto se repite cada vez que hay una nueva puja en los últimos 2 minutos
- La subasta solo cierra cuando pasan 2 minutos completos SIN nuevas pujas

**Ejemplo:**
- Cierre programado: 20:00:00
- Puja a las 19:59:30 → Nueva hora de cierre: 20:01:30
- Puja a las 20:01:15 → Nueva hora de cierre: 20:03:15
- Sin pujas hasta 20:05:15 → Subasta cierra

### 4.3. Notificación

- El sistema notifica automáticamente cuando se aplica extensión de tiempo
- Se muestra un mensaje: "⏰ +X segundos bonus tiempo!"
- Todos los postores ven la nueva hora de cierre actualizada

### 4.4. Beneficios

- Permite que todos los postores tengan oportunidad de responder
- Previene estrategias de "último segundo"
- Asegura competencia justa y transparente

---

## 5. CIERRE DE LA SUBASTA

### 5.1. Cierre Automático

La subasta cierra automáticamente cuando:

- Pasa el tiempo establecido SIN nuevas pujas en los últimos 2 minutos
- O cuando el Vendedor la cancela (con autorización)

### 5.2. Determinación del Ganador

**Postor Ganador:**
- Es el Postor que realizó la **puja más alta** al momento del cierre
- En caso de empate (mismo monto), gana la puja realizada primero

**Monto a Pagar:**
- El Postor ganador debe pagar el **monto de su puja ganadora**
- Más las comisiones aplicables (ver sección 6)

### 5.3. Notificación del Ganador

- El sistema notifica automáticamente al Postor ganador
- Se envía notificación por email y en la Plataforma
- El Vendedor también es notificado

### 5.4. Subastas Sin Pujas

Si una subasta cierra sin pujas:

- La subasta se marca como "Finalizada sin ganador"
- El Vendedor puede relanzar la subasta si lo desea
- No hay obligaciones para ninguna parte

---

## 6. OBLIGACIONES DEL POSTOR GANADOR

### 6.1. Pago Oportuno

El Postor ganador debe:

- Realizar el pago dentro de **48 horas hábiles** después del cierre de la subasta
- Utilizar métodos de pago válidos y autorizados
- Pagar el monto completo de su puja ganadora
- Pagar las comisiones aplicables

### 6.2. Monto Total a Pagar

El Postor ganador debe pagar:

- **Monto de la puja ganadora**
- **Comisión al Comprador** (por defecto: 3% del monto de la puja)
- **Total:** Monto de puja + Comisión

**Ejemplo:**
- Puja ganadora: 100.000 Gs.
- Comisión (3%): 3.000 Gs.
- **Total a pagar: 103.000 Gs.**

### 6.3. Métodos de Pago

El pago puede realizarse mediante:

- Transferencia bancaria
- Efectivo (contra entrega, si el Vendedor lo acepta)
- Tarjeta de crédito/débito
- Pagopar

### 6.4. Comunicación con el Vendedor

El Postor ganador debe:

- Responder a comunicaciones del Vendedor
- Proporcionar información de contacto y envío
- Coordinar detalles de entrega

---

## 7. POSTOR REMISO

### 7.1. Definición

**Postor Remiso** es el Postor ganador que:

- No realiza el pago dentro de las 48 horas hábiles establecidas
- No responde a comunicaciones del Vendedor
- Incumple su obligación de pago sin justificación válida

### 7.2. Proceso de Declaración

Si el Postor ganador no paga en tiempo:

1. **Advertencia:** Se envía recordatorio después de 24 horas
2. **Ultimátum:** Se envía ultimátum después de 36 horas
3. **Declaración:** Después de 48 horas sin pago, se declara Postor Remiso

### 7.3. Penalidades para el Postor Remiso

**Suspensión de Cuenta:**
- La cuenta del Postor Remiso se suspende inmediatamente
- No puede participar en nuevas subastas
- No puede realizar compras hasta regularizar su situación

**Prohibición de Participación:**
- Queda inhabilitado para participar en subastas
- Puede ser inhabilitado permanentemente si reincide

**Retención de Información:**
- Se conserva registro del incumplimiento
- Puede afectar futuras transacciones

**Acciones Legales:**
- El Vendedor puede tomar acciones legales para recuperar daños
- La Plataforma puede reportar a autoridades si corresponde

### 7.4. Reasignación de la Subasta

Cuando se declara Postor Remiso:

- La Plataforma puede ofrecer la subasta al **segundo postor más alto**
- El segundo postor puede aceptar o rechazar
- Si rechaza, se puede ofrecer al tercero, y así sucesivamente
- Si nadie acepta, la subasta queda sin ganador

### 7.5. Regularización

El Postor Remiso puede regularizar su situación:

- Realizando el pago pendiente
- Pagando penalidades adicionales si se aplican
- Contactando al soporte de la Plataforma
- La suspensión puede levantarse después de regularización

---

## 8. OBLIGACIONES DEL VENDEDOR

### 8.1. Entrega del Producto

El Vendedor debe:

- Entregar el producto al Postor ganador después de recibir el pago
- Entregar el producto en el estado descrito en la subasta
- Enviar el producto en los plazos acordados
- Proporcionar información de seguimiento cuando corresponda

### 8.2. Comunicación

El Vendedor debe:

- Responder a comunicaciones del Postor ganador
- Coordinar detalles de entrega
- Proporcionar información de contacto

### 8.3. Comisiones

El Vendedor recibe:

- Monto de la puja ganadora
- Menos la comisión al Vendedor (por defecto: 5% del monto de la puja)
- **Ganancia neta:** Monto de puja - Comisión

**Ejemplo:**
- Puja ganadora: 100.000 Gs.
- Comisión Vendedor (5%): 5.000 Gs.
- **Ganancia neta: 95.000 Gs.**

---

## 9. CANCELACIÓN DE SUBASTAS

### 9.1. Cancelación por el Vendedor

El Vendedor puede cancelar:

- **Antes de la primera puja:** Sin restricciones
- **Después de la primera puja:** Solo por causas de fuerza mayor justificadas y con autorización de la Plataforma

### 9.2. Cancelación por la Plataforma

La Plataforma puede cancelar una subasta cuando:

- Se detecta violación de términos
- El producto es prohibido o ilegal
- Hay actividad fraudulenta
- Se requiere por orden de autoridades

### 9.3. Efectos de la Cancelación

Si se cancela después de pujas:

- Las pujas quedan sin efecto
- No hay obligaciones para ninguna parte
- El Vendedor puede relanzar la subasta si lo desea

---

## 10. RESOLUCIÓN DE CONFLICTOS

### 10.1. Comunicación Directa

Las partes (Vendedor y Postor) deben intentar resolver conflictos mediante comunicación directa a través del sistema de mensajería de la Plataforma.

### 10.2. Intervención de la Plataforma

La Plataforma puede intervenir cuando:

- Hay desacuerdo entre las partes
- Se detectan posibles violaciones de términos
- Se requiere mediación
- Hay casos de fraude o conducta ilegal

### 10.3. Arbitraje

Cualquier controversia se resolverá según lo establecido en los Términos y Condiciones de la Plataforma.

---

## 11. SANCIONES Y MEDIDAS DISCIPLINARIAS

### 11.1. Tipos de Sanciones

La Plataforma puede aplicar:

- Advertencia escrita
- Suspensión temporal de participación en subastas
- Suspensión permanente de participación
- Suspensión de cuenta completa
- Acciones legales cuando corresponda

### 11.2. Causas de Sanción

Constituyen causas de sanción:

- Ser Postor Remiso
- Realizar pujas fraudulentas o manipulativas
- Colusión entre postores
- Violación de términos de subastas
- Conducta abusiva o fraudulenta

---

## 12. DISPOSICIONES GENERALES

### 12.1. Modificaciones

Este Reglamento puede ser modificado en cualquier momento. Las modificaciones entrarán en vigor desde su publicación en la Plataforma.

### 12.2. Ley Aplicable

Este Reglamento se rige por las leyes de la República del Paraguay.

### 12.3. Integración

Este Reglamento forma parte integrante de los Términos y Condiciones de la Plataforma.

---

## 13. CONTACTO

Para consultas sobre este Reglamento:

**Mercadito Online PY - Soporte de Subastas**
- Email: [EMAIL DE SOPORTE]
- Teléfono: [TELÉFONO]

---

**Última actualización:** [FECHA]

**Versión:** 1.0

---

Para consultas sobre este Reglamento de Subastas, contacte a: [EMAIL DE SOPORTE]













