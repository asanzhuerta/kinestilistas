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
import { ProductLine } from "./ProductLine";
import { ColorReference } from "./ColorReference";

@Entity("color_charts")
@Index("color_charts_product_line_id_index", ["product_line_id"])
@Index("color_charts_name_index", ["name"])
export class ColorChart {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "text" })
	name!: string;

	@Column({ type: "text", nullable: true })
	description!: string | null;

	@Column({ type: "uuid" })
	product_line_id!: string;

	@Column({ type: "text", nullable: true })
	image_url!: string | null;

	@ManyToOne(() => ProductLine, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "product_line_id" })
	productLine!: Relation<ProductLine>;

	@OneToMany(() => ColorReference, (colorReference) => colorReference.colorChart)
	colorReferences!: Relation<ColorReference[]>;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at!: Date;
}
