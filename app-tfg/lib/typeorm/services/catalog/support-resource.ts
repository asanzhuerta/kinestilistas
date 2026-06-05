import { getDataSource } from "@/lib/typeorm/data-source";
import type { AdminUpsertSupportResourceBody } from "@/lib/contracts/product-catalog";
import { revalidateCatalogCache } from "@/lib/cache/catalog-cache";
import { SupportResource } from "@/lib/typeorm/entities/SupportResource";
import { normalizeSupportResourceWriteInput } from "./catalog-validation";
import {
	ensureSupportResourceContext,
	requireSupportResource,
	requireSupportResourceType,
	rethrowCatalogPersistenceError,
} from "./catalog-internal";

type ListSupportResourcesInput = {
	search?: string | null;
	resourceTypeId?: number | null;
	productId?: string | null;
	productLineId?: string | null;
};

export async function listSupportResources(
	input: ListSupportResourcesInput = {},
) {
	const ds = await getDataSource();
	const repo = ds.getRepository(SupportResource);
	const query = repo
		.createQueryBuilder("supportResource")
		.leftJoinAndSelect("supportResource.resourceType", "resourceType")
		.leftJoinAndSelect("supportResource.product", "product")
		.leftJoinAndSelect("supportResource.productLine", "productLine")
		.orderBy("supportResource.created_at", "DESC");

	const search = String(input.search ?? "").trim();
	const productId = String(input.productId ?? "").trim();
	const productLineId = String(input.productLineId ?? "").trim();
	const resourceTypeId =
		typeof input.resourceTypeId === "number" &&
		Number.isInteger(input.resourceTypeId)
			? input.resourceTypeId
			: null;

	if (resourceTypeId) {
		query.andWhere("supportResource.resource_type_id = :resourceTypeId", {
			resourceTypeId,
		});
	}

	if (productId) {
		query.andWhere("supportResource.product_id = :productId", {
			productId,
		});
	}

	if (productLineId) {
		query.andWhere("supportResource.product_line_id = :productLineId", {
			productLineId,
		});
	}

	if (search) {
		query.andWhere(
			`(
				supportResource.title ILIKE :search
				OR COALESCE(supportResource.description, '') ILIKE :search
				OR supportResource.resource_url ILIKE :search
			)`,
			{ search: `%${search}%` },
		);
	}

	return query.getMany();
}

export async function getSupportResourceById(id: string) {
	const ds = await getDataSource();
	const repo = ds.getRepository(SupportResource);

	return repo.findOne({
		where: { id },
		relations: {
			resourceType: true,
			product: true,
			productLine: true,
		},
	});
}

export async function createSupportResource(
	input: AdminUpsertSupportResourceBody,
) {
	const ds = await getDataSource();
	const normalized = normalizeSupportResourceWriteInput(input, {
		required: true,
		requireContext: true,
	});

	try {
		const createdSupportResource = await ds.transaction(async (manager) => {
			await requireSupportResourceType(
				manager,
				Number(normalized.resourceTypeId),
			);
			await ensureSupportResourceContext(manager, {
				productId: normalized.productId ?? null,
				productLineId: normalized.productLineId ?? null,
			});

			const repo = manager.getRepository(SupportResource);
			const supportResource = repo.create({
				title: normalized.title,
				description: normalized.description ?? null,
				resource_type_id: Number(normalized.resourceTypeId),
				resource_url: String(normalized.resourceUrl),
				product_id: normalized.productId ?? null,
				product_line_id: normalized.productLineId ?? null,
			});

			return repo.save(supportResource);
		});

		const supportResource = await getSupportResourceById(createdSupportResource.id);
		revalidateCatalogCache();

		return supportResource;
	} catch (error) {
		rethrowCatalogPersistenceError(
			error,
			"No se pudo crear el recurso de apoyo",
			"SUPPORT_RESOURCE_CREATE_FAILED",
		);
	}
}

export async function updateSupportResource(
	input: { supportResourceId: string } & AdminUpsertSupportResourceBody,
) {
	const ds = await getDataSource();
	const normalized = normalizeSupportResourceWriteInput(input);

	try {
		const updatedSupportResource = await ds.transaction(async (manager) => {
			const repo = manager.getRepository(SupportResource);
			const supportResource = await requireSupportResource(
				manager,
				input.supportResourceId,
			);

			const nextProductId =
				normalized.productId !== undefined
					? normalized.productId
					: supportResource.product_id;
			const nextProductLineId =
				normalized.productLineId !== undefined
					? normalized.productLineId
					: supportResource.product_line_id;
			const nextResourceTypeId =
				normalized.resourceTypeId ?? supportResource.resource_type_id;

			await requireSupportResourceType(manager, nextResourceTypeId);
			await ensureSupportResourceContext(manager, {
				productId: nextProductId ?? null,
				productLineId: nextProductLineId ?? null,
			});

			if (normalized.title !== undefined) {
				supportResource.title = normalized.title;
			}

			if (normalized.description !== undefined) {
				supportResource.description = normalized.description;
			}

			if (normalized.resourceTypeId !== undefined) {
				supportResource.resource_type_id = normalized.resourceTypeId;
			}

			if (normalized.resourceUrl !== undefined) {
				supportResource.resource_url = normalized.resourceUrl;
			}

			if (normalized.productId !== undefined) {
				supportResource.product_id = normalized.productId;
			}

			if (normalized.productLineId !== undefined) {
				supportResource.product_line_id = normalized.productLineId;
			}

			return repo.save(supportResource);
		});

		const supportResource = await getSupportResourceById(updatedSupportResource.id);
		revalidateCatalogCache();

		return supportResource;
	} catch (error) {
		rethrowCatalogPersistenceError(
			error,
			"No se pudo actualizar el recurso de apoyo",
			"SUPPORT_RESOURCE_UPDATE_FAILED",
		);
	}
}
