# Torti Control — corrección de cierre diario

Esta versión conserva los datos en el navegador (localStorage). No incluye Firebase ni sincronización entre equipos.

- El cambio de jornada se comprueba al abrir, volver a la app y cada 30 segundos mientras está abierta.
- Se conserva el saldo de cada tienda y los kilos de ayer.
- Se archiva la jornada anterior bajo su fecha y se reinician ventas, gastos, producción y contadores diarios.
- Se conserva un historial diario local para reportes sencillos.
- Si la instalación anterior no tenía fecha guardada, la primera carga preserva sus datos en lugar de asumir un cierre.
- El historial y los datos siguen vinculados al dispositivo/navegador; borrar los datos del navegador puede eliminarlos.
- Para distribución comercial hace falta una base de datos, autenticación, pruebas y respaldo.

Para ejecutar: `npm ci`, `npm run build`. Para Android se requiere configurar Capacitor y compilar en Android Studio.
