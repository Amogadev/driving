
import { Car, FilePlus } from "lucide-react";
import { LLRForm } from "@/components/llr-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

      <div className="flex justify-center">
        <Dialog>
          <DialogTrigger asChild>
            <Card className="w-full max-w-sm cursor-pointer hover:shadow-lg transition-shadow hover:border-primary/50">
              <CardHeader className="items-center text-center">
                <div className="p-3 bg-primary/10 rounded-full">
                  <FilePlus className="h-8 w-8 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="text-center">
                <CardTitle>New LLR Application</CardTitle>
                <CardDescription className="mt-2">
                  Click here to start your application for a new Learner's License.
                </CardDescription>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <LLRForm />
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
