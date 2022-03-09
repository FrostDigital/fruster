/** This is just to get code completion on the inputs, this isn't actually used by the decorator code */
import { SubscribeOptions, FrusterRequest } from "@fruster/bus";

const bus = module.parent?.require("@fruster/bus").default;

let injectedClasses: any = {};

export function injections(injections: any): void {
	const keyValueInjections: any = {};

	Object.keys(injections).forEach(
		(key) => (keyValueInjections[key] = injections[key])
	);

	injectedClasses = {
		...keyValueInjections,
		...injectedClasses,
	};
}

let subscribedClasses: any = {};

export function injectable() {
	return function (target: any) {
		const original = target;

		function construct(constructor: any, args: any[]) {
			const clazz: any = function (this: any) {
				return constructor.apply(this, args);
			};

			clazz.prototype = constructor.prototype;

			return new clazz();
		}

		const newConstructor: any = function (...args: any[]) {
			const clazz = construct(original, args);
			const functionsWithSubscribes =
				subscribedClasses[original.name] &&
				subscribedClasses[original.name].subscribedFunctions
					? Array.from(
							subscribedClasses[original.name].subscribedFunctions
					  )
					: [];

			functionsWithSubscribes.forEach((funcName: any) => {
				const options = {
					...subscribedClasses[original.name]
						.inputOptionsForFunctions[funcName],
					handle: (req: FrusterRequest<any>) => clazz[funcName](req),
				};

				bus.subscribe(options);
			});

			const injectedParams =
				classesWithInjectedParameters[original.name] || [];

			injectedParams.forEach(
				(param: any) => (clazz[param] = injectedClasses[param])
			);

			return clazz;
		};

		newConstructor.prototype = original.prototype;

		return newConstructor;
	};
}

export function subscribe(inputOptions: SubscribeOptions<any>) {
	return function (
		target: any,
		propertyKey: string,
		descriptor: TypedPropertyDescriptor<any>
	) {
		if (!subscribedClasses[target.constructor.name]) {
			subscribedClasses[target.constructor.name] = {};
			subscribedClasses[target.constructor.name].subscribedFunctions =
				new Set();
			subscribedClasses[
				target.constructor.name
			].inputOptionsForFunctions = {};
		}

		subscribedClasses[target.constructor.name].subscribedFunctions.add(
			propertyKey
		);
		subscribedClasses[target.constructor.name].inputOptionsForFunctions[
			propertyKey
		] = inputOptions;

		return descriptor.value;
	};
}

let classesWithInjectedParameters: any = {};

export function inject() {
	return function (target: any, key: string) {
		if (!classesWithInjectedParameters[target.constructor.name])
			classesWithInjectedParameters[target.constructor.name] = [];

		classesWithInjectedParameters[target.constructor.name].push(key);
	};
}
