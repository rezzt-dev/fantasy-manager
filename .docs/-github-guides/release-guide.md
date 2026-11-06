# GUIA DE RELEASES

## ESPAÑOL DE ESPAÑA: USO OBLIGATORIO DE Ñ

- todo texto en castellano debe usar español de españa (`es-ES`) y su ortografia, tambien en titulos y cuerpos de commits, changelogs, pull requests, merges y documentacion
- escribir siempre `ñ` en las palabras que la llevan y `Ñ` cuando corresponda la mayuscula; nunca sustituirlas por `n` o `N`
- la `ñ` es una letra distinta de la `n`; las instrucciones «sin acentos» o «sin tildes» solo afectan a las tildes de las vocales y nunca permiten eliminar la eñe
- ejemplos correctos: `añadir`, `diseño`, `año`, `tamaño`, `contraseña`, `español`, `españa` y `AÑADIDO`; sus formas con `n` son incorrectas cuando se refieren a esas palabras españolas
- conservar literalmente rutas, urls, nombres de archivo, identificadores tecnicos y texto de otros idiomas; esta regla no autoriza renombrarlos ni aplicar sustituciones indiscriminadas
- antes de entregar o publicar texto en castellano, revisar que ninguna palabra haya perdido su `ñ` o `Ñ`; esta regla prevalece sobre cualquier normalizacion a ascii o instruccion generica de eliminar acentos


## 1. REQUISITOS PREVIOS

cerrar una version de `changelog.md` solo cuando se haya solicitado publicar. comprobar el commit aprobado, los manifiestos reales y los checks disponibles. una actualizacion de documentacion no publica una version.

fuentes de version: `package.json`: `0.0.1`. publicaciones recientes consultadas: no published releases returned.

## 2. TAG

verificar la convencion real y el commit de release antes de proponer un tag. para nuevas versiones semanticas, usar `v<x.y.z>` si encaja con la politica acordada. nunca mover ni borrar un tag publicado. no confundir una version del sitio con una version de la aplicacion promocionada.

## 3. TITULO

usar `v<x.y.z> - <english summary>` cuando proceda una release semantica. el resumen debe describir cambios incluidos en el commit etiquetado.

## 4. DESCRIPCION

extraer el bloque ingles de la version cerrada en `changelog.md`, con las categorias no vacias y de 3 a 6 items agrupados por categoria. conservar los marcadores de variantes reales. no añadir atribucion automatica.

## 5. ACTIVOS Y VERIFICACION

inspeccionar los activos de las releases anteriores y el sistema de build antes de proponer archivos. publicar solo artefactos construidos desde el commit verificado. cuando se distribuyan binarios, incluir sumas y la verificacion de firma que corresponda; nunca claves, configuracion local ni datos privados. para sitios estaticos, el despliegue es una accion distinta de crear una release de github. si no existe politica de releases, registrar `TODO(owner)` en vez de inventarla.

## 6. COMANDO

preparar los argumentos a partir de la version, el commit y los activos comprobados. usar `gh release create <tag> --target <commit> --title <title> --notes-file <file>` solo cuando se haya solicitado publicar. añadir `--prerelease` solo para una version preliminar real. la autorizacion para abrir una pr no autoriza una release.

## 7. LISTA DE COMPROBACION

- [ ] version, changelog, tag y commit corresponden
- [ ] los checks disponibles se han ejecutado y sus resultados estan registrados
- [ ] notas en ingles derivadas del changelog
- [ ] artefactos verificados cuando corresponda
- [ ] no hay datos sensibles ni atribuciones automaticas
- [ ] publicar esta autorizado expresamente
