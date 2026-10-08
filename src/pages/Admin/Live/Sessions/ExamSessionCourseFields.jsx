import { useMemo } from "react";
import Select from "react-select";
import useGet from "@/hooks/useGet";

const ExamSessionCourseFields = ({
  categoryId,
  subCategoryId,
  courseId,
  onChange,
}) => {
  const {
    data: categoriesResponse,
    loading: categoriesLoading,
    error: categoriesError,
  } = useGet("/api/admin/session/select/category");
  const {
    data: subCategoriesResponse,
    loading: subCategoriesLoading,
    error: subCategoriesError,
  } = useGet(
    categoryId
      ? `/api/admin/session/select/sub-category?categoryId=${categoryId}`
      : "",
  );
  const {
    data: coursesResponse,
    loading: coursesLoading,
    error: coursesError,
  } = useGet(
    subCategoryId ? `/api/admin/session/select/course/${subCategoryId}` : "",
  );

  const categoryOptions = useMemo(
    () =>
      (categoriesResponse?.data?.categories || []).map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [categoriesResponse],
  );
  const subCategoryOptions = useMemo(
    () =>
      (subCategoriesResponse?.data?.subCategories || []).map(
        (subCategory) => ({
          value: subCategory.id,
          label: subCategory.name,
        }),
      ),
    [subCategoriesResponse],
  );
  const courseOptions = useMemo(
    () =>
      (coursesResponse?.data?.courses || []).map((course) => ({
        value: course.id,
        label: course.name,
      })),
    [coursesResponse],
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-bold text-slate-700">Category</label>
        <Select
          options={categoryOptions}
          value={
            categoryOptions.find(
              (option) => String(option.value) === String(categoryId),
            ) || null
          }
          onChange={(option) =>
            onChange("examCategoryId", option?.value || "")
          }
          isLoading={categoriesLoading}
          isDisabled={categoriesLoading || Boolean(categoriesError)}
          isClearable
          placeholder="Select category..."
        />
        {categoriesError && (
          <p className="text-xs text-red-500">Could not load categories.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-bold text-slate-700">
          Subcategory
        </label>
        <Select
          options={subCategoryOptions}
          value={
            subCategoryOptions.find(
              (option) => String(option.value) === String(subCategoryId),
            ) || null
          }
          onChange={(option) =>
            onChange("examSubCategoryId", option?.value || "")
          }
          isLoading={subCategoriesLoading}
          isDisabled={
            !categoryId || subCategoriesLoading || Boolean(subCategoriesError)
          }
          isClearable
          placeholder="Select subcategory..."
        />
        {subCategoriesError && (
          <p className="text-xs text-red-500">Could not load subcategories.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-bold text-slate-700">Course</label>
        <Select
          options={courseOptions}
          value={
            courseOptions.find(
              (option) => String(option.value) === String(courseId),
            ) || null
          }
          onChange={(option) => onChange("examCourseId", option?.value || "")}
          isLoading={coursesLoading}
          isDisabled={!subCategoryId || coursesLoading || Boolean(coursesError)}
          isClearable
          placeholder="Select course..."
        />
        {coursesError && (
          <p className="text-xs text-red-500">Could not load courses.</p>
        )}
      </div>
    </div>
  );
};

export default ExamSessionCourseFields;
