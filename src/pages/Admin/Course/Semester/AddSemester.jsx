import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import AddPage from "@/components/AddPage";
import usePost from "@/hooks/usePost";

import { useLocation } from "react-router-dom";

const AddSemester = () => {
  const navigate = useNavigate();
  const { postData, loading: saving } = usePost("/api/admin/semester");
const location = useLocation();
 const coursesId = location.state;
 
  const fields = useMemo(
    () => [
      {
        name: "name",
        label: "Semester Name",
        type: "text",
        required: true,
        placeholder: "Enter semester name",
        section: "General Information",
      },
      
    ],
    []
  );

  const initialFormValues = useMemo(
    () => ({
      name: "",
    }),
    []
  );

  const onSave = async (formData) => {
    if (!formData.name?.trim()) {
      toast.error("Semester name is required");
      return;
    }

  

    const payload = {
      name: formData.name,
      courseId: coursesId,
    };

    try {
      await postData(payload, "/api/admin/semester", "Semester added successfully");
      navigate(`/admin/courses/semester/${coursesId}`)
    } catch (error) {
      throw error;
    }
  };

 
  return (
    <AddPage
      title="Add Semester"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(`/admin/courses/semester/${coursesId}`)}
       
      initialData={initialFormValues}
    />
  );
};

export default AddSemester;