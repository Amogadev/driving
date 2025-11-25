
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useFirestore, initiateEmailSignUp } from "@/firebase";
import { cn } from "@/lib/utils";

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
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Building,
  User,
  KeyRound,
  CheckCircle,
} from "lucide-react";
import { collection, doc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { FirebaseError } from 'firebase/app';


const formSchema = z.object({
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }),
  username: z.string().min(2, { message: "Username must be at least 2 characters." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateAccountForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Database Error",
        description: "Firestore is not available.",
      });
      return;
    }

    setLoading(true);
    const auth = getAuth();
    const email = `${values.username}@drivewise.com`;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, values.password);
        const user = userCredential.user;

        const userRef = doc(firestore, 'users', user.uid);
        const userData = {
            id: user.uid,
            username: values.username,
            email: email,
            companyName: values.companyName,
        };
        
        await setDoc(userRef, userData);
        
        setSubmitted(true);
        toast({
            title: "Account Created",
            description: `User ${values.username} has been created successfully.`,
        });

    } catch (error: any) {
        console.error("Error creating account: ", error);
        let description = "Could not create the account. Please try again.";
        if (error instanceof FirebaseError) {
            if (error.code === 'auth/email-already-in-use') {
                description = "This username is already taken. Please choose another one.";
            } else if (error.code === 'auth/weak-password') {
                description = "The password is too weak. Please choose a stronger password.";
            }
        }
        toast({
            variant: "destructive",
            title: "Creation Failed",
            description: description,
        });
    } finally {
        setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="w-full text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4 mx-auto" />
        <h3 className="text-xl font-bold">Account Created!</h3>
        <p className="text-muted-foreground mb-6">The new user account is ready.</p>
        <Button onClick={() => {
            setSubmitted(false);
            form.reset();
          }}>
          Create Another Account
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full pt-4">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="e.g., DriveWise Inc." {...field} className="pl-10"/>
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="e.g., new_user" {...field} className="pl-10"/>
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="password" placeholder="••••••••" {...field} className="pl-10"/>
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating Account...
                            </>
                        ) : (
                            "Create Account"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    </div>
  );
}
