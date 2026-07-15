import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { 
  Copy, 
  Edit, 
  Eye, 
  Loader2, 
  Plus, 
  Search, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  Filter,
  Download,
  Calendar,
  Percent,
  IndianRupee
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CouponForm } from "@/components/forms/CouponForm";
import { Coupon, CouponFilter, CreateCouponInput } from "@/types/coupon";
import { 
  useCoupons, 
  useCreateCoupon, 
  useUpdateCoupon, 
  useDeleteCoupon, 
  useToggleCouponStatus 
} from "@/hooks/useCoupons";

interface CouponsTableProps {
  onAddCoupon?: () => void;
  onViewCoupon?: (id: number) => void;
  onEditCoupon?: (id: number) => void;
  filters?: CouponFilter;
}

export function CouponsTable({
  onAddCoupon,
  onViewCoupon,
  onEditCoupon,
  filters = {},
}: CouponsTableProps) {
  const { toast } = useToast();
  
  // State for filters and dialogs
  const [localFilters, setLocalFilters] = useState<CouponFilter>({
    ...filters,
    search: "",
    status: undefined,
    applicable_months: undefined,
    discount_type: undefined,
  });
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);

  // Queries and Mutations
  const { data: coupons = [], isLoading, error } = useCoupons(localFilters);
  
  const createMutation = useCreateCoupon();
  const updateMutation = useUpdateCoupon();
  const deleteMutation = useDeleteCoupon();
  const toggleStatusMutation = useToggleCouponStatus();

  // Handlers
  const handleCreateCoupon = async (data: CreateCouponInput) => {
    try {
      await createMutation.mutateAsync(data);
      setShowCreateDialog(false);
      toast({
        title: "Success",
        description: "Coupon created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create coupon",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCoupon = async (data: CreateCouponInput) => {
    if (!editingCoupon) return;
    try {
      await updateMutation.mutateAsync({ id: editingCoupon.coupon_id, data });
      setEditingCoupon(null);
      toast({
        title: "Success",
        description: "Coupon updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update coupon",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCoupon = async () => {
    if (!deletingCoupon) return;
    try {
      await deleteMutation.mutateAsync(deletingCoupon.coupon_id);
      setDeletingCoupon(null);
      toast({
        title: "Success",
        description: "Coupon deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete coupon",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    try {
      const updatedCoupon = await toggleStatusMutation.mutateAsync(coupon.coupon_id);
      toast({
        title: "Success",
        description: `Coupon ${updatedCoupon.is_active ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to toggle coupon status",
        variant: "destructive",
      });
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: "Coupon code copied to clipboard",
    });
  };

  const getStatusBadge = (coupon: Coupon) => {
    const currentDate = new Date().toISOString().split('T')[0];
    
    if (!coupon.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    
    if (coupon.valid_until && coupon.valid_until < currentDate) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return <Badge variant="destructive">Used Up</Badge>;
    }
    
    return <Badge variant="default">Active</Badge>;
  };

  const getUsageText = (coupon: Coupon) => {
    if (!coupon.max_uses) {
      return `${coupon.used_count} uses`;
    }
    return `${coupon.used_count}/${coupon.max_uses} uses`;
  };

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return (
        <div className="flex items-center gap-1">
          <Percent className="h-3 w-3" />
          {coupon.discount_value}%
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1">
          <IndianRupee className="h-3 w-3" />
          {coupon.discount_value}
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <p className="text-destructive">Error loading coupons: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Coupon Codes</CardTitle>
              <CardDescription>
                Manage discount coupons and promotional codes
              </CardDescription>
            </div>
            
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Coupon
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search coupons by code, name, or description..."
                  value={localFilters.search || ""}
                  onChange={(e) =>
                    setLocalFilters(prev => ({ ...prev, search: e.target.value }))
                  }
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select 
              value={localFilters.status || "all"} 
              onValueChange={(value) => 
                setLocalFilters(prev => ({ 
                  ...prev, 
                  status: value === "all" ? undefined : value as any 
                }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={localFilters.applicable_months?.toString() || "all"} 
              onValueChange={(value) => 
                setLocalFilters(prev => ({ 
                  ...prev, 
                  applicable_months: value === "all" ? undefined : parseInt(value) as any 
                }))
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                <SelectItem value="1">1 Month</SelectItem>
                <SelectItem value="3">3 Months</SelectItem>
                <SelectItem value="6">6 Months</SelectItem>
                <SelectItem value="12">12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <p>No coupons found</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setShowCreateDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create your first coupon
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map((coupon) => (
                  <TableRow key={coupon.coupon_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {coupon.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(coupon.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <p className="font-medium">{coupon.name}</p>
                        {coupon.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {coupon.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline">
                        {coupon.applicable_months} month{coupon.applicable_months > 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {getDiscountDisplay(coupon)}
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-sm">{getUsageText(coupon)}</span>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {coupon.valid_from && (
                          <div>From: {format(new Date(coupon.valid_from), 'MMM dd, yyyy')}</div>
                        )}
                        {coupon.valid_until ? (
                          <div>Until: {format(new Date(coupon.valid_until), 'MMM dd, yyyy')}</div>
                        ) : (
                          <div className="text-muted-foreground">No expiry</div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(coupon)}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(coupon)}
                          disabled={toggleStatusMutation.isPending}
                        >
                          {coupon.is_active ? (
                            <ToggleRight className="h-4 w-4" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCoupon(coupon)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingCoupon(coupon)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <CouponForm
            onSubmit={handleCreateCoupon}
            onCancel={() => setShowCreateDialog(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingCoupon} onOpenChange={() => setEditingCoupon(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {editingCoupon && (
            <CouponForm
              initialData={editingCoupon}
              isEdit
              onSubmit={handleUpdateCoupon}
              onCancel={() => setEditingCoupon(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCoupon} onOpenChange={() => setDeletingCoupon(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the coupon "{deletingCoupon?.code}"? 
              This will deactivate the coupon and it cannot be used anymore. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCoupon}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Coupon
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}