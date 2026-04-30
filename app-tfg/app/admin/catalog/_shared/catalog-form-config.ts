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
		name: string | null;
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

type ProductValues = {
	name: string | null;
	reference: string | null;
	description: string | null;
	subcategory: string | null;
	product_category_id: string | null;
	product_line_id: string | null;
	image_url: string | null;
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
	display_order: number | null;
};

function buildOption(value: string, label: string): FieldOption {
	return { value, label };
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

export function getProductInitialValues(
	product?: ProductValues | null,
): Record<string, FormValue> {
	return {
		name: product?.name ?? "",
		reference: product?.reference ?? "",
		description: product?.description ?? "",
		subcategory: product?.subcategory ?? "",
		productCategoryId: product?.product_category_id ?? "",
		productLineId: product?.product_line_id ?? "",
		imageUrl: product?.image_url ?? "",
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
			placeholder: "Coloracion, tratamiento, acabado...",
		},
		{
			name: "description",
			label: "Descripcion",
			type: "textarea",
			placeholder: "Describe el proposito de esta categoria",
		},
		{
			name: "displayOrder",
			label: "Orden de visualizacion",
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
			placeholder: "Linea de color, tratamiento premium...",
		},
		{
			name: "productCategoryId",
			label: "Categoria",
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
				"Sube la imagen principal de la linea comercial. Se guardara en Cloudinary.",
		},
		{
			name: "displayOrder",
			label: "Orden de visualizacion",
			type: "number",
			min: 0,
		},
		{
			name: "description",
			label: "Descripcion",
			type: "textarea",
			placeholder: "Describe los productos que forman esta linea",
		},
	];
}

export function getProductFields(input: {
	productCategories: NamedOptionSource[];
	productLines: ProductLineOptionSource[];
	productStatuses: LookupOptionSource[];
}): FieldDescriptor[] {
	return [
		{
			name: "name",
			label: "Nombre",
			type: "text",
			required: true,
			placeholder: "Champu, coloracion, oxidante...",
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
			label: "Categoria",
			type: "select",
			required: true,
			options: input.productCategories.map((category) =>
				buildOption(category.id, category.name),
			),
		},
		{
			name: "productLineId",
			label: "Linea comercial",
			type: "select",
			required: true,
			options: input.productLines.map((productLine) =>
				buildOption(
					productLine.id,
					`${productLine.name} · ${productLine.productCategory?.name ?? "Sin categoria"}`,
				),
			),
		},
		{
			name: "subcategory",
			label: "Subcategoria",
			type: "text",
			placeholder: "Sublinea o agrupacion interna opcional",
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
			name: "description",
			label: "Descripcion",
			type: "textarea",
			placeholder: "Resumen comercial del producto",
		},
		{
			name: "technicalInfo",
			label: "Informacion tecnica",
			type: "textarea",
			placeholder:
				"Modo de aplicacion, rendimiento, observaciones tecnicas...",
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
			label: "Titulo",
			type: "text",
			required: true,
			placeholder: "Ficha tecnica oxidante 20 vol",
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
			label: "URL del recurso",
			type: "text",
			required: true,
			placeholder: "https://...",
		},
		{
			name: "productId",
			label: "Producto asociado",
			type: "select",
			options: input.products.map((product) =>
				buildOption(product.id, `${product.reference} · ${product.name}`),
			),
			helpText:
				"Puedes vincular el recurso a un producto concreto, a una linea o a ambos.",
		},
		{
			name: "productLineId",
			label: "Linea comercial asociada",
			type: "select",
			options: input.productLines.map((productLine) =>
				buildOption(
					productLine.id,
					`${productLine.name} · ${productLine.productCategory?.name ?? "Sin categoria"}`,
				),
			),
		},
		{
			name: "description",
			label: "Descripcion",
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
			label: "Linea comercial",
			type: "select",
			required: true,
			options: productLines.map((productLine) =>
				buildOption(
					productLine.id,
					`${productLine.name} · ${productLine.productCategory?.name ?? "Sin categoria"}`,
				),
			),
		},
		{
			name: "imageUrl",
			label: "Imagen",
			type: "image",
			helpText:
				"Sube la imagen de portada de la carta. Se guardara en Cloudinary.",
		},
		{
			name: "description",
			label: "Descripcion",
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
			label: "Codigo",
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
			name: "displayOrder",
			label: "Orden de visualizacion",
			type: "number",
			min: 0,
		},
		{
			name: "description",
			label: "Descripcion",
			type: "textarea",
			placeholder: "Informacion adicional sobre tono, matiz o familia",
		},
	];
}
