import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from "typeorm";
import type { Relation } from "typeorm";
import { Product } from "./Product";
import { SupplierOrderProposal } from "./SupplierOrderProposal";

@Entity("supplier_order_proposal_lines")
@Index("supplier_order_proposal_lines_proposal_id_index", ["proposal_id"])
@Index("supplier_order_proposal_lines_product_id_index", ["product_id"])
export class SupplierOrderProposalLine {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "uuid" })
	proposal_id!: string;

	@Column({ type: "uuid" })
	product_id!: string;

	@Column({ type: "text" })
	reference!: string;

	@Column({ type: "text" })
	description!: string;

	@Column({ type: "text", nullable: true })
	category!: string | null;

	@Column({ type: "integer" })
	quantity!: number;

	@Column({ type: "numeric", precision: 12, scale: 2 })
	unit_price!: string;

	@Column({ type: "numeric", precision: 12, scale: 2 })
	line_amount!: string;

	@Column({ type: "text", nullable: true })
	reason!: string | null;

	@ManyToOne(() => SupplierOrderProposal, (proposal) => proposal.lines, {
		onDelete: "CASCADE",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "proposal_id" })
	proposal!: Relation<SupplierOrderProposal>;

	@ManyToOne(() => Product, {
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "product_id" })
	product!: Relation<Product>;
}
