import { useMemo, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { Modal, ModalButtonGroup } from "@sdkwork/openchat-pc-ui";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

interface NewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SavedNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const NOTE_STORAGE_KEY = "openchat.im.quick-notes";

function persistNote(note: SavedNote): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    const raw = localStorage.getItem(NOTE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedNote[]) : [];
    const notes = Array.isArray(parsed) ? parsed : [];
    localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify([note, ...notes]));
  } catch {
    localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify([note]));
  }
}

export function NewNoteModal({ isOpen, onClose, onSuccess }: NewNoteModalProps) {
  const { tr, formatNumber } = useAppTranslation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  const canSave = useMemo(
    () => title.trim().length > 0 || content.trim().length > 0,
    [content, title],
  );

  const handleClose = () => {
    setTitle("");
    setContent("");
    setTab("edit");
    setIsSaving(false);
    onClose();
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    setIsSaving(true);
    try {
      persistNote({
        id: `note-${Date.now()}`,
        title: title.trim(),
        content: content.trim(),
        createdAt: new Date().toISOString(),
      });
      onSuccess?.();
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={tr("New Note")}
      size="xl"
      bodyClassName="p-0"
      footer={
        <ModalButtonGroup
          onCancel={handleClose}
          onConfirm={handleSave}
          confirmText={tr("Save Note")}
          isLoading={isSaving}
          disabled={!canSave}
        />
      }
    >
      <div className="flex h-[520px] min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex rounded-lg bg-bg-tertiary p-1">
            <SharedUi.Button
              onClick={() => setTab("edit")}
              className={`rounded px-3 py-1.5 text-xs transition-colors ${
                tab === "edit" ? "bg-primary text-white" : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              {tr("Edit")}
            </SharedUi.Button>
            <SharedUi.Button
              onClick={() => setTab("preview")}
              className={`rounded px-3 py-1.5 text-xs transition-colors ${
                tab === "preview" ? "bg-primary text-white" : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              {tr("Preview")}
            </SharedUi.Button>
          </div>
          <span className="text-xs text-text-muted">
            {tr("{{count}} chars", { count: content.length })}
          </span>
        </div>

        {tab === "edit" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
            <SharedUi.Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={tr("Note title")}
              className="h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary outline-none focus:border-primary"
            />
            <SharedUi.Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={tr("Write your note here.")}
              className="min-h-0 flex-1 resize-none rounded-lg border border-border bg-bg-tertiary p-3 text-sm leading-6 text-text-primary outline-none focus:border-primary"
            />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {title.trim() ? (
              <h3 className="mb-4 border-b border-border pb-3 text-xl font-semibold text-text-primary">
                {title}
              </h3>
            ) : null}

            {content.trim() ? (
              <div className="whitespace-pre-wrap text-sm leading-7 text-text-secondary">
                {content}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-text-muted">
                {tr("Nothing to preview yet.")}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default NewNoteModal;
