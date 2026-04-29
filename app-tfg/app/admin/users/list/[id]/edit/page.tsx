import { notFound } from "next/navigation";
import UserProfileCard from "@/app/components/users/UserProfileCard";
import { getUserById } from "@/lib/typeorm/services/users/user";
import { listRoles } from "@/lib/typeorm/services/users/role";
import PageTransition from "@/app/components/animations/PageTransition";

// Recibe el ID del usuario a editar a través de los parámetros de la URL.
type Props = {
	params: Promise<{ id: string }>;
};

// admin/users/list/[id]/edit
// Página para editar un usuario específico desde el panel de administración.
// Se accede desde la tabla de usuarios y permite modificar sus datos,
// así como su rol, estado y contraseña.
export default async function EditUsuarioPage({ params }: Props) {
	// PARÁMETROS Y CARGA DE DATOS

	// Obtiene el ID del usuario a editar desde la URL.
	const { id } = await params;

	// Carga en paralelo:
	// - el usuario seleccionado
	// - los roles disponibles para el selector
	const [usuario, roles] = await Promise.all([
		getUserById(id),
		listRoles(),
	]);

	// Si el usuario no existe, se muestra la página de "No encontrado".
	if (!usuario) {
		notFound();
	}

	// RENDER
	return (
		<PageTransition>
			<UserProfileCard
				mode="admin-edit"
				submitUrl={`/api/admin/users/${usuario.id}`}
				clientProfile={
					usuario.linkedClient
						? {
								id: usuario.linkedClient.id,
								name: usuario.linkedClient.name,
								contact_name: usuario.linkedClient.contact_name,
								tax_id: usuario.linkedClient.tax_id,
								address: usuario.linkedClient.address,
								city: usuario.linkedClient.city,
								postal_code: usuario.linkedClient.postal_code,
								province: usuario.linkedClient.province,
								lat: usuario.linkedClient.lat,
								lng: usuario.linkedClient.lng,
								visit_window_start_time:
									usuario.linkedClient.visit_window_start_time,
								visit_window_end_time:
									usuario.linkedClient.visit_window_end_time,
								notes: usuario.linkedClient.notes,
							}
						: null
				}
				roles={roles.map((role) => ({
					id: role.id,
					name: role.name,
				}))}
				user={{
					id: usuario.id,
					name: usuario.name,
					email: usuario.email,
					company: usuario.company,
					phone: usuario.phone,
					profile_image_url: usuario.profile_image_url,
					created_at: usuario.created_at,
					last_login_at: usuario.last_login_at,
					role_id: usuario.role_id,
					status_id: usuario.status_id,
					role: {
						code: usuario.role.code as "admin" | "client" | "commercial",
					},
					status: {
						code: usuario.status.code as "active" | "inactive" | "blocked",
					},
				}}
			/>
		</PageTransition>
	);
}
