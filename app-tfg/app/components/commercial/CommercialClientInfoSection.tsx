import CommercialClientInfoItem from "./CommercialClientInfoItem";

type Item = {
	label: string;
	value: string | null | undefined;
};

type Props = {
	title: string;
	items: Item[];
};

export default function CommercialClientInfoSection({ title, items }: Props) {
	return (
		<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
			<h2 className="text-xl font-bold text-slate-900">{title}</h2>

			<div className="mt-5 grid gap-4 md:grid-cols-2">
				{items.map((item) => (
					<CommercialClientInfoItem
						key={item.label}
						label={item.label}
						value={item.value}
					/>
				))}
			</div>
		</section>
	);
}
