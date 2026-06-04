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
import { Client } from "./Client";
import { CustomerSegment } from "./CustomerSegment";
import { User } from "./User";

@Entity("client_customer_segments")
@Index("client_customer_segments_client_id_index", ["client_id"])
@Index("client_customer_segments_segment_id_index", ["segment_id"])
@Index("client_customer_segments_client_segment_unique", ["client_id", "segment_id"], {
	unique: true,
})
export class ClientCustomerSegment {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "uuid" })
	client_id!: string;

	@Column({ type: "uuid" })
	segment_id!: string;

	@Column({ type: "uuid", nullable: true })
	assigned_by_user_id!: string | null;

	@Column({ type: "text", nullable: true })
	notes!: string | null;

	@ManyToOne(() => Client, {
		onDelete: "CASCADE",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "client_id" })
	client!: Relation<Client>;

	@ManyToOne(() => CustomerSegment, {
		onDelete: "CASCADE",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "segment_id" })
	segment!: Relation<CustomerSegment>;

	@ManyToOne(() => User, {
		nullable: true,
		onDelete: "SET NULL",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "assigned_by_user_id" })
	assignedByUser!: Relation<User | null>;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;
}
