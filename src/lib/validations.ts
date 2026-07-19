import { z } from 'zod'

// Auth
export const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

export type LoginInput = z.infer<typeof loginSchema>

// Class
export const createClassSchema = z.object({
  name: z.string().trim().min(1, 'Nama kelas harus diisi'),
  tingkat: z.string().trim().min(1, 'Tingkat harus dipilih'),
  tahunAjaran: z.string().trim().min(1, 'Tahun ajaran harus diisi'),
})

export type CreateClassInput = z.infer<typeof createClassSchema>

export const updateClassSchema = z.object({
  kasNominal: z.number().int().min(0, 'Nominal kas tidak boleh negatif'),
})

export type UpdateClassInput = z.infer<typeof updateClassSchema>

const academicYearMigrationBaseSchema = z.object({
  fromTahunAjaran: z.string().trim().min(1, 'Tahun ajaran asal wajib diisi'),
  toTahunAjaran: z.string().trim().min(1, 'Tahun ajaran baru wajib diisi'),
})

export const academicYearMigrationSchema = academicYearMigrationBaseSchema.refine(
  (data) => data.fromTahunAjaran !== data.toTahunAjaran,
  { message: 'Tahun ajaran baru harus berbeda', path: ['toTahunAjaran'] }
)

export type AcademicYearMigrationInput = z.infer<typeof academicYearMigrationSchema>

export const executeAcademicYearMigrationSchema = academicYearMigrationBaseSchema.extend({
  confirmation: z.string().trim().min(1, 'Konfirmasi wajib diisi'),
}).refine(
  (data) => data.fromTahunAjaran !== data.toTahunAjaran,
  { message: 'Tahun ajaran baru harus berbeda', path: ['toTahunAjaran'] }
).refine(
  (data) => data.confirmation === `MIGRASI ${data.toTahunAjaran}`,
  { message: 'Teks konfirmasi tidak sesuai', path: ['confirmation'] }
)

export type ExecuteAcademicYearMigrationInput = z.infer<typeof executeAcademicYearMigrationSchema>

// Student
const optionalGenderSchema = z.preprocess(
  (value) => value === '' ? null : value,
  z.enum(['L', 'P']).optional().nullable()
)

export const createStudentSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  nisn: z.string().trim().min(1, 'NISN wajib diisi'),
  gender: optionalGenderSchema,
  status: z.enum(['AKTIF', 'BEBAS_KAS', 'PINDAH']).optional(),
  statusReason: z.string().optional().nullable(),
}).refine(
  (data) => data.status !== 'BEBAS_KAS' || (data.statusReason && data.statusReason.trim().length > 0),
  { message: 'Alasan bebas kas harus diisi', path: ['statusReason'] }
)

export type CreateStudentInput = z.infer<typeof createStudentSchema>

export const updateStudentSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  nisn: z.string().trim().min(1, 'NISN wajib diisi'),
  gender: optionalGenderSchema,
})

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>

export const importStudentsSchema = z.object({
  students: z.array(createStudentSchema).min(1, 'Minimal 1 siswa').max(500, 'Maksimal 500 siswa per import'),
})

export type ImportStudentsInput = z.infer<typeof importStudentsSchema>

export const updateStudentStatusSchema = z.object({
  status: z.enum(['AKTIF', 'BEBAS_KAS', 'PINDAH']),
  statusReason: z.string().optional(),
}).refine(
  (data) => data.status !== 'BEBAS_KAS' || (data.statusReason && data.statusReason.length > 0),
  { message: 'Alasan bebas kas harus diisi', path: ['statusReason'] }
)

export type UpdateStudentStatusInput = z.infer<typeof updateStudentStatusSchema>

// Payment
export const togglePaymentSchema = z.object({
  studentId: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  isPaid: z.boolean(),
})

export type TogglePaymentInput = z.infer<typeof togglePaymentSchema>

// Expense
export const createExpenseSchema = z.object({
  category: z.enum(['KONSUMSI', 'ALAT_KEBERSIHAN', 'KEGIATAN_KELAS', 'LAINNYA']),
  itemName: z.string().min(1, 'Nama barang harus diisi'),
  amount: z.number().int().min(1, 'Jumlah minimal 1'),
  photoUrl: z.string().url().optional().nullable(),
  note: z.string().optional(),
  spentAt: z.string().datetime(),
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>

// Savings
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid')

export const createSavingsDepositSchema = z.object({
  studentId: z.string().min(1, 'Siswa wajib dipilih'),
  amount: z.number().int().min(1, 'Nominal minimal 1'),
  transactionDate: dateOnlySchema,
  note: z.string().max(500, 'Catatan maksimal 500 karakter').optional().nullable(),
})

export type CreateSavingsDepositInput = z.infer<typeof createSavingsDepositSchema>

export const createWithdrawalRequestSchema = z.object({
  studentId: z.string().min(1, 'Siswa wajib dipilih'),
  amount: z.number().int().min(1, 'Nominal minimal 1'),
  reason: z.string().max(500, 'Alasan maksimal 500 karakter').optional().nullable(),
})

export type CreateWithdrawalRequestInput = z.infer<typeof createWithdrawalRequestSchema>

export const processWithdrawalRequestSchema = z.object({
  status: z.enum(['DISETUJUI', 'DITOLAK']),
  handoverConfirmed: z.boolean().optional(),
  rejectedReason: z.string().max(500, 'Alasan maksimal 500 karakter').optional().nullable(),
}).refine(
  (data) => data.status !== 'DISETUJUI' || data.handoverConfirmed === true,
  { message: 'Konfirmasi penyerahan uang wajib dicentang', path: ['handoverConfirmed'] }
).refine(
  (data) => data.status !== 'DITOLAK' || Boolean(data.rejectedReason?.trim()),
  { message: 'Alasan penolakan wajib diisi', path: ['rejectedReason'] }
)

export type ProcessWithdrawalRequestInput = z.infer<typeof processWithdrawalRequestSchema>

// Upload
export const presignSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().regex(/^image\//, 'Hanya file gambar yang diizinkan'),
})

export type PresignInput = z.infer<typeof presignSchema>
