import type {
	FieldDescriptor,
	FieldOption,
	FormValue,
} from "@/app/components/catalog-admin/catalog-admin-types";

type NamedOptionSource = {
	id: string;
	name: string;
};

type ProductLineOptionSource = NamedOptionSource & {
	productCategory?: {
		id?: string | null;
		name: string | null;
	} | null;
};

type ProductSubcategoryOptionSource = NamedOptionSource & {
	product_line_id: string;
	parent_subcategory_id?: string | null;
	parentSubcategory?: {
		id?: string | null;
		name: string | null;
	} | null;
	productLine?: {
		name: string | null;
		productCategory?: {
			name: string | null;
		} | null;
	} | null;
};

type ProductOptionSource = NamedOptionSource & {
	reference: string;
};

type LookupOptionSource = {
	id: number;
	name: string;
};

type ProductCategoryValues = {
	name: string | null;
	description: string | null;
	display_order: number | null;
};

type ProductLineValues = {
	name: string | null;
	description: string | null;
	product_category_id: string | null;
	image_url: string | null;
	display_order: number | null;
};

type ProductSubcategoryValues = {
	name: string | null;
	description: string | null;
	product_line_id: string | null;
	parent_subcategory_id: string | null;
	display_order: number | null;
};

type ProductValues = {
	name: string | null;
	reference: string | null;
	description: string | null;
	product_category_id: string | null;
	product_line_id: string | null;
	product_subcategory_id: string | null;
	image_url: string | null;
	format: string | null;
	packing: number | null;
	technical_info: string | null;
	status_id: number | null;
	base_price: string | null;
	supplier: string | null;
};

type SupportResourceValues = {
	title: string | null;
	description: string | null;
	resource_type_id: number | null;
	resource_url: string | null;
	product_id: string | null;
	product_line_id: string | null;
};

type ColorChartValues = {
	name: string | null;
	description: string | null;
	product_line_id: string | null;
	image_url: string | null;
};

type ColorReferenceValues = {
	color_chart_id: string | null;
	code: string | null;
	name: string | null;
	description: string | null;
	image_url: string | null;
	thumb_image_url: string | null;
	display_order: number | null;
};

function buildOption(value: string, label: string): FieldOption {
	return { value, label };
}

function buildProductSubcategoryPathLabel(
	productSubcategory: ProductSubcategoryOptionSource,
	productSubcategoriesById: Map<string, ProductSubcategoryOptionSource>,
) {
	const path: string[] = [productSubcategory.name];
	const visited = new Set<string>([productSubcategory.id]);
	let currentParentId = productSubcategory.parent_subcategory_id ?? null;

	while (currentParentId) {
		if (visited.has(currentParentId)) {
			break;
		}

		visited.add(currentParentId);
		const parentSubcategory = productSubcategoriesById.get(currentParentId);

		if (!parentSubcategory) {
			break;
		}

		path.unshift(parentSubcategory.name);
		currentParentId = parentSubcategory.parent_subcategory_id ?? null;
	}

	return path.join(" / ");
}

export function getProductCategoryInitialValues(
	category?: ProductCategoryValues | null,
): Record<string, FormValue> {
	return {
		name: category?.name ?? "",
		description: category?.description ?? "",
		displayOrder: String(category?.display_order ?? 0),
	};
}

export function getProductLineInitialValues(
	productLine?: ProductLineValues | null,
): Record<string, FormValue> {
	return {
		name: productLine?.name ?? "",
		description: productLine?.description ?? "",
		productCategoryId: productLine?.product_category_id ?? "",
		imageUrl: productLine?.image_url ?? "",
		displayOrder: String(productLine?.display_order ?? 0),
	};
}

export function getProductSubcategoryInitialValues(
	productSubcategory?: ProductSubcategoryValues | null,
): Record<string, FormValue> {
	return {
		name: productSubcategory?.name ?? "",
		description: productSubcategory?.description ?? "",
		productLineId: productSubcategory?.product_line_id ?? "",
		parentSubcategoryId: productSubcategory?.parent_subcategory_id ?? "",
		displayOrder: String(productSubcategory?.display_order ?? 0),
	};
}

export function getProductInitialValues(
	product?: ProductValues | null,
): Record<string, FormValue> {
	return {
		name: product?.name ?? "",
		reference: product?.reference ?? "",
		description: product?.description ?? "",
		productCategoryId: product?.product_category_id ?? "",
		productLineId: product?.product_line_id ?? "",
		productSubcategoryId: product?.product_subcategory_id ?? "",
		imageUrl: product?.image_url ?? "",
		format: product?.format ?? "",
		packing:
			product?.packing !== null && product?.packing !== undefined
				? String(product.packing)
				: "",
		technicalInfo: product?.technical_info ?? "",
		statusId: product?.status_id ? String(product.status_id) : "",
		basePrice: product?.base_price ?? "",
		supplier: product?.supplier ?? "",
	};
}

export function getSupportResourceInitialValues(
	resource?: SupportResourceValues | null,
): Record<string, FormValue> {
	return {
		title: resource?.title ?? "",
		description: resource?.description ?? "",
		resourceTypeId: resource?.resource_type_id
			? String(resource.resource_type_id)
			: "",
		resourceUrl: resource?.resource_url ?? "",
		productId: resource?.product_id ?? "",
		productLineId: resource?.product_line_id ?? "",
	};
}

export function getColorChartInitialValues(
	colorChart?: ColorChartValues | null,
): Record<string, FormValue> {
	return {
		name: colorChart?.name ?? "",
		description: colorChart?.description ?? "",
		productLineId: colorChart?.product_line_id ?? "",
		imageUrl: colorChart?.image_url ?? "",
	};
}

export function getColorReferenceInitialValues(
	colorReference?: ColorReferenceValues | null,
): Record<string, FormValue> {
	return {
		colorChartId: colorReference?.color_chart_id ?? "",
		code: colorReference?.code ?? "",
		name: colorReference?.name ?? "",
		description: colorReference?.description ?? "",
		imageUrl: colorReference?.image_url ?? "",
		imageUrlThumb: colorReference?.thumb_image_url ?? "",
		displayOrder: String(colorReference?.display_order ?? 0),
	};
}

export function getProductCategoryFields(): FieldDescriptor[] {
	return [
		{
			name: "name",
			label: "Nombre",
			type: "text",
			required: true,
			placeholder: "Coloración, tratamiento, acabado...",
		},
		{
			name: "description",
			label: "Descripción",
			type: "textarea",
			placeholder: "Describe el propósito de esta categoría",
		},
		{
			name: "displayOrder",
			label: "Orden de visualización",
			type: "number",
			min: 0,
		},
	];
}

export function getProductLineFields(
	productCategories: NamedOptionSource[],
): FieldDescriptor[] {
	return [
		{
			name: "name",
			label: "Nombre",
			type: "text",
			required: true,
			placeholder: "Línea de color, tratamiento premium...",
		},
		{
			name: "productCategoryId",
			label: "Categoría",
			type: "select",
			required: true,
			options: productCategories.map((category) =>
				buildOption(category.id, category.name),
			),
		},
		{
			name: "imageUrl",
			label: "Imagen",
			type: "image",
			helpText:
				"Sube la imagen principal de la línea comercial. Se guardara en Cloudinary.",
		},
		{
			name: "displayOrder",
			label: "Orden de visualización",
			type: "number",
			min: 0,
		},
		{
			name: "description",
			label: "Descripción",
			type: "textarea",
			placeholder: "Describe los productos que forman esta línea",
		},
	];
}

export function getProductSubcategoryFields(
	productLines: ProductLineOptionSource[],
	productSubcategories: ProductSubcategoryOptionSource[],
): FieldDescriptor[] {
	const productSubcategoriesById = new Map(
		productSubcategories.map((productSubcategory) => [
			productSubcategory.id,
			productSubcategory,
		]),
	);

	return [
		{
			name: "name",
			label: "Nombre",
			type: "text",
			required: true,
			placeholder: "Antiox, nourish, scalp...",
		},
		{
			name: "productLineId",
			label: "Línea comercial",
			type: "select",
			required: true,
			options: productLines.map((productLine) =>
				buildOption(
					productLine.id,
					`${productLine.name} · ${productLine.productCategory?.name ?? "Sin categoría"}`,
				),
			),
		},
		{
			name: "parentSubcategoryId",
			label: "Subcategoría padre",
			type: "select",
			options: productSubcategories.map((productSubcategory) => ({
				value: productSubcategory.id,
				label: buildProductSubcategoryPathLabel(
					productSubcategory,
					productSubcategoriesById,
				),
				groupKey: productSubcategory.product_line_id,
			})),
			filterByFieldName: "productLineId",
			helpText:
				"Opcional. Si esta subcategoría depende de otra dentro de la misma línea, indícalo aquí.",
		},
		{
			name: "displayOrder",
			label: "Orden de visualización",
			type: "number",
			min: 0,
		},
		{
			name: "description",
			label: "Descripción",
			type: "textarea",
			placeholder: "Describe el grupo de tratamientos o variantes que representa.",
		},
	];
}

export function getProductFields(input: {
	productCategories: NamedOptionSource[];
	productLines: ProductLineOptionSource[];
	productSubcategories: ProductSubcategoryOptionSource[];
	productStatuses: LookupOptionSource[];
}): FieldDescriptor[] {
	return [
		{
			name: "name",
			label: "Nombre",
			type: "text",
			required: true,
			placeholder: "Champu, coloración, oxidante...",
		},
		{
			name: "reference",
			label: "Referencia",
			type: "text",
			required: true,
			placeholder: "REF-001",
		},
		{
			name: "productCategoryId",
			label: "Categoría",
			type: "select",
			required: true,
			options: input.productCategories.map((category) =>
				buildOption(category.id, category.name),
			),
		},
		{
			name: "productLineId",
			label: "Línea comercial",
			type: "select",
			required: true,
			options: input.productLines.map((productLine) => ({
				value: productLine.id,
				label: `${productLine.name} · ${productLine.productCategory?.name ?? "Sin categoría"}`,
				groupKey: productLine.productCategory?.id ?? undefined,
			})),
			filterByFieldName: "productCategoryId",
		},
		{
			name: "productSubcategoryId",
			label: "Subcategoría",
			type: "select",
			options: input.productSubcategories.map((productSubcategory) => ({
				value: productSubcategory.id,
				label: `${productSubcategory.name} · ${productSubcategory.productLine?.name ?? "Sin línea"}`,
				groupKey: productSubcategory.product_line_id,
			})),
			filterByFieldName: "productLineId",
			helpText:
				"Opcional. Vincula el producto a una subcategoría concreta de la línea seleccionada.",
		},
		{
			name: "statusId",
			label: "Estado",
			type: "select",
			required: true,
			options: input.productStatuses.map((status) =>
				buildOption(String(status.id), status.name),
			),
		},
		{
			name: "basePrice",
			label: "Precio base",
			type: "number",
			required: true,
			min: 0,
			step: "0.01",
		},
		{
			name: "supplier",
			label: "Proveedor",
			type: "text",
			placeholder: "Marca o proveedor principal",
		},
		{
			name: "imageUrl",
			label: "Imagen",
			type: "image",
			helpText:
				"Sube la imagen principal del producto. Se guardara en Cloudinary.",
		},
		{
			name: "format",
			label: "Formato",
			type: "text",
			placeholder: "250 ml, 1.000 ml, 10 x 50 g...",
		},
		{
			name: "packing",
			label: "Packing",
			type: "number",
			min: 0,
			placeholder: "6",
		},
		{
			name: "description",
			label: "Descripción",
			type: "textarea",
			placeholder: "Resumen comercial del producto",
		},
		{
			name: "technicalInfo",
			label: "Información técnica",
			type: "textarea",
			placeholder:
				"Modo de aplicación, rendimiento o notas técnicas adicionales...",
		},
	];
}

export function getSupportResourceFields(input: {
	supportResourceTypes: LookupOptionSource[];
	products: ProductOptionSource[];
	productLines: ProductLineOptionSource[];
}): FieldDescriptor[] {
	return [
		{
			name: "title",
			label: "Título",
			type: "text",
			required: true,
			placeholder: "Ficha técnica oxidante 20 vol",
		},
		{
			name: "resourceTypeId",
			label: "Tipo de recurso",
			type: "select",
			required: true,
			options: input.supportResourceTypes.map((resourceType) =>
				buildOption(String(resourceType.id), resourceType.name),
			),
		},
		{
			name: "resourceUrl",
			label: "Archivo o URL del recurso",
			type: "file",
			required: true,
			placeholder: "https://...",
			accept: "application/pdf,image/*",
			uploadEndpoint: "/api/admin/catalog/upload-resource",
			helpText:
				"Puedes subir un PDF o una imagen a Cloudinary, o pegar una URL externa.",
		},
		{
			name: "productId",
			label: "Producto asociado",
			type: "select",
			options: input.products.map((product) =>
				buildOption(product.id, `${product.reference} · ${product.name}`),
			),
			helpText:
				"Puedes vincular el recurso a un producto concreto, a una línea o a ambos.",
		},
		{
			name: "productLineId",
			label: "Línea comercial asociada",
			type: "select",
			options: input.productLines.map((productLine) =>
				buildOption(
					productLine.id,
					`${productLine.name} · ${productLine.productCategory?.name ?? "Sin categoría"}`,
				),
			),
		},
		{
			name: "description",
			label: "Descripción",
			type: "textarea",
			placeholder: "Describe el objetivo o contenido del recurso",
		},
	];
}

export function getColorChartFields(
	productLines: ProductLineOptionSource[],
): FieldDescriptor[] {
	return [
		{
			name: "name",
			label: "Nombre",
			type: "text",
			required: true,
			placeholder: "Carta color premium 2026",
		},
		{
			name: "productLineId",
			label: "Línea comercial",
			type: "select",
			required: true,
			options: productLines.map((productLine) =>
				buildOption(
					productLine.id,
					`${productLine.name} · ${productLine.productCategory?.name ?? "Sin categoría"}`,
				),
			),
		},
		{
			name: "imageUrl",
			label: "Imagen",
			type: "image",
			helpText:
				"Puedes usar una imagen pública de la API de coloración o subir una nueva a Cloudinary.",
		},
		{
			name: "description",
			label: "Descripción",
			type: "textarea",
			placeholder: "Notas de uso, temporada, observaciones comerciales...",
		},
	];
}

export function getColorReferenceFields(
	colorCharts: NamedOptionSource[],
): FieldDescriptor[] {
	return [
		{
			name: "colorChartId",
			label: "Carta de color",
			type: "select",
			required: true,
			options: colorCharts.map((colorChart) =>
				buildOption(colorChart.id, colorChart.name),
			),
		},
		{
			name: "code",
			label: "Código",
			type: "text",
			required: true,
			placeholder: "7.34",
		},
		{
			name: "name",
			label: "Nombre",
			type: "text",
			required: true,
			placeholder: "Rubio cobrizo dorado",
		},
		{
			name: "imageUrl",
			label: "Imagen",
			type: "image",
			helpText:
				"Sube una referencia visual del tono. Se guardara en Cloudinary.",
		},
		{
			name: "imageUrlThumb",
			label: "Miniatura",
			type: "image",
			helpText:
				"Opcional. Puedes definir una miniatura específica para usos futuros del catálogo.",
		},
		{
			name: "displayOrder",
			label: "Orden de visualización",
			type: "number",
			min: 0,
		},
		{
			name: "description",
			label: "Descripción",
			type: "textarea",
			placeholder: "Información adicional sobre tono, matiz o familia",
		},
	];
}
