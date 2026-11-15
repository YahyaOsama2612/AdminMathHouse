import { useState } from "react";
import { toast } from "react-hot-toast";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ExternalLink,
  FileText,
  GraduationCap,
  ListChecks,
  Mail,
  Package,
  Pencil,
  Phone,
  Plus,
  Users,
} from "lucide-react";
import api from "@/api/api";
import useGet from "@/hooks/useGet";
import Errorpage from "@/components/Errorpage";
import { Empty, Tabs } from "@/components/admin/kit";
import { TopUpWalletModal } from "./parts/Modals";
import { CoursesSection, PackagesSection } from "./parts/CoursesPackages";
import { QuizReportsSection, ExamReportsSection } from "./parts/Reports";
import { SessionRatingsSection, ExtraHomeworkSection } from "./parts/RatingsHomework";
import { AvailableTimesCard, StudentNotesCard, availableDaysCount } from "./parts/AvailabilityNotes";
import { MONEY } from "./parts/shared";

/* Admin → Users → Students → student profile (MathPortal "student-profile" design).
   Endpoints: GET /api/admin/student/:id, GET /api/admin/reports/:id/quizzes | /exams,
   POST /api/admin/auth/impersonate/:id, POST /api/admin/student/:id/top-up-wallet, plus the
   endpoints used by the sections in ./parts. */

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "courses", label: "Courses & packages" },
  { key: "quizzes", label: "Quizzes" },
  { key: "exams", label: "Exams" },
  { key: "ratings", label: "Session ratings" },
  { key: "homework", label: "Extra homework" },
];

const InfoTile = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-xl bg-gray-50/80 border border-gray-100 px-4 py-3 min-w-0">
    <span className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 text-one" aria-hidden="true">
      {icon}
    </span>
    <div className="min-w-0">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`text-sm font-bold truncate ${value ? "text-gray-900" : "text-gray-400"}`} title={value || ""}>
        {value || "N/A"}
      </p>
    </div>
  </div>
);

const Glance = ({ icon, n, label, title }) => (
  <div className="rounded-2xl bg-red-50/70 px-3 py-4 text-center" title={title || undefined}>
    <span className="inline-flex text-one/80" aria-hidden="true">
      {icon}
    </span>
    <p className="text-2xl font-extrabold text-one tabular-nums leading-tight">{n}</p>
    <p className="text-xs font-semibold text-one/80">{label}</p>
  </div>
);

const ProfileSkeleton = () => (
  <div>
    <div className="skel h-10 w-full max-w-md mb-4" />
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 mb-4">
      <div className="skel h-64" />
      <div className="space-y-4">
        <div className="skel h-32" />
        <div className="skel h-28" />
      </div>
    </div>
    <div className="skel h-11 w-full max-w-xl mb-4" />
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="skel h-72" />
      <div className="skel h-72" />
    </div>
  </div>
);

const StudentInformation = () => {
  const [processing, setProcessing] = useState(false);
  const [walletModal, setWalletModal] = useState(null); // "deposit" | "withdrawal" | null
  const [walletOverride, setWalletOverride] = useState(null);
  const [tab, setTab] = useState("overview");
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: response, loading, error } = useGet(id ? `/api/admin/student/${id}` : null);
  const { data: quizResponse } = useGet(id ? `/api/admin/reports/${id}/quizzes` : null);
  const { data: examResponse } = useGet(id ? `/api/admin/reports/${id}/exams` : null);

  const student = response?.data?.data;
  const quizzes = quizResponse?.data?.data || [];
  const exams = examResponse?.data?.data || [];

  const walletBalance = walletOverride !== null ? walletOverride : student?.wallet?.balance || 0;

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

  if (loading || (!response && !error && id)) return <ProfileSkeleton />;
  if (error) return <Errorpage error={error} />;
  if (!student) return <Empty title="No student data found." text="This student may have been removed." />;

  const fullName = `${student?.firstname || ""} ${student?.lastname || ""}`.trim();
  const reportName = `${student?.firstname} ${student?.lastname}`;
  const initials = ((student?.firstname?.[0] || "") + (student?.lastname?.[0] || "")).toUpperCase();
  const courses = student?.courses || [];
  const packages = student?.packages || [];
  const freeDays = availableDaysCount(student);

  return (
    <div>
      {/* Top bar: back + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={() => navigate("/admin/users/students")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-one"
        >
          <ArrowLeft size={15} /> Students
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => navigate(`/admin/users/students/edit/${id}`)} className="a-btn">
            <Pencil size={15} /> Edit details
          </button>
          <button type="button" onClick={() => navigate(`/admin/users/students/attend/${id}`)} className="a-btn">
            <ListChecks size={15} /> Content & attendance
          </button>
          <button
            type="button"
            onClick={handleOpenAccount}
            disabled={processing}
            className="a-btn primary"
            title="Opens the student dashboard as this student in a new tab"
          >
            {processing ? "Processing..." : "Open student dashboard"} <ExternalLink size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 mb-4">
        {/* Identity card */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 min-w-0">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-one shrink-0 bg-[#fdecec]">
              {initials || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-extrabold text-2xl text-gray-900 leading-tight break-words">{fullName || "Student"}</h1>
              {student?.nickname && (
                <p className="mt-1.5">
                  <span className="text-xs font-extrabold text-one bg-red-50 px-2.5 py-1 rounded-full" title="Nickname">
                    @{student.nickname}
                  </span>
                </p>
              )}
              {courses.length > 0 && (
                <p className="text-xs text-gray-400 mt-2 truncate" title={courses.map((c) => c.name).join(", ")}>
                  {courses.map((c) => c.name).join(" · ")}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            <InfoTile icon={<Mail size={17} />} label="Email address" value={student?.email} />
            <InfoTile icon={<Phone size={17} />} label="Phone number" value={student?.phone} />
            <InfoTile icon={<Users size={17} />} label="Parent phone" value={student?.parentphone} />
            <InfoTile icon={<GraduationCap size={17} />} label="Grade" value={student?.grade?.nameAr} />
          </div>
        </section>

        <div className="space-y-4 min-w-0">
          {/* Wallet */}
          <section className="rounded-2xl p-5 text-white shadow-lg bg-[linear-gradient(135deg,#8b1010,#5a0606)]" aria-label="Wallet">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-white/80">Wallet balance</p>
              <button
                type="button"
                onClick={() => setWalletModal("deposit")}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-sm font-bold"
              >
                <Plus size={15} /> Top up
              </button>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold tabular-nums mt-2 break-words">{MONEY(walletBalance)}</p>
            {walletBalance > 0 && (
              <button
                type="button"
                onClick={() => setWalletModal("withdrawal")}
                className="mt-3 text-xs font-bold text-white/90 hover:text-white underline"
              >
                Deduct
              </button>
            )}
          </section>

          {/* At a glance */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="font-bold text-gray-900 mb-3">At a glance</p>
            <div className="grid grid-cols-2 gap-3">
              <Glance
                icon={<BookOpen size={18} />}
                n={courses.length}
                label={courses.length === 1 ? "Course" : "Courses"}
                title={courses.map((c) => c.name).join(", ")}
              />
              <Glance
                icon={<Package size={18} />}
                n={packages.length}
                label={packages.length === 1 ? "Package" : "Packages"}
                title={packages.map((p) => p.name).join(", ")}
              />
              <Glance icon={<FileText size={18} />} n={exams.length} label="Exams taken" />
              <Glance icon={<CalendarDays size={18} />} n={freeDays} label="Free days / week" />
            </div>
          </section>
        </div>
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {/* Sections stay mounted so each loads once and keeps its search / forms when switching tabs. */}
      <div className={tab === "overview" ? "grid grid-cols-1 xl:grid-cols-2 gap-4" : "hidden"}>
        <AvailableTimesCard student={student} studentName={fullName} onEdit={() => navigate("/admin/live/availability-plans")} />
        <StudentNotesCard studentId={id || student?.id} plan={student?.availabilityPlans?.[0]} />
      </div>
      <div className={tab === "courses" ? "space-y-4" : "hidden"}>
        <CoursesSection courses={courses} />
        <PackagesSection packages={packages} />
      </div>
      <div className={tab === "quizzes" ? "" : "hidden"}>
        <QuizReportsSection quizzes={quizzes} studentId={id} studentName={reportName} grade={student?.grade?.nameAr} courses={courses} />
      </div>
      <div className={tab === "exams" ? "" : "hidden"}>
        <ExamReportsSection exams={exams} studentId={id} studentName={reportName} grade={student?.grade?.nameAr} />
      </div>
      <div className={tab === "ratings" ? "" : "hidden"}>
        <SessionRatingsSection studentId={id} />
      </div>
      <div className={tab === "homework" ? "" : "hidden"}>
        <ExtraHomeworkSection studentId={id} />
      </div>

      {walletModal && (
        <TopUpWalletModal
          studentId={id}
          studentName={fullName}
          currentBalance={walletBalance}
          initialOperation={walletModal}
          onClose={() => setWalletModal(null)}
          onSuccess={(newBalance) => setWalletOverride(newBalance)}
        />
      )}
    </div>
  );
};

export default StudentInformation;
