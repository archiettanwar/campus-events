import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { socket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const STATUS_BADGE = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  returned: 'bg-slate-100 text-slate-700 border-slate-300',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200',
  overdue: 'bg-red-100 text-red-800 border-red-300',
};

export default function AssistantDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [resources, setResources] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [notesById, setNotesById] = useState({});
  const [toast, setToast] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // Add Timetable Block Form
  const [schedForm, setSchedForm] = useState({
    labRoom: '',
    title: '',
    activityType: 'Lecture',
    isRecurring: true,
    dayOfWeek: 1,
    specificDate: new Date().toISOString().slice(0, 10),
    startTime: '10:00',
    endTime: '12:00',
  });

  // Add New Equipment / Lab Resource Form
  const [resForm, setResForm] = useState({
    name: '',
    resourceType: 'equipment',
    category: '',
    description: '',
    location: '',
    totalQuantity: 5,
    specifications: '',
  });

  const showToast = (msg) => {
    setToast(msg);
    setErrorMsg('');
    setTimeout(() => setToast(''), 4500);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5500);
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const [reqRes, schedRes, resData] = await Promise.all([
        api.get('/requests'),
        api.get('/schedules'),
        api.get('/resources'),
      ]);

      const loadedResources = resData.data.resources || [];
      setRequests(reqRes.data.requests || []);
      setSchedules(schedRes.data.schedules || []);
      setResources(loadedResources);

      const firstLab = loadedResources.find((r) => r.resourceType === 'lab_room');
      if (firstLab) {
        setSchedForm((prev) => (prev.labRoom ? prev : { ...prev, labRoom: firstLab._id }));
      }
    } catch (err) {
      console.error('Failed to load assistant console:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  fetchDashboardData();
  const syncInterval = setInterval(fetchDashboardData, 4000);

  const handleNewRequest = (newReq) => {
    showToast(`New request from ${newReq.student?.name || 'a student'}!`);
    fetchDashboardData();
  };

  socket.on('request:created', handleNewRequest);
  socket.on('request:statusChanged', fetchDashboardData);
  socket.on('schedule:updated', fetchDashboardData);
  socket.on('resource:updated', fetchDashboardData);

  return () => {
    clearInterval(syncInterval);
    socket.off('request:created', handleNewRequest);
    socket.off('request:statusChanged', fetchDashboardData);
    socket.off('schedule:updated', fetchDashboardData);
    socket.off('resource:updated', fetchDashboardData);
  };
}, [fetchDashboardData]);

  const handleRequestAction = async (requestId, status) => {
    try {
      const assistantNote = notesById[requestId] ?? '';
      await api.patch(`/requests/${requestId}/status`, { status, assistantNote });
      showToast(
        status === 'returned'
          ? 'Marked as returned and stock restored!'
          : `Request marked as ${status.toUpperCase()}.`
      );
      fetchDashboardData();
    } catch (err) {
      showError(err.response?.data?.message || 'Action failed');
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    try {
      await api.post('/schedules', schedForm);
      showToast('Timetable slot added and broadcasted live!');
      setSchedForm((prev) => ({ ...prev, title: '' }));
      fetchDashboardData();
    } catch (err) {
      showError(err.response?.data?.message || 'Could not add timetable slot');
    }
  };

  const handleDeleteSchedule = async (id) => {
    try {
      await api.delete(`/schedules/${id}`);
      showToast('Timetable slot removed.');
      fetchDashboardData();
    } catch (err) {
      showError(err.response?.data?.message || 'Could not delete slot');
    }
  };

  const handleCreateResource = async (e) => {
    e.preventDefault();
    try {
      await api.post('/resources', resForm);
      showToast(`${resForm.name} added to CampusLab catalog!`);
      setResForm({
        name: '',
        resourceType: 'equipment',
        category: '',
        description: '',
        location: '',
        totalQuantity: 5,
        specifications: '',
      });
      fetchDashboardData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to add resource');
    }
  };

  const handleDeactivateResource = async (id, name) => {
    try {
      await api.delete(`/resources/${id}`);
      showToast(`Removed "${name}" from active catalog.`);
      fetchDashboardData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to remove resource');
    }
  };

  const labRooms = resources.filter((r) => r.resourceType === 'lab_room');
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const activeCheckoutsCount = requests.filter((r) => r.status === 'approved').length;

  const filteredRequests = requests.filter((r) =>
    statusFilter === 'all' ? true : r.status === statusFilter
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Header & Summary Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Multi-Assistant Operations Portal
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Lab Assistant Console</h1>
          <p className="text-sm text-slate-500">
            Signed in as <span className="font-semibold text-slate-700">{user?.name}</span>
            {user?.labAssigned ? ` • ${user.labAssigned}` : ''}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xl font-extrabold text-amber-800">{pendingCount}</p>
            <p className="text-xs font-medium text-amber-700">Pending</p>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <p className="text-xl font-extrabold text-emerald-800">{activeCheckoutsCount}</p>
            <p className="text-xs font-medium text-emerald-700">Active / Out</p>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200">
            <p className="text-xl font-extrabold text-indigo-800">{schedules.length}</p>
            <p className="text-xs font-medium text-indigo-700">Timetable Slots</p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'requests', label: `Checkout & Room Requests (${pendingCount} Pending)` },
          { id: 'timetable', label: 'Lab Timetable & Occupancy Manager' },
          { id: 'inventory', label: 'Equipment & Lab Rooms Catalog' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading console data...</p>
      ) : activeTab === 'requests' ? (
        /* TAB 1: SHARED REQUEST QUEUE */
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Student & Council Requests</h2>
            <div className="flex flex-wrap gap-1.5">
              {['all', 'pending', 'approved', 'returned', 'rejected'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
              No requests found under "{statusFilter}".
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => (
                <div
                  key={req._id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                          STATUS_BADGE[req.status] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {req.status}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                        {req.bookingCategory.replace('_', ' ')}
                      </span>
                      {req.councilName && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                          Council: {req.councilName}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">
                      {req.resource?.name}{' '}
                      {req.resource?.resourceType === 'equipment' &&
                        `(Qty: ${req.quantity} • ${req.resource?.availableQuantity} left)`}
                    </h3>

                    <p className="text-xs text-slate-600">
                      <span className="font-semibold">Student:</span> {req.student?.name} (
                      {req.student?.rollNumber || req.student?.email} &bull;{' '}
                      {req.student?.department})
                    </p>

                    <p className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">Requested Window:</span>{' '}
                      {req.requestedDate} from {req.startTime} to {req.endTime}
                    </p>

                    <p className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                      <span className="font-semibold">Purpose:</span> {req.purpose}
                    </p>

                    {req.processedBy && (
                      <p className="text-xs text-slate-400">
                        Processed by <span className="font-medium text-slate-600">{req.processedBy.name}</span>
                        {req.assistantNote ? ` — "${req.assistantNote}"` : ''}
                      </p>
                    )}
                  </div>

                  {/* Action Controls */}
                  <div className="lg:w-80 shrink-0 space-y-2.5">
                    {(req.status === 'pending' || req.status === 'approved') && (
                      <input
                        type="text"
                        placeholder="Add pickup rack / room instruction..."
                        value={notesById[req._id] ?? req.assistantNote ?? ''}
                        onChange={(e) =>
                          setNotesById((prev) => ({ ...prev, [req._id]: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}

                    {req.status === 'pending' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleRequestAction(req._id, 'approved')}
                          className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRequestAction(req._id, 'rejected')}
                          className="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {req.status === 'approved' && (
                      <button
                        onClick={() => handleRequestAction(req._id, 'returned')}
                        className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition"
                      >
                        {req.resource?.resourceType === 'equipment'
                          ? 'Mark Returned & Restore Stock'
                          : 'Mark Session Completed'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : activeTab === 'timetable' ? (
        /* TAB 2: TIMETABLE & OCCUPANCY MANAGER */
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs h-fit">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Add Timetable Block</h2>
            <p className="text-xs text-slate-500 mb-4">
              Block a lab for lectures, practicals, tests, or council meetings
            </p>

            <form onSubmit={handleAddSchedule} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lab Room *</label>
                <select
                  required
                  value={schedForm.labRoom}
                  onChange={(e) => setSchedForm({ ...schedForm, labRoom: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {labRooms.map((lab) => (
                    <option key={lab._id} value={lab._id}>
                      {lab.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Session / Subject Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., SE Full-Stack Practical or IEEE Meeting"
                  value={schedForm.title}
                  onChange={(e) => setSchedForm({ ...schedForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type *</label>
                  <select
                    value={schedForm.activityType}
                    onChange={(e) => setSchedForm({ ...schedForm, activityType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Lecture">Lecture</option>
                    <option value="Practical">Practical</option>
                    <option value="Test">Test</option>
                    <option value="Council Meeting">Council Meeting</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Schedule *</label>
                  <select
                    value={schedForm.isRecurring ? 'weekly' : 'date'}
                    onChange={(e) =>
                      setSchedForm({ ...schedForm, isRecurring: e.target.value === 'weekly' })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="weekly">Weekly Recurring</option>
                    <option value="date">Specific Date</option>
                  </select>
                </div>
              </div>

              {schedForm.isRecurring ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Day of Week *</label>
                  <select
                    value={schedForm.dayOfWeek}
                    onChange={(e) =>
                      setSchedForm({ ...schedForm, dayOfWeek: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[1, 2, 3, 4, 5, 6].map((d) => (
                      <option key={d} value={d}>
                        {DAYS[d]}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={schedForm.specificDate}
                    onChange={(e) => setSchedForm({ ...schedForm, specificDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start *</label>
                  <input
                    type="time"
                    required
                    value={schedForm.startTime}
                    onChange={(e) => setSchedForm({ ...schedForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End *</label>
                  <input
                    type="time"
                    required
                    value={schedForm.endTime}
                    onChange={(e) => setSchedForm({ ...schedForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition"
              >
                Publish Timetable Slot
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs overflow-x-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Active Lab Timetable Entries</h2>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-2.5 px-3">Day / Date</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Lab Room</th>
                  <th className="py-2.5 px-3">Activity</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                      {s.isRecurring ? DAYS[s.dayOfWeek] : s.specificDate}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {s.startTime} – {s.endTime}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{s.labRoom?.name}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-900">{s.title}</span>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {s.activityType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteSchedule(s._id)}
                        className="text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        /* TAB 3: EQUIPMENT & LAB INVENTORY MANAGER */
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs h-fit">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Add Equipment or Lab Room</h2>
            <p className="text-xs text-slate-500 mb-4">
              Publish new hardware kits or lab rooms to the live student catalog
            </p>

            <form onSubmit={handleCreateResource} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Resource Type *</label>
                <select
                  value={resForm.resourceType}
                  onChange={(e) => setResForm({ ...resForm, resourceType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="equipment">Hardware Equipment Kit</option>
                  <option value="lab_room">Lab Room</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., STM32 Nucleo Board or Robotics Lab"
                  value={resForm.name}
                  onChange={(e) => setResForm({ ...resForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Microcontrollers"
                    value={resForm.category}
                    onChange={(e) => setResForm({ ...resForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {resForm.resourceType === 'equipment' ? 'Total Stock *' : 'Seat Capacity *'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={resForm.totalQuantity}
                    onChange={(e) =>
                      setResForm({ ...resForm, totalQuantity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Rack *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Hardware Lab — Rack B4"
                  value={resForm.location}
                  onChange={(e) => setResForm({ ...resForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Specifications</label>
                <input
                  type="text"
                  placeholder="e.g., ARM Cortex-M4, USB-C cable included"
                  value={resForm.specifications}
                  onChange={(e) => setResForm({ ...resForm, specifications: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
                <textarea
                  rows={2}
                  required
                  value={resForm.description}
                  onChange={(e) => setResForm({ ...resForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition"
              >
                Add to Catalog
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
            {resources.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      {item.resourceType === 'equipment' ? 'Equipment' : 'Lab Room'}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {item.resourceType === 'equipment'
                        ? `${item.availableQuantity} / ${item.totalQuantity} Available`
                        : `${item.totalQuantity} Seats`}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 mt-2">{item.name}</h3>
                  <p className="text-xs text-slate-500">{item.location}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleDeactivateResource(item._id, item.name)}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Remove from Catalog
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}