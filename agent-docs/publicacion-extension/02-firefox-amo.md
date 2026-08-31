# Firefox (addons.mozilla.org)

Gratis y sin cuota. La diferencia importante con Chrome es que Firefox **firma**
las extensiones: sin firma, Firefox estable no instala nada permanentemente.

## 1. Alta

1. Crea una cuenta en [addons.mozilla.org](https://addons.mozilla.org/developers/).
2. No hay pago ni verificación de identidad.

## 2. Elegir canal

Al subir la versión, Mozilla pregunta cómo se distribuye. La decisión es más
consecuente que en Chrome:

| | **En AMO (listada)** | **Autodistribuida (unlisted)** |
|---|---|---|
| Quién la aloja | Mozilla | Tú |
| Revisión | Humana, puede tardar días | Automática, minutos |
| Resultado | Ficha pública en AMO | Te descargas un `.xpi` firmado |
| Actualizaciones | Automáticas vía AMO | Tienes que montar un `update_url` |
| Instalación | Un clic desde AMO | El usuario abre el `.xpi` |

**Recomendación: autodistribuida**, en coherencia con
[00-antes-de-empezar.md](00-antes-de-empezar.md). Sirves el `.xpi` desde tu
propio dominio y evitas la revisión humana y la exposición de marca.

Si eliges autodistribuida y quieres actualizaciones automáticas, hace falta:

```jsonc
// en manifest.firefox.json, dentro de browser_specific_settings.gecko
"update_url": "https://fantasy-manager-mauve.vercel.app/updates.json"
```

y servir un `updates.json` con esta forma:

```json
{
  "addons": {
    "fantasy-manager@rezzt.dev": {
      "updates": [
        { "version": "1.0.1", "update_link": "https://fantasy-manager-mauve.vercel.app/conector-1.0.1.xpi" }
      ]
    }
  }
}
```

Sin `update_url`, el usuario tiene que reinstalar a mano cada versión.

## 3. El ID del add-on

Firefox exige un ID estable, ya está puesto:

```json
"browser_specific_settings": { "gecko": { "id": "fantasy-manager@rezzt.dev" } }
```

**No lo cambies nunca.** Cambiarlo convierte la extensión en otra distinta:
los usuarios no reciben la actualización y acaban con dos instaladas.

## 4. Pasar el linter antes de subir

Esto ahorra ciclos de rechazo. Es el mismo validador que ejecuta AMO:

```bash
# desde la raíz del repo
rm -rf /tmp/fx-lint && mkdir -p /tmp/fx-lint
cp -r extension/* /tmp/fx-lint/
cp /tmp/fx-lint/manifest.firefox.json /tmp/fx-lint/manifest.json
rm /tmp/fx-lint/manifest.firefox.json
pnpm dlx web-ext lint --source-dir /tmp/fx-lint --self-hosted
```

Estado actual verificado: **0 errores, 0 notices, 1 aviso.**

El aviso que queda es `KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION` y es
correcto dejarlo: dice que `data_collection_permissions` necesita Firefox para
Android 142 y nosotros declaramos 140 como mínimo. No se toca porque **la
extensión no funciona en Android de todos modos**: usa `windows.create`, que en
Firefox para Android no existe. Subir el mínimo de Android sólo para callar el
aviso sería declarar una compatibilidad falsa. Los avisos no bloquean el envío.

## 5. Particularidades de Firefox ya resueltas

Están hechas, pero conviene saber por qué, porque si tocas el código puedes
romperlas:

| Asunto | Cómo está resuelto |
|---|---|
| MV3 no tiene `service_worker` en Firefox | `manifest.firefox.json` usa `background.scripts` (event page). Verificado: el linter lo acepta junto a `"type": "module"`. |
| `chrome.*` en Firefox es de **callbacks** | Todo el código usa el alias `api = globalThis.browser ?? globalThis.chrome` (ver [config.js](../../extension/src/config.js)). Sin eso, cada `await` devolvería `undefined`. |
| `data_collection_permissions` | Obligatorio para add-ons nuevos. Declarado `authenticationInfo`, en coherencia con lo que se declara en Chrome. |
| Versión mínima | `140.0`, que es la primera que soporta la clave anterior. |

## 6. Subir

1. Developer Hub → **Submit a New Add-on**.
2. Elige el canal del punto 2.
3. Sube `dist-extension/firefox.zip` (lo genera
   [empaquetar.sh](empaquetar.sh), que ya coloca el manifest correcto).
4. **Notes for reviewers**: pega el bloque de
   [03-textos-de-la-ficha.md](03-textos-de-la-ficha.md#instrucciones-para-quien-revisa),
   con las credenciales de la cuenta de prueba.
5. **Código fuente**: AMO lo exige sólo si el código está minificado,
   ofuscado o generado por un empaquetador. El nuestro es JavaScript plano, así
   que **no hace falta**. Si algún día metes un bundler, tendrás que subir las
   fuentes y las instrucciones de compilación.

## 7. Tras la aprobación

- **Autodistribuida**: te descargas el `.xpi` firmado. Súbelo a `public/` de la
  web y enlázalo desde [extension.astro](../../src/pages/extension.astro).
- **Listada**: queda en `https://addons.mozilla.org/firefox/addon/<slug>/`.

Firefox no permite instalar un `.xpi` sin firmar en la versión estable, así que
el flujo de "cargar complemento temporal" del README de la extensión sigue
siendo sólo para desarrollo: se pierde al cerrar el navegador.
