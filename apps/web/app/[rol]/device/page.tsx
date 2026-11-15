import { DeviceView } from "@/components/device/device-view"
import { seccionDe } from "@/lib/guardia"

export default async function Page({ params }: { params: Promise<{ rol: string }> }) {
  await seccionDe(params, "device")
  return <DeviceView />
}
