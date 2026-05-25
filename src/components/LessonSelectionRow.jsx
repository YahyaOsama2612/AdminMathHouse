import React, { useState, useEffect, useRef } from "react";
import Select from "react-select";
import { Trash2 } from "lucide-react";
import api from "@/api/api";

const LessonSelectionRow = ({ index, onUpdate, onRemove, isOnlyOne, initialData = {} }) => {
  const isMounted = useRef(false);

  // دالة مساعدة لاستخراج الـ IDs بشكل آمن
  const extractLessonIds = (lessons) => {
    if (!lessons || !Array.isArray(lessons)) return [];
    return lessons.map(l => typeof l === 'object' ? (l.value || l.id) : l);
  };

  const [selections, setSelections] = useState({
    categoryId: initialData.categoryId || "",
    courseId: initialData.courseId || "",
    chapterId: initialData.chapterId || "",
    selectedLessonIds: extractLessonIds(initialData.selectedLessons),
  });

  // 🔥 1. مراقبة الداتا المتأخرة من الأب: لو الداتا اتغيرت أو حملت متأخر، نحدث الـ State
  useEffect(() => {
    if (initialData.categoryId || initialData.courseId || initialData.chapterId) {
      setSelections({
        categoryId: initialData.categoryId || "",
        courseId: initialData.courseId || "",
        chapterId: initialData.chapterId || "",
        selectedLessonIds: extractLessonIds(initialData.selectedLessons),
      });
    }
  }, [initialData.categoryId, initialData.courseId, initialData.chapterId]);

  const [options, setOptions] = useState({
    categories: [], courses: [], chapters: [], lessons: [],
  });

  const [isLoading, setIsLoading] = useState({
    categories: false, courses: false, chapters: false, lessons: false,
  });

  // --- API Calls ---
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(prev => ({ ...prev, categories: true }));
      try {
        const res = await api.get("/api/admin/session/select/category");
        const formatted = res.data?.data?.categories.flatMap(root => 
          root.children.map(child => ({ value: child.id, label: child.name }))
        ) || [];
        setOptions(prev => ({ ...prev, categories: formatted }));
      } catch (err) { console.error("Error categories", err); } 
      finally { setIsLoading(prev => ({ ...prev, categories: false })); }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!selections.categoryId) { setOptions(prev => ({ ...prev, courses: [] })); return; }
    const fetchCourses = async () => {
      setIsLoading(prev => ({ ...prev, courses: true }));
      try {
        const res = await api.get(`/api/admin/session/select/course/${selections.categoryId}`);
        const formatted = res.data?.data?.courses.map(c => ({ value: c.id, label: c.name })) || [];
        setOptions(prev => ({ ...prev, courses: formatted }));
      } catch (err) { console.error("Error courses", err); } 
      finally { setIsLoading(prev => ({ ...prev, courses: false })); }
    };
    fetchCourses();
  }, [selections.categoryId]);

  useEffect(() => {
    if (!selections.courseId) { setOptions(prev => ({ ...prev, chapters: [] })); return; }
    const fetchChapters = async () => {
      setIsLoading(prev => ({ ...prev, chapters: true }));
      try {
        const res = await api.get(`/api/admin/session/select/chapter/${selections.courseId}`);
        const formatted = res.data?.data?.chapters.map(c => ({ value: c.id, label: c.name })) || [];
        setOptions(prev => ({ ...prev, chapters: formatted }));
      } catch (err) { console.error("Error chapters", err); } 
      finally { setIsLoading(prev => ({ ...prev, chapters: false })); }
    };
    fetchChapters();
  }, [selections.courseId]);

  useEffect(() => {
    if (!selections.chapterId) { setOptions(prev => ({ ...prev, lessons: [] })); return; }
    const fetchLessons = async () => {
      setIsLoading(prev => ({ ...prev, lessons: true }));
      try {
        const res = await api.get(`/api/admin/session/select/lesson/${selections.chapterId}`);
        const formatted = res.data?.data?.lessons.map(l => ({ value: l.id, label: l.name })) || [];
        setOptions(prev => ({ ...prev, lessons: formatted }));
      } catch (err) { console.error("Error lessons", err); } 
      finally { setIsLoading(prev => ({ ...prev, lessons: false })); }
    };
    fetchLessons();
  }, [selections.chapterId]);

  // --- Handlers ---
  const updateField = (field, value) => {
    setSelections(prev => {
      const newState = { ...prev, [field]: value };
      if (field === "categoryId") { newState.courseId = ""; newState.chapterId = ""; newState.selectedLessonIds = []; }
      if (field === "courseId") { newState.chapterId = ""; newState.selectedLessonIds = []; }
      if (field === "chapterId") { newState.selectedLessonIds = []; }
      return newState;
    });
  };

  // 🔥 2. منع الـ onUpdate من ضرب داتا فاضية للأب أول مرة
  useEffect(() => {
    if (isMounted.current) {
      onUpdate(index, selections.selectedLessonIds);
    } else {
      isMounted.current = true;
    }
  }, [selections.selectedLessonIds]);

  return (
    <div className="p-4 border border-slate-200 rounded-2xl bg-white mb-4 shadow-sm space-y-4 text-left">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-one bg-one/10 px-3 py-1 rounded-full">Set #{index + 1}</span>
        {!isOnlyOne && (
          <button type="button" onClick={() => onRemove(index)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500">Category</label>
          <Select 
            isLoading={isLoading.categories}
            placeholder={isLoading.categories ? "Loading..." : "Select Category..."} 
            options={options.categories}
            // 🔥 3. استخدام String() عشان نتجنب مشكلة الـ Type Mismatch (رقم vs نص)
            value={options.categories.find(o => String(o.value) === String(selections.categoryId)) || null} 
            onChange={(val) => updateField("categoryId", val?.value)} 
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500">Course</label>
          <Select 
            isLoading={isLoading.courses}
            placeholder={isLoading.courses ? "Fetching courses..." : "Select Course..."}
            isDisabled={!selections.categoryId || isLoading.courses} 
            options={options.courses} 
            value={options.courses.find(o => String(o.value) === String(selections.courseId)) || null}
            onChange={(val) => updateField("courseId", val?.value)} 
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500">Chapter</label>
          <Select 
            isLoading={isLoading.chapters}
            placeholder={isLoading.chapters ? "Fetching chapters..." : "Select Chapter..."}
            isDisabled={!selections.courseId || isLoading.chapters} 
            options={options.chapters} 
            value={options.chapters.find(o => String(o.value) === String(selections.chapterId)) || null}
            onChange={(val) => updateField("chapterId", val?.value)} 
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500">Lessons</label>
          <Select 
            isMulti 
            isLoading={isLoading.lessons}
            placeholder={isLoading.lessons ? "Fetching lessons..." : "Select Lessons..."}
            isDisabled={!selections.chapterId || isLoading.lessons} 
            options={options.lessons} 
            // 🔥 فلترة آمنة باستخدام String 
            value={options.lessons.filter(o => selections.selectedLessonIds.map(String).includes(String(o.value)))}
            onChange={(val) => updateField("selectedLessonIds", val ? val.map(v => v.value) : [])}
          />
        </div>
      </div>
    </div>
  );
};

export default LessonSelectionRow;