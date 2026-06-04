import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToMany,
	Index,
} from "typeorm";
import type { Relation } from "typeorm";
import { ClientCustomerSegment } from "./ClientCustomerSegment";
import { Promotion } from "./Promotion";

@Entity("customer_segments")
@Index("customer_segments_name_index", ["name"])
export class CustomerSegment {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "text", unique: true })
	code!: string;

	@Column({ type: "text" })
	name!: string;

	@Column({ type: "text", nullable: true })
	description!: string | null;

	@Column({ type: "text", nullable: true })
	criteria!: string | null;

	@OneToMany(
		() => ClientCustomerSegment,
		(clientCustomerSegment) => clientCustomerSegment.segment,
	)
	clientAssignments!: Relation<ClientCustomerSegment[]>;

	@OneToMany(() => Promotion, (promotion) => promotion.customerSegment)
	promotions!: Relation<Promotion[]>;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at!: Date;
}
