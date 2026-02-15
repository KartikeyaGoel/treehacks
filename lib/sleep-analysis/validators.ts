/**
 * Data validation and parsing for multiple wearable formats
 * Supports: Apple Health XML, Fitbit CSV, Oura CSV
 * Ported from python/sleep_analysis/validators.py
 */

import { XMLParser } from 'fast-xml-parser';
import type { SleepRecord, ValidationResult } from './types';

/**
 * Validate sleep data meets minimum requirements
 *
 * Requirements:
 * - Minimum 14 days of data
 * - Required fields present
 * - Realistic value ranges
 *
 * @param records - Array of partial sleep record objects
 * @returns ValidationResult with validation status
 */
export function validateSleepData(records: Partial<SleepRecord>[]): ValidationResult {
  if (records.length < 14) {
    return {
      valid: false,
      error_message: `Insufficient data: ${records.length} days provided, minimum 14 days required`,
      num_records: records.length,
    };
  }

  // Check required fields
  const requiredFields = ['date', 'sleep_efficiency', 'deep_sleep_min', 'rem_sleep_min', 'awakenings'];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const missingFields = requiredFields.filter((f) => !(f in record));

    if (missingFields.length > 0) {
      return {
        valid: false,
        error_message: `Missing required fields in record ${i}: ${missingFields.join(', ')}`,
        num_records: records.length,
      };
    }

    // Validate ranges
    try {
      const eff = Number(record.sleep_efficiency);
      if (eff < 0 || eff > 100) {
        return {
          valid: false,
          error_message: `Invalid sleep_efficiency in record ${i}: ${eff}% (must be 0-100)`,
          num_records: records.length,
        };
      }

      const deep = Number(record.deep_sleep_min);
      if (deep < 0 || deep > 360) {
        return {
          valid: false,
          error_message: `Invalid deep_sleep_min in record ${i}: ${deep} (must be 0-360)`,
          num_records: records.length,
        };
      }

      const rem = Number(record.rem_sleep_min);
      if (rem < 0 || rem > 360) {
        return {
          valid: false,
          error_message: `Invalid rem_sleep_min in record ${i}: ${rem} (must be 0-360)`,
          num_records: records.length,
        };
      }

      const awakenings = Number(record.awakenings);
      if (awakenings < 0 || awakenings > 50) {
        return {
          valid: false,
          error_message: `Invalid awakenings in record ${i}: ${awakenings} (must be 0-50)`,
          num_records: records.length,
        };
      }
    } catch (e) {
      return {
        valid: false,
        error_message: `Invalid numeric value in record ${i}: ${e}`,
        num_records: records.length,
      };
    }
  }

  // Get date range
  const dates = records
    .map((r) => (r.date instanceof Date ? r.date : new Date(r.date as any)))
    .filter((d) => !isNaN(d.getTime()));

  const date_range =
    dates.length > 0
      ? { start: new Date(Math.min(...dates.map((d) => d.getTime()))), end: new Date(Math.max(...dates.map((d) => d.getTime()))) }
      : undefined;

  return {
    valid: true,
    num_records: records.length,
    date_range,
  };
}

/**
 * Parse Apple Health export.xml file
 *
 * Extracts sleep analysis records and aggregates by date
 *
 * @param xmlContent - XML file content as string
 * @returns Array of SleepRecord objects
 */
export function parseAppleHealthXML(xmlContent: string): SleepRecord[] {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
    });

    const parsed = parser.parse(xmlContent);
    const records = parsed.HealthData?.Record || [];
    const recordsArray = Array.isArray(records) ? records : [records];

    const sleepRecordsByDate: Record<
      string,
      {
        date: string;
        total_sleep_min: number;
        deep_sleep_min: number;
        rem_sleep_min: number;
        awakenings: number;
        in_bed_min: number;
      }
    > = {};

    // Find all sleep analysis records
    for (const record of recordsArray) {
      if (record.type !== 'HKCategoryTypeIdentifierSleepAnalysis') continue;

      const startDateStr = record.startDate;
      const endDateStr = record.endDate;
      const value = record.value;

      if (!startDateStr || !endDateStr || !value) continue;

      // Parse dates
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      const dateKey = startDate.toISOString().split('T')[0];

      // Initialize record for this date if not exists
      if (!sleepRecordsByDate[dateKey]) {
        sleepRecordsByDate[dateKey] = {
          date: dateKey,
          total_sleep_min: 0,
          deep_sleep_min: 0,
          rem_sleep_min: 0,
          awakenings: 0,
          in_bed_min: 0,
        };
      }

      // Calculate duration in minutes
      const durationMin = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

      // Categorize sleep stage
      if (value.includes('Asleep') || value.includes('Core')) {
        sleepRecordsByDate[dateKey].total_sleep_min += durationMin;
      } else if (value.includes('Deep')) {
        sleepRecordsByDate[dateKey].deep_sleep_min += durationMin;
        sleepRecordsByDate[dateKey].total_sleep_min += durationMin;
      } else if (value.includes('REM')) {
        sleepRecordsByDate[dateKey].rem_sleep_min += durationMin;
        sleepRecordsByDate[dateKey].total_sleep_min += durationMin;
      } else if (value.includes('Awake')) {
        sleepRecordsByDate[dateKey].awakenings += 1;
      } else if (value.includes('InBed')) {
        sleepRecordsByDate[dateKey].in_bed_min += durationMin;
      }
    }

    // Convert to SleepRecord objects
    const sleepRecords: SleepRecord[] = [];
    for (const [dateKey, data] of Object.entries(sleepRecordsByDate).sort(([a], [b]) =>
      a.localeCompare(b)
    )) {
      // Calculate sleep efficiency
      let efficiency: number;
      if (data.in_bed_min > 0) {
        efficiency = Math.min(100, (data.total_sleep_min / data.in_bed_min) * 100);
      } else {
        efficiency = 85.0; // Default if in_bed not tracked
      }

      // Ensure minimum awakenings count
      if (data.awakenings === 0) {
        data.awakenings = 2; // Typical default
      }

      sleepRecords.push({
        date: new Date(data.date),
        total_sleep_min: data.total_sleep_min,
        sleep_efficiency: Math.round(efficiency * 10) / 10,
        deep_sleep_min: data.deep_sleep_min,
        rem_sleep_min: data.rem_sleep_min,
        awakenings: data.awakenings,
      });
    }

    return sleepRecords;
  } catch (error) {
    throw new Error(`Failed to parse Apple Health XML: ${error}`);
  }
}

/**
 * Parse Fitbit sleep export CSV
 *
 * Expected columns: date, sleep_efficiency, deep_sleep_min, rem_sleep_min, awakenings
 *
 * @param csvContent - CSV file content as string
 * @returns Array of SleepRecord objects
 */
export function parseFitbitCSV(csvContent: string): SleepRecord[] {
  const records: SleepRecord[] = [];

  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows');
    }

    // Parse header
    const header = lines[0].split(',').map((h) => h.trim());

    // Parse rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, string> = {};

      header.forEach((key, index) => {
        row[key] = values[index] || '';
      });

      // Parse date
      const dateStr = row['date'] || row['Date'] || '';
      if (!dateStr) continue; // Skip empty rows

      // Get sleep metrics (handle various column name formats)
      const efficiency = parseFloat(
        row['sleep_efficiency'] || row['Sleep Efficiency %'] || '85'
      );
      const deepSleep = parseInt(
        row['deep_sleep_min'] || row['Minutes Deep Sleep'] || '80',
        10
      );
      const remSleep = parseInt(
        row['rem_sleep_min'] || row['Minutes REM Sleep'] || '100',
        10
      );
      const awakenings = parseInt(
        row['awakenings'] || row['Number of Awakenings'] || '2',
        10
      );

      // Calculate total sleep time
      let totalSleep: number;
      if (row['total_sleep_min']) {
        totalSleep = parseInt(row['total_sleep_min'], 10);
      } else if (row['Minutes Asleep']) {
        totalSleep = parseInt(row['Minutes Asleep'], 10);
      } else {
        // Estimate from deep + REM + light (assume light is 50% of total)
        totalSleep = Math.round((deepSleep + remSleep) / 0.5);
      }

      records.push({
        date: new Date(dateStr),
        total_sleep_min: totalSleep,
        sleep_efficiency: efficiency,
        deep_sleep_min: deepSleep,
        rem_sleep_min: remSleep,
        awakenings,
      });
    }
  } catch (error) {
    throw new Error(`Failed to parse Fitbit CSV: ${error}`);
  }

  return records;
}

/**
 * Parse Oura Ring sleep export CSV
 *
 * Expected columns: date, total_sleep_duration, sleep_efficiency, deep_sleep_duration,
 *                   rem_sleep_duration, awake_time
 *
 * @param csvContent - CSV file content as string
 * @returns Array of SleepRecord objects
 */
export function parseOuraCSV(csvContent: string): SleepRecord[] {
  const records: SleepRecord[] = [];

  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows');
    }

    // Parse header
    const header = lines[0].split(',').map((h) => h.trim());

    // Parse rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, string> = {};

      header.forEach((key, index) => {
        row[key] = values[index] || '';
      });

      // Parse date
      const dateStr = row['date'] || '';
      if (!dateStr) continue;

      // Oura provides durations in seconds, convert to minutes
      const totalSleep = Math.floor(parseInt(row['total_sleep_duration'] || '0', 10) / 60);
      const deepSleep = Math.floor(parseInt(row['deep_sleep_duration'] || '0', 10) / 60);
      const remSleep = Math.floor(parseInt(row['rem_sleep_duration'] || '0', 10) / 60);
      const efficiency = parseFloat(row['sleep_efficiency'] || row['efficiency'] || '85');

      // Calculate awakenings from awake time
      const awakeTime = parseInt(row['awake_time'] || '0', 10);
      const awakenings = Math.max(1, Math.floor(awakeTime / 300)); // Every 5 min of awake time ~ 1 awakening

      records.push({
        date: new Date(dateStr),
        total_sleep_min: totalSleep,
        sleep_efficiency: efficiency,
        deep_sleep_min: deepSleep,
        rem_sleep_min: remSleep,
        awakenings,
      });
    }
  } catch (error) {
    throw new Error(`Failed to parse Oura CSV: ${error}`);
  }

  return records;
}
