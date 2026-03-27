import { NextResponse } from "next/server";
import { runConsultation } from "@/lib/orchestrator";
import type { PatientProfile } from "@/lib/types";

// In-memory store for demo (replace with Supabase in Phase 1.3)
const consultations = new Map<string, unknown>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question, profile } = body as {
      question: string;
      profile?: PatientProfile;
    };

    if (!question || question.trim().length < 10) {
      return NextResponse.json(
        { error: "Question must be at least 10 characters" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const patientProfile: PatientProfile = profile ?? {};

    // Run consultation (async — in production this would be a background job)
    const result = await runConsultation(id, question.trim(), patientProfile);
    consultations.set(id, result);

    return NextResponse.json({ id, status: result.status, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  // List recent consultations (for history page)
  const recent = Array.from(consultations.entries())
    .slice(-10)
    .map(([id, data]) => ({
      id,
      ...(data as Record<string, unknown>),
    }))
    .reverse();

  return NextResponse.json({ consultations: recent });
}
