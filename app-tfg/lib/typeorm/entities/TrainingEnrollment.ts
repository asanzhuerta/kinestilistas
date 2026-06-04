import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	Index,
} from "typeorm";
import type { Relation } from "typeorm";
import { TrainingEvent } from "./TrainingEvent";
import { User } from "./User";

export type TrainingEnrollmentStatus = "registered" | "cancelled" | "attended";

@Entity("training_enrollments")
@Index("training_enrollments_training_event_id_index", ["training_event_id"])
@Index("training_enrollments_user_id_index", ["user_id"])
@Index("training_enrollments_event_user_unique", ["training_event_id", "user_id"], {
	unique: true,
})
export class TrainingEnrollment {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "uuid" })
	training_event_id!: string;

	@Column({ type: "uuid" })
	user_id!: string;

	@Column({ type: "text", default: "registered" })
	status!: TrainingEnrollmentStatus;

	@Column({ type: "text", nullable: true })
	notes!: string | null;

	@ManyToOne(() => TrainingEvent, {
		onDelete: "CASCADE",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "training_event_id" })
	trainingEvent!: Relation<TrainingEvent>;

	@ManyToOne(() => User, {
		onDelete: "CASCADE",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "user_id" })
	user!: Relation<User>;

	@CreateDateColumn({ type: "timestamptz" })
	enrolled_at!: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at!: Date;
}
