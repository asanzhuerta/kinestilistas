import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
	Index,
} from "typeorm";
import type { Relation } from "typeorm";
import { OrderDelivery } from "./OrderDelivery";
import { OrderLine } from "./OrderLine";

@Entity("order_delivery_lines")
@Index("order_delivery_lines_delivery_id_index", ["delivery_id"])
@Index("order_delivery_lines_order_line_id_index", ["order_line_id"])
@Index("order_delivery_lines_delivery_line_unique", ["delivery_id", "order_line_id"], {
	unique: true,
})
export class OrderDeliveryLine {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "uuid" })
	delivery_id!: string;

	@Column({ type: "uuid" })
	order_line_id!: string;

	@Column({ type: "integer" })
	quantity!: number;

	@ManyToOne(() => OrderDelivery, (delivery) => delivery.lines, {
		onDelete: "CASCADE",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "delivery_id" })
	delivery!: Relation<OrderDelivery>;

	@ManyToOne(() => OrderLine, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "order_line_id" })
	orderLine!: Relation<OrderLine>;
}
