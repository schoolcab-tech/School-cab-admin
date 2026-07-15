import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BenefitsTable } from "@/components/tables/BenefitsTable";
import { BenefitForm } from "@/components/forms/BenefitForm";
import { Benefit, CreateBenefitData, UpdateBenefitData, UserType, USER_TYPE_OPTIONS } from "@/types/benefit";
import { benefitService } from "@/services/benefitService";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Benefits() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [filteredBenefits, setFilteredBenefits] = useState<Benefit[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<UserType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadBenefits();
  }, []);

  useEffect(() => {
    // Filter benefits based on search term, user type, and status
    let filtered = benefits.filter(
      (benefit) =>
        benefit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        benefit.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter by user type
    if (userTypeFilter !== "all") {
      filtered = filtered.filter(
        (benefit) => benefit.user_type === userTypeFilter || benefit.user_type === "both"
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (benefit) => statusFilter === "active" ? benefit.is_active : !benefit.is_active
      );
    }

    setFilteredBenefits(filtered);
  }, [benefits, searchTerm, userTypeFilter, statusFilter]);

  const loadBenefits = async () => {
    try {
      setIsLoading(true);
      const data = await benefitService.getBenefits();
      setBenefits(data);
    } catch (error) {
      console.error("Error loading benefits:", error);
      toast.error("Failed to load benefits");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBenefit = async (data: CreateBenefitData) => {
    try {
      setIsSubmitting(true);
      await benefitService.createBenefit(data);
      toast.success("Benefit created successfully");
      setIsFormOpen(false);
      loadBenefits();
    } catch (error) {
      console.error("Error creating benefit:", error);
      toast.error("Failed to create benefit");
      throw error; // Re-throw to let form handle it
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBenefit = async (data: UpdateBenefitData) => {
    try {
      setIsSubmitting(true);
      await benefitService.updateBenefit(data);
      toast.success("Benefit updated successfully");
      setIsFormOpen(false);
      setEditingBenefit(null);
      loadBenefits();
    } catch (error) {
      console.error("Error updating benefit:", error);
      toast.error("Failed to update benefit");
      throw error; // Re-throw to let form handle it
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (benefit: Benefit) => {
    setEditingBenefit(benefit);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingBenefit(null);
  };

  const handleSubmit = async (data: CreateBenefitData | UpdateBenefitData) => {
    if (editingBenefit) {
      await handleUpdateBenefit(data as UpdateBenefitData);
    } else {
      await handleCreateBenefit(data as CreateBenefitData);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Benefits</h1>
            <p className="text-muted-foreground">
              Manage benefits displayed in your mobile app
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={loadBenefits}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Benefit
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search benefits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={userTypeFilter} onValueChange={(value: UserType | "all") => setUserTypeFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by user type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {USER_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Benefits Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <BenefitsTable
            benefits={filteredBenefits}
            onEdit={handleEdit}
            onRefresh={loadBenefits}
          />
        )}

        {/* Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBenefit ? "Edit Benefit" : "Add New Benefit"}
              </DialogTitle>
            </DialogHeader>
            <BenefitForm
              benefit={editingBenefit || undefined}
              onSubmit={handleSubmit}
              onCancel={handleCloseForm}
              isLoading={isSubmitting}
            />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}