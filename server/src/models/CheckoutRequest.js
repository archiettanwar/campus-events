import mongoose from 'mongoose';

const checkoutRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabResource',
      required: true,
    },
    bookingCategory: {
      type: String,
      enum: ['equipment', 'individual_pc', 'council_meeting'],
      required: true,
    },
    councilName: {
      type: String,
      trim: true,
      default: '',
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    // Format: 'YYYY-MM-DD'
    requestedDate: {
      type: String,
      required: true,
    },
    // 24-hour 'HH:mm'
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'returned', 'rejected', 'overdue'],
      default: 'pending',
    },
    assistantNote: {
      type: String,
      trim: true,
      default: '',
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    returnedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('CheckoutRequest', checkoutRequestSchema);