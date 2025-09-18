import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Student } from './student.entity';

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  studentId: number;

  @Column({ type: 'date' })
  attendanceDate: Date;

  @Column({ type: 'time' })
  firstSignIn: string;

  @Column({ type: 'time', nullable: true })
  lastSignIn: string;

  @Column({ default: 1 })
  signInCount: number;

  @Column({ type: 'json', nullable: true })
  allSignIns: string[];

  @ManyToOne(() => Student, student => student.attendances)
  @JoinColumn({ name: 'studentId' })
  student: Student;
}
