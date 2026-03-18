import { translate } from "@sdkwork/openchat-pc-i18n";

export interface UploadFileParams {
  file: File;
  onProgress?: (progress: number) => void;
  compress?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number;
  error?: string;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

const FILE_TYPE_CONFIG = {
  image: {
    extensions: ["jpg", "jpeg", "png", "gif", "webp", "bmp"],
    maxSize: 10 * 1024 * 1024,
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
    ],
  },
  video: {
    extensions: ["mp4", "mov", "avi", "mkv", "webm"],
    maxSize: 100 * 1024 * 1024,
    mimeTypes: [
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
      "video/webm",
    ],
  },
  audio: {
    extensions: ["mp3", "wav", "ogg", "m4a", "aac"],
    maxSize: 50 * 1024 * 1024,
    mimeTypes: [
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/mp4",
      "audio/aac",
    ],
  },
  document: {
    extensions: [
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "txt",
      "zip",
      "rar",
    ],
    maxSize: 50 * 1024 * 1024,
    mimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "application/zip",
      "application/x-rar-compressed",
    ],
  },
} as const;

export function validateFile(
  file: File,
  type?: "image" | "video" | "audio" | "document",
): FileValidationResult {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  if (type) {
    const config = FILE_TYPE_CONFIG[type];
    if (!config.extensions.includes(extension as never)) {
      return {
        valid: false,
        error: translate(
          "Unsupported file format. Please upload one of: {{types}}.",
          {
            types: config.extensions.join(", "),
          },
        ),
      };
    }

    if (file.size > config.maxSize) {
      return {
        valid: false,
        error: translate("File size exceeds the limit of {{size}}.", {
          size: formatFileSize(config.maxSize),
        }),
      };
    }
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: translate("File cannot be empty."),
    };
  }

  if (file.name.length > 200) {
    return {
      valid: false,
      error: translate("File name is too long."),
    };
  }

  return { valid: true };
}

export function getFileType(
  file: File,
): "image" | "video" | "audio" | "document" | "unknown" {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  for (const [type, config] of Object.entries(FILE_TYPE_CONFIG)) {
    if (config.extensions.includes(extension as never)) {
      return type as "image" | "video" | "audio" | "document";
    }
  }

  return "unknown";
}

export async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.8,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = image;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error(translate("Unable to create a canvas context.")));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }
          reject(new Error(translate("Image compression failed.")));
        },
        "image/jpeg",
        quality,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(translate("Image loading failed.")));
    };

    image.src = url;
  });
}

export async function generateThumbnail(
  file: File,
  maxWidth = 300,
  maxHeight = 300,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      let { width, height } = image;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error(translate("Unable to create a canvas context.")));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.7);
      URL.revokeObjectURL(url);
      resolve(thumbnailUrl);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(translate("Thumbnail generation failed.")));
    };

    image.src = url;
  });
}

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(translate("Unable to read video metadata.")));
    };

    video.src = url;
  });
}

export function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.width, height: image.height });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(translate("Unable to read image dimensions.")));
    };

    image.src = url;
  });
}

export async function uploadFile(
  params: UploadFileParams,
): Promise<UploadResult> {
  const {
    file,
    onProgress,
    compress = true,
    maxWidth = 1920,
    maxHeight = 1920,
  } = params;

  const fileType = getFileType(file);
  const validation = validateFile(
    file,
    fileType === "unknown" ? undefined : fileType,
  );

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    let uploadFileData: File | Blob = file;
    let thumbnailUrl: string | undefined;
    let dimensions: { width: number; height: number } | undefined;
    let duration: number | undefined;

    if (fileType === "image") {
      dimensions = await getImageDimensions(file);
      thumbnailUrl = await generateThumbnail(file);

      if (compress && file.size > 1024 * 1024) {
        uploadFileData = await compressImage(file, maxWidth, maxHeight);
      }
    }

    if (fileType === "video") {
      duration = await getVideoDuration(file);
    }

    const totalSize = uploadFileData.size;
    let uploadedSize = 0;
    const chunkSize = totalSize / 10;

    for (let index = 0; index < 10; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      uploadedSize += chunkSize;
      onProgress?.(Math.min((uploadedSize / totalSize) * 100, 100));
    }

    const url = URL.createObjectURL(
      uploadFileData instanceof File
        ? uploadFileData
        : new Blob([uploadFileData]),
    );

    return {
      success: true,
      url,
      thumbnailUrl,
      fileName: file.name,
      fileSize: uploadFileData.size,
      width: dimensions?.width,
      height: dimensions?.height,
      duration,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error && error.message
          ? error.message
          : translate("Upload failed."),
    };
  }
}

export async function uploadFiles(
  files: File[],
  onProgress?: (index: number, progress: number) => void,
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const result = await uploadFile({
      file: files[index],
      onProgress: (progress) => onProgress?.(index, progress),
    });
    results.push(result);
  }

  return results;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const base = 1024;
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(base));

  return `${parseFloat((bytes / Math.pow(base, unitIndex)).toFixed(2))} ${
    units[unitIndex]
  }`;
}

export function downloadFile(url: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
