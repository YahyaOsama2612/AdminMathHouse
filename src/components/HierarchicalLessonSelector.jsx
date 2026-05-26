import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import LessonSelectionRow from "./LessonSelectionRow";

const EMPTY_LESSONS = [];

const HierarchicalLessonSelector = ({
  value,
  onChange,
  initialLessons = EMPTY_LESSONS,
}) => {
  const [rows, setRows] = useState([]);
  const [selectedIdsPerRow, setSelectedIdsPerRow] = useState({});

  useEffect(() => {
    if (initialLessons && initialLessons.length > 0) {
      const grouped = {};

      initialLessons.forEach((lesson) => {
        const chapterId = lesson.chapter?.id;
        if (!chapterId) return;

        if (!grouped[chapterId]) {
          grouped[chapterId] = {
            categoryId: lesson.category?.id,
            subCategoryId: lesson.subCategory?.id || null,
            courseId: lesson.course?.id,
            chapterIds: [chapterId],
            selectedLessons: [],
          };
        } else {
          if (!grouped[chapterId].chapterIds.includes(chapterId)) {
            grouped[chapterId].chapterIds.push(chapterId);
          }
        }

        grouped[chapterId].selectedLessons.push({
          value: lesson.id,
          label: lesson.name,
        });
      });

      const initialRowsData = Object.values(grouped);
      setRows(initialRowsData);

      const initialIdsState = {};
      const fullDetailsArray = [];

      initialRowsData.forEach((row, idx) => {
        const rowLessonIds = row.selectedLessons.map((l) => l.value);
        initialIdsState[idx] = rowLessonIds;

        fullDetailsArray.push({
          categoryId: row.categoryId || null,
          subCategoryId: row.subCategoryId || null,
          courseId: row.courseId || null,
          chapterIds: row.chapterIds || [],
          lessonIds: rowLessonIds,
        });
      });

      setSelectedIdsPerRow(initialIdsState);
      const allIds = initialLessons.map((l) => l.id);
      onChange(allIds, fullDetailsArray);
    } else {
      if (rows.length === 0) {
        setRows([{}]);
      }
    }
  }, [initialLessons]);

  const handleUpdateRow = (index, selectedIds, childSelections) => {
    setSelectedIdsPerRow((prev) => {
      const newState = { ...prev, [index]: selectedIds };
      const allIds = Array.from(new Set(Object.values(newState).flat()));

      setRows((prevRows) => {
        const updatedRows = [...prevRows];

        if (childSelections) {
          updatedRows[index] = {
            ...updatedRows[index],
            categoryId: childSelections.categoryId || null,
            subCategoryId: childSelections.subCategoryId || null,
            courseId: childSelections.courseId || null,
            chapterIds: childSelections.chapterIds || [],
          };
        }

        const updatedRowsDetails = updatedRows.map((row, idx) => ({
          categoryId: row.categoryId || null,
          subCategoryId: row.subCategoryId || null,
          courseId: row.courseId || null,
          chapterIds: row.chapterIds || [],
          lessonIds: newState[idx] || [],
        }));

        onChange(allIds, updatedRowsDetails);
        return updatedRows;
      });

      return newState;
    });
  };

  const addRow = () => setRows([...rows, {}]);

  const removeRow = (index) => {
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);

    setSelectedIdsPerRow((prev) => {
      const newState = { ...prev };
      delete newState[index];
      const allIds = Array.from(new Set(Object.values(newState).flat()));

      const updatedRowsDetails = newRows.map((row, idx) => ({
        categoryId: row.categoryId || null,
        subCategoryId: row.subCategoryId || null,
        courseId: row.courseId || null,
        chapterIds: row.chapterIds || [],
        lessonIds: newState[idx] || [],
      }));

      onChange(allIds, updatedRowsDetails);
      return newState;
    });
  };

  return (
    <div className="space-y-4 w-full">
      {rows.map((rowData, index) => (
        <LessonSelectionRow
          key={index}
          index={index}
          initialData={rowData}
          onUpdate={(idx, ids, fullInfo) => handleUpdateRow(idx, ids, fullInfo)}
          onRemove={removeRow}
          isOnlyOne={rows.length === 1}
        />
      ))}

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-2 px-6 py-3 border-2 border-dashed border-one/30 text-one rounded-2xl hover:bg-one/5 transition-all font-bold text-sm"
      >
        <Plus size={18} />
        Add Another Lesson Group
      </button>
    </div>
  );
};

export default HierarchicalLessonSelector;