import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Attendance } from './attendance.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  matric: string;

  @Column({ unique: true })
  fingerprintId: string;

  @Column({ nullable: true })
  image: string;

  @OneToMany(() => Attendance, attendance => attendance.student)
  attendances: Attendance[];
}
