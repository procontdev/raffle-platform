# OBS Live Display

La ruta pública `/live/:slug` es una pantalla 16:9 apta para capturar como Browser Source en OBS. No requiere autenticación y solo muestra nombre del sorteo, premio, conteos agregados, ticket ganador y enlace de verificación.

El modo ensayo se activa con `/live/:slug?demo=1`. Este modo solo anima la interfaz local; no ejecuta un draw ni persiste resultados.

El control room emite estados Socket.IO en el namespace `/live` y la pantalla se suscribe al room `raffle:<raffleId>`. Los estados son `LIVE_RESET`, `LIVE_READY`, `LIVE_COUNTDOWN`, `LIVE_DRAWING` y `LIVE_WINNER`. La API valida la organización del operador y construye el payload de ganador sin email, teléfono ni `passwordHash`.

Configuración típica de OBS: agregar Browser Source, apuntar a `http://localhost:3000/live/<slug>`, usar 1920x1080 y desactivar “Shutdown source when not visible” si se desea conservar la conexión.
