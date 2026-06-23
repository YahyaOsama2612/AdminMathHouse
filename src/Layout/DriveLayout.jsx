import React, { useState, useEffect } from "react";
import useGet from "../hooks/useGet";
import usePost from "../hooks/usePost";
import useDelete from "../hooks/useDelete";
import { Toaster, toast } from "react-hot-toast";
import * as tus from "tus-js-client";

// استيراد مكتبة الحركات
import AOS from "aos";
import "aos/dist/aos.css";

// استيراد مشغل الفيديو المخصص
import { SecureVideoPlayer } from "./SecureVideoPlayer"; // تأكد من مسار الملف الصحيح

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

  // 🎨 تهيئة حركات AOS
  useEffect(() => {
    AOS.init({
      duration: 600,
      once: true,
      easing: "ease-out-cubic",
    });
  }, []);

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

    if (!videoFile || !newVideoTitle.trim()) {
      toast.error("Video title and file are required");
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
          toast.success("Video uploaded successfully 🎉");
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

    if (!regularFile || !newFileTitle.trim()) {
      toast.error("File title and file are required");
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
        "https://bcknd.mathshouse.net/api/drive/upload/file",
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

      toast.success("File uploaded successfully 🎉");
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
        `https://bcknd.mathshouse.net/api/drive/stream/${file.id}`,
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

  // ⏳ Loading Screen
  if (loading && !driveData) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800 font-sans">
      <Toaster position="top-center" reverseOrder={false} />

      {/* Header */}
      <div
        className="flex justify-between items-center mb-8"
        data-aos="fade-down"
      >
        <div className="flex items-center gap-4">
          {currentFolderId && (
            <button
              onClick={handleBack}
              className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-all text-slate-500 hover:text-indigo-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                />
              </svg>
            </button>
          )}
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
            {driveData?.currentFolder?.name || "My Drive"}
          </h1>
        </div>
      </div>

      {/* Actions Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
        {/* Create Folder Card */}
        <div
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100/60 transition-shadow hover:shadow-md"
          data-aos="fade-right"
          data-aos-delay="100"
        >
          <h2 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">
            Create Folder
          </h2>
          <form onSubmit={handleCreateFolder} className="flex gap-3">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Projects 2024"
              className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <button className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-5 py-2.5 rounded-xl transition-colors shrink-0">
              Create
            </button>
          </form>
        </div>

        {/* Upload Video Card */}
        <div
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100/60 transition-shadow hover:shadow-md"
          data-aos="fade-up"
          data-aos-delay="150"
        >
          <h2 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">
            Upload Video (TUS)
          </h2>
          <form
            onSubmit={handleUploadFile}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              value={newVideoTitle}
              onChange={(e) => setNewVideoTitle(e.target.value)}
              placeholder="Video title"
              className="w-full sm:w-1/3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files[0])}
              className="w-full sm:flex-1 text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-xl transition-colors shadow-sm shadow-indigo-200 shrink-0">
              Upload
            </button>
          </form>

          {/* Progress Bar */}
          {uploadProgress > 0 && (
            <div className="mt-4 w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out relative"
                style={{ width: `${uploadProgress}%` }}
              >
                <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          )}
        </div>

        {/* Upload File Card (PDF / Images) */}
        <div
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100/60 transition-shadow hover:shadow-md"
          data-aos="fade-left"
          data-aos-delay="200"
        >
          <h2 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">
            Upload File (PDF / Images)
          </h2>
          <form
            onSubmit={handleUploadRegularFile}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              value={newFileTitle}
              onChange={(e) => setNewFileTitle(e.target.value)}
              placeholder="File title"
              className="w-full sm:w-1/3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            <input
              type="file"
              accept=".pdf, image/*"
              onChange={(e) => setRegularFile(e.target.files[0])}
              className="w-full sm:flex-1 text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
            />
            <button
              disabled={isFileUploading}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium px-6 py-2.5 rounded-xl transition-colors shadow-sm shadow-emerald-200 shrink-0 flex items-center justify-center"
            >
              {isFileUploading ? "Uploading..." : "Upload "}
            </button>
          </form>
        </div>
      </div>

      {/* Grid: Folders & Files */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Folders */}
        {driveData?.folders?.map((folder, index) => (
          <div
            key={folder.id}
            data-aos="fade-up"
            data-aos-delay={index * 50}
            className="group bg-white p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100/60 hover:-translate-y-1 flex flex-col justify-between h-36 cursor-pointer"
            onClick={() => setCurrentFolderId(folder.id)}
          >
            <div className="flex items-center gap-3 text-lg font-medium text-slate-700 hover:text-indigo-600 transition-colors">
              <span className="text-3xl">📁</span>
              <span className="truncate">{folder.name}</span>
            </div>
            <div className="flex justify-end mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setItemToDelete({
                    id: folder.id,
                    type: "folder",
                    name: folder.name,
                  });
                }}
                className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {/* Files */}
        {driveData?.files?.map((file, index) => {
          // API returns file.type as "pdf", "image", or "video"
          const fileType = file.type?.toLowerCase() || "";

          const isPdf = fileType === "pdf";
          const isImage = fileType === "image";
          const isVideo = fileType === "video";

          let fileIcon = "📄";
          if (isVideo) fileIcon = "🎬";
          else if (isPdf) fileIcon = "📕";
          else if (isImage) fileIcon = "🖼️";

          return (
            <div
              key={file.id}
              data-aos="fade-up"
              data-aos-delay={
                (driveData?.folders?.length || 0) * 50 + index * 50
              }
              className="group bg-white p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100/60 hover:-translate-y-1 flex flex-col justify-between h-36 cursor-pointer"
              onClick={() => {
                if (isVideo) {
                  handlePlayVideo(file);
                } else {
                  const fileLink = file.sourceUrl || file.fileUrl || file.url;
                  if (fileLink) window.open(fileLink, "_blank");
                  else toast.error("File URL is not available");
                }
              }}
            >
              <div className="flex items-start gap-3 text-base font-medium text-slate-700">
                <span className="text-3xl">{fileIcon}</span>
                <span className="line-clamp-2 leading-snug">
                  {file.title || file.videoTitle}
                </span>
              </div>
              <div className="flex justify-end mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setItemToDelete({
                      id: file.id,
                      type: file.type || "file", // "pdf", "image", or "video"
                      name: file.title || file.videoTitle,
                    });
                  }}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {!loading &&
          driveData?.folders?.length === 0 &&
          driveData?.files?.length === 0 && (
            <div
              className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400"
              data-aos="zoom-in"
            >
              <span className="text-6xl mb-4">📭</span>
              <p className="text-lg font-medium">This folder is empty</p>
            </div>
          )}
      </div>

      {/* 📺 Video Player Modal */}
      {playingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 transition-all">
          <div
            className="bg-black p-4 rounded-3xl shadow-2xl w-full max-w-5xl border border-slate-800 relative flex flex-col"
            data-aos="zoom-in"
            data-aos-duration="300"
          >
            {/* Close Button */}
            <button
              onClick={handleCloseVideo}
              className="absolute -top-4 -right-4 md:-top-5 md:-right-5 bg-slate-800 hover:bg-red-500 text-white p-2.5 rounded-full shadow-lg transition-all hover:scale-110 z-10 border-2 border-slate-700 hover:border-red-500"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <h3 className="text-lg font-semibold text-slate-200 mb-4 px-2 truncate">
              {playingVideo.title}
            </h3>

            <div className="rounded-2xl overflow-hidden bg-slate-900 w-full relative min-h-[50vh] flex items-center justify-center">
              {isLoadingStream ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                  <span className="text-slate-400 text-sm">
                    Loading secure stream...
                  </span>
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
                <div className="text-slate-400">
                  Failed to load video stream.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ Delete Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 transition-all">
          <div
            className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-slate-100"
            data-aos="zoom-out"
            data-aos-duration="300"
          >
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500 mb-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Delete Item
            </h3>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-700">
                "{itemToDelete.name}"
              </span>
              ? This action cannot be undone.
            </p>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-3 rounded-xl transition-colors shadow-sm shadow-red-200 flex justify-center items-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriveLayout;
