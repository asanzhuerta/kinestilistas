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
import { Client } from "./Client";
import { User } from "./User";
import { OrderStatus } from "./OrderStatus";
import { OrderLine } from "./OrderLine";
import { CommercialVisit } from "./CommercialVisit";
import { OrderPaymentStatus } from "./OrderPaymentStatus";
import { OrderPayment } from "./OrderPayment";
import { OrderDelivery } from "./OrderDelivery";

@Entity("orders")
@Index("orders_client_id_index", ["client_id"])
@Index("orders_created_by_user_id_index", ["created_by_user_id"])
@Index("orders_status_id_index", ["status_id"])
@Index("orders_payment_status_id_index", ["payment_status_id"])
@Index("orders_delivery_visit_id_index", ["delivery_visit_id"])
@Index("orders_paid_by_user_id_index", ["paid_by_user_id"])
@Index("orders_fulfillment_method_index", ["fulfillment_method"])
@Index("orders_created_at_index", ["created_at"])
export class Order {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "uuid" })
	client_id!: string;

	@Column({ type: "uuid" })
	created_by_user_id!: string;

	@Column({ type: "smallint" })
	status_id!: number;

	@Column({ type: "uuid", nullable: true })
	delivery_visit_id!: string | null;

	@Column({ type: "smallint", default: 1 })
	payment_status_id!: number;

	@Column({ type: "text", nullable: true })
	payment_method!: string | null;

	@Column({ type: "text", nullable: true })
	payment_notes!: string | null;

	@Column({ type: "timestamptz", nullable: true })
	paid_at!: Date | null;

	@Column({ type: "uuid", nullable: true })
	paid_by_user_id!: string | null;

	@Column({ type: "numeric", precision: 12, scale: 2 })
	total_amount!: string;

	@Column({ type: "text", default: "commercial" })
	fulfillment_method!: "commercial" | "agency";

	@Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
	agency_delivery_fee!: string;

	@Column({ type: "text", nullable: true })
	notes!: string | null;

	@ManyToOne(() => Client, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "client_id" })
	client!: Relation<Client>;

	@ManyToOne(() => User, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "created_by_user_id" })
	createdByUser!: Relation<User>;

	@ManyToOne(() => OrderStatus, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "status_id" })
	status!: Relation<OrderStatus>;

	@ManyToOne(() => CommercialVisit, {
		onDelete: "SET NULL",
		onUpdate: "CASCADE",
		nullable: true,
	})
	@JoinColumn({ name: "delivery_visit_id" })
	deliveryVisit!: Relation<CommercialVisit | null>;

	@ManyToOne(() => OrderPaymentStatus, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "payment_status_id" })
	paymentStatus!: Relation<OrderPaymentStatus>;

	@ManyToOne(() => User, {
		onDelete: "SET NULL",
		onUpdate: "CASCADE",
		nullable: true,
	})
	@JoinColumn({ name: "paid_by_user_id" })
	paidByUser!: Relation<User | null>;

	@OneToMany(() => OrderLine, (orderLine) => orderLine.order)
	lines!: Relation<OrderLine[]>;

	@OneToMany(() => OrderPayment, (payment) => payment.order)
	payments!: Relation<OrderPayment[]>;

	@OneToMany(() => OrderDelivery, (delivery) => delivery.order)
	deliveries!: Relation<OrderDelivery[]>;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at!: Date;
}
