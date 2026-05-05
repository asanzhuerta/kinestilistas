import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
	Index,
} from "typeorm";
import type { Relation } from "typeorm";
import { ColorChart } from "./ColorChart";

@Entity("color_references")
@Index("color_references_color_chart_id_index", ["color_chart_id"])
@Index(
	"color_references_color_chart_id_code_unique",
	["color_chart_id", "code"],
	{ unique: true },
)
@Index(
	"color_references_color_chart_id_display_order_unique",
	["color_chart_id", "display_order"],
	{ unique: true },
)
export class ColorReference {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "uuid" })
	color_chart_id!: string;

	@Column({ type: "text" })
	code!: string;

	@Column({ type: "text" })
	name!: string;

	@Column({ type: "text", nullable: true })
	description!: string | null;

	@Column({ type: "text", nullable: true })
	image_url!: string | null;

	@Column({ type: "text", nullable: true })
	thumb_image_url!: string | null;

	@Column({ type: "integer", default: 0 })
	display_order!: number;

	@ManyToOne(() => ColorChart, {
		onDelete: "CASCADE",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "color_chart_id" })
	colorChart!: Relation<ColorChart>;
}
