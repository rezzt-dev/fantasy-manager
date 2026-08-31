import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { S as createAstro, b as unescapeHTML, h as addAttribute, i as renderComponent, l as renderTemplate, m as renderHead } from "./server_CcmEKShS.mjs";
import { t as createComponent } from "./compiler_Dueyf4G_.mjs";
/* empty css                 */
import { Chrome, ShieldCheck, Trophy } from "lucide-react";
//#region src/pages/extension.astro
var extension_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Extension,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Extension = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Extension;
	return renderTemplate`<html lang="es"><head><meta charset="utf-8"><link rel="icon" type="image/x-icon" href="/favicon.ico"><meta name="viewport" content="width=device-width"><meta name="generator"${addAttribute(Astro.generator, "content")}><title>Instalar el conector | Fantasy Manager</title>${renderHead($$result)}</head><body><div class="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-16"><a href="/" class="mb-10 inline-flex items-center gap-2.5 text-xl font-semibold tracking-tight text-foreground"><div class="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-surface-2">${renderComponent($$result, "Trophy", Trophy, { "className": "h-5 w-5 text-foreground" })}</div><span class="font-display tracking-tight">Fantasy<span class="text-brand-muted">Manager</span></span></a><h1 class="font-display text-3xl tracking-tight text-foreground">Entrar con Google, sin tokens</h1><p class="mt-3 text-sm leading-relaxed text-muted-foreground">LaLiga sólo permite completar su login desde su app oficial: el proceso termina en una dirección<code class="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">authredirect://</code> que ninguna web puede recibir. El conector es una extensión mínima que recoge ese último paso por ti. Se instala una vez y a partir de ahí entras con un clic.</p><ol class="mt-10 space-y-5">${[
		{
			title: "Descarga el conector",
			body: "Clona el repositorio o descarga la carpeta <code>extension/</code>. El código es público: puedes leer cada línea antes de instalarlo."
		},
		{
			title: "Abre la página de extensiones",
			body: "En Chrome o Edge, entra en <code>chrome://extensions</code>. En Firefox, en <code>about:debugging#/runtime/this-firefox</code>."
		},
		{
			title: "Activa el modo desarrollador",
			body: "Es el interruptor de la esquina superior derecha. Sin él no se pueden cargar extensiones sin publicar."
		},
		{
			title: "Carga la carpeta",
			body: "Pulsa \"Cargar descomprimida\" y selecciona la carpeta <code>extension/</code>. En Firefox, \"Cargar complemento temporal\" y elige su <code>manifest.json</code>."
		},
		{
			title: "Vuelve al login y pulsa \"Entrar con Google\"",
			body: "Se abrirá la página oficial de LaLiga. Inicia sesión como siempre y la ventana se cerrará sola."
		}
	].map((step, index) => renderTemplate`<li class="flex gap-4"><span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-surface-2 text-xs font-medium text-foreground">${index + 1}</span><div class="space-y-1"><p class="text-sm font-medium text-foreground">${step.title}</p><p class="text-sm leading-relaxed text-muted-foreground">${unescapeHTML(step.body)}</p></div></li>`)}</ol><div class="mt-10 space-y-3 rounded-xl border border-white/[0.08] bg-surface-2/50 p-5"><div class="flex items-center gap-2 text-sm font-medium text-foreground">${renderComponent($$result, "ShieldCheck", ShieldCheck, { "className": "h-4 w-4" })}Qué hace y qué no hace</div><ul class="space-y-2 text-sm leading-relaxed text-muted-foreground"><li>Se activa <strong class="text-foreground">sólo</strong> en la página de login de LaLiga y en Fantasy Manager. No lee ninguna otra web.</li><li>Tu contraseña se teclea en la página oficial de LaLiga. La extensión no la ve, y Fantasy Manager tampoco.</li><li>El token se guarda en una sesión <code class="font-mono">httpOnly</code> del servidor, no en el navegador.</li></ul></div><div class="mt-8 flex flex-wrap items-center gap-3"><a href="/login" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-background transition-colors hover:bg-white">${renderComponent($$result, "Chrome", Chrome, { "className": "h-4 w-4" })}Volver al login</a><a href="https://github.com/rezzt-dev/fantasy-manager/tree/main/extension" class="inline-flex h-10 items-center rounded-lg border border-white/[0.12] px-4 text-sm text-foreground transition-colors hover:bg-white/[0.05]">Ver el código</a></div></div></body></html>`;
}, "/home/rezzt/repositorios/webpage-projects/fantasy-manager/src/pages/extension.astro", void 0);
var $$file = "/home/rezzt/repositorios/webpage-projects/fantasy-manager/src/pages/extension.astro";
var $$url = "/extension";
//#endregion
//#region \0virtual:astro:page:src/pages/extension@_@astro
var page = () => extension_exports;
//#endregion
export { page };
