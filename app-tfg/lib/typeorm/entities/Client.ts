import {
	Entity,
	PrimaryColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToOne,
	OneToMany,
	JoinColumn,
	Index,
} from "typeorm";
import type { Relation } from "typeorm";
import { User } from "./User";
import { ClientCommercialAssignment } from "./ClientCommercialAssignment";

@Entity("clients")
@Index("clients_name_index", ["name"])
export class Client {
	@PrimaryColumn("uuid")
	id!: string;

	@Column({ type: "text" })
	name!: string;

	@Column({ type: "text", nullable: true })
	contact_name!: string | null;

	@Column({ type: "text", nullable: true })
	tax_id!: string | null;

	@Column({ type: "text" })
	address!: string;

	@Column({ type: "text" })
	city!: string;

	@Column({ type: "text", nullable: true })
	postal_code!: string | null;

	@Column({ type: "text", nullable: true })
	province!: string | null;

	@OneToOne(() => User, { onDelete: "RESTRICT", onUpdate: "CASCADE" })
	@JoinColumn({ name: "id" })
	user!: Relation<User>;

	@OneToMany(
		() => ClientCommercialAssignment,
		(clientCommercialAssignment) => clientCommercialAssignment.client,
	)
	commercialAssignments!: Relation<ClientCommercialAssignment[]>;

	// --------------------------------------------------------------------------
	// Geodatos básicos para mapas y rutas
	// --------------------------------------------------------------------------

	// PostgreSQL suele devolver numeric como string a través de TypeORM.
	@Column({ type: "numeric", precision: 9, scale: 6, nullable: true })
	lat!: string | null;

	@Column({ type: "numeric", precision: 9, scale: 6, nullable: true })
	lng!: string | null;

	// --------------------------------------------------------------------------
	// Franja horaria permitida para visitas comerciales
	// --------------------------------------------------------------------------

	@Column({ type: "time", nullable: true })
	visit_window_start_time!: string | null;

	@Column({ type: "time", nullable: true })
	visit_window_end_time!: string | null;

	@Column({ type: "text", nullable: true })
	notes!: string | null;

	@Column({ type: "text", default: "pending" })
	geolocation_status!: string;

	@Column({ type: "timestamptz", nullable: true })
	geolocation_verified_at!: Date | null;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at!: Date;
}
