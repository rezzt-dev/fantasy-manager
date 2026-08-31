import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/lib/utils.ts
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
//#endregion
//#region src/components/brand/Logo.tsx
function LogoMark({ className, monochrome = false, draw = false }) {
	const mark = draw ? { "data-logo-mark": "" } : {};
	const stroke = draw ? { "data-logo-stroke": "" } : {};
	const dot = draw ? { "data-logo-dot": "" } : {};
	return /* @__PURE__ */ jsxs("svg", {
		viewBox: "0 0 24 24",
		fill: "none",
		className: cn("h-6 w-6", className),
		"aria-hidden": "true",
		focusable: "false",
		...mark,
		children: [
			/* @__PURE__ */ jsx("rect", {
				x: "2.75",
				y: "4.75",
				width: "18.5",
				height: "14.5",
				rx: "3",
				stroke: "currentColor",
				strokeWidth: "1.5",
				opacity: "0.55",
				...stroke
			}),
			/* @__PURE__ */ jsx("path", {
				d: "M12 4.75v14.5",
				stroke: "currentColor",
				strokeWidth: "1.5",
				opacity: "0.55",
				...stroke
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: "12",
				cy: "12",
				r: "3.6",
				stroke: "currentColor",
				strokeWidth: "1.5",
				...stroke
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: "15.1",
				cy: "9.4",
				r: "2.1",
				fill: monochrome ? "currentColor" : "hsl(var(--accent))",
				...dot
			})
		]
	});
}
function Logo({ className, size = "md", markOnly = false, draw = false }) {
	const mark = {
		sm: "h-5 w-5",
		md: "h-6 w-6",
		lg: "h-8 w-8"
	}[size];
	const text = {
		sm: "text-sm",
		md: "text-[15px]",
		lg: "text-xl"
	}[size];
	return /* @__PURE__ */ jsxs("span", {
		className: cn("inline-flex items-center gap-2.5 text-content", className),
		children: [/* @__PURE__ */ jsx(LogoMark, {
			className: mark,
			draw
		}), !markOnly && /* @__PURE__ */ jsxs("span", {
			className: cn("font-display font-semibold tracking-[-0.03em] leading-none", text),
			children: ["Fantasy", /* @__PURE__ */ jsx("span", {
				className: "text-content-tertiary",
				children: "Manager"
			})]
		})]
	});
}
//#endregion
export { cn as n, Logo as t };
