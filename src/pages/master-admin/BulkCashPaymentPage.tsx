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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  parseCashPaymentExcelFile,
  parseCashPaymentCSVFile,
  validateAllCashPayments,
  bulkProcessCashPayments,
  downloadCashPaymentTemplate,
  type CashPaymentUploadRow,
  type ValidationError,
  type BulkUploadSummary,
} from '@/services/cashPaymentBulkUploadService';
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

export default function BulkCashPaymentPage() {
  return (
    <DashboardLayout>
      <BulkCashPaymentContent />
    </DashboardLayout>
  );
}

function BulkCashPaymentContent() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<UploadStage>('select');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CashPaymentUploadRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentLabel, setCurrentLabel] = useState('');
  const [uploadSummary, setUploadSummary] = useState<BulkUploadSummary | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      await downloadCashPaymentTemplate();
      toast.success('Template downloaded with latest drivers & students');
    } catch (error) {
      toast.error('Failed to generate template: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
        ? await parseCashPaymentCSVFile(file)
        : await parseCashPaymentExcelFile(file);

      if (parsed.length === 0) {
        toast.error('No data found in file');
        setStage('select');
        return;
      }

      setRows(parsed);
      toast.success(`Parsed ${parsed.length} payment rows from file`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse file');
      setStage('select');
    }
  };

  const handleValidate = async () => {
    setStage('validating');
    try {
      const errors = await validateAllCashPayments(rows);
      setValidationErrors(errors);

      if (errors.length === 0) {
        toast.success('All rows validated successfully!');
      } else {
        toast.warning(`Found ${errors.length} validation errors`);
      }
      setStage('preview');
    } catch (error) {
      toast.error('Validation failed');
      setStage('preview');
    }
  };

  const handleUpload = async () => {
    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before uploading');
      return;
    }

    setStage('uploading');
    setUploadProgress(0);
    setCurrentLabel('');

    try {
      const summary = await bulkProcessCashPayments(rows, (processed, total, label) => {
        setUploadProgress((processed / total) * 100);
        setCurrentLabel(label);
      });

      setUploadSummary(summary);
      setStage('complete');

      if (summary.failed === 0) {
        toast.success(`Successfully recorded ${summary.successful} cash payments!`);
      } else {
        toast.warning(`Recorded ${summary.successful} payments, ${summary.failed} failed`);
      }
    } catch (error) {
      toast.error('Upload failed');
      setStage('preview');
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
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
    const failedRows = uploadSummary.results.filter(r => !r.success);
    const csv = [
      'Row,Student,Driver,Monthly Fare,Error',
      ...failedRows.map(r =>
        `${r.row},"${r.studentName || r.data?.student_id || ''}","${r.driverName || r.data?.driver_id || ''}",${r.data?.monthly_fare || ''},"${r.error || ''}"`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cash_payment_upload_errors.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/master-admin/earnings')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Upload className="h-8 w-8" />
            Bulk Cash Payments
          </h1>
          <p className="text-muted-foreground">
            Record multiple offline cash payments at once using Excel
          </p>
        </div>
      </div>

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How to use bulk upload</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Download the Excel template (pre-loaded with your drivers & students)</li>
            <li>In the <strong>driver</strong> and <strong>student</strong> columns, use the <strong>dropdown</strong> to select names</li>
            <li>Fill in fare, months covered (1/3/6/12), and start date (YYYY-MM-DD)</li>
            <li>Upload the file, validate, and process payments</li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            The template includes "Drivers" and "Students" reference sheets with all IDs and names.
            Each row creates a booking (if needed), subscription cycle, and payment record.
          </p>
        </AlertDescription>
      </Alert>

      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle>Download Template</CardTitle>
          <CardDescription>
            Excel template with dropdowns for driver and student selection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleDownloadTemplate} disabled={downloadingTemplate}>
            {downloadingTemplate ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Template...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Download Excel Template
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* File Upload (select stage) */}
      {stage === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>Upload the filled template (CSV or Excel)</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Drop your file here or click to browse</p>
              <p className="text-sm text-muted-foreground">Supports CSV, XLS, and XLSX files</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview & Validation */}
      {(stage === 'preview' || stage === 'validating') && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Preview Data</CardTitle>
                  <CardDescription>
                    {rows.length} payments found in {file?.name}
                  </CardDescription>
                </div>
                <Badge variant={validationErrors.length > 0 ? 'destructive' : 'default'}>
                  {validationErrors.length > 0
                    ? `${validationErrors.length} errors`
                    : 'Ready to upload'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Monthly Fare</TableHead>
                      <TableHead>Months</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => {
                      const rowErrors = validationErrors.filter(e => e.row === index + 2);
                      const hasError = rowErrors.length > 0;

                      return (
                        <TableRow key={index} className={hasError ? 'bg-destructive/10' : ''}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="max-w-[180px]">
                            {row._driver_display || row.driver_id || '—'}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            {row._student_display || row.student_id || '—'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.monthly_fare ? `₹${row.monthly_fare}` : '—'}
                          </TableCell>
                          <TableCell>{row.months_covered}</TableCell>
                          <TableCell>{row.start_date || '—'}</TableCell>
                          <TableCell>
                            {row.discount_amount > 0 ? `₹${row.discount_amount}` : '—'}
                          </TableCell>
                          <TableCell>
                            {hasError ? (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Error
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Valid
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

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Validation Errors ({validationErrors.length})
                </CardTitle>
                <CardDescription>Please fix these errors in your file before uploading</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {validationErrors.map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertDescription>
                          <strong>Row {error.row}, "{error.field}":</strong> {error.message}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetUpload}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleValidate} disabled={stage === 'validating'}>
              {stage === 'validating' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Validate Data
                </>
              )}
            </Button>
            <Button onClick={handleUpload} disabled={validationErrors.length > 0}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Payments
            </Button>
          </div>
        </>
      )}

      {/* Uploading Progress */}
      {stage === 'uploading' && (
        <Card>
          <CardHeader>
            <CardTitle>Recording Cash Payments</CardTitle>
            <CardDescription>
              Each payment creates booking, subscription cycle, and payment record...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={uploadProgress} />
            <p className="text-center text-sm text-muted-foreground">
              {Math.round(uploadProgress)}% complete
              {currentLabel && (
                <span className="block mt-1">
                  Processing: <strong>{currentLabel}</strong>
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upload Complete */}
      {stage === 'complete' && uploadSummary && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                Upload Complete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-3xl font-bold">{uploadSummary.total}</p>
                  <p className="text-sm text-muted-foreground">Total Payments</p>
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
                    <AlertTitle>Some payments failed</AlertTitle>
                    <AlertDescription>
                      {uploadSummary.failed} payments could not be recorded. Download the error report for details.
                    </AlertDescription>
                  </Alert>
                  <Button variant="outline" onClick={downloadErrorReport}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Error Report
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetUpload}>
              Upload More Payments
            </Button>
            <Button onClick={() => navigate('/master-admin/earnings')}>
              Go to Earnings
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
