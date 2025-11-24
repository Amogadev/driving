import { Car } from "lucide-react";
import { LLRForm } from "@/components/llr-form";

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center bg-primary text-primary-foreground p-4 rounded-full mb-4 shadow-lg">
          <Car className="h-10 w-10" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary tracking-tight">
          DriveWise Academy
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-lg text-muted-foreground">
          Your journey to safe driving starts here.
        </p>
      </div>
      <LLRForm />
    </main>
  );
}
