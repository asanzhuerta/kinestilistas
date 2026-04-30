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
import { ProductCategory } from "./ProductCategory";
import { ProductLine } from "./ProductLine";
import { ProductStatus } from "./ProductStatus";
import { SupportResource } from "./SupportResource";

@Entity("products")
@Index("products_name_index", ["name"])
@Index("products_product_category_id_index", ["product_category_id"])
@Index("products_product_line_id_index", ["product_line_id"])
@Index("products_status_id_index", ["status_id"])
export class Product {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "text" })
	name!: string;

	@Column({ type: "text", unique: true })
	reference!: string;

	@Column({ type: "text", nullable: true })
	description!: string | null;

	@Column({ type: "text", nullable: true })
	subcategory!: string | null;

	@Column({ type: "uuid" })
	product_category_id!: string;

	@Column({ type: "uuid" })
	product_line_id!: string;

	@Column({ type: "text", nullable: true })
	image_url!: string | null;

	@Column({ type: "text", nullable: true })
	format!: string | null;

	@Column({ type: "integer", nullable: true })
	packing!: number | null;

	@Column({ type: "text", nullable: true })
	technical_info!: string | null;

	@Column({ type: "smallint" })
	status_id!: number;

	@Column({ type: "numeric", precision: 12, scale: 2 })
	base_price!: string;

	@Column({ type: "text", nullable: true })
	supplier!: string | null;

	@ManyToOne(() => ProductCategory, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "product_category_id" })
	productCategory!: Relation<ProductCategory>;

	@ManyToOne(() => ProductLine, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	})
	@JoinColumn([
		{ name: "product_line_id", referencedColumnName: "id" },
		{
			name: "product_category_id",
			referencedColumnName: "product_category_id",
		},
	])
	productLine!: Relation<ProductLine>;

	@ManyToOne(() => ProductStatus, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "status_id" })
	status!: Relation<ProductStatus>;

	@OneToMany(
		() => SupportResource,
		(supportResource) => supportResource.product,
	)
	supportResources!: Relation<SupportResource[]>;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at!: Date;
}
