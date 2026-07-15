import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSimpleQuery } from "@/hooks/useSimpleQuery";
import { useSimpleMutation } from "@/hooks/useSimpleMutation";
import { useAuth } from "@/contexts/auth-context";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
  type DriverDocument,
  deleteDriverDocument,
  getDocumentSignedUrl,
  listDriverDocuments,
  uploadDriverDocument,
} from "@/services/driverDocumentsService";
import {
  AlertTriangle,
  Calendar,
  Download,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export function DriverDocumentsSection({ driverId }: { driverId: number }) {
  const { user, isAdmin, isMasterAdmin } = useAuth();
  const canWrite = isAdmin || isMasterAdmin; // school_admin / fleet_owner are read-only

  const [uploadOpen, setUploadOpen] = useState(false);

  const {
    data: docs = [],
    isLoading,
    error,
    refetch,
  } = useSimpleQuery<DriverDocument[]>(
    () => listDriverDocuments(driverId),
    [driverId],
    { enabled: !!driverId }
  );

  const deleteMutation = useSimpleMutation({
    mutationFn: (doc: DriverDocument) => deleteDriverDocument(doc),
  });

  const handleDelete = async (doc: DriverDocument) => {
    if (!window.confirm(`Delete "${doc.document_name || doc.document_type}"?`)) return;
    try {
      await deleteMutation.mutateAsync(doc);
      toast.success("Document deleted");
      refetch();
    } catch (e: any) {
      toast.error("Failed to delete: " + e.message);
    }
  };

  const handleView = async (doc: DriverDocument) => {
    try {
      const url = await getDocumentSignedUrl(doc.file_path, 300);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error("Failed to open document: " + e.message);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
              <CardDescription>
                Driving license, RC, insurance and other compliance documents
              </CardDescription>
            </div>
            {canWrite && (
              <Button size="sm" onClick={() => setUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-6 text-destructive">
              Error loading documents: {error.message}
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No documents uploaded yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((doc) => (
                  <TableRow key={doc.document_id}>
                    <TableCell>
                      <Badge variant="outline">
                        {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {doc.document_name || "(unnamed)"}
                    </TableCell>
                    <TableCell>
                      {doc.expiry_date ? (
                        <ExpiryCell date={doc.expiry_date} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {doc.file_size ? formatBytes(doc.file_size) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(doc.uploaded_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => handleView(doc)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      {canWrite && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canWrite && (
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          driverId={driverId}
          uploadedBy={user?.id || ""}
          onUploaded={() => refetch()}
        />
      )}
    </>
  );
}

function ExpiryCell({ date }: { date: string }) {
  const expiry = new Date(date);
  const now = new Date();
  const daysLeft = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const expired = daysLeft < 0;
  const expiringSoon = daysLeft >= 0 && daysLeft < 30;
  return (
    <div className="flex items-center gap-1 text-sm">
      <Calendar className="h-3 w-3 text-muted-foreground" />
      <span className={expired ? "text-destructive font-medium" : expiringSoon ? "text-amber-600" : ""}>
        {format(expiry, "dd MMM yyyy")}
      </span>
      {expired && <AlertTriangle className="h-3 w-3 text-destructive" />}
      {expiringSoon && !expired && <AlertTriangle className="h-3 w-3 text-amber-600" />}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: number;
  uploadedBy: string;
  onUploaded: () => void;
}

function UploadDialog({
  open,
  onOpenChange,
  driverId,
  uploadedBy,
  onUploaded,
}: UploadDialogProps) {
  const [documentType, setDocumentType] = useState<DocumentType>("driving_license");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setDocumentType("driving_license");
    setFile(null);
    setName("");
    setExpiryDate("");
    setNotes("");
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    setUploading(true);
    try {
      await uploadDriverDocument({
        driverId,
        documentType,
        documentName: name.trim() || undefined,
        expiryDate: expiryDate || null,
        notes: notes.trim() || null,
        file,
        uploadedBy,
      });
      toast.success("Document uploaded");
      reset();
      onOpenChange(false);
      onUploaded();
    } catch (e: any) {
      toast.error("Upload failed: " + e.message);
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a driver document. Accepted: PDF, JPG, PNG. Max 10 MB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Document Type *</Label>
            <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {DOCUMENT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-name">Name (optional)</Label>
            <Input
              id="doc-name"
              placeholder="e.g. DL Front"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-file">File *</Label>
            <Input
              id="doc-file"
              type="file"
              accept=".pdf,image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-expiry">Expiry Date (optional)</Label>
            <Input
              id="doc-expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-notes">Notes (optional)</Label>
            <Textarea
              id="doc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploading || !file}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
