import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { C as createAstro, h as addAttribute, i as renderComponent, l as renderTemplate, m as renderHead, p as maybeRenderHead } from "./server_B24jXW4u.mjs";
import { t as createComponent } from "./compiler_DkYfdx0t.mjs";
import { t as renderScript } from "./script_CvHXtnor.mjs";
/* empty css                 */
import { t as Logo } from "./Logo_BoEm3omA.mjs";
import { t as Button } from "./button_C31WaXes.mjs";
import { ArrowRight, ArrowUpRight, ClipboardList, Crown, Gavel, Lock, Radar, Store, Swords, Target, TriangleAlert } from "lucide-react";
//#region src/components/marketing/CapabilityCard.astro
createAstro("https://astro.build");
var $$CapabilityCard = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$CapabilityCard;
	const { icon: Icon, title, description, detail, span = "default", accent = false } = Astro.props;
	return renderTemplate`${maybeRenderHead($$result)}<article${addAttribute([
		"group relative flex flex-col rounded-lg border p-6 transition-[border-color,background-color] duration-base ease-out",
		span === "wide" ? "sm:col-span-2" : "",
		accent ? "border-accent/25 bg-accent-quiet" : "border-white/[0.09] bg-surface hover:border-white/[0.14] hover:bg-surface-raised"
	], "class:list")}>${renderComponent($$result, "Icon", Icon, {
		"className": `h-5 w-5 ${accent ? "text-accent" : "text-content-tertiary"}`,
		"aria-hidden": "true"
	})}<h3 class="mt-4 font-display text-base font-semibold tracking-[-0.015em] text-content">${title}</h3><p class="mt-2 text-sm leading-relaxed text-content-tertiary">${description}</p>${detail && renderTemplate`<p class="mt-4 border-t border-white/[0.09] pt-3 text-xs leading-relaxed text-content-tertiary">${detail}</p>`}</article>`;
}, "/home/rezzt/repositorios/webpage-projects/fantasy-manager/src/components/marketing/CapabilityCard.astro", void 0);
//#endregion
//#region src/components/marketing/HeroPreview.astro
var $$HeroPreview = createComponent(($$result, $$props, $$slots) => {
	const rows = [
		{
			verdict: "Fichar por cláusula",
			Icon: Gavel,
			tone: "accent",
			player: "Nico Williams",
			position: "DEL",
			club: "Athletic Club",
			delta: "+3,4",
			note: "Titular en el once probable y su rival encaja 1,8 goles de media fuera."
		},
		{
			verdict: "Capitán de la jornada",
			Icon: Crown,
			tone: "neutral",
			player: "Vinícius Jr.",
			position: "DEL",
			club: "Real Madrid",
			delta: "+6,1",
			note: "Mejor xP del once una vez doblada la puntuación."
		},
		{
			verdict: "Sentar en el banquillo",
			Icon: TriangleAlert,
			tone: "caution",
			player: "Robin Le Normand",
			position: "DEF",
			club: "Atlético de Madrid",
			delta: "−1,2",
			note: "Duda física sin confirmar a 40 h del cierre."
		}
	];
	const toneClass = {
		accent: "border-accent/30 bg-accent-quiet text-accent-300",
		neutral: "border-white/[0.09] bg-white/[0.05] text-content-secondary",
		caution: "border-caution/25 bg-caution-quiet text-caution-text"
	};
	return renderTemplate`${maybeRenderHead($$result)}<div class="relative"><!-- Sombra proyectada del panel: da profundidad sin recurrir a un degradado --><div class="pointer-events-none absolute -inset-x-6 -bottom-6 top-8 rounded-xl bg-ink-0/60 blur-2xl" aria-hidden="true"></div><div class="relative overflow-hidden rounded-lg border border-white/[0.14] bg-surface shadow-5"><!-- Cabecera del panel --><div class="flex items-center justify-between gap-3 border-b border-white/[0.09] bg-surface-raised px-4 py-3"><div class="min-w-0"><p class="eyebrow text-[10px]">Centro Estrategia</p><p class="mt-0.5 font-display text-sm font-semibold tracking-[-0.015em] text-content">Jornada 3 · cierra en 41 h</p></div><span class="shrink-0 rounded-full border border-white/[0.09] bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-content-tertiary">Ejemplo</span></div><!-- Filas de recomendación --><ul class="divide-y divide-white/[0.09]">${rows.map(({ verdict, Icon, tone, player, position, club, delta, note }) => renderTemplate`<li class="flex gap-3 px-4 py-3.5"><span${addAttribute(["mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border", toneClass[tone]], "class:list")} aria-hidden="true">${renderComponent($$result, "Icon", Icon, { "className": "h-3.5 w-3.5" })}</span><div class="min-w-0 flex-1"><div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><span class="font-display text-sm font-semibold text-content">${player}</span><span class="numeral text-[10px] uppercase tracking-wider text-content-tertiary">${position} · ${club}</span></div><p class="mt-1 text-xs leading-relaxed text-content-tertiary">${note}</p><p${addAttribute(["mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", toneClass[tone]], "class:list")}>${verdict}</p></div><div class="shrink-0 text-right"><p${addAttribute(["numeral text-lg font-semibold leading-none", delta.startsWith("−") ? "text-negative-text" : "text-accent-300"], "class:list")}>${delta}</p><p class="mt-1 text-[10px] uppercase tracking-wider text-content-tertiary">xP once</p></div></li>`)}</ul><!-- Pie: el presupuesto real que condiciona todo lo de arriba --><div class="flex items-center justify-between gap-3 border-t border-white/[0.09] bg-surface-sunken px-4 py-3"><div><p class="eyebrow text-[10px]">Presupuesto operativo</p><p class="numeral mt-0.5 text-sm font-semibold text-content">14,2 M €</p></div><span class="inline-flex items-center gap-1 text-xs font-medium text-accent-300">Ver plan completo${renderComponent($$result, "ArrowUpRight", ArrowUpRight, {
		"className": "h-3.5 w-3.5",
		"aria-hidden": "true"
	})}</span></div></div></div>`;
}, "/home/rezzt/repositorios/webpage-projects/fantasy-manager/src/components/marketing/HeroPreview.astro", void 0);
//#endregion
//#region src/pages/index.astro
var pages_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => ""
});
createAstro("https://astro.build");
var $$Index = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Index;
	return renderTemplate`<html lang="es"><head><meta charset="utf-8"><link rel="icon" type="image/x-icon" href="/favicon.ico"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="generator"${addAttribute(Astro.generator, "content")}><meta name="description" content="Panel de gestión para managers de LALIGA FANTASY: alineación óptima, capitán, mercado, clausulazos y predicción de puntos con el número delante."><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><title>Fantasy Manager — decide tu jornada con datos</title>${renderHead($$result)}</head><body class="bg-canvas text-content"><a href="#contenido" class="skip-link">Saltar al contenido</a><div class="flex min-h-dvh flex-col"><header class="glass sticky top-0 z-header w-full border-b border-white/[0.09]"><div class="container flex h-16 items-center justify-between gap-4"><a href="/" class="rounded-sm" aria-label="Fantasy Manager — inicio"><!-- El símbolo se traza al cargar: es la primera impresión de la
							marca y ocurre una vez. En el panel el mismo logo NO se anima. -->${renderComponent($$result, "Logo", Logo, {
		"size": "md",
		"draw": true
	})}</a><nav aria-label="Secciones" class="hidden items-center gap-1 md:flex"><a href="#capacidades" class="rounded-md px-3 py-2 text-sm font-medium text-content-tertiary transition-colors duration-fast hover:text-content">Qué hace</a><a href="#como-funciona" class="rounded-md px-3 py-2 text-sm font-medium text-content-tertiary transition-colors duration-fast hover:text-content">Cómo funciona</a><a href="#limites" class="rounded-md px-3 py-2 text-sm font-medium text-content-tertiary transition-colors duration-fast hover:text-content">Límites</a></nav><div class="flex items-center gap-2"><a href="/login" class="hidden sm:inline-flex">${renderComponent($$result, "Button", Button, {
		"variant": "ghost",
		"size": "sm"
	}, { "default": ($$result) => renderTemplate`Entrar` })}</a><a href="/login">${renderComponent($$result, "Button", Button, {
		"variant": "accent",
		"size": "sm"
	}, { "default": ($$result) => renderTemplate`Conectar cuenta` })}</a></div></div></header><main id="contenido" tabindex="-1" class="flex-1"><!-- ── Hero ─────────────────────────────────────────────────────── --><section class="pitch-weave relative overflow-hidden border-b border-white/[0.09]"><div class="container py-16 sm:py-24 lg:py-32"><div class="grid items-center gap-12 lg:grid-cols-12 lg:gap-16"><!-- Columna de texto: 7 de 12 --><!--
								Dos gestos en toda la portada, no seis.

								Antes cada pieza del héroe llevaba su propio \`animate-fade-up\`
								con un \`animation-delay\` a mano: el titular, el párrafo, los
								botones, la tira de datos y el panel, todos con la misma
								distancia y la misma curva. Eso es la cascada genérica de
								siempre, y además retrasa medio segundo la aparición del botón
								principal.

								Ahora la columna de texto entra como UN bloque —que es como se
								lee, de arriba abajo y de una vez— y el panel de producto entra
								aparte y algo después, porque es otra cosa: la prueba de lo que
								se acaba de prometer. Dos elementos, dos tiempos, ninguna
								cascada.
							--><div class="animate-fade-up lg:col-span-7"><p class="eyebrow">Para managers de LALIGA FANTASY</p><h1 class="mt-4 font-display text-4xl font-bold tracking-[-0.04em] text-content sm:text-5xl lg:text-6xl">Tu jornada, decidida${" "}<span class="text-content-tertiary">antes</span>${" "}del pitido inicial</h1><p class="measure mt-6 text-lg leading-relaxed text-content-secondary">Fantasy Manager calcula los puntos esperados de cada jugador de tu plantilla, resuelve tu mejor once con capitán incluido y te dice qué fichar, qué vender y qué cláusula subir. Con la cifra delante, no con corazonadas.</p><div class="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"><a href="/login" class="group sm:w-auto">${renderComponent($$result, "Button", Button, {
		"variant": "accent",
		"size": "lg",
		"className": "w-full gap-2 sm:w-auto"
	}, { "default": ($$result) => renderTemplate`Conectar mi cuenta${renderComponent($$result, "ArrowRight", ArrowRight, {
		"className": "nudge-x",
		"aria-hidden": "true"
	})}` })}</a><a href="#como-funciona" class="sm:w-auto">${renderComponent($$result, "Button", Button, {
		"variant": "outline",
		"size": "lg",
		"className": "w-full sm:w-auto"
	}, { "default": ($$result) => renderTemplate`Ver cómo funciona` })}</a></div><!-- Datos de apoyo: no son adornos, son las tres objeciones habituales --><!-- Sin animación propia: son las tres objeciones que el
									lector busca activamente. Que estén ya ahí vale más que
									verlas llegar. --><dl class="mt-12 grid grid-cols-1 gap-6 border-t border-white/[0.09] pt-8 sm:grid-cols-3">${[
		{
			figure: "12",
			unit: "secciones",
			label: "del panel, todas con datos de tu liga"
		},
		{
			figure: "5",
			unit: "fuentes",
			label: "cruzadas: Elo, onces probables, bajas, noticias y valor"
		},
		{
			figure: "0",
			unit: "credenciales",
			label: "guardadas: la sesión vive en tu navegador"
		}
	].map(({ figure, unit, label }) => renderTemplate`<div><dt class="sr-only">${label}</dt><dd><span class="numeral text-3xl font-bold tracking-[-0.03em] text-content">${figure}</span><span class="ml-1.5 text-sm font-medium text-content-tertiary">${unit}</span><p class="mt-1.5 text-sm leading-relaxed text-content-tertiary">${label}</p></dd></div>`)}</dl></div><!-- Columna de producto: 5 de 12 --><!-- El panel entra después del texto y desde algo más lejos:
								es la prueba, y llega cuando ya se ha hecho la promesa. --><div class="animate-fade-up lg:col-span-5" style="animation-delay: 140ms; animation-duration: var(--dur-page)">${renderComponent($$result, "HeroPreview", $$HeroPreview, {})}</div></div></div></section><!-- ── Capacidades ──────────────────────────────────────────────── --><section id="capacidades" class="container scroll-mt-20 py-16 sm:py-24"><div class="max-w-2xl"><p class="eyebrow">Qué hace</p><h2 class="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Doce secciones, una sola pregunta: qué muevo esta jornada</h2><p class="measure mt-4 text-base leading-relaxed text-content-tertiary">No es un visor de estadísticas. Cada pantalla termina en una acción concreta con su coste y su ganancia estimada.</p></div><!-- Rejilla deliberadamente desigual: la pieza principal ocupa el doble --><div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">${renderComponent($$result, "CapabilityCard", $$CapabilityCard, {
		"icon": Target,
		"title": "Puntos esperados por jugador",
		"description": "Un modelo por componentes estima cuánto va a puntuar cada futbolista: minutos probables, dificultad del rival por Elo, forma con decaimiento y regresión a la media por posición y nivel.",
		"detail": "La estimación se guarda cada jornada y se liquida contra el resultado real. El error del modelo frente al baseline está publicado dentro de la app.",
		"span": "wide",
		"accent": true
	})}${renderComponent($$result, "CapabilityCard", $$CapabilityCard, {
		"icon": ClipboardList,
		"title": "Once óptimo y capitán",
		"description": "Resuelve la mejor alineación posible con tu plantilla y elige el capitán co-optimizado, contando ya con que sus puntos se doblan."
	})}${renderComponent($$result, "CapabilityCard", $$CapabilityCard, {
		"icon": Gavel,
		"title": "Clausulazos",
		"description": "Lista solo los jugadores de tu liga que puedes clausular hoy y ordena por lo que mejorarían tu once, no por lo caros que son.",
		"detail": "Incluye qué vender para llegar a la cláusula, contando que cada venta aporta el 80 % de su valor al presupuesto operativo."
	})}${renderComponent($$result, "CapabilityCard", $$CapabilityCard, {
		"icon": Store,
		"title": "Mercado con contexto",
		"description": "Precio, tendencia de valor y titularidad de cada jugador en venta, cruzados con los huecos reales de tu plantilla."
	})}${renderComponent($$result, "CapabilityCard", $$CapabilityCard, {
		"icon": Radar,
		"title": "Predicción por equipo",
		"description": "Clasificación de la jornada por puntos esperados de cada manager de tu liga, con su once inferido y su entrenador estimado."
	})}${renderComponent($$result, "CapabilityCard", $$CapabilityCard, {
		"icon": Swords,
		"title": "Partidos en vivo",
		"description": "Marcador, minuto y eventos de los partidos donde juegan tus futbolistas, ordenados por cuántos de los tuyos están sobre el césped."
	})}${renderComponent($$result, "CapabilityCard", $$CapabilityCard, {
		"icon": Lock,
		"title": "Sin credenciales guardadas",
		"description": "El acceso vive en la sesión de tu navegador. Ni la contraseña ni los tokens se almacenan en una base de datos nuestra."
	})}</div></section><!-- ── Cómo funciona ────────────────────────────────────────────── --><section id="como-funciona" class="scroll-mt-20 border-y border-white/[0.09] bg-surface-sunken"><div class="container py-16 sm:py-24"><div class="grid gap-12 lg:grid-cols-12 lg:gap-16"><div class="lg:col-span-4"><p class="eyebrow">Cómo funciona</p><h2 class="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Tres pasos y ninguna configuración</h2><p class="measure mt-4 text-base leading-relaxed text-content-tertiary">No hay que rellenar nada ni enseñarle tu equipo al programa: lo lee de tu liga.</p></div><!--
								El ÚNICO momento de la web ligado al scroll.

								Los tres pasos son una secuencia con orden y con recorrido, así que el
								raíl que los une se dibuja a medida que el lector baja: la barra de
								progreso del propio texto. Es una línea de tiempo encadenada al scroll
								(\`scrub\`) con cuatro elementos que dependen unos de otros, que es
								exactamente lo que GSAP + ScrollTrigger hace bien y lo que ni CSS ni
								Motion resuelven con soltura.

								Es deliberadamente el único: si cada sección de la portada tuviera su
								secuencia de scroll, ninguna significaría nada.

								Sin JavaScript —o con movimiento reducido— el raíl aparece completo y
								los pasos ya están en su color final: el contenido nunca depende de la
								animación para poder leerse.
							--><ol class="relative lg:col-span-8" data-steps><!-- La guía apagada y, encima, el trazo que la recorre. --><span class="pointer-events-none absolute bottom-6 left-[4px] top-6 w-px bg-white/[0.09]" aria-hidden="true"></span><span class="pointer-events-none absolute bottom-6 left-[4px] top-6 w-px origin-top bg-accent" data-steps-progress aria-hidden="true"></span>${[
		{
			n: "01",
			title: "Conecta tu cuenta",
			body: "Inicias sesión con tu cuenta de LALIGA FANTASY. El acceso queda en tu sesión del navegador; no se guarda ninguna contraseña en el servidor."
		},
		{
			n: "02",
			title: "El motor lee tu jornada",
			body: "Cruza tu plantilla con el Elo de cada rival, los onces probables, las bajas confirmadas, las noticias del día y la tendencia de valor de cada jugador."
		},
		{
			n: "03",
			title: "Decides con el número delante",
			body: "Cada consejo llega con su ganancia en puntos esperados sobre tu once actual, no con un «este está en forma». Si el motor falla, lo verás en Acierto del motor."
		}
	].map(({ n, title, body }, i) => renderTemplate`<li${addAttribute(["relative flex gap-6 py-6 pl-8", i > 0 ? "border-t border-white/[0.09]" : "pt-0"], "class:list")} data-step><span class="absolute left-0 top-[30px] h-2.5 w-2.5 rounded-full border-2 border-accent bg-accent transition-colors duration-base ease-out" data-step-dot aria-hidden="true"></span><span class="numeral shrink-0 text-sm font-bold tracking-[0.1em] text-accent transition-colors duration-base ease-out" data-step-number aria-hidden="true">${n}</span><div><h3 class="font-display text-lg font-semibold tracking-[-0.02em] text-content">${title}</h3><p class="measure mt-2 text-sm leading-relaxed text-content-tertiary">${body}</p></div></li>`)}</ol></div></div></section><!-- ── Límites: decir la verdad vende más que prometer de más ────── --><section id="limites" class="container scroll-mt-20 py-16 sm:py-24"><div class="grid gap-10 lg:grid-cols-12 lg:gap-16"><div class="lg:col-span-4"><p class="eyebrow">Lo que no hace</p><h2 class="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Los límites, por delante</h2></div><ul class="space-y-4 lg:col-span-8"><li class="rounded-lg border border-white/[0.09] bg-surface p-5"><h3 class="font-display text-base font-semibold text-content">No ve la alineación de tus rivales</h3><p class="measure mt-1.5 text-sm leading-relaxed text-content-tertiary">La API oficial no la expone. Cuando hace falta, el once rival se infiere desde su plantilla y la app lo indica como estimación.</p></li><li class="rounded-lg border border-white/[0.09] bg-surface p-5"><h3 class="font-display text-base font-semibold text-content">No adivina lesiones de última hora</h3><p class="measure mt-1.5 text-sm leading-relaxed text-content-tertiary">Lee onces probables y noticias con hora de publicación, y sustituye la estimación por la alineación confirmada cuando aparece, aproximadamente una hora antes del partido.</p></li><li class="rounded-lg border border-white/[0.09] bg-surface p-5"><h3 class="font-display text-base font-semibold text-content">No es una aplicación oficial de LALIGA</h3><p class="measure mt-1.5 text-sm leading-relaxed text-content-tertiary">Es una herramienta personal que consulta la misma API que la app oficial con tu propia sesión. Sin relación con LALIGA ni con LFP.</p></li></ul></div></section><!-- ── CTA final ────────────────────────────────────────────────── --><!--
					El único elemento de la portada que se revela al llegar a él, y es
					uno solo, no una rejilla: el cierre tiene que sentirse como una
					llegada después de haber leído los límites. Se hace con
					\`animation-timeline: view()\` —CSS puro, sin observador ni
					JavaScript— y se desactiva por completo con movimiento reducido.
				--><section class="container pb-24"><div class="pitch-weave reveal-on-scroll flex flex-col items-start gap-6 rounded-lg border border-white/[0.14] bg-surface p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between"><div><h2 class="font-display text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">La próxima jornada ya está en marcha</h2><p class="measure mt-3 text-base leading-relaxed text-content-tertiary">Conecta tu cuenta y mira tu once óptimo antes de que cierre el mercado.</p></div><a href="/login" class="group w-full shrink-0 lg:w-auto">${renderComponent($$result, "Button", Button, {
		"variant": "accent",
		"size": "lg",
		"className": "w-full gap-2 lg:w-auto"
	}, { "default": ($$result) => renderTemplate`Conectar mi cuenta${renderComponent($$result, "ArrowRight", ArrowRight, {
		"className": "nudge-x",
		"aria-hidden": "true"
	})}` })}</a></div></section></main><footer class="border-t border-white/[0.09]"><div class="container flex flex-col items-start justify-between gap-6 py-8 sm:flex-row sm:items-center">${renderComponent($$result, "Logo", Logo, { "size": "sm" })}<div class="flex flex-col gap-1 text-xs text-content-tertiary sm:text-right"><p>© ${(/* @__PURE__ */ new Date()).getFullYear()} Fantasy Manager · Proyecto personal de uso libre</p><p>Sin vinculación con LALIGA, LFP ni con la aplicación oficial LALIGA FANTASY.</p></div></div></footer></div><!--
			Todo el JavaScript de animación de la portada, en un solo módulo y
			cargado en diferido. Astro lo empaqueta y lo sirve con \`type="module"\`,
			así que ya no bloquea la pintada; dentro, el propio módulo espera al
			primer hueco de inactividad antes de tocar nada.
		-->${renderScript($$result, "/home/rezzt/repositorios/webpage-projects/fantasy-manager/src/pages/index.astro?astro&type=script&index=0&lang.ts")}</body></html>`;
}, "/home/rezzt/repositorios/webpage-projects/fantasy-manager/src/pages/index.astro", void 0);
var $$file = "/home/rezzt/repositorios/webpage-projects/fantasy-manager/src/pages/index.astro";
//#endregion
//#region \0virtual:astro:page:src/pages/index@_@astro
var page = () => pages_exports;
//#endregion
export { page };
