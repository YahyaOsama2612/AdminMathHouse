import { useNavigate } from "react-router-dom";
import ReusableTableSearch from "@/components/ReusableTableSearch";
import useGet from "@/hooks/useGet";
import React, { useMemo, useState, useEffect } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import useDelete from "@/hooks/useDelete";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
import { getToken } from "../../../../utils/auth";

// ملاحظة: تأكد من استيراد مكتبة الـ HTTP اللي بتستخدمها (axios مثلاً)
// import axios from "axios"; 

const AllQuestions = () => {
  const navigate = useNavigate();
  const token = getToken();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // 1. إضافة الفلاتر الجديدة للـ State
  const [filters, setFilters] = useState({
    difficulty: "",
    questionType: "",
    answerType: "",
    year: "",
    month: "",
    categoryId: "",
    courseId: "",
    semesterId: "",
    chapterId: "",
    lessonId: "",
  });

  // 2. States لتخزين الخيارات (Options) اللي هترجع من الـ APIs
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [lessons, setLessons] = useState([]);

  // ==========================================
  // 3. جلب بيانات الفلاتر الديناميكية (Cascading APIs)
  // ==========================================
  
  // ضفنا parameter تالت اسمه dataKey عشان نحدد اسم المصفوفة اللي هترجع من الـ API
  const fetchFilterData = async (endpoint, setter, dataKey = "data") => {
    try {
      const response = await fetch(endpoint, {
        headers: {
           "Authorization": `Bearer ${token}`
        }
      });
      const result = await response.json();
      
      // هنا بنقرأ المصفوفة ديناميكياً (يا إما result.data.data أو result.data.chapters إلخ)
      const targetArray = result?.data?.[dataKey] || [];
      setter(targetArray); 
    } catch (error) {
      console.error("Error fetching data for", endpoint, error);
      setter([]);
    }
  };

  // أ. جلب الـ Categories
  useEffect(() => {
    fetchFilterData("https://bcknd.mathshouse.net/api/admin/category", setCategories, "data");
  }, []);

  // ب. جلب الـ Courses 
  useEffect(() => {
    if (filters.categoryId) {
      fetchFilterData(`https://bcknd.mathshouse.net/api/admin/courses/category/${filters.categoryId}`, setCourses, "data");
    } else {
      setCourses([]); 
    }
  }, [filters.categoryId]);

  // ج. جلب الـ Semesters 
  useEffect(() => {
    if (filters.courseId) {
      fetchFilterData(`https://bcknd.mathshouse.net/api/admin/semester/course/${filters.courseId}`, setSemesters, "data");
    } else {
      setSemesters([]);
    }
  }, [filters.courseId]);

  // د. جلب الـ Chapters 
  useEffect(() => {
    if (filters.courseId) { 
      // لاحظ إننا باصينا "chapters" كـ dataKey
      fetchFilterData(`https://bcknd.mathshouse.net/api/admin/chapters/course/${filters.courseId}`, setChapters, "chapters");
    } else {
      setChapters([]);
    }
  }, [filters.courseId]); 

  // هـ. جلب الـ Lessons 
  useEffect(() => {
    if (filters.chapterId) {
       // لاحظ إننا باصينا "lessons" كـ dataKey
      fetchFilterData(`https://bcknd.mathshouse.net/api/admin/lessons/chapter/${filters.chapterId}`, setLessons, "lessons");
    } else {
      setLessons([]);
    }
  }, [filters.chapterId]);

  // ==========================================
  // 4. تطبيق الـ Debouncing وبناء الـ URL
  // ==========================================
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 2000);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.append("page", page);
    params.append("limit", limit);
    if (debouncedSearch) params.append("search", debouncedSearch);
    
    // إضافة كل الفلاتر الديناميكية للـ Query
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    return params.toString();
  };

  const { data, loading, error, refetch } = useGet(
    `/api/admin/questions?${buildQueryParams()}`
  );
  
  const { deleteData, loading: deleteLoading } = useDelete();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const paginationData = data?.data?.pagination || {};

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteData(`/api/admin/questions/${selectedRow.id}`);
      setOpenDeleteModal(false);
      setSelectedRow(null);
      refetch();
    } catch (e) {
      throw e;
    }
  };

  const columns = [
    { header: "Question", key: "question" },
    { header: "Type", key: "answerType" },
    { header: "Difficulty", key: "difficulty" },
    { header: "Category", key: "questionType" },
    { header: "Lesson", key: "lessonName" },
    { header: "Exam Code", key: "examCode" },
    { header: "Section", key: "sectionName" },
    { header: "Year", key: "year" },
    { header: "Month", key: "month" },
  ];

  const tableData = useMemo(() => {
    return (
      data?.data?.data?.map((q) => ({
        id: q.id , 
        question: q.question,
        answerType: q.answerType,
        difficulty: q.difficulty,
        questionType: q.questionType,
        lessonName: q.lesson?.name || "—",
        examCode: q.examCode?.code || "—",
        sectionName: q.section?.sectionName || "—",
        year: q.year,
        month: q.month,
        raw: q,
      })) || []
    );
  }, [data]);

  // ==========================================
  // 5. إعداد مصفوفة الفلاتر للجدول
  // ==========================================
  // هنا بنحول الداتا اللي رجعت من الـ API لشكل {label, value} اللي بيقبله ReusableTableSearch
// ==========================================
  // 5. إعداد مصفوفة الفلاتر للجدول
  // ==========================================
  const filterOptions = [
    { 
      key: "categoryId", 
      label: "Category", 
      options: categories.map(c => ({ label: c.name || "—", value: c.id })) 
    },
    { 
      key: "courseId", 
      label: "Course", 
      options: courses.map(c => ({ label: c.name || "—", value: c.id })) 
    },
    { 
      key: "semesterId", 
      label: "Semester", 
      options: semesters.map(s => ({ label: s.name || "—", value: s.id })) 
    },
    { 
      key: "chapterId", 
      label: "Chapter", 
      // هنا بنقرأ الداتا من جوه Object الـ chapter
      options: chapters.map(ch => ({ 
        label: ch?.chapter?.name || "—", 
        value: ch?.chapter?.id 
      })) 
    },
    { 
      key: "lessonId", 
      label: "Lesson", 
      // وهنا بنقرأ الداتا من جوه Object الـ lesson
      options: lessons.map(l => ({ 
        label: l?.lesson?.name || "—", 
        value: l?.lesson?.id 
      })) 
    },
    { key: "difficulty", label: "Difficulty", options: ["A", "B", "C", "D", "E"] },
    { key: "questionType", label: "Question Type", options: ["Trail", "Extra"] },
    { key: "answerType", label: "Answer Type", options: ["MCQ", "Grid in"] },
    { key: "month", label: "Month", options: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] },
    {
      key: "year",
      label: "Year",
      options: Array.from(
        { length: new Date().getFullYear() - 2000 + 1 },
        (_, i) => 2000 + i
      )
    }
  ];

  // ==========================================
  // 6. هاندلر تغيير الفلتر (لتفريغ الأبناء عند تغيير الأب)
  // ==========================================
  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value };

      // لو غيرنا حاجة فوق، لازم نفضي كل اللي تحتها عشان الداتا ما تتدخلش في بعض
      if (key === "categoryId") {
        newFilters.courseId = "";
        newFilters.semesterId = "";
        newFilters.chapterId = "";
        newFilters.lessonId = "";
      } else if (key === "courseId") {
        newFilters.semesterId = "";
        newFilters.chapterId = "";
        newFilters.lessonId = "";
      } else if (key === "semesterId") {
        // إذا كان chapter بيعتمد على السيمستر، نفضيه
        newFilters.chapterId = "";
        newFilters.lessonId = "";
      } else if (key === "chapterId") {
        newFilters.lessonId = "";
      }

      return newFilters;
    });
    setPage(1); 
  };

  const handleEdit = (row) => {
    navigate(`/admin/courses/questions/edit/${row.id}`);
  };
  
  if (loading && !tableData.length) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div>
      <ReusableTableSearch
        title="Questions"
        columns={columns}
        data={tableData}
        loading={loading || deleteLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        
        filters={filterOptions}
        filterValues={filters}
        onFilterChange={handleFilterChange}

        currentPage={page}
        totalPages={paginationData.totalPages || 1}
        totalResults={paginationData.total || 0}
        rowsPerPage={limit}
        onPageChange={(newPage) => setPage(newPage)}
        onRowsPerPageChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        searchTerm={searchTerm}
        onSearchChange={(val) => setSearchTerm(val)}
      />

     <ConfirmDeleteModal
       open={openDeleteModal}
       onClose={() => setOpenDeleteModal(false)}
       onConfirm={confirmDelete}
       title="Delete Question"
       description={`Are you sure you want to delete this question?`}
     />
    </div>
  );
};

export default AllQuestions;