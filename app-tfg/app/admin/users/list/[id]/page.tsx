import { notFound } from "next/navigation";
import PageTransition from "@/app/components/animations/PageTransition";
import UserProfileCard from "@/app/components/users/UserProfileCard";
import { getUserById } from "@/lib/typeorm/services/users/user";

// Recibe el ID del usuario a visualizar a través de los parámetros de la URL.
type Props = {
	params: Promise<{ id: string }>;
};

// admin/users/list/[id]
// Página de detalle de un usuario específico dentro del panel de administración.
// Permite visualizar toda la información del usuario en modo lectura.
export default async function UsuarioDetallePage({ params }: Props) {
	// PARÁMETROS Y CARGA DE DATOS

	// Obtiene el ID del usuario desde la URL.
	const { id } = await params;

	// Recupera el usuario desde base de datos.
	const user = await getUserById(id);

	// Si el usuario no existe, se muestra la página de "No encontrado".
	if (!user) {
		notFound();
	}

	// RENDER
	return (
		<PageTransition>
			<div className="space-y-4">
				{/* TARJETA DE PERFIL EN MODO VISUALIZACIÓN */}
				<UserProfileCard
					mode="view"
					user={{
						id: user.id,
						name: user.name,
						email: user.email,
						company: user.company,
						phone: user.phone,
						profile_image_url: user.profile_image_url,
						created_at: user.created_at,
						last_login_at: user.last_login_at,
						role: {
							code: user.role.code as "admin" | "client" | "commercial",
						},
						status: {
							code: user.status.code as "active" | "inactive" | "blocked",
						},
					}}
					clientProfile={
						user.linkedClient
							? {
									id: user.linkedClient.id,
									name: user.linkedClient.name,
									contact_name: user.linkedClient.contact_name,
									tax_id: user.linkedClient.tax_id,
									address: user.linkedClient.address,
									city: user.linkedClient.city,
									postal_code: user.linkedClient.postal_code,
									province: user.linkedClient.province,
									lat: user.linkedClient.lat,
									lng: user.linkedClient.lng,
									visit_window_start_time:
										user.linkedClient.visit_window_start_time,
									visit_window_end_time:
										user.linkedClient.visit_window_end_time,
									notes: user.linkedClient.notes,
								}
							: null
					}
				/>
			</div>
		</PageTransition>
	);
}
