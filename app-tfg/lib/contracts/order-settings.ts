export type OrderBusinessSettings = {
	agencyDeliveryFee: string;
};

export type UpdateOrderBusinessSettingsBody = {
	agencyDeliveryFee?: number | string | null;
};
