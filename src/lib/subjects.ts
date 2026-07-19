import { prisma } from '@/lib/prisma'

export const DEFAULT_SUBJECT_NAMES = [
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

export async function ensureDefaultSubjects() {
  await prisma.subject.createMany({
    data: DEFAULT_SUBJECT_NAMES.map((name) => ({ name })),
    skipDuplicates: true,
  })
}
