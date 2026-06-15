import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/lib/auth/require-session";
import { getUserById } from "@/lib/typeorm/services/users/user";
import PageTransition from "@/app/components/animations/PageTransition";
import SafeForm from "@/app/components/forms/SafeForm";
import SubmitButton from "@/app/components/forms/SubmitButton";

type Props = {
	params: Promise<{ id: string }>;
};

// Página de confirmación para la desactivacion de un usuario.
export default async function RemoveUserPage({ params }: Props) {
	const { id } = await params;
	const [session, user] = await Promise.all([
		requireAdminSession(),
		getUserById(id),
	]);

	if (!user) {
		notFound();
	}

	const isSelf = session.user.id === user.id;
	const isAlreadyInactive = user.status.code === "inactive";

	return (
		<PageTransition>
			<div className="space-y-6">
				<div className="rounded-2xl border border-white/15 bg-white/10 p-6 shadow-lg backdrop-blur">
					<h1 className="text-2xl font-semibold text-white">
						Desactivar usuario
					</h1>
					<p className="mt-2 text-sm text-white/80">
						Esta acción no elimina el usuario. Solo cambia su estado a{" "}
						<strong>inactivo</strong> para impedir su acceso al sistema.
					</p>
				</div>

				<div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-6 shadow-lg backdrop-blur">
					<div className="space-y-2 text-white">
						<p>
							Seguro que quieres desactivar a <strong>{user.name}</strong> (
							{user.email})?
						</p>

						<p className="text-sm text-white/70">
							Rol actual: <strong>{user.role.name}</strong>
						</p>

						<p className="text-sm text-white/70">
							Estado actual: <strong>{user.status.name}</strong>
						</p>
					</div>

					{isSelf ? (
						<div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
							No puedes desactivar tu propio usuario mientras tienes la sesión
							iniciada.
						</div>
					) : null}

					{!isSelf && isAlreadyInactive ? (
						<div className="mt-6 rounded-xl border border-white/15 bg-white/10 p-4 text-sm text-white/80">
							Este usuario ya se encuentra inactivo.
						</div>
					) : null}

					{!isSelf && !isAlreadyInactive ? (
						<SafeForm
							action={`/api/admin/users/${id}/remove`}
							className="mt-6 flex flex-wrap gap-3"
							disableUntilHydrated={false}
						>
							<SubmitButton className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-400">
								Desactivar usuario
							</SubmitButton>

							<Link
								href={`/admin/users/list/${id}`}
								className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
							>
								Cancelar
							</Link>
						</SafeForm>
					) : null}

				</div>
			</div>
		</PageTransition>
	);
}
