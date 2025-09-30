import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button"
import { FiActivity, FiPaperclip } from "react-icons/fi";
// import { Button } from "@/components/ui/button"

export default function AdminDashboardPage() {
  const workspaces = [
    { name: "Keuangan RS", role: "Admin", pending: 24, done: 12 },
    { name: "Farmasi", role: "Member", pending: 10, done: 6 },
    { name: "Sekolah CBT", role: "Viewer", pending: 0, done: 3 },
  ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        🌿 Selamat datang kembali, <span className="text-blue-600">Koala User</span>!
      </h1>

      <div className="space-y-4">
        <h2 className="font-semibold text-lg flex items-center gap-2"><FiActivity /> Progress Kamu</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex gap-8 items-center justify-between">
              <span>To Do</span>
              <div className={`h-1 flex-1 rounded-full bg-danger`} />
            </CardHeader>
            <CardBody>
              <p className="text-3xl">12</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader className="flex gap-8 items-center justify-between">
              <span>In Progress</span>
              <div className={`h-1 flex-1 rounded-full bg-warning`} />
            </CardHeader>
            <CardBody>
              <p className="text-3xl">7</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader className="flex gap-8 items-center justify-between">
              <span>On Review</span>
              <div className={`h-1 flex-1 rounded-full bg-secondary`} />
            </CardHeader>
            <CardBody>
              <p className="text-3xl">12</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader className="flex gap-8 items-center justify-between">
              <span>Revision</span>
              <div className={`h-1 flex-1 rounded-full bg-warning-300`} />
            </CardHeader>
            <CardBody>
              <p className="text-3xl">7</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader className="flex gap-8 items-center justify-between">
                <span>Complete</span>
                <div className={`h-1 flex-1 rounded-full bg-success`} />
            </CardHeader>
            <CardBody>
              <p className="text-3xl">12</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader className="flex gap-8 items-center justify-between">
              <span>Pending</span>
              <div className={`h-1 flex-1 rounded-full bg-default-400`} />
            </CardHeader>
            <CardBody>
              <p className="text-3xl">7</p>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3">
        <div className="space-y-4 col-span-2">
          <h2 className="font-semibold text-lg flex items-center gap-2"><FiPaperclip /> Workspace Kamu</h2>
          {workspaces.map((ws, i) => (
            <Card key={i}>
              <CardHeader>
                <span>{ws.name}</span>
              </CardHeader>
              <CardBody className="flex justify-between">
                <span>Role: 🐨 {ws.role}</span>
                <span>{ws.pending} pending | {ws.done} selesai</span>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
