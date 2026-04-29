import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	OneToMany,
	Index,
} from "typeorm";
import type { Relation } from "typeorm";
import { ProductLine } from "./ProductLine";
import { Product } from "./Product";

@Entity("product_categories")
@Index("product_categories_display_order_index", ["display_order"])
export class ProductCategory {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "text", unique: true })
	name!: string;

	@Column({ type: "text", nullable: true })
	description!: string | null;

	@Column({ type: "integer", default: 0 })
	display_order!: number;

	@OneToMany(() => ProductLine, (productLine) => productLine.productCategory)
	productLines!: Relation<ProductLine[]>;

	@OneToMany(() => Product, (product) => product.productCategory)
	products!: Relation<Product[]>;
}
