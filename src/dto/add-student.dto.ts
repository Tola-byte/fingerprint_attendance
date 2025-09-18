import { ApiProperty } from '@nestjs/swagger';

export class AddStudentResponseDto {
  @ApiProperty({ description: 'Success message', example: 'Student created successfully' })
  message: string;

  @ApiProperty({
    description: 'Created student details',
    example: {
      id: 12,
      name: 'Joshua Chidebere',
      matric: '2020/19877',
      fingerprintId: 'FP001',
      image: '/uploads/students/joshua.jpg'
    }
  })
  student: {
    id: number;
    name: string;
    matric: string;
    fingerprintId: string;
    image: string;
  };
}

export class NewUserDto {
  @ApiProperty({ description: 'Fingerprint ID', example: 'FP001' })
  id: string;
}
