import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	OneToMany,
	JoinColumn,
	Index,
} from "typeorm";
import type { Relation } from "typeorm";
import { Client } from "./Client";
import { Commercial } from "./Commercial";
import { CommercialVisitStatus } from "./CommercialVisitStatus";
import { CommercialVisitType } from "./CommercialVisitType";
import { Order } from "./Order";
import { OrderDelivery } from "./OrderDelivery";

@Entity("commercial_visits")
@Index("commercial_visits_client_id_index", ["client_id"])
@Index("commercial_visits_commercial_id_index", ["commercial_id"])
@Index("commercial_visits_status_id_index", ["status_id"])
@Index("commercial_visits_visit_type_id_index", ["visit_type_id"])
@Index("commercial_visits_scheduled_for_date_index", ["scheduled_for_date"])
export class CommercialVisit {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "uuid" })
	client_id!: string;

	@Column({ type: "uuid" })
	commercial_id!: string;

	@Column({ type: "date" })
	scheduled_for_date!: string;

	@Column({ type: "smallint" })
	visit_type_id!: number;

	@Column({ type: "smallint" })
	status_id!: number;

	@ManyToOne(() => Client, { onDelete: "RESTRICT", onUpdate: "CASCADE" })
	@JoinColumn({ name: "client_id" })
	client!: Relation<Client>;

	@ManyToOne(() => Commercial, { onDelete: "RESTRICT", onUpdate: "CASCADE" })
	@JoinColumn({ name: "commercial_id" })
	commercial!: Relation<Commercial>;

	@ManyToOne(() => CommercialVisitType, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "visit_type_id" })
	visitType!: Relation<CommercialVisitType>;

	@ManyToOne(() => CommercialVisitStatus, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "status_id" })
	status!: Relation<CommercialVisitStatus>;

	@Column({ type: "text", nullable: true })
	notes!: string | null;

	@Column({ type: "text", nullable: true })
	result!: string | null;

	@OneToMany(() => Order, (order) => order.deliveryVisit)
	deliveryOrders!: Relation<Order[]>;

	@OneToMany(() => OrderDelivery, (delivery) => delivery.deliveryVisit)
	deliveryRepartos!: Relation<OrderDelivery[]>;
}
