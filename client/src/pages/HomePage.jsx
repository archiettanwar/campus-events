import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { socket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import BookingModal from '../components/BookingModal';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ACTIVITY_BADGE = {
  Lecture: 'bg-blue-100 text-blue-700 border-blue-200',
  Practical: 'bg-amber-100 text-amber-800 border-amber-200',
  Test: 'bg-rose-100 text-rose-700 border-rose-200',
  'Council Meeting': 'bg-purple-100 text-purple-700 border-purple-200',
  Maintenance: 'bg-slate-200 text-slate-700 border-slate-300',
};

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [liveLabs, setLiveLabs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [resources, setResources] = useState([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [resourceFilter, setResourceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState(null);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  const fetchAllData = useCallback(async () => {
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 5);

      const [liveRes, schedRes, resData] = await Promise.all([
        api.get(`/schedules/live-status?date=${dateStr}&dayOfWeek=${now.getDay()}&time=${timeStr}`),
        api.get('/schedules'),
        api.get('/resources'),
      ]);

      setLiveLabs(liveRes.data.labs || []);
      setSchedules(schedRes.data.schedules || []);
      setResources(resData.data.resources || []);
    } catch (err) {
      console.error('Error loading CampusLab data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  fetchAllData();
  const syncInterval = setInterval(fetchAllData, 4000);

  socket.on('resource:updated', fetchAllData);
  socket.on('schedule:updated', fetchAllData);
  return () => {
    clearInterval(syncInterval);
    socket.off('resource:updated', fetchAllData);
    socket.off('schedule:updated', fetchAllData);
  };
}, [fetchAllData]);

  const handleBookClick = (resource) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSelectedResource(resource);
  };

  const filteredDaySchedules = schedules.filter((s) => {
    if (s.isRecurring) return s.dayOfWeek === selectedDay;
    if (s.specificDate) {
      const d = new Date(`${s.specificDate}T00:00:00`).getDay();
      return d === selectedDay;
    }
    return false;
  });

  const filteredResources = resources.filter((item) => {
    const matchesType = resourceFilter === 'all' || item.resourceType === resourceFilter;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Hero Header */}
      <section className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 text-white shadow-md">
        <div className="max-w-3xl">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full mb-3">
            Real-Time Campus Lab & Equipment Portal
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Check Live Lab Availability & Checkout Hardware Kits
          </h1>
          <p className="text-indigo-100 mt-2 text-sm sm:text-base">
            Instantly see if lectures or tests are running before walking to a lab, reserve open rooms for council meetings, or borrow microcontroller kits with Lab Assistant approval.
          </p>
        </div>
      </section>

      {/* Section 1: Live "Is the Lab Free?" Occupancy Cards */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Live Lab Occupancy Status</h2>
            <p className="text-sm text-slate-500">
              Updated automatically from active lectures, tests, and approved council meetings
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {DAYS[new Date().getDay()]} &bull; {new Date().toTimeString().slice(0, 5)}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {liveLabs.map(({ lab, isFree, currentActivity, nextActivity }) => (
              <div
                key={lab._id}
                className={`rounded-2xl border p-5 bg-white shadow-xs transition ${
                  isFree ? 'border-emerald-200' : 'border-amber-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900">{lab.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{lab.location}</p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                      isFree
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isFree ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    {isFree ? 'FREE NOW' : 'OCCUPIED'}
                  </span>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-slate-50 text-xs space-y-1">
                  {isFree ? (
                    <>
                      <p className="font-semibold text-emerald-700">
                        Open for individual PC use or council booking
                      </p>
                      <p className="text-slate-500">
                        {nextActivity
                          ? `Next scheduled: ${nextActivity.title} at ${nextActivity.startTime}`
                          : 'No more scheduled classes for today'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-amber-800">
                        {currentActivity.activityType}: {currentActivity.title}
                      </p>
                      <p className="text-slate-500">
                        Ends at {currentActivity.endTime} ({lab.totalQuantity} workstations)
                      </p>
                    </>
                  )}
                </div>

                {user?.role !== 'lab_assistant' && (
                  <button
                    onClick={() => handleBookClick(lab)}
                    className="mt-4 w-full py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                  >
                    Request PC Access / Council Slot
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Interactive Lab Timetable */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Weekly Lab Timetable</h2>
            <p className="text-sm text-slate-500">
              Check scheduled lectures, practicals, tests, and council meetings by day
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((dayIdx) => (
              <button
                key={dayIdx}
                onClick={() => setSelectedDay(dayIdx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedDay === dayIdx
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {DAYS[dayIdx].slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {filteredDaySchedules.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
            <p className="text-sm font-medium text-slate-700">
              All labs are completely free on {DAYS[selectedDay]}!
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Students and councils can request any lab slot for this day.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-3 px-4">Time Slot</th>
                  <th className="py-3 px-4">Lab Room</th>
                  <th className="py-3 px-4">Session / Activity</th>
                  <th className="py-3 px-4">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredDaySchedules.map((block) => (
                  <tr key={block._id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {block.startTime} – {block.endTime}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {block.labRoom?.name || 'Lab Room'}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {block.title}
                      {block.specificDate && (
                        <span className="ml-2 text-xs text-slate-400">({block.specificDate})</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                          ACTIVITY_BADGE[block.activityType] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {block.activityType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 3: Equipment & Lab Rooms Catalog */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Equipment & Lab Booking Catalog</h2>
            <p className="text-sm text-slate-500">
              Borrow hardware kits or book lab workstations with real-time stock tracking
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search Arduino, Pi, Lab..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <div className="flex rounded-lg bg-slate-100 p-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'equipment', label: 'Equipment Kits' },
                { id: 'lab_room', label: 'Lab Rooms' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setResourceFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    resourceFilter === tab.id
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((item) => {
            const isEquipment = item.resourceType === 'equipment';
            const outOfStock = isEquipment && item.availableQuantity === 0;

            return (
              <div
                key={item._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      {item.category}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        outOfStock
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {isEquipment
                        ? `${item.availableQuantity} / ${item.totalQuantity} In Stock`
                        : `${item.totalQuantity} Seats`}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{item.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{item.location}</p>
                  <p className="text-sm text-slate-600 mt-3 line-clamp-2">{item.description}</p>

                  {item.specifications && (
                    <p className="mt-3 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                      <span className="font-semibold text-slate-700">Specs:</span>{' '}
                      {item.specifications}
                    </p>
                  )}
                </div>

                {user?.role !== 'lab_assistant' && (
                  <button
                    disabled={outOfStock}
                    onClick={() => handleBookClick(item)}
                    className="mt-5 w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                  >
                    {outOfStock
                      ? 'Out of Stock'
                      : isEquipment
                      ? 'Request Equipment'
                      : 'Book Lab / Council Slot'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {selectedResource && (
        <BookingModal
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
          onSuccess={(msg) => {
            showToast(msg);
            fetchAllData();
          }}
        />
      )}
    </div>
  );
}