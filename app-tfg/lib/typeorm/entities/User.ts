import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	OneToOne,
	JoinColumn,
	Index,
} from "typeorm";
import type { Relation } from "typeorm";

import { Role } from "./Role";
import { UserStatus } from "./UserStatus";
import { Client } from "./Client";
import { Commercial } from "./Commercial";

@Entity("users")
@Index("users_role_id_index", ["role_id"])
@Index("users_status_id_index", ["status_id"])
export class User {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "citext", unique: true })
	email!: string;

	@Column({ type: "text" })
	password_hash!: string;

	@Column({ type: "text" })
	name!: string;

	@Column({ type: "text", nullable: true })
	phone!: string | null;

	@Column({ type: "text", nullable: true })
	company!: string | null;

	@Column({ type: "smallint" })
	role_id!: number;

	@Column({ type: "smallint" })
	status_id!: number;

	@ManyToOne(() => Role, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "role_id" })
	role!: Relation<Role>;

	@ManyToOne(() => UserStatus, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "status_id" })
	status!: Relation<UserStatus>;

	// Cliente profesional vinculado a esta cuenta de usuario.
	@OneToOne(() => Client, (client) => client.user)
	linkedClient!: Relation<Client>;
	
	// Perfil comercial vinculado a esta cuenta de usuario.
	@OneToOne(() => Commercial, (commercial) => commercial.user)
	commercialProfile!: Relation<Commercial>;

	@Column({ type: "text", nullable: true })
	profile_image_url!: string | null;

	@Column({ type: "timestamptz", nullable: true })
	last_login_at!: Date | null;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at!: Date;
}
