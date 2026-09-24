import React, { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useParams } from "react-router-dom";
import {
  Mail,
  Phone,
  BookOpen,
  Wallet,
  GraduationCap,
  ExternalLink,
  Package,
  User,
  Award,
  ChevronDown,
  ChevronUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  Star,
  FileText,
  Eye,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Pencil,
  Save,
} from "lucide-react";
import api from "@/api/api";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import {
  exportLessonProgressReport,
  exportExamReport,
} from "../../../../utils/Reportexport";

const StudentInformation = () => {
  const [processing, setProcessing] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [walletOverride, setWalletOverride] = useState(null);
  const { id } = useParams();

  const { data: response, loading, error } = useGet(`/api/admin/student/${id}`);
  const { data: quizResponse } = useGet(`/api/admin/reports/${id}/quizzes`);
  const { data: examResponse } = useGet(`/api/admin/reports/${id}/exams`);

  const student = response?.data?.data;
  const quizzes = quizResponse?.data?.data || [];
  const exams = examResponse?.data?.data || [];

  const walletBalance =
    walletOverride !== null ? walletOverride : student?.wallet?.balance || 0;

  const handleTopUpSuccess = (newBalance) => {
    setWalletOverride(newBalance);
  };

  const handleOpenAccount = async () => {
    const dashboardTab = window.open("", "studentDashboardTab");
    try {
      setProcessing(true);
      const res = await api.post(`/api/admin/auth/impersonate/${id}`);
      const { token, isImpersonated } = res?.data?.data;
      const dashboardUrl = `https://student.mathshouse.net/?token=${encodeURIComponent(token)}&isImpersonated=${isImpersonated}`;
      if (dashboardTab) dashboardTab.location.href = dashboardUrl;
      else window.open(dashboardUrl, "studentDashboardTab");
      toast.success("Account opened successfully");
    } catch (err) {
      if (dashboardTab) dashboardTab.close();
      toast.error("Failed to open account");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <Errorpage error={error} />;
  if (!student)
    return (
      <div className="p-8 text-center text-gray-500">
        No student data found.
      </div>
    );

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Student Profile
          </h1>
          <p className="text-gray-500">
            Review student academic details and subscriptions
          </p>
        </div>
        <button
          onClick={handleOpenAccount}
          className="flex items-center gap-2 bg-[#7D0A0A] hover:bg-[#5C0707] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg"
        >
          {processing ? "Processing..." : "Open Student Dashboard"}
          <ExternalLink size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info Card */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 bg-[#F0D2D2] rounded-2xl flex items-center justify-center text-[#7D0A0A] text-4xl font-bold">
              {(student?.firstname?.[0] || "") + (student?.lastname?.[0] || "")}
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {student?.firstname} {student?.lastname}
              </h2>
              <span className="bg-[#FBEAEA] text-[#7D0A0A] px-3 py-1 rounded-full text-sm font-medium">
                @{student?.nickname}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoBox
              icon={<Mail size={20} />}
              label="Email Address"
              value={student?.email}
            />
            <InfoBox
              icon={<Phone size={20} />}
              label="Phone Number"
              value={student?.phone}
            />
            <InfoBox
              icon={<Phone size={20} />}
              label="Parent Phone"
              value={student?.parentphone}
            />
            <InfoBox
              icon={<GraduationCap size={20} />}
              label="Grade"
              value={student?.grade?.nameAr}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#7D0A0A] to-[#4A0505] p-6 rounded-3xl text-white shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="opacity-80">Wallet Balance</p>
                <h3 className="text-4xl font-bold mt-2">{walletBalance} EGP</h3>
              </div>
              <button
                onClick={() => setIsTopUpOpen(true)}
                className="flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors shrink-0"
              >
                <Plus size={14} /> Top Up
              </button>
            </div>
          </div>

          {/* Quick counts */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">At a Glance</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-[#FBEAEA] rounded-2xl text-center">
                <BookOpen size={20} className="text-[#7D0A0A] mx-auto mb-1" />
                <p className="text-2xl font-extrabold text-[#7D0A0A]">
                  {student?.courses?.length || 0}
                </p>
                <p className="text-xs font-semibold text-[#7D0A0A]/70">
                  Courses
                </p>
              </div>
              <div className="p-4 bg-[#F7E2E2] rounded-2xl text-center">
                <Package size={20} className="text-[#9C2B2B] mx-auto mb-1" />
                <p className="text-2xl font-extrabold text-[#9C2B2B]">
                  {student?.packages?.length || 0}
                </p>
                <p className="text-xs font-semibold text-[#9C2B2B]/70">
                  Packages
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Courses, Packages, Quiz & Exam Reports */}
      <div className="mt-6 space-y-6">
        <CoursesSection courses={student?.courses || []} />
        <PackagesSection packages={student?.packages || []} />
        <QuizReportsSection
          quizzes={quizzes}
          studentId={id}
          studentName={`${student?.firstname} ${student?.lastname}`}
          grade={student?.grade?.nameAr}
          courses={student?.courses || []}
        />
        <ExamReportsSection
          exams={exams}
          studentId={id}
          studentName={`${student?.firstname} ${student?.lastname}`}
          grade={student?.grade?.nameAr}
        />
        <SessionRatingsSection studentId={id} />
        <ExtraHomeworkSection studentId={id} />
      </div>

      {isTopUpOpen && (
        <TopUpWalletModal
          studentId={id}
          currentBalance={walletBalance}
          onClose={() => setIsTopUpOpen(false)}
          onSuccess={handleTopUpSuccess}
        />
      )}
    </div>
  );
};

const TopUpWalletModal = ({
  studentId,
  currentBalance,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [operation, setOperation] = useState("deposit");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const numericAmount = Number(amount);
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg("Please enter a valid amount greater than 0.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post(
        `/api/admin/student/${studentId}/top-up-wallet`,
        {
          amount: numericAmount,
          operation,
          description: description.trim() || undefined,
        },
      );

      const returnedBalance = res?.data?.data?.balance;
      const nextBalance =
        typeof returnedBalance === "number"
          ? returnedBalance
          : operation === "deposit"
            ? currentBalance + numericAmount
            : currentBalance - numericAmount;

      toast.success("Wallet topped up successfully");
      onSuccess(nextBalance);
      onClose();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Failed to top up wallet. Please try again.";
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Top Up Wallet</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Operation
            </label>

            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8B4B4]"
            >
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Amount (EGP)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 100"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8B4B4]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly subscription"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8B4B4]"
            />
          </div>

          {errorMsg && (
            <p className="text-sm text-red-500 font-medium">{errorMsg}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-[#7D0A0A] hover:bg-[#5C0707] text-white font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Processing..." : "Confirm Top-Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ITEMS_PAGE_SIZE = 9;

const CoursesSection = ({ courses }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return courses;
    const term = searchTerm.toLowerCase();
    return courses.filter(
      (course) =>
        course.name?.toLowerCase().includes(term) ||
        course.subject?.toLowerCase().includes(term) ||
        course.teacher?.toLowerCase().includes(term),
    );
  }, [courses, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCourses.length / ITEMS_PAGE_SIZE),
  );
  const paginatedCourses = filteredCourses.slice(
    (currentPage - 1) * ITEMS_PAGE_SIZE,
    currentPage * ITEMS_PAGE_SIZE,
  );

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <BookOpen size={20} className="text-[#7D0A0A]" /> Enrolled Courses
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {filteredCourses.length}
          </span>
        </h3>
        {courses.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search courses..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8B4B4]"
            />
          </div>
        )}
      </div>

      {paginatedCourses.length === 0 && (
        <p className="text-sm text-gray-400 py-6 text-center">
          {courses.length === 0
            ? "No courses enrolled yet."
            : "No courses match your search."}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {paginatedCourses.map((course) => (
          <div
            key={course.id}
            className="p-4 border border-gray-100 rounded-2xl hover:border-[#E8B4B4] hover:shadow-sm transition-all bg-gray-50/50"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FBEAEA] text-[#7D0A0A] flex items-center justify-center shrink-0">
                <BookOpen size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-gray-800 truncate">
                  {course.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {course.subject || course.teacher || course.grade || "—"}
                </p>
              </div>
              {course.status && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold shrink-0 ${
                    course.status === "active"
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {course.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const PackagesSection = ({ packages }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPackages = useMemo(() => {
    if (!searchTerm.trim()) return packages;
    const term = searchTerm.toLowerCase();
    return packages.filter((pkg) => pkg.name?.toLowerCase().includes(term));
  }, [packages, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPackages.length / ITEMS_PAGE_SIZE),
  );
  const paginatedPackages = filteredPackages.slice(
    (currentPage - 1) * ITEMS_PAGE_SIZE,
    currentPage * ITEMS_PAGE_SIZE,
  );

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Package size={20} className="text-[#9C2B2B]" /> Active Packages
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {filteredPackages.length}
          </span>
        </h3>
        {packages.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search packages..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8B4B4]"
            />
          </div>
        )}
      </div>

      {paginatedPackages.length === 0 && (
        <p className="text-sm text-gray-400 py-6 text-center">
          {packages.length === 0
            ? "No active packages."
            : "No packages match your search."}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {paginatedPackages.map((pkg) => (
          <div
            key={pkg.id}
            className="p-4 border border-gray-100 rounded-2xl hover:border-[#E8B4B4] hover:shadow-sm transition-all bg-gray-50/50"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F7E2E2] text-[#9C2B2B] flex items-center justify-center shrink-0">
                <Package size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-gray-800 truncate">
                  {pkg.name}
                </p>
                {pkg.expiresAt && (
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(pkg.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <span className="text-xs font-bold bg-white border border-[#F0D2D2] text-[#9C2B2B] px-2 py-1 rounded-lg shrink-0">
                {pkg.price} EGP
              </span>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const QUIZ_PAGE_SIZE = 8;

const QuizReportsSection = ({
  quizzes,
  studentId,
  studentName,
  grade,
  courses,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedQuizId, setExpandedQuizId] = useState(null);
  const [extendLessonTarget, setExtendLessonTarget] = useState(null);
  const [exporting, setExporting] = useState(false);

  // New States for "Generate Mistakes" Feature
  const [selectedQuizzes, setSelectedQuizzes] = useState(new Set());

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportLessonProgressReport({
        studentName,
        grade,
        courseId: courses?.[0]?.id,
        quizzes,
      });
    } catch (err) {
      toast.error(err.message || "Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateMistakes = (type) => {
    // You can replace this with your actual API call to generate the PDFs
    const selectedIds = Array.from(selectedQuizzes);
    console.log(`Generating ${type} mistakes PDF for quizzes:`, selectedIds);
    toast.success(
      `${type === "empty" ? "Empty" : "Answers"} Mistakes PDF generated and sent to Teacher Dashboard!`,
    );
  };

  const toggleQuizSelection = (quizId, e) => {
    e.stopPropagation();
    const newSet = new Set(selectedQuizzes);
    if (newSet.has(quizId)) {
      newSet.delete(quizId);
    } else {
      newSet.add(quizId);
    }
    setSelectedQuizzes(newSet);
  };

  const filteredQuizzes = useMemo(() => {
    if (!searchTerm.trim()) return quizzes;
    const term = searchTerm.toLowerCase();
    return quizzes.filter(
      (quiz) =>
        quiz.quizName?.toLowerCase().includes(term) ||
        quiz.lesson?.name?.toLowerCase().includes(term),
    );
  }, [quizzes, searchTerm]);

  const selectedMistakesCount = useMemo(() => {
    return quizzes
      .filter((q) => selectedQuizzes.has(q.quizId))
      .reduce((sum, q) => sum + (q.mistakes?.length || 0), 0);
  }, [quizzes, selectedQuizzes]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredQuizzes.length / QUIZ_PAGE_SIZE),
  );
  const paginatedQuizzes = filteredQuizzes.slice(
    (currentPage - 1) * QUIZ_PAGE_SIZE,
    currentPage * QUIZ_PAGE_SIZE,
  );

  const toggleExpand = (quizId) => {
    setExpandedQuizId((prev) => (prev === quizId ? null : quizId));
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <BookOpen size={20} className="text-orange-600" /> Quiz Reports
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {filteredQuizzes.length}
          </span>
        </h3>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {selectedQuizzes.size > 0 && (
            <div className="flex items-center gap-2 bg-[#FBEAEA] px-3 py-1.5 rounded-xl">
              <span className="text-sm font-bold text-[#7D0A0A]">
                Mistakes Count: {selectedMistakesCount}
              </span>
              <button
                onClick={() => handleGenerateMistakes("empty")}
                className="ml-2 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-700 transition-colors"
              >
                Generate Empty PDF
              </button>
              <button
                onClick={() => handleGenerateMistakes("answers")}
                className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-700 transition-colors"
              >
                Generate Answers PDF
              </button>
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-[#7D0A0A] text-white rounded-xl text-sm font-bold disabled:opacity-50 shrink-0"
          >
            {exporting ? "Exporting..." : "Export Report"}
          </button>

          <div className="relative w-full sm:w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search quizzes or lessons..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8B4B4]"
            />
          </div>
        </div>
      </div>

      {paginatedQuizzes.length === 0 && (
        <p className="text-sm text-gray-400 py-6 text-center">
          No quizzes found.
        </p>
      )}

      <div className="space-y-3">
        {paginatedQuizzes.map((quiz) => {
          const isExpanded = expandedQuizId === quiz.quizId;
          const hasDetails =
            (quiz.mistakes && quiz.mistakes.length > 0) ||
            (quiz.lessonsToRecap && quiz.lessonsToRecap.length > 0);

          return (
            <div
              key={quiz.quizId}
              className="border border-gray-100 rounded-2xl overflow-hidden flex flex-col"
            >
              <div
                className={`w-full flex items-center transition-colors ${hasDetails ? "hover:bg-gray-50 cursor-pointer" : ""}`}
              >
                <div className="pl-4 py-4 flex items-center justify-center shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedQuizzes.has(quiz.quizId)}
                    onChange={(e) => toggleQuizSelection(quiz.quizId, e)}
                    className="w-4 h-4 text-[#7D0A0A] rounded border-gray-300 focus:ring-[#7D0A0A] cursor-pointer"
                  />
                </div>

                <div
                  onClick={() => hasDetails && toggleExpand(quiz.quizId)}
                  className="flex-1 flex items-center justify-between p-4 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-800 truncate">
                      {quiz.quizName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      Lesson: {quiz.lesson?.name || "N/A"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                        quiz.status === "absent"
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-600"
                      }`}
                    >
                      {quiz.status}
                    </span>
                    <span className="text-sm font-bold text-gray-700 whitespace-nowrap">
                      {quiz.score !== null && quiz.score !== undefined
                        ? `${quiz.score}/${quiz.totalScore}`
                        : "N/A"}
                    </span>
                    {quiz.lesson?.id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExtendLessonTarget(quiz.lesson);
                        }}
                        title="Extend lesson duration"
                        className="flex items-center gap-1 bg-[#FBEAEA] hover:bg-[#F0D2D2] text-[#7D0A0A] px-2 py-1 rounded-lg text-[11px] font-bold transition-colors"
                      >
                        <Clock size={12} /> Extend
                      </button>
                    )}
                    {hasDetails &&
                      (isExpanded ? (
                        <ChevronUp size={18} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={18} className="text-gray-400" />
                      ))}
                  </div>
                </div>
              </div>

              {isExpanded && hasDetails && <QuizDetails quiz={quiz} />}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {extendLessonTarget && (
        <ExtendLessonDurationModal
          studentId={studentId}
          lesson={extendLessonTarget}
          onClose={() => setExtendLessonTarget(null)}
        />
      )}
    </div>
  );
};

const ExtendLessonDurationModal = ({ studentId, lesson, onClose }) => {
  const [days, setDays] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const numericDays = Number(days);
    if (!days || Number.isNaN(numericDays) || numericDays <= 0) {
      setErrorMsg("Please enter a valid number of days greater than 0.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post(
        `/api/admin/student/${studentId}/increase-lessons-duration`,
        {
          lessonIds: [lesson.id],
          days: numericDays,
        },
      );

      toast.success("Lesson duration extended successfully");
      onClose();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Failed to extend lesson duration. Please try again.";
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-gray-900">
            Extend Lesson Duration
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-6">{lesson?.name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Additional Days
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="e.g. 7"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8B4B4]"
              autoFocus
            />
          </div>

          {errorMsg && (
            <p className="text-sm text-red-500 font-medium">{errorMsg}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-[#7D0A0A] hover:bg-[#5C0707] text-white font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Processing..." : "Confirm Extension"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const QUIZ_MISTAKES_PAGE_SIZE = 5;

const QuizDetails = ({ quiz }) => {
  const [mistakesToShow, setMistakesToShow] = useState(QUIZ_MISTAKES_PAGE_SIZE);
  const mistakes = quiz.mistakes || [];
  const lessonsToRecap = quiz.lessonsToRecap || [];

  return (
    <div className="border-t border-gray-100 bg-gray-50/60 p-4 space-y-4">
      {lessonsToRecap.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Lessons to Recap
          </p>
          <div className="flex flex-wrap gap-2">
            {lessonsToRecap.map((lesson) => (
              <span
                key={lesson.id}
                className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-600"
              >
                {lesson.name} · {lesson.mistakesCount} mistakes
              </span>
            ))}
          </div>
        </div>
      )}

      {mistakes.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Mistakes ({mistakes.length})
          </p>
          <div className="space-y-2">
            {mistakes.slice(0, mistakesToShow).map((mistake) => (
              <div
                key={mistake.questionId}
                className="bg-white p-3 rounded-xl border border-gray-100 text-sm"
              >
                <p className="text-gray-700 font-medium">
                  {mistake.questionText}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Lesson: {mistake.lesson?.name || "N/A"}
                </p>
                <p className="text-xs mt-1">
                  <span className="text-gray-400">Correct answer: </span>
                  <span className="font-semibold text-green-600">
                    {mistake.correctOption ?? "N/A"}
                  </span>
                </p>
              </div>
            ))}
          </div>

          {mistakesToShow < mistakes.length && (
            <button
              onClick={() =>
                setMistakesToShow((prev) => prev + QUIZ_MISTAKES_PAGE_SIZE)
              }
              className="mt-3 text-xs font-bold text-[#7D0A0A] hover:text-[#5C0707]"
            >
              Show more ({mistakes.length - mistakesToShow} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const PAGE_SIZE = 8;

const ExamReportsSection = ({ exams, studentName, grade }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedExamId, setExpandedExamId] = useState(null);
  const [exporting, setExporting] = useState(false);

  // New States for "Generate Mistakes" Feature
  const [selectedExams, setSelectedExams] = useState(new Set());

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportExamReport({
        studentName,
        grade,
        exams,
      });
    } catch (err) {
      toast.error(err.message || "Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateMistakes = (type) => {
    const selectedIds = Array.from(selectedExams);
    console.log(`Generating ${type} mistakes PDF for exams:`, selectedIds);
    toast.success(
      `${type === "empty" ? "Empty" : "Answers"} Mistakes PDF generated and sent to Teacher Dashboard!`,
    );
  };

  const toggleExamSelection = (examId, e) => {
    e.stopPropagation();
    const newSet = new Set(selectedExams);
    if (newSet.has(examId)) {
      newSet.delete(examId);
    } else {
      newSet.add(examId);
    }
    setSelectedExams(newSet);
  };

  const filteredExams = useMemo(() => {
    if (!searchTerm.trim()) return exams;
    const term = searchTerm.toLowerCase();
    return exams.filter((exam) => exam.examName?.toLowerCase().includes(term));
  }, [exams, searchTerm]);

  const selectedMistakesCount = useMemo(() => {
    return exams
      .filter((e) => selectedExams.has(e.examId))
      .reduce((sum, e) => sum + (e.mistakes?.length || 0), 0);
  }, [exams, selectedExams]);

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / PAGE_SIZE));
  const paginatedExams = filteredExams.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const toggleExpand = (examId) => {
    setExpandedExamId((prev) => (prev === examId ? null : examId));
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Award size={20} className="text-emerald-600" /> Exam Reports
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {filteredExams.length}
          </span>
        </h3>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {selectedExams.size > 0 && (
            <div className="flex items-center gap-2 bg-[#FBEAEA] px-3 py-1.5 rounded-xl">
              <span className="text-sm font-bold text-[#7D0A0A]">
                Mistakes Count: {selectedMistakesCount}
              </span>
              <button
                onClick={() => handleGenerateMistakes("empty")}
                className="ml-2 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-700 transition-colors"
              >
                Generate Empty PDF
              </button>
              <button
                onClick={() => handleGenerateMistakes("answers")}
                className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-700 transition-colors"
              >
                Generate Answers PDF
              </button>
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-[#7D0A0A] text-white rounded-xl text-sm font-bold disabled:opacity-50 shrink-0"
          >
            {exporting ? "Exporting..." : "Export Report"}
          </button>

          <div className="relative w-full sm:w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search exams..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8B4B4]"
            />
          </div>
        </div>
      </div>

      {paginatedExams.length === 0 && (
        <p className="text-sm text-gray-400 py-6 text-center">
          No exam reports found.
        </p>
      )}

      <div className="space-y-3">
        {paginatedExams.map((exam) => {
          const isExpanded = expandedExamId === exam.examId;
          const passed = exam.score >= exam.passScore;
          const hasDetails =
            (exam.mistakes && exam.mistakes.length > 0) ||
            (exam.lessonsToRecap && exam.lessonsToRecap.length > 0);

          return (
            <div
              key={exam.examId}
              className="border border-gray-100 rounded-2xl overflow-hidden flex flex-col"
            >
              <div
                className={`w-full flex items-center transition-colors ${hasDetails ? "hover:bg-gray-50 cursor-pointer" : ""}`}
              >
                <div className="pl-4 py-4 flex items-center justify-center shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedExams.has(exam.examId)}
                    onChange={(e) => toggleExamSelection(exam.examId, e)}
                    className="w-4 h-4 text-[#7D0A0A] rounded border-gray-300 focus:ring-[#7D0A0A] cursor-pointer"
                  />
                </div>

                <div
                  onClick={() => hasDetails && toggleExpand(exam.examId)}
                  className="flex-1 flex items-center justify-between p-4 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-800 truncate">
                      {exam.examName}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {exam.date
                        ? new Date(exam.date).toLocaleDateString()
                        : "N/A"}{" "}
                      · {exam.mistakesCount || 0} mistakes
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                        exam.status === "absent"
                          ? "bg-red-100 text-red-600"
                          : passed
                            ? "bg-green-100 text-green-600"
                            : "bg-amber-100 text-amber-600"
                      }`}
                    >
                      {exam.status}
                    </span>
                    <span className="text-sm font-bold text-gray-700 whitespace-nowrap">
                      {exam.score}/{exam.totalScore}
                    </span>
                    {hasDetails &&
                      (isExpanded ? (
                        <ChevronUp size={18} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={18} className="text-gray-400" />
                      ))}
                  </div>
                </div>
              </div>

              {isExpanded && hasDetails && <ExamDetails exam={exam} />}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const MISTAKES_PAGE_SIZE = 5;

const ExamDetails = ({ exam }) => {
  const [mistakesToShow, setMistakesToShow] = useState(MISTAKES_PAGE_SIZE);
  const mistakes = exam.mistakes || [];
  const lessonsToRecap = exam.lessonsToRecap || [];

  return (
    <div className="border-t border-gray-100 bg-gray-50/60 p-4 space-y-4">
      {lessonsToRecap.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Lessons to Recap
          </p>
          <div className="flex flex-wrap gap-2">
            {lessonsToRecap.map((lesson) => (
              <span
                key={lesson.id}
                className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-600"
              >
                {lesson.name} · {lesson.mistakesCount} mistakes
              </span>
            ))}
          </div>
        </div>
      )}

      {mistakes.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Mistakes ({mistakes.length})
          </p>
          <div className="space-y-2">
            {mistakes.slice(0, mistakesToShow).map((mistake) => (
              <div
                key={mistake.questionId}
                className="bg-white p-3 rounded-xl border border-gray-100 text-sm"
              >
                <p className="text-gray-700 font-medium">
                  {mistake.questionText}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Lesson: {mistake.lesson?.name || "N/A"}
                </p>
                <p className="text-xs mt-1">
                  <span className="text-gray-400">Correct answer: </span>
                  <span className="font-semibold text-green-600">
                    {mistake.correctOption ?? "N/A"}
                  </span>
                </p>
              </div>
            ))}
          </div>

          {mistakesToShow < mistakes.length && (
            <button
              onClick={() =>
                setMistakesToShow((prev) => prev + MISTAKES_PAGE_SIZE)
              }
              className="mt-3 text-xs font-bold text-[#7D0A0A] hover:text-[#5C0707]"
            >
              Show more ({mistakes.length - mistakesToShow} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const SessionRatingsSection = ({ studentId }) => {
  const {
    data: res,
    loading,
    error,
  } = useGet(
    studentId ? `/api/admin/session-ratings/student/${studentId}` : "",
  );

  const ratingsList = useMemo(() => {
    const raw = res?.data?.data || res?.data?.ratings || res?.data || [];
    if (!Array.isArray(raw)) return [];

    const list = [];
    raw.forEach((item) => {
      const qrs = item.questionRatings || item.ratings;
      if (qrs && Array.isArray(qrs) && qrs.length > 0) {
        qrs.forEach((r) => {
          list.push({
            id: r.id || `${item.id}-${r.questionId}`,
            sessionName: item.session?.name || item.sessionName || "Session",
            sessionDate: item.session?.sessionDate || item.sessionDate,
            generalComment: item.generalComment,
            overallRating: item.overallRating,
            questionTitle:
              r.questionTitle || r.question?.title || "Evaluation Criteria",
            category: r.category || r.question?.category || "general",
            rating: Number(r.rating) || 0,
            comment: r.comment || "",
            createdAt: r.createdAt || item.createdAt,
          });
        });
      } else {
        list.push({
          id: item.id,
          sessionName: item.session?.name || item.sessionName || "Session",
          sessionDate: item.session?.sessionDate || item.sessionDate,
          generalComment: item.generalComment,
          overallRating: item.overallRating,
          questionTitle:
            item.questionTitle || item.question?.title || "Evaluation Criteria",
          category: item.category || item.question?.category || "general",
          rating: Number(item.overallRating ?? item.rating ?? 0),
          comment: item.comment || "",
          createdAt: item.createdAt,
        });
      }
    });
    return list;
  }, [res]);

  const avgRating = useMemo(() => {
    if (ratingsList.length === 0) return 0;
    const sum = ratingsList.reduce((acc, curr) => acc + curr.rating, 0);
    return (sum / ratingsList.length).toFixed(1);
  }, [ratingsList]);

  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl">
            <Star className="w-6 h-6 fill-amber-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Session Evaluations & Ratings
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Teacher evaluations and criteria scores recorded during live
              sessions
            </p>
          </div>
        </div>

        {ratingsList.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700">
              Total: {ratingsList.length} reviews
            </span>
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              Avg: {avgRating} / 10
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-6 text-center text-sm text-gray-400">
          Loading student session evaluations...
        </div>
      ) : error ? (
        <div className="py-4 text-center text-sm text-red-500 bg-red-50 rounded-xl">
          Unable to fetch session evaluations for this student.
        </div>
      ) : ratingsList.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          No session ratings recorded for this student yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ratingsList.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D0A0A] bg-[#FBEAEA] px-2.5 py-0.5 rounded-full">
                  {r.category}
                </span>
                <span className="text-sm font-extrabold text-amber-600 flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  {r.rating}
                  <span className="text-xs text-gray-400 font-normal">
                    / 10
                  </span>
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-900 leading-snug">
                  {r.questionTitle}
                </h4>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Clock size={12} />
                  {r.sessionName}{" "}
                  {r.sessionDate
                    ? `• ${new Date(r.sessionDate).toLocaleDateString()}`
                    : ""}
                </p>
              </div>

              {r.comment && (
                <p className="text-xs text-gray-600 bg-white p-2 rounded-xl border border-gray-100">
                  {r.comment}
                </p>
              )}

              {r.generalComment && (
                <p className="text-[11px] text-gray-400 italic">
                  Session note: "{r.generalComment}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Extra Homework: مراجعة وتصحيح اللي الطالب سلّمه ─────────────
const EH_STATUS = {
  assigned: { label: "Not submitted", className: "bg-gray-100 text-gray-600" },
  submitted: { label: "Needs review", className: "bg-amber-50 text-amber-700" },
  graded: { label: "Graded", className: "bg-green-50 text-green-700" },
};

const ehFormatDate = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

const ExtraHomeworkSection = ({ studentId }) => {
  // { [assignmentId]: { open, score, feedback, saving, error } }
  const [forms, setForms] = useState({});
  // التعديلات اللي اتحفظت في الجلسة دي لحد ما البيانات تتحدث
  const [overrides, setOverrides] = useState({});

  const {
    data: res,
    loading,
    error,
    refetch,
  } = useGet(studentId ? `/api/admin/extra-homework/student/${studentId}` : "");
  const { putData } = usePut();

  const homework = useMemo(() => {
    const payload = res?.data?.data || res?.data || {};
    const list = Array.isArray(payload.homework) ? payload.homework : [];
    return list.map((h) => ({ ...h, ...(overrides[h.assignmentId] || {}) }));
  }, [res, overrides]);

  const counts = useMemo(
    () =>
      homework.reduce(
        (acc, h) => {
          acc[h.status] = (acc[h.status] || 0) + 1;
          return acc;
        },
        { assigned: 0, submitted: 0, graded: 0 },
      ),
    [homework],
  );

  const updateForm = (key, patch) =>
    setForms((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const openForm = (h) =>
    updateForm(h.assignmentId, {
      open: true,
      score: h.score ?? "",
      feedback: h.feedback ?? "",
      error: null,
    });

  const closeForm = (key) => updateForm(key, { open: false, error: null });

  const handleSaveReview = async (h) => {
    const key = h.assignmentId;
    const form = forms[key] || {};
    const score = Number(form.score);

    if (
      form.score === "" ||
      form.score === null ||
      Number.isNaN(score) ||
      score < 0
    ) {
      updateForm(key, { error: "Enter a score of 0 or more." });
      return;
    }

    updateForm(key, { saving: true, error: null });
    try {
      await putData(
        { score, feedback: form.feedback?.trim() || "", status: "graded" },
        `/api/admin/extra-homework/${h.homeworkId}/submissions/${h.assignmentId}/review`,
        "Grade saved",
      );
      setOverrides((prev) => ({
        ...prev,
        [key]: {
          status: "graded",
          score,
          feedback: form.feedback?.trim() || null,
          reviewedAt: new Date().toISOString(),
        },
      }));
      updateForm(key, { open: false, saving: false });
      refetch?.();
    } catch (err) {
      updateForm(key, {
        saving: false,
        error: err?.message || "The grade couldn't be saved. Try again.",
      });
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-one/10 text-one rounded-2xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Extra Homework</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              What this student submitted, and their grades
            </p>
          </div>
        </div>

        {homework.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700">
              {counts.submitted} to review
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-green-50 text-green-700">
              {counts.graded} graded
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600">
              {counts.assigned} not submitted
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-6 text-center text-sm text-gray-400">
          Loading extra homework...
        </div>
      ) : error ? (
        <div className="py-4 text-center text-sm text-red-500 bg-red-50 rounded-xl">
          Unable to fetch extra homework for this student.
        </div>
      ) : homework.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          No extra homework assigned to this student yet.
        </div>
      ) : (
        <div className="space-y-4">
          {homework.map((h) => {
            const key = h.assignmentId;
            const form = forms[key] || {};
            const statusStyle = EH_STATUS[h.status] || EH_STATUS.assigned;
            const hasSubmission =
              h.status === "submitted" || h.status === "graded";
            const isLate =
              h.submittedAt &&
              h.dueDate &&
              new Date(h.submittedAt) > new Date(h.dueDate);

            return (
              <div
                key={key}
                className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-4"
              >
                {/* Title + status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-base font-bold text-gray-900">
                      {h.title || "Untitled homework"}
                    </h4>
                    {h.description && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {h.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-xl ${statusStyle.className}`}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                {/* Dates */}
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> Due {ehFormatDate(h.dueDate)}
                  </span>
                  {h.submittedAt && (
                    <span
                      className={`flex items-center gap-1 ${isLate ? "text-red-600 font-semibold" : ""}`}
                    >
                      <CheckCircle2 size={12} /> Submitted{" "}
                      {ehFormatDate(h.submittedAt)}
                      {isLate && " (late)"}
                    </span>
                  )}
                  {h.reviewedAt && (
                    <span className="flex items-center gap-1">
                      <Award size={12} /> Reviewed {ehFormatDate(h.reviewedAt)}
                    </span>
                  )}
                </div>

                {/* Files */}
                <div className="flex flex-wrap gap-2">
                  {h.submittedPdf && (
                    <a
                      href={h.submittedPdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl bg-one text-white hover:bg-one/90 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Student's solution
                    </a>
                  )}
                  {h.pdfUrl && (
                    <a
                      href={h.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Homework PDF
                    </a>
                  )}
                  {h.link && (
                    <a
                      href={h.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Homework link
                    </a>
                  )}
                </div>

                {h.studentNotes && (
                  <p className="text-sm text-gray-700 bg-white p-3 rounded-xl border border-gray-100">
                    <span className="font-semibold">Student notes: </span>
                    {h.studentNotes}
                  </p>
                )}

                {/* Grade display */}
                {h.status === "graded" && !form.open && (
                  <div className="flex flex-wrap items-start justify-between gap-3 bg-white p-4 rounded-xl border border-gray-100">
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5 text-sm font-bold text-green-700">
                        <Award className="w-4 h-4" />
                        Score: {h.score ?? "—"}
                      </p>
                      {h.feedback && (
                        <p className="flex items-start gap-1.5 text-sm text-gray-600">
                          <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                          {h.feedback}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openForm(h)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit grade
                    </button>
                  </div>
                )}

                {/* Grade action */}
                {h.status === "submitted" && !form.open && (
                  <button
                    type="button"
                    onClick={() => openForm(h)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-one text-white hover:bg-one/90 transition-colors"
                  >
                    <Award className="w-4 h-4" />
                    Grade submission
                  </button>
                )}

                {!hasSubmission && (
                  <p className="text-sm text-gray-400">
                    The student hasn't submitted this homework yet.
                  </p>
                )}

                {/* Review form */}
                {hasSubmission && form.open && (
                  <div className="bg-white p-4 rounded-xl border border-one/20 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <label className="sm:col-span-1 space-y-1">
                        <span className="text-xs font-semibold text-gray-600">
                          Score
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={form.score}
                          onChange={(e) =>
                            updateForm(key, { score: e.target.value })
                          }
                          disabled={form.saving}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-one/40 disabled:opacity-60"
                        />
                      </label>
                      <label className="sm:col-span-3 space-y-1">
                        <span className="text-xs font-semibold text-gray-600">
                          Feedback for the student
                        </span>
                        <textarea
                          rows={2}
                          value={form.feedback}
                          onChange={(e) =>
                            updateForm(key, { feedback: e.target.value })
                          }
                          disabled={form.saving}
                          placeholder="e.g. Great work on step 4!"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-one/40 disabled:opacity-60"
                        />
                      </label>
                    </div>

                    {form.error && (
                      <p className="flex items-center gap-1.5 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {form.error}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveReview(h)}
                        disabled={form.saving}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-one text-white hover:bg-one/90 disabled:opacity-50 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {form.saving ? "Saving..." : "Save grade"}
                      </button>
                      <button
                        type="button"
                        onClick={() => closeForm(key)}
                        disabled={form.saving}
                        className="px-4 py-2 text-sm font-medium rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const InfoBox = ({ icon, label, value }) => (
  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
    <div className="text-[#A35C5C] bg-white p-2 rounded-lg">{icon}</div>
    <div>
      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
        {label}
      </p>
      <p className="font-semibold text-gray-800">{value || "N/A"}</p>
    </div>
  </div>
);

export default StudentInformation;
