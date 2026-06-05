import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity("system_configurations")
export class SystemConfiguration {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "text", unique: true })
	key!: string;

	@Column({ type: "text" })
	value!: string;

	@Column({ type: "text", nullable: true })
	description!: string | null;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at!: Date;
}
