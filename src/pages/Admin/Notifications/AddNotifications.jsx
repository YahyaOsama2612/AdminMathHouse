import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import usePost from "@/hooks/usePost";
import useGet from "@/hooks/useGet";
import { SkelRows } from "@/components/admin/kit";
import Composer from "./parts/Composer";

const AddNotifications = () => {
  const navigate = useNavigate();
  const { postData } = usePost("/api/admin/notification");
  const { data: optionsData, loading: optionsLoading } = useGet("/api/admin/notification/select-options");
  const options = optionsData?.data;

  const onSave = async (payload) => {
    await postData(payload, "/api/admin/notification", "Notification sent successfully");
    navigate("/admin/notifications");
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Notifications</p>
          <h1 className="font-bold text-2xl text-gray-900 truncate">New notification</h1>
        </div>
        <button type="button" onClick={() => navigate("/admin/notifications")} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:text-one hover:border-one shrink-0 flex items-center gap-1.5"><ArrowLeft size={16} /> Back</button>
      </div>
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-w-3xl">
        {optionsLoading && !options ? <SkelRows n={5} /> : <Composer options={options} onSubmit={onSave} onCancel={() => navigate("/admin/notifications")} />}
      </section>
    </div>
  );
};

export default AddNotifications;
