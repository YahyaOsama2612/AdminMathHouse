import React, { useState } from "react";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import useDelete from "@/hooks/useDelete";
import usePatch from "@/hooks/usePatch";
import usePut from "@/hooks/usePut";
import DrivePicker from "./Drivepicker";

const LessonIdeasModal = ({ open, onClose, lessonId }) => {
  // ✅ كل الـ hooks لازم تتنادى قبل أي early return (Rules of Hooks)
  const { data, loading, refetch } = useGet(
    `/api/admin/lessons/ideas/lesson/${lessonId}`,
    { skip: !open },
  );

  const { postData, loading: adding } = usePost("/api/admin/lessons/ideas");
  const { deleteData } = useDelete();
  const { patchData } = usePatch("/api/admin/lessons/ideas/swap-order");
  const { putData, loading: updating } = usePut("/api/admin/lessons/ideas");

  const [newIdea, setNewIdea] = useState("");
  const [newFile, setNewFile] = useState("");
  const [newFileTitle, setNewFileTitle] = useState("");
  const [newVideo, setNewVideo] = useState("");
  const [newVideoGuid, setNewVideoGuid] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingFile, setEditingFile] = useState("");
  const [editingFileTitle, setEditingFileTitle] = useState("");
  const [editingVideo, setEditingVideo] = useState("");
  const [editingVideoGuid, setEditingVideoGuid] = useState("");
  const [editingVideoTitle, setEditingVideoTitle] = useState("");

  // Which field the DrivePicker is currently filling:
  // "new-pdf" | "new-video" | "edit-pdf" | "edit-video" | null
  const [pickerTarget, setPickerTarget] = useState(null);

  // ✅ الـ early return بعد كل الـ hooks
  if (!open) return null;

  const ideas = data?.data?.ideas || [];

  const openPicker = (target) => setPickerTarget(target);
  const closePicker = () => setPickerTarget(null);

  const pickerAllowedTypes =
    pickerTarget === "new-pdf" || pickerTarget === "edit-pdf"
      ? ["pdf"]
      : pickerTarget === "new-video" || pickerTarget === "edit-video"
        ? ["video"]
        : [];

  const pickerTitle =
    pickerTarget === "new-pdf" || pickerTarget === "edit-pdf"
      ? "Select a PDF"
      : "Select a video";

  // ---------- Reset helpers ----------
  const resetNewForm = () => {
    setNewIdea("");
    setNewFile("");
    setNewFileTitle("");
    setNewVideo("");
    setNewVideoGuid("");
    setNewVideoTitle("");
  };

  const resetEditForm = () => {
    setEditingId(null);
    setEditingValue("");
    setEditingFile("");
    setEditingFileTitle("");
    setEditingVideo("");
    setEditingVideoGuid("");
    setEditingVideoTitle("");
  };

  const handleDriveSelect = (file) => {
    // للتأكد من شكل الداتا اللي راجعة من الـ Drive (امسحه بعد ما تتأكد)
    console.log("picked file:", file);

    // فيديوهات Bunny ممكن ماترجعش sourceUrl، فنستخدم الـ bunnyGuid كـ fallback
    const videoValue = file.sourceUrl || file.bunnyGuid || "";

    switch (pickerTarget) {
      case "new-pdf":
        setNewFile(file.sourceUrl || "");
        setNewFileTitle(file.title || "");
        break;
      case "new-video":
        setNewVideo(videoValue);
        setNewVideoGuid(file.bunnyGuid || "");
        setNewVideoTitle(file.title || "");
        break;
      case "edit-pdf":
        setEditingFile(file.sourceUrl || "");
        setEditingFileTitle(file.title || "");
        break;
      case "edit-video":
        setEditingVideo(videoValue);
        setEditingVideoGuid(file.bunnyGuid || "");
        setEditingVideoTitle(file.title || "");
        break;
      default:
        break;
    }
  };

  // Add new idea
  const handleAdd = async () => {
    if (!newIdea.trim()) return;

    await postData(
      {
        idea: newIdea,
        pdf: newFile,
        // الـ backend بيقبل واحد بس: external link في video أو Drive video في bunnyGuid
        video: newVideoGuid ? null : newVideo || null,
        bunnyGuid: newVideoGuid || null,
        lessonId,
      },
      "/api/admin/lessons/ideas",
      "Idea added",
    );

    resetNewForm();
    refetch();
  };

  // Update existing idea
  const handleUpdate = async (id) => {
    if (!editingValue.trim()) return;

    await putData(
      {
        idea: editingValue,
        pdf: editingFile,
        // واحد بس منهم يتبعت، والتاني null عشان يتمسح لو كان متخزّن قبل كده
        video: editingVideoGuid ? null : editingVideo || null,
        bunnyGuid: editingVideoGuid || null,
      },
      `/api/admin/lessons/ideas/${id}`,
      "Idea updated",
    );

    resetEditForm();
    refetch();
  };

  const startEditing = (idea) => {
    setEditingId(idea.id);
    setEditingValue(idea.idea || "");
    setEditingFile(idea.pdf || "");
    setEditingFileTitle("");
    setEditingVideo(idea.video || idea.bunnyGuid || "");
    setEditingVideoGuid(idea.bunnyGuid || "");
    setEditingVideoTitle("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] p-6 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl text-one font-bold">Lesson Ideas</h2>
          <button onClick={onClose} className="text-four text-xl">
            ✕
          </button>
        </div>

        {/* Add Idea */}
        <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Add New Idea</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={newIdea}
              onChange={(e) => setNewIdea(e.target.value)}
              placeholder="Enter new idea"
              className="flex-1 border rounded-lg px-3 py-2"
            />

            <DriveFilePicker
              label="PDF"
              icon="📕"
              url={newFile}
              title={newFileTitle}
              onPick={() => openPicker("new-pdf")}
              onClear={() => {
                setNewFile("");
                setNewFileTitle("");
              }}
            />

            <DriveFilePicker
              label="Video"
              icon="🎬"
              url={newVideo}
              title={newVideoTitle}
              onPick={() => openPicker("new-video")}
              onClear={() => {
                setNewVideo("");
                setNewVideoGuid("");
                setNewVideoTitle("");
              }}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAdd}
              disabled={adding}
              className="px-6 py-2 bg-one text-white rounded-lg hover:opacity-90"
            >
              {adding ? "Adding..." : "Add Idea"}
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-5 mt-6">
          <h3 className="text-lg font-semibold text-gray-700">Current Ideas</h3>
          <p className="text-sm text-gray-500 mt-1">
            Existing ideas for this lesson.
          </p>
        </div>

        {/* Ideas List */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 min-h-0 custom-scroll">
          {ideas.map((idea, index) => (
            <div
              key={idea.id}
              className="border rounded-xl p-4 bg-gray-50 space-y-4"
            >
              {/* Idea & file/video */}
              <div className="flex flex-col gap-4">
                {editingId === idea.id ? (
                  <div className="grid md:grid-cols-3 gap-3">
                    <input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="flex-1 border rounded px-2 py-1"
                      placeholder="Idea"
                    />

                    <DriveFilePicker
                      label="PDF"
                      icon="📕"
                      url={editingFile}
                      title={editingFileTitle}
                      onPick={() => openPicker("edit-pdf")}
                      onClear={() => {
                        setEditingFile("");
                        setEditingFileTitle("");
                      }}
                    />

                    <DriveFilePicker
                      label="Video"
                      icon="🎬"
                      url={editingVideo}
                      title={editingVideoTitle}
                      onPick={() => openPicker("edit-video")}
                      onClear={() => {
                        setEditingVideo("");
                        setEditingVideoGuid("");
                        setEditingVideoTitle("");
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-1">
                    <p className="font-medium">{idea.idea}</p>
                    {idea.pdf && (
                      <a
                        href={idea.pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 underline break-all"
                      >
                        📎 File: {idea.pdf}
                      </a>
                    )}
                    {idea.video && (
                      <a
                        href={idea.video}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 underline break-all"
                      >
                        🎥 Video: {idea.video}
                      </a>
                    )}
                    {!idea.video && idea.bunnyGuid && (
                      <p className="text-sm text-gray-600 break-all">
                        🎥 Drive video: {idea.bunnyGuid}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-2 md:mt-0">
                {/* Move Up */}
                <button
                  disabled={index === 0}
                  onClick={async () => {
                    await patchData(
                      { ideaIdA: idea.id, ideaIdB: ideas[index - 1]?.id },
                      null,
                      "Idea moved up",
                    );
                    refetch();
                  }}
                >
                  ↑
                </button>

                {/* Move Down */}
                <button
                  disabled={index === ideas.length - 1}
                  onClick={async () => {
                    await patchData(
                      { ideaIdA: idea.id, ideaIdB: ideas[index + 1]?.id },
                      null,
                      "Idea moved down",
                    );
                    refetch();
                  }}
                >
                  ↓
                </button>

                {/* Edit / Save */}
                {editingId === idea.id ? (
                  <>
                    <button
                      disabled={updating}
                      onClick={() => handleUpdate(idea.id)}
                      className="text-green-600"
                    >
                      {updating ? "Saving..." : "Save"}
                    </button>
                    <button onClick={resetEditForm} className="text-gray-500">
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => startEditing(idea)}
                    className="text-blue-600"
                  >
                    Edit
                  </button>
                )}

                {/* Delete */}
                <button
                  onClick={async () => {
                    await deleteData(`/api/admin/lessons/ideas/${idea.id}`);
                    refetch();
                  }}
                  className="text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {!ideas.length && !loading && (
            <p className="text-center text-gray-500 mt-4">No ideas yet</p>
          )}
        </div>
      </div>

      {/* Shared Drive picker, reused for new/edit + pdf/video */}
      <DrivePicker
        isOpen={pickerTarget !== null}
        onClose={closePicker}
        onSelect={handleDriveSelect}
        allowedTypes={pickerAllowedTypes}
        title={pickerTitle}
      />
    </div>
  );
};

/**
 * Small helper: shows a "Select from Drive" button, or the picked
 * file with a clear (✕) action once something has been chosen.
 */
const DriveFilePicker = ({ label, icon, url, title, onPick, onClear }) => {
  if (!url) {
    return (
      <button
        type="button"
        onClick={onPick}
        className="flex-1 border border-dashed rounded-lg px-3 py-2 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors text-left"
      >
        {icon} Select {label} from Drive
      </button>
    );
  }

  return (
    <div className="flex-1 flex items-center gap-2 border rounded-lg px-3 py-2 bg-white">
      <span className="text-lg shrink-0">{icon}</span>
      <button
        type="button"
        onClick={onPick}
        className="flex-1 text-sm text-left truncate text-gray-700 hover:text-indigo-600"
        title={title || url}
      >
        {title || url}
      </button>
      <button
        type="button"
        onClick={onClear}
        className="text-gray-400 hover:text-red-500 shrink-0"
        aria-label={`Clear ${label}`}
      >
        ✕
      </button>
    </div>
  );
};

export default LessonIdeasModal;