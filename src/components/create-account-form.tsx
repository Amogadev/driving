
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useFirestore, initiateEmailSignUp, initiateEmailSignIn, useAuth } from "@/firebase";
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
      // First, try to sign in. This checks if the user already exists.
      await initiateEmailSignIn(auth, email, values.password);
      // If sign-in succeeds, the user already exists.
      toast({
        title: "User Already Exists",
        description: `An account with the username "${values.username}" already exists.`,
      });
      // We might want to sign them out again if we are in an admin flow
      await auth.signOut();
    } catch (signInError: any) {
      // If sign-in fails because the user is not found, we can proceed to create it.
      if (signInError instanceof FirebaseError && (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential')) {
        try {
          const userCredential = await initiateEmailSignUp(auth, email, values.password);
          const user = userCredential.user;
  
          const userRef = doc(firestore, 'users', user.uid);
          const userData = {
            id: user.uid,
            username: values.username,
            email: email,
            companyName: values.companyName,
          };
          
          await setDoc(userRef, userData, { merge: true });
          
          setSubmitted(true);
          toast({
            title: "Account Created",
            description: `User ${values.username} has been created successfully.`,
          });

          // After creating, sign them out of the current session so admin remains logged in
          if (auth.currentUser?.email !== 'admin@drivewise.com') {
             await auth.signOut();
             // You may need to re-authenticate the admin here if this action signs them out.
             // This part of the logic depends on session management strategy.
             // For now, we assume the admin might need to log in again if their session is affected.
          }

        } catch (signUpError: any) {
          console.error("Error creating account: ", signUpError);
          let description = "Could not create the account. Please try again.";
          if (signUpError instanceof FirebaseError) {
            if (signUpError.code === 'auth/weak-password') {
              description = "The password is too weak. Please choose a stronger password.";
            }
          }
          toast({
            variant: "destructive",
            title: "Creation Failed",
            description: description,
          });
        }
      } else {
        // Another sign-in error occurred (e.g., wrong password for existing user)
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "An account with this username exists, but the password was incorrect.",
        });
      }
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
