# i.Solar personalizada — versión definitiva para Netlify

Aplicación web de solo lectura para iniciar sesión con una cuenta i.Solar/Tumcapp, listar todos los equipos asociados y mostrar sus datos en tiempo real.

## Incluye

- Frontend móvil en `public/`.
- Backend serverless en `netlify/functions/`.
- Login con contraseña convertida a MD5, tal como la aplicación original.
- Cálculo dinámico de `vrt` reproducido desde i.Solar 2.4.0.
- Sesión cifrada en cookie HttpOnly.
- Lista paginada de todos los equipos de la cuenta.
- Panel por equipo y actualización automática cada 15 segundos.
- Endpoint de diagnóstico: `/api/health`.

## Estructura que debe verse en la raíz de GitHub

```text
netlify.toml
package.json
README.md
public/
netlify/
tests/
```

## Publicación

1. Subir el contenido descomprimido a un repositorio GitHub.
2. En Netlify: **Add new project → Import an existing project → GitHub**.
3. Elegir el repositorio.
4. Netlify leerá automáticamente `netlify.toml`:
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
5. Publicar.
6. Recomendado: crear la variable `SESSION_SECRET` con un texto largo aleatorio.
7. Abrir primero `https://TU-SITIO.netlify.app/api/health`. Debe responder `ok: true`.
8. Luego abrir la raíz del sitio e iniciar sesión.

## Pruebas locales

```bash
npm test
```

Estas pruebas no contienen credenciales, tokens ni números de serie reales.

## Alcance

Esta versión es de solo lectura. No incluye `paramSet/setParam`, para impedir cambios accidentales en la configuración del inversor.
