import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { Student } from '../entities/student.entity';
import { Attendance } from '../entities/attendance.entity';
import { PendingStudent } from '../entities/pending-student.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Attendance, PendingStudent])],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
