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
import { ProductStatus } from "./entities/ProductStatus";
import { SupportResourceType } from "./entities/SupportResourceType";
import { ProductCategory } from "./entities/ProductCategory";
import { ProductLine } from "./entities/ProductLine";
import { ProductSubcategory } from "./entities/ProductSubcategory";
import { Product } from "./entities/Product";
import { SupportResource } from "./entities/SupportResource";
import { ColorChart } from "./entities/ColorChart";
import { ColorReference } from "./entities/ColorReference";
import { OrderStatus } from "./entities/OrderStatus";
import { OrderPaymentStatus } from "./entities/OrderPaymentStatus";
import { Order } from "./entities/Order";
import { OrderLine } from "./entities/OrderLine";
import { AppRateLimitPolicy } from "./entities/AppRateLimitPolicy";
import { SalonClient } from "./entities/SalonClient";
import { SalonService } from "./entities/SalonService";
import { SalonServiceTechnicalSheet } from "./entities/SalonServiceTechnicalSheet";
import { SalonServiceProductUsage } from "./entities/SalonServiceProductUsage";
import { SalonServiceResultImage } from "./entities/SalonServiceResultImage";
import { SalonProductSuggestion } from "./entities/SalonProductSuggestion";
import { SalonServiceTemplate } from "./entities/SalonServiceTemplate";
import { SalonServiceTemplateProductUsage } from "./entities/SalonServiceTemplateProductUsage";
import { CustomerSegment } from "./entities/CustomerSegment";
import { ClientCustomerSegment } from "./entities/ClientCustomerSegment";
import { Promotion } from "./entities/Promotion";
import { TrainingEvent } from "./entities/TrainingEvent";
import { TrainingEnrollment } from "./entities/TrainingEnrollment";
import { AppNotification } from "./entities/AppNotification";
import { AppReminder } from "./entities/AppReminder";

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
	ProductStatus,
	SupportResourceType,
	ProductCategory,
	ProductLine,
	ProductSubcategory,
	Product,
	SupportResource,
	ColorChart,
	ColorReference,
	OrderStatus,
	OrderPaymentStatus,
	Order,
	OrderLine,
	AppRateLimitPolicy,
	SalonClient,
	SalonService,
	SalonServiceTechnicalSheet,
	SalonServiceProductUsage,
	SalonServiceResultImage,
	SalonProductSuggestion,
	SalonServiceTemplate,
	SalonServiceTemplateProductUsage,
	CustomerSegment,
	ClientCustomerSegment,
	Promotion,
	TrainingEvent,
	TrainingEnrollment,
	AppNotification,
	AppReminder,
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

const globalForTypeorm = globalThis as typeof globalThis & {
	__appDataSource?: DataSource;
	__appDataSourceInitPromise?: Promise<DataSource> | null;
};

function getOrCreateDataSource() {
	if (!globalForTypeorm.__appDataSource) {
		globalForTypeorm.__appDataSource = createDataSource();
	}

	return globalForTypeorm.__appDataSource;
}

function hasCurrentEntityMetadata(dataSource: DataSource) {
	return entities.every((entity) => {
		try {
			dataSource.getMetadata(entity);
			return true;
		} catch {
			return false;
		}
	});
}

function resetCachedDataSource() {
	globalForTypeorm.__appDataSource = undefined;
	globalForTypeorm.__appDataSourceInitPromise = null;
}

export async function getDataSource(): Promise<DataSource> {
	let dataSource = getOrCreateDataSource();

	// En desarrollo, el hot reload puede volver a cargar las clases Entity
	// mientras dejamos vivo el DataSource global. Cuando eso pasa, TypeORM
	// conserva metadata ligada a las clases antiguas y luego falla con
	// "EntityMetadataNotFoundError" al pedir repositorios con las nuevas.
	//
	// Importante: aqui no destruimos el DataSource anterior porque puede seguir
	// siendo usado por otras requests en vuelo. Si lo cerramos en caliente,
	// consultas concurrentes pueden caer con "Connection terminated".
	if (
		dataSource.isInitialized &&
		!hasCurrentEntityMetadata(dataSource)
	) {
		resetCachedDataSource();
		dataSource = getOrCreateDataSource();
	}

	if (dataSource.isInitialized) {
		return dataSource;
	}

	if (!globalForTypeorm.__appDataSourceInitPromise) {
		globalForTypeorm.__appDataSourceInitPromise = dataSource
			.initialize()
			.then((dataSource) => {
				globalForTypeorm.__appDataSource = dataSource;
				return dataSource;
			})
			.catch((error) => {
				globalForTypeorm.__appDataSourceInitPromise = null;
				throw error;
			});
	}

	return globalForTypeorm.__appDataSourceInitPromise;
}
