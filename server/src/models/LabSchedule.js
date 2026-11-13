import mongoose from 'mongoose';

const labScheduleSchema = new mongoose.Schema(
  {
    labRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabResource',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    activityType: {
      type: String,
      enum: ['Lecture', 'Practical', 'Test', 'Council Meeting', 'Maintenance'],
      required: true,
    },
    isRecurring: {
      type: Boolean,
      default: true,
    },
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (used when isRecurring is true)
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
    },
    // Format: 'YYYY-MM-DD' (used when isRecurring is false, e.g., Council Meeting or Test)
    specificDate: {
      type: String,
      trim: true,
    },
    // 24-hour 'HH:mm' format (e.g., '09:00', '14:30') for accurate slot comparisons
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export default mongoose.model('LabSchedule', labScheduleSchema);