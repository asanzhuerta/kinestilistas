import { Entity, PrimaryColumn, Column, OneToMany } from "typeorm";
import type { Relation } from "typeorm";
import { SupportResource } from "./SupportResource";

@Entity({ name: "support_resource_types" })
export class SupportResourceType {
	@PrimaryColumn({ type: "smallint" })
	id!: number;

	@Column({ type: "text", unique: true })
	code!: string;

	@Column({ type: "text", unique: true })
	name!: string;

	@OneToMany(() => SupportResource, (supportResource) => supportResource.resourceType)
	supportResources!: Relation<SupportResource[]>;
}
