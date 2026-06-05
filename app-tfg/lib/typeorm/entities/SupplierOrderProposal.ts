import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";
import type { Relation } from "typeorm";
import { User } from "./User";
import { SupplierOrderProposalLine } from "./SupplierOrderProposalLine";

export type SupplierOrderProposalStatus =
	| "draft"
	| "generated"
	| "exported"
	| "archived";

@Entity("supplier_order_proposals")
@Index("supplier_order_proposals_generated_by_user_id_index", [
	"generated_by_user_id",
])
@Index("supplier_order_proposals_generated_at_index", ["generated_at"])
@Index("supplier_order_proposals_status_index", ["status"])
export class SupplierOrderProposal {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "uuid", nullable: true })
	generated_by_user_id!: string | null;

	@Column({ type: "timestamptz", default: () => "now()" })
	generated_at!: Date;

	@Column({ type: "text", default: "draft" })
	status!: SupplierOrderProposalStatus;

	@Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
	total_amount!: string;

	@Column({ type: "integer", default: 0 })
	total_units!: number;

	@Column({ type: "text", nullable: true })
	notes!: string | null;

	@ManyToOne(() => User, {
		onDelete: "SET NULL",
		onUpdate: "CASCADE",
		nullable: true,
	})
	@JoinColumn({ name: "generated_by_user_id" })
	generatedByUser!: Relation<User | null>;

	@OneToMany(
		() => SupplierOrderProposalLine,
		(proposalLine) => proposalLine.proposal,
	)
	lines!: Relation<SupplierOrderProposalLine[]>;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at!: Date;
}
