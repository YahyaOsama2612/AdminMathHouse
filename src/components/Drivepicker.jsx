import React, { useState } from "react";
import useGet from "@/hooks/useGet";

/**
 * DrivePicker
 * Props:
 *  - isOpen: bool
 *  - onClose: () => void
 *  - onSelect: (file: { id, title, sourceUrl, type }) => void
 *  - allowedTypes: string[] — e.g. ["pdf"], ["image"], ["video"], or ["pdf","image"]
 *  - title: string — label shown in modal header
 */
const DrivePicker = ({
  isOpen,
  onClose,
  onSelect,
  allowedTypes = [],
  title = "Select from Drive",
}) => {
  const [currentFolderId, setCurrentFolderId] = useState(null);

  const url = currentFolderId
    ? `/api/drive/folders/${currentFolderId}`
    : "/api/drive/folders";

  const { data, loading } = useGet(url, { skip: !isOpen });

  const driveData = data?.data;

  const handleBack = () => {
    if (driveData?.currentFolder?.parentFolderId !== undefined) {
      setCurrentFolderId(driveData.currentFolder.parentFolderId);
    }
  };

  const handleSelectFile = (file) => {
    onSelect({
      id: file.id,
      title: file.title,
      sourceUrl: file.sourceUrl,
      bunnyGuid: file.bunnyGuid, // ✅ add this
      type: file.type,
    });
    onClose();
    setCurrentFolderId(null);
  };

  const handleClose = () => {
    onClose();
    setCurrentFolderId(null);
  };

  // Filter files based on allowedTypes (empty = allow all)
  const visibleFiles = (driveData?.files || []).filter((file) =>
    allowedTypes.length === 0
      ? true
      : allowedTypes.includes(file.type?.toLowerCase()),
  );

  if (!isOpen) return null;

  const fileIcon = (type) => {
    if (type === "video") return "🎬";
    if (type === "pdf") return "📕";
    if (type === "image") return "🖼️";
    return "📄";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {currentFolderId && (
              <button
                onClick={handleBack}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                  />
                </svg>
              </button>
            )}
            <div>
              <h2 className="text-lg font-bold text-slate-800">{title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {driveData?.currentFolder?.name || "My Drive"}
                {allowedTypes.length > 0 && (
                  <span className="ml-2 text-indigo-500">
                    • {allowedTypes.join(", ")} only
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Folders */}
              {driveData?.folders?.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setCurrentFolderId(folder.id)}
                  className="flex items-center gap-2 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-left transition-all group"
                >
                  <span className="text-2xl">📁</span>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 truncate">
                    {folder.name}
                  </span>
                </button>
              ))}

              {/* Files */}
              {visibleFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => handleSelectFile(file)}
                  className="flex items-start gap-2 p-4 rounded-2xl border border-slate-100 bg-white hover:bg-green-50 hover:border-green-300 text-left transition-all group shadow-sm hover:shadow"
                >
                  <span className="text-2xl shrink-0">
                    {fileIcon(file.type)}
                  </span>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-green-700 line-clamp-2 leading-snug">
                    {file.title}
                  </span>
                </button>
              ))}

              {/* Empty */}
              {driveData?.folders?.length === 0 &&
                visibleFiles.length === 0 && (
                  <div className="col-span-full py-16 flex flex-col items-center text-slate-400">
                    <span className="text-5xl mb-3">📭</span>
                    <p className="text-sm font-medium">No files here</p>
                  </div>
                )}

              {/* Files exist but filtered out */}
              {driveData?.files?.length > 0 &&
                visibleFiles.length === 0 &&
                driveData?.folders?.length === 0 && (
                  <div className="col-span-full py-16 flex flex-col items-center text-slate-400">
                    <span className="text-5xl mb-3">🔍</span>
                    <p className="text-sm font-medium">
                      No {allowedTypes.join(" or ")} files in this folder
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrivePicker;
