import { DashboardLayout } from "@/components/DashboardLayout"
import { SchoolsTable } from "@/components/tables/SchoolsTable"
import { useNavigate } from "react-router-dom"

export default function Schools() {
  const navigate = useNavigate()

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schools Management</h1>
          <p className="text-muted-foreground">
            Manage schools, their details, and operating hours.
          </p>
        </div>
        
        <SchoolsTable 
          onAddSchool={handleAddSchool}
          onViewSchool={handleViewSchool}
          onEditSchool={handleEditSchool}
        />
      </div>
    </DashboardLayout>
  )
}