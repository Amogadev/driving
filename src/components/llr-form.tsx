
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useUser } from "@/firebase";
import { cn } from "@/lib/utils";
import { format, addDays, startOfDay, endOfDay } from "date-fns";

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
  FileText,
  Loader2,
  CheckCircle,
  Home,
  Signpost,
  Building,
  Landmark,
  Globe,
  Car,
  Droplets,
  Users,
  CreditCard,
  CircleDollarSign,
  Mail,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { collection, addDoc, serverTimestamp, getDocs, query, where, Timestamp } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";


const formSchema = z.object({
  username: z.string().optional(),
  fatherName: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
  gender: z.enum(["male", "female"]).optional(),
  dob: z.date().optional(),
  bloodGroup: z.string().optional(),
  phone: z.string().optional(),
  doorNo: z.string().optional(),
  streetName: z.string().optional(),
  villageOrTown: z.string().optional(),
  taluk: z.string().optional(),
  district: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/, { message: "Pincode must be 6 digits." }).optional().or(z.literal('')),
  classOfVehicle: z.enum(["MCWOG", "LMV", "MCWOG + LMV"]).optional(),
  photo: z.any().optional(),
  signature: z.any().optional(),
  totalFee: z.number().positive({ message: "Fee must be a positive number." }).optional(),
  paidAmount: z.number().nonnegative({ message: "Paid amount cannot be negative." }).optional(),
  paymentStatus: z.enum(["Paid", "Unpaid"]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function LLRForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState("");
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      fatherName: "",
      email: "",
      bloodGroup: "",
      phone: "",
      doorNo: "",
      streetName: "",
      villageOrTown: "",
      taluk: "",
      district: "",
      pincode: "",
      totalFee: 500,
      paidAmount: 0,
      paymentStatus: "Unpaid",
    },
  });
  
  const photoFileRef = form.register("photo");
  const signatureFileRef = form.register("signature");

  async function onSubmit(values: FormValues) {
    if (!user || !firestore) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to submit an application.",
      });
      return;
    }
    
    setLoading(true);
    
    const applicationsCollection = collection(firestore, 'llr_applications');
    
    // Get the start and end of the current day
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // Query for applications submitted today
    const q = query(
      applicationsCollection,
      where('submittedAt', '>=', Timestamp.fromDate(todayStart)),
      where('submittedAt', '<=', Timestamp.fromDate(todayEnd))
    );
    const todaysSnapshot = await getDocs(q);
    const todaysCount = todaysSnapshot.size;

    const newIdNumber = todaysCount + 1;
    const newApplicationId = `DW-LLR-${String(newIdNumber).padStart(3, '0')}`;
    
    const photoFile = values.photo && values.photo.length > 0 ? values.photo[0] : null;
    const signatureFile = values.signature && values.signature.length > 0 ? values.signature[0] : null;
    
    const submittedAtDate = new Date();
    const paymentDueDate = addDays(submittedAtDate, 15);

    const applicationData = {
      applicationId: newApplicationId,
      applicantId: user.uid, // Use the UID of the currently logged-in user
      fullName: values.username,
      fatherName: values.fatherName,
      gender: values.gender,
      dob: values.dob ? format(values.dob, "yyyy-MM-dd") : null,
      bloodGroup: values.bloodGroup,
      phone: values.phone,
      email: values.email,
      address: {
          doorNo: values.doorNo,
          streetName: values.streetName,
          villageOrTown: values.villageOrTown,
          taluk: values.taluk,
          district: values.district,
          pincode: values.pincode,
      },
      classOfVehicle: values.classOfVehicle,
      photo: photoFile ? {
        name: photoFile.name,
        size: photoFile.size,
        type: photoFile.type,
      } : null,
      signature: signatureFile ? {
          name: signatureFile.name,
          size: signatureFile.size,
          type: signatureFile.type,
      } : null,
      totalFee: values.totalFee,
      paidAmount: values.paidAmount,
      paymentStatus: values.paymentStatus || 'Unpaid',
      status: "Submitted",
      submittedAt: serverTimestamp(),
      paymentDueDate: format(paymentDueDate, "yyyy-MM-dd"),
    };

    addDoc(applicationsCollection, applicationData)
      .then(() => {
        setApplicationId(newApplicationId);
        setSubmitted(true);
        setLoading(false);
      })
      .catch((e: any) => {
        const contextualError = new FirestorePermissionError({
            path: applicationsCollection.path,
            operation: 'create',
            requestResourceData: applicationData
        });
        errorEmitter.emit('permission-error', contextualError);
        setLoading(false);
      });
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-2xl mx-auto animate-in fade-in-50 border-none shadow-none">
        <CardHeader className="items-center text-center p-8">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <CardTitle className="text-2xl">Application Submitted!</CardTitle>
          <CardDescription>Thank you for choosing DriveWise Academy.</CardDescription>
        </CardHeader>
        <CardContent className="text-center p-8 pt-0">
          <p className="text-lg">Your Application ID is:</p>
          <p className="text-2xl font-bold text-primary my-2 tracking-wider">{applicationId}</p>
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
    <Card className="w-full mx-auto shadow-none border-none">
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
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Applicant Name</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="J. Antony Andrews" {...field} className="pl-10"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="fatherName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Father's Name</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="K.S. Jeyaraj" {...field} className="pl-10"/>
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
                                <FormLabel>Contact Email</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input type="email" placeholder="user@example.com" {...field} className="pl-10"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="gender"
                            render={({ field }) => (
                                <FormItem className="space-y-3 pt-2">
                                <FormLabel>Gender</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex items-center space-x-4"
                                    >
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="male" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Male</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="female" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Female</FormLabel>
                                    </FormItem>
                                    </RadioGroup>
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
                                        captionLayout="dropdown-buttons"
                                        fromYear={1900}
                                        toYear={2030}
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        defaultMonth={field.value || new Date(2000, 0)}
                                        disabled={(date) =>
                                            date > new Date("2030-12-31") || date < new Date("1900-01-01")
                                        }
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="bloodGroup"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Blood Group</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="A+" {...field} className="pl-10"/>
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
                                <FormLabel>Mobile No</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="9952840563" {...field} className="pl-10"/>
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
                        <CardTitle className="text-xl">Address Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="doorNo"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Door No</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="3/518" {...field} className="pl-10"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="streetName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Street Name</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Signpost className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="Mair Road" {...field} className="pl-10"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="villageOrTown"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Village / Town</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="Micheal Palayam" {...field} className="pl-10"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="taluk"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Taluk</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="Nilakkottai" {...field} className="pl-10"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="district"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>District</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="Dindigul" {...field} className="pl-10"/>
                                    </div>
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
                                <FormLabel>Pin Code</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="624215" {...field} className="pl-10"/>
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
                        <CardTitle className="text-xl">Document & Vehicle Details</CardTitle>
                        <CardDescription>Provide your identification documents and vehicle class.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="classOfVehicle"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Class of Vehicle</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex flex-col space-y-1"
                                    >
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="MCWOG" />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                        Motor Cycle Without Gear (MCWOG)
                                        </FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="LMV" />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                        Light Motor Vehicle (LMV)
                                        </FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="MCWOG + LMV" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Both</FormLabel>
                                    </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div />
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

                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-xl">Payment Details</CardTitle>
                        <CardDescription>Confirm your payment for the application.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FormField
                            control={form.control}
                            name="totalFee"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Total Fee</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <CircleDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            type="number" 
                                            {...field} 
                                            className="pl-10 font-bold" 
                                            onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                            value={field.value ?? ''}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="paidAmount"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Paid Amount</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <CircleDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            type="number" 
                                            {...field} 
                                            className="pl-10 font-bold" 
                                            onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                            value={field.value ?? ''}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="paymentStatus"
                            render={({ field }) => (
                                <FormItem className="space-y-3 pt-2">
                                <FormLabel>Payment Status</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex items-center space-x-4"
                                    >
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="Paid" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Paid</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="Unpaid" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Unpaid</FormLabel>
                                    </FormItem>
                                    </RadioGroup>
                                </FormControl>
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

    

    

    

    