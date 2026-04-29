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
import { ProductCategory } from "./ProductCategory";
import { Product } from "./Product";
import { SupportResource } from "./SupportResource";
import { ColorChart } from "./ColorChart";

@Entity("product_lines")
@Index("product_lines_product_category_id_index", ["product_category_id"])
@Index("product_lines_display_order_index", ["display_order"])
@Index("product_lines_id_product_category_id_unique", ["id", "product_category_id"], {
	unique: true,
})
export class ProductLine {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "text", unique: true })
	name!: string;

	@Column({ type: "text", nullable: true })
	description!: string | null;

	@Column({ type: "uuid" })
	product_category_id!: string;

	@Column({ type: "text", nullable: true })
	image_url!: string | null;

	@Column({ type: "integer", default: 0 })
	display_order!: number;

	@ManyToOne(() => ProductCategory, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "product_category_id" })
	productCategory!: Relation<ProductCategory>;

	@OneToMany(() => Product, (product) => product.productLine)
	products!: Relation<Product[]>;

	@OneToMany(
		() => SupportResource,
		(supportResource) => supportResource.productLine,
	)
	supportResources!: Relation<SupportResource[]>;

	@OneToMany(() => ColorChart, (colorChart) => colorChart.productLine)
	colorCharts!: Relation<ColorChart[]>;
}
