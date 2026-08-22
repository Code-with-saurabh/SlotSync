import mongoose from "mongoose";

const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },

    entityType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      index: true,
    },

    entityId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },
  },
  {
    versionKey: false,
  }
);

auditLogSchema.index({
  entityType: 1,
  entityId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  actorId: 1,
  createdAt: -1,
});

const AuditLog = mongoose.model(
  "AuditLog",
  auditLogSchema
);

export default AuditLog;