import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LocationPicker } from "@/components/ui/location-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { CreateSchoolInput, School, UpdateSchoolInput } from "@/types/school";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "School name must be at least 2 characters.",
  }),
  code: z.string().min(2, {
    message: "School code must be at least 2 characters.",
  }),
  status: z.enum(["active", "inactive"]),
  locality: z.string().min(2, {
    message: "Locality must be at least 2 characters.",
  }),
  address: z.object({
    street: z.string().min(5, {
      message: "Street address must be at least 5 characters.",
    }),
    city: z.string().min(2, {
      message: "City name must be at least 2 characters.",
    }),
    state: z.string().min(2, {
      message: "State name must be at least 2 characters.",
    }),
    postalCode: z.string().regex(/^\d{6}$/, {
      message: "Postal code must be 6 digits.",
    }),
    country: z.string().default("India"),
  }),
  contact: z.object({
    email: z.string().email({
      message: "Please enter a valid email address.",
    }),
    phone: z.string().min(10, {
      message: "Phone number must be at least 10 digits.",
    }),
    principalName: z.string().optional(),
    principalPhone: z.string().optional(),
  }),
  operatingHours: z.object({
    monday: z.object({
      open: z.string(),
      close: z.string(),
    }),
    tuesday: z.object({
      open: z.string(),
      close: z.string(),
    }),
    wednesday: z.object({
      open: z.string(),
      close: z.string(),
    }),
    thursday: z.object({
      open: z.string(),
      close: z.string(),
    }),
    friday: z.object({
      open: z.string(),
      close: z.string(),
    }),
    saturday: z
      .object({
        open: z.string(),
        close: z.string(),
      })
      .nullable(),
    sunday: z
      .object({
        open: z.string(),
        close: z.string(),
      })
      .nullable(),
  }),
  additionalInfo: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

// Use the OperatingHours type from the school types

type SchoolFormValues = z.infer<typeof formSchema>;

interface SchoolFormProps {
  initialData?: School | null;
  onSubmit: (data: CreateSchoolInput | UpdateSchoolInput) => Promise<void>;
  isLoading?: boolean;
  isEdit?: boolean;
  /** School admin profile: hide code/status, lock name. */
  profileMode?: boolean;
}

export function SchoolForm({
  initialData,
  onSubmit,
  isLoading = false,
  isEdit = false,
  profileMode = false,
}: SchoolFormProps) {
  const { toast } = useToast();
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(
    initialData?.latitude && initialData?.longitude
      ? { lat: initialData.latitude, lng: initialData.longitude }
      : null
  );
  const [fullAddress, setFullAddress] = useState(
    initialData?.address.street || ""
  );
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(
    initialData?.googlePlaceId || null
  );

  const getDefaultValues = (): SchoolFormValues => {
    if (initialData) {
      const { address, ...restData } = initialData;
      return {
        ...restData,
        locality: address.locality,
        address: {
          street: address.street,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
        },
      };
    }

    return {
      name: "",
      code: "",
      status: "active",
      locality: "",
      address: {
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
      },
      contact: {
        email: "",
        phone: "",
        principalName: "",
        principalPhone: "",
      },
      operatingHours: {
        monday: { open: "08:00", close: "16:00" },
        tuesday: { open: "08:00", close: "16:00" },
        wednesday: { open: "08:00", close: "16:00" },
        thursday: { open: "08:00", close: "16:00" },
        friday: { open: "08:00", close: "16:00" },
        saturday: null,
        sunday: null,
      },
      additionalInfo: "",
    };
  };

  const form = useForm<SchoolFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          locality: initialData.address.locality,
          address: {
            street: initialData.address.street,
            city: initialData.address.city,
            state: initialData.address.state,
            postalCode: initialData.address.postalCode,
            country: initialData.address.country,
          },
          operatingHours: {
            monday: initialData.operatingHours.monday || {
              open: "08:00",
              close: "16:00",
            },
            tuesday: initialData.operatingHours.tuesday || {
              open: "08:00",
              close: "16:00",
            },
            wednesday: initialData.operatingHours.wednesday || {
              open: "08:00",
              close: "16:00",
            },
            thursday: initialData.operatingHours.thursday || {
              open: "08:00",
              close: "16:00",
            },
            friday: initialData.operatingHours.friday || {
              open: "08:00",
              close: "16:00",
            },
            saturday: initialData.operatingHours.saturday || null,
            sunday: initialData.operatingHours.sunday || null,
          },
        }
      : {
          name: "",
          code: "",
          status: "active",
          locality: "",
          address: {
            street: "",
            city: "",
            state: "",
            postalCode: "",
            country: "India",
          },
          contact: {
            email: "",
            phone: "",
            principalName: "",
            principalPhone: "",
          },
          operatingHours: {
            monday: { open: "08:00", close: "16:00" },
            tuesday: { open: "08:00", close: "16:00" },
            wednesday: { open: "08:00", close: "16:00" },
            thursday: { open: "08:00", close: "16:00" },
            friday: { open: "08:00", close: "16:00" },
            saturday: null,
            sunday: null,
          },
          additionalInfo: "",
        },
  });

  const handleSubmit = async (formData: SchoolFormValues) => {
    try {
      // Move locality from form data to address object before submission
      const { locality, ...restData } = formData;
      const submissionData = {
        ...restData,
        address: {
          ...restData.address,
          locality,
        },
        latitude: selectedCoordinates?.lat ?? null,
        longitude: selectedCoordinates?.lng ?? null,
        googlePlaceId: googlePlaceId ?? null,
      };

      await onSubmit(submissionData as CreateSchoolInput | UpdateSchoolInput);
      toast({
        title: isEdit
          ? "School updated successfully"
          : "School created successfully",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* School Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter school name"
                      {...field}
                      disabled={profileMode}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!profileMode && (
              <>
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School Code *</FormLabel>
                  <FormControl>
                    <Input placeholder="SCH001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
              </>
            )}
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contact Information</h3>

            <FormField
              control={form.control}
              name="contact.email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="school@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact.phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="+91 9876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact.principalName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Principal Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Principal's name"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact.principalPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Principal's Phone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+91 9876543210"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Address</h3>

            <FormField
              control={form.control}
              name="address.street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address *</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="locality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Locality *</FormLabel>
                  <FormControl>
                    <Input placeholder="Locality" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address.city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <FormControl>
                      <Input placeholder="Mumbai" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address.state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State *</FormLabel>
                    <FormControl>
                      <Input placeholder="Maharashtra" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address.postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="400001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address.country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Operating Hours */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Operating Hours</h3>

            {[
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ].map((day) => (
              <div key={day} className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel className="capitalize">{day}</FormLabel>
                  <div className="flex items-center space-x-2">
                    <FormField
                      control={form.control}
                      name={`operatingHours.${day}.open` as const}
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormLabel className="text-sm">Open</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              disabled={day === "saturday" || day === "sunday"}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`operatingHours.${day}.close` as const}
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormLabel className="text-sm">Close</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              disabled={day === "saturday" || day === "sunday"}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {(day === "saturday" || day === "sunday") && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const currentValue = form.getValues(
                            `operatingHours.${day}`
                          );
                          form.setValue(
                            `operatingHours.${day}`,
                            currentValue
                              ? null
                              : { open: "09:00", close: "13:00" },
                            { shouldValidate: true }
                          );
                        }}
                      >
                        {form.getValues(`operatingHours.${day}`)
                          ? "Disable"
                          : "Enable"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Location Picker */}
          <div className="space-y-4 md:col-span-2">
            <h3 className="text-lg font-medium">Location on Map</h3>
            <LocationPicker
              value={selectedCoordinates}
              onChange={setSelectedCoordinates}
              address={fullAddress}
              onAddressChange={setFullAddress}
              googlePlaceId={googlePlaceId}
              onGooglePlaceIdChange={setGooglePlaceId}
              label="School Location"
            />
          </div>

          {/* Additional Info */}
          <div className="space-y-4 md:col-span-2">
            <h3 className="text-lg font-medium">Additional Information</h3>

            <FormField
              control={form.control}
              name="additionalInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information about the school..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "Updating..." : "Creating..."}
              </>
            ) : isEdit ? (
              "Update School"
            ) : (
              "Create School"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
