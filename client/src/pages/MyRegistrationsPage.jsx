import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { RegistrationStatusBadge } from '../components/Badges';

export default function MyRegistrationsPage() {
  const { socket } = useSocket();
  const { addToast } = useToast();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/registrations/mine');
      setRegistrations(data.registrations);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load registrations', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  // Real-time registration status & event updates
  useEffect(() => {
    if (!socket) return;

    const handleRegUpdated = ({ registration: updated }) => {
      setRegistrations((prev) =>
        prev.map((r) => (r._id === updated._id ? updated : r))
      );
    };

    const handleEventUpdated = ({ event: updatedEvent }) => {
      setRegistrations((prev) =>
        prev.map((r) =>
          r.event?._id === updatedEvent._id
            ? {
                ...r,
                event: {
                  ...r.event,
                  title: updatedEvent.title,
                  date: updatedEvent.date,
                  registrationDeadline: updatedEvent.registrationDeadline,
                },
              }
            : r
        )
      );
    };

    const handleEventDeleted = ({ eventId }) => {
      setRegistrations((prev) => prev.filter((r) => r.event?._id !== eventId));
    };

    socket.on('registration:updated', handleRegUpdated);
    socket.on('event:updated', handleEventUpdated);
    socket.on('event:deleted', handleEventDeleted);

    return () => {
      socket.off('registration:updated', handleRegUpdated);
      socket.off('event:updated', handleEventUpdated);
      socket.off('event:deleted', handleEventDeleted);
    };
  }, [socket]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Registrations</h1>
        <p className="text-sm text-slate-600 mt-1">
          Track the real-time approval status of your campus event sign-ups.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 bg-white rounded-xl border border-slate-200 p-5 animate-pulse" />
          ))}
        </div>
      ) : registrations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <h2 className="text-lg font-semibold text-slate-800">No registrations yet</h2>
          <p className="text-sm text-slate-500 mt-1">
            Browse upcoming campus events and reserve your spot.
          </p>
          <Link
            to="/"
            className="inline-block mt-4 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Explore Events
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {registrations.map((reg) => (
            <div
              key={reg._id}
              className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
            >
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {reg.event?.title || 'Event Unavailable'}
                </h2>
                {reg.event?.date && (
                  <p className="text-sm text-slate-600 mt-1">
                    Event Date:{' '}
                    <span className="font-medium text-slate-800">
                      {new Date(reg.event.date).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  Applied on {new Date(reg.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <span className="text-xs text-slate-500 sm:hidden">Status:</span>
                <RegistrationStatusBadge status={reg.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}