import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity({ name: "commercial_visit_types" })
export class CommercialVisitType {
	@PrimaryColumn({ type: "smallint" })
	id!: number;

	@Column({ type: "text", unique: true })
	code!: string;

	@Column({ type: "text", unique: true })
	name!: string;
}
