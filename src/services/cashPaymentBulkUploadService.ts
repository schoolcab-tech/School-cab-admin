import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { format, addMonths } from 'date-fns';

// ── Types ────────────────────────────────────────────────────────────

export interface CashPaymentUploadRow {
  student_id: number;
  driver_id: number;
  monthly_fare: number;
  months_covered: number;
  start_date: string;
  discount_amount: number;
  coupon_code: string;
  // Resolved display names (populated during parsing)
  _student_display?: string;
  _driver_display?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface UploadResult {
  row: number;
  success: boolean;
  data?: CashPaymentUploadRow;
  studentName?: string;
  driverName?: string;
  error?: string;
}

export interface BulkUploadSummary {
  total: number;
  successful: number;
  failed: number;
  results: UploadResult[];
  validationErrors: ValidationError[];
}

type DriverRef = { driver_id: number; name: string; cab_number: string; phone: string };
type StudentRef = { student_id: number; name: string; school_name: string };

const VALID_MONTHS = [1, 3, 6, 12];

/**
 * Excel stores dates as serial numbers (days since 1900-01-01).
 * e.g. 2026-04-01 → 46112. Detect and convert back to YYYY-MM-DD.
 */
const excelSerialToDateStr = (serial: number): string => {
  // 25569 = days between Excel epoch (1900-01-01) and Unix epoch (1970-01-01)
  const date = new Date((serial - 25569) * 86400000);
  return format(date, 'yyyy-MM-dd');
};

const normalizeDateValue = (raw: string): string => {
  if (!raw) return '';
  // If it's a pure number (Excel serial date), convert it
  const num = Number(raw);
  if (!isNaN(num) && num > 30000 && num < 100000 && String(num) === raw) {
    return excelSerialToDateStr(num);
  }
  return raw;
};

// ── Display format helpers ───────────────────────────────────────────

const driverDisplay = (d: DriverRef) => `${d.name} - ${d.cab_number}`;
const studentDisplay = (s: StudentRef) => `${s.name} - ${s.school_name}`;

// ── Fetch reference data ─────────────────────────────────────────────

export const fetchDriversRef = async (): Promise<DriverRef[]> => {
  const { data, error } = await supabase
    .from('drivers')
    .select('driver_id, name, cab_number, phone')
    .order('name');
  if (error) throw error;
  return (data || []) as DriverRef[];
};

export const fetchStudentsRef = async (): Promise<StudentRef[]> => {
  const { data, error } = await supabase
    .from('students')
    .select('student_id, name, schools!inner(name)')
    .order('name');
  if (error) throw error;
  return (data || []).map((s: any) => ({
    student_id: s.student_id,
    name: s.name,
    school_name: s.schools?.name || 'Unknown',
  }));
};

// ── File Parsing ─────────────────────────────────────────────────────

export const parseCashPaymentExcelFile = async (file: File): Promise<CashPaymentUploadRow[]> => {
  const [drivers, students] = await Promise.all([fetchDriversRef(), fetchStudentsRef()]);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        // Always read from the first sheet (the Payments sheet)
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

        const rows = jsonData.map((row: any) => normalizeRow(row, drivers, students));
        resolve(rows);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
};

export const parseCashPaymentCSVFile = async (file: File): Promise<CashPaymentUploadRow[]> => {
  const [drivers, students] = await Promise.all([fetchDriversRef(), fetchStudentsRef()]);

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data.map((row: any) => normalizeRow(row, drivers, students));
          resolve(rows);
        } catch (error) {
          reject(new Error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV file: ${error.message}`));
      },
    });
  });
};

// ── Row Normalization (handles both IDs and display names) ───────────

const normalizeRow = (
  row: any,
  drivers: DriverRef[],
  students: StudentRef[],
): CashPaymentUploadRow => {
  const getValue = (keys: string[]): string => {
    for (const key of keys) {
      const found = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase());
      if (found && row[found] !== undefined && row[found] !== '') {
        return String(row[found]).trim();
      }
    }
    return '';
  };

  const getNumberValue = (keys: string[], defaultVal: number): number => {
    const value = getValue(keys);
    if (!value) return defaultVal;
    const num = parseFloat(value);
    return isNaN(num) ? defaultVal : num;
  };

  // Resolve driver: try as number first, then match display string
  const rawDriver = getValue(['driver', 'driver_id', 'driverid', 'driver_name']);
  const driverAsNum = parseInt(rawDriver, 10);
  let driverId = 0;
  let driverDisplayStr = rawDriver;

  if (!isNaN(driverAsNum) && driverAsNum > 0 && String(driverAsNum) === rawDriver) {
    // Pure numeric ID
    driverId = driverAsNum;
    const matched = drivers.find(d => d.driver_id === driverAsNum);
    driverDisplayStr = matched ? driverDisplay(matched) : rawDriver;
  } else if (rawDriver) {
    // Display string like "Ramesh Kumar - DL01AB1234"
    const rawLower = rawDriver.toLowerCase();
    const matched = drivers.find(d => driverDisplay(d).toLowerCase() === rawLower)
      || drivers.find(d => d.name.toLowerCase() === rawLower);
    if (matched) {
      driverId = matched.driver_id;
      driverDisplayStr = driverDisplay(matched);
    }
  }

  // Resolve student: try as number first, then match display string
  const rawStudent = getValue(['student', 'student_id', 'studentid', 'student_name']);
  const studentAsNum = parseInt(rawStudent, 10);
  let studentId = 0;
  let studentDisplayStr = rawStudent;

  if (!isNaN(studentAsNum) && studentAsNum > 0 && String(studentAsNum) === rawStudent) {
    studentId = studentAsNum;
    const matched = students.find(s => s.student_id === studentAsNum);
    studentDisplayStr = matched ? studentDisplay(matched) : rawStudent;
  } else if (rawStudent) {
    const rawLower = rawStudent.toLowerCase();
    const matched = students.find(s => studentDisplay(s).toLowerCase() === rawLower)
      || students.find(s => s.name.toLowerCase() === rawLower);
    if (matched) {
      studentId = matched.student_id;
      studentDisplayStr = studentDisplay(matched);
    }
  }

  return {
    student_id: studentId,
    driver_id: driverId,
    monthly_fare: getNumberValue(['monthly_fare', 'monthlyfare', 'fare', 'amount'], 0),
    months_covered: getNumberValue(['months_covered', 'monthscovered', 'months'], 1),
    start_date: normalizeDateValue(getValue(['start_date', 'start_date (yyyy-mm-dd)', 'startdate', 'date', 'cycle_start_date'])),
    discount_amount: getNumberValue(['discount_amount', 'discountamount', 'discount'], 0),
    coupon_code: getValue(['coupon_code', 'couponcode', 'coupon']),
    _student_display: studentDisplayStr,
    _driver_display: driverDisplayStr,
  };
};

// ── Validation ───────────────────────────────────────────────────────

const validateRow = (row: CashPaymentUploadRow, rowIndex: number): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!row.student_id || row.student_id <= 0) {
    const hint = row._student_display ? ` (could not match "${row._student_display}")` : '';
    errors.push({ row: rowIndex, field: 'student', message: `Could not resolve student${hint}. Pick a value from the dropdown or use a valid ID.` });
  }

  if (!row.driver_id || row.driver_id <= 0) {
    const hint = row._driver_display ? ` (could not match "${row._driver_display}")` : '';
    errors.push({ row: rowIndex, field: 'driver', message: `Could not resolve driver${hint}. Pick a value from the dropdown or use a valid ID.` });
  }

  if (!row.monthly_fare || row.monthly_fare <= 0) {
    errors.push({ row: rowIndex, field: 'monthly_fare', message: 'Monthly fare is required and must be greater than 0' });
  }

  if (!VALID_MONTHS.includes(row.months_covered)) {
    errors.push({ row: rowIndex, field: 'months_covered', message: `Months covered must be one of: ${VALID_MONTHS.join(', ')}` });
  }

  if (!row.start_date) {
    errors.push({ row: rowIndex, field: 'start_date', message: 'Start date is required (YYYY-MM-DD)' });
  } else {
    const parsed = new Date(row.start_date);
    if (isNaN(parsed.getTime())) {
      errors.push({ row: rowIndex, field: 'start_date', message: `Invalid date "${row.start_date}". Use YYYY-MM-DD format` });
    }
  }

  if (row.discount_amount < 0) {
    errors.push({ row: rowIndex, field: 'discount_amount', message: 'Discount amount cannot be negative' });
  }

  const totalAmount = row.monthly_fare * row.months_covered;
  const finalAmount = totalAmount - (row.discount_amount || 0);
  if (row.monthly_fare > 0 && row.months_covered > 0 && finalAmount <= 0) {
    errors.push({ row: rowIndex, field: 'discount_amount', message: 'Discount exceeds total amount — final amount must be greater than 0' });
  }

  return errors;
};

export const validateAllCashPayments = async (rows: CashPaymentUploadRow[]): Promise<ValidationError[]> => {
  const errors: ValidationError[] = [];
  const studentDriverPairs = new Set<string>();

  // Per-row validation
  rows.forEach((row, index) => {
    const rowErrors = validateRow(row, index + 2);
    errors.push(...rowErrors);

    if (row.student_id && row.driver_id) {
      const key = `${row.student_id}-${row.driver_id}`;
      if (studentDriverPairs.has(key)) {
        errors.push({
          row: index + 2,
          field: 'student',
          message: `Duplicate: same student-driver combination appears multiple times in file`,
        });
      }
      studentDriverPairs.add(key);
    }
  });

  // Verify student IDs exist in database
  const studentIds = [...new Set(rows.map(r => r.student_id).filter(id => id > 0))];
  if (studentIds.length > 0) {
    const { data: existingStudents } = await supabase
      .from('students')
      .select('student_id')
      .in('student_id', studentIds);

    const existingSet = new Set((existingStudents || []).map(s => s.student_id));
    rows.forEach((row, index) => {
      if (row.student_id > 0 && !existingSet.has(row.student_id)) {
        errors.push({ row: index + 2, field: 'student', message: `Student ID ${row.student_id} does not exist in database` });
      }
    });
  }

  // Verify driver IDs exist in database
  const driverIds = [...new Set(rows.map(r => r.driver_id).filter(id => id > 0))];
  if (driverIds.length > 0) {
    const { data: existingDrivers } = await supabase
      .from('drivers')
      .select('driver_id')
      .in('driver_id', driverIds);

    const existingSet = new Set((existingDrivers || []).map(d => d.driver_id));
    rows.forEach((row, index) => {
      if (row.driver_id > 0 && !existingSet.has(row.driver_id)) {
        errors.push({ row: index + 2, field: 'driver', message: `Driver ID ${row.driver_id} does not exist in database` });
      }
    });
  }

  return errors;
};

// ── Bulk Process ─────────────────────────────────────────────────────

export const bulkProcessCashPayments = async (
  rows: CashPaymentUploadRow[],
  onProgress?: (processed: number, total: number, currentLabel: string) => void,
): Promise<BulkUploadSummary> => {
  const results: UploadResult[] = [];

  const studentIds = [...new Set(rows.map(r => r.student_id))];
  const driverIds = [...new Set(rows.map(r => r.driver_id))];

  const { data: studentsData } = await supabase
    .from('students')
    .select('student_id, name, school_id, pickup_address, pickup_pincode, drop_address, drop_pincode, user_id')
    .in('student_id', studentIds);

  const { data: driversData } = await supabase
    .from('drivers')
    .select('driver_id, name')
    .in('driver_id', driverIds);

  const studentMap = new Map((studentsData || []).map(s => [s.student_id, s]));
  const driverMap = new Map((driversData || []).map(d => [d.driver_id, d]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowIndex = i + 2;
    const student = studentMap.get(row.student_id);
    const driver = driverMap.get(row.driver_id);

    onProgress?.(i, rows.length, student?.name || `Row ${rowIndex}`);

    try {
      if (!student) throw new Error(`Student ${row.student_id} not found`);
      if (!driver) throw new Error(`Driver ${row.driver_id} not found`);

      const months = row.months_covered;
      const totalAmount = row.monthly_fare * months;
      const discount = row.discount_amount || 0;
      const finalAmount = totalAmount - discount;
      const cycleStartDate = new Date(row.start_date);
      const cycleEndDate = addMonths(cycleStartDate, months);

      // Step 1: Find or create booking
      const { data: existingBooking } = await supabase
        .from('bookings')
        .select('booking_id')
        .eq('student_id', row.student_id)
        .eq('driver_id', row.driver_id)
        .eq('status', 'confirmed')
        .maybeSingle();

      let bookingId: number;

      if (existingBooking) {
        bookingId = existingBooking.booking_id;
      } else {
        const { data: newBooking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            user_id: student.user_id,
            student_id: row.student_id,
            driver_id: row.driver_id,
            school_id: student.school_id,
            booking_type: 'monthly',
            fare: row.monthly_fare,
            status: 'confirmed',
            booking_date: row.start_date,
            pickup_address: student.pickup_address,
            drop_address: student.drop_address,
            pickup_pincode: student.pickup_pincode,
            drop_pincode: student.drop_pincode,
            pickup_time: '08:00',
            drop_time: '14:00',
            subscription_model: 'cycle',
            duration_start_date: row.start_date,
            duration_end_date: format(cycleEndDate, 'yyyy-MM-dd'),
          })
          .select('booking_id')
          .single();

        if (bookingError) throw bookingError;
        bookingId = newBooking.booking_id;
      }

      // Step 2: Wait for DB trigger, then update subscription cycle
      await new Promise(resolve => setTimeout(resolve, 200));

      const { data: triggerCycle, error: cycleError } = await supabase
        .from('subscription_cycles')
        .select('cycle_id')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cycleError) throw cycleError;

      const { data: updatedCycle, error: updateError } = await supabase
        .from('subscription_cycles')
        .update({
          cycle_start_date: format(cycleStartDate, 'yyyy-MM-dd'),
          cycle_end_date: format(cycleEndDate, 'yyyy-MM-dd'),
          monthly_fare: row.monthly_fare,
          months_paid: months,
          total_amount: totalAmount,
          discount_amount: discount,
          final_amount: finalAmount,
          payment_status: 'paid',
        })
        .eq('cycle_id', triggerCycle.cycle_id)
        .select('cycle_id')
        .single();

      if (updateError) throw updateError;
      const cycleId = updatedCycle.cycle_id;

      // Step 3: Create subscription payment (if not already exists)
      const { data: existingPayment } = await supabase
        .from('subscription_payments')
        .select('subscription_payment_id')
        .eq('cycle_id', cycleId)
        .eq('transaction_status', 'completed')
        .maybeSingle();

      if (!existingPayment) {
        const { error: paymentError } = await supabase
          .from('subscription_payments')
          .insert({
            cycle_id: cycleId,
            booking_id: bookingId,
            user_id: student.user_id,
            driver_id: row.driver_id,
            amount: finalAmount,
            months_covered: months,
            discount_applied: discount,
            coupon_code: row.coupon_code || null,
            payment_method: 'cash',
            transaction_status: 'completed',
            transaction_date: new Date().toISOString(),
          });

        if (paymentError) throw paymentError;
      }

      // Step 4: Update booking with last cycle end date
      await supabase
        .from('bookings')
        .update({ last_cycle_end_date: format(cycleEndDate, 'yyyy-MM-dd') })
        .eq('booking_id', bookingId);

      results.push({
        row: rowIndex,
        success: true,
        data: row,
        studentName: student.name,
        driverName: driver.name,
      });
    } catch (error) {
      results.push({
        row: rowIndex,
        success: false,
        data: row,
        studentName: student?.name,
        driverName: driver?.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  onProgress?.(rows.length, rows.length, '');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return { total: rows.length, successful, failed, results, validationErrors: [] };
};

// ── Template Generation (dynamic with dropdowns) ─────────────────────

/**
 * Generate and download an Excel template with:
 * - "Payments" sheet: main data entry with dropdown columns for driver & student
 * - "Drivers" reference sheet: all drivers with ID, name, cab_number, phone
 * - "Students" reference sheet: all students with ID, name, school_name
 * - Data validation dropdowns on the driver and student columns
 */
export const downloadCashPaymentTemplate = async (): Promise<void> => {
  const [drivers, students] = await Promise.all([fetchDriversRef(), fetchStudentsRef()]);

  const driverOptions = drivers.map(d => driverDisplay(d));
  const studentOptions = students.map(s => studentDisplay(s));

  // ── Payments sheet (main entry) ──
  const paymentHeaders = [
    'driver',
    'student',
    'monthly_fare',
    'months_covered',
    'start_date (YYYY-MM-DD)',
    'discount_amount',
    'coupon_code',
  ];

  // Pre-fill a sample row so the format is obvious
  const today = format(new Date(), 'yyyy-MM-dd');
  const sampleDriver = drivers.length > 0 ? driverDisplay(drivers[0]) : '';
  const sampleStudent = students.length > 0 ? studentDisplay(students[0]) : '';
  const sampleRow = [sampleDriver, sampleStudent, 1200, 1, today, 0, ''];

  const paymentSheet = XLSX.utils.aoa_to_sheet([paymentHeaders, sampleRow]);
  const maxRows = 500;

  // Set column widths for readability
  paymentSheet['!cols'] = [
    { wch: 30 }, // driver
    { wch: 35 }, // student
    { wch: 14 }, // monthly_fare
    { wch: 16 }, // months_covered
    { wch: 24 }, // start_date (YYYY-MM-DD)
    { wch: 16 }, // discount_amount
    { wch: 14 }, // coupon_code
  ];

  // Format the start_date column as text so Excel doesn't convert dates to serial numbers
  for (let r = 1; r <= maxRows; r++) {
    const cellRef = `E${r + 1}`;
    if (!paymentSheet[cellRef]) paymentSheet[cellRef] = { t: 's', v: '' };
    paymentSheet[cellRef].z = '@'; // Text format
  }
  // Ensure the sample row date stays as text
  if (paymentSheet['E2']) {
    paymentSheet['E2'] = { t: 's', v: today, z: '@' };
  }

  // Add a comment/note on the start_date header cell (E1)
  paymentSheet['E1'].c = [{ a: 'SchoolCab', t: 'Format: YYYY-MM-DD\nExample: 2026-04-01\n(Year-Month-Day)' }];

  // Add data validation (dropdowns) for driver and student columns
  paymentSheet['!dataValidation'] = [
    {
      sqref: `A2:A${maxRows}`,
      type: 'list',
      formula1: `Drivers!$C$2:$C$${drivers.length + 1}`,
      showDropDown: false, // false = SHOW the dropdown arrow (Excel inverts this)
      error: 'Please select a driver from the dropdown',
      errorTitle: 'Invalid Driver',
    },
    {
      sqref: `B2:B${maxRows}`,
      type: 'list',
      formula1: `Students!$C$2:$C$${students.length + 1}`,
      showDropDown: false,
      error: 'Please select a student from the dropdown',
      errorTitle: 'Invalid Student',
    },
    {
      sqref: `D2:D${maxRows}`,
      type: 'list',
      formula1: '"1,3,6,12"',
      showDropDown: false,
      error: 'Months must be 1, 3, 6, or 12',
      errorTitle: 'Invalid Months',
    },
  ];

  // ── Drivers reference sheet ──
  const driversSheetData = [
    ['driver_id', 'name', 'display_name', 'cab_number', 'phone'],
    ...drivers.map(d => [d.driver_id, d.name, driverDisplay(d), d.cab_number, d.phone]),
  ];
  const driversSheet = XLSX.utils.aoa_to_sheet(driversSheetData);
  driversSheet['!cols'] = [
    { wch: 10 },
    { wch: 25 },
    { wch: 35 },
    { wch: 16 },
    { wch: 14 },
  ];

  // ── Students reference sheet ──
  const studentsSheetData = [
    ['student_id', 'name', 'display_name', 'school_name'],
    ...students.map(s => [s.student_id, s.name, studentDisplay(s), s.school_name]),
  ];
  const studentsSheet = XLSX.utils.aoa_to_sheet(studentsSheetData);
  studentsSheet['!cols'] = [
    { wch: 12 },
    { wch: 25 },
    { wch: 40 },
    { wch: 30 },
  ];

  // ── Build workbook ──
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, paymentSheet, 'Payments');
  XLSX.utils.book_append_sheet(wb, driversSheet, 'Drivers');
  XLSX.utils.book_append_sheet(wb, studentsSheet, 'Students');

  XLSX.writeFile(wb, 'cash_payments_template.xlsx');
};
