import { ApiProperty } from '@nestjs/swagger';

export class StudentAttendanceDto {
  @ApiProperty({ description: 'Attendance record ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Attendance date', example: '2025-09-18' })
  attendanceDate: Date;

  @ApiProperty({ description: 'First sign-in time', example: '08:30AM' })
  firstSignIn: string;

  @ApiProperty({ description: 'Last sign-in time', example: '09:00AM' })
  lastSignIn: string;

  @ApiProperty({ description: 'Total sign-ins for this day', example: 3 })
  signInCount: number;

  @ApiProperty({ 
    description: 'All sign-in times for this day', 
    example: ['08:30AM', '08:45AM', '09:00AM'],
    type: [String]
  })
  allSignIns: string[];
}

export class StudentDto {
  @ApiProperty({ description: 'Student ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Student name', example: 'John Freddy' })
  name: string;

  @ApiProperty({ description: 'Student matriculation number', example: '2022/98765' })
  matric: string;

  @ApiProperty({ description: 'Student fingerprint ID', example: 'FP001' })
  fingerprintId: string;

  @ApiProperty({ description: 'Path to student image', example: '/uploads/students/student.jpg' })
  image: string;

  @ApiProperty({ description: 'Attendance percentage', example: 70 })
  percentageAttendance: number;

  @ApiProperty({ description: 'Total number of attendance days', example: 7 })
  totalAttendances: number;

  @ApiProperty({ description: 'Whether student is eligible (65%+ attendance)', example: true })
  isEligible: boolean;

  @ApiProperty({ type: [StudentAttendanceDto], description: 'Array of attendance records' })
  attendances: StudentAttendanceDto[];
}
