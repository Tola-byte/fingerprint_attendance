import { Controller, Get, Post, Query, Body, UseInterceptors, UploadedFile, Param, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AttendanceService } from './attendance.service';
import { QuickStatsDto } from '../dto/quick-stats.dto';
import { GraphDataDto } from '../dto/graph-data.dto';
import { AttendanceDto } from '../dto/attendance.dto';
import { EligibilityDto } from '../dto/eligibility.dto';
import { AddStudentResponseDto, NewUserDto } from '../dto/add-student.dto';
import { StudentDto } from '../dto/student.dto';

@ApiTags('attendance')
@Controller('api')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('quickstats')
  @ApiOperation({ summary: 'Get quick statistics' })
  @ApiResponse({ status: 200, description: 'Quick stats retrieved successfully', type: QuickStatsDto })
  async getQuickStats() {
    return await this.attendanceService.getQuickStats();
  }

  @Get('graphData')
  @ApiOperation({ summary: 'Get graph data for attendance charts' })
  @ApiResponse({ status: 200, description: 'Graph data retrieved successfully', type: GraphDataDto })
  async getGraphData() {
    return await this.attendanceService.getGraphData();
  }

  @Get('attendance')
  @ApiOperation({ summary: 'Get attendance records for a specific date' })
  @ApiQuery({ name: 'date', description: 'Date as timestamp', example: '1694908800000' })
  @ApiResponse({ status: 200, description: 'Attendance records retrieved successfully', type: AttendanceDto })
  async getAttendanceByDate(@Query('date') date: string) {
    return await this.attendanceService.getAttendanceByDate(date);
  }

  @Get('eligibility')
  @ApiOperation({ summary: 'Get student eligibility data' })
  @ApiResponse({ status: 200, description: 'Eligibility data retrieved successfully', type: EligibilityDto })
  async getEligibilityData() {
    return await this.attendanceService.getEligibilityData();
  }

  @Get('student/:id')
  @ApiOperation({ summary: 'Get student information by ID' })
  @ApiResponse({ status: 200, description: 'Student information retrieved successfully', type: StudentDto })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getStudentById(@Param('id') id: number) {
    return await this.attendanceService.getStudentById(id);
  }


  @Post('addStudent')
  @ApiOperation({ summary: 'Complete student registration (Step 3)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Student data with image upload and fingerprint ID',
    schema: {
      type: 'object',
      properties: {
        fingerprintId: { type: 'string', example: 'FP001', description: 'Fingerprint ID from polling' },
        name: { type: 'string', example: 'Joshua Chidebere' },
        matric: { type: 'string', example: '2020/19877' },
        image: { type: 'string', format: 'binary' }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Student created successfully', type: AddStudentResponseDto })
  @ApiResponse({ status: 404, description: 'No pending registration found for this fingerprint' })
  @ApiResponse({ status: 409, description: 'Student with this matriculation number or fingerprint ID already exists' })
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads/students',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  async addStudent(
    @Body('fingerprintId') fingerprintId: string,
    @Body('name') name: string,
    @Body('matric') matric: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imagePath = file ? `/uploads/students/${file.filename}` : null;
    return await this.attendanceService.addStudent(fingerprintId, name, matric, imagePath);
  }

  @Post('markAttendance/:studentId')
  @ApiOperation({ summary: 'Mark attendance for a student' })
  @ApiResponse({ status: 201, description: 'Attendance marked successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async markAttendance(@Param('studentId') studentId: number) {
    return await this.attendanceService.markAttendance(studentId);
  }

  @Get('addStudent')
  @ApiOperation({ summary: 'Poll for new pending student IDs (Frontend polling)' })
  @ApiResponse({ status: 200, description: 'Pending student ID retrieved successfully', type: NewUserDto })
  async pollNewUsers() {
    console.log('📡 [CONTROLLER] Polling endpoint called at:', new Date().toISOString());
    console.log('📡 [CONTROLLER] Request headers:', JSON.stringify(this.getRequestHeaders(), null, 2));
    
    try {
      const result = await this.attendanceService.getNewUsers();
      console.log('📡 [CONTROLLER] Service returned:', result);
      return result;
    } catch (error) {
      console.error('❌ [CONTROLLER] Error in pollNewUsers():', error);
      console.error('❌ [CONTROLLER] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  }

  private getRequestHeaders() {
    // This is a placeholder - in a real implementation you'd get headers from the request object
    return { 'user-agent': 'curl/7.68.0', 'accept': '*/*' };
  }

  @Post('hardware/detect')
  @ApiOperation({ summary: 'Hardware sends fingerprint ID to backend' })
  @ApiBody({
    description: 'Hardware sends the fingerprint ID',
    schema: {
      type: 'object',
      properties: {
        fingerprintId: { type: 'string', example: 'FP001', description: 'ID from fingerprint scanner' }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Fingerprint ID received and pending student created', type: NewUserDto })
  async hardwareDetect(@Body('fingerprintId') fingerprintId: string) {
    console.log('🔧 [CONTROLLER] Hardware detect endpoint called at:', new Date().toISOString());
    console.log('🔧 [CONTROLLER] Received fingerprintId:', fingerprintId);
    console.log('🔧 [CONTROLLER] fingerprintId type:', typeof fingerprintId);
    
    try {
      const result = await this.attendanceService.createPendingStudentFromHardware(fingerprintId);
      console.log('🔧 [CONTROLLER] Service returned:', result);
      return result;
    } catch (error) {
      console.error('❌ [CONTROLLER] Error in hardwareDetect():', error);
      console.error('❌ [CONTROLLER] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        fingerprintId: fingerprintId
      });
      throw error;
    }
  }
}
