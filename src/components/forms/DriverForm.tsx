import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '../../components/ui/multi-select';
import { useCreateDriver, useUpdateDriver, useDriver } from '../../hooks/useDrivers';
import { useServiceAreas } from '../../hooks/useServiceAreas';
import { formatPhoneNumber } from '@/lib/utils';
import { Loader2, ArrowLeft, Save } from 'lucide-react';

const vehicleTypes = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'van', label: 'Van' },
  { value: 'minibus', label: 'Minibus' },
];

const relationshipTypes = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'friend', label: 'Friend' },
  { value: 'other', label: 'Other' },
];

const formSchema = z.object({
  // Personal Information
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Invalid email address' }),
  phone: z.string().min(10, { message: 'Phone number must be at least 10 digits' }),
  dateOfBirth: z.string().min(1, { message: 'Date of birth is required' }),
  
  // Vehicle Information
  vehicleType: z.string().min(1, { message: 'Vehicle type is required' }),
  cabNumber: z.string().min(1, { message: 'Cab number is required' }),
  licenseNumber: z.string().min(1, { message: 'License number is required' }),
  licenseExpiry: z.string().min(1, { message: 'License expiry date is required' }),
  vehicleYear: z.string().min(4, { message: 'Valid year is required' }),
  vehicleColor: z.string().min(1, { message: 'Vehicle color is required' }),
  cabCapacity: z.number().min(1, { message: 'Cab capacity must be at least 1' }),
  
  // Address
  address: z.object({
    street: z.string().min(1, { message: 'Street address is required' }),
    city: z.string().min(1, { message: 'City is required' }),
    state: z.string().min(1, { message: 'State is required' }),
    postalCode: z.string().min(1, { message: 'Postal code is required' }),
    country: z.string().min(1, { message: 'Country is required' }),
  }),
  
  // Service Areas
  serviceAreas: z.array(z.string()).min(1, { message: 'At least one service area is required' }),
  
  // Emergency Contact
  emergencyContact: z.object({
    name: z.string().min(1, { message: 'Emergency contact name is required' }),
    relationship: z.string().min(1, { message: 'Relationship is required' }),
    phone: z.string().min(10, { message: 'Phone number must be at least 10 digits' }),
  }),
  
  // Additional Information
  additionalInfo: z.string().optional(),
  
  // Status
  status: z.enum(['active', 'suspended']).default('active'),
});

type DriverFormValues = z.infer<typeof formSchema>;

interface DriverFormProps {
  isEdit?: boolean;
}

export function DriverForm({ isEdit = false }: DriverFormProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { data: serviceAreas = [], isLoading: isLoadingServiceAreas } = useServiceAreas();
  const { data: existingDriver, isLoading: isLoadingDriver } = useDriver(id || '');
  
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  
  const form = useForm<DriverFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      vehicleType: '',
      cabNumber: '',
      licenseNumber: '',
      licenseExpiry: '',
      vehicleYear: '',
      vehicleColor: '',
      cabCapacity: 4,
      address: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      },
      serviceAreas: [],
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
      },
      additionalInfo: '',
      status: 'active',
    },
  });
  
  // Set form values when in edit mode and data is loaded
  React.useEffect(() => {
    if (isEdit && existingDriver) {
      const { 
        name, 
        email, 
        phone, 
        dateOfBirth, 
        vehicle, 
        address, 
        serviceAreas: areas, 
        emergencyContact, 
        additionalInfo, 
        status 
      } = existingDriver;
      
      form.reset({
        name,
        email,
        phone,
        dateOfBirth,
        vehicleType: vehicle?.vehicleType || '',
        cabNumber: vehicle?.cabNumber || '',
        licenseNumber: vehicle?.licenseNumber || '',
        licenseExpiry: vehicle?.licenseExpiry || '',
        vehicleYear: vehicle?.year?.toString() || '',
        vehicleColor: vehicle?.color || '',
        cabCapacity: vehicle?.cabCapacity || 4,
        address: {
          street: address?.street || '',
          city: address?.city || '',
          state: address?.state || '',
          postalCode: address?.postalCode || '',
          country: address?.country || '',
        },
        serviceAreas: areas || [],
        emergencyContact: emergencyContact || {
          name: '',
          relationship: '',
          phone: '',
        },
        additionalInfo: additionalInfo || '',
        status: status || 'active',
      });
    }
  }, [isEdit, existingDriver, form]);
  
  const onSubmit = async (data: DriverFormValues) => {
    try {
      const driverData = {
        ...data,
        vehicle: {
          vehicleType: data.vehicleType,
          cabNumber: data.cabNumber,
          licenseNumber: data.licenseNumber,
          licenseExpiry: data.licenseExpiry,
          year: parseInt(data.vehicleYear),
          color: data.vehicleColor,
          cabCapacity: data.cabCapacity,
        },
      };
      
      if (isEdit && id) {
        await updateDriver.mutateAsync({ id, ...driverData });
        toast({
          title: 'Success',
          description: 'Driver updated successfully',
        });
      } else {
        await createDriver.mutateAsync(driverData);
        toast({
          title: 'Success',
          description: 'Driver created successfully',
        });
        form.reset();
      }
      
      navigate('/drivers');
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  };
  
  const isLoading = createDriver.isLoading || updateDriver.isLoading || isLoadingServiceAreas || isLoadingDriver;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isEdit ? 'Edit Driver' : 'Add New Driver'}
          </h2>
          <p className="text-muted-foreground">
            {isEdit 
              ? 'Update driver information and settings' 
              : 'Add a new driver to the system'}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Driver's personal details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
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
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(123) 456-7890" 
                          {...field} 
                          onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value);
                            field.onChange(formatted);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Information</CardTitle>
              <CardDescription>Details about the driver's vehicle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vehicleType"
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
                          {vehicleTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cabNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cab Number</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC 1234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="licenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver's License Number</FormLabel>
                      <FormControl>
                        <Input placeholder="DL1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="licenseExpiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Expiry Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vehicleYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Year</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1900" 
                          max={new Date().getFullYear() + 1}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vehicleColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Color</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Red, Blue, Black" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cabCapacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passenger Capacity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="20"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
              <CardDescription>Driver's residential address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address.street"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="New York" {...field} />
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
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input placeholder="New York" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="10001" {...field} />
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
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="United States" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Service Areas</CardTitle>
              <CardDescription>Areas where this driver will operate</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="serviceAreas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Service Areas</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={serviceAreas.map(area => ({
                          value: area.id,
                          label: `${area.name} (${area.pincode})`,
                        }))}
                        selected={field.value}
                        onChange={field.onChange}
                        placeholder="Select service areas..."
                      />
                    </FormControl>
                    <FormDescription>
                      Select all areas where this driver will be available for service
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>Person to contact in case of emergency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="emergencyContact.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContact.relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {relationshipTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContact.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(123) 456-7890" 
                          {...field} 
                          onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value);
                            field.onChange(formatted);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>Any other relevant information about the driver</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="additionalInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional information about the driver..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {isEdit && (
                <div className="mt-6 pt-6 border-t">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Driver Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Set the driver's active status in the system
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="flex items-center justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate(-1)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEdit ? 'Update Driver' : 'Create Driver'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
