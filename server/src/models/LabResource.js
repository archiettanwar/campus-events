import mongoose from 'mongoose';

const labResourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    resourceType: {
      type: String,
      enum: ['lab_room', 'equipment'],
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    totalQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    specifications: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('LabResource', labResourceSchema);