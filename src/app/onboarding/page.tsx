"use client";

import { useFormState } from "react-dom";
import { createBusiness, type OnboardingState } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";

const initial: OnboardingState = {};

export default function OnboardingPage() {
  const [state, formAction] = useFormState(createBusiness, initial);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Set up your business</CardTitle>
            <CardDescription>
              Just a few details to get started. You can change these later in Settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Business name</Label>
                <Input id="name" name="name" placeholder="e.g. Prishtina Rent a Car" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" name="phone" placeholder="+383 4X XXX XXX" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="currency">Currency</Label>
                  <Select id="currency" name="currency" defaultValue="EUR">
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CHF">CHF</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select id="timezone" name="timezone" defaultValue="Europe/Tirane">
                    <option value="Europe/Tirane">Kosovo / Albania (Tirana)</option>
                    <option value="Europe/Zurich">Switzerland</option>
                    <option value="Europe/Berlin">Germany</option>
                    <option value="UTC">UTC</option>
                  </Select>
                </div>
              </div>
              {state.error && (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
              )}
              <SubmitButton className="w-full">Continue</SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
