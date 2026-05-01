import React from "react";
import { getFileType } from "../../utils/fileUrl";

export default function FileViewer({ fileUrl }: { fileUrl: string }) {
  const type = getFileType(fileUrl);
  // console.log("Rendering FileViewer with fileUrl:", fileUrl, "and type:", type);
  if (!fileUrl) {
    return (
      <p className="text-gray-600 text-center">
        Cannot preview this file.
      </p>
    );   
  }

  if (type === "image") {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <img
          src={fileUrl}
          alt="Preview"
          className="max-w-full max-h-[70vh] object-contain"
        />
      </div>
    );
  }

  if (type === "pdf") {
    return (
      <iframe
        src={fileUrl}
        className="w-full h-[70vh] border-none"
        title="PDF Preview"
      />
    );
  }

  return (
    <p className="text-gray-600 text-center">
      Cannot preview this file type.
    </p>
  );
}
