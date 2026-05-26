import React, { useState, useEffect, useRef } from "react";
import Select from "react-select";
import { Trash2 } from "lucide-react";
import api from "@/api/api";

const LessonSelectionRow = ({
  index,
  onUpdate,
  onRemove,
  isOnlyOne,
  initialData = {},
}) => {
  const isMounted = useRef(false);

  const extractLessonIds = (lessons) => {
    if (!lessons || !Array.isArray(lessons)) return [];
    return lessons.map((l) => (typeof l === "object" ? l.value || l.id : l));
  };

  const [selections, setSelections] = useState({
    categoryId: initialData.categoryId || "",
    subCategoryId: initialData.subCategoryId || "",
    courseId: initialData.courseId || "",
    chapterIds: initialData.chapterIds || [],
    selectedLessonIds: extractLessonIds(initialData.selectedLessons),
  });

  const [options, setOptions] = useState({
    categories: [],
    subCategories: [],
    courses: [],
    chapters: [],
    lessons: [],
  });

  const [isLoading, setIsLoading] = useState({
    categories: false,
    subCategories: false,
    courses: false,
    chapters: false,
    lessons: false,
  });

  // 1. Fetch Main Categories (Root levels)
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading((prev) => ({ ...prev, categories: true }));
      try {
        const res = await api.get("/api/admin/session/select/category");
        const formatted =
          res.data?.data?.categories.map((cat) => ({
            value: cat.id,
            label: cat.name,
          })) || [];
        setOptions((prev) => ({ ...prev, categories: formatted }));
      } catch (err) {
        console.error("Error fetching categories:", err);
      } finally {
        setIsLoading((prev) => ({ ...prev, categories: false }));
      }
    };
    fetchCategories();
  }, []);

  // 2. Fetch Sub-Categories using Query Parameter (?categoryId=ID)
  useEffect(() => {
    if (!selections.categoryId) {
      setOptions((prev) => ({
        ...prev,
        subCategories: [],
        courses: [],
        chapters: [],
        lessons: [],
      }));
      return;
    }
    const fetchSubCategories = async () => {
      setIsLoading((prev) => ({ ...prev, subCategories: true }));
      try {
        const res = await api.get(
          `/api/admin/session/select/sub-category?categoryId=${selections.categoryId}`,
        );
        const formatted =
          res.data?.data?.subCategories.map((sub) => ({
            value: sub.id,
            label: sub.name,
          })) || [];
        setOptions((prev) => ({ ...prev, subCategories: formatted }));
      } catch (err) {
        console.error("Error fetching sub-categories:", err);
      } finally {
        setIsLoading((prev) => ({ ...prev, subCategories: false }));
      }
    };
    fetchSubCategories();
  }, [selections.categoryId]);

  // 3. Fetch Courses when subCategoryId changes
  useEffect(() => {
    if (!selections.subCategoryId) {
      setOptions((prev) => ({
        ...prev,
        courses: [],
        chapters: [],
        lessons: [],
      }));
      return;
    }
    const fetchCourses = async () => {
      setIsLoading((prev) => ({ ...prev, courses: true }));
      try {
        const res = await api.get(
          `/api/admin/session/select/course/${selections.subCategoryId}`,
        );
        const formatted =
          res.data?.data?.courses.map((c) => ({
            value: c.id,
            label: c.name,
          })) || [];
        setOptions((prev) => ({ ...prev, courses: formatted }));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading((prev) => ({ ...prev, courses: false }));
      }
    };
    fetchCourses();
  }, [selections.subCategoryId]);

  // 4. Fetch Chapters when courseId changes
  useEffect(() => {
    if (!selections.courseId) {
      setOptions((prev) => ({ ...prev, chapters: [], lessons: [] }));
      return;
    }
    const fetchChapters = async () => {
      setIsLoading((prev) => ({ ...prev, chapters: true }));
      try {
        const res = await api.get(
          `/api/admin/session/select/chapter/${selections.courseId}`,
        );
        const formatted =
          res.data?.data?.chapters.map((c) => ({
            value: c.id,
            label: c.name,
          })) || [];
        setOptions((prev) => ({ ...prev, chapters: formatted }));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading((prev) => ({ ...prev, chapters: false }));
      }
    };
    fetchChapters();
  }, [selections.courseId]);

  // 5. Fetch Lessons for selected chapters
  useEffect(() => {
    if (!selections.chapterIds || selections.chapterIds.length === 0) {
      setOptions((prev) => ({ ...prev, lessons: [] }));
      return;
    }
    const fetchLessons = async () => {
      setIsLoading((prev) => ({ ...prev, lessons: true }));
      try {
        const results = await Promise.all(
          selections.chapterIds.map((chapterId) =>
            api.get(`/api/admin/session/select/lesson/${chapterId}`),
          ),
        );
        const allLessons = results.flatMap(
          (res) =>
            res.data?.data?.lessons.map((l) => ({
              value: l.id,
              label: l.name,
            })) || [],
        );
        const unique = Array.from(
          new Map(allLessons.map((l) => [l.value, l])).values(),
        );
        setOptions((prev) => ({ ...prev, lessons: unique }));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading((prev) => ({ ...prev, lessons: false }));
      }
    };
    fetchLessons();
  }, [selections.chapterIds]);

  const updateField = (field, value) => {
    setSelections((prev) => {
      const newState = { ...prev, [field]: value };

      if (field === "categoryId") {
        newState.subCategoryId = "";
        newState.courseId = "";
        newState.chapterIds = [];
        newState.selectedLessonIds = [];
      }
      if (field === "subCategoryId") {
        newState.courseId = "";
        newState.chapterIds = [];
        newState.selectedLessonIds = [];
      }
      if (field === "courseId") {
        newState.chapterIds = [];
        newState.selectedLessonIds = [];
      }
      if (field === "chapterIds") {
        newState.selectedLessonIds = [];
      }
      return newState;
    });
  };

  // Notify parent components with both IDs
  useEffect(() => {
    if (isMounted.current) {
      onUpdate(index, selections.selectedLessonIds, {
        categoryId: selections.categoryId || null,
        subCategoryId: selections.subCategoryId || null,
        courseId: selections.courseId || null,
        chapterIds: selections.chapterIds || [],
      });
    } else {
      isMounted.current = true;
    }
  }, [
    selections.selectedLessonIds,
    selections.categoryId,
    selections.subCategoryId,
    selections.courseId,
    selections.chapterIds,
  ]);

  return (
    <div className="p-4 border border-slate-200 rounded-2xl bg-white mb-4 shadow-sm space-y-4 text-left">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-one bg-one/10 px-3 py-1 rounded-full">
          Set #{index + 1}
        </span>
        {!isOnlyOne && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Category */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500">
            Category
          </label>
          <Select
            isLoading={isLoading.categories}
            placeholder={
              isLoading.categories ? "Loading..." : "Select Category..."
            }
            options={options.categories}
            value={
              options.categories.find(
                (o) => String(o.value) === String(selections.categoryId),
              ) || null
            }
            onChange={(val) => updateField("categoryId", val?.value || "")}
          />
        </div>

        {/* Sub-Category */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500">
            Sub-Category
          </label>
          <Select
            isLoading={isLoading.subCategories}
            placeholder={
              isLoading.subCategories ? "Loading..." : "Select Sub-Category..."
            }
            isDisabled={!selections.categoryId || isLoading.subCategories}
            options={options.subCategories}
            value={
              options.subCategories.find(
                (o) => String(o.value) === String(selections.subCategoryId),
              ) || null
            }
            onChange={(val) => updateField("subCategoryId", val?.value || "")}
          />
        </div>

        {/* Course */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500">Course</label>
          <Select
            isLoading={isLoading.courses}
            placeholder={
              isLoading.courses ? "Fetching courses..." : "Select Course..."
            }
            isDisabled={!selections.subCategoryId || isLoading.courses}
            options={options.courses}
            value={
              options.courses.find(
                (o) => String(o.value) === String(selections.courseId),
              ) || null
            }
            onChange={(val) => updateField("courseId", val?.value || "")}
          />
        </div>

        {/* Chapters */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500">
            Chapters
          </label>
          <Select
            isMulti
            isLoading={isLoading.chapters}
            placeholder={
              isLoading.chapters ? "Fetching chapters..." : "Select Chapters..."
            }
            isDisabled={!selections.courseId || isLoading.chapters}
            options={options.chapters}
            value={options.chapters.filter((o) =>
              selections.chapterIds.map(String).includes(String(o.value)),
            )}
            onChange={(val) =>
              updateField("chapterIds", val ? val.map((v) => v.value) : [])
            }
          />
        </div>

        {/* Lessons */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500">
            Lessons
          </label>
          <Select
            isMulti
            isLoading={isLoading.lessons}
            placeholder={
              isLoading.lessons ? "Fetching lessons..." : "Select Lessons..."
            }
            isDisabled={!selections.chapterIds.length || isLoading.lessons}
            options={options.lessons}
            value={options.lessons.filter((o) =>
              selections.selectedLessonIds
                .map(String)
                .includes(String(o.value)),
            )}
            onChange={(val) =>
              updateField(
                "selectedLessonIds",
                val ? val.map((v) => v.value) : [],
              )
            }
          />
        </div>
      </div>
    </div>
  );
};

export default LessonSelectionRow;
