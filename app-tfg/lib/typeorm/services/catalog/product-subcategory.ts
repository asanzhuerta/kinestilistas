import { getDataSource } from "@/lib/typeorm/data-source";
import type { EntityManager } from "typeorm";
import type { AdminUpsertProductSubcategoryBody } from "@/lib/contracts/product-catalog";
import { revalidateCatalogCache } from "@/lib/cache/catalog-cache";
import { Product } from "@/lib/typeorm/entities/Product";
import { ProductSubcategory } from "@/lib/typeorm/entities/ProductSubcategory";
import { normalizeProductSubcategoryWriteInput } from "./catalog-validation";
import {
	CatalogServiceError,
	requireProductLine,
	requireProductSubcategoryForLine,
	rethrowCatalogPersistenceError,
} from "./catalog-internal";

type ListProductSubcategoriesInput = {
	productLineId?: string | null;
	search?: string | null;
};

async function ensureValidParentSubcategory(input: {
	manager: EntityManager;
	productLineId: string;
	parentSubcategoryId: string | null | undefined;
	currentSubcategoryId?: string;
}) {
	if (!input.parentSubcategoryId) {
		return null;
	}

	const parentSubcategory = await requireProductSubcategoryForLine(
		input.manager,
		input.parentSubcategoryId,
		input.productLineId,
	);

	if (
		input.currentSubcategoryId &&
		parentSubcategory.id === input.currentSubcategoryId
	) {
		throw new CatalogServiceError(
			"Una subcategoría no puede depender de si misma",
			400,
			"PRODUCT_SUBCATEGORY_SELF_PARENT",
		);
	}

	if (!input.currentSubcategoryId) {
		return parentSubcategory;
	}

	const repo = input.manager.getRepository(ProductSubcategory);
	const visited = new Set<string>([parentSubcategory.id]);
	let currentParentId = parentSubcategory.parent_subcategory_id;

	while (currentParentId) {
		if (currentParentId === input.currentSubcategoryId) {
			throw new CatalogServiceError(
				"No se puede crear una jerarquía circular entre subcategorías",
				400,
				"PRODUCT_SUBCATEGORY_CYCLIC_PARENT",
			);
		}

		if (visited.has(currentParentId)) {
			break;
		}

		visited.add(currentParentId);
		const ancestor = await repo.findOne({
			where: { id: currentParentId },
		});

		if (!ancestor) {
			break;
		}

		currentParentId = ancestor.parent_subcategory_id;
	}

	return parentSubcategory;
}

export async function listProductSubcategories(
	input: ListProductSubcategoriesInput = {},
) {
	const ds = await getDataSource();
	const repo = ds.getRepository(ProductSubcategory);
	const query = repo
		.createQueryBuilder("productSubcategory")
		.leftJoinAndSelect(
			"productSubcategory.parentSubcategory",
			"parentSubcategory",
		)
		.leftJoinAndSelect("productSubcategory.productLine", "productLine")
		.leftJoinAndSelect("productLine.productCategory", "productCategory")
		.orderBy(
			`CASE
				WHEN productSubcategory.parent_subcategory_id IS NULL THEN 0
				ELSE 1
			END`,
			"ASC",
		)
		.addOrderBy(
			"COALESCE(parentSubcategory.display_order, productSubcategory.display_order)",
			"ASC",
		)
		.addOrderBy("productSubcategory.display_order", "ASC")
		.addOrderBy("productSubcategory.name", "ASC");

	const productLineId = String(input.productLineId ?? "").trim();
	const search = String(input.search ?? "").trim();

	if (productLineId) {
		query.andWhere("productSubcategory.product_line_id = :productLineId", {
			productLineId,
		});
	}

	if (search) {
		query.andWhere(
			`(
				productSubcategory.name ILIKE :search
				OR COALESCE(productSubcategory.description, '') ILIKE :search
				OR productLine.name ILIKE :search
				OR COALESCE(productCategory.name, '') ILIKE :search
			)`,
			{ search: `%${search}%` },
		);
	}

	return query.getMany();
}

export async function getProductSubcategoryById(id: string) {
	const ds = await getDataSource();
	const repo = ds.getRepository(ProductSubcategory);

	return repo.findOne({
		where: { id },
		relations: {
			parentSubcategory: true,
			productLine: {
				productCategory: true,
			},
		},
	});
}

export async function createProductSubcategory(
	input: AdminUpsertProductSubcategoryBody,
) {
	const ds = await getDataSource();
	const normalized = normalizeProductSubcategoryWriteInput(input, {
		required: true,
	});

	try {
		const createdProductSubcategory = await ds.transaction(async (manager) => {
			const productLineId = String(normalized.productLineId);
			await requireProductLine(manager, productLineId);
			await ensureValidParentSubcategory({
				manager,
				productLineId,
				parentSubcategoryId: normalized.parentSubcategoryId,
			});

			const repo = manager.getRepository(ProductSubcategory);
			const productSubcategory = repo.create({
				name: normalized.name,
				description: normalized.description ?? null,
				product_line_id: productLineId,
				parent_subcategory_id: normalized.parentSubcategoryId ?? null,
				display_order: normalized.displayOrder ?? 0,
			});

			return repo.save(productSubcategory);
		});

		const productSubcategory = await getProductSubcategoryById(
			createdProductSubcategory.id,
		);
		revalidateCatalogCache();

		return productSubcategory;
	} catch (error) {
		rethrowCatalogPersistenceError(
			error,
			"No se pudo crear la subcategoría",
			"PRODUCT_SUBCATEGORY_CREATE_FAILED",
		);
	}
}

export async function updateProductSubcategory(
	input: { productSubcategoryId: string } & AdminUpsertProductSubcategoryBody,
) {
	const ds = await getDataSource();
	const normalized = normalizeProductSubcategoryWriteInput(input);

	try {
		const updatedProductSubcategory = await ds.transaction(async (manager) => {
			const repo = manager.getRepository(ProductSubcategory);
			const productSubcategory = await repo.findOne({
				where: { id: input.productSubcategoryId },
			});

			if (!productSubcategory) {
				throw new CatalogServiceError(
					"Subcategoría no encontrada",
					404,
					"PRODUCT_SUBCATEGORY_NOT_FOUND",
				);
			}

			const nextProductLineId =
				normalized.productLineId ?? productSubcategory.product_line_id;
			const nextParentSubcategoryId =
				normalized.parentSubcategoryId !== undefined
					? normalized.parentSubcategoryId
					: productSubcategory.parent_subcategory_id;

			if (normalized.productLineId !== undefined) {
				if (
					normalized.productLineId !== productSubcategory.product_line_id
				) {
					const linkedProductsCount = await manager.getRepository(Product).count({
						where: {
							product_subcategory_id: input.productSubcategoryId,
						},
					});

					if (linkedProductsCount > 0) {
						throw new CatalogServiceError(
							"No se puede cambiar la línea de una subcategoría que ya tiene productos asociados",
							400,
							"PRODUCT_SUBCATEGORY_LINE_CHANGE_WITH_PRODUCTS",
						);
					}

					const linkedChildrenCount = await repo.count({
						where: {
							parent_subcategory_id: input.productSubcategoryId,
						},
					});

					if (linkedChildrenCount > 0) {
						throw new CatalogServiceError(
							"No se puede cambiar la línea de una subcategoría que ya tiene subcategorías hijas",
							400,
							"PRODUCT_SUBCATEGORY_LINE_CHANGE_WITH_CHILDREN",
						);
					}

					if (
						productSubcategory.parent_subcategory_id &&
						normalized.parentSubcategoryId === undefined
					) {
						throw new CatalogServiceError(
							"No se puede cambiar la línea de una subcategoría hija sin desvincularla antes de su padre",
							400,
							"PRODUCT_SUBCATEGORY_LINE_CHANGE_WITH_PARENT",
						);
					}
				}
			}

			if (
				normalized.productLineId !== undefined ||
				normalized.parentSubcategoryId !== undefined
			) {
				await requireProductLine(manager, nextProductLineId);
				await ensureValidParentSubcategory({
					manager,
					productLineId: nextProductLineId,
					parentSubcategoryId: nextParentSubcategoryId,
					currentSubcategoryId: input.productSubcategoryId,
				});
			}

			if (normalized.productLineId !== undefined) {
				productSubcategory.product_line_id = normalized.productLineId;
			}

			if (normalized.parentSubcategoryId !== undefined) {
				productSubcategory.parent_subcategory_id =
					normalized.parentSubcategoryId;
			}

			if (normalized.name !== undefined) {
				productSubcategory.name = normalized.name;
			}

			if (normalized.description !== undefined) {
				productSubcategory.description = normalized.description;
			}

			if (normalized.displayOrder !== undefined) {
				productSubcategory.display_order = normalized.displayOrder;
			}

			const savedProductSubcategory = await repo.save(productSubcategory);

			return {
				id: savedProductSubcategory.id,
			};
		});

		const productSubcategory = await getProductSubcategoryById(
			updatedProductSubcategory.id,
		);
		revalidateCatalogCache();

		return productSubcategory;
	} catch (error) {
		rethrowCatalogPersistenceError(
			error,
			"No se pudo actualizar la subcategoría",
			"PRODUCT_SUBCATEGORY_UPDATE_FAILED",
		);
	}
}
