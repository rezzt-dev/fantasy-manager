import { g as createRenderInstruction } from "./server_B24jXW4u.mjs";
//#region node_modules/.pnpm/astro@7.2.2_@emnapi+core@1.11.1_@emnapi+runtime@1.11.3_@types+node@26.2.0_@upstash+redi_ebca85d2548909f750ea74eae4debbc1/node_modules/astro/dist/runtime/server/render/script.js
async function renderScript(result, id) {
	const inlined = result.inlinedScripts.get(id);
	let content = "";
	if (inlined != null) {
		if (inlined) content = `<script type="module">${inlined}<\/script>`;
	} else {
		const resolved = await result.resolve(id);
		content = `<script type="module" src="${result.userAssetsBase ? (result.base === "/" ? "" : result.base) + result.userAssetsBase : ""}${resolved}"><\/script>`;
	}
	return createRenderInstruction({
		type: "script",
		id,
		content
	});
}
//#endregion
export { renderScript as t };
