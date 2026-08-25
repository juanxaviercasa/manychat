# Variables de entorno de Mi ManyChat

La plataforma funciona inmediatamente con datos demo: conversaciones, webhooks, ejecuciones y conexiones se simulan localmente. No se realizan llamadas a proveedores externos mientras se mantiene el modo demo.

| Variable | Uso | Estado inicial |
|---|---|---|
| `META_APP_ID` / `META_APP_SECRET` | Integración Instagram/Facebook | Placeholder |
| `META_WEBHOOK_VERIFY_TOKEN` | Verificación de webhooks de Meta | Placeholder |
| `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` | WhatsApp mediante Evolution API | Placeholder |
| `SMTP_HOST` / `SMTP_PORT` | Servidor SMTP | Placeholder |
| `SMTP_USER` / `SMTP_PASSWORD` | Autenticación SMTP | Placeholder seguro |
| `RESEND_API_KEY` | Email transaccional | Placeholder seguro |
| `DATABASE_URL` | Persistencia de datos | Configurada por entorno |
| `REDIS_URL` | Cola, rate limiting y reintentos | Placeholder |
| `DEMO_MODE` | Aísla pruebas de servicios reales | `true` |

Las credenciales reales deben configurarse en el gestor de secretos del entorno al conectar un canal de producción. Nunca se deben introducir dentro del código del frontend ni en el repositorio.
