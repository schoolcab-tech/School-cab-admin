import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Image as ImageIcon, 
  Hash,
  MoveUp,
  MoveDown
} from "lucide-react";
import { Benefit, USER_TYPE_OPTIONS } from "@/types/benefit";
import { benefitService } from "@/services/benefitService";
import { toast } from "sonner";

interface BenefitsTableProps {
  benefits: Benefit[];
  onEdit: (benefit: Benefit) => void;
  onRefresh: () => void;
}

export function BenefitsTable({ benefits, onEdit, onRefresh }: BenefitsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [benefitToDelete, setBenefitToDelete] = useState<Benefit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (benefit: Benefit) => {
    setBenefitToDelete(benefit);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!benefitToDelete) return;

    try {
      setIsDeleting(true);
      
      // // Delete image if exists
      // if (benefitToDelete.image_url) {
      //   await benefitService.deleteImage(benefitToDelete.image_url);
      // }
      
      await benefitService.deleteBenefit(benefitToDelete.id);
      toast.success("Benefit deleted successfully");
      onRefresh();
    } catch (error) {
      console.error("Error deleting benefit:", error);
      toast.error("Failed to delete benefit");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setBenefitToDelete(null);
    }
  };

  const handleToggleStatus = async (benefit: Benefit) => {
    try {
      await benefitService.updateBenefit({
        id: benefit.id,
        is_active: !benefit.is_active,
      });
      toast.success(`Benefit ${benefit.is_active ? 'deactivated' : 'activated'} successfully`);
      onRefresh();
    } catch (error) {
      console.error("Error updating benefit status:", error);
      toast.error("Failed to update benefit status");
    }
  };

  const handleMoveUp = async (benefit: Benefit, index: number) => {
    if (index === 0) return;
    
    try {
      const benefitsToUpdate = [
        { id: benefits[index - 1].id, display_order: benefit.display_order },
        { id: benefit.id, display_order: benefits[index - 1].display_order },
      ];
      
      await benefitService.updateDisplayOrder(benefitsToUpdate);
      toast.success("Display order updated successfully");
      onRefresh();
    } catch (error) {
      console.error("Error updating display order:", error);
      toast.error("Failed to update display order");
    }
  };

  const handleMoveDown = async (benefit: Benefit, index: number) => {
    if (index === benefits.length - 1) return;
    
    try {
      const benefitsToUpdate = [
        { id: benefits[index + 1].id, display_order: benefit.display_order },
        { id: benefit.id, display_order: benefits[index + 1].display_order },
      ];
      
      await benefitService.updateDisplayOrder(benefitsToUpdate);
      toast.success("Display order updated successfully");
      onRefresh();
    } catch (error) {
      console.error("Error updating display order:", error);
      toast.error("Failed to update display order");
    }
  };

  if (benefits.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No benefits found
          </h3>
          <p className="text-sm text-muted-foreground">
            Get started by adding your first benefit.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Benefits ({benefits.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Visual</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Target Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {benefits.map((benefit, index) => (
                <TableRow key={benefit.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* {benefit.image_url ? (
                        <div className="relative">
                          <img
                            src={benefit.image_url}
                            alt={benefit.title}
                            className="w-10 h-10 rounded object-cover"
                          />
                          <ImageIcon className="absolute -bottom-1 -right-1 w-4 h-4 bg-background rounded-full p-0.5" />
                        </div>
                      ) : */}
                      {benefit.icon_name ? (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Hash className="w-5 h-5 text-muted-foreground" />
                          <span className="text-xs font-mono">{benefit.icon_name}</span>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{benefit.title}</div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate text-sm text-muted-foreground">
                      {benefit.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        benefit.user_type === 'student' ? 'default' :
                        benefit.user_type === 'driver' ? 'secondary' :
                        'outline'
                      }
                    >
                      {USER_TYPE_OPTIONS.find(opt => opt.value === benefit.user_type)?.label || benefit.user_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={benefit.is_active ? "success" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleStatus(benefit)}
                    >
                      {benefit.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-mono">{benefit.display_order}</span>
                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => handleMoveUp(benefit, index)}
                          disabled={index === 0}
                        >
                          <MoveUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => handleMoveDown(benefit, index)}
                          disabled={index === benefits.length - 1}
                        >
                          <MoveDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(benefit)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleToggleStatus(benefit)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {benefit.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(benefit)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{benefitToDelete?.title}" and its associated image (if any).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}