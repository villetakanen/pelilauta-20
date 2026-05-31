/** Attachment state passed to CnRichComposer. Parent owns upload orchestration. */
export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  status: "uploading" | "success" | "error";
  progress?: number;
  previewUrl?: string;
}
