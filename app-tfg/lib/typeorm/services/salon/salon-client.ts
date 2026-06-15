import type {
	CreateSalonServiceProductUsageBody,
	SalonClientDetail,
	SalonClientSummary,
	SalonProductOption,
	SalonProductSuggestionSummary,
	SalonServiceSummary,
	SalonServiceProductUsageSummary,
	SalonServiceResultImageSummary,
	SalonTechnicalEmailDraft,
} from "@/lib/contracts/salon";
import {
	getVisibleProductReference,
	isSyntheticProductReference,
} from "@/lib/catalog/product-reference";
import {
	deleteImageByUrl,
	isValidCloudinaryImageUrl,
} from "@/lib/cloudinary";
import { normalizeText } from "@/lib/utils/text";
import { getDataSource } from "@/lib/typeorm/data-source";
import { PRODUCT_STATUS_IDS } from "@/lib/typeorm/constants/catalog-ids";
import { ColorReference } from "@/lib/typeorm/entities/ColorReference";
import { Product } from "@/lib/typeorm/entities/Product";
import { SalonClient } from "@/lib/typeorm/entities/SalonClient";
import { SalonService } from "@/lib/typeorm/entities/SalonService";
import { SalonProductSuggestion } from "@/lib/typeorm/entities/SalonProductSuggestion";
import { SalonServiceProductUsage } from "@/lib/typeorm/entities/SalonServiceProductUsage";
import { SalonServiceResultImage } from "@/lib/typeorm/entities/SalonServiceResultImage";
import { SalonServiceTechnicalSheet } from "@/lib/typeorm/entities/SalonServiceTechnicalSheet";
import { listColorReferences } from "@/lib/typeorm/services/catalog/color-chart";
import { listProducts } from "@/lib/typeorm/services/catalog/product";
import { getClientByUserId } from "@/lib/typeorm/services/commercial/client";
import { In, type EntityManager, type Repository } from "typeorm";

type CreateSalonClientInput = {
	name?: string | null;
	phone?: string | null;
	email?: string | null;
	notes?: string | null;
};

type UpdateSalonClientInput = CreateSalonClientInput & {
	salonClientId: string;
};

type CreateSalonServiceInput = {
	serviceDate?: string | null;
	serviceType?: string | null;
	notes?: string | null;
	result?: string | null;
	technicalDescription?: string | null;
	formula?: string | null;
	technicalNotes?: string | null;
	productUsages?: CreateSalonServiceProductUsageBody[] | null;
	resultImages?: string[] | null;
};

type UpdateSalonServiceInput = CreateSalonServiceInput & {
	serviceId: string;
};

type NormalizedSalonProductUsageInput = {
	productId: string;
	colorReferenceId: string | null;
	quantityUsed: string | null;
	notes: string | null;
};

type NormalizedSalonServiceInput = {
	serviceDate: string;
	serviceType: string;
	notes: string | null;
	result: string | null;
	technicalDescription: string | null;
	formula: string | null;
	technicalNotes: string | null;
	productUsages: NormalizedSalonProductUsageInput[];
	resultImages: string[];
};

type SalonClientMetrics = {
	serviceCount: number;
	lastServiceAt: string | null;
};

type ProductSuggestionAggregateRow = {
	product_id: string;
	usage_count: string;
	total_quantity: string | null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toIsoString(value: Date | string | null | undefined) {
	if (!value) {
		return "";
	}

	return value instanceof Date ? value.toISOString() : String(value);
}

function normalizeRequiredText(
	value: string | null | undefined,
	message: string,
	code: string,
) {
	const normalized = normalizeText(value);

	if (!normalized) {
		throw new SalonTechnicalServiceError(message, 400, code);
	}

	return normalized;
}

function normalizeOptionalEmail(value: string | null | undefined) {
	const normalized = normalizeText(value);

	if (!normalized) {
		return null;
	}

	if (!EMAIL_REGEX.test(normalized)) {
		throw new SalonTechnicalServiceError(
			"El correo del cliente del salón no es válido",
			400,
			"SALON_CLIENT_EMAIL_INVALID",
		);
	}

	return normalized.toLowerCase();
}

function normalizeOptionalPhone(value: string | null | undefined) {
	const normalized = normalizeText(value);

	if (!normalized) {
		return null;
	}

	if (normalized.length < 6) {
		throw new SalonTechnicalServiceError(
			"El teléfono del cliente del salón es demasiado corto",
			400,
			"SALON_CLIENT_PHONE_INVALID",
		);
	}

	return normalized;
}

function normalizeServiceDate(value: string | null | undefined) {
	const normalized = String(value ?? "").trim();

	if (!normalized) {
		throw new SalonTechnicalServiceError(
			"Debes indicar la fecha del servicio",
			400,
			"SALON_SERVICE_DATE_REQUIRED",
		);
	}

	if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
		throw new SalonTechnicalServiceError(
			"La fecha del servicio debe seguir el formato YYYY-MM-DD",
			400,
			"SALON_SERVICE_DATE_INVALID",
		);
	}

	const parsed = new Date(`${normalized}T00:00:00.000Z`);

	if (Number.isNaN(parsed.getTime())) {
		throw new SalonTechnicalServiceError(
			"La fecha del servicio no es válida",
			400,
			"SALON_SERVICE_DATE_INVALID",
		);
	}

	return normalized;
}

function normalizeOptionalQuantityUsed(value: number | string | null | undefined) {
	if (value === undefined || value === null || String(value).trim() === "") {
		return null;
	}

	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new SalonTechnicalServiceError(
			"La cantidad usada debe ser un número positivo",
			400,
			"SALON_SERVICE_PRODUCT_USAGE_QUANTITY_INVALID",
		);
	}

	return parsed.toFixed(2);
}

function normalizeResultImageUrls(value: string[] | null | undefined) {
	const sanitized = Array.isArray(value) ? value : [];
	const normalizedUrls: string[] = [];

	for (const rawUrl of sanitized) {
		const imageUrl = String(rawUrl ?? "").trim();

		if (!imageUrl) {
			continue;
		}

		if (!isValidCloudinaryImageUrl(imageUrl)) {
			throw new SalonTechnicalServiceError(
				"Todas las imágenes del resultado final deben estar alojadas en Cloudinary",
				400,
				"SALON_SERVICE_RESULT_IMAGE_INVALID",
			);
		}

		if (!normalizedUrls.includes(imageUrl)) {
			normalizedUrls.push(imageUrl);
		}
	}

	return normalizedUrls;
}

function normalizeProductUsageInputs(
	productUsages: CreateSalonServiceProductUsageBody[] | null | undefined,
) {
	const sanitized = Array.isArray(productUsages) ? productUsages : [];
	const normalizedUsages: NormalizedSalonProductUsageInput[] = [];

	for (const productUsage of sanitized) {
		const productId = String(productUsage?.productId ?? "").trim();
		const colorReferenceId =
			String(productUsage?.colorReferenceId ?? "").trim() || null;
		const quantityUsed = normalizeOptionalQuantityUsed(productUsage?.quantityUsed);
		const notes = normalizeText(productUsage?.notes) || null;
		const isEmptyRow = !productId && !colorReferenceId && !quantityUsed && !notes;

		if (isEmptyRow) {
			continue;
		}

		if (!productId) {
			throw new SalonTechnicalServiceError(
				"Cada producto usado debe indicar un producto del catálogo",
				400,
				"SALON_SERVICE_PRODUCT_USAGE_PRODUCT_REQUIRED",
			);
		}

		normalizedUsages.push({
			productId,
			colorReferenceId,
			quantityUsed,
			notes,
		});
	}

	return normalizedUsages;
}

function normalizeSalonServiceInput(
	input: CreateSalonServiceInput,
): NormalizedSalonServiceInput {
	return {
		serviceDate: normalizeServiceDate(input.serviceDate),
		serviceType: normalizeRequiredText(
			input.serviceType,
			"Debes indicar el tipo de servicio realizado",
			"SALON_SERVICE_TYPE_REQUIRED",
		),
		notes: normalizeText(input.notes) || null,
		result: normalizeText(input.result) || null,
		technicalDescription: normalizeText(input.technicalDescription) || null,
		formula: normalizeText(input.formula) || null,
		technicalNotes: normalizeText(input.technicalNotes) || null,
		productUsages: normalizeProductUsageInputs(input.productUsages),
		resultImages: normalizeResultImageUrls(input.resultImages),
	};
}

function formatQuantity(value: string | number | null | undefined) {
	const parsed = Number(value);

	if (!Number.isFinite(parsed)) {
		return null;
	}

	return parsed.toLocaleString("es-ES", {
		minimumFractionDigits: Number.isInteger(parsed) ? 0 : 2,
		maximumFractionDigits: 2,
	});
}

function formatServiceDateForEmail(value: string) {
	const parsed = new Date(`${value}T00:00:00.000Z`);

	if (Number.isNaN(parsed.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat("es-ES", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	}).format(parsed);
}

function buildColorToneLabel(params: {
	colorReferenceCode?: string | null;
	colorReferenceName?: string | null;
}) {
	const parts = [
		params.colorReferenceCode ? `tono ${params.colorReferenceCode}` : null,
		params.colorReferenceName,
	].filter(Boolean);

	return parts.length > 0 ? parts.join(" | ") : null;
}

function buildTechnicalEmailProductLine(
	productUsage: SalonServiceProductUsageSummary,
) {
	const nameParts = [productUsage.product_name];

	if (productUsage.product_reference) {
		nameParts.push(`ref. ${productUsage.product_reference}`);
	}

	const metadataParts = [productUsage.product_line_name]
		.filter(Boolean)
		.map((value) => String(value));
	const toneLabel = buildColorToneLabel({
		colorReferenceCode: productUsage.color_reference_code,
		colorReferenceName: productUsage.color_reference_name,
	});

	if (toneLabel) {
		metadataParts.push(toneLabel);
	}

	const quantityLabel = formatQuantity(productUsage.quantity_used);

	if (quantityLabel) {
		metadataParts.push(`Cantidad: ${quantityLabel} uds`);
	}

	if (productUsage.notes) {
		metadataParts.push(`Notas: ${productUsage.notes}`);
	}

	return metadataParts.length > 0
		? `- ${nameParts.join(" | ")} | ${metadataParts.join(" | ")}`
		: `- ${nameParts.join(" | ")}`;
}

function buildTechnicalEmailSuggestionLine(
	suggestion: SalonProductSuggestionSummary,
) {
	const productParts = [suggestion.product_name];

	if (suggestion.product_reference) {
		productParts.push(`ref. ${suggestion.product_reference}`);
	}

	const metadataParts = [suggestion.product_line_name]
		.filter(Boolean)
		.map((value) => String(value));

	if (suggestion.reason) {
		metadataParts.push(`Motivo: ${suggestion.reason}`);
	}

	return metadataParts.length > 0
		? `- ${productParts.join(" | ")} | ${metadataParts.join(" | ")}`
		: `- ${productParts.join(" | ")}`;
}

function buildSalonTechnicalEmailDraft(params: {
	clientName: string;
	salonClient: SalonClientSummary;
	service: SalonServiceSummary;
	suggestions: SalonProductSuggestionSummary[];
}): SalonTechnicalEmailDraft {
	const { clientName, salonClient, service, suggestions } = params;
	const subject = `Resumen técnico ${service.service_type} - ${salonClient.name} - ${service.service_date}`;
	const lines = [
		`Hola ${salonClient.name},`,
		"",
		`Te compartimos el resumen técnico de tu servicio realizado el ${formatServiceDateForEmail(
			service.service_date,
		)}.`,
		"",
		"Resumen del servicio",
		`- Tipo: ${service.service_type}`,
		`- Fecha: ${formatServiceDateForEmail(service.service_date)}`,
		`- Resumen del resultado: ${service.result || "Sin resumen descrito"}`,
		`- Descripción técnica: ${service.technical_description || "Sin descripción técnica"}`,
		`- Formula: ${service.formula || "Sin formula registrada"}`,
		`- Notas técnicas: ${service.technical_notes || "Sin notas técnicas"}`,
	];

	if (service.result_images.length > 0) {
		lines.push(
			`- Resultado visual: ${service.result_images.length} imagen(es) registradas en la ficha`,
		);
	}

	if (service.notes) {
		lines.push(`- Observaciones del servicio: ${service.notes}`);
	}

	lines.push("", "Productos utilizados");

	if (service.product_usages.length === 0) {
		lines.push("- No se registraron productos concretos en este servicio.");
	} else {
		lines.push(
			...service.product_usages.map((productUsage) =>
				buildTechnicalEmailProductLine(productUsage),
			),
		);
	}

	if (suggestions.length > 0) {
		lines.push("", "Sugerencias de mantenimiento");
		lines.push(
			...suggestions.map((suggestion) =>
				buildTechnicalEmailSuggestionLine(suggestion),
			),
		);
	}

	lines.push(
		"",
		"Si necesitas aclarar cualquier detalle del servicio o del mantenimiento posterior, escribenos y lo revisamos contigo.",
		"",
		`Un saludo,`,
		clientName,
	);

	return {
		salon_client_id: salonClient.id,
		service_id: service.id,
		recipient_name: salonClient.name,
		recipient_email: salonClient.email ?? null,
		service_type: service.service_type,
		service_date: service.service_date,
		subject,
		body: lines.join("\n"),
		generated_at: new Date().toISOString(),
	};
}

function buildSuggestionReason(usageCount: number, totalQuantity: string | null) {
	const quantityLabel = formatQuantity(totalQuantity);

	if (quantityLabel) {
		return `Usado en ${usageCount} servicios del historial y con ${quantityLabel} unidades registradas.`;
	}

	return `Usado en ${usageCount} servicios del historial técnico.`;
}

function mapSalonServiceResultImage(
	resultImage: SalonServiceResultImage,
): SalonServiceResultImageSummary {
	return {
		id: resultImage.id,
		service_id: resultImage.service_id,
		image_url: resultImage.image_url,
		display_order: resultImage.display_order,
		created_at: toIsoString(resultImage.created_at),
	};
}

function mapSalonServiceProductUsage(
	productUsage: SalonServiceProductUsage,
): SalonServiceProductUsageSummary {
	return {
		id: productUsage.id,
		product_id: productUsage.product_id,
		color_reference_id: productUsage.color_reference_id ?? null,
		color_reference_code: productUsage.colorReference?.code ?? null,
		color_reference_name: productUsage.colorReference?.name ?? null,
		product_name: productUsage.product?.name ?? "Producto",
		product_reference: getVisibleProductReference(
			productUsage.product?.reference ?? null,
		),
		product_line_name: productUsage.product?.productLine?.name ?? null,
		quantity_used: productUsage.quantity_used ?? null,
		notes: productUsage.notes ?? null,
	};
}

function mapSalonService(service: SalonService): SalonServiceSummary {
	const sortedProductUsages = [...(service.productUsages ?? [])].sort((a, b) => {
		const lineCompare = String(a.product?.productLine?.name ?? "").localeCompare(
			String(b.product?.productLine?.name ?? ""),
			"es",
			{ sensitivity: "base" },
		);

		if (lineCompare !== 0) {
			return lineCompare;
		}

		return String(a.product?.name ?? "").localeCompare(
			String(b.product?.name ?? ""),
			"es",
			{ sensitivity: "base" },
		);
	});
	const sortedResultImages = [...(service.resultImages ?? [])].sort((a, b) => {
		const displayOrderCompare = a.display_order - b.display_order;

		if (displayOrderCompare !== 0) {
			return displayOrderCompare;
		}

		return a.created_at.getTime() - b.created_at.getTime();
	});

	return {
		id: service.id,
		salon_client_id: service.salon_client_id,
		client_id: service.client_id,
		recorded_by_user_id: service.recorded_by_user_id,
		service_date: service.service_date,
		service_type: service.service_type,
		notes: service.notes ?? null,
		result: service.result ?? null,
		technical_description: service.technicalSheet?.technical_description ?? null,
		formula: service.technicalSheet?.formula ?? null,
		technical_notes: service.technicalSheet?.technical_notes ?? null,
		product_usages: sortedProductUsages.map(mapSalonServiceProductUsage),
		result_images: sortedResultImages.map(mapSalonServiceResultImage),
		created_at: toIsoString(service.created_at),
		updated_at: toIsoString(service.updated_at),
	};
}

function mapSalonProductSuggestion(
	suggestion: SalonProductSuggestion,
): SalonProductSuggestionSummary {
	return {
		id: suggestion.id,
		salon_client_id: suggestion.salon_client_id,
		product_id: suggestion.product_id,
		product_name: suggestion.product?.name ?? "Producto",
		product_reference: getVisibleProductReference(
			suggestion.product?.reference ?? null,
		),
		product_line_name: suggestion.product?.productLine?.name ?? null,
		reason: suggestion.reason,
		generated_at: toIsoString(suggestion.generated_at),
	};
}

function buildSalonClientSummary(
	salonClient: SalonClient,
	metrics: SalonClientMetrics,
): SalonClientSummary {
	return {
		id: salonClient.id,
		client_id: salonClient.client_id,
		name: salonClient.name,
		phone: salonClient.phone ?? null,
		email: salonClient.email ?? null,
		notes: salonClient.notes ?? null,
		service_count: metrics.serviceCount,
		last_service_at: metrics.lastServiceAt,
		created_at: toIsoString(salonClient.created_at),
		updated_at: toIsoString(salonClient.updated_at),
	};
}

function createSalonServicesBaseQuery(repo: Repository<SalonService>) {
	return repo
		.createQueryBuilder("service")
		.leftJoinAndSelect("service.technicalSheet", "technicalSheet")
		.leftJoinAndSelect("service.productUsages", "productUsage")
		.leftJoinAndSelect("productUsage.colorReference", "colorReference")
		.leftJoinAndSelect("productUsage.product", "product")
		.leftJoinAndSelect("product.productLine", "productLine")
		.leftJoinAndSelect("service.resultImages", "resultImage");
}

async function requireClientProfileForUser(userId: string) {
	const client = await getClientByUserId(userId);

	if (!client) {
		throw new SalonTechnicalServiceError(
			"No existe una ficha de cliente profesional para este usuario",
			404,
			"SALON_CLIENT_OWNER_NOT_FOUND",
		);
	}

	return client;
}

async function requireOwnedSalonClient(clientId: string, salonClientId: string) {
	const ds = await getDataSource();
	const salonClient = await ds.getRepository(SalonClient).findOne({
		where: {
			id: salonClientId,
			client_id: clientId,
		},
	});

	if (!salonClient) {
		throw new SalonTechnicalServiceError(
			"La ficha técnica solicitada no existe",
			404,
			"SALON_CLIENT_NOT_FOUND",
		);
	}

	return salonClient;
}

async function requireOwnedSalonService(
	manager: EntityManager,
	clientId: string,
	salonClientId: string,
	serviceId: string,
) {
	const service = await manager.getRepository(SalonService).findOne({
		where: {
			id: serviceId,
			client_id: clientId,
			salon_client_id: salonClientId,
		},
	});

	if (!service) {
		throw new SalonTechnicalServiceError(
			"El servicio técnico solicitado no existe",
			404,
			"SALON_SERVICE_NOT_FOUND",
		);
	}

	return service;
}

async function getOwnedSalonServiceDetail(
	manager: EntityManager,
	clientId: string,
	salonClientId: string,
	serviceId: string,
) {
	const service = await createSalonServicesBaseQuery(
		manager.getRepository(SalonService),
	)
		.where("service.id = :serviceId", { serviceId })
		.andWhere("service.client_id = :clientId", { clientId })
		.andWhere("service.salon_client_id = :salonClientId", { salonClientId })
		.orderBy("productUsage.created_at", "ASC")
		.addOrderBy("resultImage.display_order", "ASC")
		.addOrderBy("resultImage.created_at", "ASC")
		.getOne();

	if (!service) {
		throw new SalonTechnicalServiceError(
			"El servicio técnico solicitado no existe",
			404,
			"SALON_SERVICE_NOT_FOUND",
		);
	}

	return service;
}

async function getSalonClientMetrics(
	manager: EntityManager,
	salonClientId: string,
): Promise<SalonClientMetrics> {
	const rawMetrics = await manager
		.getRepository(SalonService)
		.createQueryBuilder("service")
		.select("COUNT(service.id)", "service_count")
		.addSelect("MAX(service.service_date)", "last_service_at")
		.where("service.salon_client_id = :salonClientId", { salonClientId })
		.getRawOne<{
			service_count?: string;
			last_service_at?: string | null;
		}>();

	return {
		serviceCount: Number(rawMetrics?.service_count ?? 0),
		lastServiceAt: rawMetrics?.last_service_at ?? null,
	};
}

async function ensureSalonProductUsagesAreValid(
	manager: EntityManager,
	productUsages: NormalizedSalonProductUsageInput[],
) {
	if (productUsages.length === 0) {
		return;
	}

	const productIds = productUsages.map((productUsage) => productUsage.productId);
	const uniqueProductIds = Array.from(new Set(productIds));
	const products = await manager.getRepository(Product).findBy({
		id: In(uniqueProductIds),
	});

	if (products.length !== uniqueProductIds.length) {
		throw new SalonTechnicalServiceError(
			"Alguno de los productos indicados ya no existe en el catálogo",
			400,
			"SALON_SERVICE_PRODUCT_USAGE_PRODUCT_NOT_FOUND",
		);
	}

	const colorReferenceRepo = manager.getRepository(ColorReference);
	const linkedColorReferences = await colorReferenceRepo.findBy({
		product_id: In(uniqueProductIds),
	});
	const colorReferenceIds = Array.from(
		new Set(
			productUsages
				.map((productUsage) => productUsage.colorReferenceId)
				.filter((value): value is string => Boolean(value)),
		),
	);
	const selectedColorReferences =
		colorReferenceIds.length > 0
			? await colorReferenceRepo.findBy({
					id: In(colorReferenceIds),
				})
			: [];
	const selectedColorReferenceById = new Map(
		selectedColorReferences.map((colorReference) => [colorReference.id, colorReference]),
	);
	const linkedColorReferencesByProductId = linkedColorReferences.reduce<
		Map<string, ColorReference[]>
	>((acc, colorReference) => {
		if (!colorReference.product_id) {
			return acc;
		}

		const current = acc.get(colorReference.product_id) ?? [];
		current.push(colorReference);
		acc.set(colorReference.product_id, current);
		return acc;
	}, new Map());

	for (const productUsage of productUsages) {
		const linkedVariants =
			linkedColorReferencesByProductId.get(productUsage.productId) ?? [];

		if (linkedVariants.length === 0) {
			if (productUsage.colorReferenceId) {
				throw new SalonTechnicalServiceError(
					"La tonalidad seleccionada no corresponde con el producto indicado",
					400,
					"SALON_SERVICE_PRODUCT_USAGE_COLOR_REFERENCE_INVALID",
				);
			}

			continue;
		}

		if (!productUsage.colorReferenceId) {
			throw new SalonTechnicalServiceError(
				"Debes indicar la tonalidad concreta para cada tinte o producto de coloración",
				400,
				"SALON_SERVICE_PRODUCT_USAGE_COLOR_REFERENCE_REQUIRED",
			);
		}

		const selectedColorReference = selectedColorReferenceById.get(
			productUsage.colorReferenceId,
		);

		if (
			!selectedColorReference ||
			selectedColorReference.product_id !== productUsage.productId
		) {
			throw new SalonTechnicalServiceError(
				"La tonalidad seleccionada no corresponde con el producto indicado",
				400,
				"SALON_SERVICE_PRODUCT_USAGE_COLOR_REFERENCE_INVALID",
			);
		}
	}
}

async function rebuildSalonProductSuggestions(
	manager: EntityManager,
	salonClientId: string,
) {
	const suggestionRepo = manager.getRepository(SalonProductSuggestion);

	const aggregatedRows = await manager
		.getRepository(SalonServiceProductUsage)
		.createQueryBuilder("productUsage")
		.innerJoin("productUsage.service", "service")
		.select("productUsage.product_id", "product_id")
		.addSelect("COUNT(*)", "usage_count")
		.addSelect("SUM(COALESCE(productUsage.quantity_used, 0))", "total_quantity")
		.where("service.salon_client_id = :salonClientId", { salonClientId })
		.groupBy("productUsage.product_id")
		.orderBy("COUNT(*)", "DESC")
		.addOrderBy("SUM(COALESCE(productUsage.quantity_used, 0))", "DESC")
		.limit(3)
		.getRawMany<ProductSuggestionAggregateRow>();

	await suggestionRepo.delete({
		salon_client_id: salonClientId,
	});

	if (aggregatedRows.length === 0) {
		return;
	}

	const now = new Date();

	await suggestionRepo.save(
		aggregatedRows.map((row) =>
			suggestionRepo.create({
				salon_client_id: salonClientId,
				product_id: row.product_id,
				reason: buildSuggestionReason(
					Number(row.usage_count ?? 0),
					row.total_quantity ?? null,
				),
				generated_at: now,
			}),
		),
	);
}

async function upsertSalonServiceTechnicalSheet(
	manager: EntityManager,
	serviceId: string,
	input: Pick<
		NormalizedSalonServiceInput,
		"technicalDescription" | "formula" | "technicalNotes"
	>,
) {
	const technicalSheetRepo = manager.getRepository(SalonServiceTechnicalSheet);
	const currentTechnicalSheet = await technicalSheetRepo.findOne({
		where: {
			service_id: serviceId,
		},
	});

	if (currentTechnicalSheet) {
		currentTechnicalSheet.technical_description = input.technicalDescription;
		currentTechnicalSheet.formula = input.formula;
		currentTechnicalSheet.technical_notes = input.technicalNotes;
		await technicalSheetRepo.save(currentTechnicalSheet);
		return;
	}

	await technicalSheetRepo.save(
		technicalSheetRepo.create({
			service_id: serviceId,
			technical_description: input.technicalDescription,
			formula: input.formula,
			technical_notes: input.technicalNotes,
		}),
	);
}

async function replaceSalonServiceProductUsages(
	manager: EntityManager,
	serviceId: string,
	productUsages: NormalizedSalonProductUsageInput[],
) {
	const productUsageRepo = manager.getRepository(SalonServiceProductUsage);

	await productUsageRepo.delete({
		service_id: serviceId,
	});

	if (productUsages.length === 0) {
		return;
	}

	await productUsageRepo.save(
		productUsages.map((productUsage) =>
			productUsageRepo.create({
				service_id: serviceId,
				product_id: productUsage.productId,
				color_reference_id: productUsage.colorReferenceId,
				quantity_used: productUsage.quantityUsed,
				notes: productUsage.notes,
			}),
		),
	);
}

async function replaceSalonServiceResultImages(
	manager: EntityManager,
	serviceId: string,
	resultImages: string[],
) {
	const resultImageRepo = manager.getRepository(SalonServiceResultImage);

	await resultImageRepo.delete({
		service_id: serviceId,
	});

	if (resultImages.length === 0) {
		return;
	}

	await resultImageRepo.save(
		resultImages.map((imageUrl, index) =>
			resultImageRepo.create({
				service_id: serviceId,
				image_url: imageUrl,
				display_order: index,
			}),
		),
	);
}

async function deleteSalonResultImagesFromCloudinary(imageUrls: string[]) {
	await Promise.allSettled(
		imageUrls.map(async (imageUrl) => {
			try {
				await deleteImageByUrl(imageUrl);
			} catch (error) {
				console.error(
					"[salon-client] Error borrando imagen de resultado en Cloudinary:",
					error,
				);
			}
		}),
	);
}

async function buildSalonClientDetail(
	clientId: string,
	salonClientId: string,
): Promise<SalonClientDetail> {
	const ds = await getDataSource();
	const salonClient = await requireOwnedSalonClient(clientId, salonClientId);
	const serviceRepo = ds.getRepository(SalonService);
	const suggestionRepo = ds.getRepository(SalonProductSuggestion);
	const [metrics, services, suggestions] = await Promise.all([
		getSalonClientMetrics(ds.manager, salonClient.id),
		createSalonServicesBaseQuery(serviceRepo)
			.where("service.salon_client_id = :salonClientId", { salonClientId })
			.orderBy("service.service_date", "DESC")
			.addOrderBy("service.created_at", "DESC")
			.addOrderBy("productUsage.created_at", "ASC")
			.addOrderBy("resultImage.display_order", "ASC")
			.addOrderBy("resultImage.created_at", "ASC")
			.getMany(),
		suggestionRepo
			.createQueryBuilder("suggestion")
			.leftJoinAndSelect("suggestion.product", "product")
			.leftJoinAndSelect("product.productLine", "productLine")
			.where("suggestion.salon_client_id = :salonClientId", { salonClientId })
			.orderBy("suggestion.generated_at", "DESC")
			.addOrderBy("product.name", "ASC")
			.getMany(),
	]);

	return {
		salonClient: buildSalonClientSummary(salonClient, metrics),
		services: services.map(mapSalonService),
		suggestions: suggestions.map(mapSalonProductSuggestion),
	};
}

export class SalonTechnicalServiceError extends Error {
	status: number;
	code: string;

	constructor(
		message: string,
		status = 400,
		code = "SALON_TECHNICAL_SERVICE_ERROR",
	) {
		super(message);
		this.name = "SalonTechnicalServiceError";
		this.status = status;
		this.code = code;
	}
}

export async function listSalonProductOptions(): Promise<SalonProductOption[]> {
	const [products, colorReferences] = await Promise.all([
		listProducts({
			statusId: PRODUCT_STATUS_IDS.ACTIVE,
		}),
		listColorReferences(),
	]);
	const colorReferencesByProductId = colorReferences.reduce<
		Map<string, Awaited<ReturnType<typeof listColorReferences>>>
	>((acc, colorReference) => {
		if (!colorReference.product_id) {
			return acc;
		}

		const current = acc.get(colorReference.product_id) ?? [];
		current.push(colorReference);
		acc.set(colorReference.product_id, current);
		return acc;
	}, new Map());
	const options: SalonProductOption[] = [];

	for (const product of products) {
		const linkedColorReferences =
			colorReferencesByProductId.get(product.id)?.sort((a, b) => {
				const displayOrderCompare = a.display_order - b.display_order;

				if (displayOrderCompare !== 0) {
					return displayOrderCompare;
				}

				return String(a.erp_reference ?? a.code).localeCompare(
					String(b.erp_reference ?? b.code),
					"es",
					{ sensitivity: "base" },
				);
			}) ?? [];

		if (linkedColorReferences.length > 0) {
			for (const colorReference of linkedColorReferences) {
				options.push({
					id: `${product.id}::${colorReference.id}`,
					productId: product.id,
					colorReferenceId: colorReference.id,
					name: product.name,
					reference: getVisibleProductReference(product.reference),
					productLineName: product.productLine?.name ?? null,
					format: product.format ?? null,
					packing: product.packing ?? null,
					colorReferenceCode: colorReference.code,
					colorReferenceName: colorReference.name,
				});
			}

			continue;
		}

		if (isSyntheticProductReference(product.reference)) {
			continue;
		}

		options.push({
			id: product.id,
			productId: product.id,
			colorReferenceId: null,
			name: product.name,
			reference: product.reference,
			productLineName: product.productLine?.name ?? null,
			format: product.format ?? null,
			packing: product.packing ?? null,
			colorReferenceCode: null,
			colorReferenceName: null,
		});
	}

	return options.sort((a, b) => {
		const lineCompare = String(a.productLineName ?? "").localeCompare(
			String(b.productLineName ?? ""),
			"es",
			{ sensitivity: "base" },
		);

		if (lineCompare !== 0) {
			return lineCompare;
		}

		const nameCompare = a.name.localeCompare(b.name, "es", {
			sensitivity: "base",
		});

		if (nameCompare !== 0) {
			return nameCompare;
		}

		const colorCompare = String(a.colorReferenceCode ?? "").localeCompare(
			String(b.colorReferenceCode ?? ""),
			"es",
			{ sensitivity: "base" },
		);

		if (colorCompare !== 0) {
			return colorCompare;
		}

		return String(a.reference ?? "").localeCompare(
			String(b.reference ?? ""),
			"es",
			{ sensitivity: "base" },
		);
	});
}

export async function listSalonClientsForClientUser(userId: string) {
	const client = await requireClientProfileForUser(userId);
	const ds = await getDataSource();
	const rows = await ds
		.getRepository(SalonClient)
		.createQueryBuilder("salonClient")
		.leftJoin(SalonService, "service", "service.salon_client_id = salonClient.id")
		.select("salonClient.id", "id")
		.addSelect("salonClient.client_id", "client_id")
		.addSelect("salonClient.name", "name")
		.addSelect("salonClient.phone", "phone")
		.addSelect("salonClient.email", "email")
		.addSelect("salonClient.notes", "notes")
		.addSelect("salonClient.created_at", "created_at")
		.addSelect("salonClient.updated_at", "updated_at")
		.addSelect("COUNT(service.id)", "service_count")
		.addSelect("MAX(service.service_date)", "last_service_at")
		.where("salonClient.client_id = :clientId", {
			clientId: client.id,
		})
		.groupBy("salonClient.id")
		.addGroupBy("salonClient.client_id")
		.addGroupBy("salonClient.name")
		.addGroupBy("salonClient.phone")
		.addGroupBy("salonClient.email")
		.addGroupBy("salonClient.notes")
		.addGroupBy("salonClient.created_at")
		.addGroupBy("salonClient.updated_at")
		.orderBy("MAX(service.service_date)", "DESC", "NULLS LAST")
		.addOrderBy("salonClient.updated_at", "DESC")
		.getRawMany<{
			id: string;
			client_id: string;
			name: string;
			phone: string | null;
			email: string | null;
			notes: string | null;
			created_at: string | Date;
			updated_at: string | Date;
			service_count: string;
			last_service_at: string | null;
		}>();

	return rows.map((row) => ({
		id: row.id,
		client_id: row.client_id,
		name: row.name,
		phone: row.phone ?? null,
		email: row.email ?? null,
		notes: row.notes ?? null,
		service_count: Number(row.service_count ?? 0),
		last_service_at: row.last_service_at ?? null,
		created_at: toIsoString(row.created_at),
		updated_at: toIsoString(row.updated_at),
	}));
}

export async function createSalonClientForClientUser(
	userId: string,
	input: CreateSalonClientInput,
) {
	const client = await requireClientProfileForUser(userId);
	const ds = await getDataSource();
	const repo = ds.getRepository(SalonClient);
	const salonClient = repo.create({
		client_id: client.id,
		name: normalizeRequiredText(
			input.name,
			"Debes indicar el nombre del cliente del salón",
			"SALON_CLIENT_NAME_REQUIRED",
		),
		phone: normalizeOptionalPhone(input.phone),
		email: normalizeOptionalEmail(input.email),
		notes: normalizeText(input.notes) || null,
	});

	const savedSalonClient = await repo.save(salonClient);

	return buildSalonClientSummary(savedSalonClient, {
		serviceCount: 0,
		lastServiceAt: null,
	});
}

export async function getSalonClientDetailForClientUser(
	userId: string,
	salonClientId: string,
) {
	const client = await requireClientProfileForUser(userId);
	return buildSalonClientDetail(client.id, salonClientId);
}

export async function getSalonTechnicalEmailDraftForClientUser(
	userId: string,
	salonClientId: string,
	serviceId: string,
) {
	const client = await requireClientProfileForUser(userId);
	const ds = await getDataSource();
	const suggestionRepo = ds.getRepository(SalonProductSuggestion);
	const salonClient = await requireOwnedSalonClient(client.id, salonClientId);
	const [service, suggestions] = await Promise.all([
		getOwnedSalonServiceDetail(ds.manager, client.id, salonClient.id, serviceId),
		suggestionRepo
			.createQueryBuilder("suggestion")
			.leftJoinAndSelect("suggestion.product", "product")
			.leftJoinAndSelect("product.productLine", "productLine")
			.where("suggestion.salon_client_id = :salonClientId", {
				salonClientId: salonClient.id,
			})
			.orderBy("suggestion.generated_at", "DESC")
			.addOrderBy("product.name", "ASC")
			.getMany(),
	]);

	return buildSalonTechnicalEmailDraft({
		clientName: client.name,
		salonClient: buildSalonClientSummary(salonClient, {
			serviceCount: 0,
			lastServiceAt: null,
		}),
		service: mapSalonService(service),
		suggestions: suggestions.map(mapSalonProductSuggestion),
	});
}

export async function updateSalonClientForClientUser(
	userId: string,
	input: UpdateSalonClientInput,
) {
	const client = await requireClientProfileForUser(userId);
	const ds = await getDataSource();
	const salonClient = await requireOwnedSalonClient(client.id, input.salonClientId);

	salonClient.name = normalizeRequiredText(
		input.name,
		"Debes indicar el nombre del cliente del salón",
		"SALON_CLIENT_NAME_REQUIRED",
	);
	salonClient.phone = normalizeOptionalPhone(input.phone);
	salonClient.email = normalizeOptionalEmail(input.email);
	salonClient.notes = normalizeText(input.notes) || null;

	const savedSalonClient = await ds.getRepository(SalonClient).save(salonClient);
	const metrics = await getSalonClientMetrics(ds.manager, savedSalonClient.id);

	return buildSalonClientSummary(savedSalonClient, metrics);
}

export async function createSalonServiceForClientUser(
	userId: string,
	salonClientId: string,
	input: CreateSalonServiceInput,
) {
	const client = await requireClientProfileForUser(userId);
	const salonClient = await requireOwnedSalonClient(client.id, salonClientId);
	const normalizedInput = normalizeSalonServiceInput(input);
	const ds = await getDataSource();

	await ds.transaction(async (manager) => {
		await ensureSalonProductUsagesAreValid(
			manager,
			normalizedInput.productUsages,
		);

		const serviceRepo = manager.getRepository(SalonService);

		const createdService = await serviceRepo.save(
			serviceRepo.create({
				salon_client_id: salonClient.id,
				client_id: client.id,
				recorded_by_user_id: userId,
				service_date: normalizedInput.serviceDate,
				service_type: normalizedInput.serviceType,
				notes: normalizedInput.notes,
				result: normalizedInput.result,
			}),
		);

		await upsertSalonServiceTechnicalSheet(
			manager,
			createdService.id,
			normalizedInput,
		);

		await replaceSalonServiceProductUsages(
			manager,
			createdService.id,
			normalizedInput.productUsages,
		);
		await replaceSalonServiceResultImages(
			manager,
			createdService.id,
			normalizedInput.resultImages,
		);

		await rebuildSalonProductSuggestions(manager, salonClient.id);
	});

	return buildSalonClientDetail(client.id, salonClient.id);
}

export async function updateSalonServiceForClientUser(
	userId: string,
	salonClientId: string,
	input: UpdateSalonServiceInput,
) {
	const client = await requireClientProfileForUser(userId);
	const salonClient = await requireOwnedSalonClient(client.id, salonClientId);
	const normalizedInput = normalizeSalonServiceInput(input);
	const ds = await getDataSource();
	const currentService = await getOwnedSalonServiceDetail(
		ds.manager,
		client.id,
		salonClient.id,
		input.serviceId,
	);
	const currentImageUrls = (currentService.resultImages ?? []).map(
		(resultImage) => resultImage.image_url,
	);

	await ds.transaction(async (manager) => {
		await requireOwnedSalonService(manager, client.id, salonClient.id, input.serviceId);
		await ensureSalonProductUsagesAreValid(
			manager,
			normalizedInput.productUsages,
		);

		await manager.getRepository(SalonService).save({
			id: input.serviceId,
			service_date: normalizedInput.serviceDate,
			service_type: normalizedInput.serviceType,
			notes: normalizedInput.notes,
			result: normalizedInput.result,
		});

		await upsertSalonServiceTechnicalSheet(
			manager,
			input.serviceId,
			normalizedInput,
		);
		await replaceSalonServiceProductUsages(
			manager,
			input.serviceId,
			normalizedInput.productUsages,
		);
		await replaceSalonServiceResultImages(
			manager,
			input.serviceId,
			normalizedInput.resultImages,
		);
		await rebuildSalonProductSuggestions(manager, salonClient.id);
	});
	const removedImageUrls = currentImageUrls.filter(
		(imageUrl) => !normalizedInput.resultImages.includes(imageUrl),
	);

	if (removedImageUrls.length > 0) {
		await deleteSalonResultImagesFromCloudinary(removedImageUrls);
	}

	return buildSalonClientDetail(client.id, salonClient.id);
}

export async function deleteSalonServiceForClientUser(
	userId: string,
	salonClientId: string,
	serviceId: string,
) {
	const client = await requireClientProfileForUser(userId);
	const salonClient = await requireOwnedSalonClient(client.id, salonClientId);
	const ds = await getDataSource();
	const currentService = await getOwnedSalonServiceDetail(
		ds.manager,
		client.id,
		salonClient.id,
		serviceId,
	);
	const currentImageUrls = (currentService.resultImages ?? []).map(
		(resultImage) => resultImage.image_url,
	);

	await ds.transaction(async (manager) => {
		await requireOwnedSalonService(manager, client.id, salonClient.id, serviceId);
		await manager.getRepository(SalonService).delete({
			id: serviceId,
		});
		await rebuildSalonProductSuggestions(manager, salonClient.id);
	});

	if (currentImageUrls.length > 0) {
		await deleteSalonResultImagesFromCloudinary(currentImageUrls);
	}

	return buildSalonClientDetail(client.id, salonClient.id);
}
