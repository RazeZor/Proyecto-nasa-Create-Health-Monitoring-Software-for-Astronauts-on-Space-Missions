import { CheckInScreen } from "@/components/checkin/checkin-form"
import { seccionDe } from "@/lib/guardia"

export default async function Page({ params }: { params: Promise<{ rol: string }> }) {
  await seccionDe(params, "check-in")
  return <CheckInScreen />
}
