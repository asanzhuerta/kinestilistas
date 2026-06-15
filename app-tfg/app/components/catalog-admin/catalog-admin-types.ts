export type Metric = {
	label: string;
	value: string | number;
};

export type FieldOption = {
	value: string;
	label: string;
	groupKey?: string;
};

export type FieldType =
	| "text"
	| "textarea"
	| "number"
	| "select"
	| "checkbox"
	| "image"
	| "file";

export type FormValue = string | boolean;

export type FieldDescriptor = {
	name: string;
	label: string;
	type: FieldType;
	required?: boolean;
	placeholder?: string;
	helpText?: string;
	options?: FieldOption[];
	filterByFieldName?: string;
	step?: string;
	min?: number;
	accept?: string;
	uploadEndpoint?: string;
};
