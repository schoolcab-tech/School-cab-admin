import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { createUserAccount, markProfileCompleted } from './adminAuthService';

// ── Types ────────────────────────────────────────────────────────────

export interface StudentUploadRow {
  name: string;
  phone: string;
  school_id: string;
  class: string;
  section: string;
  pickup_address: string;
  pickup_pincode: string;
  pickup_time: string;
  drop_address: string;
  drop_pincode: string;
  drop_time: string;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  drop_latitude?: number | null;
  drop_longitude?: number | null;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface UploadResult {
  row: number;
  success: boolean;
  data?: StudentUploadRow;
  error?: string;
}

export interface BulkUploadSummary {
  total: number;
  successful: number;
  failed: number;
  results: UploadResult[];
  validationErrors: ValidationError[];
}

// ── File Parsing ─────────────────────────────────────────────────────

export const parseStudentExcelFile = (file: File): Promise<StudentUploadRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

        const students = jsonData.map((row: any) => normalizeStudentRow(row));
        resolve(students);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
};

export const parseStudentCSVFile = (file: File): Promise<StudentUploadRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const students = results.data.map((row: any) => normalizeStudentRow(row));
          resolve(students);
        } catch (error) {
          reject(new Error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV file: ${error.message}`));
      }
    });
  });
};

// ── Row Normalization ────────────────────────────────────────────────

const normalizeStudentRow = (row: any): StudentUploadRow => {
  const getValue = (keys: string[]): string => {
    for (const key of keys) {
      const found = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
      if (found && row[found]) {
        return String(row[found]).trim();
      }
    }
    return '';
  };

  const getNumberValue = (keys: string[]): number | null => {
    const value = getValue(keys);
    if (!value) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  };

  return {
    name: getValue(['name', 'student_name', 'studentname', 'full_name']),
    phone: getValue(['phone', 'phone_number', 'phonenumber', 'mobile', 'mobile_number', 'parent_phone']),
    school_id: getValue(['school_id', 'schoolid', 'school']),
    class: getValue(['class', 'grade', 'standard']),
    section: getValue(['section', 'div', 'division']),
    pickup_address: getValue(['pickup_address', 'pickupaddress', 'pickup', 'home_address', 'address']),
    pickup_pincode: getValue(['pickup_pincode', 'pickuppincode', 'pincode', 'home_pincode']),
    pickup_time: getValue(['pickup_time', 'pickuptime', 'morning_time']),
    drop_address: getValue(['drop_address', 'dropaddress', 'drop', 'school_address']),
    drop_pincode: getValue(['drop_pincode', 'droppincode', 'school_pincode']),
    drop_time: getValue(['drop_time', 'droptime', 'evening_time', 'afternoon_time']),
    pickup_latitude: getNumberValue(['pickup_latitude', 'pickup_lat']),
    pickup_longitude: getNumberValue(['pickup_longitude', 'pickup_lng', 'pickup_lon']),
    drop_latitude: getNumberValue(['drop_latitude', 'drop_lat']),
    drop_longitude: getNumberValue(['drop_longitude', 'drop_lng', 'drop_lon']),
  };
};

// ── Validation ───────────────────────────────────────────────────────

export const validateStudentRow = (student: StudentUploadRow, rowIndex: number): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!student.name || student.name.length < 2) {
    errors.push({ row: rowIndex, field: 'name', message: 'Student name is required and must be at least 2 characters' });
  }

  // Phone validation (10-digit Indian mobile)
  if (!student.phone) {
    errors.push({ row: rowIndex, field: 'phone', message: 'Phone number is required' });
  } else {
    const cleaned = student.phone.replace(/[\s\-\(\)\+]/g, '').replace(/^91/, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      errors.push({ row: rowIndex, field: 'phone', message: 'Phone must be a valid 10-digit Indian mobile number (starting with 6-9)' });
    }
  }

  if (!student.school_id) {
    errors.push({ row: rowIndex, field: 'school_id', message: 'School ID is required' });
  } else if (!/^\d+$/.test(student.school_id)) {
    errors.push({ row: rowIndex, field: 'school_id', message: 'School ID must be a number' });
  }

  if (!student.class) {
    errors.push({ row: rowIndex, field: 'class', message: 'Class is required' });
  }

  if (!student.section) {
    errors.push({ row: rowIndex, field: 'section', message: 'Section is required' });
  }

  if (!student.pickup_address || student.pickup_address.length < 5) {
    errors.push({ row: rowIndex, field: 'pickup_address', message: 'Pickup address is required (min 5 characters)' });
  }

  if (!student.pickup_pincode || !/^\d{6}$/.test(student.pickup_pincode)) {
    errors.push({ row: rowIndex, field: 'pickup_pincode', message: 'Pickup pincode is required and must be 6 digits' });
  }

  if (!student.pickup_time) {
    errors.push({ row: rowIndex, field: 'pickup_time', message: 'Pickup time is required (e.g., 07:30)' });
  } else if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(student.pickup_time)) {
    errors.push({ row: rowIndex, field: 'pickup_time', message: 'Pickup time must be in HH:MM format' });
  }

  if (!student.drop_address || student.drop_address.length < 5) {
    errors.push({ row: rowIndex, field: 'drop_address', message: 'Drop address is required (min 5 characters)' });
  }

  if (!student.drop_pincode || !/^\d{6}$/.test(student.drop_pincode)) {
    errors.push({ row: rowIndex, field: 'drop_pincode', message: 'Drop pincode is required and must be 6 digits' });
  }

  if (!student.drop_time) {
    errors.push({ row: rowIndex, field: 'drop_time', message: 'Drop time is required (e.g., 14:00)' });
  } else if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(student.drop_time)) {
    errors.push({ row: rowIndex, field: 'drop_time', message: 'Drop time must be in HH:MM format' });
  }

  return errors;
};

export const validateAllStudents = async (students: StudentUploadRow[]): Promise<ValidationError[]> => {
  const errors: ValidationError[] = [];
  const phones = new Set<string>();

  // Validate each row
  students.forEach((student, index) => {
    const rowErrors = validateStudentRow(student, index + 2);
    errors.push(...rowErrors);

    // Check duplicate phones within file
    if (student.phone) {
      const cleaned = student.phone.replace(/[\s\-\(\)\+]/g, '').replace(/^91/, '');
      if (phones.has(cleaned)) {
        errors.push({ row: index + 2, field: 'phone', message: `Duplicate phone number in file: ${student.phone}` });
      }
      phones.add(cleaned);
    }
  });

  // Check existing phones in database
  if (phones.size > 0) {
    try {
      const phoneArray = Array.from(phones).map(p => `+91${p}`);
      const { data: existingUsers } = await supabase
        .from('phone_users')
        .select('phone_number')
        .in('phone_number', phoneArray);

      if (existingUsers && existingUsers.length > 0) {
        const existingPhones = new Set(existingUsers.map(u => u.phone_number.replace('+91', '')));

        students.forEach((student, index) => {
          if (student.phone) {
            const cleaned = student.phone.replace(/[\s\-\(\)\+]/g, '').replace(/^91/, '');
            if (existingPhones.has(cleaned)) {
              errors.push({ row: index + 2, field: 'phone', message: `Phone number already exists in database: ${student.phone}` });
            }
          }
        });
      }
    } catch (error) {
      console.error('Error checking existing phones:', error);
    }
  }

  // Check school IDs exist
  const schoolIds = [...new Set(students.map(s => s.school_id).filter(Boolean))];
  if (schoolIds.length > 0) {
    try {
      const { data: existingSchools } = await supabase
        .from('schools')
        .select('school_id')
        .in('school_id', schoolIds.map(Number));

      if (existingSchools) {
        const existingIds = new Set(existingSchools.map(s => String(s.school_id)));

        students.forEach((student, index) => {
          if (student.school_id && !existingIds.has(student.school_id)) {
            errors.push({ row: index + 2, field: 'school_id', message: `School ID ${student.school_id} does not exist in database` });
          }
        });
      }
    } catch (error) {
      console.error('Error checking school IDs:', error);
    }
  }

  return errors;
};

// ── Bulk Insert ──────────────────────────────────────────────────────

const normalizeTime = (time: string): string => {
  // Ensure HH:MM:SS format
  const parts = time.split(':');
  if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1]}:00`;
  if (parts.length === 3) return `${parts[0].padStart(2, '0')}:${parts[1]}:${parts[2]}`;
  return time;
};

export const bulkInsertStudents = async (
  students: StudentUploadRow[],
  onProgress?: (processed: number, total: number, currentName: string) => void
): Promise<BulkUploadSummary> => {
  const results: UploadResult[] = [];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const rowIndex = i + 2;

    if (onProgress) {
      onProgress(i, students.length, student.name);
    }

    try {
      // Step 1: Create auth account
      const cleaned = student.phone.replace(/[\s\-\(\)\+]/g, '').replace(/^91/, '');
      const authResult = await createUserAccount(cleaned, 'user');

      // Step 2: Insert student record
      const { error: studentError } = await supabase
        .from('students')
        .insert({
          user_id: authResult.user_id,
          name: student.name,
          phone_number: authResult.phone,
          school_id: parseInt(student.school_id),
          class: student.class,
          section: student.section,
          pickup_address: student.pickup_address,
          pickup_pincode: student.pickup_pincode,
          pickup_time: normalizeTime(student.pickup_time),
          pickup_latitude: student.pickup_latitude ?? null,
          pickup_longitude: student.pickup_longitude ?? null,
          pickup_location_source: 'manual',
          drop_address: student.drop_address,
          drop_pincode: student.drop_pincode,
          drop_time: normalizeTime(student.drop_time),
          drop_latitude: student.drop_latitude ?? null,
          drop_longitude: student.drop_longitude ?? null,
          drop_location_source: 'manual',
        });

      if (studentError) throw studentError;

      // Step 3: Mark profile completed
      await markProfileCompleted(cleaned);

      results.push({ row: rowIndex, success: true, data: student });
    } catch (error) {
      results.push({
        row: rowIndex,
        success: false,
        data: student,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (onProgress) {
    onProgress(students.length, students.length, '');
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return { total: students.length, successful, failed, results, validationErrors: [] };
};

// ── Template Generation ──────────────────────────────────────────────

export const generateStudentSampleCSV = (): string => {
  const headers = [
    'name', 'phone', 'school_id', 'class', 'section',
    'pickup_address', 'pickup_pincode', 'pickup_time',
    'drop_address', 'drop_pincode', 'drop_time',
    'pickup_latitude', 'pickup_longitude',
    'drop_latitude', 'drop_longitude',
  ];

  const sampleRow = [
    'Rahul Sharma', '9876543210', '28', '10th', 'A',
    '123 Main Street Rohini', '110001', '07:30',
    'DPS School Sec 12', '110002', '14:00',
    '28.7041', '77.1025',
    '28.5562', '77.1851',
  ];

  return `${headers.join(',')}\n${sampleRow.join(',')}`;
};

export const downloadStudentSampleTemplate = (format: 'csv' | 'xlsx') => {
  if (format === 'csv') {
    const csv = generateStudentSampleCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  } else {
    const headers = [
      'name', 'phone', 'school_id', 'class', 'section',
      'pickup_address', 'pickup_pincode', 'pickup_time',
      'drop_address', 'drop_pincode', 'drop_time',
      'pickup_latitude', 'pickup_longitude',
      'drop_latitude', 'drop_longitude',
    ];

    const sampleData = [[
      'Rahul Sharma', '9876543210', 28, '10th', 'A',
      '123 Main Street Rohini', '110001', '07:30',
      'DPS School Sec 12', '110002', '14:00',
      28.7041, 77.1025,
      28.5562, 77.1851,
    ]];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'students_template.xlsx');
  }
};
