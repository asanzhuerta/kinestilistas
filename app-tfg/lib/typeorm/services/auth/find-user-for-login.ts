import { getDataSource } from "@/lib/typeorm/data-source";
import { User } from "@/lib/typeorm/entities/User";

export async function findUserForLogin(identifier: string) {
	const ds = await getDataSource();
	const repo = ds.getRepository(User);

	const normalizedIdentifier = identifier.trim().toLowerCase();

	return repo
		.createQueryBuilder("u")
		.innerJoinAndSelect("u.role", "r")
		.innerJoinAndSelect("u.status", "s")
		.where("LOWER(u.email) = :identifier", {
			identifier: normalizedIdentifier,
		})
		.orWhere("LOWER(COALESCE(u.phone, '')) = :identifier", {
			identifier: normalizedIdentifier,
		})
		.orWhere("LOWER(u.name) = :identifier", {
			identifier: normalizedIdentifier,
		})
		.select([
			"u.id",
			"u.email",
			"u.phone",
			"u.name",
			"u.password_hash",
			"u.profile_image_url",
			"u.status_id",
			"u.role_id",
			"r.id",
			"r.code",
			"r.name",
			"s.id",
			"s.code",
			"s.name",
		])
		.limit(1)
		.getOne();
}
