import fs from "node:fs/promises";
import path from "node:path";
import { getDataSource } from "@/lib/typeorm/data-source";
import { Product } from "@/lib/typeorm/entities/Product";
import { uploadCatalogImage } from "@/lib/cloudinary";

const DEFAULT_SOURCE_DIR = path.resolve(
	process.cwd(),
	"..",
	"examples",
	"Uploads de prueba APP",
	"PRODUCTOS",
);
const DEFAULT_PROCESSED_DIR_NAME = "añadidos";
const IMAGE_EXTENSIONS = new Set([".avif", ".jpeg", ".jpg", ".png", ".webp"]);
const FILE_NOISE_TOKENS = new Set([
	"jpg",
	"jpeg",
	"kinactif",
	"kincrem",
	"kincare",
	"kinstyle",
	"png",
	"sachet",
	"web",
]);

type CliOptions = {
	sourceDir: string;
	processedDir: string;
	dryRun: boolean;
	moveProcessed: boolean;
	skipExisting: boolean;
};

type ProductMatch = Pick<
	Product,
	"id" | "name" | "reference" | "image_url"
>;

type ScoredProduct = {
	product: ProductMatch;
	score: number;
	reason: "reference" | "name" | "tokens";
};

function isScoredProduct(value: ScoredProduct | null): value is ScoredProduct {
	return value !== null;
}

function parseArgs(argv: string[]): CliOptions {
	const options: CliOptions = {
		sourceDir: DEFAULT_SOURCE_DIR,
		processedDir: "",
		dryRun: false,
		moveProcessed: true,
		skipExisting: false,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];

		if (arg === "--dry-run") {
			options.dryRun = true;
			continue;
		}

		if (arg === "--no-move") {
			options.moveProcessed = false;
			continue;
		}

		if (arg === "--skip-existing") {
			options.skipExisting = true;
			continue;
		}

		if (arg === "--help" || arg === "-h") {
			printHelp();
			process.exit(0);
		}

		if (arg.startsWith("--source=")) {
			options.sourceDir = path.resolve(arg.slice("--source=".length));
			continue;
		}

		if (arg === "--source") {
			const value = argv[index + 1];
			if (!value) {
				throw new Error("Falta valor para --source");
			}
			options.sourceDir = path.resolve(value);
			index += 1;
			continue;
		}

		if (arg.startsWith("--processed-dir=")) {
			options.processedDir = path.resolve(
				arg.slice("--processed-dir=".length),
			);
			continue;
		}

		if (arg === "--processed-dir") {
			const value = argv[index + 1];
			if (!value) {
				throw new Error("Falta valor para --processed-dir");
			}
			options.processedDir = path.resolve(value);
			index += 1;
			continue;
		}

		throw new Error(`Argumento no reconocido: ${arg}`);
	}

	if (!options.processedDir) {
		options.processedDir = path.join(
			options.sourceDir,
			DEFAULT_PROCESSED_DIR_NAME,
		);
	}

	return options;
}

function printHelp() {
	console.log(`Uso:
  npm run catalog:upload-product-images -- --dry-run
  npm run catalog:upload-product-images
  npm run catalog:upload-product-images -- --source "C:\\ruta\\PRODUCTOS"

Opciones:
  --dry-run          Solo muestra coincidencias, no sube ni actualiza.
  --source <ruta>    Carpeta con imagenes pendientes.
  --processed-dir    Carpeta destino para imagenes procesadas.
  --no-move          No mueve archivos tras actualizar.
  --skip-existing    No actualiza productos que ya tengan image_url.
`);
}

function normalizeText(value: string) {
	return value
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/&/g, " and ")
		.replace(/[^a-z0-9]+/g, " ")
		.trim()
		.replace(/\s+/g, " ");
}

function tokenize(value: string) {
	return normalizeText(value)
		.split(" ")
		.filter((token) => token.length > 0);
}

function getFileTokens(fileName: string) {
	const stem = path.basename(fileName, path.extname(fileName));

	return tokenize(stem).filter((token) => {
		if (FILE_NOISE_TOKENS.has(token)) {
			return false;
		}

		return !/^\d{6,8}$/.test(token);
	});
}

function getFileSearchText(fileName: string) {
	return getFileTokens(fileName).join(" ");
}

function hasTokensInOrder(fileTokens: string[], productTokens: string[]) {
	let cursor = 0;

	for (const productToken of productTokens) {
		const nextIndex = fileTokens.findIndex(
			(fileToken, index) => index >= cursor && fileToken === productToken,
		);

		if (nextIndex === -1) {
			return false;
		}

		cursor = nextIndex + 1;
	}

	return true;
}

function scoreProductMatch(fileName: string, product: ProductMatch) {
	const fileTokens = getFileTokens(fileName);
	const fileSearchText = fileTokens.join(" ");
	const productName = normalizeText(product.name);
	const productTokens = tokenize(product.name);
	const productReference = normalizeText(product.reference);

	if (productReference && fileTokens.includes(productReference)) {
		return {
			product,
			score: 10000 + productReference.length,
			reason: "reference" as const,
		};
	}

	if (productName && fileSearchText.includes(productName)) {
		return {
			product,
			score: 5000 + productName.length,
			reason: "name" as const,
		};
	}

	if (productTokens.length > 1 && hasTokensInOrder(fileTokens, productTokens)) {
		return {
			product,
			score:
				3000 +
				productTokens.reduce((total, token) => total + token.length, 0),
			reason: "tokens" as const,
		};
	}

	return null;
}

function resolveMatches(
	fileName: string,
	products: ProductMatch[],
): {
	matches: ProductMatch[];
	reason: ScoredProduct["reason"] | null;
	error: string | null;
} {
	const scoredProducts = products
		.map((product) => scoreProductMatch(fileName, product))
		.filter(isScoredProduct)
		.toSorted((a, b) => b.score - a.score);

	if (scoredProducts.length === 0) {
		return {
			matches: [],
			reason: null,
			error: `No se encontro producto para "${fileName}" (${getFileSearchText(fileName)})`,
		};
	}

	const topScore = scoredProducts[0].score;
	const topProducts = scoredProducts.filter(
		(scoredProduct) => scoredProduct.score === topScore,
	);
	const topProductNames = new Set(
		topProducts.map((scoredProduct) => normalizeText(scoredProduct.product.name)),
	);

	if (topProductNames.size > 1) {
		return {
			matches: [],
			reason: null,
			error: `Coincidencia ambigua para "${fileName}": ${topProducts
				.map(
					(scoredProduct) =>
						`${scoredProduct.product.name} (${scoredProduct.product.reference})`,
				)
				.join(", ")}`,
		};
	}

	return {
		matches: topProducts.map((scoredProduct) => scoredProduct.product),
		reason: topProducts[0].reason,
		error: null,
	};
}

function getMimeType(filePath: string) {
	const extension = path.extname(filePath).toLowerCase();

	if (extension === ".avif") return "image/avif";
	if (extension === ".jpeg" || extension === ".jpg") return "image/jpeg";
	if (extension === ".png") return "image/png";
	if (extension === ".webp") return "image/webp";

	throw new Error(`Extension no soportada: ${extension}`);
}

async function encodeFileAsDataUri(filePath: string) {
	const bytes = await fs.readFile(filePath);
	return `data:${getMimeType(filePath)};base64,${bytes.toString("base64")}`;
}

async function pathExists(filePath: string) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function getUniqueDestinationPath(destinationPath: string) {
	if (!(await pathExists(destinationPath))) {
		return destinationPath;
	}

	const directory = path.dirname(destinationPath);
	const extension = path.extname(destinationPath);
	const stem = path.basename(destinationPath, extension);

	for (let index = 1; index < 1000; index += 1) {
		const candidate = path.join(directory, `${stem}-${index}${extension}`);

		if (!(await pathExists(candidate))) {
			return candidate;
		}
	}

	throw new Error(`No se pudo generar destino unico para ${destinationPath}`);
}

async function listPendingImages(sourceDir: string) {
	const entries = await fs.readdir(sourceDir, { withFileTypes: true });

	return entries
		.filter((entry) => entry.isFile())
		.filter((entry) => IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
		.map((entry) => ({
			name: entry.name,
			fullPath: path.join(sourceDir, entry.name),
		}))
		.toSorted((a, b) => a.name.localeCompare(b.name, "es"));
}

function formatProducts(products: ProductMatch[]) {
	return products
		.map((product) => `${product.name} [${product.reference}]`)
		.join(", ");
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	const dataSource = await getDataSource();
	const productRepository = dataSource.getRepository(Product);

	try {
		const [products, pendingImages] = await Promise.all([
			productRepository.find({
				select: {
					id: true,
					name: true,
					reference: true,
					image_url: true,
				},
				order: {
					name: "ASC",
				},
			}),
			listPendingImages(options.sourceDir),
		]);

		if (pendingImages.length === 0) {
			console.log(`No hay imagenes pendientes en ${options.sourceDir}`);
			return;
		}

		if (!options.dryRun && options.moveProcessed) {
			await fs.mkdir(options.processedDir, { recursive: true });
		}

		let matchedCount = 0;
		let uploadedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;

		for (const image of pendingImages) {
			const resolvedMatch = resolveMatches(image.name, products);

			if (resolvedMatch.error) {
				errorCount += 1;
				console.log(`[ERROR] ${resolvedMatch.error}`);
				continue;
			}

			const productsToUpdate = options.skipExisting
				? resolvedMatch.matches.filter((product) => !product.image_url)
				: resolvedMatch.matches;

			if (productsToUpdate.length === 0) {
				skippedCount += 1;
				console.log(
					`[SKIP] ${image.name} -> ${formatProducts(
						resolvedMatch.matches,
					)} ya tiene image_url`,
				);
				continue;
			}

			matchedCount += productsToUpdate.length;

			if (options.dryRun) {
				const existingCount = resolvedMatch.matches.filter(
					(product) => product.image_url,
				).length;
				console.log(
					`[DRY] ${image.name} -> ${formatProducts(productsToUpdate)} via ${
						resolvedMatch.reason
					}${existingCount ? ` (${existingCount} con imagen previa)` : ""}`,
				);
				continue;
			}

			console.log(`[UPLOAD] ${image.name} -> ${formatProducts(productsToUpdate)}`);
			const dataUri = await encodeFileAsDataUri(image.fullPath);
			const uploadResult = await uploadCatalogImage(dataUri);
			const secureUrl = uploadResult.secure_url;

			await productRepository.update(
				productsToUpdate.map((product) => product.id),
				{ image_url: secureUrl },
			);

			uploadedCount += productsToUpdate.length;
			console.log(
				`[OK] ${productsToUpdate.length} producto(s) actualizado(s): ${secureUrl}`,
			);

			if (options.moveProcessed) {
				const destinationPath = await getUniqueDestinationPath(
					path.join(options.processedDir, image.name),
				);
				await fs.rename(image.fullPath, destinationPath);
				console.log(`[MOVE] ${image.name} -> ${destinationPath}`);
			}
		}

		console.log(
			[
				"Resumen:",
				`imagenes=${pendingImages.length}`,
				`coincidencias=${matchedCount}`,
				`actualizados=${uploadedCount}`,
				`omitidos=${skippedCount}`,
				`errores=${errorCount}`,
				options.dryRun ? "modo=dry-run" : "modo=real",
			].join(" "),
		);

		if (errorCount > 0) {
			process.exitCode = 1;
		}
	} finally {
		if (dataSource.isInitialized) {
			await dataSource.destroy();
		}
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
