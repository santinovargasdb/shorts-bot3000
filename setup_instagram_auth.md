# Configurar la subida automática a Instagram Reels (gratis)

Instagram es más burocrático que YouTube. Dos requisitos clave:
1. La cuenta debe ser **Profesional (Creador o Empresa)** y estar **vinculada a una Página de Facebook**.
2. La Graph API **no sube archivos**: necesita una **URL pública** del `.mp4` (ella lo descarga).

## 1. Preparar la cuenta
1. En la app de Instagram: **Configuración → Tipo de cuenta → cambiar a Profesional**.
2. En Facebook, creá una **Página** (gratis) y vinculá tu Instagram a esa Página
   (Configuración de la Página → Cuentas vinculadas → Instagram).

## 2. Crear la app de Meta y el token
1. Entrá a <https://developers.facebook.com/> → **Mis apps → Crear app** → tipo "Empresa".
2. Agregá el producto **Instagram Graph API**.
3. En el **Explorador de la Graph API**, generá un token con estos permisos:
   `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`, `pages_show_list`.
4. Conseguí tu **IG_USER_ID**: en el Explorador, llamá a `me/accounts` → tomá el `id` de la
   Página → luego `{page-id}?fields=instagram_business_account`.
5. Convertí el token corto en uno de **larga duración** (60 días) con el endpoint
   `oauth/access_token?grant_type=fb_exchange_token`.

## 3. Guardar credenciales
Copiá `.env.example` a `.env` y completá:
```
IG_USER_ID=1784xxxxxxxxxxx
IG_ACCESS_TOKEN=EAAG...token_largo...
```

## 4. Hostear el video (URL pública)
La API necesita `video_url` accesible desde internet. Opciones gratis:
- **GitHub Releases**: subís el mp4 a un release y usás el enlace directo.
- **Cloudflare R2 / Backblaze B2**: capa gratuita generosa, das el enlace público.
- **Túnel temporal**: servís la carpeta `output/` y la exponés con un túnel (cloudflared).

## 5. Publicar
```bash
python -m uploaders.instagram_upload "https://tu-host.com/clip01.mp4" "Mi caption #shorts #viral"
```

## Notas
- Límite oficial: **50 publicaciones cada 24 h** vía API (más que suficiente).
- El token de larga duración dura 60 días; hay que renovarlo (se puede automatizar).
- Si Instagram no te deja publicar por API todavía, publicá manual mientras resolvés
  la app de Meta; el motor igual te deja los `.mp4` listos.
