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
import { SystemConfiguration } from "./entities/SystemConfiguration";
import { ExternalIntegration } from "./entities/ExternalIntegration";
import { IntegrationOperation } from "./entities/IntegrationOperation";
import { SupplierOrderProposal } from "./entities/SupplierOrderProposal";
import { SupplierOrderProposalLine } from "./entities/SupplierOrderProposalLine";

const CliDataSource = new DataSource({
	type: "postgres",
	url: process.env.DATABASE_URL,
	synchronize: false,
	logging: true,
	entities: [
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
		SystemConfiguration,
		ExternalIntegration,
		IntegrationOperation,
		SupplierOrderProposal,
		SupplierOrderProposalLine,
	],
	migrations: ["migrations/typeorm/*.ts"],
});

export default CliDataSource;
