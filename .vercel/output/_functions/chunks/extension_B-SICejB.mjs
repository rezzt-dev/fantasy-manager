import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { C as createAstro, h as addAttribute, i as renderComponent, l as renderTemplate, m as renderHead, x as unescapeHTML } from "./server_B24jXW4u.mjs";
import { t as createComponent } from "./compiler_DkYfdx0t.mjs";
/* empty css                 */
import { t as Logo } from "./Logo_BoEm3omA.mjs";
import { t as Button } from "./button_C31WaXes.mjs";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
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
	return renderTemplate`<html lang="es"><head><meta charset="utf-8"><link rel="icon" type="image/x-icon" href="/favicon.ico"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><meta name="generator"${addAttribute(Astro.generator, "content")}><title>Instalar el conector | Fantasy Manager</title>${renderHead($$result)}</head><body class="bg-canvas text-content"><div class="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-5 py-16"><a href="/" class="mb-10 self-start rounded-sm" aria-label="Fantasy Manager — inicio">${renderComponent($$result, "Logo", Logo, { "size": "md" })}</a><p class="eyebrow">Conector del navegador</p><h1 class="mt-3 font-display text-3xl font-bold tracking-[-0.035em] text-content">Entrar con Google, sin pegar tokens</h1><p class="measure mt-4 text-base leading-relaxed text-content-secondary">LaLiga sólo permite completar su login desde su app oficial: el proceso termina en una dirección<code class="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs">authredirect://</code> que ninguna web puede recibir. El conector es una extensión mínima que recoge ese último paso por ti. Se instala una vez y a partir de ahí entras con un clic.</p><ol class="mt-10 space-y-5">${[
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
	].map((step, index) => renderTemplate`<li class="flex gap-4"><span class="numeral flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-surface-raised text-xs font-semibold text-content" aria-hidden="true">${index + 1}</span><div class="space-y-1"><p class="text-sm font-medium text-content">${step.title}</p><p class="measure text-sm leading-relaxed text-content-tertiary [&amp;_code]:rounded-xs [&amp;_code]:bg-surface-raised [&amp;_code]:px-1.5 [&amp;_code]:py-0.5 [&amp;_code]:font-mono [&amp;_code]:text-xs [&amp;_code]:text-content">${unescapeHTML(step.body)}</p></div></li>`)}</ol><div class="mt-10 space-y-3 rounded-lg border border-white/[0.09] bg-surface p-5"><div class="flex items-center gap-2 text-sm font-medium text-content">${renderComponent($$result, "ShieldCheck", ShieldCheck, { "className": "h-4 w-4" })}Qué hace y qué no hace</div><ul class="space-y-2 text-sm leading-relaxed text-content-tertiary"><li>Se activa <strong class="text-content">sólo</strong> en la página de login de LaLiga y en Fantasy Manager. No lee ninguna otra web.</li><li>Tu contraseña se teclea en la página oficial de LaLiga. La extensión no la ve, y Fantasy Manager tampoco.</li><li>El token se guarda en una sesión <code class="font-mono">httpOnly</code> del servidor, no en el navegador.</li></ul></div><div class="mt-8 flex flex-wrap items-center gap-3"><a href="/login">${renderComponent($$result, "Button", Button, {
		"variant": "accent",
		"className": "gap-2"
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "ArrowLeft", ArrowLeft, { "aria-hidden": "true" })}Volver al acceso` })}</a><a href="https://github.com/rezzt-dev/fantasy-manager/tree/main/extension" target="_blank" rel="noopener noreferrer">${renderComponent($$result, "Button", Button, {
		"variant": "outline",
		"className": "gap-2"
	}, { "default": ($$result) => renderTemplate`Ver el código en GitHub${renderComponent($$result, "ExternalLink", ExternalLink, { "aria-hidden": "true" })}` })}</a></div></div></body></html>`;
}, "/home/rezzt/repositorios/webpage-projects/fantasy-manager/src/pages/extension.astro", void 0);
var $$file = "/home/rezzt/repositorios/webpage-projects/fantasy-manager/src/pages/extension.astro";
var $$url = "/extension";
//#endregion
//#region \0virtual:astro:page:src/pages/extension@_@astro
var page = () => extension_exports;
//#endregion
export { page };
