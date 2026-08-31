# Chrome Web Store

Sirve para Chrome, Edge, Brave, Opera y cualquier Chromium. (Edge tiene su
propia tienda; no hace falta para que la extensión funcione en Edge si el
usuario la instala desde la de Chrome.)

## 1. Alta de desarrollador

1. Entra en el [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   con la cuenta de Google que vaya a ser dueña de la extensión. **Elige bien**:
   mover una extensión de cuenta después es un trámite manual con Google.
2. Paga la cuota única de **5 USD**. Es un pago de por vida, no una
   suscripción, y da derecho a publicar hasta 20 extensiones.
3. Verifica el email de contacto. Sin él no se puede publicar.

> Si vas a usar `juangarciacazallas.dev@gmail.com`, ten en cuenta que ese email
> aparecerá públicamente en la ficha si marcas "mostrar email de contacto".

## 2. Preparar el paquete

```bash
./agent-docs/publicacion-extension/empaquetar.sh
# → dist-extension/chrome.zip
```

El zip debe contener el `manifest.json` **en la raíz**, no dentro de una
subcarpeta. El script ya lo hace bien; si empaquetas a mano, comprueba:

```bash
unzip -l dist-extension/chrome.zip | head
# la primera entrada tiene que ser manifest.json, no extension/manifest.json
```

## 3. Crear el item y subir

1. Dashboard → **Add new item** → arrastra `chrome.zip`.
2. Rellena la pestaña **Store listing** con los textos de
   [03-textos-de-la-ficha.md](03-textos-de-la-ficha.md).
   - Categoría sugerida: **Tools**. Chrome renovó su taxonomía y ya no existen
     *Productivity* ni *Sports*; la lista actual está en
     [07-licencia-y-categorias.md](07-licencia-y-categorias.md).
   - Idioma principal: **Español**. Puedes añadir inglés después.
3. Sube el material gráfico de [05-material-grafico.md](05-material-grafico.md).
4. **Visibilidad**: en la pestaña *Distribution*, elige **Unlisted** si sigues
   la recomendación de [00-antes-de-empezar.md](00-antes-de-empezar.md).

## 4. Privacy practices — la parte que decide la revisión

Es la pestaña que más rechazos genera. Hay que ser exacto y no maquillar nada.

### Propósito único

Chrome exige que la extensión tenga **un solo propósito**. El nuestro lo tiene
y hay que declararlo así:

> Completar el inicio de sesión OAuth de la liga fantasy oficial y entregar el
> resultado a la aplicación web Fantasy Manager del mismo desarrollador.

### Justificación de cada permiso

Hay un campo de texto por permiso. Todos son obligatorios y todos se leen.
Están redactados en
[03-textos-de-la-ficha.md](03-textos-de-la-ficha.md#justificación-de-permisos).

Los que atraen revisión manual son `webRequest` y los `host_permissions`. La
justificación tiene que dejar claro que el uso es **observacional** (no se
bloquea ni se modifica tráfico) y que está acotado a un único dominio.

### Declaración de uso de datos

Marca **exactamente** esto y nada más:

| Categoría | ¿Se recopila? |
|---|---|
| Información de autenticación | **Sí** |
| Información personal identificable | No |
| Información de salud | No |
| Información financiera | No |
| Comunicaciones personales | No |
| Localización | No |
| Historial de navegación | No |
| Actividad del usuario | No |
| Contenido de sitios web | No |

Sí a "información de autenticación" porque el token pasa por la extensión,
aunque no se almacene. Ocultarlo sería falsear la declaración, que es causa de
retirada.

Después hay que certificar las tres casillas:

- [x] No vendo ni transfiero los datos a terceros salvo en los casos aprobados
- [x] No uso ni transfiero los datos para fines ajenos a la funcionalidad
      principal
- [x] No uso ni transfiero los datos para determinar solvencia ni para préstamos

Las tres son ciertas en este caso.

### URL de la política de privacidad

Obligatoria porque se declara recopilación de datos. Publica el contenido de
[04-politica-de-privacidad.md](04-politica-de-privacidad.md) en una URL fija —
lo más cómodo es una página más en tu Astro, por ejemplo
`https://fantasy-manager-mauve.vercel.app/privacidad`.

## 5. Instrucciones para el revisor

En **Privacy practices → test instructions**, pega el bloque de
[03-textos-de-la-ficha.md](03-textos-de-la-ficha.md#instrucciones-para-quien-revisa)
con las credenciales de la cuenta de prueba. Sin esto el rechazo es casi seguro
(ver [00-antes-de-empezar.md](00-antes-de-empezar.md#3-cuenta-de-prueba-para-el-revisor)).

## 6. Enviar

**Submit for review**. A partir de ahí:

- Lo normal es entre unas horas y 3 días.
- Puede irse a semanas si salta revisión manual por los permisos.
- Si te rechazan, recibes el motivo por email con un código de política. Se
  corrige y se reenvía; los reenvíos suelen ir más rápido.

Rechazos típicos para una extensión como esta y su arreglo:

| Motivo | Arreglo |
|---|---|
| Trademark / impersonation | Quitar la marca del nombre e iconos ([00](00-antes-de-empezar.md)) |
| No se pudo probar la funcionalidad | Añadir credenciales de prueba |
| Permisos excesivos | Recortar `host_permissions`; nunca uses `<all_urls>` |
| Descripción engañosa | Que la descripción diga exactamente lo que hace |
| Falta política de privacidad | Publicar la URL y enlazarla |

## 7. Después de publicar

El enlace queda como
`https://chromewebstore.google.com/detail/<nombre>/<id-de-32-letras>`.

Ese `<id>` es fijo de por vida. Ponlo en
[src/pages/extension.astro](../../src/pages/extension.astro) sustituyendo las
instrucciones de instalación manual.

Con la extensión instalada desde la tienda, el ID también es fijo, lo cual
permitiría usar `externally_connectable` en vez del puente por `postMessage`.
No hace falta cambiarlo: el puente actual funciona igual y además sigue
sirviendo para la instalación descomprimida en desarrollo.
