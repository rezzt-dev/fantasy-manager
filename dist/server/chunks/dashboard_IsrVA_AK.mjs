import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { S as createAstro, h as addAttribute, i as renderComponent, l as renderTemplate, m as renderHead } from "./server_DuAW-2K5.mjs";
import { t as createComponent } from "./compiler_CtW6VrhP.mjs";
/* empty css                 */
//#region src/pages/dashboard.astro
var dashboard_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Dashboard,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Dashboard = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Dashboard;
	if (!(Astro.session ? await Astro.session.get("fantasy_tokens") : void 0)?.access_token) return Astro.redirect("/login");
	return renderTemplate`<html lang="es"><head><meta charset="utf-8"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><meta name="viewport" content="width=device-width"><meta name="generator"${addAttribute(Astro.generator, "content")}><title>Dashboard | Fantasy Manager</title><script>
			// Aplica el modo compacto antes de hidratar React para evitar parpadeo (FOUC).
			try {
				if (localStorage.getItem('fantasy-density') === 'dense') {
					document.documentElement.classList.add('density-dense');
				}
			} catch (e) { /* localStorage no disponible */ }
		<\/script>${renderHead($$result)}</head><body class="min-h-screen bg-background text-foreground antialiased"><noscript><div class="flex min-h-screen flex-col items-center justify-center p-6 text-center"><h1 class="text-xl font-display font-semibold tracking-tight">JavaScript requerido</h1><p class="mt-2 text-muted-foreground">El dashboard necesita JavaScript para funcionar. Actívalo en tu navegador.</p></div></noscript>${renderComponent($$result, "DashboardClient", null, {
		"client:only": "react",
		"client:component-hydration": "only",
		"client:component-path": "/home/rezzt/personal-data/deploy-projects/fantasy-manager/src/components/DashboardClient.tsx",
		"client:component-export": "default"
	}, { "fallback": ($$result) => renderTemplate`<div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground"><div class="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 border border-white/[0.08]"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-foreground"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg></div><div class="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-foreground"></div><p class="text-sm text-muted-foreground">Cargando dashboard...</p></div>` })}</body></html>`;
}, "/home/rezzt/personal-data/deploy-projects/fantasy-manager/src/pages/dashboard.astro", void 0);
var $$file = "/home/rezzt/personal-data/deploy-projects/fantasy-manager/src/pages/dashboard.astro";
var $$url = "/dashboard";
//#endregion
//#region \0virtual:astro:page:src/pages/dashboard@_@astro
var page = () => dashboard_exports;
//#endregion
export { page };
