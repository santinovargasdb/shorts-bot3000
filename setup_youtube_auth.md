# Configurar la subida automática a YouTube (gratis)

Una sola vez. Después, subir es un comando.

## 1. Crear el proyecto y activar la API
1. Entrá a <https://console.cloud.google.com/> con la cuenta de Google del **canal**.
2. Creá un proyecto nuevo (arriba a la izquierda → "Nuevo proyecto").
3. Menú → **APIs y servicios → Biblioteca** → buscá **YouTube Data API v3** → **Habilitar**.

## 2. Pantalla de consentimiento OAuth
1. **APIs y servicios → Pantalla de consentimiento de OAuth**.
2. Tipo de usuario: **Externo** → Crear.
3. Completá nombre de app y correo. Guardá.
4. En **Usuarios de prueba**, agregá el correo de tu cuenta de YouTube.
   (Mientras la app esté "en pruebas", solo esos correos pueden autorizar. Es suficiente.)

## 3. Crear las credenciales OAuth
1. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**.
2. Tipo de aplicación: **Aplicación de escritorio**.
3. Descargá el JSON y guardalo en este proyecto como:
   ```
   secrets/client_secret.json
   ```

## 4. Primera autorización
Corré una subida de prueba (privada):
```bash
python -m uploaders.youtube_upload "output/streamers/test_source_clip01.mp4" private
```
- Se abre el navegador → elegí la cuenta del canal → **Permitir**.
- Se guarda `secrets/token.json` (login recordado; no vuelve a pedir).
- El video queda **privado** por defecto. Cambiá a `unlisted` o `public` cuando quieras.

## Notas
- **Límite de cuota:** la API gratis da ~6 subidas/día por proyecto (cada subida "cuesta" 1600 de 10000 unidades). Para más volumen, creá un proyecto por canal.
- `secrets/` está en `.gitignore`: tus credenciales nunca se suben a git.
- Videos < 60s con formato vertical se publican como **Shorts** automáticamente.
