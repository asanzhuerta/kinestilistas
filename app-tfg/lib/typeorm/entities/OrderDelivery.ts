import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	OneToMany,
	JoinColumn,
	Index,
} from "typeorm";
import type { Relation } from "typeorm";
import { Order } from "./Order";
import { Commercial } from "./Commercial";
import { CommercialVisit } from "./CommercialVisit";
import { User } from "./User";
import { OrderDeliveryLine } from "./OrderDeliveryLine";

export type OrderDeliveryStatus =
	| "prepared"
	| "planned"
	| "delivered"
	| "cancelled";

export type OrderDeliveryFulfillmentMethod = "commercial" | "agency";

@Entity("order_deliveries")
@Index("order_deliveries_order_id_index", ["order_id"])
@Index("order_deliveries_commercial_id_index", ["commercial_id"])
@Index("order_deliveries_delivery_visit_id_index", ["delivery_visit_id"])
@Index("order_deliveries_status_index", ["status"])
@Index("order_deliveries_fulfillment_method_index", ["fulfillment_method"])
@Index("order_deliveries_created_at_index", ["created_at"])
export class OrderDelivery {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "uuid" })
	order_id!: string;

	@Column({ type: "uuid" })
	commercial_id!: string;

	@Column({ type: "uuid", nullable: true })
	delivery_visit_id!: string | null;

	@Column({ type: "text", default: "prepared" })
	status!: OrderDeliveryStatus;

	@Column({ type: "text", default: "commercial" })
	fulfillment_method!: OrderDeliveryFulfillmentMethod;

	@Column({ type: "integer" })
	package_count!: number;

	@Column({ type: "text", nullable: true })
	notes!: string | null;

	@Column({ type: "timestamptz", nullable: true })
	delivered_at!: Date | null;

	@Column({ type: "uuid", nullable: true })
	delivered_by_user_id!: string | null;

	@Column({ type: "uuid", nullable: true })
	created_by_user_id!: string | null;

	@ManyToOne(() => Order, (order) => order.deliveries, {
		onDelete: "CASCADE",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "order_id" })
	order!: Relation<Order>;

	@ManyToOne(() => Commercial, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "commercial_id" })
	commercial!: Relation<Commercial>;

	@ManyToOne(() => CommercialVisit, (visit) => visit.deliveryRepartos, {
		onDelete: "SET NULL",
		onUpdate: "CASCADE",
		nullable: true,
	})
	@JoinColumn({ name: "delivery_visit_id" })
	deliveryVisit!: Relation<CommercialVisit | null>;

	@ManyToOne(() => User, {
		onDelete: "SET NULL",
		onUpdate: "CASCADE",
		nullable: true,
	})
	@JoinColumn({ name: "delivered_by_user_id" })
	deliveredByUser!: Relation<User | null>;

	@ManyToOne(() => User, {
		onDelete: "SET NULL",
		onUpdate: "CASCADE",
		nullable: true,
	})
	@JoinColumn({ name: "created_by_user_id" })
	createdByUser!: Relation<User | null>;

	@OneToMany(() => OrderDeliveryLine, (line) => line.delivery)
	lines!: Relation<OrderDeliveryLine[]>;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at!: Date;
}
