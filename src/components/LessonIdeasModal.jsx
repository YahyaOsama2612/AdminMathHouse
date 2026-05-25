import React, { useState } from "react";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import useDelete from "@/hooks/useDelete";
import usePatch from "@/hooks/usePatch";
import usePut from "@/hooks/usePut";

const LessonIdeasModal = ({ open, onClose, lessonId }) => {
  if (!open) return null;

  const { data, loading, refetch } = useGet(
    `/api/admin/lessons/ideas/lesson/${lessonId}`
  );

  const { postData, loading: adding } = usePost("/api/admin/lessons/ideas");
  const { deleteData } = useDelete();
  const { patchData } = usePatch("/api/admin/lessons/ideas/swap-order");
  const { putData, loading: updating } = usePut("/api/admin/lessons/ideas");

  const [newIdea, setNewIdea] = useState("");
  const [newFile, setNewFile] = useState("");
  const [newVideo, setNewVideo] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingFile, setEditingFile] = useState("");
  const [editingVideo, setEditingVideo] = useState("");

  const ideas = data?.data?.ideas || [];

  // Add new idea
  const handleAdd = async () => {
    if (!newIdea.trim()) return;

    await postData(
      {
        idea: newIdea,
        pdf: newFile,
        video: newVideo,
        lessonId,
      },
      "/api/admin/lessons/ideas",
      "Idea added"
    );

    setNewIdea("");
    setNewFile("");
    setNewVideo("");
    refetch();
  };

  // Update existing idea
  const handleUpdate = async (id) => {
    if (!editingValue.trim()) return;

    await putData(
      {
        idea: editingValue,
        pdf: editingFile,
        video: editingVideo,
      },
      `/api/admin/lessons/ideas/${id}`,
      "Idea updated"
    );

    setEditingId(null);
    setEditingValue("");
    setEditingFile("");
    setEditingVideo("");
    refetch();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl p-6 space-y-6 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl text-one font-bold">Lesson Ideas</h2>
          <button onClick={onClose} className="text-four text-xl">✕</button>
        </div>

        {/* Add Idea */}
        <div className="flex flex-col md:flex-row gap-2">
          <input
            value={newIdea}
            onChange={(e) => setNewIdea(e.target.value)}
            placeholder="Enter new idea"
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <input
            value={newFile}
            onChange={(e) => setNewFile(e.target.value)}
            placeholder="File (URL or path)"
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <input
            value={newVideo}
            onChange={(e) => setNewVideo(e.target.value)}
            placeholder="Video URL"
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <button
            onClick={handleAdd}
            disabled={adding}
            className="px-4 py-2 bg-one text-white rounded-lg"
          >
            Add
          </button>
        </div>

        {/* Ideas List */}
        <div className="space-y-2 max-h-[500px] overflow-auto">
          {ideas.map((idea, index) => (
            <div
              key={idea.id}
              className="flex flex-col md:flex-row justify-between items-start md:items-center border rounded-lg p-3 gap-2"
            >
              {/* Idea & file/video */}
              {editingId === idea.id ? (
                <div className="flex flex-col md:flex-row flex-1 gap-2">
                  <input
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="flex-1 border rounded px-2 py-1"
                    placeholder="Idea"
                  />
                  <input
                    value={editingFile}
                    onChange={(e) => setEditingFile(e.target.value)}
                    className="flex-1 border rounded px-2 py-1"
                    placeholder="File"
                  />
                  <input
                    value={editingVideo}
                    onChange={(e) => setEditingVideo(e.target.value)}
                    className="flex-1 border rounded px-2 py-1"
                    placeholder="Video"
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
    className="text-sm text-blue-600 underline"
  >
    📎 File: {idea.pdf}
  </a>
)}
{idea.video && (
  <a
    href={idea.video}
    target="_blank"
    rel="noopener noreferrer"
    className="text-sm text-blue-600 underline"
  >
    🎥 Video: {idea.video}
  </a>
)}

                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-2 md:mt-0">
                {/* Move Up */}
                <button
                  disabled={index === 0}
                  onClick={async () => {
                    await patchData(
                      { ideaIdA: idea.id, ideaIdB: ideas[index - 1]?.id },
                      null,
                      "Idea moved up"
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
                      "Idea moved down"
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
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditingValue("");
                        setEditingFile("");
                        setEditingVideo("");
                      }}
                      className="text-gray-500"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(idea.id);
                      setEditingValue(idea.idea);
                      setEditingFile(idea.file || "");
                      setEditingVideo(idea.video || "");
                    }}
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
    </div>
  );
};

export default LessonIdeasModal;
