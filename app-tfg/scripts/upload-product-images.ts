import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
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
const CLOUDINARY_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const TARGET_UPLOAD_BYTES = Math.floor(CLOUDINARY_MAX_UPLOAD_BYTES * 0.9);
const COMPRESSION_WIDTHS = [1800, 1400, 1100, 900];
const COMPRESSION_QUALITIES = [86, 78, 70, 62, 54, 46];
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
	"id" | "name" | "reference" | "format" | "image_url"
>;

type MatchReason =
	| "reference"
	| "name"
	| "tokens"
	| "reference+format"
	| "name+format"
	| "tokens+format";

type ScoredProduct = {
	product: ProductMatch;
	score: number;
	reason: MatchReason;
};

function isScoredProduct(value: ScoredProduct | null): value is ScoredProduct {
	return value !== null;
}

type DuplicateTargetError = {
	product: ProductMatch | undefined;
	imageNames: string[];
};

function isDuplicateTargetError(
	value: DuplicateTargetError | undefined,
): value is DuplicateTargetError {
	return value !== undefined;
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
		.filter((token) => token.length > 0 && token !== "and");
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

function isNumberToken(value: string) {
	return /^\d+$/.test(value);
}

function extractFormatHintFromTokens(tokens: string[]) {
	for (let index = 0; index < tokens.length; index += 1) {
		if (tokens[index] !== "ml") {
			continue;
		}

		if (
			index >= 3 &&
			isNumberToken(tokens[index - 3]) &&
			tokens[index - 2] === "x" &&
			isNumberToken(tokens[index - 1])
		) {
			return `${tokens[index - 3]} x ${tokens[index - 1]} ml`;
		}

		if (
			index >= 2 &&
			isNumberToken(tokens[index - 2]) &&
			/^\d{3}$/.test(tokens[index - 1])
		) {
			return `${tokens[index - 2]}${tokens[index - 1]} ml`;
		}

		if (index >= 1 && isNumberToken(tokens[index - 1])) {
			return `${tokens[index - 1]} ml`;
		}
	}

	return null;
}

function getFileFormatHint(fileName: string) {
	return extractFormatHintFromTokens(getFileTokens(fileName));
}

function normalizeProductFormat(format: string | null) {
	if (!format) {
		return null;
	}

	return extractFormatHintFromTokens(tokenize(format));
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
	const scoredProducts: ScoredProduct[] = [];

	for (const product of products) {
		const scoredProduct = scoreProductMatch(fileName, product);

		if (isScoredProduct(scoredProduct)) {
			scoredProducts.push(scoredProduct);
		}
	}

	scoredProducts.sort((a, b) => b.score - a.score);

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

	const formatHint = getFileFormatHint(fileName);

	if (formatHint && topProducts.length > 1) {
		const formatMatches = topProducts.filter(
			(scoredProduct) =>
				normalizeProductFormat(scoredProduct.product.format) === formatHint,
		);

		if (formatMatches.length === 0) {
			return {
				matches: [],
				reason: null,
				error: `Formato "${formatHint}" no existe para "${fileName}". Candidatos: ${topProducts
					.map(
						(scoredProduct) =>
							`${scoredProduct.product.name} (${scoredProduct.product.reference}, ${
								scoredProduct.product.format ?? "sin formato"
							})`,
					)
					.join(", ")}`,
			};
		}

		return {
			matches: formatMatches.map((scoredProduct) => scoredProduct.product),
			reason: `${formatMatches[0].reason}+format` as MatchReason,
			error: null,
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

function encodeBufferAsDataUri(bytes: Buffer, mimeType: string) {
	return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

async function encodeFileAsDataUri(filePath: string) {
	const bytes = await fs.readFile(filePath);
	return encodeBufferAsDataUri(bytes, getMimeType(filePath));
}

function formatBytes(bytes: number) {
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function compressImageForUpload(filePath: string) {
	let bestBuffer: Buffer | null = null;
	let bestDescription = "";

	for (const width of COMPRESSION_WIDTHS) {
		for (const quality of COMPRESSION_QUALITIES) {
			const buffer = await sharp(filePath, { failOn: "none" })
				.rotate()
				.resize({
					width,
					height: width,
					fit: "inside",
					withoutEnlargement: true,
				})
				.webp({
					quality,
					effort: 6,
				})
				.toBuffer();

			if (!bestBuffer || buffer.length < bestBuffer.length) {
				bestBuffer = buffer;
				bestDescription = `webp ${width}px q${quality}`;
			}

			if (buffer.length <= TARGET_UPLOAD_BYTES) {
				return {
					bytes: buffer,
					mimeType: "image/webp",
					description: `webp ${width}px q${quality}`,
				};
			}
		}
	}

	if (!bestBuffer || bestBuffer.length > CLOUDINARY_MAX_UPLOAD_BYTES) {
		throw new Error(
			`No se pudo comprimir por debajo de ${formatBytes(
				CLOUDINARY_MAX_UPLOAD_BYTES,
			)}. Mejor intento: ${
				bestBuffer ? formatBytes(bestBuffer.length) : "sin resultado"
			}`,
		);
	}

	return {
		bytes: bestBuffer,
		mimeType: "image/webp",
		description: bestDescription,
	};
}

async function prepareImageForUpload(filePath: string) {
	const stat = await fs.stat(filePath);

	if (stat.size <= TARGET_UPLOAD_BYTES) {
		return {
			dataUri: await encodeFileAsDataUri(filePath),
			wasCompressed: false,
			originalBytes: stat.size,
			uploadBytes: stat.size,
			description: "original",
		};
	}

	const compressed = await compressImageForUpload(filePath);

	return {
		dataUri: encodeBufferAsDataUri(compressed.bytes, compressed.mimeType),
		wasCompressed: true,
		originalBytes: stat.size,
		uploadBytes: compressed.bytes.length,
		description: compressed.description,
	};
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
		.map(
			(product) =>
				`${product.name} [${product.reference}${
					product.format ? `, ${product.format}` : ""
				}]`,
		)
		.join(", ");
}

function findDuplicateTargetErrors(
	resolvedImages: Array<{
		imageName: string;
		matches: ProductMatch[];
	}>,
) {
	const imageNamesByProductId = new Map<string, string[]>();
	const productById = new Map<string, ProductMatch>();

	for (const resolvedImage of resolvedImages) {
		for (const product of resolvedImage.matches) {
			productById.set(product.id, product);
			const imageNames = imageNamesByProductId.get(product.id) ?? [];
			imageNames.push(resolvedImage.imageName);
			imageNamesByProductId.set(product.id, imageNames);
		}
	}

	return new Map(
		[...imageNamesByProductId.entries()]
			.filter(([, imageNames]) => imageNames.length > 1)
			.map(([productId, imageNames]) => [
				productId,
				{
					product: productById.get(productId),
					imageNames,
				},
			]),
	);
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
					format: true,
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
		const resolvedMatchesByImage = pendingImages.map((image) => ({
			imageName: image.name,
			resolvedMatch: resolveMatches(image.name, products),
		}));
		const duplicateTargetErrors = findDuplicateTargetErrors(
			resolvedMatchesByImage
				.filter((resolvedImage) => !resolvedImage.resolvedMatch.error)
				.map((resolvedImage) => ({
					imageName: resolvedImage.imageName,
					matches: resolvedImage.resolvedMatch.matches,
				})),
		);

		for (const image of pendingImages) {
			const resolvedMatch = resolvedMatchesByImage.find(
				(resolvedImage) => resolvedImage.imageName === image.name,
			)?.resolvedMatch;

			if (!resolvedMatch) {
				errorCount += 1;
				console.log(`[ERROR] No se pudo resolver ${image.name}`);
				continue;
			}

			if (resolvedMatch.error) {
				errorCount += 1;
				console.log(`[ERROR] ${resolvedMatch.error}`);
				continue;
			}

			const duplicatedTargets = resolvedMatch.matches
				.map((product) => duplicateTargetErrors.get(product.id))
				.filter(isDuplicateTargetError);

			if (duplicatedTargets.length > 0) {
				errorCount += 1;
				console.log(
					`[ERROR] ${image.name} apunta a un producto que tambien aparece en otros archivos: ${duplicatedTargets
						.map((target) => {
							const productLabel = target.product
								? formatProducts([target.product])
								: "producto desconocido";
							return `${productLabel} <= ${target.imageNames.join(", ")}`;
						})
						.join(" | ")}`,
				);
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

			try {
				console.log(`[UPLOAD] ${image.name} -> ${formatProducts(productsToUpdate)}`);
				const preparedImage = await prepareImageForUpload(image.fullPath);

				if (preparedImage.wasCompressed) {
					console.log(
						`[COMPRESS] ${image.name}: ${formatBytes(
							preparedImage.originalBytes,
						)} -> ${formatBytes(preparedImage.uploadBytes)} (${
							preparedImage.description
						})`,
					);
				}

				const uploadResult = await uploadCatalogImage(preparedImage.dataUri);
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
			} catch (error) {
				errorCount += 1;
				console.log(
					`[ERROR] No se pudo procesar "${image.name}": ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
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
