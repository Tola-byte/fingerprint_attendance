import { ApiProperty } from '@nestjs/swagger';

export class AttendanceRecordDto {
  @ApiProperty({ description: 'Student name', example: 'John Freddy' })
  name: string;

  @ApiProperty({ description: 'Last sign-in time', example: '09:00AM' })
  time: string;

  @ApiProperty({ description: 'First sign-in time', example: '08:30AM' })
  firstSignIn: string;

  @ApiProperty({ description: 'Last sign-in time', example: '09:00AM' })
  lastSignIn: string;

  @ApiProperty({ description: 'Total number of sign-ins today', example: 3 })
  signInCount: number;

  @ApiProperty({ 
    description: 'Array of all sign-in times today', 
    example: ['08:30AM', '08:45AM', '09:00AM'],
    type: [String]
  })
  allSignIns: string[];

  @ApiProperty({ description: 'Path to student image', example: '/student.jpg' })
  image: string;

  @ApiProperty({ description: 'Student matriculation number', example: '2022/98765' })
  matric: string;
}

export class AttendanceDto {
  @ApiProperty({ type: [AttendanceRecordDto], description: 'Array of attendance records' })
  attendance: AttendanceRecordDto[];
}
