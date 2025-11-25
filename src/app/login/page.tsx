
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  initiateEmailSignIn,
  initiateEmailSignUp,
  useAuth,
  useUser,
} from '@/firebase';
import { Loader2, LogIn, Eye, EyeOff, User as UserIcon } from 'lucide-react';
import { useEffect } from 'react';
import { FirebaseError } from 'firebase/app';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

const formSchema = z.object({
  username: z.string().min(1, { message: 'Please enter a username.' }),
  password: z.string().min(1, { message: 'Please enter a password.' }),
});

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
        if (user.email === 'admin@drivewise.com') {
            router.push('/admin');
        } else {
            router.push('/dashboard');
        }
    }
  }, [user, isUserLoading, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const email = `${values.username}@drivewise.com`;
    const password = values.password;
  
    try {
      await initiateEmailSignIn(auth, email, password);
      // Successful sign-in will trigger the useEffect to redirect.
    } catch (error) {
      if (error instanceof FirebaseError && (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential')) {
        // User does not exist, try to create it if it's the special admin user.
        if (values.username === 'admin' && password === 'admin') {
          try {
            await initiateEmailSignUp(auth, email, password);
            // After successful sign-up, Firebase automatically signs the user in.
            // The onAuthStateChanged listener will pick it up and the useEffect will redirect.
            // No need to call signIn again.
          } catch (signupError: any) {
            if (signupError instanceof FirebaseError && signupError.code === 'auth/email-already-in-use') {
              // This can happen in a race condition. If so, just try to sign in again.
              try {
                await initiateEmailSignIn(auth, email, password);
              } catch (secondSignInError) {
                toast({
                  variant: 'destructive',
                  title: 'Login Failed',
                  description: 'The admin account exists but login failed. Please check the password.',
                });
              }
            } else {
              toast({
                variant: 'destructive',
                title: 'Admin Setup Failed',
                description: 'Could not create the default admin account.',
              });
            }
          }
        } else {
          // It's a regular user that doesn't exist.
          toast({
            variant: 'destructive',
            title: 'Authentication Failed',
            description: 'Invalid username or password.',
          });
        }
      } else if (error instanceof FirebaseError) {
        // Handle other Firebase errors
        switch (error.code) {
          case 'auth/wrong-password':
            toast({
              variant: 'destructive',
              title: 'Authentication Failed',
              description: 'Incorrect password. Please try again.',
            });
            break;
          case 'auth/too-many-requests':
            toast({
              variant: 'destructive',
              title: 'Too Many Attempts',
              description: 'Access to this account has been temporarily disabled. Please try again later.',
            });
            break;
          default:
            toast({
              variant: 'destructive',
              title: 'Authentication Failed',
              description: error.message || 'An unexpected error occurred.',
            });
            break;
        }
      } else {
        // Handle non-Firebase errors
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'An unexpected error occurred. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4">
      <Image
        src="https://images.unsplash.com/photo-1691371107034-e28ee43a669e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxkcml2aW5nJTIwc2Nob29sfGVufDB8fHx8MTc2Mzk2NTkyN3ww&ixlib=rb-4.1.0&q=80&w=1080"
        alt="A person learning to drive a car."
        fill
        className="object-cover -z-10 brightness-50"
        data-ai-hint="driving school"
      />
      <Card className="w-full max-w-sm border-0 shadow-lg bg-transparent backdrop-blur-sm text-white">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Welcome Back!
          </CardTitle>
          <CardDescription className="text-white/80">
            Login to access your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                        <Input
                            placeholder="Enter your username"
                            {...field}
                            className="bg-white/20 border-white/30 placeholder:text-white/60 pl-10"
                        />
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
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...field}
                          className="bg-white/20 border-white/30 placeholder:text-white/60 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5 text-white/70" />
                          ) : (
                            <Eye className="h-5 w-5 text-white/70" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary/80 hover:bg-primary text-white" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn />
                )}
                Login
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
