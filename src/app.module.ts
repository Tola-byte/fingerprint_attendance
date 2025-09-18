import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AttendanceModule } from './attendance/attendance.module';

@Module({
  imports: [DatabaseModule, AttendanceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
