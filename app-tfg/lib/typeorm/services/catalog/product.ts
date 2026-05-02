import { getDataSource } from "@/lib/typeorm/data-source";
import type { AdminUpsertProductBody } from "@/lib/contracts/product-catalog";
import { Product } from "@/lib/typeorm/entities/Product";
import { normalizeProductWriteInput } from "./catalog-validation";
import {
	cleanupCatalogImageReplacement,
	requireProduct,
	requireProductCategory,
	requireProductLineForCategory,
	requireProductSubcategoryForLine,
	requireProductStatus,
	rethrowCatalogPersistenceError,
} from "./catalog-internal";

type ListProductsInput = {
	search?: string | null;
	productCategoryId?: string | null;
	productLineId?: string | null;
	productSubcategoryId?: string | null;
	statusId?: number | null;
};

export async function listProducts(input: ListProductsInput = {}) {
	const ds = await getDataSource();
	const repo = ds.getRepository(Product);
	const query = repo
		.createQueryBuilder("product")
		.leftJoinAndSelect("product.productCategory", "productCategory")
		.leftJoinAndSelect("product.productLine", "productLine")
		.leftJoinAndSelect("product.productSubcategory", "productSubcategory")
		.leftJoinAndSelect("product.status", "status")
		.orderBy("product.created_at", "DESC");

	const search = String(input.search ?? "").trim();
	const productCategoryId = String(input.productCategoryId ?? "").trim();
	const productLineId = String(input.productLineId ?? "").trim();
	const productSubcategoryId = String(input.productSubcategoryId ?? "").trim();
	const statusId =
		typeof input.statusId === "number" && Number.isInteger(input.statusId)
			? input.statusId
			: null;

	if (productCategoryId) {
		query.andWhere("product.product_category_id = :productCategoryId", {
			productCategoryId,
		});
	}

	if (productLineId) {
		query.andWhere("product.product_line_id = :productLineId", {
			productLineId,
		});
	}

	if (productSubcategoryId) {
		query.andWhere("product.product_subcategory_id = :productSubcategoryId", {
			productSubcategoryId,
		});
	}

	if (statusId) {
		query.andWhere("product.status_id = :statusId", {
			statusId,
		});
	}

	if (search) {
		query.andWhere(
			`(
				product.name ILIKE :search
				OR product.reference ILIKE :search
				OR COALESCE(product.description, '') ILIKE :search
				OR COALESCE(product.technical_info, '') ILIKE :search
				OR COALESCE(productCategory.name, '') ILIKE :search
				OR COALESCE(productLine.name, '') ILIKE :search
				OR COALESCE(productSubcategory.name, '') ILIKE :search
				OR COALESCE(product.format, '') ILIKE :search
				OR COALESCE(product.packing::text, '') ILIKE :search
				OR COALESCE(product.supplier, '') ILIKE :search
			)`,
			{ search: `%${search}%` },
		);
	}

	return query.getMany();
}

export async function getProductById(id: string) {
	const ds = await getDataSource();
	const repo = ds.getRepository(Product);

	return repo
		.createQueryBuilder("product")
		.leftJoinAndSelect("product.productCategory", "productCategory")
		.leftJoinAndSelect("product.productLine", "productLine")
		.leftJoinAndSelect("product.productSubcategory", "productSubcategory")
		.leftJoinAndSelect("product.status", "status")
		.leftJoinAndSelect("product.supportResources", "supportResources")
		.leftJoinAndSelect("supportResources.resourceType", "resourceType")
		.where("product.id = :id", { id })
		.orderBy("supportResources.created_at", "ASC")
		.getOne();
}

export async function createProduct(input: AdminUpsertProductBody) {
	const ds = await getDataSource();
	const normalized = normalizeProductWriteInput(input, {
		required: true,
	});

	try {
		const createdProduct = await ds.transaction(async (manager) => {
			await requireProductCategory(
				manager,
				String(normalized.productCategoryId),
			);
			await requireProductLineForCategory(
				manager,
				String(normalized.productLineId),
				String(normalized.productCategoryId),
			);

			if (normalized.productSubcategoryId) {
				await requireProductSubcategoryForLine(
					manager,
					normalized.productSubcategoryId,
					String(normalized.productLineId),
				);
			}

			await requireProductStatus(manager, Number(normalized.statusId));

			const repo = manager.getRepository(Product);
			const product = repo.create({
				name: normalized.name,
				reference: normalized.reference,
				description: normalized.description ?? null,
				product_category_id: String(normalized.productCategoryId),
				product_line_id: String(normalized.productLineId),
				product_subcategory_id: normalized.productSubcategoryId ?? null,
				image_url: normalized.imageUrl ?? null,
				format: normalized.format ?? null,
				packing: normalized.packing ?? null,
				technical_info: normalized.technicalInfo ?? null,
				status_id: Number(normalized.statusId),
				base_price: String(normalized.basePrice),
				supplier: normalized.supplier ?? null,
			});

			return repo.save(product);
		});

		return getProductById(createdProduct.id);
	} catch (error) {
		rethrowCatalogPersistenceError(
			error,
			"No se pudo crear el producto",
			"PRODUCT_CREATE_FAILED",
		);
	}
}

export async function updateProduct(input: { productId: string } & AdminUpsertProductBody) {
	const ds = await getDataSource();
	const normalized = normalizeProductWriteInput(input);

	try {
		const updatedProduct = await ds.transaction(async (manager) => {
			const repo = manager.getRepository(Product);
			const product = await requireProduct(manager, input.productId);
			const previousImageUrl = product.image_url;

			const nextProductCategoryId =
				normalized.productCategoryId ?? product.product_category_id;
			const nextProductLineId =
				normalized.productLineId ?? product.product_line_id;
			const nextProductSubcategoryId =
				normalized.productSubcategoryId !== undefined
					? normalized.productSubcategoryId
					: product.product_subcategory_id;
			const nextStatusId = normalized.statusId ?? product.status_id;

			await requireProductCategory(manager, nextProductCategoryId);
			await requireProductLineForCategory(
				manager,
				nextProductLineId,
				nextProductCategoryId,
			);

			if (nextProductSubcategoryId) {
				await requireProductSubcategoryForLine(
					manager,
					nextProductSubcategoryId,
					nextProductLineId,
				);
			}

			await requireProductStatus(manager, nextStatusId);

			if (normalized.name !== undefined) {
				product.name = normalized.name;
			}

			if (normalized.reference !== undefined) {
				product.reference = normalized.reference;
			}

			if (normalized.description !== undefined) {
				product.description = normalized.description;
			}

			if (normalized.productCategoryId !== undefined) {
				product.product_category_id = normalized.productCategoryId;
			}

			if (normalized.productLineId !== undefined) {
				product.product_line_id = normalized.productLineId;
			}

			if (normalized.productSubcategoryId !== undefined) {
				product.product_subcategory_id = normalized.productSubcategoryId;
			}

			if (normalized.imageUrl !== undefined) {
				product.image_url = normalized.imageUrl;
			}

			if (normalized.format !== undefined) {
				product.format = normalized.format;
			}

			if (normalized.packing !== undefined) {
				product.packing = normalized.packing;
			}

			if (normalized.technicalInfo !== undefined) {
				product.technical_info = normalized.technicalInfo;
			}

			if (normalized.statusId !== undefined) {
				product.status_id = normalized.statusId;
			}

			if (normalized.basePrice !== undefined) {
				product.base_price = normalized.basePrice;
			}

			if (normalized.supplier !== undefined) {
				product.supplier = normalized.supplier;
			}

			const savedProduct = await repo.save(product);

			return {
				id: savedProduct.id,
				previousImageUrl,
				nextImageUrl: savedProduct.image_url,
			};
		});

		await cleanupCatalogImageReplacement(
			updatedProduct.previousImageUrl,
			updatedProduct.nextImageUrl,
			"catalog/product",
		);

		return getProductById(updatedProduct.id);
	} catch (error) {
		rethrowCatalogPersistenceError(
			error,
			"No se pudo actualizar el producto",
			"PRODUCT_UPDATE_FAILED",
		);
	}
}
