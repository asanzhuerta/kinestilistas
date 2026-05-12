import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
	Index,
} from "typeorm";
import type { Relation } from "typeorm";
import { Order } from "./Order";
import { Product } from "./Product";
import { ColorReference } from "./ColorReference";

@Entity("order_lines")
@Index("order_lines_order_id_index", ["order_id"])
@Index("order_lines_product_id_index", ["product_id"])
@Index("order_lines_color_reference_id_index", ["color_reference_id"])
export class OrderLine {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "uuid" })
	order_id!: string;

	@Column({ type: "uuid" })
	product_id!: string;

	@Column({ type: "uuid", nullable: true })
	color_reference_id!: string | null;

	@Column({ type: "integer" })
	quantity!: number;

	@Column({ type: "numeric", precision: 12, scale: 2 })
	unit_price_snapshot!: string;

	@Column({ type: "numeric", precision: 5, scale: 2, default: "0.00" })
	discount_percentage!: string;

	@Column({ type: "numeric", precision: 12, scale: 2 })
	line_total!: string;

	@Column({ type: "text" })
	order_reference_snapshot!: string;

	@Column({ type: "text", nullable: true })
	variant_code_snapshot!: string | null;

	@Column({ type: "text", nullable: true })
	variant_name_snapshot!: string | null;

	@ManyToOne(() => Order, {
		onDelete: "CASCADE",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "order_id" })
	order!: Relation<Order>;

	@ManyToOne(() => Product, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "product_id" })
	product!: Relation<Product>;

	@ManyToOne(() => ColorReference, {
		onDelete: "SET NULL",
		onUpdate: "CASCADE",
		nullable: true,
	})
	@JoinColumn({ name: "color_reference_id" })
	colorReference!: Relation<ColorReference | null>;
}
