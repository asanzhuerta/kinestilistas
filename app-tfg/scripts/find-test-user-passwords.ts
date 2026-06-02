import bcrypt from "bcryptjs";
import { getDataSource } from "../lib/typeorm/data-source";
import { User } from "../lib/typeorm/entities/User";

const DEFAULT_CANDIDATES = [
	"admin",
	"admin123$",
	"comercial",
	"comercial123$",
	"comercial123!",
	"cliente",
	"cliente123$",
	"lucy123$",
	"Comercial123!",
	"Cliente123!",
	"Admin123!",
];

async function main() {
	const ds = await getDataSource();

	try {
		const users = await ds.getRepository(User).find({
			select: {
				id: true,
				email: true,
				name: true,
				password_hash: true,
				role_id: true,
				status_id: true,
			},
			order: {
				created_at: "DESC",
			},
		});

		const matches = [];

		for (const user of users) {
			const matchedPasswords: string[] = [];

			for (const candidate of DEFAULT_CANDIDATES) {
				const matchesCandidate = await bcrypt.compare(
					candidate,
					user.password_hash,
				);

				if (matchesCandidate) {
					matchedPasswords.push(candidate);
				}
			}

			matches.push({
				id: user.id,
				email: user.email,
				name: user.name,
				roleId: user.role_id,
				statusId: user.status_id,
				matchedPasswords,
			});
		}

		console.log(JSON.stringify(matches, null, 2));
	} finally {
		await ds.destroy();
	}
}

void main().catch((error) => {
	console.error("[find-test-user-passwords] error:", error);
	process.exit(1);
});
