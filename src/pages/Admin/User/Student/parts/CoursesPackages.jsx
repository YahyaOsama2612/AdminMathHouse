// Enrolled courses and active packages (from GET /api/admin/student/:id).
import { useMemo, useState } from "react";
import { BookOpen, Clock, Package } from "lucide-react";
import { Card, Pill } from "@/components/admin/kit";
import { Count, MiniPager, SearchBox, fmtDate } from "./shared";

const ITEMS_PAGE_SIZE = 9;

function usePagedFilter(items, match) {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((x) => match(x, term));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, searchTerm]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PAGE_SIZE));
  const paged = filtered.slice((page - 1) * ITEMS_PAGE_SIZE, page * ITEMS_PAGE_SIZE);
  const onSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };
  return { searchTerm, onSearch, filtered, paged, page, setPage, totalPages };
}

export const CoursesSection = ({ courses }) => {
  const s = usePagedFilter(
    courses,
    (course, term) =>
      course.name?.toLowerCase().includes(term) ||
      course.subject?.toLowerCase().includes(term) ||
      course.teacher?.toLowerCase().includes(term),
  );

  return (
    <Card
      title={
        <>
          Enrolled courses
          <Count n={s.filtered.length} />
        </>
      }
      right={courses.length > 0 && <SearchBox value={s.searchTerm} onChange={s.onSearch} placeholder="Search courses..." />}
      bodyClass=""
    >
      <div className="p-5">
        {s.paged.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            {courses.length === 0 ? "No courses enrolled yet." : "No courses match your search."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {s.paged.map((course) => (
              <div
                key={course.id}
                className="flex items-start gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/60 hover:border-red-100 hover:bg-white transition-colors min-w-0"
              >
                <span className="w-10 h-10 rounded-xl bg-white border border-gray-100 text-one flex items-center justify-center shrink-0">
                  <BookOpen size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-gray-800 truncate" title={course.name}>
                    {course.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {course.subject || course.teacher || course.grade || "—"}
                  </p>
                </div>
                {course.status && (
                  <Pill tone={course.status === "active" ? "green" : "gray"}>
                    {String(course.status).replace(/^./, (c) => c.toUpperCase())}
                  </Pill>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <MiniPager page={s.page} totalPages={s.totalPages} onChange={s.setPage} />
    </Card>
  );
};

export const PackagesSection = ({ packages }) => {
  const s = usePagedFilter(packages, (pkg, term) => pkg.name?.toLowerCase().includes(term));

  return (
    <Card
      title={
        <>
          Active packages
          <Count n={s.filtered.length} />
        </>
      }
      right={packages.length > 0 && <SearchBox value={s.searchTerm} onChange={s.onSearch} placeholder="Search packages..." />}
      bodyClass=""
    >
      <div className="p-5">
        {s.paged.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            {packages.length === 0 ? "No active packages." : "No packages match your search."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {s.paged.map((pkg) => (
              <div
                key={pkg.id}
                className="flex items-start gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/60 hover:border-red-100 hover:bg-white transition-colors min-w-0"
              >
                <span className="w-10 h-10 rounded-xl bg-white border border-gray-100 text-one flex items-center justify-center shrink-0">
                  <Package size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-gray-800 truncate" title={pkg.name}>
                    {pkg.name}
                  </p>
                  {pkg.expiresAt && (
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock size={12} /> Expires {fmtDate(pkg.expiresAt)}
                    </p>
                  )}
                </div>
                <span className="text-xs font-bold text-one bg-red-50 px-2 py-1 rounded-lg shrink-0 whitespace-nowrap">
                  {pkg.price} EGP
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <MiniPager page={s.page} totalPages={s.totalPages} onChange={s.setPage} />
    </Card>
  );
};
