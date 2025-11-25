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
  useAuth,
  useUser,
} from '@/firebase';
import { Loader2, LogIn } from 'lucide-react';
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: 'abc@gmail.com',
      password: 'abc@123',
    },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      await initiateEmailSignIn(auth, values.email, values.password);
      // The useEffect will handle the redirect on successful login
    } catch (error: any) {
        let description = 'An unexpected error occurred. Please try again.';
        if (error instanceof FirebaseError) {
            switch (error.code) {
                case 'auth/invalid-credential':
                    description = 'Invalid credentials. Please check your email and password.';
                    break;
                case 'auth/user-not-found':
                    description = 'No account found with this email.';
                    break;
                case 'auth/wrong-password':
                    description = 'Incorrect password. Please try again.';
                    break;
                case 'auth/invalid-email':
                    description = 'The email address is not valid.';
                    break;
                default:
                    description = 'Please check your credentials and try again.';
                    break;
            }
        }
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description,
      });
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
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        className="bg-white/20 border-white/30 placeholder:text-white/60"
                      />
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
