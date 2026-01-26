import { Db, ObjectId } from "mongodb";
import { Car } from "../models/Car";

export interface CarDocument {
	_id?: ObjectId;
	id: string;
	brand: string;
	model: string;
}

export class CarRepo {
	private db: Db;
	private collectionName = "cars";

	constructor(db: Db) {
		this.db = db;
	}

	async create(car: Omit<CarDocument, "_id">): Promise<CarDocument> {
		const result = await this.db.collection<CarDocument>(this.collectionName).insertOne(car as CarDocument);
		return {
			...car,
			_id: result.insertedId,
		};
	}

	async findById(id: string): Promise<Car | null> {
		const doc = await this.db.collection<CarDocument>(this.collectionName).findOne({ id });

		if (!doc) {
			return null;
		}

		return {
			id: doc.id,
			brand: doc.brand,
			model: doc.model,
		};
	}

	async findByBrand(brand: string): Promise<Car[]> {
		const docs = await this.db
			.collection<CarDocument>(this.collectionName)
			.find({ brand })
			.toArray();

		return docs.map((doc) => ({
			id: doc.id,
			brand: doc.brand,
			model: doc.model,
		}));
	}

	async findAll(): Promise<Car[]> {
		const docs = await this.db
			.collection<CarDocument>(this.collectionName)
			.find({})
			.toArray();

		return docs.map((doc) => ({
			id: doc.id,
			brand: doc.brand,
			model: doc.model,
		}));
	}
}
