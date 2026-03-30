import { ExternalLink, FileText, Image as ImageIcon, Music2, Video, X } from "lucide-react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { Button, Modal } from "@sdkwork/openchat-pc-ui";
import type { FileNode } from "../types";
import { FileService } from "../services";

interface FilePreviewModalProps {
  item: FileNode | null;
  onClose: () => void;
}

const isImage = (item: FileNode) => item.type === "image" || item.mimeType?.startsWith("image/");
const isVideo = (item: FileNode) => item.type === "video" || item.mimeType?.startsWith("video/");
const isAudio = (item: FileNode) => item.type === "audio" || item.mimeType?.startsWith("audio/");
const isTextLike = (item: FileNode) =>
  item.type === "code" ||
  item.type === "doc" ||
  item.type === "pdf" ||
  item.mimeType?.startsWith("text/") ||
  Boolean(item.url && /\.(txt|md|json|xml|yaml|yml|js|ts|tsx|jsx|css|html|py|go|java|rs|c|cpp|h)$/i.test(item.name));

export function FilePreviewModal({ item, onClose }: FilePreviewModalProps) {
  const { tr } = useAppTranslation();

  if (!item) {
    return null;
  }

  const icon = isImage(item)
    ? <ImageIcon size={18} />
    : isVideo(item)
      ? <Video size={18} />
      : isAudio(item)
        ? <Music2 size={18} />
        : <FileText size={18} />;

  const previewUrl = item.previewUrl || item.url;
  const formatSize = FileService.formatBytes(item.size || 0);

  return (
    <Modal
      isOpen={Boolean(item)}
      onClose={onClose}
      size="xl"
      title={item.name}
      customWidth="min(1100px,96vw)"
      customHeight="90vh"
      bodyClassName="bg-bg-primary"
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-hover text-text-primary">
              {icon}
            </div>
            <div>
              <div className="text-sm font-medium text-text-primary">{item.name}</div>
              <div className="flex items-center gap-1 text-xs text-text-secondary">
                <span>{tr(item.type.toUpperCase())}</span>
                <span aria-hidden="true">&middot;</span>
                <span>{formatSize}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {previewUrl ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<ExternalLink size={14} />}
                onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
              >
                {tr("Open")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="unstyled"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
              aria-label={tr("Close preview")}
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-6">
          {isImage(item) && previewUrl ? (
            <div className="flex h-full items-center justify-center">
              <img
                src={previewUrl}
                alt={item.name}
                className="max-h-[70vh] max-w-full rounded-2xl border border-border object-contain shadow-xl"
              />
            </div>
          ) : isVideo(item) && previewUrl ? (
            <video controls className="h-auto w-full rounded-2xl border border-border bg-black" src={previewUrl} />
          ) : isAudio(item) && previewUrl ? (
            <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-bg-elevated p-6">
              <audio controls className="w-full" src={previewUrl} />
            </div>
          ) : isTextLike(item) && previewUrl ? (
            <iframe
              src={previewUrl}
              title={item.name}
              className="h-[72vh] w-full rounded-2xl border border-border bg-bg-elevated"
            />
          ) : (
            <div className="rounded-2xl border border-border bg-bg-elevated p-6">
              <div className="text-sm text-text-secondary">
                {tr("This item does not have a direct preview source yet.")}
              </div>
              <div className="mt-4 grid gap-3 text-sm text-text-primary sm:grid-cols-2">
                <div className="rounded-xl bg-bg-primary p-4">
                  <div className="text-xs text-text-muted">{tr("Type")}</div>
                  <div className="mt-1 font-medium">{tr(item.type)}</div>
                </div>
                <div className="rounded-xl bg-bg-primary p-4">
                  <div className="text-xs text-text-muted">{tr("Size")}</div>
                  <div className="mt-1 font-medium">{formatSize}</div>
                </div>
                <div className="rounded-xl bg-bg-primary p-4">
                  <div className="text-xs text-text-muted">{tr("Updated")}</div>
                  <div className="mt-1 font-medium">
                    {new Date(item.updateTime || item.createTime || Date.now()).toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl bg-bg-primary p-4">
                  <div className="text-xs text-text-muted">{tr("Status")}</div>
                  <div className="mt-1 font-medium">{item.trashedAt ? tr("Trashed") : tr("Active")}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default FilePreviewModal;
