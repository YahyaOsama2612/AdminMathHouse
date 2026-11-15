import React, { useState } from "react";
import { ArrowLeft, X, Folder, FileText, Film, Image as ImageIcon, File } from "lucide-react";
import useGet from "@/hooks/useGet";

/**
 * DrivePicker — browse the Drive folders and pick one file.
 * Props:
 *  - isOpen: bool
 *  - onClose: () => void
 *  - onSelect: (file: { id, title, sourceUrl, bunnyGuid, type }) => void
 *  - allowedTypes: string[] — e.g. ["pdf"], ["image"], ["video"], or ["pdf","image"]
 *  - title: string — label shown in modal header
 */
const byName = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });

const FILE_ICON = {
  video: [Film, "#7c3aed", "#f5f3ff"],
  pdf: [FileText, "#b91c1c", "#fef2f2"],
  image: [ImageIcon, "#0f766e", "#f0fdfa"],
};

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
      bunnyGuid: file.bunnyGuid,
      type: file.type,
    });
    onClose();
    setCurrentFolderId(null);
  };

  const handleClose = () => {
    onClose();
    setCurrentFolderId(null);
  };

  if (!isOpen) return null;

  const folders = [...(driveData?.folders || [])].sort((a, b) => byName(a.name, b.name));
  const allFiles = driveData?.files || [];
  // Filter files based on allowedTypes (empty = allow all)
  const visibleFiles = allFiles
    .filter((file) => allowedTypes.length === 0 || allowedTypes.includes(file.type?.toLowerCase()))
    .sort((a, b) => byName(a.title, b.title));
  const hiddenFiles = allFiles.length - visibleFiles.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-100" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            {currentFolderId && (
              <button type="button" onClick={handleBack} className="a-act" title="Back" aria-label="Back">
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="font-bold text-gray-800">{title}</h2>
              <p className="text-xs text-gray-400 truncate">
                {driveData?.currentFolder?.name || "My Drive"}
                {allowedTypes.length > 0 && <span className="ml-2 font-semibold text-one">· {allowedTypes.join(", ")} only</span>}
              </p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="a-act" title="Close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skel h-14"></div>)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {folders.map((folder) => (
                <button
                  type="button"
                  key={folder.id}
                  onClick={() => setCurrentFolderId(folder.id)}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-red-50/60 hover:border-one/30 text-left transition group min-w-0"
                  title={folder.name}
                >
                  <Folder size={18} className="text-amber-500 shrink-0" fill="currentColor" />
                  <span className="text-sm font-semibold text-gray-700 group-hover:text-one truncate">{folder.name}</span>
                </button>
              ))}

              {visibleFiles.map((file) => {
                const [Icon, fg, bg] = FILE_ICON[file.type?.toLowerCase()] || [File, "#475569", "#f1f5f9"];
                return (
                  <button
                    type="button"
                    key={file.id}
                    onClick={() => handleSelectFile(file)}
                    className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-100 bg-white hover:border-one/40 hover:shadow-md text-left transition group shadow-sm min-w-0"
                    title={file.title}
                  >
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ color: fg, background: bg }}><Icon size={16} /></span>
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-one line-clamp-2 leading-snug">{file.title}</span>
                  </button>
                );
              })}

              {!folders.length && !visibleFiles.length && (
                <div className="col-span-full py-14 flex flex-col items-center text-gray-400">
                  <Folder size={36} className="mb-2 text-gray-300" />
                  <p className="text-sm font-semibold">
                    {hiddenFiles > 0 ? `No ${allowedTypes.join(" or ")} files in this folder` : "No files here"}
                  </p>
                  {hiddenFiles > 0 && <p className="text-xs mt-1">{hiddenFiles} other file{hiddenFiles === 1 ? "" : "s"} hidden</p>}
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
