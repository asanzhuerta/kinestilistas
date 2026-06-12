import type {
	getColorChartById,
	getColorReferenceById,
	listColorCharts,
	listColorReferences,
} from "@/lib/typeorm/services/catalog/color-chart";
import { toIsoString } from "@/lib/utils/date-serialization";

export type SerializedColorChartListItem = {
	id: string;
	name: string;
	description: string | null;
	image_url: string | null;
	product_line_id: string;
	productLine: {
		id: string;
		name: string;
		description: string | null;
		product_category_id: string;
		image_url: string | null;
		display_order: number;
		productCategory: {
			id: string;
			name: string;
			description: string | null;
			display_order: number;
		} | null;
	} | null;
};

export type SerializedColorReferenceListItem = {
	id: string;
	color_chart_id: string;
	product_id: string | null;
	code: string;
	name: string;
	description: string | null;
	image_url: string | null;
	thumb_image_url: string | null;
	erp_reference: string | null;
	is_orderable: boolean;
	display_order: number;
	colorChart: {
		id: string;
		name: string;
		description: string | null;
		image_url: string | null;
		product_line_id: string;
		productLine: {
			id: string;
			name: string;
			description: string | null;
			product_category_id: string;
			image_url: string | null;
			display_order: number;
			productCategory: {
				id: string;
				name: string;
				description: string | null;
				display_order: number;
			} | null;
		} | null;
	} | null;
};

export type SerializedColorChartDetail = {
	id: string;
	name: string;
	description: string | null;
	image_url: string | null;
	created_at: string;
	updated_at: string;
	productLine: {
		id: string;
		name: string;
		description: string | null;
		product_category_id: string;
		image_url: string | null;
		display_order: number;
		productCategory: {
			id: string;
			name: string;
			description: string | null;
			display_order: number;
		} | null;
	} | null;
	colorReferences: Array<{
		id: string;
		color_chart_id: string;
		product_id: string | null;
		code: string;
		name: string;
		description: string | null;
		image_url: string | null;
		thumb_image_url: string | null;
		erp_reference: string | null;
		is_orderable: boolean;
		display_order: number;
	}>;
};

export type SerializedColorReferenceDetail = {
	id: string;
	color_chart_id: string;
	product_id: string | null;
	code: string;
	name: string;
	description: string | null;
	image_url: string | null;
	thumb_image_url: string | null;
	erp_reference: string | null;
	is_orderable: boolean;
	display_order: number;
	colorChart: {
		id: string;
		name: string;
		description: string | null;
		image_url: string | null;
		productLine: {
			id: string;
			name: string;
			description: string | null;
			image_url: string | null;
			productCategory: {
				id: string;
				name: string;
				description: string | null;
			} | null;
		} | null;
	} | null;
	product: {
		id: string;
		name: string;
		reference: string;
		description: string | null;
		image_url: string | null;
		format: string | null;
		packing: number | null;
		technical_info: string | null;
		base_price: string;
		productCategory: {
			id: string;
			name: string;
			description: string | null;
		} | null;
		productLine: {
			id: string;
			name: string;
			description: string | null;
		} | null;
		productSubcategory: {
			id: string;
			name: string;
			description: string | null;
		} | null;
	} | null;
};

export function toClientPlain<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

export function serializeColorChartListItem(
	colorChart: Awaited<ReturnType<typeof listColorCharts>>[number],
): SerializedColorChartListItem {
	return {
		id: colorChart.id,
		name: colorChart.name,
		description: colorChart.description,
		image_url: colorChart.image_url,
		product_line_id: colorChart.product_line_id,
		productLine: colorChart.productLine
			? {
					id: colorChart.productLine.id,
					name: colorChart.productLine.name,
					description: colorChart.productLine.description,
					product_category_id: colorChart.productLine.product_category_id,
					image_url: colorChart.productLine.image_url,
					display_order: colorChart.productLine.display_order,
					productCategory: colorChart.productLine.productCategory
						? {
								id: colorChart.productLine.productCategory.id,
								name: colorChart.productLine.productCategory.name,
								description: colorChart.productLine.productCategory.description,
								display_order:
									colorChart.productLine.productCategory.display_order,
						  }
						: null,
			  }
			: null,
	};
}

export function serializeColorReferenceListItem(
	colorReference: Awaited<ReturnType<typeof listColorReferences>>[number],
): SerializedColorReferenceListItem {
	return {
		id: colorReference.id,
		color_chart_id: colorReference.color_chart_id,
		product_id: colorReference.product_id ?? null,
		code: colorReference.code,
		name: colorReference.name,
		description: colorReference.description,
		image_url: colorReference.image_url,
		thumb_image_url: colorReference.thumb_image_url,
		erp_reference: colorReference.erp_reference ?? null,
		is_orderable: Boolean(colorReference.is_orderable),
		display_order: colorReference.display_order,
		colorChart: colorReference.colorChart
			? {
					id: colorReference.colorChart.id,
					name: colorReference.colorChart.name,
					description: colorReference.colorChart.description,
					image_url: colorReference.colorChart.image_url,
					product_line_id: colorReference.colorChart.product_line_id,
					productLine: colorReference.colorChart.productLine
						? {
								id: colorReference.colorChart.productLine.id,
								name: colorReference.colorChart.productLine.name,
								description: colorReference.colorChart.productLine.description,
								product_category_id:
									colorReference.colorChart.productLine.product_category_id,
								image_url: colorReference.colorChart.productLine.image_url,
								display_order:
									colorReference.colorChart.productLine.display_order,
								productCategory:
									colorReference.colorChart.productLine.productCategory
										? {
												id: colorReference.colorChart.productLine.productCategory.id,
												name: colorReference.colorChart.productLine.productCategory.name,
												description:
													colorReference.colorChart.productLine.productCategory
														.description,
												display_order:
													colorReference.colorChart.productLine.productCategory
														.display_order,
										  }
										: null,
						  }
						: null,
			  }
			: null,
	};
}

export function serializeColorChartDetail(
	colorChart: NonNullable<Awaited<ReturnType<typeof getColorChartById>>>,
): SerializedColorChartDetail {
	return {
		id: colorChart.id,
		name: colorChart.name,
		description: colorChart.description,
		image_url: colorChart.image_url,
		created_at: toIsoString(colorChart.created_at),
		updated_at: toIsoString(colorChart.updated_at),
		productLine: colorChart.productLine
			? {
					id: colorChart.productLine.id,
					name: colorChart.productLine.name,
					description: colorChart.productLine.description,
					product_category_id: colorChart.productLine.product_category_id,
					image_url: colorChart.productLine.image_url,
					display_order: colorChart.productLine.display_order,
					productCategory: colorChart.productLine.productCategory
						? {
								id: colorChart.productLine.productCategory.id,
								name: colorChart.productLine.productCategory.name,
								description: colorChart.productLine.productCategory.description,
								display_order:
									colorChart.productLine.productCategory.display_order,
						  }
						: null,
			  }
			: null,
		colorReferences: (colorChart.colorReferences ?? []).map((reference) => ({
			id: reference.id,
			color_chart_id: reference.color_chart_id,
			product_id: reference.product_id ?? null,
			code: reference.code,
			name: reference.name,
			description: reference.description,
			image_url: reference.image_url,
			thumb_image_url: reference.thumb_image_url,
			erp_reference: reference.erp_reference ?? null,
			is_orderable: Boolean(reference.is_orderable),
			display_order: reference.display_order,
		})),
	};
}

export function serializeColorReferenceDetail(
	colorReference: NonNullable<Awaited<ReturnType<typeof getColorReferenceById>>>,
): SerializedColorReferenceDetail {
	return {
		id: colorReference.id,
		color_chart_id: colorReference.color_chart_id,
		product_id: colorReference.product_id ?? null,
		code: colorReference.code,
		name: colorReference.name,
		description: colorReference.description,
		image_url: colorReference.image_url,
		thumb_image_url: colorReference.thumb_image_url,
		erp_reference: colorReference.erp_reference ?? null,
		is_orderable: Boolean(colorReference.is_orderable),
		display_order: colorReference.display_order,
		colorChart: colorReference.colorChart
			? {
					id: colorReference.colorChart.id,
					name: colorReference.colorChart.name,
					description: colorReference.colorChart.description,
					image_url: colorReference.colorChart.image_url,
					productLine: colorReference.colorChart.productLine
						? {
								id: colorReference.colorChart.productLine.id,
								name: colorReference.colorChart.productLine.name,
								description:
									colorReference.colorChart.productLine.description,
								image_url: colorReference.colorChart.productLine.image_url,
								productCategory:
									colorReference.colorChart.productLine.productCategory
										? {
												id: colorReference.colorChart.productLine.productCategory.id,
												name: colorReference.colorChart.productLine.productCategory.name,
												description:
													colorReference.colorChart.productLine.productCategory
														.description,
										  }
										: null,
						  }
						: null,
			  }
			: null,
		product: colorReference.product
			? {
					id: colorReference.product.id,
					name: colorReference.product.name,
					reference: colorReference.product.reference,
					description: colorReference.product.description,
					image_url: colorReference.product.image_url,
					format: colorReference.product.format,
					packing: colorReference.product.packing,
					technical_info: colorReference.product.technical_info,
					base_price: colorReference.product.base_price,
					productCategory: colorReference.product.productCategory
						? {
								id: colorReference.product.productCategory.id,
								name: colorReference.product.productCategory.name,
								description:
									colorReference.product.productCategory.description,
						  }
						: null,
					productLine: colorReference.product.productLine
						? {
								id: colorReference.product.productLine.id,
								name: colorReference.product.productLine.name,
								description: colorReference.product.productLine.description,
						  }
						: null,
					productSubcategory: colorReference.product.productSubcategory
						? {
								id: colorReference.product.productSubcategory.id,
								name: colorReference.product.productSubcategory.name,
								description:
									colorReference.product.productSubcategory.description,
						  }
						: null,
			  }
			: null,
	};
}
