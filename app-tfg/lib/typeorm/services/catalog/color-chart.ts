import { getDataSource } from "@/lib/typeorm/data-source";
import type {
	AdminUpsertColorChartBody,
	AdminUpsertColorReferenceBody,
} from "@/lib/contracts/product-catalog";
import { ColorChart } from "@/lib/typeorm/entities/ColorChart";
import { ColorReference } from "@/lib/typeorm/entities/ColorReference";
import { normalizeColorChartWriteInput, normalizeColorReferenceWriteInput } from "./catalog-validation";
import {
	cleanupCatalogImageReplacement,
	requireColorChart,
	requireColorReference,
	requireProductLine,
	rethrowCatalogPersistenceError,
} from "./catalog-internal";

type ListColorChartsInput = {
	productLineId?: string | null;
	search?: string | null;
};

type ListColorReferencesInput = {
	colorChartId?: string | null;
	search?: string | null;
};

export async function listColorCharts(input: ListColorChartsInput = {}) {
	const ds = await getDataSource();
	const repo = ds.getRepository(ColorChart);
	const query = repo
		.createQueryBuilder("colorChart")
		.leftJoinAndSelect("colorChart.productLine", "productLine")
		.orderBy("colorChart.created_at", "DESC");

	const productLineId = String(input.productLineId ?? "").trim();
	const search = String(input.search ?? "").trim();

	if (productLineId) {
		query.andWhere("colorChart.product_line_id = :productLineId", {
			productLineId,
		});
	}

	if (search) {
		query.andWhere(
			`(
				colorChart.name ILIKE :search
				OR COALESCE(colorChart.description, '') ILIKE :search
			)`,
			{ search: `%${search}%` },
		);
	}

	return query.getMany();
}

export async function getColorChartById(id: string) {
	const ds = await getDataSource();
	const repo = ds.getRepository(ColorChart);

	return repo
		.createQueryBuilder("colorChart")
		.leftJoinAndSelect("colorChart.productLine", "productLine")
		.leftJoinAndSelect("colorChart.colorReferences", "colorReferences")
		.where("colorChart.id = :id", { id })
		.orderBy("colorReferences.display_order", "ASC")
		.addOrderBy("colorReferences.name", "ASC")
		.getOne();
}

export async function createColorChart(input: AdminUpsertColorChartBody) {
	const ds = await getDataSource();
	const normalized = normalizeColorChartWriteInput(input, {
		required: true,
	});

	try {
		const createdColorChart = await ds.transaction(async (manager) => {
			await requireProductLine(manager, String(normalized.productLineId));

			const repo = manager.getRepository(ColorChart);
			const colorChart = repo.create({
				name: normalized.name,
				description: normalized.description ?? null,
				product_line_id: String(normalized.productLineId),
				image_url: normalized.imageUrl ?? null,
			});

			return repo.save(colorChart);
		});

		return getColorChartById(createdColorChart.id);
	} catch (error) {
		rethrowCatalogPersistenceError(
			error,
			"No se pudo crear la carta de color",
			"COLOR_CHART_CREATE_FAILED",
		);
	}
}

export async function updateColorChart(
	input: { colorChartId: string } & AdminUpsertColorChartBody,
) {
	const ds = await getDataSource();
	const normalized = normalizeColorChartWriteInput(input);

	try {
		const updatedColorChart = await ds.transaction(async (manager) => {
			const repo = manager.getRepository(ColorChart);
			const colorChart = await requireColorChart(manager, input.colorChartId);
			const previousImageUrl = colorChart.image_url;

			if (normalized.productLineId !== undefined) {
				await requireProductLine(manager, normalized.productLineId);
				colorChart.product_line_id = normalized.productLineId;
			}

			if (normalized.name !== undefined) {
				colorChart.name = normalized.name;
			}

			if (normalized.description !== undefined) {
				colorChart.description = normalized.description;
			}

			if (normalized.imageUrl !== undefined) {
				colorChart.image_url = normalized.imageUrl;
			}

			const savedColorChart = await repo.save(colorChart);

			return {
				id: savedColorChart.id,
				previousImageUrl,
				nextImageUrl: savedColorChart.image_url,
			};
		});

		await cleanupCatalogImageReplacement(
			updatedColorChart.previousImageUrl,
			updatedColorChart.nextImageUrl,
			"catalog/color-chart",
		);

		return getColorChartById(updatedColorChart.id);
	} catch (error) {
		rethrowCatalogPersistenceError(
			error,
			"No se pudo actualizar la carta de color",
			"COLOR_CHART_UPDATE_FAILED",
		);
	}
}

export async function listColorReferences(
	input: ListColorReferencesInput = {},
) {
	const ds = await getDataSource();
	const repo = ds.getRepository(ColorReference);
	const query = repo
		.createQueryBuilder("colorReference")
		.leftJoinAndSelect("colorReference.colorChart", "colorChart")
		.orderBy("colorReference.display_order", "ASC")
		.addOrderBy("colorReference.name", "ASC");

	const colorChartId = String(input.colorChartId ?? "").trim();
	const search = String(input.search ?? "").trim();

	if (colorChartId) {
		query.andWhere("colorReference.color_chart_id = :colorChartId", {
			colorChartId,
		});
	}

	if (search) {
		query.andWhere(
			`(
				colorReference.code ILIKE :search
				OR colorReference.name ILIKE :search
				OR COALESCE(colorReference.description, '') ILIKE :search
			)`,
			{ search: `%${search}%` },
		);
	}

	return query.getMany();
}

export async function getColorReferenceById(id: string) {
	const ds = await getDataSource();
	const repo = ds.getRepository(ColorReference);

	return repo.findOne({
		where: { id },
		relations: {
			colorChart: true,
		},
	});
}

export async function createColorReference(
	input: AdminUpsertColorReferenceBody,
) {
	const ds = await getDataSource();
	const normalized = normalizeColorReferenceWriteInput(input, {
		required: true,
	});

	try {
		const createdColorReference = await ds.transaction(async (manager) => {
			await requireColorChart(manager, String(normalized.colorChartId));

			const repo = manager.getRepository(ColorReference);
			const colorReference = repo.create({
				color_chart_id: String(normalized.colorChartId),
				code: normalized.code,
				name: normalized.name,
				description: normalized.description ?? null,
				image_url: normalized.imageUrl ?? null,
				display_order: normalized.displayOrder ?? 0,
			});

			return repo.save(colorReference);
		});

		return getColorReferenceById(createdColorReference.id);
	} catch (error) {
		rethrowCatalogPersistenceError(
			error,
			"No se pudo crear la referencia de color",
			"COLOR_REFERENCE_CREATE_FAILED",
		);
	}
}

export async function updateColorReference(
	input: { colorReferenceId: string } & AdminUpsertColorReferenceBody,
) {
	const ds = await getDataSource();
	const normalized = normalizeColorReferenceWriteInput(input);

	try {
		const updatedColorReference = await ds.transaction(async (manager) => {
			const repo = manager.getRepository(ColorReference);
			const colorReference = await requireColorReference(
				manager,
				input.colorReferenceId,
			);
			const previousImageUrl = colorReference.image_url;
			const nextColorChartId =
				normalized.colorChartId ?? colorReference.color_chart_id;

			await requireColorChart(manager, nextColorChartId);

			if (normalized.colorChartId !== undefined) {
				colorReference.color_chart_id = normalized.colorChartId;
			}

			if (normalized.code !== undefined) {
				colorReference.code = normalized.code;
			}

			if (normalized.name !== undefined) {
				colorReference.name = normalized.name;
			}

			if (normalized.description !== undefined) {
				colorReference.description = normalized.description;
			}

			if (normalized.imageUrl !== undefined) {
				colorReference.image_url = normalized.imageUrl;
			}

			if (normalized.displayOrder !== undefined) {
				colorReference.display_order = normalized.displayOrder;
			}

			const savedColorReference = await repo.save(colorReference);

			return {
				id: savedColorReference.id,
				previousImageUrl,
				nextImageUrl: savedColorReference.image_url,
			};
		});

		await cleanupCatalogImageReplacement(
			updatedColorReference.previousImageUrl,
			updatedColorReference.nextImageUrl,
			"catalog/color-reference",
		);

		return getColorReferenceById(updatedColorReference.id);
	} catch (error) {
		rethrowCatalogPersistenceError(
			error,
			"No se pudo actualizar la referencia de color",
			"COLOR_REFERENCE_UPDATE_FAILED",
		);
	}
}
