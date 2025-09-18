import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '../entities/student.entity';
import { Attendance } from '../entities/attendance.entity';
import { PendingStudent } from '../entities/pending-student.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'password',
      database: 'attendance_db',
      entities: [Student, Attendance, PendingStudent],
      synchronize: true, // Only for development
    }),
    TypeOrmModule.forFeature([Student, Attendance, PendingStudent]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
