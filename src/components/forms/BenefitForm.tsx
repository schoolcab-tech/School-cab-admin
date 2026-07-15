import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { CreateBenefitData, UpdateBenefitData, Benefit, USER_TYPE_OPTIONS } from "@/types/benefit";
import { benefitService } from "@/services/benefitService";
import { toast } from "sonner";

const benefitSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  description: z.string().min(1, "Description is required").max(500, "Description is too long"),
  icon_name: z.string().default("none"),
  user_type: z.enum(['student', 'driver', 'both']),
  is_active: z.boolean().default(true),
  display_order: z.number().min(0).default(0),
});

type BenefitFormData = z.infer<typeof benefitSchema>;

interface BenefitFormProps {
  benefit?: Benefit;
  onSubmit: (data: CreateBenefitData | UpdateBenefitData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// Common icon options for React Native apps
const ICON_OPTIONS = [
  { value: "star", label: "Star" },
  { value: "heart", label: "Heart" },
  { value: "shield", label: "Shield" },
  { value: "check-circle", label: "Check Circle" },
  { value: "gift", label: "Gift" },
  { value: "award", label: "Award" },
  { value: "thumbs-up", label: "Thumbs Up" },
  { value: "lightning-bolt", label: "Lightning Bolt" },
  { value: "diamond", label: "Diamond" },
  { value: "crown", label: "Crown" },
  { value: "medal", label: "Medal" },
  { value: "trophy", label: "Trophy" },
];

export function BenefitForm({ benefit, onSubmit, onCancel, isLoading }: BenefitFormProps) {
  // const [imageFile, setImageFile] = useState<File | null>(null);
  // const [imagePreview, setImagePreview] = useState<string | null>(benefit?.image_url || null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<BenefitFormData>({
    resolver: zodResolver(benefitSchema),
    defaultValues: {
      title: benefit?.title || "",
      description: benefit?.description || "",
      icon_name: benefit?.icon_name || "none",
      user_type: benefit?.user_type || "both",
      is_active: benefit?.is_active ?? true,
      display_order: benefit?.display_order || 0,
    },
  });

  // const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   if (file) {
  //     if (file.size > 5 * 1024 * 1024) { // 5MB limit
  //       toast.error("Image size should be less than 5MB");
  //       return;
  //     }

  //     if (!file.type.startsWith("image/")) {
  //       toast.error("Please select a valid image file");
  //       return;
  //     }

  //     setImageFile(file);
      
  //     // Create preview
  //     const reader = new FileReader();
  //     reader.onload = (e) => {
  //       setImagePreview(e.target?.result as string);
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // };

  // const removeImage = () => {
  //   setImageFile(null);
  //   setImagePreview(null);
  // };

  const handleSubmit = async (data: BenefitFormData) => {
    try {
      setIsUploading(true);
      // let imageUrl = benefit?.image_url;

      // // Upload new image if selected
      // if (imageFile) {
      //   imageUrl = await benefitService.uploadImage(imageFile, benefit?.id);
      // }

      // // Remove old image if it was replaced
      // if (benefit?.image_url && imageFile && benefit.image_url !== imageUrl) {
      //   await benefitService.deleteImage(benefit.image_url);
      // }

      const submitData = {
        ...data,
        // image_url: imageUrl,
        icon_name: data.icon_name === "none" ? undefined : data.icon_name,
        ...(benefit && { id: benefit.id }),
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to save benefit");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{benefit ? "Edit Benefit" : "Add New Benefit"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter benefit title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter benefit description" 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image Upload Section - Temporarily Disabled */}
            {/* <div className="space-y-4">
              <Label>Image</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="mt-4">
                      <Label htmlFor="image-upload" className="cursor-pointer">
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                          <Upload className="h-4 w-4" />
                          Upload Image
                        </div>
                      </Label>
                      <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </div>
                )}
              </div>
            </div> */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="icon_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Icon</SelectItem>
                        {ICON_OPTIONS.map((icon) => (
                          <SelectItem key={icon.value} value={icon.value}>
                            {icon.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose a predefined icon for your benefit
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="user_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Users</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select target users" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {USER_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{option.label}</span>
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Who will see this benefit in the mobile app
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="text-sm font-medium">
                        Active Status
                      </FormLabel>
                      <div className="flex items-center gap-2">
                        <Badge variant={field.value ? "success" : "secondary"}>
                          {field.value ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="display_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        className="w-24"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                type="submit" 
                disabled={isLoading || isUploading}
                className="flex-1"
              >
                {isLoading || isUploading ? "Saving..." : benefit ? "Update Benefit" : "Create Benefit"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}