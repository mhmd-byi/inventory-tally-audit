const mongoose = require('mongoose')

const checklistItemSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  responseType: {
    type: String,
    enum: ['yes_no', 'text', 'number', 'na'],
    default: 'yes_no',
  },
  order: {
    type: Number,
    default: 0,
  },
})

const checklistResponseSchema = new mongoose.Schema({
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true,
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [
    {
      category: String,
      question: String,
      response: mongoose.Schema.Types.Mixed, // Can be boolean, string, or number
      notes: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending',
  },
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Template for drum verification checklist
const checklistTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  items: [checklistItemSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const QuestionBankSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    responseType: {
      type: String,
      enum: ['yes_no', 'text', 'number', 'na'],
      default: 'yes_no',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

const ChecklistTemplate =
  mongoose.models.ChecklistTemplate || mongoose.model('ChecklistTemplate', checklistTemplateSchema)
const ChecklistResponse =
  mongoose.models.ChecklistResponse || mongoose.model('ChecklistResponse', checklistResponseSchema)
const QuestionBank = mongoose.models.QuestionBank || mongoose.model('QuestionBank', QuestionBankSchema)

module.exports = { ChecklistTemplate, ChecklistResponse, QuestionBank, checklistItemSchema }
