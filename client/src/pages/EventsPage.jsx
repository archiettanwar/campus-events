import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { EventAvailabilityBadge, RegistrationStatusBadge } from '../components/Badges';

export default function EventsPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { addToast } = useToast();

  const [events, setEvents] = useState([]);
  const [myRegsMap, setMyRegsMap] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState(null);

  const fetchEvents = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/events?page=${pageNum}&limit=9`);
      setEvents(data.items);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const fetchMyRegistrations = useCallback(async () => {
    if (user?.role !== 'student') {
      setMyRegsMap({});
      return;
    }
    try {
      const { data } = await api.get('/registrations/mine');
      const map = {};
      for (const reg of data.registrations) {
        if (reg.event?._id) {
          map[reg.event._id] = reg;
        }
      }
      setMyRegsMap(map);
    } catch (err) {
      console.error('Failed to fetch user registrations:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchEvents(page);
  }, [fetchEvents, page]);

  useEffect(() => {
    fetchMyRegistrations();
  }, [fetchMyRegistrations]);

  // Live Socket.IO updates
  useEffect(() => {
    if (!socket) return;

    const handleEventUpdated = ({ event: updated }) => {
      setEvents((prev) =>
        prev.map((ev) => (ev._id === updated._id ? updated : ev))
      );
    };

    const handleEventDeleted = ({ eventId }) => {
      setEvents((prev) => prev.filter((ev) => ev._id !== eventId));
    };

    const handleRegistrationUpdated = ({ registration }) => {
      const eventId = registration.event?._id || registration.event;
      if (eventId) {
        setMyRegsMap((prev) => ({
          ...prev,
          [eventId]: registration,
        }));
      }
    };

    socket.on('event:updated', handleEventUpdated);
    socket.on('event:deleted', handleEventDeleted);
    socket.on('registration:updated', handleRegistrationUpdated);

    return () => {
      socket.off('event:updated', handleEventUpdated);
      socket.off('event:deleted', handleEventDeleted);
      socket.off('registration:updated', handleRegistrationUpdated);
    };
  }, [socket]);

  const handleRegister = async (eventId) => {
    setRegisteringId(eventId);
    try {
      const { data } = await api.post(`/events/${eventId}/register`);
      setMyRegsMap((prev) => ({
        ...prev,
        [eventId]: data.registration,
      }));
      addToast('Registration submitted! Pending admin approval.', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Registration failed', 'error');
    } finally {
      setRegisteringId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Upcoming Campus Events</h1>
          <p className="text-sm text-slate-600 mt-1">
            Discover workshops, fests, and seminars happening across campus.
          </p>
        </div>
        {user?.role === 'admin' && (
          <Link
            to="/admin"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Manage Events
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-64 bg-white rounded-2xl border border-slate-200 p-6 animate-pulse flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-5/6" />
              </div>
              <div className="h-10 bg-slate-100 rounded-lg w-full" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <h2 className="text-lg font-semibold text-slate-800">No upcoming events yet</h2>
          <p className="text-sm text-slate-500 mt-1">
            Check back later for newly announced campus events.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const seatsLeft = Math.max(0, event.capacity - event.seatsTaken);
              const percentFull = Math.min(100, Math.round((event.seatsTaken / event.capacity) * 100));
              const isFull = seatsLeft === 0;
              const isDeadlinePassed = new Date() > new Date(event.registrationDeadline);
              const existingReg = myRegsMap[event._id];

              return (
                <div
                  key={event._id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-bold text-slate-900 leading-snug">
                        {event.title}
                      </h2>
                      <EventAvailabilityBadge event={event} />
                    </div>

                    <p className="text-sm text-slate-600 mt-2.5 line-clamp-3">
                      {event.description}
                    </p>

                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="font-medium text-slate-500">Event Date:</span>
                        <span className="font-semibold text-slate-800">
                          {new Date(event.date).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-slate-500">Register By:</span>
                        <span className="font-medium text-slate-700">
                          {new Date(event.registrationDeadline).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Seat Capacity Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span className="text-slate-600">
                          {event.seatsTaken} / {event.capacity} seats filled
                        </span>
                        <span className={isFull ? 'text-rose-600 font-semibold' : 'text-indigo-600'}>
                          {seatsLeft} left
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isFull
                              ? 'bg-rose-500'
                              : percentFull >= 90
                              ? 'bg-amber-500'
                              : 'bg-indigo-600'
                          }`}
                          style={{ width: `${percentFull}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div className="mt-6">
                    {!user ? (
                      <Link
                        to="/login"
                        className="block w-full text-center py-2.5 px-4 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        Log in to Register
                      </Link>
                    ) : user.role === 'admin' ? (
                      <Link
                        to="/admin"
                        className="block w-full text-center py-2.5 px-4 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        View in Dashboard
                      </Link>
                    ) : existingReg ? (
                      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-xs font-medium text-slate-600">Your Status:</span>
                        <RegistrationStatusBadge status={existingReg.status} />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRegister(event._id)}
                        disabled={isFull || isDeadlinePassed || registeringId === event._id}
                        className="w-full py-2.5 px-4 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
                      >
                        {registeringId === event._id
                          ? 'Registering...'
                          : isFull
                          ? 'Event Full'
                          : isDeadlinePassed
                          ? 'Registration Closed'
                          : 'Register Now'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50 cursor-pointer"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}