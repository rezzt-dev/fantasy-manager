import { n as cn } from "./Logo_BoEm3omA.mjs";
import * as React$1 from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
//#region src/components/ui/button.tsx
/**
* Los variantes se nombran por JERARQUÍA, no por semántica.
*
*   default   → acción sólida de alto contraste. La que hace avanzar la tarea.
*   accent    → la ÚNICA acción primaria de una pantalla (regla primary-action).
*               Reservada al acento de marca; si hay dos en una vista, sobra una.
*   secondary → acción de apoyo con fondo tenue.
*   outline   → acción de apoyo con borde que cumple 3:1 (WCAG 1.4.11).
*   ghost     → acción terciaria dentro de una barra de herramientas.
*   link      → acción terciaria en línea con el texto.
*   danger    → destructiva. Solo se usa cuando destruir ES la acción principal
*               (normalmente dentro de un diálogo de confirmación); fuera de ahí
*               una acción destructiva va en `ghost`.
*
* El foco no se declara aquí: lo aporta `:focus-visible` global, para que el
* anillo sea idéntico en todo el producto.
*/
var buttonVariants = cva([
	"relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap",
	"font-medium leading-none",
	"transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-out",
	"active:scale-[0.985]",
	"disabled:pointer-events-none disabled:opacity-40",
	"[&_svg]:pointer-events-none [&_svg]:shrink-0",
	"[touch-action:manipulation]"
].join(" "), {
	variants: {
		variant: {
			default: "bg-ink-900 text-ink-50 shadow-1 hover:bg-white hover:shadow-2 active:bg-ink-800",
			accent: "bg-accent text-accent-fg shadow-1 hover:bg-accent-hover hover:shadow-2 active:bg-accent-600",
			secondary: "bg-surface-raised text-content shadow-1 hover:bg-surface-overlay active:bg-ink-400",
			outline: "border border-ink-600 bg-transparent text-content hover:border-ink-700 hover:bg-white/[0.05] active:bg-white/[0.1]",
			ghost: "text-content-secondary hover:bg-white/[0.05] hover:text-content active:bg-white/[0.1]",
			danger: "bg-negative text-ink-50 shadow-1 hover:brightness-110 active:brightness-95",
			link: "text-content underline decoration-ink-600 underline-offset-4 hover:decoration-accent hover:text-accent",
			destructive: "bg-negative text-ink-50 shadow-1 hover:brightness-110",
			"ghost-accent": "text-content hover:bg-white/[0.1] hover:text-white",
			glass: "border border-white/[0.09] bg-white/[0.05] text-content backdrop-blur-sm hover:bg-white/[0.1] hover:border-white/[0.14]",
			pill: "rounded-full border border-white/[0.09] bg-surface-raised text-content hover:bg-surface-overlay"
		},
		size: {
			xs: "h-7 rounded-sm px-2 text-xs [&_svg]:size-3.5",
			sm: "h-9 rounded-md px-3 text-sm [&_svg]:size-4",
			default: "h-10 rounded-md px-4 text-sm [&_svg]:size-4",
			touch: "h-11 rounded-md px-4 text-sm [&_svg]:size-[18px]",
			lg: "h-12 rounded-lg px-6 text-base [&_svg]:size-5",
			icon: "h-10 w-10 rounded-md [&_svg]:size-[18px]",
			"icon-touch": "h-11 w-11 rounded-md [&_svg]:size-5",
			"icon-sm": "h-8 w-8 rounded-md [&_svg]:size-[18px]"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = React$1.forwardRef(({ className, variant, size, loading = false, loadingText, disabled, children, ...props }, ref) => /* @__PURE__ */ jsxs("button", {
	ref,
	className: cn(buttonVariants({
		variant,
		size
	}), className),
	disabled: disabled || loading,
	"aria-busy": loading || void 0,
	...props,
	children: [loading && /* @__PURE__ */ jsx(Loader2, {
		className: "motion-essential animate-spin",
		"aria-hidden": "true"
	}), loading && loadingText ? loadingText : children]
}));
Button.displayName = "Button";
//#endregion
export { Button as t };
