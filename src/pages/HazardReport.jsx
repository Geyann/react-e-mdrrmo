"use client";

import { Link, useNavigate } from "react-router-dom";
import reportImg from "../Images/photo-icon.png";
import { useState, useEffect } from "react";
import { supabase } from "../createClient";
import { TriangleAlertIcon } from "lucide-react";

const HazardReport = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [geoLoading, setGeoLoading] = useState(true);

  const [form, setForm] = useState({
    reporterName: "",
    department: "",
    address: "",
    landMark: "",
    reporterContact: "",
    dateObserved: "",
    timeObserved: "",
    hazardCategory: "",
    riskLevel: "",
    hazardPhotos: [],
    hazardDescription: "",
    recommendedAction: "",
    latitude: null,
    longitude: null,
  });

  // Local "today" (avoids UTC off-by-one) — blocks future dates on mobile pickers
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // ── Get current logged-in user ──
  useEffect(() => {
    const fetchUser = async () => {
      // Check Supabase auth first
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();

      if (supabaseUser) {
        setUser(supabaseUser);

        // Fetch user profile for name
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .maybeSingle();

        if (profile) {
          setUserProfile(profile);
          const fullName = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || supabaseUser.email;
          setForm(prev => ({ ...prev, reporterName: fullName }));
        } else {
          setForm(prev => ({ ...prev, reporterName: supabaseUser.email || 'User' }));
        }
        return;
      }

      // Fallback: check localStorage for custom login user
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          setUserProfile(parsed);
          setForm(prev => ({ ...prev, reporterName: parsed.full_name || parsed.email || 'User' }));
        } catch {
          setUser({ email: storedUser });
          setForm(prev => ({ ...prev, reporterName: storedUser }));
        }
        return;
      }

      // No user found — redirect to login
      navigate('/login', { state: { error: 'Please log in to submit a hazard report.' } });
    };

    fetchUser();
  }, [navigate]);

  // ── GPS Location (reusable so mobile users can retry) ──
  const fetchLocation = () => {
    setGeoLoading(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoLoading(false);
      setGeoError("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. Enable location access for this site, then tap Retry."
            : "Unable to retrieve GPS location. Check your connection and tap Retry."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Upload photos to Supabase Storage ──
  const uploadPhotos = async (files) => {
    const uploadedPaths = [];
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const filePath = `hazard-photos/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error } = await supabase.storage
        .from('hazard-photos')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) {
        console.error('Upload error:', error);
        continue;
      }
      uploadedPaths.push(filePath);
    }
    return uploadedPaths;
  };

  // ── Handle form changes ──
  function handleChange(event) {
    const { name, value, type, files } = event.target;
    if (type === "file") {
      setForm(prev => ({ ...prev, hazardPhotos: Array.from(files).slice(0, 4) }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  }

  // ── Submit report ──
  async function createHazardReport(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      // Upload photos first
      let photoPaths = [];
      if (form.hazardPhotos.length > 0) {
        photoPaths = await uploadPhotos(form.hazardPhotos);
      }

      // Only include user_id if we have a VALID authenticated Supabase user
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      const hasValidUser = supabaseUser?.id && typeof supabaseUser.id === 'string' && supabaseUser.id.length > 10;

      // Build the report object — only include user_id if we have a real session
      const reportData = {
        reporter_name: form.reporterName || 'Anonymous',
        reporter_contact: form.reporterContact || '',
        address: form.address,
        landmark: form.landMark || '',
        date_observed: form.dateObserved,
        time_observed: form.timeObserved,
        hazard_category: form.hazardCategory,
        risk_level: form.riskLevel,
        hazard_description: form.hazardDescription,
        recommended_action: form.recommendedAction || '',
        hazard_photos: photoPaths,
        latitude: form.latitude,
        longitude: form.longitude,
        status: 'pending',
        report_status: 'pending',
        show_on_heatmap: false,
      };

      // Only attach user_id if we have a real authenticated user (not localStorage fallback)
      if (hasValidUser) {
        reportData.user_id = supabaseUser.id;
      }

      const { error } = await supabase.from('hazard_reports').insert([reportData]);
      if (error) throw error;

      setSuccess(true);

    } catch (err) {
      console.error('Submit error:', err);
      alert('Failed to submit report: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success view ──
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div role="status" aria-live="polite" className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-6 sm:p-10 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Report Submitted!</h2>
          <p className="text-slate-500 mb-6">
            Your hazard report has been received. It will appear on the map once reviewed and approved by an administrator.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => { setSuccess(false); setForm(prev => ({ ...prev, hazardPhotos: [], hazardDescription: '', recommendedAction: '' })); }}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Submit Another
            </button>
            <Link to="/user-dashboard" className="px-6 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 text-center">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-4 sm:pt-10 px-4 sm:px-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 max-w-2xl mx-auto bg-white rounded-t-3xl shadow-xl border-b-0 px-4 pb-6">
        <div className="flex flex-col items-center pt-5">
          <TriangleAlertIcon className="w-14 h-14 text-slate-200" aria-hidden="true" />
          <h1 id="hazard-report-title" className="text-2xl sm:text-3xl font-bold text-white text-center">
            Hazard &amp; Risk Report
          </h1>
          <p className="text-white text-sm text-center">
            Identify risks. Fields marked <span className="text-red-300">*</span> are required.
          </p>
        </div>
      </div>

      <form
        onSubmit={createHazardReport}
        aria-labelledby="hazard-report-title"
        className="max-w-2xl mx-auto bg-white p-5 sm:p-8 md:p-10 rounded-b-3xl shadow-xl border-t-0"
      >
        <div className="flex flex-col gap-6">

          {/* User Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">
                  Reporting as: <span className="text-blue-900">{userProfile?.full_name || user?.email || 'User'}</span>
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                {(userProfile?.full_name || user?.email || 'U')[0].toUpperCase()}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {/* Reporter Name + Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reporterName" className="text-sm font-medium text-gray-700">
                  Reporter Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="reporterName"
                  name="reporterName"
                  value={form.reporterName}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                  className="text-base p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reporterContact" className="text-sm font-medium text-gray-700">Contact Details</label>
                <input
                  id="reporterContact"
                  name="reporterContact"
                  value={form.reporterContact}
                  onChange={handleChange}
                  placeholder="Phone or email"
                  autoComplete="tel"
                  className="text-base p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>

            {/* Hazard Category */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="hazardCategory" className="text-sm font-medium text-gray-700">
                Hazard Category <span className="text-red-500">*</span>
              </label>
              <select
                id="hazardCategory"
                name="hazardCategory"
                value={form.hazardCategory}
                onChange={handleChange}
                required
                className="text-base p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">-- Select Category --</option>
                <option value="physical">Physical</option>
                <option value="chemical/biological">Chemical / Biological</option>
                <option value="electrical">Electrical</option>
                <option value="procedural/safety practices">Procedural / Safety Practices</option>
                <option value="natural disaster">Natural Disaster</option>
              </select>
            </div>

            {/* Risk Level */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="riskLevel" className="text-sm font-medium text-gray-700">
                Risk Level <span className="text-red-500">*</span>
              </label>
              <select
                id="riskLevel"
                name="riskLevel"
                value={form.riskLevel}
                onChange={handleChange}
                required
                className="text-base p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">-- Select Risk Level --</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="address" className="text-sm font-medium text-gray-700">
                Location / Address <span className="text-red-500">*</span>
              </label>
              <input
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                required
                autoComplete="street-address"
                className="text-base p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Landmark */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="landMark" className="text-sm font-medium text-gray-700">Landmark</label>
              <input
                id="landMark"
                name="landMark"
                value={form.landMark}
                onChange={handleChange}
                placeholder="Optional landmark near the hazard"
                className="text-base p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Department */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="department" className="text-sm font-medium text-gray-700">Department</label>
              <input
                id="department"
                name="department"
                value={form.department}
                onChange={handleChange}
                placeholder="Optional"
                className="text-base p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Date & Time — stacks on phones, side-by-side on ≥640px */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="dateObserved" className="text-sm font-medium text-gray-700">
                  Date Observed <span className="text-red-500">*</span>
                </label>
                <input
                  id="dateObserved"
                  name="dateObserved"
                  type="date"
                  value={form.dateObserved}
                  onChange={handleChange}
                  required
                  max={todayStr}
                  className="text-base p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="timeObserved" className="text-sm font-medium text-gray-700">
                  Time Observed <span className="text-red-500">*</span>
                </label>
                <input
                  id="timeObserved"
                  name="timeObserved"
                  type="time"
                  value={form.timeObserved}
                  onChange={handleChange}
                  required
                  className="text-base p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="hazardDescription" className="text-sm font-medium text-gray-700">
                Hazard Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="hazardDescription"
                name="hazardDescription"
                value={form.hazardDescription}
                onChange={handleChange}
                required
                placeholder="Describe the hazard in detail..."
                className="text-base p-3 border border-gray-300 rounded-xl min-h-[100px] outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Recommended Action */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="recommendedAction" className="text-sm font-medium text-gray-700">Recommended Action</label>
              <textarea
                id="recommendedAction"
                name="recommendedAction"
                value={form.recommendedAction}
                onChange={handleChange}
                placeholder="What action do you recommend to address this hazard?"
                className="text-base p-3 border border-gray-300 rounded-xl min-h-[80px] outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Photos */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="hazardPhotos" className="text-sm font-medium text-gray-700">
                Photo Evidence (up to 4 images) <span className="text-red-500">*</span>
              </label>
              <label
                htmlFor="hazardPhotos"
                className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 min-h-[56px]"
              >
                <img src={reportImg} alt="" className="w-8 h-8 shrink-0" />
                <span className="text-gray-500 text-sm truncate">
                  {form.hazardPhotos.length > 0 ? `${form.hazardPhotos.length} image(s) selected` : "Tap to take a photo or select files"}
                </span>
                <input
                  id="hazardPhotos"
                  name="hazardPhotos"
                  type="file"
                  multiple
                  onChange={handleChange}
                  className="sr-only"
                  accept="image/*"
                  required
                  aria-describedby="photoHint"
                />
              </label>
              <p id="photoHint" className="text-xs text-gray-500">
                On your phone you can use the camera directly or pick up to 4 images from your gallery.
              </p>
              {form.hazardPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {Array.from(form.hazardPhotos).map((file, i) => (
                    <div key={i} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Photo preview ${i + 1}`}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                      />
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* GPS Status — announced to screen readers, with mobile retry */}
            <div
              role="status"
              aria-live="polite"
              className={`text-xs p-3 rounded-lg flex flex-wrap items-center gap-2 ${
                form.latitude ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
              }`}
            >
              {form.latitude ? (
                <>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>GPS Location acquired: <strong>{form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}</strong></span>
                </>
              ) : geoLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Acquiring GPS location... Please ensure location services are enabled.</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{geoError}</span>
                  <button
                    type="button"
                    onClick={fetchLocation}
                    className="ml-auto px-3 py-2 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 transition"
                  >
                    Retry
                  </button>
                </>
              )}
            </div>

            {/* Terms — whole row is the tap target, bigger checkbox for touch */}
            <label htmlFor="termsAgree" className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer">
              <input
                id="termsAgree"
                type="checkbox"
                required
                className="mt-0.5 w-5 h-5 shrink-0 accent-blue-600 cursor-pointer"
              />
              <span>
                I agree to the <Link to="#" className="text-blue-600 underline">Terms &amp; Conditions</Link> and authorize the use of my GPS coordinates.
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {submitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Submitting Report...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Submit Hazard Report
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default HazardReport;