import React, { useState } from "react";
import { API_URL } from "@/api/api";
import useGet from "../hooks/useGet";
import usePost from "../hooks/usePost";
import useDelete from "../hooks/useDelete";
import { Toaster, toast } from "react-hot-toast";
import * as tus from "tus-js-client";
import {
  ArrowLeft, ExternalLink, FileText, FileVideo, Folder, FolderPlus, FolderUp,
  Image as ImageIcon, Loader2, Play, Trash2, Upload, X,
} from "lucide-react";
import { Card, Empty, Modal, PageHead, Pill, SkelRows } from "@/components/admin/kit";

// Secure HLS player (watermark + custom controls)
import { SecureVideoPlayer } from "./SecureVideoPlayer";

/* Drive (MathPortal design): its own top bar (outside the admin shell), a PageHead with the current
   folder, four action cards (new folder / upload video via TUS / upload PDF-image / upload a whole
   folder) and one card listing the folder's contents as a table. */

const FILE_KIND = {
  folder: { label: "Folder", tone: "amber", Icon: Folder, tile: "bg-amber-50 text-amber-600" },
  video: { label: "Video", tone: "purple", Icon: FileVideo, tile: "bg-purple-50 text-purple-600" },
  pdf: { label: "PDF", tone: "red", Icon: FileText, tile: "bg-red-50 text-red-600" },
  image: { label: "Image", tone: "green", Icon: ImageIcon, tile: "bg-green-50 text-green-600" },
  file: { label: "File", tone: "gray", Icon: FileText, tile: "bg-gray-100 text-gray-500" },
};

const FILE_INPUT =
  "a-inp !p-1.5 cursor-pointer text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200";

const Bar = ({ pct }) => (
  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
    <div className="bg-one h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${pct}%` }} />
  </div>
);

const DriveLayout = () => {
  // 🗂️ States العامة
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [itemToDelete, setItemToDelete] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null); // 🎬 حالة مشغل الفيديو

  // 🎬 دالة رفع الفيديوهات (TUS)
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 📄 دالة رفع الملفات العادية (PDF وصور)
  const [newFileTitle, setNewFileTitle] = useState("");
  const [regularFile, setRegularFile] = useState(null);
  const [isFileUploading, setIsFileUploading] = useState(false);

  // 📂 رفع مجلد كامل (بدون الحاجة لتعديل الباك اند)
  const [folderFiles, setFolderFiles] = useState(null);
  const [isFolderUploading, setIsFolderUploading] = useState(false);
  const [folderUploadStatus, setFolderUploadStatus] = useState("");
  const [folderUploadCounts, setFolderUploadCounts] = useState({
    done: 0,
    total: 0,
  });

  // 💡 States خاصة بتشغيل الفيديو الآمن
  const [streamUrl, setStreamUrl] = useState(null);
  const [isLoadingStream, setIsLoadingStream] = useState(false);

  // 🔗 API Hooks
  const url = currentFolderId
    ? `/api/drive/folders/${currentFolderId}`
    : "/api/drive/folders";
  const { data, loading, error, refetch } = useGet(url);
  const { postData: createFolder } = usePost("/api/drive/folders");
  const { postData: uploadInit } = usePost("/api/drive/upload/init");
  const { deleteData, loading: isDeleting } = useDelete();

  const driveData = data?.data;

  // 📁 Create Folder
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await createFolder(
        { name: newFolderName, parentFolderId: currentFolderId },
        null,
        "Folder created successfully",
      );
      setNewFolderName("");
      refetch();
    } catch {}
  };

  // 🎬 [الفانكشن الأولى] - Upload Video (TUS)
  const handleUploadFile = async (e) => {
    e.preventDefault();

    if (!videoFile ) {
      toast.error("Video file is required");
      return;
    }

    try {
      const res = await uploadInit({
        videoTitle: newVideoTitle,
        folderId: currentFolderId,
      });

      const creds = res.data?.uploadCredentials || res.data;

      if (!creds || !creds.libraryId) {
        toast.error("Failed to get upload credentials (Library ID missing)");
        return;
      }

      const upload = new tus.Upload(videoFile, {
        endpoint: "https://video.bunnycdn.com/tusupload",
        retryDelays: [0, 1000, 3000, 5000],
        chunkSize: 5 * 1024 * 1024,
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          filename: videoFile.name,
          filetype: videoFile.type,
          title: newVideoTitle,
        },
        headers: {
          AuthorizationSignature: creds.signature,
          AuthorizationExpire: String(creds.expirationTime),
          VideoId: creds.videoId,
          LibraryId: String(creds.libraryId),
        },
        onError: (error) => {
          console.error("TUS Error:", error);
          toast.error(`Upload failed: ${error.message}`);
        },
        onProgress: (uploaded, total) => {
          const percent = ((uploaded / total) * 100).toFixed(2);
          setUploadProgress(percent);
        },
        onSuccess: () => {
          setUploadProgress(100);
          toast.success("Video uploaded successfully");
          setNewVideoTitle("");
          setVideoFile(null);
          setTimeout(() => setUploadProgress(0), 2000);
          refetch();
        },
      });

      const previousUploads = await upload.findPreviousUploads();
      if (previousUploads.length) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    } catch (err) {
      console.error("Init Error:", err);
      toast.error("Could not initialize upload");
    }
  };

  // 📄 [الفانكشن الثانية] - Upload Regular File (PDF & Images)
  const handleUploadRegularFile = async (e) => {
    e.preventDefault();

    if (!regularFile ) {
      toast.error("File title is  required");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(regularFile.type)) {
      toast.error("Only PDF and Image files are allowed!");
      return;
    }

    setIsFileUploading(true);
    const formData = new FormData();
    formData.append("file", regularFile);
    formData.append("title", newFileTitle);
    if (currentFolderId) {
      formData.append("folderId", currentFolderId);
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/api/drive/upload/file`,
        {
          method: "POST",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: formData,
        },
      );

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData?.message || "Failed to upload file");
      }

      toast.success("File uploaded successfully");
      setNewFileTitle("");
      setRegularFile(null);
      refetch();
    } catch (err) {
      console.error("File Upload Error:", err);
      toast.error(err.message || "Could not upload file");
    } finally {
      setIsFileUploading(false);
    }
  };

  // 📂 [الفانكشن الثالثة] - Upload Folder (recreates tree client-side, no backend changes needed)
  const API_BASE_URL = `${API_URL}`;

  // Lists the folders already inside a given parent (used to resolve name collisions)
  const listChildFolders = async (parentFolderId) => {
    const token = localStorage.getItem("token");
    const url = parentFolderId
      ? `${API_BASE_URL}/api/drive/folders/${parentFolderId}`
      : `${API_BASE_URL}/api/drive/folders`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    });
    const resData = await response.json();
    if (!response.ok) {
      throw new Error(resData?.message || "Failed to read folder contents");
    }
    return resData?.data?.folders || [];
  };

  // Creates a folder, or if it already exists, looks up and reuses its id
  const getOrCreateFolderId = async (name, parentFolderId) => {
    try {
      const res = await createFolder(
        { name, parentFolderId },
        null,
        null, // no toast per subfolder — we show one summary toast at the end
      );
      const newId = res?.data?.folder?.id || res?.data?.id;
      if (!newId) {
        throw new Error(`Folder "${name}" created but no id was returned`);
      }
      return newId;
    } catch (err) {
      const message = (
        err?.message ||
        err?.response?.data?.message ||
        ""
      ).toLowerCase();

      if (message.includes("already exists")) {
        const siblings = await listChildFolders(parentFolderId);
        const existing = siblings.find(
          (f) => f.name?.trim().toLowerCase() === name.trim().toLowerCase(),
        );
        if (existing) return existing.id;
      }
      throw err;
    }
  };

  // Walks a folder path (e.g. ["Photos", "2024", "Trip"]), creating/reusing each
  // level under currentFolderId, and returns the id of the deepest folder.
  const resolveFolderPath = async (segments, pathCache) => {
    let parentId = currentFolderId;
    let pathKey = "";

    for (const segment of segments) {
      pathKey = pathKey ? `${pathKey}/${segment}` : segment;

      if (pathCache.has(pathKey)) {
        parentId = pathCache.get(pathKey);
        continue;
      }

      const folderId = await getOrCreateFolderId(segment, parentId);
      pathCache.set(pathKey, folderId);
      parentId = folderId;
    }

    return parentId;
  };

  // Uploads one non-video file (pdf/image) into a specific folder
  const uploadRegularFileTo = async (file, title, folderId) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Unsupported file type (only PDF and images allowed)");
    }

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    if (folderId) formData.append("folderId", folderId);

    const response = await fetch(`${API_BASE_URL}/api/drive/upload/file`, {
      method: "POST",
      headers: { Authorization: token ? `Bearer ${token}` : "" },
      body: formData,
    });
    const resData = await response.json();
    if (!response.ok) {
      throw new Error(resData?.message || "Failed to upload file");
    }
  };

  // Uploads one video file into a specific folder via TUS
  const uploadVideoFileTo = (file, title, folderId) =>
    new Promise(async (resolve, reject) => {
      try {
        const res = await uploadInit({
          videoTitle: title,
          folderId: folderId ?? null, // never send `undefined` — send null explicitly, like the single-upload flow does
        });
        const creds = res.data?.uploadCredentials || res.data;
        if (!creds || !creds.libraryId) {
          reject(new Error("Failed to get upload credentials"));
          return;
        }

        const upload = new tus.Upload(file, {
          endpoint: "https://video.bunnycdn.com/tusupload",
          retryDelays: [0, 1000, 3000, 5000],
          chunkSize: 5 * 1024 * 1024,
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            filename: file.name,
            filetype: file.type,
            title,
          },
          headers: {
            AuthorizationSignature: creds.signature,
            AuthorizationExpire: String(creds.expirationTime),
            VideoId: creds.videoId,
            LibraryId: String(creds.libraryId),
          },
          onError: (error) => reject(error),
          onSuccess: () => resolve(),
        });

        const previousUploads = await upload.findPreviousUploads();
        if (previousUploads.length) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      } catch (err) {
        reject(err);
      }
    });

  // OS-generated metadata files that should never be uploaded
  const isJunkFile = (fileName) =>
    /^(desktop\.ini|thumbs\.db|\.ds_store)$/i.test(fileName);

  // Browsers guess MIME type from the OS, which is unreliable for some video
  // containers (.mkv, .avi, .wmv, sometimes even .mp4). Fall back to extension.
  const VIDEO_EXTENSIONS = [
    "mp4",
    "mov",
    "mkv",
    "avi",
    "wmv",
    "flv",
    "webm",
    "m4v",
    "mpg",
    "mpeg",
  ];
  const isVideoFile = (file) => {
    if (file.type?.startsWith("video/")) return true;
    const ext = file.name.split(".").pop()?.toLowerCase();
    return VIDEO_EXTENSIONS.includes(ext);
  };

  const handleUploadFolder = async () => {
    if (!folderFiles || folderFiles.length === 0) {
      toast.error("Please choose a folder first");
      return;
    }

    const fileList = Array.from(folderFiles).filter(
      (file) => !isJunkFile(file.name),
    );
    setIsFolderUploading(true);
    setFolderUploadCounts({ done: 0, total: fileList.length });

    const pathCache = new Map();
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // webkitRelativePath looks like "MyFolder/Sub/file.png"
      const relativePath = file.webkitRelativePath || file.name;
      const segments = relativePath.split("/").filter(Boolean);
      const fileName = segments.pop(); // last segment is the file itself
      const title = fileName.replace(/\.[^/.]+$/, "") || fileName;

      setFolderUploadStatus(
        `Uploading ${i + 1}/${fileList.length}: ${relativePath}`,
      );

      try {
        const targetFolderId = await resolveFolderPath(segments, pathCache);

        if (isVideoFile(file)) {
          await uploadVideoFileTo(file, title, targetFolderId);
        } else {
          await uploadRegularFileTo(file, title, targetFolderId);
        }
        successCount++;
      } catch (err) {
        console.error(
          `Failed to upload ${relativePath}:`,
          err?.response?.data || err?.message || err,
        );
        failCount++;
      } finally {
        setFolderUploadCounts((prev) => ({ ...prev, done: prev.done + 1 }));
      }
    }

    setIsFolderUploading(false);
    setFolderUploadStatus("");
    setFolderFiles(null);

    if (failCount === 0) {
      toast.success(`Folder uploaded successfully (${successCount} files)`);
    } else {
      toast.error(
        `Uploaded ${successCount} file(s), ${failCount} failed. Check console for details.`,
      );
    }
    refetch();
  };

  // 🗑️ Delete Item
  const confirmDelete = async () => {
    if (!itemToDelete) return;

    const deleteUrl =
      itemToDelete.type === "folder"
        ? `/api/drive/folders/${itemToDelete.id}`
        : `/api/drive/files/${itemToDelete.id}`;

    try {
      await deleteData(deleteUrl);
      setItemToDelete(null);
      refetch();
    } catch {
      toast.error("Failed to delete item");
    }
  };

  // ⬅️ Go Back
  const handleBack = () => {
    if (driveData?.currentFolder) {
      setCurrentFolderId(driveData.currentFolder.parentFolderId);
    }
  };

  // 💡 جلب رابط البث الآمن عند الضغط على الفيديو
  const handlePlayVideo = async (file) => {
    setPlayingVideo({ id: file.id, title: file.title || file.videoTitle });
    setStreamUrl(null);
    setIsLoadingStream(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No auth token found");

      const response = await fetch(
        `${API_URL}/api/drive/stream/${file.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error?.message || "Failed to fetch stream URL",
        );
      }

      const resolvedStreamUrl = data?.data?.video?.streamUrl;
      if (resolvedStreamUrl) {
        setStreamUrl(resolvedStreamUrl);
      } else {
        toast.error("Stream URL not found in response");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error loading video stream");
    } finally {
      setIsLoadingStream(false);
    }
  };

  // 💡 إغلاق مشغل الفيديو وإعادة تعيين الحالات
  const handleCloseVideo = () => {
    setPlayingVideo(null);
    setStreamUrl(null);
  };


  // 📂 Open a file: videos play in the secure player, PDFs/images open in a new tab
  const openFile = (file) => {
    const isVideo = (file.type?.toLowerCase() || "") === "video";
    if (isVideo) {
      handlePlayVideo(file);
    } else {
      const fileLink = file.sourceUrl || file.fileUrl || file.url;
      if (fileLink) window.open(fileLink, "_blank");
      else toast.error("File URL is not available");
    }
  };

  const askDelete = (e, item) => {
    e.stopPropagation();
    setItemToDelete(item);
  };

  const folders = driveData?.folders || [];
  const files = driveData?.files || [];
  const initialLoading = loading && !driveData;
  const isEmpty =
    !loading &&
    driveData?.folders?.length === 0 &&
    driveData?.files?.length === 0;
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const folderPct = folderUploadCounts.total
    ? (folderUploadCounts.done / folderUploadCounts.total) * 100
    : 0;

  return (
    <div className="min-h-screen font-sans text-gray-800" style={{ background: "#f8fafc" }}>
      <Toaster position="top-center" reverseOrder={false} />

      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 h-16 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto h-full px-4 md:px-6 flex items-center gap-3">
          <img alt="MathPortal" className="w-9 h-9 rounded-lg shadow-sm shrink-0" src="/favicon.svg" />
          <div className="leading-tight min-w-0">
            <div className="font-bold text-lg text-gray-900 tracking-tight whitespace-nowrap">
              Math<span className="text-one">Portal</span>
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
              Drive
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6">
        {currentFolderId && (
          <button onClick={handleBack} className="a-btn !py-1.5 !px-3 mb-3">
            <ArrowLeft size={15} /> Back
          </button>
        )}

        <PageHead
          title={driveData?.currentFolder?.name || "My Drive"}
          sub={
            initialLoading
              ? "Loading the folder…"
              : `${plural(folders.length, "folder")} · ${plural(files.length, "file")}`
          }
        />

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4 mb-4">
          {/* Create Folder */}
          <Card title="New folder" sub="Created inside the folder you are in">
            <form onSubmit={handleCreateFolder} className="space-y-3">
              <div>
                <label htmlFor="dr-folder" className="a-lbl-f">Folder name</label>
                <input
                  id="dr-folder"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Projects 2024"
                  className="a-inp"
                />
              </div>
              <button className="a-btn primary w-full">
                <FolderPlus size={16} /> Create folder
              </button>
            </form>
          </Card>

          {/* Upload Video (TUS) */}
          <Card title="Upload video" sub="Sent straight to the video library (resumable)">
            <form onSubmit={handleUploadFile} className="space-y-3">
              <div>
                <label htmlFor="dr-vtitle" className="a-lbl-f">Video title</label>
                <input
                  id="dr-vtitle"
                  value={newVideoTitle}
                  onChange={(e) => setNewVideoTitle(e.target.value)}
                  placeholder="Video title"
                  className="a-inp"
                />
              </div>
              <div>
                <label htmlFor="dr-vfile" className="a-lbl-f">Video file</label>
                <input
                  id="dr-vfile"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files[0])}
                  className={FILE_INPUT}
                />
              </div>
              <button className="a-btn primary w-full">
                <Upload size={16} /> Upload video
              </button>
              {uploadProgress > 0 && (
                <div>
                  <Bar pct={uploadProgress} />
                  <p className="mt-1.5 text-[11px] font-bold text-gray-500">{uploadProgress}%</p>
                </div>
              )}
            </form>
          </Card>

          {/* Upload File (PDF / Images) */}
          <Card title="Upload file" sub="PDF or image (JPG, PNG, GIF, WebP)">
            <form onSubmit={handleUploadRegularFile} className="space-y-3">
              <div>
                <label htmlFor="dr-ftitle" className="a-lbl-f">File title</label>
                <input
                  id="dr-ftitle"
                  value={newFileTitle}
                  onChange={(e) => setNewFileTitle(e.target.value)}
                  placeholder="File title"
                  className="a-inp"
                />
              </div>
              <div>
                <label htmlFor="dr-ffile" className="a-lbl-f">File</label>
                <input
                  id="dr-ffile"
                  type="file"
                  accept=".pdf, image/*"
                  onChange={(e) => setRegularFile(e.target.files[0])}
                  className={FILE_INPUT}
                />
              </div>
              <button disabled={isFileUploading} className="a-btn primary w-full">
                {isFileUploading ? (
                  <><Loader2 size={16} className="animate-spin" /> Uploading…</>
                ) : (
                  <><Upload size={16} /> Upload file</>
                )}
              </button>
            </form>
          </Card>

          {/* Upload Folder */}
          <Card title="Upload folder" sub="Keeps the sub-folders; videos, PDFs and images">
            <div className="space-y-3">
              <div>
                <label htmlFor="dr-dir" className="a-lbl-f">Folder</label>
                <input
                  id="dr-dir"
                  type="file"
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={(e) => setFolderFiles(e.target.files)}
                  className={FILE_INPUT}
                />
              </div>
              <button
                type="button"
                onClick={handleUploadFolder}
                disabled={isFolderUploading || !folderFiles}
                className="a-btn primary w-full"
              >
                {isFolderUploading ? (
                  <><Loader2 size={16} className="animate-spin" /> Uploading…</>
                ) : (
                  <><FolderUp size={16} /> Upload folder</>
                )}
              </button>

              {folderFiles && !isFolderUploading && (
                <p className="text-xs text-gray-400">{folderFiles.length} file(s) selected</p>
              )}

              {isFolderUploading && (
                <div>
                  <Bar pct={folderPct} />
                  <p className="mt-1.5 text-[11px] text-gray-500 truncate">
                    {folderUploadStatus} ({folderUploadCounts.done}/{folderUploadCounts.total})
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Contents */}
        <Card
          title="Contents"
          sub="Open a folder, play a video, or open a PDF/image in a new tab"
          bodyClass="p-0"
        >
          {initialLoading ? (
            <div className="p-5"><SkelRows n={5} /></div>
          ) : error && !driveData ? (
            <p className="p-5 text-sm text-red-600">{error}</p>
          ) : isEmpty ? (
            <div className="p-5">
              <Empty title="This folder is empty" text="Create a folder or upload files above." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="a-th">Name</th>
                    <th className="a-th">Type</th>
                    <th className="a-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {folders.map((folder) => {
                    const k = FILE_KIND.folder;
                    return (
                      <tr
                        key={`folder-${folder.id}`}
                        className="a-tr cursor-pointer"
                        onClick={() => setCurrentFolderId(folder.id)}
                      >
                        <td className="a-td">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${k.tile}`}>
                              <k.Icon size={17} />
                            </span>
                            <span className="font-semibold text-gray-800 truncate max-w-[60vw] md:max-w-[50ch]">
                              {folder.name}
                            </span>
                          </div>
                        </td>
                        <td className="a-td"><Pill tone={k.tone}>{k.label}</Pill></td>
                        <td className="a-td">
                          <div className="flex justify-end gap-1.5">
                            <button
                              className="a-act"
                              title="Open folder"
                              aria-label="Open folder"
                              onClick={(e) => { e.stopPropagation(); setCurrentFolderId(folder.id); }}
                            >
                              <Folder size={15} />
                            </button>
                            <button
                              className="a-act del"
                              title="Delete"
                              aria-label="Delete folder"
                              onClick={(e) => askDelete(e, { id: folder.id, type: "folder", name: folder.name })}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {files.map((file) => {
                    // API returns file.type as "pdf", "image", or "video"
                    const fileType = file.type?.toLowerCase() || "";
                    const isVideo = fileType === "video";
                    const k = FILE_KIND[fileType] || FILE_KIND.file;
                    const name = file.title || file.videoTitle;
                    return (
                      <tr key={`file-${file.id}`} className="a-tr cursor-pointer" onClick={() => openFile(file)}>
                        <td className="a-td">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${k.tile}`}>
                              <k.Icon size={17} />
                            </span>
                            <span className="font-semibold text-gray-800 line-clamp-2 max-w-[60vw] md:max-w-[50ch]">
                              {name}
                            </span>
                          </div>
                        </td>
                        <td className="a-td"><Pill tone={k.tone}>{k.label}</Pill></td>
                        <td className="a-td">
                          <div className="flex justify-end gap-1.5">
                            <button
                              className="a-act"
                              title={isVideo ? "Play" : "Open in a new tab"}
                              aria-label={isVideo ? "Play video" : "Open file"}
                              onClick={(e) => { e.stopPropagation(); openFile(file); }}
                            >
                              {isVideo ? <Play size={15} /> : <ExternalLink size={15} />}
                            </button>
                            <button
                              className="a-act del"
                              title="Delete"
                              aria-label="Delete file"
                              onClick={(e) =>
                                askDelete(e, {
                                  id: file.id,
                                  type: file.type || "file", // "pdf", "image", or "video"
                                  name,
                                })
                              }
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      {/* Video Player Modal */}
      {playingVideo && (
        <div className="a-modal-bg">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-800 truncate">{playingVideo.title}</h3>
                <p className="text-[11px] text-gray-400">Secure stream · watermarked</p>
              </div>
              <button onClick={handleCloseVideo} className="a-act shrink-0" title="Close" aria-label="Close player">
                <X size={16} />
              </button>
            </div>

            <div className="bg-gray-950 p-2 sm:p-4">
              <div className="rounded-xl overflow-hidden w-full relative min-h-[40vh] flex items-center justify-center">
                {isLoadingStream ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={28} className="animate-spin text-white/70" />
                    <span className="text-gray-400 text-sm">Loading secure stream…</span>
                  </div>
                ) : streamUrl ? (
                  <div className="w-full h-full aspect-video">
                    <SecureVideoPlayer
                      streamUrl={streamUrl}
                      studentIdentifier="Admin / Instructor View"
                      autoplay={true}
                      showControls={true}
                    />
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">Failed to load video stream.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {itemToDelete && (
        <Modal
          title="Delete item?"
          onClose={() => setItemToDelete(null)}
          actions={
            <>
              <button onClick={() => setItemToDelete(null)} className="a-btn">Cancel</button>
              <button onClick={confirmDelete} disabled={isDeleting} className="a-btn danger">
                {isDeleting ? (<><Loader2 size={15} className="animate-spin" /> Deleting…</>) : (<><Trash2 size={15} /> Delete</>)}
              </button>
            </>
          }
        >
          <p>
            Delete <span className="font-semibold text-gray-800">“{itemToDelete.name}”</span>? This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
};

export default DriveLayout;
