import { ApiProperty } from '@nestjs/swagger';

export class QuickStatsDto {
  @ApiProperty({ description: 'Total number of students', example: 4 })
  numberOfStudents: number;

  @ApiProperty({ description: 'Total number of attendance records', example: 19 })
  numberOfAttendance: number;

  @ApiProperty({ description: 'Number of students eligible (75%+ attendance)', example: 0 })
  numberOfEligibleStudents: number;
}
