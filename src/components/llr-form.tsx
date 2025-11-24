"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarIcon,
  User,
  MapPin,
  Phone,
  Mail,
  FileText,
  Loader2,
  CheckCircle,
} from "lucide-react";

const formSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  dob: z.date({ required_error: "A date of birth is required." }),
  address: z.string().min(10, { message: "Please enter a valid address." }),
  phone: z.string().regex(/^(?:\+91)?[6-9]\d{9}$/, { message: "Please enter a valid 10-digit Indian mobile number." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  aadhar: z.string().regex(/^\d{12}$/, { message: "Aadhar card must be 12 digits." }),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: "Invalid PAN card format." }).optional().or(z.literal('')),
  photo: z.any().refine((files) => files?.length === 1, "Passport photo is required."),
  signature: z.any().refine((files) => files?.length === 1, "Signature image is required."),
});

type FormValues = z.infer<typeof formSchema>;

export function LLRForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState("");
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      address: "",
      phone: "",
      email: "",
      aadhar: "",
      pan: "",
    },
  });

  const photoFileRef = form.register("photo");
  const signatureFileRef = form.register("signature");

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const newApplicationId = `DW-LLR-${Date.now()}`;
      const applicationData = {
        applicationId: newApplicationId,
        fullName: values.fullName,
        dob: format(values.dob, "yyyy-MM-dd"),
        address: values.address,
        phone: values.phone,
        email: values.email,
        aadhar: values.aadhar,
        pan: values.pan,
        photo: {
          name: values.photo[0].name,
          size: values.photo[0].size,
          type: values.photo[0].type,
        },
        signature: {
            name: values.signature[0].name,
            size: values.signature[0].size,
            type: values.signature[0].type,
        },
        status: "Submitted",
        submittedAt: new Date(),
      };

      await addDoc(collection(db, "LLR_Applications"), applicationData);
      
      setApplicationId(newApplicationId);
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting application: ", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Could not submit your application. Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-2xl mx-auto animate-in fade-in-50">
        <CardHeader className="items-center text-center p-8">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <CardTitle className="text-2xl">Application Submitted!</CardTitle>
          <CardDescription>Thank you for choosing DriveWise Academy.</CardDescription>
        </CardHeader>
        <CardContent className="text-center p-8 pt-0">
          <p className="text-lg">Your Application ID is:</p>
          <p className="text-2xl font-bold text-primary my-2 tracking-wider">{applicationId}</p>
          <p className="text-muted-foreground text-sm">You will receive updates via email and phone.</p>
          <Button onClick={() => {
              setSubmitted(false);
              setApplicationId("");
              form.reset();
            }} className="mt-8">
            Submit Another Application
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl border-2">
        <CardHeader>
            <CardTitle className="text-3xl font-headline">LLR Application Form</CardTitle>
            <CardDescription>Fill in the details below to register for your Learner's License.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-xl">Applicant Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="John Doe" {...field} className="pl-10"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="dob"
                            render={({ field }) => (
                                <FormItem className="flex flex-col pt-2">
                                <FormLabel>Date of Birth</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={"outline"}
                                        className={cn(
                                            "pl-3 text-left font-normal",
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
                                        disabled={(date) =>
                                        date > new Date(new Date().setFullYear(new Date().getFullYear() - 18)) || date < new Date("1920-01-01")
                                        }
                                        captionLayout="dropdown-buttons"
                                        fromYear={1920}
                                        toYear={new Date().getFullYear() - 18}
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                <FormLabel>Full Address</FormLabel>
                                <FormControl>
                                     <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="123, Main Street, Anytown, State, ZIP" {...field} className="pl-10"/>
                                    </div>
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
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="9876543210" {...field} className="pl-10"/>
                                    </div>
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
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="john.doe@example.com" {...field} className="pl-10"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-xl">LLR Document Details</CardTitle>
                        <CardDescription>Provide your identification documents. All documents are required.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="aadhar"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Aadhar Card Number</FormLabel>
                                <FormControl>
                                     <div className="relative">
                                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="XXXX XXXX XXXX" {...field} className="pl-10"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="pan"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>PAN Card Number (Optional)</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="ABCDE1234F" {...field} className="pl-10"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="photo"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Passport Size Photo</FormLabel>
                                <FormControl>
                                    <Input type="file" accept="image/png, image/jpeg" {...photoFileRef} />
                                </FormControl>
                                <FormDescription>Upload a clear, recent photo. (JPG, PNG)</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="signature"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Signature Image</FormLabel>
                                <FormControl>
                                    <Input type="file" accept="image/png, image/jpeg" {...signatureFileRef} />
                                </FormControl>
                                <FormDescription>Upload an image of your signature. (JPG, PNG)</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
                
                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={loading} size="lg">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            "Submit Application"
                        )}
                    </Button>
                </div>
                </form>
            </Form>
        </CardContent>
    </Card>
  );
}
