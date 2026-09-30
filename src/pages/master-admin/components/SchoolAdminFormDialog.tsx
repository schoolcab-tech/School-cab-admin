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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateSchoolAdmin } from "@/hooks/useSchoolAdmins";
import { useSchools } from "@/hooks/useSchools";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const schema = z.object({
  school_id: z.string().min(1, "Please select a school"),
  contact_person: z.string().min(2, "Contact person name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  /** Limit school dropdown to these ids (moderator-owned schools) */
  schoolIds?: number[];
}

export function SchoolAdminFormDialog({ open, onOpenChange, onCreated, schoolIds }: Props) {
  const createMutation = useCreateSchoolAdmin();
  // getSchools returns { data, count, page, limit, totalPages }. Pass a high limit
  // to fetch all schools in one go for the dropdown.
  const { data: schoolsResult } = useSchools({ limit: 1000, page: 1 } as any);
  let schools: any[] = Array.isArray(schoolsResult)
    ? schoolsResult
    : (schoolsResult as any)?.data ?? [];
  if (schoolIds?.length) {
    const allowed = new Set(schoolIds.map(String));
    schools = schools.filter((s) => allowed.has(String(s.id)));
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      school_id: "",
      contact_person: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await createMutation.mutateAsync({
        school_id: parseInt(data.school_id),
        contact_person: data.contact_person,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });
      toast.success("School admin created successfully");
      form.reset();
      onOpenChange(false);
      onCreated?.();
    } catch (error: any) {
      toast.error("Failed to create school admin: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New School Admin</DialogTitle>
          <DialogDescription>
            Create a principal / school admin account. They will get a school-scoped portal to view students, bookings, payments, routes, schedules, drivers, live tracking, reports, and edit their school profile.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="school_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a school" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {schools.map((s: any) => (
                        <SelectItem key={s.id ?? s.school_id} value={String(s.id ?? s.school_id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact_person"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person *</FormLabel>
                    <FormControl>
                      <Input placeholder="Full name" {...field} />
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
                      <Input placeholder="10-digit phone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="admin@school.com" {...field} />
                  </FormControl>
                  <FormDescription>Used for login</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary Password *</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="At least 6 characters" {...field} />
                  </FormControl>
                  <FormDescription>The admin can change this after first login</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create School Admin"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
