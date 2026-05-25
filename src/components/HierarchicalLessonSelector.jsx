import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import LessonSelectionRow from "./LessonSelectionRow";

// تعريف المصفوفة الفارغة خارج الكومبوننت عشان نحافظ على الـ Reference بتاعها في الذاكرة
// وده اللي هيمنع الـ Infinite Loop
const EMPTY_LESSONS = [];

const HierarchicalLessonSelector = ({ value, onChange, initialLessons = EMPTY_LESSONS }) => {
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
            courseId: lesson.course?.id,
            chapterId: chapterId,
            selectedLessons: [],
          };
        }
        
        grouped[chapterId].selectedLessons.push({
          value: lesson.id,
          label: lesson.name,
        });
      });

      const initialRowsData = Object.values(grouped);
      setRows(initialRowsData);

      // بنخزن الـ IDs بتاعة كل الصفوف في الـ State عشان متتمسحش لما نعدل صف واحد
      const initialIdsState = {};
      initialRowsData.forEach((row, idx) => {
        initialIdsState[idx] = row.selectedLessons.map(l => l.value);
      });
      setSelectedIdsPerRow(initialIdsState);

      const allIds = initialLessons.map((l) => l.id);
      onChange(allIds);
    } else {
      // شرط إضافي عشان نتأكد إننا مش بنعمل setRows لو هي أصلاً فيها صف فاضي
      if (rows.length === 0) {
        setRows([{}]); 
      }
    }
  }, [initialLessons]); // دلوقتي initialLessons مش هتعمل مشاكل لأن الريفرنس بتاعها ثابت

  const handleUpdateRow = (index, selectedIds) => {
    setSelectedIdsPerRow((prev) => {
      const newState = { ...prev, [index]: selectedIds };
      const allIds = Array.from(new Set(Object.values(newState).flat()));
      onChange(allIds);
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
      onChange(allIds);
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
          onUpdate={handleUpdateRow}
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