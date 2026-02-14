"""
Data validation and parsing for multiple wearable formats
Supports: Apple Health XML, Fitbit CSV, Oura CSV
"""

import csv
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import List, Dict
from io import StringIO
from .models import SleepRecord, ValidationResult


def validate_sleep_data(records: List[Dict]) -> ValidationResult:
    """
    Validate sleep data meets minimum requirements

    Requirements:
    - Minimum 14 days of data
    - Required fields present
    - Realistic value ranges

    Args:
        records: List of sleep record dictionaries

    Returns:
        ValidationResult with validation status
    """
    if len(records) < 14:
        return ValidationResult(
            valid=False,
            error_message=f"Insufficient data: {len(records)} days provided, minimum 14 days required",
            num_records=len(records)
        )

    # Check required fields
    required_fields = ['date', 'sleep_efficiency', 'deep_sleep_min', 'rem_sleep_min', 'awakenings']
    for i, record in enumerate(records):
        missing_fields = [f for f in required_fields if f not in record]
        if missing_fields:
            return ValidationResult(
                valid=False,
                error_message=f"Missing required fields in record {i}: {', '.join(missing_fields)}",
                num_records=len(records)
            )

        # Validate ranges
        try:
            eff = float(record['sleep_efficiency'])
            if not (0 <= eff <= 100):
                return ValidationResult(
                    valid=False,
                    error_message=f"Invalid sleep_efficiency in record {i}: {eff}% (must be 0-100)",
                    num_records=len(records)
                )

            deep = int(record['deep_sleep_min'])
            if not (0 <= deep <= 360):
                return ValidationResult(
                    valid=False,
                    error_message=f"Invalid deep_sleep_min in record {i}: {deep} (must be 0-360)",
                    num_records=len(records)
                )

            rem = int(record['rem_sleep_min'])
            if not (0 <= rem <= 360):
                return ValidationResult(
                    valid=False,
                    error_message=f"Invalid rem_sleep_min in record {i}: {rem} (must be 0-360)",
                    num_records=len(records)
                )

            awakenings = int(record['awakenings'])
            if not (0 <= awakenings <= 50):
                return ValidationResult(
                    valid=False,
                    error_message=f"Invalid awakenings in record {i}: {awakenings} (must be 0-50)",
                    num_records=len(records)
                )

        except ValueError as e:
            return ValidationResult(
                valid=False,
                error_message=f"Invalid numeric value in record {i}: {str(e)}",
                num_records=len(records)
            )

    # Get date range (handle both string and datetime.date objects)
    dates = []
    for r in records:
        date_val = r['date']
        if isinstance(date_val, str):
            dates.append(datetime.strptime(date_val, '%Y-%m-%d').date())
        else:
            dates.append(date_val)  # Already a datetime.date object
    date_range = (min(dates), max(dates))

    return ValidationResult(
        valid=True,
        num_records=len(records),
        date_range=date_range
    )


def parse_apple_health_xml(xml_content: str) -> List[SleepRecord]:
    """
    Parse Apple Health export.xml file

    Extracts sleep analysis records and aggregates by date

    Args:
        xml_content: XML file content as string

    Returns:
        List of SleepRecord objects
    """
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as e:
        raise ValueError(f"Invalid XML format: {str(e)}")

    sleep_records = {}

    # Find all sleep analysis records
    for record in root.findall('.//Record[@type="HKCategoryTypeIdentifierSleepAnalysis"]'):
        start_date_str = record.get('startDate')
        end_date_str = record.get('endDate')
        value = record.get('value')

        if not all([start_date_str, end_date_str, value]):
            continue

        # Parse dates
        start_date = datetime.strptime(start_date_str[:10], '%Y-%m-%d').date()

        # Aggregate by date
        if start_date not in sleep_records:
            sleep_records[start_date] = {
                'date': start_date.strftime('%Y-%m-%d'),
                'total_sleep_min': 0,
                'deep_sleep_min': 0,
                'rem_sleep_min': 0,
                'awakenings': 0,
                'in_bed_min': 0
            }

        # Parse duration
        start_dt = datetime.strptime(start_date_str, '%Y-%m-%d %H:%M:%S %z').replace(tzinfo=None)
        end_dt = datetime.strptime(end_date_str, '%Y-%m-%d %H:%M:%S %z').replace(tzinfo=None)
        duration_min = int((end_dt - start_dt).total_seconds() / 60)

        # Categorize sleep stage
        if 'Asleep' in value or 'Core' in value:
            sleep_records[start_date]['total_sleep_min'] += duration_min
        elif 'Deep' in value:
            sleep_records[start_date]['deep_sleep_min'] += duration_min
            sleep_records[start_date]['total_sleep_min'] += duration_min
        elif 'REM' in value:
            sleep_records[start_date]['rem_sleep_min'] += duration_min
            sleep_records[start_date]['total_sleep_min'] += duration_min
        elif 'Awake' in value:
            sleep_records[start_date]['awakenings'] += 1
        elif 'InBed' in value:
            sleep_records[start_date]['in_bed_min'] += duration_min

    # Calculate sleep efficiency and convert to SleepRecord objects
    records = []
    for date_key, data in sorted(sleep_records.items()):
        # Calculate sleep efficiency
        if data['in_bed_min'] > 0:
            efficiency = min(100, (data['total_sleep_min'] / data['in_bed_min']) * 100)
        else:
            efficiency = 85.0  # Default if in_bed not tracked

        # Ensure minimum awakenings count
        if data['awakenings'] == 0:
            data['awakenings'] = 2  # Typical default

        records.append(SleepRecord(
            date=data['date'],
            total_sleep_min=data['total_sleep_min'],
            sleep_efficiency=round(efficiency, 1),
            deep_sleep_min=data['deep_sleep_min'],
            rem_sleep_min=data['rem_sleep_min'],
            awakenings=data['awakenings']
        ))

    return records


def parse_fitbit_csv(csv_content: str) -> List[SleepRecord]:
    """
    Parse Fitbit sleep export CSV

    Expected columns: date, sleep_efficiency, deep_sleep_min, rem_sleep_min, awakenings

    Args:
        csv_content: CSV file content as string

    Returns:
        List of SleepRecord objects
    """
    records = []

    try:
        csv_file = StringIO(csv_content)
        reader = csv.DictReader(csv_file)

        for row in reader:
            # Parse date (handle both 'date' and 'Date' columns)
            date_str = row.get('date', row.get('Date', '')).strip()
            if not date_str:
                continue  # Skip empty rows

            # Get sleep metrics (handle various column name formats)
            efficiency = float(row.get('sleep_efficiency', row.get('Sleep Efficiency %', 85)))
            deep_sleep = int(row.get('deep_sleep_min', row.get('Minutes Deep Sleep', 80)))
            rem_sleep = int(row.get('rem_sleep_min', row.get('Minutes REM Sleep', 100)))
            awakenings = int(row.get('awakenings', row.get('Number of Awakenings', 2)))

            # Calculate total sleep time (if not provided)
            if 'total_sleep_min' in row:
                total_sleep = int(row['total_sleep_min'])
            elif 'Minutes Asleep' in row:
                total_sleep = int(row['Minutes Asleep'])
            else:
                # Estimate from deep + REM + light (assume light is 50% of total)
                total_sleep = int((deep_sleep + rem_sleep) / 0.5)

            records.append(SleepRecord(
                date=date_str,
                total_sleep_min=total_sleep,
                sleep_efficiency=efficiency,
                deep_sleep_min=deep_sleep,
                rem_sleep_min=rem_sleep,
                awakenings=awakenings
            ))

    except (csv.Error, KeyError, ValueError) as e:
        raise ValueError(f"Failed to parse Fitbit CSV: {str(e)}")

    return records


def parse_oura_csv(csv_content: str) -> List[SleepRecord]:
    """
    Parse Oura Ring sleep export CSV

    Expected columns: date, total_sleep_duration, sleep_efficiency, deep_sleep_duration,
                      rem_sleep_duration, awake_time

    Args:
        csv_content: CSV file content as string

    Returns:
        List of SleepRecord objects
    """
    records = []

    try:
        csv_file = StringIO(csv_content)
        reader = csv.DictReader(csv_file)

        for row in reader:
            # Parse date
            date_str = row.get('date', '').strip()

            # Oura provides durations in seconds, convert to minutes
            total_sleep = int(row.get('total_sleep_duration', 0)) // 60
            deep_sleep = int(row.get('deep_sleep_duration', 0)) // 60
            rem_sleep = int(row.get('rem_sleep_duration', 0)) // 60

            # Sleep efficiency (Oura provides as percentage)
            efficiency = float(row.get('sleep_efficiency', 85))

            # Estimate awakenings from awake time
            awake_min = int(row.get('awake_time', 0)) // 60
            awakenings = max(1, awake_min // 10)  # Rough estimate

            records.append(SleepRecord(
                date=date_str,
                total_sleep_min=total_sleep,
                sleep_efficiency=efficiency,
                deep_sleep_min=deep_sleep,
                rem_sleep_min=rem_sleep,
                awakenings=awakenings
            ))

    except (csv.Error, KeyError, ValueError) as e:
        raise ValueError(f"Failed to parse Oura CSV: {str(e)}")

    return records


def detect_format_and_parse(file_content: str, filename: str) -> List[SleepRecord]:
    """
    Auto-detect file format and parse accordingly

    Args:
        file_content: File content as string
        filename: Original filename

    Returns:
        List of SleepRecord objects

    Raises:
        ValueError: If format cannot be detected or parsing fails
    """
    # Try XML (Apple Health)
    if filename.endswith('.xml') or file_content.strip().startswith('<?xml'):
        return parse_apple_health_xml(file_content)

    # Try CSV (Fitbit or Oura)
    elif filename.endswith('.csv'):
        # Check header to determine CSV type
        first_line = file_content.split('\n')[0].lower()

        if 'oura' in first_line or 'total_sleep_duration' in first_line:
            return parse_oura_csv(file_content)
        else:
            # Default to Fitbit format
            return parse_fitbit_csv(file_content)

    else:
        raise ValueError(
            f"Unsupported file format: {filename}. "
            "Supported formats: Apple Health XML, Fitbit CSV, Oura CSV"
        )
