import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import { Role } from "./entities/Role";
import { UserStatus } from "./entities/UserStatus";
import { RequestStatus } from "./entities/RequestStatus";
import { RequestSourceType } from "./entities/RequestSourceType";
import { AccessEventType } from "./entities/AccessEventType";
import { AccessResultType } from "./entities/AccessResultType";
import { UserAdminActionType } from "./entities/UserAdminActionType";
import { User } from "./entities/User";
import { UserRequest } from "./entities/UserRequest";
import { UserManagementLog } from "./entities/UserManagementLog";
import { UserAccessLog } from "./entities/UserAccessLog";
import { CommercialVisitStatus } from "./entities/CommercialVisitStatus";
import { CommercialVisitType } from "./entities/CommercialVisitType";
import { CommercialRouteStatus } from "./entities/CommercialRouteStatus";
import { Client } from "./entities/Client";
import { Commercial } from "./entities/Commercial";
import { ClientCommercialAssignment } from "./entities/ClientCommercialAssignment";
import { CommercialVisit } from "./entities/CommercialVisit";
import { CommercialRoute } from "./entities/CommercialRoute";
import { RouteVisit } from "./entities/RouteVisit";

export const entities = [
	Role,
	UserStatus,
	RequestStatus,
	RequestSourceType,
	AccessEventType,
	AccessResultType,
	UserAdminActionType,
	User,
	UserRequest,
	UserManagementLog,
	UserAccessLog,
	CommercialVisitStatus,
	CommercialVisitType,
	CommercialRouteStatus,
	Client,
	Commercial,
	ClientCommercialAssignment,
	CommercialVisit,
	CommercialRoute,
	RouteVisit,
];

function createDataSource() {
	return new DataSource({
		type: "postgres",
		url: process.env.DATABASE_URL,
		entities,
		synchronize: false,
		logging: false,
	});
}

export const AppDataSource = createDataSource();

let productionInitPromise: Promise<DataSource> | null = null;

export async function getDataSource(): Promise<DataSource> {
	if (process.env.NODE_ENV !== "production") {
		const ds = createDataSource();

		if (!ds.isInitialized) {
			await ds.initialize();
		}

		return ds;
	}

	if (AppDataSource.isInitialized) {
		return AppDataSource;
	}

	if (!productionInitPromise) {
		productionInitPromise = AppDataSource.initialize();
	}

	await productionInitPromise;

	return AppDataSource;
}
