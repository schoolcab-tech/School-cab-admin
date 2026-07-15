import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useContactFormResponses,
  useLeadBookings,
  useDeleteContactFormResponse,
  useDeleteLeadBooking,
} from "@/hooks/useWebsiteLeads";
import {
  BookOpen,
  Clock,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  School,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function WebsiteLeadsPage() {
  const {
    data: contactResponses = [],
    isLoading: isLoadingContact,
    error: contactError,
  } = useContactFormResponses();

  const {
    data: leadBookings = [],
    isLoading: isLoadingLeads,
    error: leadsError,
  } = useLeadBookings();

  const deleteContactMutation = useDeleteContactFormResponse();
  const deleteLeadMutation = useDeleteLeadBooking();

  const handleDeleteContact = async (id: string) => {
    try {
      await deleteContactMutation.mutateAsync(id);
      toast.success("Contact form response deleted");
    } catch {
      toast.error("Failed to delete contact form response");
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await deleteLeadMutation.mutateAsync(id);
      toast.success("Lead booking deleted");
    } catch {
      toast.error("Failed to delete lead booking");
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy hh:mm a");
    } catch {
      return dateString;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Website Leads</h1>
          <p className="text-muted-foreground">
            View and manage leads from the website contact form and booking requests.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Contact Form Responses
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingContact ? "..." : contactResponses.length}
              </div>
              <p className="text-xs text-muted-foreground">Total inquiries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Booking Requests
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingLeads ? "..." : leadBookings.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Total booking leads
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="bookings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Booking Requests
              <Badge variant="secondary" className="ml-1">
                {leadBookings.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Contact Form
              <Badge variant="secondary" className="ml-1">
                {contactResponses.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Booking Requests Tab */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Booking Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingLeads ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : leadsError ? (
                  <div className="text-center py-8 text-destructive">
                    Error loading booking requests
                  </div>
                ) : leadBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No booking requests yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Timing</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leadBookings.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {lead.student_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{lead.parent_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <School className="h-4 w-4 text-muted-foreground" />
                              <span className="max-w-[150px] truncate">
                                {lead.school}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {lead.phone_number}
                              </div>
                              {lead.alternate_number && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {lead.alternate_number}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="h-3 w-3 text-green-500" />
                                Pickup: {lead.pickup_time}
                              </div>
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="h-3 w-3 text-orange-500" />
                                Drop: {lead.drop_time}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-start gap-1 max-w-[200px]">
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                              <span className="text-sm truncate" title={lead.current_address}>
                                {lead.current_address}
                              </span>
                            </div>
                            {lead.special_instructions && (
                              <div className="text-xs text-muted-foreground mt-1 italic">
                                Note: {lead.special_instructions}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(lead.created_at)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the booking request from{" "}
                                    {lead.parent_name}. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteLead(lead.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Form Tab */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>Contact Form Responses</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingContact ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : contactError ? (
                  <div className="text-center py-8 text-destructive">
                    Error loading contact form responses
                  </div>
                ) : contactResponses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No contact form responses yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contactResponses.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {contact.full_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <a
                                href={`mailto:${contact.email}`}
                                className="text-primary hover:underline"
                              >
                                {contact.email}
                              </a>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <a
                                href={`tel:${contact.phone_number}`}
                                className="hover:underline"
                              >
                                {contact.phone_number}
                              </a>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="max-w-[300px] truncate" title={contact.message}>
                              {contact.message}
                            </p>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(contact.created_at)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Response?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the contact form response
                                    from {contact.full_name}. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteContact(contact.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
