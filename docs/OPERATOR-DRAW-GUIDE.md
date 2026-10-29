# Guía del operador

1. Inicia sesión y crea o abre un sorteo.
2. Registra participantes y agrega tickets manualmente o importa el CSV documentado en la pantalla.
3. Revisa los tickets pendientes y valida o rechaza cada uno.
4. Abre `/live/<slug>?demo=1` para comprobar la escena OBS sin tocar datos.
5. Cuando la lista esté completa, pulsa **Cerrar lista**. El backend genera el snapshot y el commitment.
6. Abre la pantalla pública `/live/<slug>` y pulsa **Ejecutar sorteo** desde el control room.
7. Comparte el enlace `/verify/<drawId>` mostrado en la escena para que cualquier persona pueda recalcular y verificar el resultado.

El modo ensayo no crea `DrawSession` ni `DrawResult`. El sorteo real usa `algorithmVersion v1`, snapshot comprometido y rejection sampling determinista. La confidencialidad pre-sorteo del seed depende de la seguridad de la base de datos y del operador.
