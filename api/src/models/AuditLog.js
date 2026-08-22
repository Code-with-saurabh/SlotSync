import mongoose from "mongoose";

const auditLogSchema =
  new mongoose.Schema(
    {
      actorId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true,
},

      action: {
        type: String,
        required: true,
        trim: true,
      },

      entity: {
        type: String,
        required: true,
        trim: true,
      },

      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },

      details: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },

      reason: {
        type: String,
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

/*
 * --------------------------------------------------
 * APPEND-ONLY PROTECTION
 * --------------------------------------------------
 */

const rejectMutation = function () {
  throw new Error(
    "AuditLog is append-only. Updates and deletes are not allowed."
  );
};

auditLogSchema.pre(
  "updateOne",
  rejectMutation
);

auditLogSchema.pre(
  "updateMany",
  rejectMutation
);

auditLogSchema.pre(
  "findOneAndUpdate",
  rejectMutation
);

auditLogSchema.pre(
  "deleteOne",
  rejectMutation
);

auditLogSchema.pre(
  "deleteMany",
  rejectMutation
);

auditLogSchema.pre(
  "findOneAndDelete",
  rejectMutation
);

auditLogSchema.pre(
  "findByIdAndDelete",
  rejectMutation
);

const AuditLog = mongoose.model(
  "AuditLog",
  auditLogSchema
);

export default AuditLog;