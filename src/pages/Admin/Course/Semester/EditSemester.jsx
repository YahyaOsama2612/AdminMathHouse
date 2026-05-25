import React, { useMemo } from "react";
import { useNavigate, useParams ,useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import AddPage from "@/components/AddPage";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Loader from "@/components/Loader";
import Errorpage from "@/components/Errorpage";
const EditSemester = () => {
  const navigate = useNavigate();
  const { id } = useParams();
const location = useLocation();
 const coursesId = location.state;
  const { data: semesterRes, loading: loadingOne ,error: errorOne } = useGet(`/api/admin/semester/${id}`);
  const { putData, loading: saving } = usePut(`/api/admin/semester/${id}`);

 

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

  const onSave = async (formData) => {
  
    const payload = {
      name: formData.name,
      courseId: coursesId,
    };

    await putData(payload, `/api/admin/semester/${id}`, "Semester updated successfully");
    navigate(-1);
  };

  if ( loadingOne) {
    return (
      <div>
        <Loader />
      </div>
    );
  }
  if ( errorOne ) {
    return (
      <div>
        <Errorpage />
      </div>
    );
  }

const semester = semesterRes?.data?.data?.[0];
  return (
    <AddPage
      title="Edit Semester"
      fields={fields}
      onSave={onSave}
      onCancel={() => navigate(-1)}
      initialData={{
        name: semester?.name || "",
        categoryId: semester?.categoryId || "",
      }}
    />
  );
};

export default EditSemester;
