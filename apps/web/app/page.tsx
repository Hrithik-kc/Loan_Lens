"use client";

import React, { useState, useEffect, useRef } from "react";

// Types corresponding to backend models
interface User {
  id: string;
  name: string;
  email: string;
  role: "BENEFICIARY" | "LOAN_OFFICER" | "ADMIN";
  phone?: string;
  district?: string;
  state?: string;
  pincode?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

interface Loan {
  id: string;
  loanNumber: string;
  borrowerId: string;
  borrower: {
    name: string;
    email: string;
    phone?: string;
    district?: string;
    state?: string;
  };
  officerId?: string;
  officer?: {
    name: string;
  };
  purpose: string;
  amount: number;
  loanType: string;
  status: "PENDING" | "ACTIVE" | "VERIFIED" | "REJECTED" | "CLOSED";
  sanctionDate: string;
  dueDate?: string;
  bankName?: string;
  branchName?: string;
  notes?: string;
  createdAt: string;
  uploads?: Upload[];
  reports?: any[];
}

interface Upload {
  id: string;
  fileUrl: string;
  fileType: "IMAGE" | "VIDEO";
  fileName: string;
  fileSize: number;
  gpsLat?: number;
  gpsLng?: number;
  gpsAlt?: number;
  gpsAccuracy?: number;
  deviceInfo?: string;
  createdAt: string;
  location?: {
    address: string;
    district: string;
    state: string;
    matchesBorrowerAddress: boolean;
    distanceKm: number;
  };
  verification?: Verification;
}

interface Verification {
  id: string;
  uploadId: string;
  status: "PENDING" | "PROCESSING" | "AI_COMPLETE" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "MORE_EVIDENCE_REQUIRED";
  decidedAt?: string;
  processedAt?: string;
  officerComment?: string;
  aiResult?: {
    riskScore: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    explanation: string;
    detectedObjects: string; // JSON string
    fraudFlags: string; // JSON string
    duplicateScore: number;
    imageQualityScore: number;
  };
  officerComments?: Array<{
    id: string;
    comment: string;
    createdAt: string;
    officer: { name: string };
  }>;
}

interface DashboardStats {
  totalLoans: number;
  pendingVerifications: number;
  verifiedLoans: number;
  rejectedLoans: number;
  fraudCasesCount: number;
  riskDistribution: Record<string, number>;
  aiAccuracy: number;
}

interface FraudTrend {
  date: string;
  count: number;
  avgRiskScore: number;
}

interface OfficerPerformance {
  officerId: string;
  name: string;
  email: string;
  assignedLoans: number;
  approvedCount: number;
  rejectedCount: number;
  approvalRate: number;
  avgDecisionTimeHrs: number;
}

interface RegionalDistribution {
  state: string;
  count: number;
  amount: number;
}

interface AuditLog {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

export default function Home() {
  // Theme & Session states
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // App Navigation
  const [activeTab, setActiveTab] = useState<"dashboard" | "loans" | "verifications" | "audits" | "settings">("dashboard");
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [selectedVerificationId, setSelectedVerificationId] = useState<string | null>(null);

  // Auth form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Core Data States
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [loanDetailsLoading, setLoanDetailsLoading] = useState(false);
  const [loanTimeline, setLoanTimeline] = useState<any[]>([]);

  const [verifications, setVerifications] = useState<any[]>([]);
  const [verificationsLoading, setVerificationsLoading] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<any | null>(null);
  const [verificationDetailsLoading, setVerificationDetailsLoading] = useState(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [fraudTrends, setFraudTrends] = useState<FraudTrend[]>([]);
  const [regionalDist, setRegionalDist] = useState<RegionalDistribution[]>([]);
  const [officerPerformance, setOfficerPerformance] = useState<OfficerPerformance[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditsLoading, setAuditsLoading] = useState(false);

  // New Evidence Upload simulation states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadGpsType, setUploadGpsType] = useState<"valid" | "fraudulent">("valid");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Verification Decision states
  const [decisionStatus, setDecisionStatus] = useState<"APPROVED" | "REJECTED" | "MORE_EVIDENCE_REQUIRED">("APPROVED");
  const [decisionComment, setDecisionComment] = useState("");
  const [decisionLoading, setDecisionLoading] = useState(false);

  // Map DOM element reference
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any | null>(null);

  // API base URL
  const API_BASE = "http://localhost:4000/api";

  // Check initial theme and token
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setTheme("light");
      document.documentElement.classList.add("light-theme");
    } else {
      document.documentElement.classList.remove("light-theme");
    }

    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // Fetch data depending on active tab and role
  useEffect(() => {
    if (!token || !currentUser) return;

    if (activeTab === "dashboard" && (currentUser.role === "ADMIN" || currentUser.role === "LOAN_OFFICER")) {
      fetchDashboardStats();
    } else if (activeTab === "loans") {
      fetchLoans();
    } else if (activeTab === "verifications" && (currentUser.role === "ADMIN" || currentUser.role === "LOAN_OFFICER")) {
      fetchVerifications();
    } else if (activeTab === "audits" && currentUser.role === "ADMIN") {
      fetchAuditLogs();
    }
  }, [activeTab, token, currentUser]);

  // Fetch details when selectedLoanId changes
  useEffect(() => {
    if (selectedLoanId) {
      fetchLoanDetails(selectedLoanId);
    } else {
      setSelectedLoan(null);
    }
  }, [selectedLoanId]);

  // Fetch details when selectedVerificationId changes
  useEffect(() => {
    if (selectedVerificationId) {
      fetchVerificationDetails(selectedVerificationId);
    } else {
      setSelectedVerification(null);
    }
  }, [selectedVerificationId]);

  // Initialize Map for Verification details view
  useEffect(() => {
    if (!selectedVerification || !selectedVerification.upload) return;

    const upload = selectedVerification.upload;
    const location = upload.location;

    // We need both upload GPS and registered GPS to render the map comparison.
    // If upload doesn't have GPS, map is not applicable.
    if (!upload.gpsLat || !upload.gpsLng) return;

    // Simulate baseline registered address near Varanasi or Patiala
    // (if not matching, set it 12-15km away to showcase fraud alert)
    const registeredLat = upload.gpsLat + (location?.matchesBorrowerAddress ? 0.008 : 0.125);
    const registeredLng = upload.gpsLng + (location?.matchesBorrowerAddress ? -0.005 : -0.098);

    const initMap = () => {
      if (typeof window === "undefined" || !(window as any).L) return;

      const L = (window as any).L;

      // Clean up previous map if it exists
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      if (!mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current).setView([upload.gpsLat, upload.gpsLng], 12);
      leafletMapRef.current = map;

      // Add OpenStreetMap tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Icon customizations
      const uploadIcon = L.divIcon({
        className: "custom-marker-upload",
        html: `<div class="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center shadow-lg animate-bounce text-white font-bold text-xs">📷</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const registeredIcon = L.divIcon({
        className: "custom-marker-registered",
        html: `<div class="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-lg text-white font-bold text-xs">🏠</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      // Markers
      const markerUpload = L.marker([upload.gpsLat, upload.gpsLng], { icon: uploadIcon })
        .addTo(map)
        .bindPopup(`<b>Upload Location</b><br/>Lat: ${upload.gpsLat.toFixed(5)}<br/>Lng: ${upload.gpsLng.toFixed(5)}`)
        .openPopup();

      const markerRegistered = L.marker([registeredLat, registeredLng], { icon: registeredIcon })
        .addTo(map)
        .bindPopup(`<b>Registered Beneficiary Site</b>`);

      // Draw path line between markers
      const line = L.polyline(
        [
          [upload.gpsLat, upload.gpsLng],
          [registeredLat, registeredLng],
        ],
        {
          color: location?.matchesBorrowerAddress ? "#10b981" : "#ef4444",
          weight: 3,
          dashArray: "6,6",
        }
      ).addTo(map);

      // Fit bounds to show both markers
      const group = new L.featureGroup([markerUpload, markerRegistered]);
      map.fitBounds(group.getBounds().pad(0.1));
    };

    // Load Leaflet dynamically from CDN if not already loaded
    if (!(window as any).L) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => {
        initMap();
      };
      document.head.appendChild(script);
    } else {
      // Small timeout to ensure DOM container is ready
      setTimeout(initMap, 50);
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [selectedVerification]);

  // Auth actions
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        setToken(data.data.accessToken);
        setCurrentUser(data.data.user);
        localStorage.setItem("token", data.data.accessToken);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        // Redirect to active tabs depending on role
        if (data.data.user.role === "BENEFICIARY") {
          setActiveTab("loans");
        } else {
          setActiveTab("dashboard");
        }
      } else {
        setAuthError(data.message || "Invalid credentials");
      }
    } catch (err) {
      setAuthError("Failed to connect to backend server");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setActiveTab("dashboard");
    setSelectedLoanId(null);
    setSelectedVerificationId(null);
  };

  const handleDemoLogin = (role: "ADMIN" | "LOAN_OFFICER" | "BENEFICIARY") => {
    if (role === "ADMIN") {
      setEmail("admin@loanlens.ai");
    } else if (role === "LOAN_OFFICER") {
      setEmail("officer1@loanlens.ai");
    } else {
      setEmail("farmer1@example.com");
    }
    setPassword("Password@123");
  };

  // Theme Toggle
  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
      localStorage.setItem("theme", "light");
      document.documentElement.classList.add("light-theme");
    } else {
      setTheme("dark");
      localStorage.setItem("theme", "dark");
      document.documentElement.classList.remove("light-theme");
    }
  };

  // Fetch Dashboard Stats
  const fetchDashboardStats = async () => {
    setStatsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [resStats, resTrends, resRegional, resPerformance] = await Promise.all([
        fetch(`${API_BASE}/analytics/dashboard`, { headers }),
        fetch(`${API_BASE}/analytics/fraud-trends`, { headers }),
        fetch(`${API_BASE}/analytics/regional`, { headers }),
        fetch(`${API_BASE}/analytics/officer-performance`, { headers }),
      ]);

      const [dataStats, dataTrends, dataRegional, dataPerformance] = await Promise.all([
        resStats.json(),
        resTrends.json(),
        resRegional.json(),
        resPerformance.json(),
      ]);

      if (dataStats.success) setStats(dataStats.data);
      if (dataTrends.success) setFraudTrends(dataTrends.data);
      if (dataRegional.success) setRegionalDist(dataRegional.data);
      if (dataPerformance.success) setOfficerPerformance(dataPerformance.data);
    } catch (err) {
      console.error("Failed to load dashboard statistics:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch Loans
  const fetchLoans = async () => {
    setLoansLoading(true);
    try {
      const res = await fetch(`${API_BASE}/loans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLoans(data.data.items || []);
      }
    } catch (err) {
      console.error("Failed to load loans:", err);
    } finally {
      setLoansLoading(false);
    }
  };

  // Fetch Loan Details
  const fetchLoanDetails = async (id: string) => {
    setLoanDetailsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [resLoan, resTimeline] = await Promise.all([
        fetch(`${API_BASE}/loans/${id}`, { headers }),
        fetch(`${API_BASE}/loans/${id}/timeline`, { headers }),
      ]);

      const [dataLoan, dataTimeline] = await Promise.all([resLoan.json(), resTimeline.json()]);

      if (dataLoan.success) setSelectedLoan(dataLoan.data);
      if (dataTimeline.success) setLoanTimeline(dataTimeline.data);
    } catch (err) {
      console.error("Failed to load loan details:", err);
    } finally {
      setLoanDetailsLoading(false);
    }
  };

  // Fetch Verifications Queue
  const fetchVerifications = async () => {
    setVerificationsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/verifications/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setVerifications(data.data.items || []);
      }
    } catch (err) {
      console.error("Failed to load verifications queue:", err);
    } finally {
      setVerificationsLoading(false);
    }
  };

  // Fetch Verification Details
  const fetchVerificationDetails = async (id: string) => {
    setVerificationDetailsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/verifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSelectedVerification(data.data);
        // Default comment
        setDecisionComment("");
        setDecisionStatus(data.data.status === "APPROVED" ? "APPROVED" : "APPROVED");
      }
    } catch (err) {
      console.error("Failed to load verification details:", err);
    } finally {
      setVerificationDetailsLoading(false);
    }
  };

  // Fetch System Audit Logs
  const fetchAuditLogs = async () => {
    setAuditsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.data.items || []);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setAuditsLoading(false);
    }
  };

  // Generate Digitally Signed Report
  const handleGenerateReport = async (loanId: string, verificationId: string) => {
    try {
      const res = await fetch(`${API_BASE}/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ loanId, verificationId }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Digitally Signed PDF Report generated successfully. Launching download...");
        window.open(data.data.fileUrl, "_blank");
        // Reload details to show newly created report
        fetchLoanDetails(loanId);
      } else {
        alert("Failed to generate report: " + data.message);
      }
    } catch (err) {
      alert("Error calling report generation API");
    }
  };

  // Submit Evidence Action (Beneficiary upload simulation)
  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    setUploading(true);
    setUploadSuccess(false);
    setUploadError("");

    // Create realistic mock file if none was chosen
    let fileToUpload = uploadFile;
    if (!fileToUpload) {
      // Creating a simple mock image
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#1e3a8a";
        ctx.fillRect(0, 0, 400, 300);
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px sans-serif";
        ctx.fillText("LoanLens Mock Verification Evidence", 40, 100);
        ctx.fillText(`Loan Purpose: ${selectedLoan.purpose}`, 40, 140);
        ctx.fillText(`Timestamp: ${new Date().toLocaleString()}`, 40, 180);
      }

      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            fileToUpload = new File([blob], `evidence_${selectedLoan.loanNumber}.png`, {
              type: "image/png",
            });
          }
          resolve();
        }, "image/png");
      });
    }

    if (!fileToUpload) {
      setUploadError("Could not create file evidence");
      setUploading(false);
      return;
    }

    // Set coordinates based on GPS selection
    // Valid baseline: Varanasi (25.3176, 82.9739) or Patiala (30.3398, 76.3869)
    // If beneficiary matches address, it will be close. If fraudulent, we offset the location.
    const baseLat = 25.3176;
    const baseLng = 82.9739;

    let gpsLat = baseLat + (Math.random() - 0.5) * 0.005;
    let gpsLng = baseLng + (Math.random() - 0.5) * 0.005;

    if (uploadGpsType === "fraudulent") {
      // Fraud coordinates (offset by approx 14km away)
      gpsLat = baseLat + 0.125;
      gpsLng = baseLng - 0.098;
    }

    const formData = new FormData();
    formData.append("loanId", selectedLoan.id);
    formData.append("file", fileToUpload);
    formData.append("gpsLat", gpsLat.toString());
    formData.append("gpsLng", gpsLng.toString());
    formData.append("gpsAlt", "250");
    formData.append("gpsAccuracy", "5");
    formData.append(
      "deviceInfo",
      JSON.stringify({
        model: "Apple iPhone 15 Pro",
        os: "iOS 17.2",
        lens: "24mm f/1.78",
      })
    );

    try {
      const res = await fetch(`${API_BASE}/uploads`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setUploadSuccess(true);
        setUploadFile(null);
        // Reload details
        fetchLoanDetails(selectedLoan.id);
      } else {
        setUploadError(data.message || "Failed to upload evidence");
      }
    } catch (err) {
      setUploadError("Network connection failure during upload");
    } finally {
      setUploading(false);
    }
  };

  // Officer Decision Action
  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVerification) return;

    setDecisionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/verifications/${selectedVerification.id}/decision`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: decisionStatus,
          comment: decisionComment,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Verification workflow decision recorded successfully.");
        setSelectedVerificationId(null);
        fetchVerifications();
      } else {
        alert("Failed to complete decision: " + data.message);
      }
    } catch (err) {
      alert("Error submitting decision to API");
    } finally {
      setDecisionLoading(false);
    }
  };

  // Add Officer Comment
  const handleAddComment = async (commentText: string) => {
    if (!selectedVerification || !commentText.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/verifications/${selectedVerification.id}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment: commentText }),
      });

      const data = await res.json();
      if (data.success) {
        // Refresh details
        fetchVerificationDetails(selectedVerification.id);
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  // Render Login Card
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center relative p-6 overflow-hidden bg-[#09090b]">
        {/* Animated backgrounds */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl animate-pulse-slow"></div>

        <div className="w-full max-w-md glass-panel rounded-2xl p-8 shadow-2xl glow-primary relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4 animate-float">
              <span className="text-white font-black text-2xl tracking-tighter">LL</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-heading">LoanLens</h1>
            <p className="text-zinc-400 text-sm mt-1 text-center">
              Autonomous on-site physical asset verification using geospatial correlation.
            </p>
          </div>

          {authError && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-200 rounded-lg p-3 text-sm mb-6">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                placeholder="email@loanlens.ai"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {authLoading ? "Authenticating Session..." : "Secure Login"}
            </button>
          </form>

          {/* Preset Buttons for Demo ease */}
          <div className="mt-8 pt-6 border-t border-zinc-800/80">
            <p className="text-zinc-500 text-xs font-medium text-center mb-3">
              QUICK SIGN IN WITH DEMO PRESETS:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleDemoLogin("ADMIN")}
                className="py-2 px-1 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 rounded-lg text-[10px] text-zinc-300 font-bold transition-all uppercase tracking-wider"
              >
                🛡️ Admin
              </button>
              <button
                onClick={() => handleDemoLogin("LOAN_OFFICER")}
                className="py-2 px-1 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 rounded-lg text-[10px] text-zinc-300 font-bold transition-all uppercase tracking-wider"
              >
                💼 Officer
              </button>
              <button
                onClick={() => handleDemoLogin("BENEFICIARY")}
                className="py-2 px-1 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 rounded-lg text-[10px] text-zinc-300 font-bold transition-all uppercase tracking-wider"
              >
                🌾 Borrower
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Helper to color code risk level badges
  const getRiskColor = (level?: string) => {
    switch (level) {
      case "CRITICAL":
        return "bg-red-500/10 border-red-500/30 text-red-400";
      case "HIGH":
        return "bg-orange-500/10 border-orange-500/30 text-orange-400";
      case "MEDIUM":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      default:
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "VERIFIED":
      case "APPROVED":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "REJECTED":
        return "bg-red-500/10 border-red-500/30 text-red-400";
      case "PENDING":
        return "bg-zinc-500/10 border-zinc-800 text-zinc-400";
      case "PROCESSING":
        return "bg-blue-500/10 border-blue-500/30 text-blue-400";
      case "MORE_EVIDENCE_REQUIRED":
        return "bg-purple-500/10 border-purple-500/30 text-purple-400";
      default:
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 border-r border-[var(--border)] glass-panel p-6 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white font-black text-lg">L</span>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight font-heading">LoanLens</h2>
              <span className="text-[10px] font-bold text-blue-500 tracking-widest uppercase">Geospatial AI</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {(currentUser?.role === "ADMIN" || currentUser?.role === "LOAN_OFFICER") && (
              <button
                onClick={() => {
                  setActiveTab("dashboard");
                  setSelectedLoanId(null);
                  setSelectedVerificationId(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === "dashboard"
                    ? "bg-blue-600/10 text-blue-500 border border-blue-500/20"
                    : "text-zinc-400 hover:bg-zinc-800/30 hover:text-white"
                }`}
              >
                📊 Dashboard
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab("loans");
                setSelectedLoanId(null);
                setSelectedVerificationId(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "loans"
                  ? "bg-blue-600/10 text-blue-500 border border-blue-500/20"
                  : "text-zinc-400 hover:bg-zinc-800/30 hover:text-white"
              }`}
            >
              📄 My Loans
            </button>

            {(currentUser?.role === "ADMIN" || currentUser?.role === "LOAN_OFFICER") && (
              <button
                onClick={() => {
                  setActiveTab("verifications");
                  setSelectedLoanId(null);
                  setSelectedVerificationId(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === "verifications"
                    ? "bg-blue-600/10 text-blue-500 border border-blue-500/20"
                    : "text-zinc-400 hover:bg-zinc-800/30 hover:text-white"
                }`}
              >
                🔎 Verification Queue
              </button>
            )}

            {currentUser?.role === "ADMIN" && (
              <button
                onClick={() => {
                  setActiveTab("audits");
                  setSelectedLoanId(null);
                  setSelectedVerificationId(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === "audits"
                    ? "bg-blue-600/10 text-blue-500 border border-blue-500/20"
                    : "text-zinc-400 hover:bg-zinc-800/30 hover:text-white"
                }`}
              >
                🛡️ Audit Logs
              </button>
            )}
          </nav>
        </div>

        {/* User Info / Logout */}
        <div className="pt-6 border-t border-[var(--border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 text-sm font-bold text-blue-500">
              {currentUser?.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold truncate max-w-[140px]">{currentUser?.name}</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">{currentUser?.role}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={toggleTheme}
              className="p-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800/50 rounded-xl transition-all"
              title="Toggle Theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 py-2 px-3 bg-red-950/20 border border-red-500/20 hover:bg-red-950/40 text-red-400 font-medium rounded-xl text-xs transition-all text-center"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-8 relative">
        {/* Dynamic header / Title */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight font-heading capitalize">
              {activeTab} Panel
            </h1>
            <p className="text-zinc-500 text-sm">
              Real-time synchronization with LoanLens Core Geospatial APIs.
            </p>
          </div>

          {/* Quick Stats strip */}
          <div className="flex items-center gap-3 bg-zinc-900/35 border border-zinc-800/80 px-4 py-2 rounded-xl text-xs text-zinc-400">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Connected to <b>Varanasi nodes</b>
          </div>
        </header>

        {/* TAB PANELS */}

        {/* 1. Dashboard View */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {statsLoading && <div className="text-zinc-400 text-sm py-4">Syncing dashboard variables...</div>}

            {stats && (
              <>
                {/* Highlights Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
                    <div className="absolute -right-3 -bottom-3 text-7xl opacity-[0.03]">📄</div>
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Total Loans</span>
                    <h3 className="text-2xl font-black mt-2">{stats.totalLoans}</h3>
                  </div>

                  <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-yellow-500/30 transition-all">
                    <div className="absolute -right-3 -bottom-3 text-7xl opacity-[0.03]">⏱️</div>
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Pending Audit</span>
                    <h3 className="text-2xl font-black mt-2 text-yellow-500">{stats.pendingVerifications}</h3>
                  </div>

                  <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                    <div className="absolute -right-3 -bottom-3 text-7xl opacity-[0.03]">✅</div>
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Verified Sites</span>
                    <h3 className="text-2xl font-black mt-2 text-emerald-500">{stats.verifiedLoans}</h3>
                  </div>

                  <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-red-500/30 transition-all">
                    <div className="absolute -right-3 -bottom-3 text-7xl opacity-[0.03]">❌</div>
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Rejected Loans</span>
                    <h3 className="text-2xl font-black mt-2 text-red-500">{stats.rejectedLoans}</h3>
                  </div>

                  <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-purple-500/30 transition-all">
                    <div className="absolute -right-3 -bottom-3 text-7xl opacity-[0.03]">⚠️</div>
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Fraud Flags</span>
                    <h3 className="text-2xl font-black mt-2 text-purple-500">{stats.fraudCasesCount}</h3>
                  </div>
                </div>

                {/* Graphs Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Fraud Trend Line Chart */}
                  <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-bold font-heading mb-4">Fraud Cases & Risk Timeline</h3>
                    <div className="h-64 flex items-end justify-between gap-2 pt-4 relative">
                      {fraudTrends.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">
                          No trend entries resolved
                        </div>
                      ) : (
                        fraudTrends.map((trend, i) => {
                          const maxCount = Math.max(...fraudTrends.map((t) => t.count), 1);
                          const heightPercent = (trend.count / maxCount) * 80 + 10;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center group relative">
                              {/* Hover Card */}
                              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 rounded-lg p-2 z-20 whitespace-nowrap shadow-xl">
                                <div>Date: <b>{trend.date}</b></div>
                                <div>Cases: <b>{trend.count}</b></div>
                                <div>Avg Risk: <b>{trend.avgRiskScore}/100</b></div>
                              </div>
                              <div className="w-full bg-gradient-to-t from-blue-600 to-indigo-600 rounded-t-lg transition-all hover:scale-x-105" style={{ height: `${heightPercent}%` }}></div>
                              <span className="text-[10px] text-zinc-500 mt-2 truncate w-full text-center">
                                {trend.date.substring(5)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Donut Risk Distribution */}
                  <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold font-heading mb-4">AI Risk Categorization</h3>
                      <div className="relative flex items-center justify-center py-6">
                        {/* Dynamic SVG Donut Chart */}
                        <svg className="w-36 h-36" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
                          {/* Low Risk */}
                          <circle
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="3.5"
                            strokeDasharray={`${stats.riskDistribution.LOW || 50} ${100 - (stats.riskDistribution.LOW || 50)}`}
                            strokeDashoffset="25"
                          />
                          {/* Medium */}
                          <circle
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="3.5"
                            strokeDasharray={`${stats.riskDistribution.MEDIUM || 20} ${100 - (stats.riskDistribution.MEDIUM || 20)}`}
                            strokeDashoffset={25 - (stats.riskDistribution.LOW || 50)}
                          />
                          {/* High */}
                          <circle
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="3.5"
                            strokeDasharray={`${stats.riskDistribution.HIGH || 20} ${100 - (stats.riskDistribution.HIGH || 20)}`}
                            strokeDashoffset={25 - (stats.riskDistribution.LOW || 50) - (stats.riskDistribution.MEDIUM || 20)}
                          />
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-2xl font-black">{stats.aiAccuracy}%</span>
                          <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wider">AI Accuracy</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase block">Low</span>
                        <b className="text-sm">{stats.riskDistribution.LOW || 0}</b>
                      </div>
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-2">
                        <span className="text-[10px] text-amber-400 font-bold uppercase block">Medium</span>
                        <b className="text-sm">{stats.riskDistribution.MEDIUM || 0}</b>
                      </div>
                      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-2">
                        <span className="text-[10px] text-red-400 font-bold uppercase block">High</span>
                        <b className="text-sm">{(stats.riskDistribution.HIGH || 0) + (stats.riskDistribution.CRITICAL || 0)}</b>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subsections Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Region volume */}
                  <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-bold font-heading mb-4">Regional Distribution Vol.</h3>
                    <div className="space-y-4">
                      {regionalDist.length === 0 ? (
                        <div className="text-zinc-500 text-sm py-4">No regional metrics registered</div>
                      ) : (
                        regionalDist.map((item, index) => {
                          const maxAmount = Math.max(...regionalDist.map((r) => r.amount), 1);
                          const pct = (item.amount / maxAmount) * 100;
                          return (
                            <div key={index} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-zinc-300">{item.state}</span>
                                <span className="text-zinc-400">
                                  {item.count} loans • <b>₹{item.amount.toLocaleString("en-IN")}</b>
                                </span>
                              </div>
                              <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Officer Leaderboard */}
                  <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-bold font-heading mb-4">Field Agent Queue Status</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-zinc-400">
                        <thead>
                          <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-widest text-[9px] font-bold">
                            <th className="pb-3">Agent</th>
                            <th className="pb-3">Assigned</th>
                            <th className="pb-3 text-right">Approval Rate</th>
                            <th className="pb-3 text-right">Avg Action Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {officerPerformance.map((off, index) => (
                            <tr key={index} className="hover:bg-zinc-850/30">
                              <td className="py-3 font-semibold text-white">{off.name}</td>
                              <td className="py-3">{off.assignedLoans} cases</td>
                              <td className="py-3 text-right font-bold text-emerald-400">{off.approvalRate}%</td>
                              <td className="py-3 text-right">{off.avgDecisionTimeHrs} hrs</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 2. My Loans List */}
        {activeTab === "loans" && !selectedLoanId && (
          <div className="glass-panel rounded-2xl overflow-hidden">
            {loansLoading && <div className="p-6 text-zinc-400 text-sm">Syncing loan registry...</div>}

            {!loansLoading && loans.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                No active loans registered in this workspace role.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-500 uppercase tracking-widest text-[9px] font-bold">
                      <th className="px-6 py-4">Loan ID</th>
                      <th className="px-6 py-4">Borrower</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Purpose</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {loans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-zinc-900/35 transition-colors">
                        <td className="px-6 py-4 font-bold text-white tracking-wider">
                          {loan.loanNumber}
                        </td>
                        <td className="px-6 py-4 font-semibold text-zinc-300">
                          {loan.borrower?.name}
                        </td>
                        <td className="px-6 py-4 uppercase text-zinc-400 font-medium">
                          {loan.loanType}
                        </td>
                        <td className="px-6 py-4 text-zinc-400 max-w-[200px] truncate">
                          {loan.purpose}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-white">
                          ₹{loan.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 border text-[10px] font-extrabold uppercase rounded-full tracking-wider ${getStatusColor(loan.status)}`}>
                            {loan.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedLoanId(loan.id)}
                            className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 hover:border-transparent rounded-lg font-bold transition-all text-[11px]"
                          >
                            Inspect Cases
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 2.1 Loan Inspection / Detail View */}
        {activeTab === "loans" && selectedLoanId && (
          <div className="space-y-6">
            {/* Back header */}
            <button
              onClick={() => setSelectedLoanId(null)}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-all mb-4"
            >
              ⬅️ Back to Loan Registry
            </button>

            {loanDetailsLoading && <div className="text-zinc-400 text-sm">Syncing record variables...</div>}

            {selectedLoan && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Details Card */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Main Details block */}
                  <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-blue-600/10 to-transparent pointer-events-none"></div>

                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block">
                          CASE NUMBER
                        </span>
                        <h2 className="text-2xl font-black font-heading mt-1">{selectedLoan.loanNumber}</h2>
                      </div>
                      <span className={`px-3 py-1 border text-xs font-black uppercase rounded-full ${getStatusColor(selectedLoan.status)}`}>
                        {selectedLoan.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
                      <div>
                        <span className="text-zinc-500 block mb-1">Borrower</span>
                        <b className="text-white">{selectedLoan.borrower?.name}</b>
                        <span className="text-zinc-400 block mt-0.5">{selectedLoan.borrower?.phone}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-1">Amount Sanctioned</span>
                        <b className="text-lg font-black text-white">₹{selectedLoan.amount.toLocaleString("en-IN")}</b>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-1">Loan Type</span>
                        <b className="text-white uppercase">{selectedLoan.loanType}</b>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-1">Assigned Officer</span>
                        <b className="text-white">{selectedLoan.officer?.name || "Unassigned"}</b>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-zinc-800/80">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-2">
                        SANCTIONED UTILIZATION PURPOSE
                      </span>
                      <p className="text-sm text-zinc-300 font-medium leading-relaxed">
                        {selectedLoan.purpose}
                      </p>
                    </div>

                    {selectedLoan.notes && (
                      <div className="mt-4 p-3 bg-zinc-950/40 rounded-xl border border-zinc-900/60 text-xs text-zinc-400 italic">
                        {selectedLoan.notes}
                      </div>
                    )}
                  </div>

                  {/* Upload Timeline section */}
                  <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-bold font-heading mb-6">Physical Verification Timeline</h3>
                    <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-800">
                      {loanTimeline.map((evt, idx) => (
                        <div key={idx} className="flex gap-4 items-start relative pl-8">
                          {/* Dot marker */}
                          <div className={`absolute left-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs bg-zinc-950 z-10 ${
                            evt.type === 'LOAN_CREATED' ? 'border-blue-500 text-blue-400' :
                            evt.type === 'EVIDENCE_UPLOADED' ? 'border-amber-500 text-amber-400' :
                            evt.type === 'AI_PROCESSED' ? 'border-purple-500 text-purple-400' :
                            'border-emerald-500 text-emerald-400'
                          }`}>
                            {evt.type === 'LOAN_CREATED' ? '📄' :
                             evt.type === 'EVIDENCE_UPLOADED' ? '📷' :
                             evt.type === 'AI_PROCESSED' ? '🤖' : '⚙️'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-zinc-200">{evt.title}</h4>
                              <span className="text-[10px] text-zinc-500">
                                {new Date(evt.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">{evt.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Evidence Submission Area (For borrower role) */}
                <div className="space-y-6">
                  {currentUser?.role === "BENEFICIARY" && (
                    <div className="glass-panel p-6 rounded-2xl">
                      <h3 className="text-lg font-bold font-heading mb-4">Submit On-Site Verification Evidence</h3>

                      {uploadSuccess && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-3 text-xs mb-4">
                          ✅ Verification evidence received. AI Analysis process initiated!
                        </div>
                      )}

                      {uploadError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-xs mb-4">
                          ❌ {uploadError}
                        </div>
                      )}

                      <form onSubmit={handleUploadEvidence} className="space-y-4">
                        {/* Custom Mock Drag/Drop file input */}
                        <div className="border border-dashed border-zinc-800 hover:border-blue-500/50 rounded-xl p-6 text-center cursor-pointer transition-all bg-zinc-950/20">
                          <input
                            type="file"
                            id="evidence-file"
                            accept="image/*,video/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setUploadFile(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                          <label htmlFor="evidence-file" className="cursor-pointer">
                            <span className="text-2xl block mb-2">📷</span>
                            <span className="text-xs text-zinc-400 block font-semibold">
                              {uploadFile ? uploadFile.name : "Capture / Select Photo Proof"}
                            </span>
                            <span className="text-[10px] text-zinc-500 block mt-1">
                              Supports raw JPEG with EXIF geospatial headers.
                            </span>
                          </label>
                        </div>

                        {/* Location Simulation Toggle (The Smart part for mock tests) */}
                        <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-3">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                            Simulate GPS Location Coordinates:
                          </label>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setUploadGpsType("valid")}
                              className={`py-2 px-1 rounded-lg border font-bold transition-all ${
                                uploadGpsType === "valid"
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-400"
                              }`}
                            >
                              📍 Matching Site (Varanasi)
                            </button>
                            <button
                              type="button"
                              onClick={() => setUploadGpsType("fraudulent")}
                              className={`py-2 px-1 rounded-lg border font-bold transition-all ${
                                uploadGpsType === "fraudulent"
                                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-400"
                              }`}
                            >
                              🚩 Fraud Site (15km Away)
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={uploading}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                        >
                          {uploading ? "Transmitting GPS Packets..." : "Upload Site Evidence"}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Digitally Signed PDF Reports list */}
                  <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-bold font-heading mb-4">Verification Reports</h3>
                    {selectedLoan.uploads?.some((u) => u.verification?.status === "APPROVED") && (
                      <button
                        onClick={() => {
                          const validUpload = selectedLoan.uploads?.find((u) => u.verification?.status === "APPROVED");
                          if (validUpload && validUpload.verification) {
                            handleGenerateReport(selectedLoan.id, validUpload.verification.id);
                          }
                        }}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mb-4"
                      >
                        <span>📄</span> Compile signed PDF Report
                      </button>
                    )}

                    {selectedLoan.reports && selectedLoan.reports.length > 0 ? (
                      <div className="space-y-2">
                        {selectedLoan.reports.map((rep: any) => (
                          <a
                            key={rep.id}
                            href={rep.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-3 bg-zinc-950/40 border border-zinc-900 hover:border-zinc-800 rounded-xl text-xs transition-all group"
                          >
                            <div>
                              <b className="text-zinc-200 block truncate max-w-[150px]">{rep.fileName}</b>
                              <span className="text-[10px] text-zinc-500">
                                Generated: {new Date(rep.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <span className="text-blue-500 text-xs font-extrabold group-hover:underline">Open 🔗</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 italic text-center py-4">
                        Reports compile automatically upon field officer verification approval.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Verification Queue */}
        {activeTab === "verifications" && !selectedVerificationId && (
          <div className="glass-panel rounded-2xl overflow-hidden">
            {verificationsLoading && <div className="p-6 text-zinc-400 text-sm">Syncing queue...</div>}

            {!verificationsLoading && verifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                No cases pending verification.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-500 uppercase tracking-widest text-[9px] font-bold">
                      <th className="px-6 py-4">Case #</th>
                      <th className="px-6 py-4">evidence filename</th>
                      <th className="px-6 py-4">GPS location validation</th>
                      <th className="px-6 py-4">ai risk rating</th>
                      <th className="px-6 py-4">Submission timestamp</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {verifications.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-900/35 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">
                          {item.loan?.loanNumber}
                        </td>
                        <td className="px-6 py-4 text-zinc-300 font-semibold max-w-[150px] truncate">
                          {item.upload?.fileName}
                        </td>
                        <td className="px-6 py-4">
                          {item.upload?.location?.matchesBorrowerAddress ? (
                            <span className="text-emerald-400 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Matching site
                            </span>
                          ) : (
                            <span className="text-red-400 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span> GPS Mismatch (
                              {item.upload?.location?.distanceKm}km away)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 border text-[9px] font-extrabold uppercase rounded-full ${getRiskColor(item.aiResult?.riskLevel)}`}>
                            {item.aiResult?.riskLevel || "Calculating"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedVerificationId(item.id)}
                            className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 hover:border-transparent rounded-lg font-bold transition-all text-[11px]"
                          >
                            Resolve audit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3.1 Verification Detail View */}
        {activeTab === "verifications" && selectedVerificationId && (
          <div className="space-y-6">
            <button
              onClick={() => setSelectedVerificationId(null)}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-all mb-4"
            >
              ⬅️ Back to Verification Queue
            </button>

            {verificationDetailsLoading && <div className="text-zinc-400 text-sm">Syncing audit details...</div>}

            {selectedVerification && selectedVerification.upload && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left col: Image + Metadata */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Photo panel */}
                  <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">
                      Captured Site Evidence Proof
                    </h3>
                    <div className="aspect-video w-full bg-zinc-950 rounded-xl overflow-hidden relative border border-zinc-900">
                      {selectedVerification.upload.fileType === "IMAGE" ? (
                        <img
                          src={selectedVerification.upload.fileUrl}
                          alt="Evidence Proof"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={selectedVerification.upload.fileUrl}
                          controls
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* AI Bounding box overlays */}
                      {selectedVerification.aiResult?.detectedObjects &&
                        JSON.parse(selectedVerification.aiResult.detectedObjects).map((obj: any, idx: number) => (
                          <div
                            key={idx}
                            className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 flex items-center justify-center"
                            style={{
                              left: `${obj.boundingBox.x * 100}%`,
                              top: `${obj.boundingBox.y * 100}%`,
                              width: `${obj.boundingBox.w * 100}%`,
                              height: `${obj.boundingBox.h * 100}%`,
                            }}
                          >
                            <span className="bg-blue-600 text-white font-extrabold text-[8px] px-1 py-0.5 rounded absolute top-0 left-0">
                              {obj.label} ({(obj.confidence * 100).toFixed(0)}%)
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Dynamic comparison map */}
                  <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex justify-between items-center">
                      <span>Spatial Discrepancy Map Analysis</span>
                      <span className="text-[10px] text-zinc-500 uppercase">OSM Georeference</span>
                    </h3>
                    <div ref={mapContainerRef} className="h-80 w-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-900 relative z-0"></div>
                  </div>
                </div>

                {/* Right col: EXIF, AI, Action */}
                <div className="space-y-6">
                  {/* AI Risk Report */}
                  <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                    {/* Glow background */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-xl"></div>

                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">
                      AI Agent Risk Assessment
                    </h3>

                    {selectedVerification.aiResult && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-400">Risk rating:</span>
                          <span className={`px-2.5 py-1 border text-[10px] font-black uppercase rounded-full ${getRiskColor(selectedVerification.aiResult.riskLevel)}`}>
                            {selectedVerification.aiResult.riskLevel}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-400">Security risk score:</span>
                          <span className="text-lg font-black text-white">
                            {selectedVerification.aiResult.riskScore} <span className="text-xs text-zinc-500">/ 100</span>
                          </span>
                        </div>

                        <div className="pt-3 border-t border-zinc-800/80">
                          <span className="text-[10px] text-zinc-500 font-bold block mb-1">DECISION LOGIC EXPLANATION</span>
                          <p className="text-xs text-zinc-300 leading-relaxed">
                            {selectedVerification.aiResult.explanation}
                          </p>
                        </div>

                        {/* Fraud flags lists */}
                        {selectedVerification.aiResult.fraudFlags &&
                          JSON.parse(selectedVerification.aiResult.fraudFlags).length > 0 && (
                            <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                              <span className="text-[10px] text-red-400 font-bold block">FRAUD FLAGS RAZED</span>
                              {JSON.parse(selectedVerification.aiResult.fraudFlags).map((flag: any, index: number) => (
                                <div key={index} className="bg-red-500/5 border border-red-500/10 rounded-lg p-2 text-[10px] text-red-200">
                                  <b>[{flag.type}]</b> {flag.description}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    )}
                  </div>

                  {/* EXIF metadata */}
                  <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">
                      EXIF Geotag Metadata
                    </h3>
                    <div className="space-y-3 text-[10px] text-zinc-300">
                      <div className="flex justify-between py-1 border-b border-zinc-900">
                        <span className="text-zinc-500 uppercase font-bold">Latitude</span>
                        <span className="font-mono">{selectedVerification.upload.gpsLat?.toFixed(6) || "N/A"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-900">
                        <span className="text-zinc-500 uppercase font-bold">Longitude</span>
                        <span className="font-mono">{selectedVerification.upload.gpsLng?.toFixed(6) || "N/A"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-900">
                        <span className="text-zinc-500 uppercase font-bold">Altitude</span>
                        <span>{selectedVerification.upload.gpsAlt || "250"} meters</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-900">
                        <span className="text-zinc-500 uppercase font-bold">Accuracy</span>
                        <span>± {selectedVerification.upload.gpsAccuracy || "5"}m (GPS Link)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-900">
                        <span className="text-zinc-500 uppercase font-bold">Hardware</span>
                        <span className="truncate max-w-[160px]">Apple iPhone 15 Pro</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Pane */}
                  <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">
                      Resolution Decision Action
                    </h3>

                    <form onSubmit={handleDecisionSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                          Decision Status
                        </label>
                        <select
                          value={decisionStatus}
                          onChange={(e) => setDecisionStatus(e.target.value as any)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                        >
                          <option value="APPROVED">Approve (Disburse/Verify)</option>
                          <option value="REJECTED">Reject / Fraud Flag</option>
                          <option value="MORE_EVIDENCE_REQUIRED">More Evidence Required</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                          Audit Comment / Feedback
                        </label>
                        <textarea
                          rows={3}
                          value={decisionComment}
                          onChange={(e) => setDecisionComment(e.target.value)}
                          required
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white outline-none"
                          placeholder="Provide details for this audit verification decision..."
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={decisionLoading}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                      >
                        {decisionLoading ? "Recording decision..." : "Commit Decision"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. System Audit Logs */}
        {activeTab === "audits" && currentUser?.role === "ADMIN" && (
          <div className="space-y-6">
            {/* Export and filter header */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-zinc-500 text-xs">Monitored transactions: <b>{auditLogs.length} entries</b></span>
              <a
                href={`${API_BASE}/audit-logs/export`}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 rounded-xl text-xs font-bold text-zinc-300 transition-all flex items-center gap-2"
                download
              >
                <span>📥</span> Export CSV Logs
              </a>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden">
              {auditsLoading && <div className="p-6 text-zinc-400 text-sm">Syncing audit logs...</div>}

              {!auditsLoading && auditLogs.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  No system logs recorded.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-500 uppercase tracking-widest text-[9px] font-bold">
                        <th className="px-6 py-4">Timestamp</th>
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Action</th>
                        <th className="px-6 py-4">Entity Type</th>
                        <th className="px-6 py-4">IP Address</th>
                        <th className="px-6 py-4">Metadata Payload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-zinc-900/35 transition-colors">
                          <td className="px-6 py-4 text-zinc-400 font-mono">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-zinc-200">{log.user?.name || "System"}</span>
                            <span className="block text-[10px] text-zinc-500">{log.user?.email || "Guest"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-bold text-zinc-300">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 uppercase text-zinc-400 font-medium">
                            {log.entityType || "N/A"}
                          </td>
                          <td className="px-6 py-4 text-zinc-500 font-mono">
                            {log.ipAddress || "::1"}
                          </td>
                          <td className="px-6 py-4 text-zinc-500 max-w-[200px] truncate font-mono">
                            {log.metadata || "{}"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
