const mongoose = require('mongoose')

if (mongoose.models.Audit) {
  delete mongoose.models.Audit
}

const auditSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    auditor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    systemQuantity: {
      type: Number,
      required: true,
    },
    physicalQuantity: {
      type: Number,
      required: true,
    },
    discrepancy: {
      type: Number,
      required: true,
    },
    notes: {
      type: String,
    },
    status: {
      type: String,
      enum: ['completed', 'pending_review', 'resolved'],
      default: 'completed',
    },
  },
  {
    timestamps: true,
  }
)

// We might want to allow only one "active" audit per product-warehouse at a time,
// or just keep a history. For now, let's keep it as a history of audit events.
const Audit = mongoose.model('Audit', auditSchema)

module.exports = Audit
