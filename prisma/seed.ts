import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const PASSWORD_HASH_ROUNDS = 10

async function main() {
  console.log('Starting seed...')

  // Create admin user
  const adminPassword = await bcrypt.hash('aryaeki0707', PASSWORD_HASH_ROUNDS)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      name: 'Admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
      classId: null,
    },
    create: {
      name: 'Admin',
      username: 'admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  })
  console.log('Created admin:', admin.username)

  // Create kepala sekolah user
  const kepsekPassword = await bcrypt.hash('kepala123', PASSWORD_HASH_ROUNDS)
  const kepsek = await prisma.user.upsert({
    where: { username: 'kepala-sekolah' },
    update: {},
    create: {
      name: 'Dr. Ahmad Wijaya',
      username: 'kepala-sekolah',
      passwordHash: kepsekPassword,
      role: 'KEPALA_SEKOLAH',
    },
  })
  console.log('Created kepala sekolah:', kepsek.username)

  const defaultSubjects = [
    'Pendidikan Agama dan Budi Pekerti',
    'PPKn',
    'Bahasa Indonesia',
    'Matematika',
    'IPA',
    'IPS',
    'Bahasa Inggris',
    'PJOK',
    'Seni Budaya',
    'Prakarya',
    'Informatika',
    'Bahasa Jawa',
  ]

  for (const name of defaultSubjects) {
    await prisma.subject.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  console.log('Created subjects')

  // Create sample SMP classes
  const class7A = await prisma.class.upsert({
    where: { name_tahunAjaran: { name: '7A', tahunAjaran: '2025/2026' } },
    update: {},
    create: {
      name: '7A',
      tingkat: '7',
      tahunAjaran: '2025/2026',
      kasNominal: 50000,
    },
  })

  const class7B = await prisma.class.upsert({
    where: { name_tahunAjaran: { name: '7B', tahunAjaran: '2025/2026' } },
    update: {},
    create: {
      name: '7B',
      tingkat: '7',
      tahunAjaran: '2025/2026',
      kasNominal: 50000,
    },
  })

  const class8A = await prisma.class.upsert({
    where: { name_tahunAjaran: { name: '8A', tahunAjaran: '2025/2026' } },
    update: {},
    create: {
      name: '8A',
      tingkat: '8',
      tahunAjaran: '2025/2026',
      kasNominal: 75000,
    },
  })

  console.log('Created classes')

  // Create sample students for class 7A
  const studentsData = [
    { name: 'Budi Santoso', nis: '2025001' },
    { name: 'Ani Wijaya', nis: '2025002' },
    { name: 'Dewi Kusuma', nis: '2025003' },
    { name: 'Eko Prasetyo', nis: '2025004' },
    { name: 'Fitri Handayani', nis: '2025005' },
  ]

  for (const studentData of studentsData) {
    await prisma.student.upsert({
      where: { id: `${class7A.id}-${studentData.nis}` },
      update: {},
      create: {
        id: `${class7A.id}-${studentData.nis}`,
        classId: class7A.id,
        name: studentData.name,
        nis: studentData.nis,
        status: 'AKTIF',
      },
    })
  }

  console.log('Created students')

  const class7AStudents = await prisma.student.findMany({
    where: { classId: class7A.id },
    select: { id: true, classId: true },
  })

  await prisma.savingsAccount.createMany({
    data: class7AStudents.map((student) => ({
      studentId: student.id,
      classId: student.classId,
    })),
    skipDuplicates: true,
  })

  console.log('Created savings accounts')

  console.log('Seed completed!')
  console.log('\nLogin credentials:')
  console.log('Admin: admin / aryaeki0707')
  console.log('Kepala Sekolah: kepala-sekolah / kepala123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
