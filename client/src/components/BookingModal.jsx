import { useState } from 'react';
import api from '../services/api';

export default function BookingModal({ resource, onClose, onSuccess }) {
  const isRoom = resource.resourceType === 'lab_room';
  const todayStr = new Date().toISOString().slice(0, 10);

  const [bookingCategory, setBookingCategory] = useState(
    isRoom ? 'individual_pc' : 'equipment'
  );
  const [councilName, setCouncilName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [requestedDate, setRequestedDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('16:00');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.post('/requests', {
        resourceId: resource._id,
        bookingCategory,
        councilName: bookingCategory === 'council_meeting' ? councilName : '',
        purpose,
        requestedDate,
        startTime,
        endTime,
        quantity: isRoom && bookingCategory === 'council_meeting' ? resource.totalQuantity : quantity,
      });
      onSuccess(
        `Request submitted for ${resource.name}! A Lab Assistant will review it shortly.`
      );
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit booking request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              {isRoom ? 'Lab Room Access / Reservation' : 'Equipment Checkout'}
            </span>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{resource.name}</h3>
            <p className="text-xs text-slate-500">{resource.location}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRoom && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Booking Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBookingCategory('individual_pc')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition ${
                    bookingCategory === 'individual_pc'
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Individual PC / Bench
                </button>
                <button
                  type="button"
                  onClick={() => setBookingCategory('council_meeting')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition ${
                    bookingCategory === 'council_meeting'
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Council / Club Meeting
                </button>
              </div>
            </div>
          )}

          {bookingCategory === 'council_meeting' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Council / Student Body Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., CSI Council, IEEE, Coding Club"
                value={councilName}
                onChange={(e) => setCouncilName(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                min={todayStr}
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Time *</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Time *</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {!isRoom && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Quantity Needed (Available: {resource.availableQuantity}) *
              </label>
              <input
                type="number"
                min={1}
                max={resource.availableQuantity}
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Purpose / Project Details *
            </label>
            <textarea
              rows={3}
              required
              placeholder={
                bookingCategory === 'council_meeting'
                  ? 'e.g., Hackathon planning sync with 15 core committee members'
                  : 'e.g., Testing IoT sensor prototype for Sem 5 mini-project'
              }
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}