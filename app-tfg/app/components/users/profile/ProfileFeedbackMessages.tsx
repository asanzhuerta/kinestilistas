type Props = {
	errorMessage: string | null;
	successMessage: string | null;
	compact?: boolean;
};

export default function ProfileFeedbackMessages({
	errorMessage,
	successMessage,
	compact = false,
}: Props) {
	return (
		<>
			{errorMessage ? (
				<div
					className={`rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 ${
						compact ? "" : "mt-4"
					}`}
				>
					{errorMessage}
				</div>
			) : null}

			{successMessage ? (
				<div
					className={`rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 ${
						compact ? "" : "mt-4"
					}`}
				>
					{successMessage}
				</div>
			) : null}
		</>
	);
}
