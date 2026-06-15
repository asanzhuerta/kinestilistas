import { spawnSync } from "node:child_process";

function runNpmScript(scriptName) {
	if (process.platform === "win32") {
		return spawnSync("cmd.exe", ["/d", "/s", "/c", "npm", "run", scriptName], {
			stdio: "inherit",
			shell: false,
		});
	}

	return spawnSync("npm", ["run", scriptName], {
		stdio: "inherit",
		shell: false,
	});
}

const steps = [
	["business:route-smoke", "calculo de puntos de ruta"],
	["m4:closeout", "ciclo de pedido, reparto y entrega"],
	["m4:partial-payment-smoke", "cobros parciales e historial"],
	["m6:promotion-discount-smoke", "promociones en borrador y pedido"],
];

for (const [scriptName, label] of steps) {
	console.log(`\n== ${label} (${scriptName}) ==`);

	const result = runNpmScript(scriptName);

	if (result.status !== 0) {
		if (result.error) {
			console.error(result.error.message);
		}

		console.error(`\nBusiness critical smoke FAILED en ${scriptName}`);
		process.exit(result.status ?? 1);
	}
}

console.log("\nBusiness critical smoke OK");
