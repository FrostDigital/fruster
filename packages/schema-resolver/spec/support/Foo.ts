/**
 * This is description for Foo
 */
interface Foo {
	name: string;
	city?: string;
	bar: Bar;
}

/**
 * This is description for Bar
 * @additionalProperties true
 */
interface Bar {
	something: number;
}

export default Foo;
