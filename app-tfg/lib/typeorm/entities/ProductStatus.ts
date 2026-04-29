import { Entity, PrimaryColumn, Column, OneToMany } from "typeorm";
import type { Relation } from "typeorm";
import { Product } from "./Product";

@Entity({ name: "product_statuses" })
export class ProductStatus {
	@PrimaryColumn({ type: "smallint" })
	id!: number;

	@Column({ type: "text", unique: true })
	code!: string;

	@Column({ type: "text", unique: true })
	name!: string;

	@OneToMany(() => Product, (product) => product.status)
	products!: Relation<Product[]>;
}
