import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Building2, User, Mail, Phone, MapPin, CreditCard, Calendar, CheckCircle, XCircle } from "lucide-react";
import type { FleetOwnerWithStats } from "@/services/fleetOwnerService";

interface FleetOwnerDetailDialogProps {
  owner: FleetOwnerWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FleetOwnerDetailDialog({
  owner,
  open,
  onOpenChange,
}: FleetOwnerDetailDialogProps) {
  if (!owner) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Fleet Owner Details
          </DialogTitle>
          <DialogDescription>
            Complete information about {owner.company_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Company Information */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Company Name</p>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{owner.company_name}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Contact Person</p>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{owner.contact_person}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{owner.email}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Phone</p>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{owner.phone}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Address Information */}
          {(owner.address || owner.city || owner.state || owner.pincode) && (
            <>
              <div>
                <h3 className="font-semibold text-lg mb-3">Address Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {owner.address && (
                    <div className="space-y-1 md:col-span-2">
                      <p className="text-sm text-muted-foreground">Address</p>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <p className="font-medium">{owner.address}</p>
                      </div>
                    </div>
                  )}

                  {owner.city && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">City</p>
                      <p className="font-medium">{owner.city}</p>
                    </div>
                  )}

                  {owner.state && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">State</p>
                      <p className="font-medium">{owner.state}</p>
                    </div>
                  )}

                  {owner.pincode && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Pincode</p>
                      <p className="font-medium">{owner.pincode}</p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Business Information */}
          {(owner.gst_number || owner.pan_number) && (
            <>
              <div>
                <h3 className="font-semibold text-lg mb-3">Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {owner.gst_number && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">GST Number</p>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{owner.gst_number}</p>
                      </div>
                    </div>
                  )}

                  {owner.pan_number && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">PAN Number</p>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{owner.pan_number}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Status Information */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Status & Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Account Status</p>
                {owner.is_active ? (
                  <Badge className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Suspended
                  </Badge>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Verification Status</p>
                {owner.verified_at ? (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Verified on {format(new Date(owner.verified_at), "MMM dd, yyyy")}
                  </div>
                ) : (
                  <Badge variant="outline">Pending Verification</Badge>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Cabs</p>
                <Badge variant="secondary" className="text-base">
                  {owner.active_drivers_count || 0} cabs assigned
                </Badge>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Created On</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">
                    {format(new Date(owner.created_at), "MMM dd, yyyy")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
