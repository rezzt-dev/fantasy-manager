import { r as __exportAll } from "./rolldown-runtime_BMI-E3GI.mjs";
import { S as createAstro, h as addAttribute, i as renderComponent, l as renderTemplate, m as renderHead, p as maybeRenderHead } from "./server_DuAW-2K5.mjs";
import { t as createComponent } from "./compiler_CtW6VrhP.mjs";
/* empty css                 */
import { clsx } from "clsx";
import * as React$1 from "react";
import { cva } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import { jsx } from "react/jsx-runtime";
import { ArrowRight, BarChart3, Eye, Goal, LineChart, Lock, ShieldCheck, Target, TrendingUp, Trophy, Users, Zap } from "lucide-react";
//#region src/components/BenefitCard.astro
createAstro("https://astro.build");
var $$BenefitCard = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$BenefitCard;
	const { icon: Icon, title, description } = Astro.props;
	return renderTemplate`${maybeRenderHead($$result)}<div class="group rounded-2xl border border-white/[0.06] bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-white/[0.12] hover:bg-surface-2 hover:shadow-card-hover"><div class="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-surface-2">${renderComponent($$result, "Icon", Icon, { "className": "h-5 w-5 text-foreground" })}</div><h3 class="mt-4 font-display text-base font-semibold tracking-tight text-foreground">${title}</h3><p class="mt-2 text-sm leading-relaxed text-muted-foreground">${description}</p></div>`;
}, "/home/rezzt/personal-data/deploy-projects/fantasy-manager/src/components/BenefitCard.astro", void 0);
//#endregion
//#region src/components/StepCard.astro
createAstro("https://astro.build");
var $$StepCard = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$StepCard;
	const { step, icon: Icon, title, description } = Astro.props;
	return renderTemplate`${maybeRenderHead($$result)}<div class="group rounded-2xl border border-white/[0.06] bg-surface-2 p-6 transition-all duration-200 hover:-translate-y-1 hover:border-white/[0.12] hover:bg-surface-3 hover:shadow-card-hover"><div class="flex items-center justify-between"><div class="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-surface-3">${renderComponent($$result, "Icon", Icon, { "className": "h-5 w-5 text-foreground" })}</div><span class="font-display text-sm font-semibold tracking-widest text-brand-subtle">${step}</span></div><h3 class="mt-4 font-display text-base font-semibold tracking-tight text-foreground">${title}</h3><p class="mt-2 text-sm leading-relaxed text-muted-foreground">${description}</p></div>`;
}, "/home/rezzt/personal-data/deploy-projects/fantasy-manager/src/components/StepCard.astro", void 0);
//#endregion
//#region src/lib/utils.ts
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
//#endregion
//#region src/components/ui/button.tsx
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-brand text-background shadow-[0_0_0_1px_rgba(236,236,236,0.08)] hover:bg-white hover:shadow-glow-sm",
			destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
			outline: "border border-white/[0.12] bg-transparent text-foreground hover:bg-white/[0.05] hover:border-white/[0.18]",
			secondary: "bg-surface-2 text-secondary-foreground hover:bg-surface-3",
			ghost: "hover:bg-white/[0.05] hover:text-foreground",
			"ghost-accent": "text-foreground hover:bg-white/[0.08] hover:text-white",
			glass: "border border-white/[0.08] bg-white/[0.04] text-foreground backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/[0.12]",
			pill: "rounded-full bg-surface-2 text-foreground hover:bg-surface-3 border border-white/[0.06]",
			link: "text-brand underline-offset-4 hover:underline"
		},
		size: {
			default: "h-10 px-4 py-2",
			xs: "h-7 rounded-md px-2 text-xs",
			sm: "h-9 rounded-md px-3",
			lg: "h-11 rounded-md px-8",
			icon: "h-10 w-10",
			"icon-sm": "h-8 w-8 rounded-md"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = React$1.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ jsx("button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
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
	return renderTemplate`<html lang="es"><head><meta charset="utf-8"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><meta name="viewport" content="width=device-width"><meta name="generator"${addAttribute(Astro.generator, "content")}><meta name="description" content="Centro de comando para managers de LALIGA FANTASY. Recomendaciones, alineación, mercado y clasificación en un solo lugar."><title>Fantasy Manager — LALIGA FANTASY</title>${renderHead($$result)}</head><body><div class="relative flex min-h-screen flex-col bg-background text-foreground"><header class="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-background/95 backdrop-blur-md"><div class="container flex h-16 items-center justify-between"><a href="/" class="group flex items-center gap-2.5 text-lg font-semibold tracking-tight text-foreground"><div class="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 border border-white/[0.08]">${renderComponent($$result, "Trophy", Trophy, { "className": "h-[18px] w-[18px] text-foreground" })}</div><span class="font-display tracking-tight">Fantasy<span class="text-brand-muted">Manager</span></span></a><div class="flex items-center gap-2"><a href="/login">${renderComponent($$result, "Button", Button, {
		"variant": "ghost",
		"size": "sm",
		"className": "hidden text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] sm:inline-flex"
	}, { "default": ($$result) => renderTemplate`Entrar` })}</a><a href="/login">${renderComponent($$result, "Button", Button, {
		"size": "sm",
		"className": "gap-2 text-sm font-medium"
	}, { "default": ($$result) => renderTemplate`Empezar${renderComponent($$result, "ArrowRight", ArrowRight, { "className": "h-4 w-4" })}` })}</a></div></div></header><main class="flex-1"><!-- Hero --><section class="relative flex min-h-screen flex-col items-center justify-center px-4 pt-24 pb-16 sm:pb-24"><div class="container max-w-4xl text-center"><div class="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-surface-2 px-4 py-1.5 text-xs font-medium text-muted-foreground animate-fade-up"><span class="h-1.5 w-1.5 rounded-full bg-brand"></span>Centro de comando para managers competitivos</div><h1 class="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl animate-fade-up" style="animation-delay: 0.1s;">Deja de perder puntos por decidir a ciegas</h1><p class="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg animate-fade-up" style="animation-delay: 0.2s;">Conecta tu cuenta de LALIGA FANTASY y accede a recomendaciones claras de compra, venta, capitán y cláusulas antes de cada jornada. Todo tu equipo, tu mercado y tus rivales en un único dashboard.</p><div class="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-up" style="animation-delay: 0.3s;"><a href="/login">${renderComponent($$result, "Button", Button, {
		"size": "lg",
		"className": "h-12 gap-2 px-8 text-base font-medium"
	}, { "default": ($$result) => renderTemplate`Conectar mi cuenta${renderComponent($$result, "ArrowRight", ArrowRight, { "className": "h-5 w-5" })}` })}</a><a href="#beneficios">${renderComponent($$result, "Button", Button, {
		"size": "lg",
		"variant": "outline",
		"className": "h-12 px-8 text-base"
	}, { "default": ($$result) => renderTemplate`Ver qué puedes hacer` })}</a></div><div class="mx-auto mt-14 flex max-w-xl flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground animate-fade-up" style="animation-delay: 0.4s;"><div class="flex items-center gap-2">${renderComponent($$result, "ShieldCheck", ShieldCheck, { "className": "h-4 w-4" })}<span>Sesión privada, no compartes credenciales</span></div><div class="flex items-center gap-2">${renderComponent($$result, "LineChart", LineChart, { "className": "h-4 w-4" })}<span>Datos de tu liga en tiempo real</span></div><div class="flex items-center gap-2">${renderComponent($$result, "Zap", Zap, { "className": "h-4 w-4" })}<span>Recomendaciones antes de cada jornada</span></div></div></div></section><!-- Problem / agnostic --><section class="border-y border-white/[0.04] bg-surface px-4 py-16 sm:py-20"><div class="container max-w-4xl text-center"><h2 class="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">Ganar una liga no es solo instinto</h2><p class="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Cada jornada tomas decisiones que suman o restan puntos. Sin los datos organizados, es fácil dejar titulares en el banquillo, perder cláusulas clave o llegar tarde a las gangas del mercado.</p></div></section><!-- Benefits --><section id="beneficios" class="relative overflow-hidden px-4 py-16 sm:py-20"><div class="absolute inset-0 pointer-events-none opacity-[0.02]" style="background-image: radial-gradient(#ECECEC 1px, transparent 1px); background-size: 28px 28px;"></div><div class="container relative z-10 max-w-5xl"><div class="mb-10 text-center sm:mb-14"><h2 class="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">Todo lo que necesitas para liderar tu liga</h2><p class="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">Una herramienta simple, sin ruido, pensada para tomar mejores decisiones cada semana.</p></div><div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">${renderComponent($$result, "BenefitCard", $$BenefitCard, {
		"icon": BarChart3,
		"title": "Dashboard unificado",
		"description": "Tu plantilla, alineación, mercado, clasificación y estadísticas en un solo lugar. Sin saltar entre pantallas."
	})}${renderComponent($$result, "BenefitCard", $$BenefitCard, {
		"icon": Target,
		"title": "Recomendaciones de acción",
		"description": "Sabe qué jugadores comprar, vender, blindar o cambiar en cada jornada, con el contexto de tu equipo."
	})}${renderComponent($$result, "BenefitCard", $$BenefitCard, {
		"icon": Goal,
		"title": "Alineación visual",
		"description": "Ve tu once titular sobre el campo, detecta lesionados y dudosos, y encuentra el mejor sustituto en el banquillo."
	})}${renderComponent($$result, "BenefitCard", $$BenefitCard, {
		"icon": Eye,
		"title": "Control del mercado",
		"description": "Descubre oportunidades de precio, jugadores en venta y pujas activas antes de que lo haga tu rival."
	})}${renderComponent($$result, "BenefitCard", $$BenefitCard, {
		"icon": TrendingUp,
		"title": "Comparación con rivales",
		"description": "Analiza el valor de plantilla, distribución por posiciones y rendimiento de cada manager de tu liga."
	})}${renderComponent($$result, "BenefitCard", $$BenefitCard, {
		"icon": Lock,
		"title": "Privacidad total",
		"description": "Tus datos se mantienen en tu sesión local. No almacenamos ni vendemos información de tu cuenta."
	})}</div></div></section><!-- How it works --><section id="como-funciona" class="border-y border-white/[0.04] bg-surface px-4 py-16 sm:py-20"><div class="container max-w-5xl"><div class="mb-10 text-center sm:mb-14"><h2 class="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">De la duda a la decisión en tres pasos</h2><p class="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">Sin configuraciones complejas. Conectas, revisas y actúas.</p></div><div class="grid gap-4 sm:grid-cols-3">${renderComponent($$result, "StepCard", $$StepCard, {
		"step": "01",
		"icon": Users,
		"title": "Conecta tu cuenta",
		"description": "Inicia sesión con tu cuenta de LALIGA FANTASY. El acceso se guarda en tu sesión local, de forma segura."
	})}${renderComponent($$result, "StepCard", $$StepCard, {
		"step": "02",
		"icon": BarChart3,
		"title": "Revisa tu liga",
		"description": "Explora tu plantilla, alineación, mercado y clasificación con datos actualizados de cada jornada."
	})}${renderComponent($$result, "StepCard", $$StepCard, {
		"step": "03",
		"icon": Zap,
		"title": "Actúa con criterio",
		"description": "Aplica las recomendaciones de compra, venta, capitán y cláusulas antes del cierre de la jornada."
	})}</div></div></section><!-- Final CTA --><section class="px-4 py-16 sm:py-24"><div class="container max-w-4xl"><div class="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-surface p-10 text-center sm:p-14"><div class="relative z-10"><h2 class="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">Empieza a gestionar como un profesional</h2><p class="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">Conecta tu cuenta ahora y accede a tu centro de comando. La próxima jornada empieza antes del pitido inicial.</p><a href="/login" class="mt-8 inline-flex max-w-full">${renderComponent($$result, "Button", Button, {
		"size": "lg",
		"className": "h-auto min-h-12 gap-2 whitespace-normal px-6 py-3 text-center text-sm font-medium sm:text-base"
	}, { "default": ($$result) => renderTemplate`Conectar mi cuenta de LALIGA FANTASY${renderComponent($$result, "ArrowRight", ArrowRight, { "className": "h-5 w-5 shrink-0" })}` })}</a></div></div></div></section></main><footer class="border-t border-white/[0.04] bg-background px-4 py-8"><div class="container flex flex-col items-center justify-between gap-4 sm:flex-row"><a href="/" class="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"><div class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 border border-white/[0.08]">${renderComponent($$result, "Trophy", Trophy, { "className": "h-4 w-4 text-foreground" })}</div><span class="font-display tracking-tight">Fantasy<span class="text-brand-muted">Manager</span></span></a><div class="text-xs text-muted-foreground">© ${(/* @__PURE__ */ new Date()).getFullYear()} Fantasy Manager · Uso personal</div></div></footer></div></body></html>`;
}, "/home/rezzt/personal-data/deploy-projects/fantasy-manager/src/pages/index.astro", void 0);
var $$file = "/home/rezzt/personal-data/deploy-projects/fantasy-manager/src/pages/index.astro";
//#endregion
//#region \0virtual:astro:page:src/pages/index@_@astro
var page = () => pages_exports;
//#endregion
export { page };
