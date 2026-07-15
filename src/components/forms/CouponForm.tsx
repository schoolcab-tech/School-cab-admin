import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Loader2, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CreateCouponInput, Coupon, CouponApplicableMonths, CouponDiscountType } from '@/types/coupon';

const applicableMonthsOptions = [
  { value: 1, label: '1 Month' },
  { value: 3, label: '3 Months (Quarterly)' },
  { value: 6, label: '6 Months (Semi-Annual)' },
  { value: 12, label: '12 Months (Annual)' },
];

const discountTypeOptions = [
  { value: 'percentage', label: 'Percentage Discount (%)' },
  { value: 'fixed_amount', label: 'Fixed Amount (₹)' },
];

const formSchema = z.object({
  code: z.string()
    .min(3, { message: 'Coupon code must be at least 3 characters' })
    .max(20, { message: 'Coupon code must not exceed 20 characters' })
    .regex(/^[A-Za-z0-9_-]+$/, { message: 'Coupon code can only contain letters, numbers, hyphens, and underscores' })
    .transform(val => val.toUpperCase()),
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  description: z.string().optional(),
  applicable_months: z.number().refine(val => [1, 3, 6, 12].includes(val), {
    message: 'Applicable months must be 1, 3, 6, or 12'
  }),
  discount_type: z.enum(['percentage', 'fixed_amount']),
  discount_value: z.number().min(0.01, { message: 'Discount value must be greater than 0' }),
  max_uses: z.number().optional().nullable(),
  valid_from: z.date().optional(),
  valid_until: z.date().optional(),
  is_active: z.boolean().default(true),
}).refine((data) => {
  // Validate discount value based on type
  if (data.discount_type === 'percentage' && data.discount_value > 100) {
    return false;
  }
  return true;
}, {
  message: 'Percentage discount cannot exceed 100%',
  path: ['discount_value']
}).refine((data) => {
  // Validate date range
  if (data.valid_from && data.valid_until && data.valid_from >= data.valid_until) {
    return false;
  }
  return true;
}, {
  message: 'Valid until date must be after valid from date',
  path: ['valid_until']
});

type CouponFormValues = z.infer<typeof formSchema>;

interface CouponFormProps {
  initialData?: Coupon;
  isEdit?: boolean;
  onSubmit: (data: CreateCouponInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function CouponForm({ initialData, isEdit = false, onSubmit, onCancel, isLoading = false }: CouponFormProps) {
  const { toast } = useToast();
  
  const form = useForm<CouponFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: initialData?.code || '',
      name: initialData?.name || '',
      description: initialData?.description || '',
      applicable_months: initialData?.applicable_months || 1,
      discount_type: initialData?.discount_type as CouponDiscountType || 'percentage',
      discount_value: initialData?.discount_value || 0,
      max_uses: initialData?.max_uses || undefined,
      valid_from: initialData?.valid_from ? new Date(initialData.valid_from) : undefined,
      valid_until: initialData?.valid_until ? new Date(initialData.valid_until) : undefined,
      is_active: initialData?.is_active ?? true,
    },
  });

  const handleSubmit = async (values: CouponFormValues) => {
    try {
      const submitData: CreateCouponInput = {
        ...values,
        applicable_months: values.applicable_months as CouponApplicableMonths,
        valid_from: values.valid_from ? format(values.valid_from, 'yyyy-MM-dd') : undefined,
        valid_until: values.valid_until ? format(values.valid_until, 'yyyy-MM-dd') : undefined,
        max_uses: values.max_uses || undefined,
      };

      await onSubmit(submitData);
      
      toast({
        title: "Success",
        description: `Coupon ${isEdit ? 'updated' : 'created'} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${isEdit ? 'update' : 'create'} coupon`,
        variant: "destructive",
      });
    }
  };

  const watchDiscountType = form.watch('discount_type');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Coupon' : 'Create New Coupon'}</CardTitle>
        <CardDescription>
          {isEdit ? 'Update coupon details and settings' : 'Set up a new discount coupon for the platform'}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Code *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="SAVE20" 
                          {...field}
                          disabled={isEdit}
                          className="font-mono uppercase"
                        />
                      </FormControl>
                      <FormDescription>
                        {isEdit ? 'Coupon code cannot be changed' : '3-20 characters, letters, numbers, hyphens, underscores only'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="20% Off Summer Special" {...field} />
                      </FormControl>
                      <FormDescription>
                        User-friendly name for the coupon
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Optional description of the coupon and its terms"
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Discount Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Discount Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="applicable_months"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Applicable Subscription Period *</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select subscription period" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {applicableMonthsOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Coupon will only work for this subscription duration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discount_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select discount type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {discountTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="discount_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Discount Value * {watchDiscountType === 'percentage' ? '(%)' : '(₹)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={watchDiscountType === 'percentage' ? "100" : undefined}
                          placeholder={watchDiscountType === 'percentage' ? '25.00' : '500'}
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {watchDiscountType === 'percentage' 
                          ? 'Percentage discount (0.01 - 100.00)'
                          : 'Fixed amount discount in rupees'
                        }
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_uses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Uses</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Leave empty for unlimited"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === '' ? null : parseInt(value) || null);
                          }}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Limit total number of uses (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Validity Period */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Validity Period</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="valid_from"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Valid From</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Leave empty to start immediately
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valid_until"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Valid Until</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => {
                              const validFrom = form.getValues('valid_from');
                              return validFrom ? date <= validFrom : date < new Date();
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Leave empty for no expiry date
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Status</h3>
              
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        Enable or disable this coupon. Inactive coupons cannot be used.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
              
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEdit ? 'Update Coupon' : 'Create Coupon'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}