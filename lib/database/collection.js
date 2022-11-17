"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.docSchema = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
exports.docSchema = new mongoose_1.default.Schema({
    id: {
        type: mongoose_1.default.SchemaTypes.String,
        required: true,
        unique: true
    },
    data: {
        type: mongoose_1.default.SchemaTypes.Mixed,
        required: false
    },
    expireAt: {
        type: mongoose_1.default.SchemaTypes.Date,
        required: false,
        default: null
    }
}, {
    timestamps: true
});
function modelSchema(connection, modelName = "pogy.db") {
    // @ts-expect-error docSchema
    const model = connection.model(modelName, exports.docSchema);
    model.collection.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {
        /* nothing */
    });
    return model;
}
exports.default = modelSchema;
