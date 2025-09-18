import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Student } from '../entities/student.entity';
import { Attendance } from '../entities/attendance.entity';
import { PendingStudent } from '../entities/pending-student.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(PendingStudent)
    private pendingStudentRepository: Repository<PendingStudent>,
  ) {}

  async getQuickStats() {
    const numberOfStudents = await this.studentRepository.count();
    const numberOfAttendance = await this.attendanceRepository.count();
    const numberOfEligibleStudents = await this.getEligibleStudentsCount();

    return {
      numberOfStudents,
      numberOfAttendance,
      numberOfEligibleStudents,
    };
  }

  async getGraphData() {
    const last7Days = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .select('DATE(attendance.attendanceDate)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('attendance.attendanceDate >= NOW() - INTERVAL \'7 days\'')
      .groupBy('DATE(attendance.attendanceDate)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const data = last7Days.map(item => ({
      name: this.formatDate(item.date),
      value: parseInt(item.count),
    }));

    return { data };
  }

  async getAttendanceByDate(date: string) {
    const startDate = new Date(parseInt(date));
    const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

    const attendances = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.student', 'student')
      .where('attendance.attendanceDate >= :startDate', { startDate })
      .andWhere('attendance.attendanceDate < :endDate', { endDate })
      .getMany();

    return {
      attendance: attendances.map(att => ({
        name: att.student.name,
        time: att.lastSignIn, // Show last sign-in time
        firstSignIn: att.firstSignIn,
        lastSignIn: att.lastSignIn,
        signInCount: att.signInCount,
        allSignIns: att.allSignIns,
        image: att.student.image,
        matric: att.student.matric,
      })),
    };
  }

  async getEligibilityData() {
    const students = await this.studentRepository.find({
      relations: ['attendances'],
    });

    // Ensure all students have attendances array initialized
    students.forEach(student => {
      if (!student.attendances) {
        student.attendances = [];
      }
    });

    // Demo mode: each attendance mark = 1 day, otherwise use calendar days
    const isDemoMode = process.env.DEMO_MODE === 'true';
    
    const eligibility = students.map(student => {
      let percentageAttendance = 0;
      
      if (isDemoMode) {
        // Demo mode: each attendance record = 1 day
        const totalAttendanceMarks = student.attendances?.length || 0;
        const totalPossibleDays = 10; // Fixed 10 days for demo
        percentageAttendance = totalPossibleDays > 0 
          ? Math.min(100, (totalAttendanceMarks / totalPossibleDays) * 100) 
          : 0;
      } else {
        // Production mode: use actual calendar days
        const attendancePeriod = 30;
        const totalPossibleDays = this.calculateWorkingDays(attendancePeriod);
        const uniqueAttendanceDays = student.attendances?.length || 0;
        percentageAttendance = totalPossibleDays > 0 
          ? Math.min(100, (uniqueAttendanceDays / totalPossibleDays) * 100) 
          : 0;
      }

      return {
        name: student.name,
        matric: student.matric,
        image: student.image,
        percentageAttendance: Math.round(percentageAttendance),
      };
    });

    return { eligibility };
  }

  // Step 1: Hardware sends fingerprint ID, backend creates pending student
  async createPendingStudentFromHardware(fingerprintId: string): Promise<{ id: string }> {
    console.log('🔧 [HARDWARE] Creating pending student for fingerprintId:', fingerprintId);
    
    try {
      // Check if a pending student with this fingerprint ID already exists
      const existingPendingStudent = await this.pendingStudentRepository.findOne({
        where: { matric: fingerprintId, isCompleted: false }
      });

      if (existingPendingStudent) {
        console.log('🔧 [HARDWARE] Pending student already exists for fingerprintId:', fingerprintId);
        console.log('🔧 [HARDWARE] Existing pending student:', {
          id: existingPendingStudent.id,
          matric: existingPendingStudent.matric,
          isCompleted: existingPendingStudent.isCompleted
        });
        
        const result = { id: fingerprintId };
        console.log('🔧 [HARDWARE] Returning existing result:', result);
        return result;
      }

      const pendingStudent = this.pendingStudentRepository.create({
        isCompleted: false,
        matric: fingerprintId, // Store the fingerprint ID temporarily
      });

      console.log('🔧 [HARDWARE] Pending student object created:', pendingStudent);
      
      const savedStudent = await this.pendingStudentRepository.save(pendingStudent);
      console.log('🔧 [HARDWARE] Pending student saved to database:', {
        id: savedStudent.id,
        matric: savedStudent.matric,
        isCompleted: savedStudent.isCompleted,
        createdAt: savedStudent.createdAt
      });
      
      const result = { id: fingerprintId };
      console.log('🔧 [HARDWARE] Returning result:', result);
      return result;
      
    } catch (error) {
      console.error('❌ [HARDWARE] Error creating pending student:', error);
      console.error('❌ [HARDWARE] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        fingerprintId: fingerprintId
      });
      throw error;
    }
  }

  // Step 2: Poll for new pending student IDs (persistent - won't get lost on multiple polls)
  async getNewUsers(): Promise<{ id: string }> {
    console.log('🔍 [POLLING] Starting getNewUsers()...');
    
    try {
      console.log('🔍 [POLLING] Querying database for pending students...');
      
      // Always return the first incomplete pending student
      const pendingStudent = await this.pendingStudentRepository.findOne({
        where: { isCompleted: false },
        order: { id: 'ASC' }
      });

      console.log('🔍 [POLLING] Database query completed');
      console.log('🔍 [POLLING] Pending student found:', pendingStudent ? 'YES' : 'NO');
      
      if (pendingStudent) {
        console.log('🔍 [POLLING] Pending student details:', {
          id: pendingStudent.id,
          matric: pendingStudent.matric,
          name: pendingStudent.name,
          isCompleted: pendingStudent.isCompleted,
          createdAt: pendingStudent.createdAt
        });
        
        // Return the fingerprint ID (stored in matric field)
        const result = { id: pendingStudent.matric };
        console.log('🔍 [POLLING] Returning result:', result);
        return result;
      }

      // Return empty object if no pending students
      console.log('🔍 [POLLING] No pending students found, returning empty ID');
      return { id: "" };
      
    } catch (error) {
      console.error('❌ [POLLING] Error in getNewUsers():', error);
      console.error('❌ [POLLING] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Return empty object on error to prevent frontend crashes
      return { id: "" };
    }
  }

  // Step 3: Complete student registration with data (frontend form submission)
  async addStudent(fingerprintId: string, name: string, matric: string, imagePath: string) {
    // Find the pending student by fingerprint ID (stored in matric field)
    const pendingStudent = await this.pendingStudentRepository.findOne({
      where: { matric: fingerprintId, isCompleted: false }
    });

    if (!pendingStudent) {
      throw new NotFoundException('No pending registration found for this fingerprint. Please scan your fingerprint again.');
    }

    // Check if matric number already exists
    const existingStudentByMatric = await this.studentRepository.findOne({
      where: { matric }
    });

    if (existingStudentByMatric) {
      throw new ConflictException(`A student with matriculation number "${matric}" is already registered. Please use a different matriculation number.`);
    }

    // Check if fingerprint ID already exists
    const existingStudentByFingerprint = await this.studentRepository.findOne({
      where: { fingerprintId }
    });

    if (existingStudentByFingerprint) {
      throw new ConflictException(`A student with fingerprint ID "${fingerprintId}" is already registered. This fingerprint has already been used.`);
    }

    // Create the actual student
    const student = this.studentRepository.create({
      name,
      matric,
      fingerprintId,
      image: imagePath,
    });

    const savedStudent = await this.studentRepository.save(student);

    // Mark pending student as completed (but keep in database for history)
    await this.pendingStudentRepository.update(pendingStudent.id, {
      isCompleted: true,
      name,
      matric,
      image: imagePath,
    });

    return {
      message: 'Student created successfully',
      student: {
        id: savedStudent.id,
        name: savedStudent.name,
        matric: savedStudent.matric,
        fingerprintId: savedStudent.fingerprintId,
        image: savedStudent.image,
      },
    };
  }

  async getStudentByFingerprintId(fingerprintId: string) {
    const student = await this.studentRepository.findOne({ 
      where: { fingerprintId: fingerprintId },
      relations: ['attendances']
    });
    
    if (!student) {
      throw new NotFoundException(`Student with fingerprint ID ${fingerprintId} not found. Please check the fingerprint ID and try again.`);
    }

    // Calculate attendance percentage
    const isDemoMode = process.env.DEMO_MODE === 'true';
    let percentageAttendance = 0;
    
    if (isDemoMode) {
      const totalAttendanceMarks = student.attendances?.length || 0;
      const totalPossibleDays = 10;
      percentageAttendance = totalPossibleDays > 0 
        ? Math.min(100, (totalAttendanceMarks / totalPossibleDays) * 100) 
        : 0;
    } else {
      const attendancePeriod = 30;
      const totalPossibleDays = this.calculateWorkingDays(attendancePeriod);
      const uniqueAttendanceDays = student.attendances?.length || 0;
      percentageAttendance = totalPossibleDays > 0 
        ? Math.min(100, (uniqueAttendanceDays / totalPossibleDays) * 100) 
        : 0;
    }

    return {
      id: student.id,
      name: student.name,
      matric: student.matric,
      fingerprintId: student.fingerprintId,
      image: student.image,
      percentageAttendance: Math.round(percentageAttendance),
      totalAttendances: student.attendances?.length || 0,
      isEligible: percentageAttendance >= 65,
      attendances: student.attendances?.map(att => ({
        id: att.id,
        attendanceDate: att.attendanceDate,
        firstSignIn: att.firstSignIn,
        lastSignIn: att.lastSignIn,
        signInCount: att.signInCount,
        allSignIns: att.allSignIns
      })) || []
    };
  }

  async markAttendance(fingerprintId: string) {
    const student = await this.studentRepository.findOne({ where: { fingerprintId: fingerprintId } });
    if (!student) {
      throw new NotFoundException(`Student with fingerprint ID ${fingerprintId} not found. Please check the fingerprint ID and try again.`);
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Demo mode: each attendance mark = new day, otherwise use same day logic
    const isDemoMode = process.env.DEMO_MODE === 'true';

    if (isDemoMode) {
      // Demo mode: create new attendance record each time (simulates new day)
      const attendance = this.attendanceRepository.create({
        studentId: student.id,
        attendanceDate: now, // Use current timestamp for demo
        firstSignIn: timeString,
        lastSignIn: timeString,
        signInCount: 1,
        allSignIns: [timeString]
      });

      const savedAttendance = await this.attendanceRepository.save(attendance);
      
      // Get the updated count after saving
      const updatedStudent = await this.studentRepository.findOne({
        where: { id: student.id },
        relations: ['attendances']
      });
      
      return {
        message: `Day ${updatedStudent?.attendances?.length || 0} attendance marked at ${timeString}`,
        attendance: {
          studentId: savedAttendance.studentId,
          attendanceDate: savedAttendance.attendanceDate,
          firstSignIn: savedAttendance.firstSignIn,
          lastSignIn: savedAttendance.lastSignIn,
          signInCount: savedAttendance.signInCount,
          allSignIns: savedAttendance.allSignIns
        }
      };
    } else {
      // Production mode: use same day logic (update existing record)
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const existingAttendance = await this.attendanceRepository.findOne({
        where: {
          studentId: student.id,
          attendanceDate: Between(today, new Date(today.getTime() + 24 * 60 * 60 * 1000))
        }
      });

      if (existingAttendance) {
        // Update existing record with new sign-in
        existingAttendance.lastSignIn = timeString;
        existingAttendance.signInCount += 1;
        existingAttendance.allSignIns = [...(existingAttendance.allSignIns || []), timeString];

        const updatedAttendance = await this.attendanceRepository.save(existingAttendance);
        
        return {
          message: `Attendance updated! Sign-in #${existingAttendance.signInCount} at ${timeString}`,
          attendance: {
            studentId: updatedAttendance.studentId,
            attendanceDate: updatedAttendance.attendanceDate,
            firstSignIn: updatedAttendance.firstSignIn,
            lastSignIn: updatedAttendance.lastSignIn,
            signInCount: updatedAttendance.signInCount,
            allSignIns: updatedAttendance.allSignIns
          }
        };
      } else {
        // Create new attendance record for today
        const attendance = this.attendanceRepository.create({
          studentId: student.id,
          attendanceDate: today,
          firstSignIn: timeString,
          lastSignIn: timeString,
          signInCount: 1,
          allSignIns: [timeString]
        });

        const savedAttendance = await this.attendanceRepository.save(attendance);
        
        return {
          message: `Attendance marked! First sign-in at ${timeString}`,
          attendance: {
            studentId: savedAttendance.studentId,
            attendanceDate: savedAttendance.attendanceDate,
            firstSignIn: savedAttendance.firstSignIn,
            lastSignIn: savedAttendance.lastSignIn,
            signInCount: savedAttendance.signInCount,
            allSignIns: savedAttendance.allSignIns
          }
        };
      }
    }
  }

  private async getEligibleStudentsCount(): Promise<number> {
    const students = await this.studentRepository.find({
      relations: ['attendances'],
    });

    // Ensure all students have attendances array initialized
    students.forEach(student => {
      if (!student.attendances) {
        student.attendances = [];
      }
    });

    // Demo mode: each attendance mark = 1 day, otherwise use calendar days
    const isDemoMode = process.env.DEMO_MODE === 'true';

    return students.filter(student => {
      let percentageAttendance = 0;
      
      if (isDemoMode) {
        // Demo mode: each attendance record = 1 day
        const totalAttendanceMarks = student.attendances?.length || 0;
        const totalPossibleDays = 10; // Fixed 10 days for demo
        percentageAttendance = totalPossibleDays > 0 
          ? (totalAttendanceMarks / totalPossibleDays) * 100 
          : 0;
      } else {
        // Production mode: use actual calendar days
        const attendancePeriod = 30;
        const totalPossibleDays = this.calculateWorkingDays(attendancePeriod);
        const uniqueAttendanceDays = student.attendances?.length || 0;
        percentageAttendance = totalPossibleDays > 0 
          ? (uniqueAttendanceDays / totalPossibleDays) * 100 
          : 0;
      }
      
      return percentageAttendance >= 65; // 65% attendance threshold
    }).length;
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    return `${day}${this.getOrdinalSuffix(day)} ${month}`;
  }

  private getOrdinalSuffix(day: number): string {
    if (day >= 11 && day <= 13) {
      return 'th';
    }
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  private calculateWorkingDays(days: number): number {
    const today = new Date();
    let workingDays = 0;
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Count only weekdays (Monday = 1, Sunday = 0)
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workingDays++;
      }
    }
    
    return workingDays;
  }
}
