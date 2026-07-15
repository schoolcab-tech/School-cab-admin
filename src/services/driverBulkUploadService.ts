import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { createUserAccount, markProfileCompleted } from './adminAuthService';

// ── Types ────────────────────────────────────────────────────────────

export interface DriverUploadRow {
  name: string;
  phone: string;
  cab_number: string;
  cab_capacity: number;
  license_number: string;
  vehicle_type: string;
  num_cabs_owned?: number;
  service_pincodes?: string;   // comma-separated pincodes
  schools_serving?: string;    // comma-separated school IDs
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface UploadResult {
  row: number;
  success: boolean;
  data?: DriverUploadRow;
  error?: string;
}

export interface BulkUploadSummary {
  total: number;
  successful: number;
  failed: number;
  results: UploadResult[];
  validationErrors: ValidationError[];
}

const VALID_VEHICLE_TYPES = ['sedan', 'suv', 'van', 'mini_bus'];

// ── File Parsing ─────────────────────────────────────────────────────

export const parseDriverExcelFile = (file: File): Promise<DriverUploadRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

        const drivers = jsonData.map((row: any) => normalizeDriverRow(row));
        resolve(drivers);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
};

export const parseDriverCSVFile = (file: File): Promise<DriverUploadRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const drivers = results.data.map((row: any) => normalizeDriverRow(row));
          resolve(drivers);
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

const normalizeDriverRow = (row: any): DriverUploadRow => {
  const getValue = (keys: string[]): string => {
    for (const key of keys) {
      const found = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
      if (found && row[found]) {
        return String(row[found]).trim();
      }
    }
    return '';
  };

  const getNumberValue = (keys: string[], defaultVal?: number): number => {
    const value = getValue(keys);
    if (!value) return defaultVal ?? 0;
    const num = parseInt(value, 10);
    return isNaN(num) ? (defaultVal ?? 0) : num;
  };

  return {
    name: getValue(['name', 'driver_name', 'drivername', 'full_name']),
    phone: getValue(['phone', 'phone_number', 'phonenumber', 'mobile', 'mobile_number']),
    cab_number: getValue(['cab_number', 'cabnumber', 'vehicle_number', 'vehiclenumber', 'registration_number']),
    cab_capacity: getNumberValue(['cab_capacity', 'cabcapacity', 'capacity', 'seats'], 0),
    license_number: getValue(['license_number', 'licensenumber', 'license', 'driving_license', 'dl_number']),
    vehicle_type: getValue(['vehicle_type', 'vehicletype', 'type']).toLowerCase(),
    num_cabs_owned: getNumberValue(['num_cabs_owned', 'cabs_owned', 'numcabsowned'], 1),
    service_pincodes: getValue(['service_pincodes', 'pincodes', 'service_areas', 'serviceareas', 'pincode']),
    schools_serving: getValue(['schools_serving', 'schoolsserving', 'school_ids', 'schoolids']),
  };
};

// ── Validation ───────────────────────────────────────────────────────

export const validateDriverRow = (driver: DriverUploadRow, rowIndex: number): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Required: name
  if (!driver.name || driver.name.length < 2) {
    errors.push({
      row: rowIndex,
      field: 'name',
      message: 'Driver name is required and must be at least 2 characters'
    });
  }

  // Required: phone (10-digit Indian mobile)
  if (!driver.phone) {
    errors.push({
      row: rowIndex,
      field: 'phone',
      message: 'Phone number is required'
    });
  } else {
    const cleaned = driver.phone.replace(/[\s\-\(\)\+]/g, '').replace(/^91/, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      errors.push({
        row: rowIndex,
        field: 'phone',
        message: 'Phone must be a valid 10-digit Indian mobile number (starting with 6-9)'
      });
    }
  }

  // Required: cab_number
  if (!driver.cab_number || driver.cab_number.length < 2) {
    errors.push({
      row: rowIndex,
      field: 'cab_number',
      message: 'Cab/vehicle number is required'
    });
  }

  // Required: cab_capacity (must be > 0)
  if (!driver.cab_capacity || driver.cab_capacity <= 0) {
    errors.push({
      row: rowIndex,
      field: 'cab_capacity',
      message: 'Cab capacity is required and must be greater than 0'
    });
  }

  // Required: license_number
  if (!driver.license_number || driver.license_number.length < 2) {
    errors.push({
      row: rowIndex,
      field: 'license_number',
      message: 'License number is required'
    });
  }

  // Required: vehicle_type (must be one of valid types)
  if (!driver.vehicle_type) {
    errors.push({
      row: rowIndex,
      field: 'vehicle_type',
      message: `Vehicle type is required. Must be one of: ${VALID_VEHICLE_TYPES.join(', ')}`
    });
  } else if (!VALID_VEHICLE_TYPES.includes(driver.vehicle_type)) {
    errors.push({
      row: rowIndex,
      field: 'vehicle_type',
      message: `Invalid vehicle type "${driver.vehicle_type}". Must be one of: ${VALID_VEHICLE_TYPES.join(', ')}`
    });
  }

  // Optional: service_pincodes format check
  if (driver.service_pincodes) {
    const pincodes = driver.service_pincodes.split(',').map(p => p.trim()).filter(Boolean);
    for (const pc of pincodes) {
      if (!/^\d{6}$/.test(pc)) {
        errors.push({
          row: rowIndex,
          field: 'service_pincodes',
          message: `Invalid pincode "${pc}". Each pincode must be exactly 6 digits`
        });
        break;
      }
    }
  }

  return errors;
};

export const validateAllDrivers = async (drivers: DriverUploadRow[]): Promise<ValidationError[]> => {
  const errors: ValidationError[] = [];
  const phones = new Set<string>();

  // Validate each row
  drivers.forEach((driver, index) => {
    const rowErrors = validateDriverRow(driver, index + 2); // +2 for header and 1-based
    errors.push(...rowErrors);

    // Check for duplicate phones within file
    if (driver.phone) {
      const cleaned = driver.phone.replace(/[\s\-\(\)\+]/g, '').replace(/^91/, '');
      if (phones.has(cleaned)) {
        errors.push({
          row: index + 2,
          field: 'phone',
          message: `Duplicate phone number in file: ${driver.phone}`
        });
      }
      phones.add(cleaned);
    }
  });

  // Check for existing phones in database
  if (phones.size > 0) {
    try {
      const phoneArray = Array.from(phones).map(p => `+91${p}`);
      const { data: existingUsers } = await supabase
        .from('phone_users')
        .select('phone_number')
        .in('phone_number', phoneArray);

      if (existingUsers && existingUsers.length > 0) {
        const existingPhones = new Set(
          existingUsers.map(u => u.phone_number.replace('+91', ''))
        );

        drivers.forEach((driver, index) => {
          if (driver.phone) {
            const cleaned = driver.phone.replace(/[\s\-\(\)\+]/g, '').replace(/^91/, '');
            if (existingPhones.has(cleaned)) {
              errors.push({
                row: index + 2,
                field: 'phone',
                message: `Phone number already exists in database: ${driver.phone}`
              });
            }
          }
        });
      }
    } catch (error) {
      console.error('Error checking existing phones:', error);
    }
  }

  return errors;
};

// ── Bulk Insert ──────────────────────────────────────────────────────

export const bulkInsertDrivers = async (
  drivers: DriverUploadRow[],
  onProgress?: (processed: number, total: number, currentName: string) => void
): Promise<BulkUploadSummary> => {
  const results: UploadResult[] = [];

  // Process drivers sequentially (each needs an auth account via edge function)
  for (let i = 0; i < drivers.length; i++) {
    const driver = drivers[i];
    const rowIndex = i + 2;

    if (onProgress) {
      onProgress(i, drivers.length, driver.name);
    }

    try {
      // Step 1: Create auth account via edge function
      const cleaned = driver.phone.replace(/[\s\-\(\)\+]/g, '').replace(/^91/, '');
      const authResult = await createUserAccount(cleaned, 'driver');

      // Step 2: Insert driver record
      const { data: driverRecord, error: driverError } = await supabase
        .from('drivers')
        .insert({
          name: driver.name,
          phone: `+91${cleaned}`,
          cab_number: driver.cab_number,
          cab_capacity: driver.cab_capacity,
          license_number: driver.license_number,
          vehicle_type: driver.vehicle_type,
          num_cabs_owned: driver.num_cabs_owned || 1,
          user_id: authResult.user_id,
          schools_serving: driver.schools_serving
            ? driver.schools_serving.split(',').map(s => s.trim()).filter(Boolean)
            : [],
        })
        .select()
        .single();

      if (driverError) throw driverError;

      // Step 3: Insert service areas
      if (driver.service_pincodes) {
        const pincodes = driver.service_pincodes.split(',').map(p => p.trim()).filter(Boolean);
        if (pincodes.length > 0) {
          const serviceAreasData = pincodes.map(pincode => ({
            driver_id: driverRecord.driver_id,
            pincode,
          }));

          const { error: saError } = await supabase
            .from('driver_service_areas')
            .insert(serviceAreasData);

          if (saError) {
            console.error(`Service areas error for driver ${driver.name}:`, saError);
            // Non-fatal: driver was created, just service areas failed
          }
        }
      }

      // Step 4: Mark profile completed
      await markProfileCompleted(cleaned);

      results.push({
        row: rowIndex,
        success: true,
        data: driver,
      });
    } catch (error) {
      results.push({
        row: rowIndex,
        success: false,
        data: driver,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Final progress
  if (onProgress) {
    onProgress(drivers.length, drivers.length, '');
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    total: drivers.length,
    successful,
    failed,
    results,
    validationErrors: [],
  };
};

// ── Template Generation ──────────────────────────────────────────────

export const generateDriverSampleCSV = (): string => {
  const headers = [
    'name',
    'phone',
    'cab_number',
    'cab_capacity',
    'license_number',
    'vehicle_type',
    'num_cabs_owned',
    'service_pincodes',
    'schools_serving',
  ];

  const sampleRow = [
    'Ramesh Kumar',
    '9876543210',
    'DL01AB1234',
    '6',
    'DL1234567890',
    'sedan',
    '1',
    '110001,110002',
    '',
  ];

  return `${headers.join(',')}\n${sampleRow.join(',')}`;
};

export const downloadDriverSampleTemplate = (format: 'csv' | 'xlsx') => {
  if (format === 'csv') {
    const csv = generateDriverSampleCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'drivers_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  } else {
    const headers = [
      'name',
      'phone',
      'cab_number',
      'cab_capacity',
      'license_number',
      'vehicle_type',
      'num_cabs_owned',
      'service_pincodes',
      'schools_serving',
    ];

    const sampleData = [
      [
        'Ramesh Kumar',
        '9876543210',
        'DL01AB1234',
        6,
        'DL1234567890',
        'sedan',
        1,
        '110001,110002',
        '',
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Drivers');
    XLSX.writeFile(wb, 'drivers_template.xlsx');
  }
};
