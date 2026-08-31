# Política de privacidad

Chrome la exige por declarar recopilación de "información de autenticación". Hay
que publicarla en una **URL pública y estable** antes de enviar la extensión.

Lo más cómodo: crear `src/pages/privacidad.astro` copiando la estructura de
[extension.astro](../../src/pages/extension.astro), y pegar la URL resultante
(`https://fantasy-manager-mauve.vercel.app/privacidad`) en los dos formularios.

Un README de GitHub también vale, pero una página propia da mejor impresión en
la revisión.

---

## Texto publicable

> **Política de privacidad — Fantasy Manager Connector**
>
> Última actualización: 31 de agosto de 2026
>
> Fantasy Manager Connector es una extensión de navegador de código público y
> auditable cuyo único fin es completar el inicio de sesión de la liga fantasy oficial y
> entregar el token resultante a la aplicación web Fantasy Manager.
>
> **Qué datos se tratan**
>
> La extensión maneja un único dato: el token de acceso OAuth que devuelve el
> proveedor de identidad oficial al terminar el inicio de sesión. Es
> información de autenticación.
>
> Durante el inicio de sesión también se guardan temporalmente dos valores
> técnicos —el `code_verifier` de PKCE y el parámetro `state`— necesarios para
> garantizar que la respuesta corresponde a la petición que la originó.
>
> **Qué se hace con ellos**
>
> El token se transmite directamente desde la extensión a la aplicación web
> Fantasy Manager, en la pestaña desde la que el usuario inició el proceso.
> Allí se guarda en una sesión de servidor con cookie `httpOnly`.
>
> La extensión no conserva el token. Los valores técnicos se guardan en
> `storage.session`, que reside en memoria y se borra al cerrar el navegador o
> al terminar el proceso.
>
> **Qué NO se hace**
>
> - No se recopila la contraseña del usuario. La introduce directamente en la
>   página de login oficial, a la que la extensión no tiene acceso.
> - No se venden ni se transfieren datos a terceros.
> - No hay analítica, telemetría, publicidad ni seguimiento de ningún tipo.
> - No se leen ni el historial de navegación ni el contenido de otras webs.
> - No se usan los datos para fines ajenos a la funcionalidad descrita.
> - No se usan los datos para determinar solvencia ni para conceder préstamos.
>
> **Dónde actúa la extensión**
>
> Únicamente en dos sitios, declarados en su manifiesto:
>
> - `login.laliga.es`, el proveedor de identidad del inicio de sesión oficial.
> - El dominio de la aplicación Fantasy Manager.
>
> En cualquier otra web la extensión permanece inactiva.
>
> **Conservación y eliminación**
>
> La extensión no mantiene almacenamiento persistente. Desinstalarla elimina
> cualquier resto. Para cerrar la sesión en la aplicación web, basta con usar
> su propia opción de cerrar sesión, que destruye la sesión de servidor.
>
> **Código fuente**
>
> Todo el código es público y auditable:
> https://github.com/rezzt-dev/fantasy-manager/tree/main/extension
>
> **Independencia**
>
> Esta extensión es una herramienta no oficial. No está afiliada, asociada ni
> respaldada por LaLiga ni por ninguna de sus marcas.
>
> **Contacto**
>
> [PENDIENTE: email de contacto]

---

## Coherencia con lo declarado en las tiendas

Los tres documentos tienen que decir lo mismo. Una discrepancia entre la
política y el formulario es motivo de retirada.

| Declaración | Chrome | Firefox | Esta política |
|---|---|---|---|
| Información de autenticación | Sí | `authenticationInfo` | Sí, el token OAuth |
| Todo lo demás | No | — | "Qué NO se hace" |
| Venta a terceros | No | — | No |
| Uso ajeno a la funcionalidad | No | — | No |
