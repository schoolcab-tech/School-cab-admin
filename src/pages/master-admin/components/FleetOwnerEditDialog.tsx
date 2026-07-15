import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUpdateFleetOwner } from "@/hooks/useFleetOwners";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import type { FleetOwnerWithStats } from "@/services/fleetOwnerService";
import { useEffect } from "react";

const editFleetOwnerSchema = z.object({
  company_name: z.string().min(2, "Company name must be at least 2 characters"),
  contact_person: z.string().min(2, "Contact person name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gst_number: z.string().optional(),
  pan_number: z.string().optional(),
});

type EditFleetOwnerFormValues = z.infer<typeof editFleetOwnerSchema>;

interface FleetOwnerEditDialogProps {
  owner: FleetOwnerWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FleetOwnerEditDialog({
  owner,
  open,
  onOpenChange,
}: FleetOwnerEditDialogProps) {
  const updateMutation = useUpdateFleetOwner();

  const form = useForm<EditFleetOwnerFormValues>({
    resolver: zodResolver(editFleetOwnerSchema),
    defaultValues: {
      company_name: "",
      contact_person: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      gst_number: "",
      pan_number: "",
    },
  });

  // Update form values when owner changes
  useEffect(() => {
    if (owner) {
      form.reset({
        company_name: owner.company_name,
        contact_person: owner.contact_person,
        phone: owner.phone,
        address: owner.address || "",
        city: owner.city || "",
        state: owner.state || "",
        pincode: owner.pincode || "",
        gst_number: owner.gst_number || "",
        pan_number: owner.pan_number || "",
      });
    }
  }, [owner, form]);

  const onSubmit = async (data: EditFleetOwnerFormValues) => {
    if (!owner) return;

    try {
      await updateMutation.mutateAsync({
        ownerId: owner.owner_id,
        data,
        oldData: {
          company_name: owner.company_name,
          contact_person: owner.contact_person,
          phone: owner.phone,
        },
      });
      toast.success("Fleet owner updated successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to update fleet owner: " + error.message);
    }
  };

  if (!owner) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Fleet Owner</DialogTitle>
          <DialogDescription>
            Update information for {owner.company_name}. Email cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC Transport Services" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_person"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input placeholder="9876543210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-1">
                <FormLabel>Email</FormLabel>
                <Input value={owner.email} disabled />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Mumbai" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="Maharashtra" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pincode</FormLabel>
                    <FormControl>
                      <Input placeholder="400001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gst_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST Number</FormLabel>
                    <FormControl>
                      <Input placeholder="22AAAAA0000A1Z5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pan_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAN Number</FormLabel>
                    <FormControl>
                      <Input placeholder="ABCDE1234F" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
