export type ProductStatusCode = "active" | "inactive";

export type SupportResourceTypeCode =
	| "technical_sheet"
	| "commercial_catalog"
	| "training_material";

export type ProductStatus = {
	id: number;
	code?: ProductStatusCode;
	name?: string;
};

export type SupportResourceType = {
	id: number;
	code?: SupportResourceTypeCode;
	name?: string;
};

export type ProductCategory = {
	id: string;
	name: string;
	description: string | null;
	display_order: number;
};

export type ProductLine = {
	id: string;
	name: string;
	description: string | null;
	product_category_id: string;
	image_url: string | null;
	display_order: number;
	productCategory?: ProductCategory | null;
};

export type SupportResource = {
	id: string;
	title: string;
	description: string | null;
	resource_type_id: number;
	resource_url: string;
	product_id: string | null;
	product_line_id: string | null;
	created_at: string;
	resourceType?: SupportResourceType | null;
};

export type ColorReference = {
	id: string;
	color_chart_id: string;
	code: string;
	name: string;
	description: string | null;
	image_url: string | null;
	display_order: number;
};

export type ColorChart = {
	id: string;
	name: string;
	description: string | null;
	product_line_id: string;
	image_url: string | null;
	created_at: string;
	updated_at: string;
	productLine?: ProductLine | null;
	colorReferences?: ColorReference[] | null;
};

export type Product = {
	id: string;
	name: string;
	reference: string;
	description: string | null;
	subcategory: string | null;
	product_category_id: string;
	product_line_id: string;
	image_url: string | null;
	format: string | null;
	packing: number | null;
	technical_info: string | null;
	status_id: number;
	base_price: string;
	supplier: string | null;
	created_at: string;
	updated_at: string;
	productCategory?: ProductCategory | null;
	productLine?: ProductLine | null;
	status?: ProductStatus | null;
	supportResources?: SupportResource[] | null;
};

export type AdminUpsertProductCategoryBody = {
	name?: string;
	description?: string | null;
	displayOrder?: number | string | null;
};

export type AdminUpsertProductLineBody = {
	name?: string;
	description?: string | null;
	productCategoryId?: string;
	imageUrl?: string | null;
	displayOrder?: number | string | null;
};

export type AdminUpsertProductBody = {
	name?: string;
	reference?: string;
	description?: string | null;
	subcategory?: string | null;
	productCategoryId?: string;
	productLineId?: string;
	imageUrl?: string | null;
	format?: string | null;
	packing?: number | string | null;
	technicalInfo?: string | null;
	statusId?: number | string;
	basePrice?: number | string;
	supplier?: string | null;
};

export type AdminUpsertSupportResourceBody = {
	title?: string;
	description?: string | null;
	resourceTypeId?: number | string;
	resourceUrl?: string;
	productId?: string | null;
	productLineId?: string | null;
};

export type AdminUpsertColorChartBody = {
	name?: string;
	description?: string | null;
	productLineId?: string;
	imageUrl?: string | null;
};

export type AdminUpsertColorReferenceBody = {
	colorChartId?: string;
	code?: string;
	name?: string;
	description?: string | null;
	imageUrl?: string | null;
	displayOrder?: number | string | null;
};

export function buildAdminUpsertProductCategoryInput(
	body: AdminUpsertProductCategoryBody,
) {
	return {
		name: body.name,
		description: body.description,
		displayOrder: body.displayOrder,
	};
}

export function buildAdminUpsertProductLineInput(
	body: AdminUpsertProductLineBody,
) {
	return {
		name: body.name,
		description: body.description,
		productCategoryId: body.productCategoryId,
		imageUrl: body.imageUrl,
		displayOrder: body.displayOrder,
	};
}

export function buildAdminUpsertProductInput(body: AdminUpsertProductBody) {
	return {
		name: body.name,
		reference: body.reference,
		description: body.description,
		subcategory: body.subcategory,
		productCategoryId: body.productCategoryId,
		productLineId: body.productLineId,
		imageUrl: body.imageUrl,
		format: body.format,
		packing: body.packing,
		technicalInfo: body.technicalInfo,
		statusId: body.statusId,
		basePrice: body.basePrice,
		supplier: body.supplier,
	};
}

export function buildAdminUpsertSupportResourceInput(
	body: AdminUpsertSupportResourceBody,
) {
	return {
		title: body.title,
		description: body.description,
		resourceTypeId: body.resourceTypeId,
		resourceUrl: body.resourceUrl,
		productId: body.productId,
		productLineId: body.productLineId,
	};
}

export function buildAdminUpsertColorChartInput(
	body: AdminUpsertColorChartBody,
) {
	return {
		name: body.name,
		description: body.description,
		productLineId: body.productLineId,
		imageUrl: body.imageUrl,
	};
}

export function buildAdminUpsertColorReferenceInput(
	body: AdminUpsertColorReferenceBody,
) {
	return {
		colorChartId: body.colorChartId,
		code: body.code,
		name: body.name,
		description: body.description,
		imageUrl: body.imageUrl,
		displayOrder: body.displayOrder,
	};
}
