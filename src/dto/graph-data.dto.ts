import { ApiProperty } from '@nestjs/swagger';

export class GraphDataItemDto {
  @ApiProperty({ description: 'Date in readable format', example: '17th September' })
  name: string;

  @ApiProperty({ description: 'Number of attendance records for this date', example: 200 })
  value: number;
}

export class GraphDataDto {
  @ApiProperty({ type: [GraphDataItemDto], description: 'Array of daily attendance data' })
  data: GraphDataItemDto[];
}
