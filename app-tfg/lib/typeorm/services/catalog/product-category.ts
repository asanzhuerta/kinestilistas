import { getDataSource } from "@/lib/typeorm/data-source";
import type { AdminUpsertProductCategoryBody } from "@/lib/contracts/product-catalog";
import { revalidateCatalogCache } from "@/lib/cache/catalog-cache";
import { ProductCategory } from "@/lib/typeorm/entities/ProductCategory";
import { normalizeProductCategoryWriteInput } from "./catalog-validation";
import {
	CatalogServiceError,
	rethrowCatalogPersistenceError,
} from "./catalog-internal";

type ListProductCategoriesInput = {
	search?: string | null;
};

export async function listProductCategories(
	input: ListProductCategoriesInput = {},
) {
	const ds = await getDataSource();
	const repo = ds.getRepository(ProductCategory);
	const query = repo
		.createQueryBuilder("productCategory")
		.orderBy("productCategory.display_order", "ASC")
		.addOrderBy("productCategory.name", "ASC");

	const search = String(input.search ?? "").trim();

	if (search) {
		query.where(
			`(
				productCategory.name ILIKE :search
				OR COALESCE(productCategory.description, '') ILIKE :search
			)`,
			{ search: `%${search}%` },
		);
	}

	return query.getMany();
}

export async function getProductCategoryById(id: string) {
	const ds = await getDataSource();
	const repo = ds.getRepository(ProductCategory);

	return repo.findOne({
		where: { id },
	});
}

export async function createProductCategory(
	input: AdminUpsertProductCategoryBody,
) {
	const ds = await getDataSource();
	const normalized = normalizeProductCategoryWriteInput(input, {
		required: true,
	});

	try {
		const createdCategory = await ds.transaction(async (manager) => {
			const repo = manager.getRepository(ProductCategory);
			const category = repo.create({
				name: normalized.name,
				description: normalized.description ?? null,
				display_order: normalized.displayOrder ?? 0,
			});

			return repo.save(category);
		});

		const productCategory = await getProductCategoryById(createdCategory.id);
		revalidateCatalogCache();

		return productCategory;
	} catch (error) {
		rethrowCatalogPersistenceError(
			error,
			"No se pudo crear la categoria de producto",
			"PRODUCT_CATEGORY_CREATE_FAILED",
		);
	}
}

export async function updateProductCategory(
	input: { categoryId: string } & AdminUpsertProductCategoryBody,
) {
	const ds = await getDataSource();
	const normalized = normalizeProductCategoryWriteInput(input);

	try {
		const updatedCategory = await ds.transaction(async (manager) => {
			const repo = manager.getRepository(ProductCategory);
			const category = await repo.findOne({
				where: { id: input.categoryId },
			});

			if (!category) {
				throw new CatalogServiceError(
					"Categoria de producto no encontrada",
					404,
					"PRODUCT_CATEGORY_NOT_FOUND",
				);
			}

			if (normalized.name !== undefined) {
				category.name = normalized.name;
			}

			if (normalized.description !== undefined) {
				category.description = normalized.description;
			}

			if (normalized.displayOrder !== undefined) {
				category.display_order = normalized.displayOrder;
			}

			return repo.save(category);
		});

		const productCategory = await getProductCategoryById(updatedCategory.id);
		revalidateCatalogCache();

		return productCategory;
	} catch (error) {
		rethrowCatalogPersistenceError(
			error,
			"No se pudo actualizar la categoria de producto",
			"PRODUCT_CATEGORY_UPDATE_FAILED",
		);
	}
}
