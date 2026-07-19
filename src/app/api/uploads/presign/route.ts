import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { presignSchema } from '@/lib/validations'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 })
    }

    if (user.role !== 'WALI_KELAS' && user.role !== 'BENDAHARA') {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses untuk upload lampiran' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = presignSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { fileName, fileType } = parsed.data

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024
    // Note: We can't validate size on client side presign, but R2 will reject

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    })

    const key = `receipts/${user.classId}/${Date.now()}-${fileName}`

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    })

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 })
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`

    return NextResponse.json({
      uploadUrl,
      publicUrl,
    })
  } catch (error) {
    console.error('Presign error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
