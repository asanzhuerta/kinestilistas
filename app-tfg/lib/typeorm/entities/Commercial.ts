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
import { CommercialVisit } from "./CommercialVisit";
import { CommercialRoute } from "./CommercialRoute";
import { ClientCommercialAssignment } from "./ClientCommercialAssignment";

@Entity("commercials")
@Index("commercials_employee_code_index", ["employee_code"])
@Index("commercials_territory_index", ["territory"])
export class Commercial {
	@PrimaryColumn("uuid")
	id!: string;

	@OneToOne(() => User, (user) => user.commercialProfile, {
		onDelete: "CASCADE",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "id" })
	user!: Relation<User>;

	@Column({ type: "text", nullable: true })
	employee_code!: string | null;

	@Column({ type: "text", nullable: true })
	territory!: string | null;

	@Column({ type: "text", nullable: true })
	notes!: string | null;

	// --------------------------------------------------------------------------
	// Configuración operativa para planificación de rutas
	// --------------------------------------------------------------------------

	@Column({ type: "time", nullable: true })
	workday_start_time!: string | null;

	@Column({ type: "time", nullable: true })
	workday_end_time!: string | null;

	@Column({ type: "smallint", default: 10 })
	delivery_visit_duration_minutes!: number;

	@Column({ type: "smallint", default: 35 })
	routine_visit_duration_minutes!: number;

	@Column({ type: "text", nullable: true })
	route_start_address!: string | null;

	@Column({ type: "text", nullable: true })
	route_end_address!: string | null;

	@Column({ type: "boolean", default: true })
	return_to_start!: boolean;

	// PostgreSQL devuelve numeric como string con TypeORM normalmente.
	@Column({ type: "numeric", precision: 9, scale: 6, nullable: true })
	route_start_lat!: string | null;

	@Column({ type: "numeric", precision: 9, scale: 6, nullable: true })
	route_start_lng!: string | null;

	@Column({ type: "numeric", precision: 9, scale: 6, nullable: true })
	route_end_lat!: string | null;

	@Column({ type: "numeric", precision: 9, scale: 6, nullable: true })
	route_end_lng!: string | null;

	@OneToMany(
		() => CommercialVisit,
		(commercialVisit) => commercialVisit.commercial,
	)
	commercialVisits!: Relation<CommercialVisit[]>;

	@OneToMany(
		() => CommercialRoute,
		(commercialRoute) => commercialRoute.commercial,
	)
	commercialRoutes!: Relation<CommercialRoute[]>;

	@OneToMany(
		() => ClientCommercialAssignment,
		(clientCommercialAssignment) => clientCommercialAssignment.commercial,
	)
	clientAssignments!: Relation<ClientCommercialAssignment[]>;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at!: Date;
}
