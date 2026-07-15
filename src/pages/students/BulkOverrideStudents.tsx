import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader2,
  Info,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import {
  parseOverrideExcelFile,
  parseOverrideCSVFile,
  validateAllOverrides,
  bulkProcessOverrides,
  downloadOverrideTemplate,
  type StudentOverrideRow,
  type ValidationError,
  type BulkOverrideSummary,
} from '@/services/studentOverrideService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

type UploadStage = 'select' | 'preview' | 'validating' | 'uploading' | 'complete';

export default function BulkOverrideStudents() {
  return (
    <DashboardLayout>
      <BulkOverrideContent />
    </DashboardLayout>
  );
}

function BulkOverrideContent() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<UploadStage>('select');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<StudentOverrideRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentLabel, setCurrentLabel] = useState('');
  const [uploadSummary, setUploadSummary] = useState<BulkOverrideSummary | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      await downloadOverrideTemplate();
      toast.success('Template downloaded with latest schools & drivers');
    } catch (error) {
      toast.error('Failed to generate template: ' + (error instanceof Error ? error.message : 'Unknown'));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!ext || !['csv', 'xlsx', 'xls'].includes(ext)) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }
    setFile(selectedFile);
    setStage('preview');
    parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const parsed = ext === 'csv'
        ? await parseOverrideCSVFile(file)
        : await parseOverrideExcelFile(file);

      if (parsed.length === 0) {
        toast.error('No data found in file');
        setStage('select');
        return;
      }

      setRows(parsed);
      const matched = parsed.filter(r => r._matched).length;
      toast.success(`Parsed ${parsed.length} rows — ${matched} students matched`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse file');
      setStage('select');
    }
  };

  const handleValidate = async () => {
    setStage('validating');
    try {
      const errors = await validateAllOverrides(rows);
      setValidationErrors(errors);
      if (errors.length === 0) {
        toast.success('All rows validated!');
      } else {
        toast.warning(`Found ${errors.length} validation errors`);
      }
      setStage('preview');
    } catch {
      toast.error('Validation failed');
      setStage('preview');
    }
  };

  const handleUpload = async () => {
    if (validationErrors.length > 0) {
      toast.error('Fix validation errors first');
      return;
    }
    if (!user?.id) {
      toast.error('Not authenticated');
      return;
    }

    setStage('uploading');
    setUploadProgress(0);

    try {
      const summary = await bulkProcessOverrides(
        rows,
        user.id,
        userRole || undefined,
        (processed, total, label) => {
          setUploadProgress((processed / total) * 100);
          setCurrentLabel(label);
        },
      );

      setUploadSummary(summary);
      setStage('complete');

      if (summary.failed === 0) {
        toast.success(`${summary.successful} students updated!`);
      } else {
        toast.warning(`${summary.successful} succeeded, ${summary.failed} failed`);
      }
    } catch {
      toast.error('Upload failed');
      setStage('preview');
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  };

  const resetUpload = () => {
    setStage('select');
    setFile(null);
    setRows([]);
    setValidationErrors([]);
    setUploadProgress(0);
    setCurrentLabel('');
    setUploadSummary(null);
  };

  const downloadErrorReport = () => {
    if (!uploadSummary) return;
    const failed = uploadSummary.results.filter(r => !r.success);
    const csv = [
      'Row,Student Name,Error',
      ...failed.map(r => `${r.row},"${r.studentName || ''}","${r.error || ''}"`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student_override_errors.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/students')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <RefreshCw className="h-8 w-8" />
            Bulk Student Override
          </h1>
          <p className="text-muted-foreground">
            Override driver assignments and fares for multiple students at once
          </p>
        </div>
      </div>

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How it works</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Download the Excel template (pre-loaded with schools & drivers)</li>
            <li>Fill in <strong>student_name</strong>, <strong>phone_number</strong>, and select <strong>school</strong> from dropdown</li>
            <li>Select <strong>new_driver</strong> from dropdown (leave blank to skip)</li>
            <li>Enter <strong>new_fare</strong> if you want to override the fare (leave blank to skip)</li>
            <li>Upload, validate, and process</li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            Students are identified by <strong>name + phone + school</strong> combination.
            Only non-blank columns are overridden — blank columns are left unchanged.
          </p>
        </AlertDescription>
      </Alert>

      {/* Template */}
      <Card>
        <CardHeader>
          <CardTitle>Download Template</CardTitle>
          <CardDescription>Excel with dropdowns for school and driver selection</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleDownloadTemplate} disabled={downloadingTemplate}>
            {downloadingTemplate ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
            ) : (
              <><FileSpreadsheet className="mr-2 h-4 w-4" />Download Excel Template</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* File Upload */}
      {stage === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>Upload the filled template</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Drop your file here or click to browse</p>
              <p className="text-sm text-muted-foreground">Supports CSV, XLS, and XLSX</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {(stage === 'preview' || stage === 'validating') && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>{rows.length} rows in {file?.name}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="default">{rows.filter(r => r._matched).length} matched</Badge>
                  {rows.filter(r => !r._matched).length > 0 && (
                    <Badge variant="destructive">{rows.filter(r => !r._matched).length} not found</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>New Driver</TableHead>
                      <TableHead>New Fare</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => {
                      const hasError = validationErrors.some(e => e.row === idx + 2);
                      return (
                        <TableRow key={idx} className={hasError ? 'bg-destructive/10' : !row._matched ? 'bg-orange-50' : ''}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="font-medium">{row.student_name || '—'}</TableCell>
                          <TableCell>{row.phone_number || '—'}</TableCell>
                          <TableCell>{row._school_display || '—'}</TableCell>
                          <TableCell>{row._driver_display || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell>{row.new_fare !== null ? `₹${row.new_fare}` : <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell>
                            {row._matched ? (
                              <Badge variant="outline" className="text-green-600 border-green-300">
                                <CheckCircle className="h-3 w-3 mr-1" />Matched
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />Not Found
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {validationErrors.length > 0 && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Validation Errors ({validationErrors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {validationErrors.map((err, i) => (
                      <Alert key={i} variant="destructive">
                        <AlertDescription>
                          <strong>Row {err.row}, "{err.field}":</strong> {err.message}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetUpload}>Cancel</Button>
            <Button variant="secondary" onClick={handleValidate} disabled={stage === 'validating'}>
              {stage === 'validating' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Validating...</> : <><AlertCircle className="mr-2 h-4 w-4" />Validate</>}
            </Button>
            <Button onClick={handleUpload} disabled={validationErrors.length > 0}>
              <Upload className="mr-2 h-4 w-4" />Override {rows.filter(r => r._matched).length} Students
            </Button>
          </div>
        </>
      )}

      {/* Progress */}
      {stage === 'uploading' && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Overrides</CardTitle>
            <CardDescription>Updating driver assignments and fares...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={uploadProgress} />
            <p className="text-center text-sm text-muted-foreground">
              {Math.round(uploadProgress)}% complete
              {currentLabel && <span className="block mt-1">Processing: <strong>{currentLabel}</strong></span>}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Complete */}
      {stage === 'complete' && uploadSummary && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />Override Complete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-3xl font-bold">{uploadSummary.total}</p>
                  <p className="text-sm text-muted-foreground">Total Rows</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-green-50">
                  <p className="text-3xl font-bold text-green-600">{uploadSummary.successful}</p>
                  <p className="text-sm text-muted-foreground">Successful</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-red-50">
                  <p className="text-3xl font-bold text-red-600">{uploadSummary.failed}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>

              {uploadSummary.failed > 0 && (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Some overrides failed</AlertTitle>
                    <AlertDescription>{uploadSummary.failed} students could not be updated.</AlertDescription>
                  </Alert>
                  <Button variant="outline" onClick={downloadErrorReport}>
                    <Download className="mr-2 h-4 w-4" />Download Error Report
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetUpload}>Upload More</Button>
            <Button onClick={() => navigate('/students')}>Go to Students</Button>
          </div>
        </>
      )}
    </div>
  );
}
