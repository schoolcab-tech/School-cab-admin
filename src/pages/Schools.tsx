import { DashboardLayout } from "@/components/DashboardLayout"
import { SchoolsTable } from "@/components/tables/SchoolsTable"
import { ExportButton } from "@/components/ExportButton"
import { useSchools } from "@/hooks/useSchools"
import { useNavigate } from "react-router-dom"

export default function Schools() {
  const navigate = useNavigate()
  const { data: schoolsResult } = useSchools({ limit: 10000, page: 1 })
  const schools = schoolsResult?.data ?? []

  const handleAddSchool = () => {
    navigate('/schools/new')
  }

  const handleViewSchool = (id: string) => {
    navigate(`/schools/${id}`)
  }

  const handleEditSchool = (id: string) => {
    navigate(`/schools/${id}/edit`)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Schools Management</h1>
            <p className="text-muted-foreground">
              Manage schools, their details, and operating hours.
            </p>
          </div>
          <ExportButton
            headers={[
              "School ID",
              "Name",
              "Code",
              "City",
              "Status",
              "Students",
              "Drivers",
              "Email",
              "Phone",
            ]}
            rows={schools.map((s) => [
              s.id,
              s.name,
              s.code,
              s.address?.city || "",
              s.status,
              s.studentCount,
              s.driverCount,
              s.contact?.email || "",
              s.contact?.phone || "",
            ])}
            filename={`schools-${new Date().toISOString().split("T")[0]}`}
            disabled={schools.length === 0}
          />
        </div>
        
        <SchoolsTable 
          onAddSchool={handleAddSchool}
          onViewSchool={handleViewSchool}
          onEditSchool={handleEditSchool}
          showModeratorColumn
        />
      </div>
    </DashboardLayout>
  )
}