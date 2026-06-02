import { Entity, PrimaryColumn, Column, OneToMany } from "typeorm";
import type { Relation } from "typeorm";
import { Order } from "./Order";

@Entity({ name: "order_payment_statuses" })
export class OrderPaymentStatus {
	@PrimaryColumn({ type: "smallint" })
	id!: number;

	@Column({ type: "text", unique: true })
	code!: string;

	@Column({ type: "text", unique: true })
	name!: string;

	@OneToMany(() => Order, (order) => order.paymentStatus)
	orders!: Relation<Order[]>;
}
