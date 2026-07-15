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
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader2,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  parseExcelFile,
  parseCSVFile,
  validateAllSchools,
  bulkInsertSchools,
  downloadSampleTemplate,
  type SchoolUploadRow,
  type ValidationError,
  type BulkUploadSummary
} from '@/services/bulkUploadService';
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

export default function BulkUploadSchools() {
  return (
    <DashboardLayout>
      <BulkUploadContent />
    </DashboardLayout>
  );
}

function BulkUploadContent() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<UploadStage>('select');
  const [file, setFile] = useState<File | null>(null);
  const [schools, setSchools] = useState<SchoolUploadRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSummary, setUploadSummary] = useState<BulkUploadSummary | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

    if (!fileExtension || !['csv', 'xlsx', 'xls'].includes(fileExtension)) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    setFile(selectedFile);
    setStage('preview');
    parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let parsedSchools: SchoolUploadRow[];

      if (fileExtension === 'csv') {
        parsedSchools = await parseCSVFile(file);
      } else {
        parsedSchools = await parseExcelFile(file);
      }

      if (parsedSchools.length === 0) {
        toast.error('No data found in file');
        setStage('select');
        return;
      }

      setSchools(parsedSchools);
      toast.success(`Parsed ${parsedSchools.length} schools from file`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse file');
      setStage('select');
    }
  };

  const handleValidate = async () => {
    setStage('validating');
    try {
      const errors = await validateAllSchools(schools);
      setValidationErrors(errors);

      if (errors.length === 0) {
        toast.success('All schools validated successfully!');
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

    try {
      const summary = await bulkInsertSchools(schools, (processed, total) => {
        setUploadProgress((processed / total) * 100);
      });

      setUploadSummary(summary);
      setStage('complete');

      if (summary.failed === 0) {
        toast.success(`Successfully uploaded ${summary.successful} schools!`);
      } else {
        toast.warning(`Uploaded ${summary.successful} schools, ${summary.failed} failed`);
      }
    } catch (error) {
      toast.error('Upload failed');
      setStage('preview');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const resetUpload = () => {
    setStage('select');
    setFile(null);
    setSchools([]);
    setValidationErrors([]);
    setUploadProgress(0);
    setUploadSummary(null);
  };

  const downloadErrorReport = () => {
    if (!uploadSummary) return;

    const failedRows = uploadSummary.results.filter(r => !r.success);
    const csv = [
      'Row,School Name,School Code,Error',
      ...failedRows.map(r =>
        `${r.row},"${r.data?.name || ''}","${r.data?.code || ''}","${r.error || ''}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'upload_errors.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/schools')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Upload className="h-8 w-8" />
            Bulk Upload Schools
          </h1>
          <p className="text-muted-foreground">
            Upload multiple schools at once using CSV or Excel files
          </p>
        </div>
      </div>

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How to use bulk upload</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Download the sample template (CSV or Excel format)</li>
            <li>Fill in your school data following the template format</li>
            <li>Upload the file and review the preview</li>
            <li>Validate the data to check for errors</li>
            <li>Upload to add schools to the database</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle>Download Template</CardTitle>
          <CardDescription>
            Get a sample template with the correct format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => downloadSampleTemplate('csv')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Download CSV Template
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadSampleTemplate('xlsx')}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Download Excel Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      {stage === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Select a CSV or Excel file containing school data
            </CardDescription>
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
              <p className="text-lg font-medium mb-2">
                Drop your file here or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Supports CSV, XLS, and XLSX files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
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
                    {schools.length} schools found in {file?.name}
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
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Pincode</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schools.map((school, index) => {
                      const rowErrors = validationErrors.filter(
                        (e) => e.row === index + 2
                      );
                      const hasError = rowErrors.length > 0;

                      return (
                        <TableRow key={index} className={hasError ? 'bg-destructive/10' : ''}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{school.name}</TableCell>
                          <TableCell>{school.code}</TableCell>
                          <TableCell>{school.city}</TableCell>
                          <TableCell>{school.pincode}</TableCell>
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
                <CardDescription>
                  Please fix these errors before uploading
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {validationErrors.map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertDescription>
                          <strong>Row {error.row}, Field "{error.field}":</strong> {error.message}
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
            <Button
              variant="secondary"
              onClick={handleValidate}
              disabled={stage === 'validating'}
            >
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
            <Button
              onClick={handleUpload}
              disabled={validationErrors.length > 0}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Schools
            </Button>
          </div>
        </>
      )}

      {/* Uploading Progress */}
      {stage === 'uploading' && (
        <Card>
          <CardHeader>
            <CardTitle>Uploading Schools</CardTitle>
            <CardDescription>Please wait while we upload your data...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={uploadProgress} />
            <p className="text-center text-sm text-muted-foreground">
              {Math.round(uploadProgress)}% complete
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
                  <p className="text-sm text-muted-foreground">Total Schools</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-green-50">
                  <p className="text-3xl font-bold text-green-600">
                    {uploadSummary.successful}
                  </p>
                  <p className="text-sm text-muted-foreground">Successful</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-red-50">
                  <p className="text-3xl font-bold text-red-600">
                    {uploadSummary.failed}
                  </p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>

              {uploadSummary.failed > 0 && (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Some uploads failed</AlertTitle>
                    <AlertDescription>
                      {uploadSummary.failed} schools could not be uploaded. Download the error
                      report for details.
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
              Upload More Schools
            </Button>
            <Button onClick={() => navigate('/schools')}>
              Go to Schools List
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
