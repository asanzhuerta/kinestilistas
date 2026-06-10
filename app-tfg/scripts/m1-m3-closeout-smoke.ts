import bcrypt from "bcryptjs";
import { In } from "typeorm";
import {
	COMMERCIAL_VISIT_TYPE_IDS,
	PRODUCT_STATUS_IDS,
	ROLE_IDS,
	USER_STATUS_IDS,
} from "@/lib/typeorm/constants/catalog-ids";
import { getDataSource } from "@/lib/typeorm/data-source";
import { AppNotification } from "@/lib/typeorm/entities/AppNotification";
import { Client } from "@/lib/typeorm/entities/Client";
import { ClientCommercialAssignment } from "@/lib/typeorm/entities/ClientCommercialAssignment";
import { ClientCustomerSegment } from "@/lib/typeorm/entities/ClientCustomerSegment";
import { Commercial } from "@/lib/typeorm/entities/Commercial";
import { CommercialRoute } from "@/lib/typeorm/entities/CommercialRoute";
import { CommercialVisit } from "@/lib/typeorm/entities/CommercialVisit";
import { Product } from "@/lib/typeorm/entities/Product";
import { ProductCategory } from "@/lib/typeorm/entities/ProductCategory";
import { ProductLine } from "@/lib/typeorm/entities/ProductLine";
import { ProductSubcategory } from "@/lib/typeorm/entities/ProductSubcategory";
import { RouteVisit } from "@/lib/typeorm/entities/RouteVisit";
import { User } from "@/lib/typeorm/entities/User";
import { UserAccessLog } from "@/lib/typeorm/entities/UserAccessLog";
import { UserManagementLog } from "@/lib/typeorm/entities/UserManagementLog";
import { UserRequest } from "@/lib/typeorm/entities/UserRequest";
import { createProduct } from "@/lib/typeorm/services/catalog/product";
import { createProductCategory } from "@/lib/typeorm/services/catalog/product-category";
import { createProductLine } from "@/lib/typeorm/services/catalog/product-line";
import { createProductSubcategory } from "@/lib/typeorm/services/catalog/product-subcategory";
import {
	getActiveAssignmentByClientId,
	listActiveAssignmentsByCommercialId,
} from "@/lib/typeorm/services/commercial/client-commercial-assignment";
import { updateClient } from "@/lib/typeorm/services/commercial/client";
import {
	listCommercialVisitsByClient,
	listCommercialVisitsByCommercial,
	createCommercialVisit,
} from "@/lib/typeorm/services/commercial/commercial-visit";
import {
	addVisitToRoute,
	createCommercialRoute,
} from "@/lib/typeorm/services/commercial/commercial-route";
import { upsertCommercialProfile } from "@/lib/typeorm/services/commercial/commercial";
import { changeUserPassword } from "@/lib/typeorm/services/users/password";
import {
	approveUserRequest,
	createRegisterRequest,
} from "@/lib/typeorm/services/users/request";
import { registerUserByAdmin } from "@/lib/typeorm/services/users/user";
import { findUserForLogin } from "@/lib/typeorm/services/auth/find-user-for-login";

type CleanupState = {
	userIds: string[];
	requestIds: string[];
	emails: string[];
	clientIds: string[];
	commercialIds: string[];
	visitIds: string[];
	routeIds: string[];
	routeVisitIds: string[];
	productIds: string[];
	subcategoryIds: string[];
	lineIds: string[];
	categoryIds: string[];
};

function assertCondition(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

function toDateOnly(date: Date) {
	return date.toISOString().slice(0, 10);
}

async function findActiveAdmin() {
	const ds = await getDataSource();
	const admin = await ds.getRepository(User).findOne({
		where: {
			role_id: ROLE_IDS.ADMIN,
			status_id: USER_STATUS_IDS.ACTIVE,
		},
		order: {
			created_at: "DESC",
		},
	});

	assertCondition(
		admin?.id,
		"No hay un usuario administrador activo para ejecutar el cierre de M1-M3",
	);

	return admin;
}

async function cleanupTemporaryData(state: CleanupState) {
	const ds = await getDataSource();

	await ds.transaction(async (manager) => {
		if (state.productIds.length > 0) {
			await manager.getRepository(Product).delete(state.productIds);
		}

		if (state.subcategoryIds.length > 0) {
			await manager.getRepository(ProductSubcategory).delete(state.subcategoryIds);
		}

		if (state.lineIds.length > 0) {
			await manager.getRepository(ProductLine).delete(state.lineIds);
		}

		if (state.categoryIds.length > 0) {
			await manager.getRepository(ProductCategory).delete(state.categoryIds);
		}

		if (state.routeVisitIds.length > 0) {
			await manager.getRepository(RouteVisit).delete(state.routeVisitIds);
		}

		if (state.routeIds.length > 0) {
			await manager.getRepository(CommercialRoute).delete(state.routeIds);
		}

		if (state.visitIds.length > 0) {
			await manager.getRepository(AppNotification).delete({
				source_id: In(state.visitIds),
			});
			await manager.getRepository(CommercialVisit).delete(state.visitIds);
		}

		if (state.clientIds.length > 0) {
			await manager.getRepository(AppNotification).delete({
				recipient_user_id: In(state.clientIds),
			});
			await manager.getRepository(ClientCustomerSegment).delete({
				client_id: In(state.clientIds),
			});
			await manager.getRepository(ClientCommercialAssignment).delete({
				client_id: In(state.clientIds),
			});
			await manager.getRepository(Client).delete(state.clientIds);
		}

		if (state.commercialIds.length > 0) {
			await manager.getRepository(ClientCommercialAssignment).delete({
				commercial_id: In(state.commercialIds),
			});
			await manager.getRepository(Commercial).delete(state.commercialIds);
		}

		if (state.userIds.length > 0) {
			await manager
				.createQueryBuilder()
				.delete()
				.from(UserAccessLog)
				.where("user_id IN (:...userIds)", { userIds: state.userIds })
				.execute();

			await manager
				.createQueryBuilder()
				.delete()
				.from(UserManagementLog)
				.where("target_user_id IN (:...userIds)", { userIds: state.userIds })
				.orWhere("performed_by IN (:...userIds)", { userIds: state.userIds })
				.execute();
		}

		if (state.requestIds.length > 0 || state.emails.length > 0) {
			const requestDelete = manager
				.createQueryBuilder()
				.delete()
				.from(UserRequest);

			if (state.requestIds.length > 0 && state.emails.length > 0) {
				await requestDelete
					.where("id IN (:...requestIds)", { requestIds: state.requestIds })
					.orWhere("email IN (:...emails)", { emails: state.emails })
					.execute();
			} else if (state.requestIds.length > 0) {
				await requestDelete
					.where("id IN (:...requestIds)", { requestIds: state.requestIds })
					.execute();
			} else {
				await requestDelete
					.where("email IN (:...emails)", { emails: state.emails })
					.execute();
			}
		}

		if (state.userIds.length > 0) {
			await manager.getRepository(User).delete(state.userIds);
		}
	});
}

async function main() {
	const state: CleanupState = {
		userIds: [],
		requestIds: [],
		emails: [],
		clientIds: [],
		commercialIds: [],
		visitIds: [],
		routeIds: [],
		routeVisitIds: [],
		productIds: [],
		subcategoryIds: [],
		lineIds: [],
		categoryIds: [],
	};
	const now = Date.now();
	const tag = `m1-m3-closeout-${now}`;
	const admin = await findActiveAdmin();
	const commercialEmail = `${tag}-commercial@example.com`;
	const clientEmail = `${tag}-client@example.com`;
	const initialClientPassword = "Pass!2345";
	const updatedClientPassword = "Pass!9876";

	state.emails.push(commercialEmail, clientEmail);

	try {
		const commercialUser = await registerUserByAdmin({
			name: `Comercial ${tag}`,
			email: commercialEmail,
			password: "Pass!3456",
			company: "Smoke TFG",
			phone: `600${String(now).slice(-6)}`,
			roleId: ROLE_IDS.COMMERCIAL,
			performedByUserId: admin.id,
		});

		assertCondition(commercialUser?.id, "No se ha creado el comercial temporal");
		state.userIds.push(commercialUser.id);
		state.commercialIds.push(commercialUser.id);
		console.log("PASS M1 alta directa de comercial con perfil derivado");

		const commercialProfile = await upsertCommercialProfile({
			userId: commercialUser.id,
			employeeCode: `SMK-${String(now).slice(-6)}`,
			territory: "Ruta smoke M1-M3",
			workdayStartTime: "09:00",
			workdayEndTime: "18:00",
			deliveryVisitDurationMinutes: 12,
			routineVisitDurationMinutes: 30,
			routeStartAddress: "Punto inicial smoke",
			routeStartLat: "36.529700",
			routeStartLng: "-6.292000",
			routeEndAddress: "Punto final smoke",
			routeEndLat: "36.529700",
			routeEndLng: "-6.292000",
			returnToStart: true,
		});

		assertCondition(
			commercialProfile?.workday_start_time === "09:00:00" &&
				commercialProfile.route_start_lat === "36.529700",
			"No se ha persistido la configuración operativa del comercial",
		);
		console.log("PASS M2 configuración operativa del comercial");

		const clientRequest = await createRegisterRequest({
			name: `Cliente ${tag}`,
			email: clientEmail,
			password: initialClientPassword,
			company: `Salon ${tag}`,
			phone: `700${String(now).slice(-6)}`,
			roleId: ROLE_IDS.CLIENT,
		});

		assertCondition(clientRequest?.id, "No se ha creado la solicitud de alta");
		state.requestIds.push(clientRequest.id);
		console.log("PASS M1 solicitud pública de alta registrada");

		const approved = await approveUserRequest(
			clientRequest.id,
			admin.id,
			commercialUser.id,
		);
		const clientUser = approved.user;

		assertCondition(clientUser?.id, "No se ha creado el usuario de cliente");
		state.userIds.push(clientUser.id);
		state.clientIds.push(clientUser.id);
		console.log("PASS M1 solicitud aprobada con usuario activo");

		const loginUser = await findUserForLogin(clientEmail);
		assertCondition(
			loginUser?.status?.code === "active" &&
				loginUser.role?.code === "client" &&
				(await bcrypt.compare(initialClientPassword, loginUser.password_hash)),
			"El usuario aprobado no queda disponible para autenticación",
		);
		console.log("PASS M1 autenticación local por credenciales validada");

		const passwordResult = await changeUserPassword({
			mode: "self",
			userId: clientUser.id,
			currentPassword: initialClientPassword,
			newPassword: updatedClientPassword,
		});

		const loginUserAfterPasswordChange = await findUserForLogin(clientEmail);
		assertCondition(
			passwordResult.ok &&
				loginUserAfterPasswordChange &&
				(await bcrypt.compare(
					updatedClientPassword,
					loginUserAfterPasswordChange.password_hash,
				)),
			"El cambio de contraseña del usuario cliente no queda persistido",
		);
		console.log("PASS M1 cambio de contraseña persistido");

		const updatedClient = await updateClient({
			clientId: clientUser.id,
			name: `Salon actualizado ${tag}`,
			contactName: `Responsable ${tag}`,
			taxId: "B12345678",
			address: "Calle Ancha 1",
			city: "Cádiz",
			postalCode: "11001",
			province: "Cádiz",
			lat: "36.529700",
			lng: "-6.292000",
			visitWindowStartTime: "10:00",
			visitWindowEndTime: "13:00",
			notes: "Cliente temporal para cierre M1-M3",
		});

		assertCondition(
			updatedClient.lat === "36.529700" &&
				updatedClient.visit_window_start_time === "10:00:00",
			"No se ha actualizado correctamente la ficha del cliente",
		);
		console.log("PASS M2 ficha de cliente con geodatos y franja horaria");

		const activeAssignment = await getActiveAssignmentByClientId(clientUser.id);
		const commercialAssignments = await listActiveAssignmentsByCommercialId(
			commercialUser.id,
		);

		assertCondition(
			activeAssignment?.commercial_id === commercialUser.id &&
				commercialAssignments.some(
					(assignment) => assignment.client_id === clientUser.id,
				),
			"No se ha mantenido la asignación comercial-cliente activa",
		);
		console.log("PASS M2 asignación comercial-cliente consultable");

		const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
		const visit = await createCommercialVisit({
			clientId: clientUser.id,
			commercialId: commercialUser.id,
			scheduledForDate: toDateOnly(tomorrow),
			visitTypeId: COMMERCIAL_VISIT_TYPE_IDS.ROUTINE,
			notes: `Visita rutinaria ${tag}`,
		});

		assertCondition(visit?.id, "No se ha creado la visita comercial temporal");
		state.visitIds.push(visit.id);

		const [commercialVisits, clientVisits] = await Promise.all([
			listCommercialVisitsByCommercial({
				commercialId: commercialUser.id,
				clientId: clientUser.id,
			}),
			listCommercialVisitsByClient(clientUser.id),
		]);

		assertCondition(
			commercialVisits.some((current) => current.id === visit.id) &&
				clientVisits.some((current) => current.id === visit.id),
			"La visita no aparece en las consultas por comercial y cliente",
		);
		console.log("PASS M2 visita comercial visible por comercial y cliente");

		const route = await createCommercialRoute({
			commercialId: commercialUser.id,
			date: toDateOnly(tomorrow),
			name: `Ruta ${tag}`,
		});
		state.routeIds.push(route.id);

		const routeVisit = await addVisitToRoute({
			routeId: route.id,
			visitId: visit.id,
			order: 1,
		});
		state.routeVisitIds.push(routeVisit.id);
		assertCondition(routeVisit.visit_order === 1, "No se ha ordenado la visita");
		console.log("PASS M2 ruta comercial con visita ordenada");

		const category = await createProductCategory({
			name: `Categoría ${tag}`,
			description: "Categoría temporal para cierre M1-M3",
			displayOrder: 900,
		});
		assertCondition(category?.id, "No se ha creado la categoría de catálogo");
		state.categoryIds.push(category.id);

		const line = await createProductLine({
			name: `Línea ${tag}`,
			description: "Línea temporal para cierre M1-M3",
			productCategoryId: category.id,
			displayOrder: 901,
		});
		assertCondition(line?.id, "No se ha creado la línea de catálogo");
		state.lineIds.push(line.id);

		const parentSubcategory = await createProductSubcategory({
			name: `Subcategoría padre ${tag}`,
			description: "Subcategoría padre temporal",
			productLineId: line.id,
			parentSubcategoryId: null,
			displayOrder: 902,
		});
		assertCondition(
			parentSubcategory?.id,
			"No se ha creado la subcategoría padre",
		);
		state.subcategoryIds.push(parentSubcategory.id);

		const childSubcategory = await createProductSubcategory({
			name: `Subcategoría hija ${tag}`,
			description: "Subcategoría hija temporal",
			productLineId: line.id,
			parentSubcategoryId: parentSubcategory.id,
			displayOrder: 903,
		});
		assertCondition(
			childSubcategory?.parent_subcategory_id === parentSubcategory.id,
			"No se ha creado la jerarquía de subcategorías",
		);
		state.subcategoryIds.unshift(childSubcategory.id);

		const product = await createProduct({
			name: `Producto ${tag}`,
			reference: `SMK-${now}`,
			description: "Producto temporal para cierre M1-M3",
			productCategoryId: category.id,
			productLineId: line.id,
			productSubcategoryId: childSubcategory.id,
			format: "250 ml",
			packing: 6,
			technicalInfo: "Ficha técnica temporal",
			statusId: PRODUCT_STATUS_IDS.ACTIVE,
			basePrice: "12.50",
			supplier: "Proveedor smoke",
		});
		assertCondition(
			product?.id &&
				product.productCategory?.id === category.id &&
				product.productLine?.id === line.id &&
				product.productSubcategory?.id === childSubcategory.id,
			"No se ha creado el producto con relaciones de catálogo completas",
		);
		state.productIds.push(product.id);
		console.log("PASS M3 catálogo con categoría, línea, jerarquía y producto");

		console.log("OK M1-M3 closeout smoke: 11/11 comprobaciones superadas");
	} finally {
		await cleanupTemporaryData(state);
		const ds = await getDataSource();
		await ds.destroy();
	}
}

main().catch((error) => {
	console.error("FAIL M1-M3 closeout smoke");
	console.error(error);
	process.exit(1);
});
