# Operación persistente de Mi ManyChat

La aplicación almacena workflows, contactos, conversaciones, mensajes y ejecuciones por `ownerId`. Cada procedimiento protegido limita las consultas y mutaciones a la identidad autenticada; solo el rol `admin` puede consultar la lista de miembros o cambiar sus roles.

## Protección de campañas

Las acciones de prueba y envío pasan por un límite distribuido en Upstash Redis. El límite combina una ventana por usuario/canal y otra más estricta por contacto/canal. Si Redis no está configurado, la lógica devuelve un estado explícito de protección no configurada; los envíos productivos deben permanecer deshabilitados hasta completar la configuración.

Las variables requeridas son `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`. Ambas se usan exclusivamente en el servidor. No se deben copiar en el navegador, un repositorio o archivos de código.

## Clasificación omnicanal con IA

El procedimiento `automation.inbox.classifyIncoming` registra el mensaje entrante y usa el modelo `gpt-5-mini` en el servidor para clasificar la intención en una de estas categorías: `informacion`, `precio`, `reserva`, `soporte`, `queja`, `venta`, `baja` u `otro`.

La respuesta se valida con JSON estructurado, incluye una confianza entre 0 y 100 y marca los casos que requieren revisión humana. Ante un fallo del proveedor, se guarda el resultado conservador `otro` con escalamiento manual en vez de tomar una acción automática.

## Exportación

El panel operativo permite exportar los contactos filtrados y el resumen de métricas del dashboard como CSV UTF-8. Los campos se entrecomillan y escapan para conservar comas y comillas de manera compatible con Excel, Google Sheets y herramientas similares.
