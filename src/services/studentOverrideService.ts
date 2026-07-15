import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { assignDriverToStudent } from './studentService';
import { fetchDriversRef } from './cashPaymentBulkUploadService';

// ── Types ────────────────────────────────────────────────────────────

export interface StudentOverrideRow {
  student_id: number;
  student_name: string;
  phone_number: string;
  school_id: number;
  new_driver_id: number | null;
  new_fare: number | null;
  // Resolved display names
  _student_display?: string;
  _school_display?: string;
  _driver_display?: string;
  _matched: boolean;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface UploadResult {
  row: number;
  success: boolean;
  studentName?: string;
  action?: string;
  error?: string;
}

export interface BulkOverrideSummary {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: UploadResult[];
}

type StudentRef = { student_id: number; name: string; phone_number: string | null; school_id: number; school_name: string };
type SchoolRef = { school_id: number; name: string };
type DriverRef = { driver_id: number; name: string; cab_number: string; phone: string };

// ── Helpers ──────────────────────────────────────────────────────────

const normalizePhone = (raw: string): string =>
  raw.replace(/[\s\-\(\)\+]/g, '').replace(/^91/, '');

const driverDisplay = (d: DriverRef) => `${d.name} - ${d.cab_number}`;
const schoolDisplay = (s: SchoolRef) => s.name;

// ── Fetch reference data ─────────────────────────────────────────────

/**
 * Fetch phones recovered from auth.users.email via RPC.
 * Returns a Map<user_id, phone> used as fallback when students.phone_number is NULL.
 */
const fetchPhoneFallbackMap = async (): Promise<Map<string, string>> => {
  const { data, error } = await supabase.rpc('get_student_phones_from_auth');
  if (error) {
    console.warn('Failed to fetch phone fallback map:', error.message);
    return new Map();
  }
  const map = new Map<string, string>();
  for (const row of (data || []) as Array<{ user_id: string; phone: string }>) {
    if (row.user_id && row.phone) map.set(row.user_id, row.phone);
  }
  return map;
};

const fetchStudentsWithPhone = async (): Promise<StudentRef[]> => {
  const [studentsRes, phoneMap] = await Promise.all([
    supabase
      .from('students')
      .select('student_id, name, phone_number, user_id, school_id, schools!inner(name)')
      .order('name'),
    fetchPhoneFallbackMap(),
  ]);

  if (studentsRes.error) throw studentsRes.error;
  return (studentsRes.data || []).map((s: any) => ({
    student_id: s.student_id,
    name: s.name,
    phone_number: s.phone_number || phoneMap.get(s.user_id) || null,
    school_id: s.school_id,
    school_name: s.schools?.name || 'Unknown',
  }));
};

// Fetch students with their current driver for the template reference sheet
type StudentRefWithDriver = StudentRef & {
  current_driver_name: string;
  current_driver_cab: string;
};

const fetchStudentsWithCurrentDriver = async (): Promise<StudentRefWithDriver[]> => {
  const [studentsRes, phoneMap] = await Promise.all([
    supabase
      .from('students')
      .select(`
        student_id, name, phone_number, user_id, school_id,
        schools!inner(name),
        bookings(driver_id, updated_at, drivers(name, cab_number))
      `)
      .order('name'),
    fetchPhoneFallbackMap(),
  ]);

  if (studentsRes.error) throw studentsRes.error;
  return (studentsRes.data || []).map((s: any) => {
    // Get most recent booking's driver
    const bookings = s.bookings || [];
    const sorted = [...bookings].sort((a: any, b: any) => {
      const dateA = new Date(a.updated_at || 0).getTime();
      const dateB = new Date(b.updated_at || 0).getTime();
      return dateB - dateA;
    });
    const latest = sorted[0];
    return {
      student_id: s.student_id,
      name: s.name,
      phone_number: s.phone_number || phoneMap.get(s.user_id) || null,
      school_id: s.school_id,
      school_name: s.schools?.name || 'Unknown',
      current_driver_name: latest?.drivers?.name || '',
      current_driver_cab: latest?.drivers?.cab_number || '',
    };
  });
};

const fetchSchoolsRef = async (): Promise<SchoolRef[]> => {
  const { data, error } = await supabase
    .from('schools')
    .select('school_id, name')
    .order('name');
  if (error) throw error;
  return (data || []) as SchoolRef[];
};

// ── File Parsing ─────────────────────────────────────────────────────

export const parseOverrideExcelFile = async (file: File): Promise<StudentOverrideRow[]> => {
  const [students, drivers, schools] = await Promise.all([
    fetchStudentsWithPhone(), fetchDriversRef(), fetchSchoolsRef(),
  ]);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
        resolve(json.map((row: any) => normalizeRow(row, students, drivers, schools)));
      } catch (err) {
        reject(new Error(`Failed to parse Excel: ${err instanceof Error ? err.message : 'Unknown'}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
};

export const parseOverrideCSVFile = async (file: File): Promise<StudentOverrideRow[]> => {
  const [students, drivers, schools] = await Promise.all([
    fetchStudentsWithPhone(), fetchDriversRef(), fetchSchoolsRef(),
  ]);
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          resolve(results.data.map((row: any) => normalizeRow(row, students, drivers, schools)));
        } catch (err) {
          reject(new Error(`Failed to parse CSV: ${err instanceof Error ? err.message : 'Unknown'}`));
        }
      },
      error: (err) => reject(new Error(`CSV parse error: ${err.message}`)),
    });
  });
};

// ── Row Normalization ────────────────────────────────────────────────

const normalizeRow = (
  row: any,
  students: StudentRef[],
  drivers: DriverRef[],
  schools: SchoolRef[],
): StudentOverrideRow => {
  const getValue = (keys: string[]): string => {
    for (const key of keys) {
      const found = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase());
      if (found && row[found] !== undefined && row[found] !== '') return String(row[found]).trim();
    }
    return '';
  };

  const rawName = getValue(['student_name', 'studentname', 'name', 'student']);
  const rawPhone = getValue(['phone_number', 'phonenumber', 'phone', 'mobile']);
  const rawSchool = getValue(['school', 'school_name', 'schoolname']);
  const rawDriver = getValue(['new_driver', 'newdriver', 'driver', 'driver_name', 'assigned_driver']);
  const rawFare = getValue(['new_fare', 'newfare', 'fare', 'monthly_fare']);

  // Resolve school
  let schoolId = 0;
  let schoolDisplayStr = rawSchool;
  if (rawSchool) {
    const schoolLower = rawSchool.toLowerCase().trim();
    const matched = schools.find(s => s.name.toLowerCase().trim() === schoolLower);
    if (matched) {
      schoolId = matched.school_id;
      schoolDisplayStr = matched.name;
    }
  }

  // Resolve student by name + phone + school
  // NOTE: trim both sides of the name — the DB has some student names with
  // trailing whitespace (e.g. "Aarav Panwar ") which would otherwise fail exact match.
  let studentId = 0;
  let studentDisplay = rawName;
  let matched = false;
  const phoneCleaned = normalizePhone(rawPhone);

  if (rawName && phoneCleaned && schoolId) {
    const nameLower = rawName.toLowerCase().trim();
    const found = students.find(
      s =>
        s.name.toLowerCase().trim() === nameLower &&
        normalizePhone(s.phone_number || '') === phoneCleaned &&
        s.school_id === schoolId
    );
    if (found) {
      studentId = found.student_id;
      studentDisplay = `${found.name} - ${found.school_name}`;
      matched = true;
    }
  }

  // Resolve driver (if provided)
  let driverId: number | null = null;
  let driverDisplayStr = rawDriver;
  if (rawDriver) {
    const driverAsNum = parseInt(rawDriver, 10);
    if (!isNaN(driverAsNum) && String(driverAsNum) === rawDriver) {
      driverId = driverAsNum;
      const d = drivers.find(d => d.driver_id === driverAsNum);
      driverDisplayStr = d ? driverDisplay(d) : rawDriver;
    } else {
      const dLower = rawDriver.toLowerCase().trim();
      const d = drivers.find(d => driverDisplay(d).toLowerCase().trim() === dLower)
        || drivers.find(d => d.name.toLowerCase().trim() === dLower);
      if (d) {
        driverId = d.driver_id;
        driverDisplayStr = driverDisplay(d);
      }
    }
  }

  // Resolve fare (if provided)
  const fare = rawFare ? parseFloat(rawFare) : null;

  return {
    student_id: studentId,
    student_name: rawName,
    phone_number: rawPhone,
    school_id: schoolId,
    new_driver_id: driverId,
    new_fare: fare !== null && !isNaN(fare) ? fare : null,
    _student_display: studentDisplay,
    _school_display: schoolDisplayStr,
    _driver_display: driverDisplayStr || undefined,
    _matched: matched,
  };
};

// ── Validation ───────────────────────────────────────────────────────

export const validateAllOverrides = async (rows: StudentOverrideRow[]): Promise<ValidationError[]> => {
  const errors: ValidationError[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const rowNum = index + 2;

    if (!row.student_name) {
      errors.push({ row: rowNum, field: 'student_name', message: 'Student name is required' });
    }
    if (!row.phone_number) {
      errors.push({ row: rowNum, field: 'phone_number', message: 'Phone number is required' });
    }
    if (!row.school_id) {
      errors.push({ row: rowNum, field: 'school', message: `School not found: "${row._school_display}"` });
    }
    if (!row._matched) {
      errors.push({ row: rowNum, field: 'student', message: `Student not found with name "${row.student_name}", phone "${row.phone_number}", school "${row._school_display}"` });
    }

    // At least one override must be non-blank
    if (row.new_driver_id === null && row.new_fare === null) {
      errors.push({ row: rowNum, field: 'override', message: 'No override specified — both new_driver and new_fare are blank' });
    }

    if (row.new_driver_id !== null && row.new_driver_id <= 0) {
      errors.push({ row: rowNum, field: 'new_driver', message: `Could not resolve driver: "${row._driver_display}"` });
    }

    if (row.new_fare !== null && row.new_fare <= 0) {
      errors.push({ row: rowNum, field: 'new_fare', message: 'Fare must be greater than 0' });
    }

    // Duplicate check
    if (row.student_id) {
      const key = String(row.student_id);
      if (seen.has(key)) {
        errors.push({ row: rowNum, field: 'student', message: 'Duplicate student in file' });
      }
      seen.add(key);
    }
  });

  return errors;
};

// ── Bulk Process ─────────────────────────────────────────────────────

export const bulkProcessOverrides = async (
  rows: StudentOverrideRow[],
  adminUserId: string,
  adminRole: string | undefined,
  onProgress?: (processed: number, total: number, label: string) => void,
): Promise<BulkOverrideSummary> => {
  const results: UploadResult[] = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    onProgress?.(i, rows.length, row.student_name || `Row ${rowNum}`);

    if (!row._matched || !row.student_id) {
      results.push({ row: rowNum, success: false, studentName: row.student_name, error: 'Student not matched' });
      continue;
    }

    const actions: string[] = [];

    try {
      // Override driver
      if (row.new_driver_id) {
        await assignDriverToStudent(
          row.student_id,
          row.new_driver_id,
          row.school_id,
          adminUserId,
          adminRole as any,
        );
        actions.push(`Driver → ${row._driver_display}`);
      }

      // Override fare
      if (row.new_fare !== null) {
        const { error } = await supabase
          .from('bookings')
          .update({ fare: row.new_fare, updated_at: new Date().toISOString() })
          .eq('student_id', row.student_id)
          .eq('school_id', row.school_id)
          .eq('status', 'confirmed');

        if (error) throw error;
        actions.push(`Fare → ₹${row.new_fare}`);
      }

      if (actions.length === 0) {
        skipped++;
        results.push({ row: rowNum, success: true, studentName: row.student_name, action: 'No changes' });
      } else {
        results.push({ row: rowNum, success: true, studentName: row.student_name, action: actions.join(', ') });
      }
    } catch (err) {
      results.push({
        row: rowNum,
        success: false,
        studentName: row.student_name,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  onProgress?.(rows.length, rows.length, '');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return { total: rows.length, successful, failed, skipped, results };
};

// ── Template Generation ──────────────────────────────────────────────

export const downloadOverrideTemplate = async (): Promise<void> => {
  const [drivers, schools, students] = await Promise.all([
    fetchDriversRef(),
    fetchSchoolsRef(),
    fetchStudentsWithCurrentDriver(),
  ]);

  const maxRows = 500;

  // ── Main sheet ──
  const headers = ['student_name', 'phone_number', 'school', 'new_driver', 'new_fare'];
  const sampleRow = ['', '', '', '', ''];
  const mainSheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  mainSheet['!cols'] = [
    { wch: 25 }, { wch: 16 }, { wch: 30 }, { wch: 30 }, { wch: 14 },
  ];

  // Data validation dropdowns
  mainSheet['!dataValidation'] = [
    {
      sqref: `C2:C${maxRows}`,
      type: 'list',
      formula1: `Schools!$B$2:$B$${schools.length + 1}`,
      showDropDown: false,
      error: 'Select a school from the dropdown',
      errorTitle: 'Invalid School',
    },
    {
      sqref: `D2:D${maxRows}`,
      type: 'list',
      formula1: `Drivers!$C$2:$C$${drivers.length + 1}`,
      showDropDown: false,
      error: 'Select a driver from the dropdown',
      errorTitle: 'Invalid Driver',
    },
  ];

  // ── Schools reference sheet ──
  const schoolsData = [
    ['school_id', 'name'],
    ...schools.map(s => [s.school_id, s.name]),
  ];
  const schoolsSheet = XLSX.utils.aoa_to_sheet(schoolsData);
  schoolsSheet['!cols'] = [{ wch: 10 }, { wch: 35 }];

  // ── Drivers reference sheet ──
  const driversData = [
    ['driver_id', 'name', 'display_name', 'cab_number', 'phone'],
    ...drivers.map(d => [d.driver_id, d.name, driverDisplay(d), d.cab_number, d.phone]),
  ];
  const driversSheet = XLSX.utils.aoa_to_sheet(driversData);
  driversSheet['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 35 }, { wch: 16 }, { wch: 14 }];

  // ── Students reference sheet (for VLOOKUP) ──
  // Sorted by name so admins can quickly find students to copy name+phone+school from.
  // Columns: student_id | name | phone_number | school | current_driver | current_cab
  const studentsData = [
    ['student_id', 'name', 'phone_number', 'school', 'current_driver', 'current_cab'],
    ...students.map(s => [
      s.student_id,
      s.name,
      s.phone_number || '',
      s.school_name,
      s.current_driver_name,
      s.current_driver_cab,
    ]),
  ];
  const studentsSheet = XLSX.utils.aoa_to_sheet(studentsData);
  studentsSheet['!cols'] = [
    { wch: 10 }, // student_id
    { wch: 25 }, // name
    { wch: 16 }, // phone_number
    { wch: 30 }, // school
    { wch: 25 }, // current_driver
    { wch: 16 }, // current_cab
  ];

  // ── Build workbook ──
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, mainSheet, 'Overrides');
  XLSX.utils.book_append_sheet(wb, studentsSheet, 'Students');
  XLSX.utils.book_append_sheet(wb, schoolsSheet, 'Schools');
  XLSX.utils.book_append_sheet(wb, driversSheet, 'Drivers');
  XLSX.writeFile(wb, 'student_override_template.xlsx');
};
