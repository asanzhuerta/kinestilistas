import { getDataSource } from "@/lib/typeorm/data-source";
import type { AdminUpsertProductLineBody } from "@/lib/contracts/product-catalog";
import { ProductLine } from "@/lib/typeorm/entities/ProductLine";
import { normalizeProductLineWriteInput } from "./catalog-validation";
import {
	CatalogServiceError,
	cleanupCatalogImageReplacement,
	requireProductCategory,
	rethrowCatalogPersistenceError,
} from "./catalog-internal";

type ListProductLinesInput = {
	productCategoryId?: string | null;
	search?: string | null;
};

export async function listProductLines(input: ListProductLinesInput = {}) {
	const ds = await getDataSource();
	const repo = ds.getRepository(ProductLine);
	const query = repo
		.createQueryBuilder("productLine")
		.leftJoinAndSelect("productLine.productCategory", "productCategory")
		.orderBy("productLine.display_order", "ASC")
		.addOrderBy("productLine.name", "ASC");

	const productCategoryId = String(input.productCategoryId ?? "").trim();
	const search = String(input.search ?? "").trim();

	if (productCategoryId) {
		query.andWhere("productLine.product_category_id = :productCategoryId", {
			productCategoryId,
		});
	}

	if (search) {
		query.andWhere(
			`(
				productLine.name ILIKE :search
				OR COALESCE(productLine.description, '') ILIKE :search
			)`,
			{ search: `%${search}%` },
		);
	}

	return query.getMany();
}

export async function getProductLineById(id: string) {
	const ds = await getDataSource();
	const repo = ds.getRepository(ProductLine);

	return repo.findOne({
		where: { id },
		relations: {
			productCategory: true,
		},
	});
}

export async function createProductLine(input: AdminUpsertProductLineBody) {
	const ds = await getDataSource();
	const normalized = normalizeProductLineWriteInput(input, {
		required: true,
	});

	try {
		const createdProductLine = await ds.transaction(async (manager) => {
			await requireProductCategory(manager, String(normalized.productCategoryId));

			const repo = manager.getRepository(ProductLine);
			const productLine = repo.create({
				name: normalized.name,
				description: normalized.description ?? null,
				product_category_id: String(normalized.productCategoryId),
				image_url: normalized.imageUrl ?? null,
				display_order: normalized.displayOrder ?? 0,
			});

			return repo.save(productLine);
		});

		return getProductLineById(createdProductLine.id);
	} catch (error) {
		rethrowCatalogPersistenceError(
			error,
			"No se pudo crear la linea comercial",
			"PRODUCT_LINE_CREATE_FAILED",
		);
	}
}

export async function updateProductLine(
	input: { productLineId: string } & AdminUpsertProductLineBody,
) {
	const ds = await getDataSource();
	const normalized = normalizeProductLineWriteInput(input);

	try {
		const updatedProductLine = await ds.transaction(async (manager) => {
			const repo = manager.getRepository(ProductLine);
			const productLine = await repo.findOne({
				where: { id: input.productLineId },
			});

			if (!productLine) {
				throw new CatalogServiceError(
					"Linea comercial no encontrada",
					404,
					"PRODUCT_LINE_NOT_FOUND",
				);
			}

			const previousImageUrl = productLine.image_url;

			if (normalized.productCategoryId !== undefined) {
				await requireProductCategory(
					manager,
					String(normalized.productCategoryId),
				);
				productLine.product_category_id = String(normalized.productCategoryId);
			}

			if (normalized.name !== undefined) {
				productLine.name = normalized.name;
			}

			if (normalized.description !== undefined) {
				productLine.description = normalized.description;
			}

			if (normalized.imageUrl !== undefined) {
				productLine.image_url = normalized.imageUrl;
			}

			if (normalized.displayOrder !== undefined) {
				productLine.display_order = normalized.displayOrder;
			}

			const savedProductLine = await repo.save(productLine);

			return {
				id: savedProductLine.id,
				previousImageUrl,
				nextImageUrl: savedProductLine.image_url,
			};
		});

		await cleanupCatalogImageReplacement(
			updatedProductLine.previousImageUrl,
			updatedProductLine.nextImageUrl,
			"catalog/product-line",
		);

		return getProductLineById(updatedProductLine.id);
	} catch (error) {
		rethrowCatalogPersistenceError(
			error,
			"No se pudo actualizar la linea comercial",
			"PRODUCT_LINE_UPDATE_FAILED",
		);
	}
}
