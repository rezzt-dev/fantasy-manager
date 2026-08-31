# Textos de la ficha

Listos para copiar y pegar. Asumen que ya has quitado la marca del nombre según
[00-antes-de-empezar.md](00-antes-de-empezar.md).

## Nombre

```
Fantasy Manager Connector
```

Chrome permite 75 caracteres; AMO, 50. Este cabe en los dos.

## Descripción corta (Chrome, máx. 132 caracteres)

```
Conecta Fantasy Manager con tu cuenta de fantasy oficial. Sin copiar tokens ni abrir la consola del navegador.
```

108 caracteres.

## Descripción larga

```
Herramienta no oficial. No está afiliada, asociada ni respaldada por LaLiga ni por ninguna de sus marcas.

Fantasy Manager es una aplicación web para analizar y optimizar tu equipo de fantasy. Para leer tus datos necesita un token de acceso de tu cuenta oficial, y hasta ahora la única forma de obtenerlo era abrir las herramientas de desarrollo del navegador y copiarlo a mano de la consola.

Este conector elimina ese paso.

CÓMO FUNCIONA

1. En Fantasy Manager pulsas "Entrar con Google".
2. Se abre la página de login oficial. Inicias sesión ahí, como siempre.
3. La ventana se cierra sola y ya estás dentro.

POR QUÉ HACE FALTA UNA EXTENSIÓN

El login oficial termina redirigiendo a una dirección de aplicación nativa
(authredirect://) que ninguna página web puede recibir. Una extensión sí puede
completar ese último paso. Es la única forma de ofrecer un inicio de sesión de
un clic desde el navegador, y la única que funciona con cuentas creadas con
Google, que no admiten el login por email y contraseña.

QUÉ NO HACE

- No ve tu contraseña: la tecleas en la página oficial, no aquí.
- No se activa en ninguna web salvo la pantalla de login oficial y Fantasy Manager.
- No recopila estadísticas, no tiene analítica y no envía datos a terceros.
- No almacena tu token: lo entrega a Fantasy Manager y lo olvida.

El código es público y auditable (licencia propietaria, todos los derechos
reservados). Puedes leerlo entero en:
https://github.com/rezzt-dev/fantasy-manager/tree/main/extension
```

## Justificación de permisos

Un campo por permiso en el formulario de Chrome. Copiar tal cual.

### `webRequest`

```
El inicio de sesión oficial termina con una redirección a una URL de esquema nativo (authredirect://), que el navegador no puede abrir. La extensión observa esa redirección para recuperar el código de autorización de OAuth y canjearlo por un token.

El uso es exclusivamente observacional: se escucha el evento onBeforeRedirect y no se bloquea, cancela ni modifica ninguna petición. El listener está filtrado a un único dominio, el del proveedor de identidad del login oficial.
```

### `tabs`

```
Para abrir la ventana emergente donde el usuario inicia sesión, cerrarla cuando termina, y entregar el resultado a la pestaña concreta de Fantasy Manager que solicitó el inicio de sesión. No se lee el contenido de ninguna pestaña ni se consulta el historial.
```

### `storage`

```
Para conservar el code_verifier de PKCE y el parámetro state mientras dura el inicio de sesión. Se usa storage.session, que vive en memoria y se borra al cerrar el navegador. Es necesario porque el service worker de Manifest V3 se detiene tras 30 segundos de inactividad y el usuario puede tardar varios minutos en completar el login.
```

### Permisos de host

```
login.laliga.es: es el proveedor de identidad del login oficial. Se necesita para observar la redirección final y para hacer la petición de canje del código por el token.

El dominio de Fantasy Manager: se necesita para inyectar el script puente que comunica la aplicación web con la extensión. Es la aplicación del mismo desarrollador y el único destinatario del token.

No se solicita acceso a ningún otro sitio.
```

### Propósito único (Chrome lo pregunta aparte)

```
Completar el flujo de inicio de sesión OAuth de la liga fantasy oficial y entregar el token resultante a la aplicación web Fantasy Manager, del mismo desarrollador.
```

## Instrucciones para quien revisa

Para el campo *test instructions* de Chrome y *Notes for reviewers* de Firefox.
**Sustituye las credenciales antes de enviar.**

```
La extensión no tiene interfaz propia más allá de un popup informativo. Toda su
función se dispara desde la aplicación web del mismo desarrollador.

Cuenta de prueba de la liga fantasy oficial:
  Usuario:    [PENDIENTE: email de la cuenta de prueba]
  Contraseña: [PENDIENTE: contraseña de la cuenta de prueba]

Es una cuenta de email y contraseña, no federada, para que podáis entrar sin
depender de un segundo factor.

Pasos:

1. Instalad la extensión.
2. Abrid https://fantasy-manager-mauve.vercel.app/login
3. Pulsad el botón "Entrar con Google" de la parte superior.
   (El botón sólo aparece si la extensión está instalada; si veis un botón que
   lleva a una página de instalación, la extensión no se ha cargado.)
4. Se abre una ventana con el login oficial de LaLiga. Introducid ahí las
   credenciales de arriba. También podéis usar el botón de Google de esa
   pantalla con cualquier cuenta de Google que tenga la app oficial.
5. La ventana se cierra sola y la aplicación entra al panel con los datos del
   equipo.

Qué observaréis en el tráfico de red:
- Una navegación a login.laliga.es (el login oficial, no nuestro).
- Una redirección a authredirect://com.lfp.laligafantasy?code=... que el
  navegador no puede abrir. Es la que la extensión intercepta.
- Un POST a login.laliga.es/.../oauth2/v2.0/token con el code y el
  code_verifier de PKCE, que devuelve el token.
- El token viaja a la aplicación web y se guarda en una sesión httpOnly del
  servidor. La extensión no lo conserva.

Notas:
- Es una herramienta no oficial, sin relación con LaLiga. Usa el cliente
  público de OAuth de su aplicación, sin secretos de cliente.
- Todo el código es JavaScript plano, sin minificar ni empaquetar:
  https://github.com/rezzt-dev/fantasy-manager/tree/main/extension
```

## Categoría, licencia y etiquetas

| Campo | Chrome | Firefox |
|---|---|---|
| Categoría | `Tools` | `Other` |
| Licencia | (no se pide) | `All Rights Reserved` |
| Etiquetas | fantasy, futbol, oauth, login | fantasy, football, login |
| Idioma | Español | Español |

El porqué de cada una, y la lista completa de categorías de las dos tiendas, en
[07-licencia-y-categorias.md](07-licencia-y-categorias.md).
