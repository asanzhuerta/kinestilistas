import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";
import type { Relation } from "typeorm";
import { Order } from "./Order";
import { User } from "./User";

@Entity("order_payments")
@Index("order_payments_order_id_index", ["order_id"])
@Index("order_payments_registered_by_user_id_index", ["registered_by_user_id"])
@Index("order_payments_paid_at_index", ["paid_at"])
export class OrderPayment {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "uuid" })
	order_id!: string;

	@Column({ type: "numeric", precision: 12, scale: 2 })
	amount!: string;

	@Column({ type: "text" })
	payment_method!: string;

	@Column({ type: "text", nullable: true })
	notes!: string | null;

	@Column({ type: "timestamptz" })
	paid_at!: Date;

	@Column({ type: "uuid", nullable: true })
	registered_by_user_id!: string | null;

	@ManyToOne(() => Order, (order) => order.payments, {
		onDelete: "CASCADE",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "order_id" })
	order!: Relation<Order>;

	@ManyToOne(() => User, {
		onDelete: "SET NULL",
		onUpdate: "CASCADE",
		nullable: true,
	})
	@JoinColumn({ name: "registered_by_user_id" })
	registeredByUser!: Relation<User | null>;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at!: Date;
}
