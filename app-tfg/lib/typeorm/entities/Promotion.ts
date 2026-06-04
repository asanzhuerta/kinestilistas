import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	Index,
} from "typeorm";
import type { Relation } from "typeorm";
import { Product } from "./Product";
import { ProductLine } from "./ProductLine";
import { Client } from "./Client";
import { CustomerSegment } from "./CustomerSegment";
import { User } from "./User";

export type PromotionStatus = "draft" | "active" | "archived";

@Entity("promotions")
@Index("promotions_status_index", ["status"])
@Index("promotions_start_end_date_index", ["start_date", "end_date"])
@Index("promotions_client_id_index", ["client_id"])
@Index("promotions_customer_segment_id_index", ["customer_segment_id"])
export class Promotion {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "text" })
	title!: string;

	@Column({ type: "text" })
	description!: string;

	@Column({ type: "text" })
	promotion_type!: string;

	@Column({ type: "text" })
	benefit!: string;

	@Column({ type: "date" })
	start_date!: string;

	@Column({ type: "date" })
	end_date!: string;

	@Column({ type: "text", default: "draft" })
	status!: PromotionStatus;

	@Column({ type: "uuid", nullable: true })
	product_id!: string | null;

	@Column({ type: "uuid", nullable: true })
	product_line_id!: string | null;

	@Column({ type: "uuid", nullable: true })
	client_id!: string | null;

	@Column({ type: "uuid", nullable: true })
	customer_segment_id!: string | null;

	@Column({ type: "uuid", nullable: true })
	created_by_user_id!: string | null;

	@ManyToOne(() => Product, {
		nullable: true,
		onDelete: "SET NULL",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "product_id" })
	product!: Relation<Product | null>;

	@ManyToOne(() => ProductLine, {
		nullable: true,
		onDelete: "SET NULL",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "product_line_id" })
	productLine!: Relation<ProductLine | null>;

	@ManyToOne(() => Client, {
		nullable: true,
		onDelete: "SET NULL",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "client_id" })
	client!: Relation<Client | null>;

	@ManyToOne(() => CustomerSegment, {
		nullable: true,
		onDelete: "SET NULL",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "customer_segment_id" })
	customerSegment!: Relation<CustomerSegment | null>;

	@ManyToOne(() => User, {
		nullable: true,
		onDelete: "SET NULL",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "created_by_user_id" })
	createdByUser!: Relation<User | null>;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at!: Date;
}
