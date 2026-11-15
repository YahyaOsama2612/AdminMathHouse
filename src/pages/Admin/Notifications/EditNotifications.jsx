import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import useGet from "@/hooks/useGet";
import usePut from "@/hooks/usePut";
import Errorpage from "@/components/Errorpage";
import { SkelRows } from "@/components/admin/kit";
import Composer, { toLocalInput } from "./parts/Composer";

const EditNotifications = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: notificationRes, loading: loadingOne, error: errorOne } = useGet(`/api/admin/notification/${id}`);
  const { data: optionsData, loading: loadingOptions, error: errorOptions } = useGet("/api/admin/notification/select-options");
  const { putData } = usePut(`/api/admin/notification/${id}`);

  const onSave = async (payload) => {
    await putData(payload, `/api/admin/notification/${id}`, "Notification updated successfully");
    navigate("/admin/notifications");
  };

  if (errorOne || errorOptions) return <Errorpage />;
  const n = notificationRes?.data;
  const options = optionsData?.data;
  const ready = n && options && !loadingOne && !loadingOptions;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Notifications</p>
          <h1 className="font-bold text-2xl text-gray-900 truncate">Edit notification</h1>
        </div>
        <button type="button" onClick={() => navigate("/admin/notifications")} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:text-one hover:border-one shrink-0 flex items-center gap-1.5"><ArrowLeft size={16} /> Back</button>
      </div>
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-w-3xl">
        {!ready ? <SkelRows n={5} /> : (
          <Composer
            key={n.id}
            options={options}
            submitLabel="Save changes"
            onSubmit={onSave}
            onCancel={() => navigate("/admin/notifications")}
            initial={{
              notification: n.notification || "",
              sendToAll: n.sendToAll ?? false,
              materialLink: n.materialLink || "",
              dateTime: n.dateTime ? toLocalInput(n.dateTime) : "",
              parentIds: n.parents?.map((p) => p.value) || [],
              studentIds: n.students?.map((s) => s.value) || [],
              teacherIds: n.teachers?.map((t) => t.value) || [],
            }}
          />
        )}
        {n?.materialFile && <p className="text-xs text-gray-500 mt-4">Attached file (kept as is): <a href={n.materialFile} target="_blank" rel="noopener noreferrer" className="font-semibold text-one hover:underline">open</a></p>}
      </section>
    </div>
  );
};

export default EditNotifications;
