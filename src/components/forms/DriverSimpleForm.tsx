import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
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
import { useToast } from "@/components/ui/use-toast";
import {
  useCreateDriver,
  useDriver,
  useUpdateDriver,
} from "@/hooks/useDrivers";
import type { Driver } from "@/services/driverService";
import { createUserAccount, markProfileCompleted } from "@/services/adminAuthService";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const vehicleTypes = [
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "van", label: "Van" },
  { value: "minibus", label: "Minibus" },
];

// Schema strictly matching backend expectations
const formSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10, "Enter a valid 10-digit mobile number").refine(
    (val) => {
      const digits = val.replace(/[\s\-\(\)\+]/g, "").replace(/^91/, "");
      return /^[6-9]\d{9}$/.test(digits);
    },
    { message: "Must be a valid 10-digit Indian mobile number (starting with 6-9)" }
  ),
  cab_number: z.string().min(1),
  cab_capacity: z.number().min(1),
  license_number: z.string().min(1),
  vehicle_type: z.string().min(1),
  service_areas_text: z.string().min(1, {
    message: "Provide at least one pincode separated by commas",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  driverId?: string;
}

export function DriverSimpleForm({ driverId }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const { data: existingDriver, isLoading: isLoadingDriver } = useDriver(
    driverId || ""
  );
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      cab_number: "",
      cab_capacity: 4,
      license_number: "",
      vehicle_type: "",
      service_areas_text: "",
    },
  });

  // Populate for edit mode
  useEffect(() => {
    if (driverId && existingDriver) {
      const driverData = existingDriver as unknown as Driver;
      const serviceAreasText = (driverData.service_areas || [])
        .map((a) => a.pincode)
        .join(", ");

      form.reset({
        name: driverData.name || "",
        phone: driverData.phone || "",
        cab_number: driverData.cab_number || "",
        cab_capacity: driverData.cab_capacity || 4,
        license_number: driverData.license_number || "",
        vehicle_type: driverData.vehicle_type || "",
        service_areas_text: serviceAreasText,
      });
    }
  }, [driverId, existingDriver, form]);

  const onSubmit = async (data: FormValues) => {
    const serviceAreasArray = data.service_areas_text
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    const payload = {
      name: data.name,
      phone: data.phone,
      cab_number: data.cab_number,
      cab_capacity: data.cab_capacity,
      license_number: data.license_number,
      vehicle_type: data.vehicle_type,
      service_areas: serviceAreasArray,
    } as const;

    try {
      if (driverId) {
        // Edit mode — just update the existing driver record
        await updateDriver.mutateAsync({ id: driverId, data: payload });
        toast({ title: "Success", description: "Driver updated successfully" });
      } else {
        // Create mode — first create auth account, then driver profile
        setIsCreating(true);
        const authResult = await createUserAccount(data.phone, "driver");

        await createDriver.mutateAsync({ data: payload, userId: authResult.user_id });

        // Mark profile as completed
        await markProfileCompleted(data.phone);

        toast({
          title: "Success",
          description: "Driver account created! They can now login via the driver app.",
        });
        form.reset();
      }
      navigate("/drivers");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const isLoading =
    isLoadingDriver || createDriver.isPending || updateDriver.isPending || isCreating;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 max-w-xl"
      >
        <Card>
          <CardHeader>
            <CardTitle>
              {driverId ? "Edit Driver Details" : "Add New Driver"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone *</FormLabel>
                  <FormControl>
                    <Input placeholder="9876543210" {...field} />
                  </FormControl>
                  {!driverId && (
                    <p className="text-xs text-muted-foreground">
                      A login account will be created for this number.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cab number */}
            <FormField
              control={form.control}
              name="cab_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cab Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Vehicle registration" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cab capacity */}
            <FormField
              control={form.control}
              name="cab_capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cab Capacity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* License number */}
            <FormField
              control={form.control}
              name="license_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Driver's license" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Vehicle type */}
            <FormField
              control={form.control}
              name="vehicle_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicleTypes.map((v) => (
                        <SelectItem key={v.value} value={v.value}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service areas text */}
            <FormField
              control={form.control}
              name="service_areas_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Areas (Pincodes)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 560001, 560002" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {driverId ? "Update" : "Create"} Driver
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
