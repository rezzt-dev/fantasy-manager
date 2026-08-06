import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { S as createAstro, h as addAttribute, i as renderComponent, l as renderTemplate, m as renderHead } from "./server_DuAW-2K5.mjs";
import { t as createComponent } from "./compiler_CtW6VrhP.mjs";
/* empty css                 */
import { Trophy } from "lucide-react";
//#region src/pages/login.astro
var login_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Login,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Login = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Login;
	return renderTemplate`<html lang="es"><head><meta charset="utf-8"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><meta name="viewport" content="width=device-width"><meta name="generator"${addAttribute(Astro.generator, "content")}><title>Iniciar sesión | Fantasy Manager</title>${renderHead($$result)}</head><body><div class="relative flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-6"><div class="relative z-10 mb-8 text-center animate-fade-up"><a href="/" class="inline-flex items-center justify-center gap-2.5 text-2xl font-semibold tracking-tight text-foreground"><div class="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 border border-white/[0.08]">${renderComponent($$result, "Trophy", Trophy, { "className": "h-5 w-5 text-foreground" })}</div><span class="font-display tracking-tight">Fantasy<span class="text-brand-muted">Manager</span></span></a><p class="mt-2 text-sm text-muted-foreground">Inicia sesión para gestionar tus equipos.</p></div>${renderComponent($$result, "LoginForm", null, {
		"client:only": "react",
		"client:component-hydration": "only",
		"client:component-path": "/home/rezzt/personal-data/deploy-projects/fantasy-manager/src/components/auth/LoginForm.tsx",
		"client:component-export": "default"
	}, { "fallback": ($$result) => renderTemplate`<div class="w-full max-w-md rounded-2xl border border-white/[0.08] bg-card p-8 text-center text-sm text-muted-foreground">Cargando formulario...</div>` })}</div></body></html>`;
}, "/home/rezzt/personal-data/deploy-projects/fantasy-manager/src/pages/login.astro", void 0);
var $$file = "/home/rezzt/personal-data/deploy-projects/fantasy-manager/src/pages/login.astro";
var $$url = "/login";
//#endregion
//#region \0virtual:astro:page:src/pages/login@_@astro
var page = () => login_exports;
//#endregion
export { page };
