import mongoose from "mongoose";
export interface CollectionInterface<T = unknown> {
    id: string;
    data: T;
    createdAt: Date;
    updatedAt: Date;
    expireAt?: Date;
}
export declare const docSchema: mongoose.Schema<CollectionInterface<unknown>, mongoose.Model<CollectionInterface<unknown>, any, any, any, any>, {}, {}, {}, {}, "type", CollectionInterface<unknown>>;
export default function modelSchema<T = unknown>(connection: mongoose.Connection, modelName?: string): mongoose.Model<unknown, unknown, unknown, {}, CollectionInterface<T>>;
