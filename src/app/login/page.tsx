
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
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import { useEffect } from 'react';
import { FirebaseError } from 'firebase/app';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
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
      email: 'abc@gmail.com',
      password: 'abc123',
    },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      if (user.email === 'admin@gmail.com') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, isUserLoading, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      await initiateEmailSignIn(auth, values.email, values.password);
      // The onAuthStateChanged listener in useUser will handle the redirect.
    } catch (error) {
      if (error instanceof FirebaseError) {
        // Special user creation logic
        const isSpecialUser = values.email === 'abc@gmail.com' || values.email === 'admin@gmail.com';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          if (isSpecialUser) {
            try {
              await initiateEmailSignUp(auth, values.email, values.password);
              // After sign up, the onAuthStateChanged listener will pick up the new user and redirect.
            } catch (signupError: any) {
              // If the user already exists (race condition), just sign them in.
              if (signupError instanceof FirebaseError && signupError.code === 'auth/email-already-in-use') {
                try {
                  await initiateEmailSignIn(auth, values.email, values.password);
                } catch (secondSignInError) {
                   toast({
                      variant: 'destructive',
                      title: 'Login Failed',
                      description: 'Please check your credentials and try again.',
                   });
                }
              } else {
                toast({
                  variant: 'destructive',
                  title: 'Setup Failed',
                  description: 'Could not create the default user account.',
                });
              }
            }
          } else {
            toast({
              variant: 'destructive',
              title: 'Authentication Failed',
              description: 'Invalid credentials. Please try again.',
            });
          }
        } else {
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
                description: 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.',
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        {...field}
                        className="bg-white/20 border-white/30 placeholder:text-white/60"
                      />
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

    