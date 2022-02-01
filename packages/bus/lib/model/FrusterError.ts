export interface FrusterError {
	id?: Readonly<string>;
	code: Readonly<string>;
	title: Readonly<string>;
	detail?: Readonly<string>;
}
