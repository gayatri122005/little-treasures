import PaymentResult from "@/components/checkout/PaymentResult";
import { Suspense } from "react";
export default function Page() { return <Suspense fallback={<main className="min-h-[70vh] bg-[var(--page)]" />}><PaymentResult mode="success" /></Suspense>; }
