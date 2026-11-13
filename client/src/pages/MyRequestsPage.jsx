import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { socket } from '../services/socket';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  returned: 'bg-slate-100 text-slate-700 border-slate-300',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200',
  overdue: 'bg-red-100 text-red-800 border-red-300',
};

export default function MyRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveAlert, setLiveAlert] = useState('');

  const fetchMyRequests = useCallback(async () => {
    try {
      const res = await api.get('/requests/my');
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  fetchMyRequests();
  const syncInterval = setInterval(fetchMyRequests, 4000);

  const handleStatusChange = (updated) => {
    setLiveAlert(
      `Update: Your request for "${updated.resource?.name}" is now ${updated.status.toUpperCase()}!`
    );
    setTimeout(() => setLiveAlert(''), 5000);
    fetchMyRequests();
  };

  socket.on('request:statusChanged', handleStatusChange);
  return () => {
    clearInterval(syncInterval);
    socket.off('request:statusChanged', handleStatusChange);
  };
}, [fetchMyRequests]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Lab & Equipment Checkouts</h1>
        <p className="text-sm text-slate-500">
          Track live approvals, Lab Assistant pickup instructions, and return status
        </p>
      </div>

      {liveAlert && (
        <div className="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-sm font-medium">
          {liveAlert}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading your requests...</p>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <p className="text-base font-semibold text-slate-800">No checkout requests yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Browse available hardware kits or lab rooms on the home page to submit a request.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div
              key={req._id}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    {req.bookingCategory.replace('_', ' ')}
                  </span>
                  {req.councilName && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                      {req.councilName}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900">
                  {req.resource?.name}{' '}
                  {req.resource?.resourceType === 'equipment' && `(Qty: ${req.quantity})`}
                </h3>
                <p className="text-xs text-slate-500">
                  {req.requestedDate} &bull; {req.startTime} – {req.endTime} &bull;{' '}
                  {req.resource?.location}
                </p>
                <p className="text-sm text-slate-700 pt-1">
                  <span className="font-medium">Purpose:</span> {req.purpose}
                </p>

                {req.assistantNote && (
                  <p className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700">
                    <span className="font-semibold">Lab Assistant Note:</span> {req.assistantNote}
                  </p>
                )}
              </div>

              <div className="sm:text-right shrink-0 space-y-2">
                <span
                  className={`inline-block text-xs font-bold uppercase px-3 py-1 rounded-full border ${
                    STATUS_STYLES[req.status] || 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {req.status}
                </span>
                {req.processedBy && (
                  <p className="text-xs text-slate-400">
                    Handled by {req.processedBy.name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}