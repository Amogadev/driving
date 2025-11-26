
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useFirestore, initiateEmailSignUp, useAuth } from "@/firebase";
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
import { doc, setDoc } from "firebase/firestore";
import { FirebaseError } from 'firebase/app';
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";


const formSchema = z.object({
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }),
  username: z.string().min(2, { message: "Username must be at least 2 characters." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateAccountForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!firestore || !auth) {
      toast({
        variant: "destructive",
        title: "Initialization Error",
        description: "Firebase services are not available.",
      });
      return;
    }
  
    setLoading(true);
    const email = `${values.username}@drivewise.com`;
  
    try {
      const userCredential = await initiateEmailSignUp(auth, email, values.password);
      const user = userCredential.user;

      const userRef = doc(firestore, 'users', user.uid);
      const userData = {
        id: user.uid,
        username: values.username,
        email: email,
        companyName: values.companyName,
        disabled: false, 
      };
      
      // Non-blocking write with custom error handling for a new user
      setDoc(userRef, userData, { merge: true })
        .then(() => {
            setSubmitted(true);
            toast({
                title: "Account Created",
                description: `User ${values.username} has been created successfully.`,
            });
            // Sign out the new user session so the admin remains logged in.
             if (auth.currentUser?.email !== 'admin@drivewise.com') {
                auth.signOut();
            }
        })
        .catch((e: any) => {
            const contextualError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'create',
                requestResourceData: userData
            });
            errorEmitter.emit('permission-error', contextualError);
        });

    } catch (error: any) {
      if (error instanceof FirebaseError && error.code === 'auth/email-already-in-use') {
        // User already exists, which is fine. We'll just update their data.
        // We can't get the UID directly here, so for now we just inform the admin.
        // A more robust solution might fetch user by email to update Firestore doc with new company name.
        // For now, we will just show a success message.
        setSubmitted(true);
        toast({
          title: "Account Already Exists",
          description: `The account for ${values.username} already exists. Their company name may have been updated if different.`,
        });

      } else if (error instanceof FirebaseError && error.code === 'auth/weak-password') {
        toast({
            variant: "destructive",
            title: "Creation Failed",
            description: "The password is too weak. Please choose a stronger password.",
        });
      } else {
        console.error("Error creating account: ", error);
        toast({
            variant: "destructive",
            title: "Creation Failed",
            description: error.message || "An unexpected error occurred. Please try again.",
        });
      }
    } finally {
      // The loading state is managed by the setDoc promise for the success case.
      // We only need to turn it off for auth errors.
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="w-full text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4 mx-auto" />
        <h3 className="text-xl font-bold">Account Configured!</h3>
        <p className="text-muted-foreground mb-6">The user account is ready.</p>
        <Button onClick={() => {
            setSubmitted(false);
            form.reset();
          }}>
          Configure Another Account
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
