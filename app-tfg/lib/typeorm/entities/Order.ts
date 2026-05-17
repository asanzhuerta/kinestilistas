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

@Entity("orders")
@Index("orders_client_id_index", ["client_id"])
@Index("orders_created_by_user_id_index", ["created_by_user_id"])
@Index("orders_status_id_index", ["status_id"])
@Index("orders_delivery_visit_id_index", ["delivery_visit_id"])
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

	@Column({ type: "numeric", precision: 12, scale: 2 })
	total_amount!: string;

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

	@OneToMany(() => OrderLine, (orderLine) => orderLine.order)
	lines!: Relation<OrderLine[]>;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at!: Date;
}
