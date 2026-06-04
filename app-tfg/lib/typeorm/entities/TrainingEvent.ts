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
import { User } from "./User";
import { TrainingEnrollment } from "./TrainingEnrollment";

export type TrainingEventStatus = "draft" | "published" | "cancelled" | "completed";
export type TrainingEventModality = "in_person" | "online" | "hybrid";

@Entity("training_events")
@Index("training_events_status_index", ["status"])
@Index("training_events_starts_at_index", ["starts_at"])
export class TrainingEvent {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "text" })
	title!: string;

	@Column({ type: "text" })
	description!: string;

	@Column({ type: "timestamptz" })
	starts_at!: Date;

	@Column({ type: "text", nullable: true })
	location!: string | null;

	@Column({ type: "text", default: "in_person" })
	modality!: TrainingEventModality;

	@Column({ type: "text", nullable: true })
	content!: string | null;

	@Column({ type: "text", default: "draft" })
	status!: TrainingEventStatus;

	@Column({ type: "integer", nullable: true })
	capacity!: number | null;

	@Column({ type: "uuid", nullable: true })
	created_by_user_id!: string | null;

	@ManyToOne(() => User, {
		nullable: true,
		onDelete: "SET NULL",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "created_by_user_id" })
	createdByUser!: Relation<User | null>;

	@OneToMany(() => TrainingEnrollment, (enrollment) => enrollment.trainingEvent)
	enrollments!: Relation<TrainingEnrollment[]>;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at!: Date;
}
