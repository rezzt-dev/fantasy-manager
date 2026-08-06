# informacion general del proyecto

## que es este proyecto

**laliga fantasy manager** es una aplicacion web creada para ayudar a jugadores de **laliga fantasy** (el juego oficial de la liga gestionado por relevo) a llevar su equipo de forma mas inteligente. la aplicacion no es oficial: no esta afiliada ni patrocinada por laliga ni por laliga fantasy, pero usa los mismos datos que el juego para ofrecer una vision mucho mas completa y util de tu equipo.

la idea principal es sencilla: en lugar de mirar decenas de pantallas dentro del juego oficial, aqui tienes todo en un solo panel, con analisis, graficos y recomendaciones automaticas que te dicen que hacer en cada jornada.

## que hace la aplicacion

la aplicacion se conecta con tu cuenta de laliga fantasy, lee tus ligas, tu equipo, el mercado y los equipos de tus rivales, y a partir de ahi te ofrece ayuda en varios frentes:

- **recomendaciones de mercado**: te dice que jugadores merece la pena comprar y cuales deberias vender, segun su precio, sus puntos esperados y las noticias recientes.
- **mejor alineacion**: calcula la formacion y el once inicial que maximiza tus puntos esperados para la jornada, teniendo en cuenta lesiones, sanciones y suplencias.
- **eleccion de capitan**: analiza tus titulares disponibles y te propone al jugador con mas opciones de puntuar alto.
- **clausulas y blindajes**: detecta que jugadores tuyos estan en riesgo de que te los roben por clausula y te recomienda si conviene subirla o blindarlos.
- **analisis de rivales**: puedes ver la plantilla de cada miembro de tu liga, quien tiene a cada jugador, su dinero y sus debilidades.
- **clausulazos**: cruza tu presupuesto con las plantillas rivales para encontrar jugadores desprotegidos que podrian mejorar tu once de inmediato.
- **estadisticas de la liga**: graficos y tablas con la evolucion del valor de los equipos, distribucion por posiciones, clasificacion, riesgo de clausulas y comparativa entre managers.
- **noticias en tiempo real**: lee canales rss de prensa deportiva (marca, as, mundo deportivo, sport, 20 minutos) y las asocia a jugadores de laliga, avisandote de lesiones, sanciones, dudas medicas o rotaciones.

## para quien es

esta pensado para jugadores de laliga fantasy que:

- juegan en ligas privadas con amigos y quieren sacar ventaja.
- quieren dejar de perder puntos por dejarse jugadores lesionados o suplentes en el once.
- quieren entender mejor el mercado y no malgastar el dinero.
- disfrutan viendo datos y estadisticas de su liga.

## como funciona por dentro (sin entrar en detalle tecnico)

el flujo de uso es muy parecido a entrar en cualquier web:

1. **inicio de sesion**: te identificas con tu cuenta de laliga fantasy. puedes hacerlo con tu email y contrasena, o pegando un codigo (token) que obtienes de la propia web oficial, algo util si tu cuenta esta vinculada con google.
2. **eleccion de liga**: si participas en varias ligas, eliges cual quieres analizar. cada liga se trata de forma independiente.
3. **panel de control**: ves tu dinero disponible, el valor de tu equipo, el estado del mercado y alertas importantes para no dejar puntos en el banquillo.
4. **analisis y recomendaciones**: navegas por pestanas para ver tu plantilla, los rivales, el mercado, la clasificacion, las estadisticas y el plan recomendado para las proximas jornadas.

por debajo, la aplicacion se apoya en tres grandes bloques:

- **la api oficial del juego**: todos los datos (ligas, plantillas, mercado, calendario) salen de la misma fuente que usa la app oficial de laliga fantasy.
- **un motor de recomendaciones**: un conjunto de reglas y calculos que combina precio, puntos, noticias y dureza del calendario para decidir que te conviene hacer.
- **fuentes externas de informacion**: noticias deportivas, estadisticas de partidos y datos de otros sitios de fantasy, que se usan para afinar las recomendaciones.

## que tecnologia usa

el proyecto esta desarrollado con un stack moderno y rapido:

- **astro**: el marco principal de la aplicacion web, que genera las paginas y el servidor.
- **react**: se encarga de los componentes interactivos del panel de control.
- **tailwind css**: el sistema de estilos que da el aspecto visual.
- **typescript**: el lenguaje de programacion, que ayuda a evitar errores escribiendo el codigo.
- **zustand y tanstack query**: gestionan el estado de la aplicacion y la carga de datos en el navegador.
- **recharts y framer motion**: se usan para los graficos y las animaciones de la interfaz.
- **playwright**: herramienta de pruebas automatizadas que comprueba que los flujos importantes, como el inicio de sesion, funcionan correctamente.

la interfaz sigue una estetica oscura y profesional, con fondo negro (#151515) y texto claro (#ececec), pensada para consultar datos durante mucho rato sin cansar la vista.

## estructura del panel de control

el panel principal se organiza en pestanas para que cada cosa tenga su sitio:

- **resumen (overview)**: vision general de tu equipo y la liga.
- **equipo (team)**: tu plantilla al completo, con valores, estados y clausulas.
- **once (lineup)**: tu alineacion actual y la recomendada.
- **rivales (rivals)**: las plantillas de los demas managers.
- **mercado (market)**: jugadores en venta, pujas y oportunidades.
- **recomendaciones**: la lista priorizada de movimientos que deberias hacer.
- **clasificacion (standings)**: la tabla de la liga y su evolucion.
- **estadisticas**: graficos y analisis avanzados de la liga.
- **plan multijornada**: recomendaciones pensadas para las proximas semanas.
- **historial (track record)**: el seguimiento de aciertos del sistema a lo largo de las jornadas.

## estado del proyecto

el proyecto esta en desarrollo activo, en una fase muy avanzada. ya funciona de punta a punta: se puede iniciar sesion, elegir liga, cargar datos reales y recibir recomendaciones y estadisticas. el trabajo actual se centra en afinar el motor de recomendaciones, anadir mas fuentes de datos y mejorar la experiencia de usuario.

algunas ideas que estan pendientes o en el horizonte:

- renovar automaticamente el token de sesion para no tener que volver a iniciar sesion cada dia.
- poder ejecutar acciones desde el panel (pujar, vender, subir clausula) con confirmacion del usuario.
- mejorar las predicciones con mas datos historicos y estadisticas avanzadas.
- mas pruebas automatizadas y documentacion de usuario final.

## aspectos legales y de seguridad

- la aplicacion es **no oficial**: no pertenece a laliga ni a laliga fantasy, y no esta patrocinada por ellos.
- los datos de tu cuenta se usan unicamente para mostrarte tu informacion. los tokens de acceso se guardan de forma segura en el servidor y nunca se exponen en el navegador.
- el proyecto respeta los terminos de servicio del juego: solo ofrece recomendaciones informativas y no automatiza acciones que den una ventaja injusta (como pujas automaticas).
- los archivos con credenciales y tokens no se suben al repositorio publico.

## como ejecutarlo

para poner la aplicacion en marcha en tu equipo necesitas tener instalado node.js (version 22 o superior) y el gestor de paquetes pnpm. despues:

1. instala las dependencias con `pnpm install`.
2. arranca el servidor de desarrollo con `pnpm dev`.
3. abre el navegador en `http://localhost:4321`.

antes del primer uso hay que crear un archivo de configuracion local (`.env.local`) con tu token de laliga fantasy, siguiendo la plantilla `.env.example` que incluye el proyecto.

## donde esta la documentacion

toda la documentacion del proyecto vive en la carpeta `agent-docs/`:

- `info-general.md`: este documento, con la vision general para cualquier persona.
- `laliga-fantasy-analysis.md`: el analisis funcional que dio origen al proyecto.
- `useful-docs/architecture.md`: como esta montada la arquitectura tecnica.
- `useful-docs/api-reference.md` y `useful-docs/api-endpoints.md`: referencias de los endpoints de la api.
- `useful-docs/implementation-notes.md`: notas de implementacion, problemas resueltos y proximos pasos.
- `useful-docs/todo.md`: lista de tareas pendientes.
- `useful-docs/credentials.md` y `useful-docs/authentication.md`: como se gestionan los accesos.
