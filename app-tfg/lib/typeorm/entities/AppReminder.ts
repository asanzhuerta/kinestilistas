import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	ManyToOne,
	JoinColumn,
	Index,
} from "typeorm";
import type { Relation } from "typeorm";
import { User } from "./User";

export type AppReminderStatus = "pending" | "done" | "cancelled";

@Entity("app_reminders")
@Index("app_reminders_recipient_user_id_index", ["recipient_user_id"])
@Index("app_reminders_scheduled_at_index", ["scheduled_at"])
export class AppReminder {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "uuid" })
	recipient_user_id!: string;

	@Column({ type: "text" })
	title!: string;

	@Column({ type: "text" })
	body!: string;

	@Column({ type: "timestamptz" })
	scheduled_at!: Date;

	@Column({ type: "text", default: "pending" })
	status!: AppReminderStatus;

	@Column({ type: "text", nullable: true })
	source_type!: string | null;

	@Column({ type: "uuid", nullable: true })
	source_id!: string | null;

	@ManyToOne(() => User, {
		onDelete: "CASCADE",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "recipient_user_id" })
	recipientUser!: Relation<User>;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;
}
