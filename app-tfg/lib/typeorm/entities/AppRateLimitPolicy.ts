import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity("app_rate_limit_policies")
export class AppRateLimitPolicy {
	@PrimaryColumn({ type: "text" })
	policy_name!: string;

	@Column({ type: "boolean", default: true })
	enabled!: boolean;

	@Column({ type: "integer" })
	max_requests!: number;

	@Column({ type: "integer" })
	window_ms!: number;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at!: Date;
}
