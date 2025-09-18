import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Student } from '../entities/student.entity';
import { Attendance } from '../entities/attendance.entity';
import { PendingStudent } from '../entities/pending-student.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'password'),
        database: configService.get('DB_DATABASE', 'attendance_db'),
        entities: [Student, Attendance, PendingStudent],
        synchronize: configService.get('NODE_ENV') !== 'production', // Only for development
        ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Student, Attendance, PendingStudent]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
