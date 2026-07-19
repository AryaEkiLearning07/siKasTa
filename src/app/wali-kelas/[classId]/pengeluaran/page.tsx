import { redirect } from 'next/navigation'

export default function WaliKelasPengeluaranPage({ params }: { params: { classId: string } }) {
  redirect(`/wali-kelas/${params.classId}`)
}
