export type Metric = {
	label: string;
	value: string | number;
};

export type FieldOption = {
	value: string;
	label: string;
};

export type FieldType =
	| "text"
	| "textarea"
	| "number"
	| "select"
	| "checkbox"
	| "image";

export type FormValue = string | boolean;

export type FieldDescriptor = {
	name: string;
	label: string;
	type: FieldType;
	required?: boolean;
	placeholder?: string;
	helpText?: string;
	options?: FieldOption[];
	step?: string;
	min?: number;
};
