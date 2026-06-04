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

@Entity("app_notifications")
@Index("app_notifications_recipient_user_id_index", ["recipient_user_id"])
@Index("app_notifications_recipient_unread_index", ["recipient_user_id", "read_at"])
export class AppNotification {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "uuid" })
	recipient_user_id!: string;

	@Column({ type: "text" })
	title!: string;

	@Column({ type: "text" })
	body!: string;

	@Column({ type: "text" })
	notification_type!: string;

	@Column({ type: "text", default: "in_app" })
	channel!: "in_app";

	@Column({ type: "text", nullable: true })
	source_type!: string | null;

	@Column({ type: "uuid", nullable: true })
	source_id!: string | null;

	@Column({ type: "timestamptz", nullable: true })
	read_at!: Date | null;

	@ManyToOne(() => User, {
		onDelete: "CASCADE",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "recipient_user_id" })
	recipientUser!: Relation<User>;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;
}
