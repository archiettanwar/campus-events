import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { EventAvailabilityBadge, RegistrationStatusBadge } from '../components/Badges';
import EventFormModal from '../components/EventFormModal';

export default function AdminDashboardPage() {
  const { socket } = useSocket();
  const { addToast } = useToast();

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [updatingRegId, setUpdatingRegId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const { data } = await api.get('/events?limit=50');
      setEvents(data.items);
      if (data.items.length > 0) {
        setSelectedEventId((prev) =>
          prev && data.items.some((e) => e._id === prev) ? prev : data.items[0]._id
        );
      } else {
        setSelectedEventId(null);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load events', 'error');
    } finally {
      setLoadingEvents(false);
    }
  }, [addToast]);

  const fetchEventRegistrations = useCallback(
    async (eventId) => {
      if (!eventId) {
        setRegistrations([]);
        return;
      }
      setLoadingRegs(true);
      try {
        const { data } = await api.get(`/events/${eventId}/registrations`);
        setRegistrations(data.registrations);
      } catch (err) {
        addToast(err.response?.data?.message || 'Failed to load registrations', 'error');
      } finally {
        setLoadingRegs(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchEventRegistrations(selectedEventId);
  }, [selectedEventId, fetchEventRegistrations]);

  // Real-time Socket listeners for Admin
  useEffect(() => {
    if (!socket) return;

    const handleNewRegistration = ({ registration }) => {
      const regEventId = registration.event?._id || registration.event;
      if (regEventId === selectedEventId) {
        setRegistrations((prev) => {
          if (prev.some((r) => r._id === registration._id)) return prev;
          return [registration, ...prev];
        });
      }
    };

    const handleEventUpdated = ({ event: updated }) => {
      setEvents((prev) =>
        prev.map((ev) => (ev._id === updated._id ? updated : ev))
      );
    };

    socket.on('registration:new', handleNewRegistration);
    socket.on('event:updated', handleEventUpdated);

    return () => {
      socket.off('registration:new', handleNewRegistration);
      socket.off('event:updated', handleEventUpdated);
    };
  }, [socket, selectedEventId]);

  const handleSavedEvent = (savedEvent, isEdit) => {
    if (isEdit) {
      setEvents((prev) => prev.map((e) => (e._id === savedEvent._id ? savedEvent : e)));
    } else {
      setEvents((prev) => [savedEvent, ...prev]);
      setSelectedEventId(savedEvent._id);
    }
  };

  const handleDeleteEvent = async (event) => {
    if (!window.confirm(`Delete "${event.title}" and all its registrations?`)) return;

    try {
      await api.delete(`/events/${event._id}`);
      addToast('Event deleted', 'info');
      setEvents((prev) => {
        const remaining = prev.filter((e) => e._id !== event._id);
        if (selectedEventId === event._id) {
          setSelectedEventId(remaining[0]?._id || null);
        }
        return remaining;
      });
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete event', 'error');
    }
  };

  const handleRegistrationDecision = async (regId, status) => {
    setUpdatingRegId(regId);
    try {
      const { data } = await api.patch(`/registrations/${regId}`, { status });
      setRegistrations((prev) =>
        prev.map((r) => (r._id === regId ? { ...r, status: data.registration.status } : r))
      );
      if (data.event) {
        setEvents((prev) =>
          prev.map((e) => (e._id === data.event._id ? data.event : e))
        );
      }
      addToast(`Registration ${status}`, 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Action failed', 'error');
    } finally {
      setUpdatingRegId(null);
    }
  };

  const selectedEvent = events.find((e) => e._id === selectedEventId);
  const filteredRegistrations =
    statusFilter === 'all'
      ? registrations
      : registrations.filter((r) => r.status === statusFilter);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1">
            Create campus events and manage student registration approvals.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingEvent(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          + Create Event
        </button>
      </div>

      {loadingEvents ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 h-64 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          <div className="lg:col-span-7 h-64 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <h2 className="text-lg font-semibold text-slate-800">No events created yet</h2>
          <p className="text-sm text-slate-500 mt-1">
            Click &ldquo;+ Create Event&rdquo; above to publish your first campus event.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Events List */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
              Events ({events.length})
            </h2>

            {events.map((event) => {
              const isSelected = event._id === selectedEventId;
              return (
                <div
                  key={event._id}
                  onClick={() => setSelectedEventId(event._id)}
                  className={`rounded-xl border p-4 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/50 border-indigo-500 ring-1 ring-indigo-500'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{event.title}</h3>
                    <EventAvailabilityBadge event={event} />
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(event.date).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Seats: {event.seatsTaken} / {event.capacity}
                    </span>

                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setEditingEvent(event);
                          setModalOpen(true);
                        }}
                        className="px-2.5 py-1 font-medium text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event)}
                        className="px-2.5 py-1 font-medium text-rose-600 hover:bg-rose-100 rounded-md transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Selected Event Registrations */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
            {selectedEvent && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Registrations: {selectedEvent.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedEvent.seatsTaken} of {selectedEvent.capacity} seats approved
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {['all', 'pending', 'approved', 'rejected'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setStatusFilter(tab)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                          statusFilter === tab
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {loadingRegs ? (
                  <div className="py-12 text-center text-sm text-slate-500">
                    Loading registrations...
                  </div>
                ) : filteredRegistrations.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500">
                    No {statusFilter !== 'all' ? statusFilter : ''} registrations for this event.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {filteredRegistrations.map((reg) => {
                      const isEventFull = selectedEvent.seatsTaken >= selectedEvent.capacity;
                      const isBusy = updatingRegId === reg._id;

                      return (
                        <div
                          key={reg._id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2.5">
                              <p className="font-semibold text-sm text-slate-900">
                                {reg.user?.name || 'Student'}
                              </p>
                              <RegistrationStatusBadge status={reg.status} />
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{reg.user?.email}</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Applied {new Date(reg.createdAt).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                            {reg.status === 'pending' && (
                              <button
                                onClick={() => handleRegistrationDecision(reg._id, 'approved')}
                                disabled={isBusy || isEventFull}
                                title={isEventFull ? 'Event is at full capacity' : 'Approve registration'}
                                className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                            )}

                            {reg.status !== 'rejected' && (
                              <button
                                onClick={() => handleRegistrationDecision(reg._id, 'rejected')}
                                disabled={isBusy}
                                className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <EventFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialEvent={editingEvent}
        onSaved={handleSavedEvent}
      />
    </div>
  );
}