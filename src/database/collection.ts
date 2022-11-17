import mongoose from "mongoose";

export interface CollectionInterface<T = unknown> {
    id: string;
    data: T;
    createdAt: Date;
    updatedAt: Date;
    expireAt?: Date;
}

export const docSchema = new mongoose.Schema<CollectionInterface>(
    {
        id: {
            type: mongoose.SchemaTypes.String,
            required: true,
            unique: true
        },
        data: {
            type: mongoose.SchemaTypes.Mixed,
            required: false
        },
        expireAt: {
            type: mongoose.SchemaTypes.Date,
            required: false,
            default: null
        }
    },
    {
        timestamps: true
    }
);

export default function modelSchema<T = unknown>(connection: mongoose.Connection, modelName = "pogy.db") {
    // @ts-expect-error docSchema
    const model = connection.model<CollectionInterface<T>>(modelName, docSchema);
    model.collection.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {
        /* nothing */
    });
    return model;
}
