import { QueryFailedError } from "typeorm";
import type { EntityManager } from "typeorm";
import { deleteReplacedCloudinaryImage } from "@/lib/cloudinary";
import { ProductCategory } from "@/lib/typeorm/entities/ProductCategory";
import { ProductLine } from "@/lib/typeorm/entities/ProductLine";
import { ProductSubcategory } from "@/lib/typeorm/entities/ProductSubcategory";
import { ProductStatus } from "@/lib/typeorm/entities/ProductStatus";
import { Product } from "@/lib/typeorm/entities/Product";
import { SupportResourceType } from "@/lib/typeorm/entities/SupportResourceType";
import { SupportResource } from "@/lib/typeorm/entities/SupportResource";
import { ColorChart } from "@/lib/typeorm/entities/ColorChart";
import { ColorReference } from "@/lib/typeorm/entities/ColorReference";

type QueryDriverError = {
	code?: string;
	constraint?: string;
};

const CONSTRAINT_ERRORS: Record<
	string,
	{ message: string; code: string; status?: number }
> = {
	UQ_product_categories_name: {
		message: "Ya existe una categoría con ese nombre",
		code: "DUPLICATE_PRODUCT_CATEGORY_NAME",
		status: 409,
	},
	UQ_product_lines_name: {
		message: "Ya existe una línea comercial con ese nombre",
		code: "DUPLICATE_PRODUCT_LINE_NAME",
		status: 409,
	},
	product_subcategories_product_line_id_name_unique: {
		message: "Ya existe una subcategoría con ese nombre dentro de la línea indicada",
		code: "DUPLICATE_PRODUCT_SUBCATEGORY_NAME",
		status: 409,
	},
	UQ_products_reference: {
		message: "Ya existe un producto con esa referencia",
		code: "DUPLICATE_PRODUCT_REFERENCE",
		status: 409,
	},
	color_references_color_chart_id_code_unique: {
		message: "Ya existe una referencia con ese código en la carta indicada",
		code: "DUPLICATE_COLOR_REFERENCE_CODE",
		status: 409,
	},
	color_references_color_chart_id_display_order_unique: {
		message:
			"Ya existe una referencia con ese orden dentro de la carta indicada",
		code: "DUPLICATE_COLOR_REFERENCE_DISPLAY_ORDER",
		status: 409,
	},
};

export class CatalogServiceError extends Error {
	status: number;
	code: string;

	constructor(
		message: string,
		status = 400,
		code = "CATALOG_SERVICE_ERROR",
	) {
		super(message);
		this.name = "CatalogServiceError";
		this.status = status;
		this.code = code;
	}
}

function getDriverError(error: unknown): QueryDriverError | null {
	if (!(error instanceof QueryFailedError)) {
		return null;
	}

	const maybeDriverError = (
		error as QueryFailedError & { driverError?: QueryDriverError }
	).driverError;

	if (!maybeDriverError || typeof maybeDriverError !== "object") {
		return null;
	}

	return maybeDriverError;
}

export function rethrowCatalogPersistenceError(
	error: unknown,
	fallbackMessage: string,
	fallbackCode = "CATALOG_PERSISTENCE_ERROR",
) {
	if (error instanceof CatalogServiceError) {
		throw error;
	}

	const driverError = getDriverError(error);

	if (driverError?.constraint && CONSTRAINT_ERRORS[driverError.constraint]) {
		const constraintError = CONSTRAINT_ERRORS[driverError.constraint];
		throw new CatalogServiceError(
			constraintError.message,
			constraintError.status ?? 409,
			constraintError.code,
		);
	}

	if (driverError?.code === "23503") {
		throw new CatalogServiceError(
			"Alguna de las relaciones indicadas no es válida",
			400,
			"INVALID_CATALOG_RELATION",
		);
	}

	if (driverError?.code === "23514") {
		throw new CatalogServiceError(
			"Los datos del catálogo no cumplen las reglas de negocio esperadas",
			400,
			"INVALID_CATALOG_CONSTRAINT",
		);
	}

	throw new CatalogServiceError(fallbackMessage, 500, fallbackCode);
}

export async function requireProductCategory(
	manager: EntityManager,
	id: string,
) {
	const category = await manager.getRepository(ProductCategory).findOne({
		where: { id },
	});

	if (!category) {
		throw new CatalogServiceError(
			"Categoría de producto no encontrada",
			404,
			"PRODUCT_CATEGORY_NOT_FOUND",
		);
	}

	return category;
}

export async function requireProductLine(manager: EntityManager, id: string) {
	const productLine = await manager.getRepository(ProductLine).findOne({
		where: { id },
		relations: {
			productCategory: true,
		},
	});

	if (!productLine) {
		throw new CatalogServiceError(
			"Línea comercial no encontrada",
			404,
			"PRODUCT_LINE_NOT_FOUND",
		);
	}

	return productLine;
}

export async function requireProductLineForCategory(
	manager: EntityManager,
	productLineId: string,
	productCategoryId: string,
) {
	const productLine = await requireProductLine(manager, productLineId);

	if (productLine.product_category_id !== productCategoryId) {
		throw new CatalogServiceError(
			"La línea comercial no pertenece a la categoría indicada",
			400,
			"PRODUCT_LINE_CATEGORY_MISMATCH",
		);
	}

	return productLine;
}

export async function requireProductSubcategory(
	manager: EntityManager,
	id: string,
) {
	const productSubcategory = await manager
		.getRepository(ProductSubcategory)
		.findOne({
			where: { id },
			relations: {
				productLine: true,
			},
		});

	if (!productSubcategory) {
		throw new CatalogServiceError(
			"Subcategoría de producto no encontrada",
			404,
			"PRODUCT_SUBCATEGORY_NOT_FOUND",
		);
	}

	return productSubcategory;
}

export async function requireProductSubcategoryForLine(
	manager: EntityManager,
	productSubcategoryId: string,
	productLineId: string,
) {
	const productSubcategory = await requireProductSubcategory(
		manager,
		productSubcategoryId,
	);

	if (productSubcategory.product_line_id !== productLineId) {
		throw new CatalogServiceError(
			"La subcategoría no pertenece a la línea comercial indicada",
			400,
			"PRODUCT_SUBCATEGORY_LINE_MISMATCH",
		);
	}

	return productSubcategory;
}

export async function requireProductStatus(manager: EntityManager, id: number) {
	const status = await manager.getRepository(ProductStatus).findOne({
		where: { id },
	});

	if (!status) {
		throw new CatalogServiceError(
			"Estado de producto no encontrado",
			404,
			"PRODUCT_STATUS_NOT_FOUND",
		);
	}

	return status;
}

export async function requireProduct(manager: EntityManager, id: string) {
	const product = await manager.getRepository(Product).findOne({
		where: { id },
		relations: {
			productCategory: true,
			productLine: true,
			productSubcategory: true,
			status: true,
		},
	});

	if (!product) {
		throw new CatalogServiceError(
			"Producto no encontrado",
			404,
			"PRODUCT_NOT_FOUND",
		);
	}

	return product;
}

export async function requireSupportResourceType(
	manager: EntityManager,
	id: number,
) {
	const resourceType = await manager.getRepository(SupportResourceType).findOne({
		where: { id },
	});

	if (!resourceType) {
		throw new CatalogServiceError(
			"Tipo de recurso no encontrado",
			404,
			"SUPPORT_RESOURCE_TYPE_NOT_FOUND",
		);
	}

	return resourceType;
}

export async function requireSupportResource(
	manager: EntityManager,
	id: string,
) {
	const supportResource = await manager.getRepository(SupportResource).findOne({
		where: { id },
		relations: {
			resourceType: true,
			product: true,
			productLine: true,
		},
	});

	if (!supportResource) {
		throw new CatalogServiceError(
			"Recurso de apoyo no encontrado",
			404,
			"SUPPORT_RESOURCE_NOT_FOUND",
		);
	}

	return supportResource;
}

export async function ensureSupportResourceContext(
	manager: EntityManager,
	input: {
		productId: string | null;
		productLineId: string | null;
	},
) {
	if (!input.productId && !input.productLineId) {
		throw new CatalogServiceError(
			"El recurso debe estar asociado a un producto o a una línea comercial",
			400,
			"SUPPORT_RESOURCE_CONTEXT_REQUIRED",
		);
	}

	const product = input.productId
		? await requireProduct(manager, input.productId)
		: null;
	const productLine = input.productLineId
		? await requireProductLine(manager, input.productLineId)
		: null;

	if (
		product &&
		productLine &&
		product.product_line_id !== productLine.id
	) {
		throw new CatalogServiceError(
			"El producto no pertenece a la línea comercial indicada para el recurso",
			400,
			"SUPPORT_RESOURCE_CONTEXT_MISMATCH",
		);
	}

	return {
		product,
		productLine,
	};
}

export async function requireColorChart(manager: EntityManager, id: string) {
	const colorChart = await manager.getRepository(ColorChart).findOne({
		where: { id },
		relations: {
			productLine: true,
		},
	});

	if (!colorChart) {
		throw new CatalogServiceError(
			"Carta de color no encontrada",
			404,
			"COLOR_CHART_NOT_FOUND",
		);
	}

	return colorChart;
}

export async function requireColorReference(manager: EntityManager, id: string) {
	const colorReference = await manager.getRepository(ColorReference).findOne({
		where: { id },
		relations: {
			colorChart: true,
		},
	});

	if (!colorReference) {
		throw new CatalogServiceError(
			"Referencia de color no encontrada",
			404,
			"COLOR_REFERENCE_NOT_FOUND",
		);
	}

	return colorReference;
}

export async function cleanupCatalogImageReplacement(
	previousImageUrl: string | null | undefined,
	nextImageUrl: string | null | undefined,
	context: string,
) {
	try {
		await deleteReplacedCloudinaryImage(previousImageUrl, nextImageUrl);
	} catch (error) {
		console.error(`[${context}] Error borrando imagen anterior de Cloudinary:`, error);
	}
}
