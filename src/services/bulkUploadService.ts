import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';

export interface SchoolUploadRow {
  name: string;
  code: string;
  address: string;
  locality?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  email?: string;
  contact_number?: string;
  principal_name?: string;
  principal_contact?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface UploadResult {
  row: number;
  success: boolean;
  data?: SchoolUploadRow;
  error?: string;
}

export interface BulkUploadSummary {
  total: number;
  successful: number;
  failed: number;
  results: UploadResult[];
  validationErrors: ValidationError[];
}

/**
 * Parse Excel file to JSON
 */
export const parseExcelFile = (file: File): Promise<SchoolUploadRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

        const schools = jsonData.map((row: any) => normalizeRow(row));
        resolve(schools);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
};

/**
 * Parse CSV file to JSON
 */
export const parseCSVFile = (file: File): Promise<SchoolUploadRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const schools = results.data.map((row: any) => normalizeRow(row));
          resolve(schools);
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

/**
 * Normalize row data - handles different column name variations
 */
const normalizeRow = (row: any): SchoolUploadRow => {
  // Helper to find value by checking multiple possible keys (case-insensitive)
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
    name: getValue(['name', 'school_name', 'schoolname']),
    code: getValue(['code', 'school_code', 'schoolcode']),
    address: getValue(['address', 'street', 'street_address']),
    locality: getValue(['locality', 'area']) || '',
    city: getValue(['city']),
    state: getValue(['state']),
    pincode: getValue(['pincode', 'postal_code', 'postalcode', 'zip']),
    country: getValue(['country']) || 'India',
    email: getValue(['email', 'email_address', 'emailaddress']) || '',
    contact_number: getValue(['contact_number', 'phone', 'phone_number', 'contact', 'phonenumber']) || '',
    principal_name: getValue(['principal_name', 'principal', 'principalname']) || '',
    principal_contact: getValue(['principal_contact', 'principal_phone', 'principalcontact', 'principalphone']) || '',
    latitude: getNumberValue(['latitude', 'lat']),
    longitude: getNumberValue(['longitude', 'lng', 'lon']),
  };
};

/**
 * Validate a single school row
 */
export const validateSchoolRow = (school: SchoolUploadRow, rowIndex: number): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!school.name || school.name.length < 2) {
    errors.push({
      row: rowIndex,
      field: 'name',
      message: 'School name is required and must be at least 2 characters'
    });
  }

  if (!school.code || school.code.length < 2) {
    errors.push({
      row: rowIndex,
      field: 'code',
      message: 'School code is required and must be at least 2 characters'
    });
  }

  if (!school.address || school.address.length < 5) {
    errors.push({
      row: rowIndex,
      field: 'address',
      message: 'Address is required and must be at least 5 characters'
    });
  }

  if (!school.city || school.city.length < 2) {
    errors.push({
      row: rowIndex,
      field: 'city',
      message: 'City is required'
    });
  }

  if (!school.state || school.state.length < 2) {
    errors.push({
      row: rowIndex,
      field: 'state',
      message: 'State is required'
    });
  }

  if (!school.pincode || !/^\d{6}$/.test(school.pincode)) {
    errors.push({
      row: rowIndex,
      field: 'pincode',
      message: 'Pincode is required and must be 6 digits'
    });
  }

  // Optional field validation
  if (school.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(school.email)) {
    errors.push({
      row: rowIndex,
      field: 'email',
      message: 'Invalid email format'
    });
  }

  if (school.contact_number && !/^[\d\s\+\-\(\)]{10,15}$/.test(school.contact_number)) {
    errors.push({
      row: rowIndex,
      field: 'contact_number',
      message: 'Invalid phone number format'
    });
  }

  return errors;
};

/**
 * Validate all schools and check for duplicates
 */
export const validateAllSchools = async (schools: SchoolUploadRow[]): Promise<ValidationError[]> => {
  const errors: ValidationError[] = [];
  const codes = new Set<string>();

  // Validate each row
  schools.forEach((school, index) => {
    const rowErrors = validateSchoolRow(school, index + 2); // +2 for header and 1-based index
    errors.push(...rowErrors);

    // Check for duplicate codes within the file
    if (school.code) {
      if (codes.has(school.code.toLowerCase())) {
        errors.push({
          row: index + 2,
          field: 'code',
          message: `Duplicate school code in file: ${school.code}`
        });
      }
      codes.add(school.code.toLowerCase());
    }
  });

  // Check for existing codes in database
  if (codes.size > 0) {
    try {
      const { data: existingSchools } = await supabase
        .from('schools')
        .select('code')
        .in('code', Array.from(codes));

      if (existingSchools && existingSchools.length > 0) {
        const existingCodes = new Set(existingSchools.map(s => s.code.toLowerCase()));

        schools.forEach((school, index) => {
          if (school.code && existingCodes.has(school.code.toLowerCase())) {
            errors.push({
              row: index + 2,
              field: 'code',
              message: `School code already exists in database: ${school.code}`
            });
          }
        });
      }
    } catch (error) {
      console.error('Error checking existing codes:', error);
    }
  }

  return errors;
};

/**
 * Insert schools in batches with error handling
 */
export const bulkInsertSchools = async (
  schools: SchoolUploadRow[],
  onProgress?: (processed: number, total: number) => void
): Promise<BulkUploadSummary> => {
  const results: UploadResult[] = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < schools.length; i += BATCH_SIZE) {
    const batch = schools.slice(i, i + BATCH_SIZE);

    // Process batch
    const batchPromises = batch.map(async (school, batchIndex) => {
      const rowIndex = i + batchIndex + 2; // +2 for header and 1-based index

      try {
        const dbData = {
          name: school.name,
          code: school.code,
          address: school.address,
          locality: school.locality || '',
          city: school.city,
          state: school.state,
          pincode: school.pincode,
          country: school.country || 'India',
          email: school.email || '',
          contact_number: school.contact_number || '',
          principal_name: school.principal_name || '',
          principal_contact: school.principal_contact || '',
          latitude: school.latitude,
          longitude: school.longitude,
          status: 'active' as const,
          operating_hours: {
            monday: { open: '08:00', close: '15:00' },
            tuesday: { open: '08:00', close: '15:00' },
            wednesday: { open: '08:00', close: '15:00' },
            thursday: { open: '08:00', close: '15:00' },
            friday: { open: '08:00', close: '15:00' },
            saturday: null,
            sunday: null,
          }
        };

        const { error } = await supabase
          .from('schools')
          .insert(dbData);

        if (error) throw error;

        return {
          row: rowIndex,
          success: true,
          data: school
        };
      } catch (error) {
        return {
          row: rowIndex,
          success: false,
          data: school,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Report progress
    if (onProgress) {
      onProgress(i + batch.length, schools.length);
    }
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    total: schools.length,
    successful,
    failed,
    results,
    validationErrors: []
  };
};

/**
 * Generate sample CSV template
 */
export const generateSampleCSV = (): string => {
  const headers = [
    'name',
    'code',
    'address',
    'locality',
    'city',
    'state',
    'pincode',
    'country',
    'email',
    'contact_number',
    'principal_name',
    'principal_contact',
    'latitude',
    'longitude'
  ];

  const sampleRow = [
    'Delhi Public School',
    'DPS001',
    '123 Main Street',
    'Rohini',
    'New Delhi',
    'Delhi',
    '110001',
    'India',
    'info@dps.edu',
    '+91 9876543210',
    'Dr. John Doe',
    '+91 9876543211',
    '28.7041',
    '77.1025'
  ];

  return `${headers.join(',')}\n${sampleRow.join(',')}`;
};

/**
 * Download sample template file
 */
export const downloadSampleTemplate = (format: 'csv' | 'xlsx') => {
  if (format === 'csv') {
    const csv = generateSampleCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'schools_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  } else {
    // Generate Excel template
    const headers = [
      'name',
      'code',
      'address',
      'locality',
      'city',
      'state',
      'pincode',
      'country',
      'email',
      'contact_number',
      'principal_name',
      'principal_contact',
      'latitude',
      'longitude'
    ];

    const sampleData = [
      [
        'Delhi Public School',
        'DPS001',
        '123 Main Street',
        'Rohini',
        'New Delhi',
        'Delhi',
        '110001',
        'India',
        'info@dps.edu',
        '+91 9876543210',
        'Dr. John Doe',
        '+91 9876543211',
        28.7041,
        77.1025
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Schools');
    XLSX.writeFile(wb, 'schools_template.xlsx');
  }
};
