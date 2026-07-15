import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const BUCKET = "driver-documents";

export type DocumentType =
  | "driving_license"
  | "vehicle_rc"
  | "insurance"
  | "id_proof"
  | "fitness_certificate"
  | "permit"
  | "pollution_certificate"
  | "other";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  driving_license: "Driving License",
  vehicle_rc: "Vehicle RC",
  insurance: "Insurance",
  id_proof: "ID Proof",
  fitness_certificate: "Fitness Certificate",
  permit: "Permit",
  pollution_certificate: "Pollution Certificate",
  other: "Other",
};

export const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];

export type DriverDocument = {
  document_id: number;
  driver_id: number;
  document_type: DocumentType;
  document_name: string | null;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  expiry_date: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  notes: string | null;
};

export async function listDriverDocuments(driverId: number): Promise<DriverDocument[]> {
  const { data, error } = await db
    .from("driver_documents")
    .select("*")
    .eq("driver_id", driverId)
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

const sanitizeFilename = (name: string): string =>
  name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 200);

export interface UploadDocumentInput {
  driverId: number;
  documentType: DocumentType;
  documentName?: string;
  expiryDate?: string | null;
  notes?: string | null;
  file: File;
  uploadedBy: string;
}

export async function uploadDriverDocument(
  input: UploadDocumentInput
): Promise<DriverDocument> {
  const ext = input.file.name.split(".").pop() || "bin";
  const baseName = input.documentName?.trim() || input.file.name;
  const safeFileName = `${Date.now()}-${sanitizeFilename(baseName.replace(/\.[^.]+$/, ""))}.${ext}`;
  const path = `${input.driverId}/${input.documentType}/${safeFileName}`;

  // Upload to Storage
  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(path, input.file, {
      contentType: input.file.type || undefined,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  // Insert metadata row
  const { data, error } = await db
    .from("driver_documents")
    .insert({
      driver_id: input.driverId,
      document_type: input.documentType,
      document_name: baseName,
      file_path: path,
      file_size: input.file.size,
      mime_type: input.file.type || null,
      expiry_date: input.expiryDate || null,
      notes: input.notes || null,
      uploaded_by: input.uploadedBy,
    })
    .select()
    .single();

  if (error) {
    // Rollback: try to remove the uploaded file
    await db.storage.from(BUCKET).remove([path]).catch(() => undefined);
    throw error;
  }
  return data;
}

export async function deleteDriverDocument(doc: DriverDocument): Promise<void> {
  // Delete the row first
  const { error } = await db
    .from("driver_documents")
    .delete()
    .eq("document_id", doc.document_id);
  if (error) throw error;

  // Best-effort file removal — if it fails, ignore (orphan file is harmless)
  await db.storage.from(BUCKET).remove([doc.file_path]).catch(() => undefined);
}

/** Generate a signed URL for viewing/downloading. Expires in `expiresIn` seconds. */
export async function getDocumentSignedUrl(
  filePath: string,
  expiresIn = 300
): Promise<string> {
  const { data, error } = await db.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
