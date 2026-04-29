import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	ManyToOne,
	JoinColumn,
	Index,
} from "typeorm";
import type { Relation } from "typeorm";
import { SupportResourceType } from "./SupportResourceType";
import { Product } from "./Product";
import { ProductLine } from "./ProductLine";

@Entity("support_resources")
@Index("support_resources_resource_type_id_index", ["resource_type_id"])
@Index("support_resources_product_id_index", ["product_id"])
@Index("support_resources_product_line_id_index", ["product_line_id"])
export class SupportResource {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "text" })
	title!: string;

	@Column({ type: "text", nullable: true })
	description!: string | null;

	@Column({ type: "smallint" })
	resource_type_id!: number;

	@Column({ type: "text" })
	resource_url!: string;

	@Column({ type: "uuid", nullable: true })
	product_id!: string | null;

	@Column({ type: "uuid", nullable: true })
	product_line_id!: string | null;

	@ManyToOne(() => SupportResourceType, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "resource_type_id" })
	resourceType!: Relation<SupportResourceType>;

	@ManyToOne(() => Product, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
		nullable: true,
	})
	@JoinColumn({ name: "product_id" })
	product!: Relation<Product> | null;

	@ManyToOne(() => ProductLine, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
		nullable: true,
	})
	@JoinColumn({ name: "product_line_id" })
	productLine!: Relation<ProductLine> | null;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;
}
