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
} from "lucide-react";
import api from "@/api/api";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";

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

      {/* Courses, Packages, Quiz & Exam Reports - built to handle large datasets (search + pagination) */}
      <div className="mt-6 space-y-6">
        <CoursesSection courses={student?.courses || []} />
        <PackagesSection packages={student?.packages || []} />
        <QuizReportsSection quizzes={quizzes} studentId={id} />
        <ExamReportsSection exams={exams} />
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
          description: description.trim() || undefined,
        },
      );

      // Prefer the balance returned by the API; otherwise compute it locally.
      const returnedBalance = res?.data?.data?.balance;
      const nextBalance =
        typeof returnedBalance === "number"
          ? returnedBalance
          : currentBalance + numericAmount;

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

const QuizReportsSection = ({ quizzes, studentId }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedQuizId, setExpandedQuizId] = useState(null);
  const [extendLessonTarget, setExtendLessonTarget] = useState(null);

  const filteredQuizzes = useMemo(() => {
    if (!searchTerm.trim()) return quizzes;
    const term = searchTerm.toLowerCase();
    return quizzes.filter(
      (quiz) =>
        quiz.quizName?.toLowerCase().includes(term) ||
        quiz.lesson?.name?.toLowerCase().includes(term),
    );
  }, [quizzes, searchTerm]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <BookOpen size={20} className="text-orange-600" /> Quiz Reports
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {filteredQuizzes.length}
          </span>
        </h3>
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
              className="border border-gray-100 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => hasDetails && toggleExpand(quiz.quizId)}
                className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                  hasDetails
                    ? "hover:bg-gray-50 cursor-pointer"
                    : "cursor-default"
                }`}
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
              </button>

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

const ExamReportsSection = ({ exams }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedExamId, setExpandedExamId] = useState(null);

  const filteredExams = useMemo(() => {
    if (!searchTerm.trim()) return exams;
    const term = searchTerm.toLowerCase();
    return exams.filter((exam) => exam.examName?.toLowerCase().includes(term));
  }, [exams, searchTerm]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Award size={20} className="text-emerald-600" /> Exam Reports
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {filteredExams.length}
          </span>
        </h3>
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

      {paginatedExams.length === 0 && (
        <p className="text-sm text-gray-400 py-6 text-center">
          No exam reports found.
        </p>
      )}

      <div className="space-y-3">
        {paginatedExams.map((exam) => {
          const isExpanded = expandedExamId === exam.examId;
          const passed = exam.score >= exam.passScore;

          return (
            <div
              key={exam.examId}
              className="border border-gray-100 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => toggleExpand(exam.examId)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
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
                  {isExpanded ? (
                    <ChevronUp size={18} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && <ExamDetails exam={exam} />}
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
