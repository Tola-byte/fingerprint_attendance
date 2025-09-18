import { ApiProperty } from '@nestjs/swagger';

export class EligibilityRecordDto {
  @ApiProperty({ description: 'Student name', example: 'John Freddy' })
  name: string;

  @ApiProperty({ description: 'Student matriculation number', example: '2021/10987' })
  matric: string;

  @ApiProperty({ description: 'Path to student image', example: '/student.jpg' })
  image: string;

  @ApiProperty({ description: 'Attendance percentage', example: 30 })
  percentageAttendance: number;
}

export class EligibilityDto {
  @ApiProperty({ type: [EligibilityRecordDto], description: 'Array of student eligibility records' })
  eligibility: EligibilityRecordDto[];
}
