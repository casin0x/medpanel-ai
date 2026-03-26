# Emergency and Safety Detection System -- Production Specification

## Architecture Overview

The safety system operates as a **pre-processing layer** that evaluates every user input BEFORE it reaches any specialist agent. It runs in parallel with the specialist routing and can override any agent response.

```
User Input
    |
    v
[Safety Detection Layer] -----> [EMERGENCY] --> Immediate escalation response
    |                    -----> [URGENT]    --> Flagged response + care redirect
    |                    -----> [CAUTION]   --> Agent responds with safety wrapper
    v
[Specialist Agent]
```

---

## Detection Approach: Hybrid Three-Stage Pipeline

### Stage 1: Pattern Matching (Fast, Deterministic)
Regex and keyword patterns catch obvious emergency signals. This runs in < 10ms and catches the highest-severity cases with near-zero latency.

### Stage 2: LLM Classification (Nuanced, Contextual)
The specialist LLM itself is instructed to perform safety classification as part of its reasoning chain. This catches contextual emergencies that keyword matching would miss.

### Stage 3: Context-Aware Filtering (Reduces False Positives)
A post-classification check that evaluates whether the flagged content is:
- Present-tense / active concern vs. historical / past medical history
- First-person experience vs. third-person discussion
- Hypothetical vs. actual

---

## Red Flag Symptom Patterns

### SEVERITY: EMERGENCY (Score 100) -- Stop Everything, Redirect to 911/ER

These patterns trigger an immediate response that overrides all agent behavior.

```json
{
  "emergency_patterns": [
    {
      "category": "cardiac_emergency",
      "patterns": [
        "chest pain right now",
        "having chest pain",
        "chest pressure won't go away",
        "crushing chest pain",
        "can't breathe and chest hurts",
        "arm is going numb.*chest",
        "heart attack",
        "think I'm having a heart attack"
      ],
      "temporal_requirement": "present_tense_or_acute",
      "regex": "(?i)(having|right now|currently|won't stop|can't breathe).{0,40}(chest pain|chest pressure|heart attack)"
    },
    {
      "category": "stroke_symptoms",
      "patterns": [
        "face is drooping",
        "can't move my arm",
        "sudden numbness.*face",
        "can't speak properly",
        "sudden severe headache",
        "sudden vision loss",
        "worst headache of my life"
      ],
      "temporal_requirement": "present_tense_or_acute",
      "regex": "(?i)(sudden|just started|can't).{0,30}(numbness|speak|move|see|drooping|worst headache)"
    },
    {
      "category": "anaphylaxis",
      "patterns": [
        "throat is swelling",
        "can't swallow.*swelling",
        "tongue is swelling",
        "hives everywhere.*can't breathe",
        "allergic reaction.*breathing"
      ],
      "temporal_requirement": "present_tense_or_acute",
      "regex": "(?i)(throat|tongue).{0,20}(swelling|closing|tight).{0,30}(can't breathe|breathing)?"
    },
    {
      "category": "severe_bleeding",
      "patterns": [
        "can't stop the bleeding",
        "bleeding won't stop",
        "coughing up blood",
        "vomiting blood",
        "blood in stool.*dizzy"
      ],
      "temporal_requirement": "present_tense_or_acute",
      "regex": "(?i)(can't stop|won't stop).{0,20}bleed|(?i)(coughing|vomiting|throwing).{0,10}(up )?blood"
    },
    {
      "category": "suicidal_emergency",
      "patterns": [
        "going to kill myself",
        "want to die",
        "planning to end",
        "have a plan to",
        "about to hurt myself",
        "don't want to live",
        "going to end it",
        "no reason to live",
        "better off dead",
        "can't go on anymore",
        "I'm going to do it",
        "goodbye everyone",
        "writing my note",
        "saying goodbye"
      ],
      "temporal_requirement": "any",
      "regex": "(?i)(going to|want to|plan to|about to).{0,20}(kill myself|end it|die|hurt myself|end my life)|(?i)(no reason|don't want).{0,10}(to live|to be alive)|(?i)better off dead|(?i)writing.{0,10}(suicide|goodbye) note"
    },
    {
      "category": "overdose",
      "patterns": [
        "took too many pills",
        "took the whole bottle",
        "overdosed",
        "swallowed.*pills",
        "took all my medication"
      ],
      "temporal_requirement": "present_tense_or_recent",
      "regex": "(?i)(took|swallowed|ingested).{0,20}(too many|whole bottle|all my|overdos)"
    },
    {
      "category": "psychotic_emergency",
      "patterns": [
        "voices are telling me to hurt",
        "voices telling me to kill",
        "God is telling me to",
        "I need to hurt.*to save",
        "they're coming to get me and I need to"
      ],
      "temporal_requirement": "present_tense",
      "regex": "(?i)(voices?|god|devil).{0,20}(telling|commanding|ordering).{0,20}(hurt|kill|harm|destroy)"
    },
    {
      "category": "seizure_status",
      "patterns": [
        "having a seizure right now",
        "seizure won't stop",
        "continuous seizure",
        "been seizing for"
      ],
      "temporal_requirement": "present_tense",
      "regex": "(?i)(having|won't stop|continuous|been).{0,20}(seizur|convuls|seizing)"
    },
    {
      "category": "diabetic_emergency",
      "patterns": [
        "blood sugar.*too low.*can't",
        "blood sugar over 500",
        "blood sugar over 400.*vomiting",
        "glucose.*dangerously",
        "insulin.*too much.*shaking"
      ],
      "temporal_requirement": "present_tense_or_acute",
      "regex": "(?i)blood sugar.{0,20}(over [4-9]\\d{2}|too low|dangerously)|(?i)insulin.{0,20}too much.{0,20}(shaking|sweating|confused)"
    }
  ]
}
```

### SEVERITY: URGENT (Score 70-99) -- Agent Responds But With Strong Care Redirect

```json
{
  "urgent_patterns": [
    {
      "category": "possible_cardiac_event",
      "patterns": [
        "chest pain when I exert",
        "new chest tightness",
        "palpitations that won't stop",
        "heart racing for hours",
        "passed out today",
        "fainted and hit my head"
      ],
      "response": "urgent_care_redirect"
    },
    {
      "category": "possible_pe_dvt",
      "patterns": [
        "sudden shortness of breath",
        "calf swollen.*painful.*warm",
        "leg swelling one side",
        "chest pain when breathing in"
      ],
      "response": "urgent_care_redirect"
    },
    {
      "category": "mental_health_crisis",
      "patterns": [
        "self-harming",
        "cutting myself",
        "haven't eaten in.*days",
        "hearing voices",
        "seeing things that aren't there",
        "paranoid.*people are watching",
        "haven't slept in.*days",
        "thinking about hurting myself"
      ],
      "response": "mental_health_crisis_redirect"
    },
    {
      "category": "severe_symptoms",
      "patterns": [
        "fever over 103",
        "fever.*won't come down",
        "severe abdominal pain",
        "can't keep anything down.*days",
        "jaundice",
        "sudden vision changes",
        "sudden hearing loss",
        "worst pain of my life"
      ],
      "response": "urgent_care_redirect"
    },
    {
      "category": "medication_adverse_event",
      "patterns": [
        "started.*medication.*rash everywhere",
        "new medication.*can't breathe",
        "took.*medication.*swelling",
        "medication.*making me.*confused",
        "medication.*hallucinating"
      ],
      "response": "urgent_prescriber_contact"
    }
  ]
}
```

### SEVERITY: CAUTION (Score 30-69) -- Agent Responds Normally But With Safety Context

```json
{
  "caution_patterns": [
    {
      "category": "symptom_discussion",
      "patterns": [
        "blood pressure has been high",
        "heart rate has been elevated",
        "occasional chest discomfort",
        "sometimes feel dizzy",
        "shortness of breath with exercise",
        "swollen ankles"
      ],
      "response": "include_monitoring_reminder"
    },
    {
      "category": "medication_questions",
      "patterns": [
        "thinking about stopping my medication",
        "want to reduce my dose",
        "can I skip my medication",
        "replace my medication with supplements"
      ],
      "response": "strong_physician_redirect"
    },
    {
      "category": "mild_mental_health",
      "patterns": [
        "feeling down lately",
        "anxious about my health",
        "can't sleep because of worry",
        "stressed about my condition"
      ],
      "response": "include_mental_health_resources"
    }
  ]
}
```

---

## Escalation Responses

### Emergency Response (Severity 100)

```json
{
  "response_type": "emergency_escalation",
  "agent_behavior": "STOP_ALL_EXPLORATION",
  "response_template": {
    "cardiac_emergency": {
      "message": "I'm concerned about what you're describing. Chest pain or pressure, especially with breathing difficulty or arm numbness, needs immediate medical evaluation.\n\n**Call 911 (or your local emergency number) now.**\n\nWhile waiting:\n- Chew an aspirin (325mg) if you have one and are not allergic\n- Sit upright or in whatever position is most comfortable\n- Do not drive yourself to the hospital\n- Unlock your door so paramedics can enter\n\nThis is not something I can help explore -- you need hands-on emergency care right now.",
      "resources": ["911", "Local ER"],
      "follow_up": false
    },
    "stroke_symptoms": {
      "message": "What you're describing matches signs that need emergency evaluation immediately. Time is critical.\n\n**Call 911 (or your local emergency number) now.**\n\nRemember FAST:\n- Face: Is one side drooping?\n- Arms: Can you raise both?\n- Speech: Is it slurred or strange?\n- Time: Note when symptoms started -- tell the paramedics\n\nDo not wait to see if symptoms improve. Do not drive yourself.",
      "resources": ["911", "Local ER"],
      "follow_up": false
    },
    "suicidal_emergency": {
      "message": "I hear you, and I'm concerned about your safety right now. What you're feeling is serious, and you deserve immediate support from someone who can help.\n\n**Please reach out now:**\n- **988 Suicide & Crisis Lifeline:** Call or text 988 (US)\n- **Crisis Text Line:** Text HOME to 741741\n- **International Association for Suicide Prevention:** https://www.iasp.info/resources/Crisis_Centres/\n- **Emergency Services:** 911\n\nIf you're in immediate danger, please call 911.\n\nYou don't have to go through this alone. A real person can talk with you right now.",
      "resources": ["988 Lifeline", "Crisis Text Line", "911"],
      "follow_up": false
    },
    "psychotic_emergency": {
      "message": "What you're experiencing sounds very distressing and needs in-person evaluation by a mental health professional right away.\n\n**Please reach out now:**\n- **988 Suicide & Crisis Lifeline:** Call or text 988\n- **Emergency Services:** 911\n- **Go to your nearest emergency room**\n\nIf someone is with you, let them know what's happening so they can help.\n\nThis is beyond what I can help with -- you need someone who can be with you in person.",
      "resources": ["988 Lifeline", "911", "Local ER"],
      "follow_up": false
    },
    "overdose": {
      "message": "This is a medical emergency.\n\n**Call 911 (or Poison Control: 1-800-222-1222) immediately.**\n\nIf someone else is with you, have them call while you stay on the line.\n\nTell them:\n- What was taken\n- How much\n- When it was taken\n- Your weight and age\n\nDo not try to induce vomiting unless specifically told to by Poison Control.",
      "resources": ["911", "Poison Control: 1-800-222-1222"],
      "follow_up": false
    }
  }
}
```

### Urgent Response (Severity 70-99)

```json
{
  "response_type": "urgent_redirect",
  "agent_behavior": "RESPOND_WITH_SAFETY_WRAPPER",
  "wrapper_template": {
    "urgent_care_redirect": {
      "pre_message": "Before I share perspectives on this, I want to flag that what you're describing warrants prompt medical evaluation -- ideally today. This isn't something to explore at leisure; please contact your doctor's office or visit an urgent care facility.\n\n---\n",
      "post_message": "\n---\n\n**Important:** Please don't use the perspectives above as a reason to delay seeking care. The information here is for context, not a substitute for the in-person evaluation you need."
    },
    "mental_health_crisis_redirect": {
      "pre_message": "I want to acknowledge what you're going through. Before anything else:\n\n- **988 Suicide & Crisis Lifeline:** Call or text 988\n- **Crisis Text Line:** Text HOME to 741741\n- **SAMHSA Helpline:** 1-800-662-4357\n\nThese are free, confidential, and available 24/7.\n\n---\n",
      "post_message": "\n---\n\nPlease reach out to one of these resources or your mental health provider. You deserve support from someone who can truly be there for you."
    },
    "urgent_prescriber_contact": {
      "pre_message": "What you're describing could be a significant medication reaction. **Contact your prescribing doctor or pharmacist today.** If symptoms worsen or you develop difficulty breathing or swelling, go to the emergency room.\n\n---\n",
      "post_message": "\n---\n\n**Do not stop your medication without consulting your prescriber** -- some medications are dangerous to stop abruptly. Call them for guidance."
    }
  }
}
```

### Caution Response (Severity 30-69)

```json
{
  "response_type": "caution_context",
  "agent_behavior": "RESPOND_NORMALLY_WITH_ADDITIONS",
  "additions": {
    "include_monitoring_reminder": {
      "append": "If any of the symptoms you're describing are new, worsening, or concerning to you, schedule an appointment with your doctor. Monitoring changes over time is important."
    },
    "strong_physician_redirect": {
      "prepend": "**Important:** Medication decisions should always be made with your prescribing physician. Stopping or changing medications without medical guidance can be dangerous. What I can offer is context for a conversation with your doctor, not a basis for unilateral changes.\n\n"
    },
    "include_mental_health_resources": {
      "append": "\n\nHealth concerns can take a toll on mental wellbeing. If you're finding that stress or worry is significantly affecting your daily life, consider speaking with your doctor about it or reaching out to a mental health professional. This is a normal part of managing health conditions."
    }
  }
}
```

---

## False Positive Management

### The Context Window Problem
"I had chest pain last year" and "I'm having chest pain right now" are fundamentally different. The system must distinguish between:

### Temporal Classification

```python
TEMPORAL_CLASSIFIERS = {
    "present_active": {
        "signals": [
            "right now", "currently", "at this moment", "as we speak",
            "I'm having", "I am having", "it's happening", "won't stop",
            "can't stop", "started today", "started this morning",
            "just started", "since this morning", "for the past hour"
        ],
        "action": "full_severity_applies"
    },
    "recent_resolved": {
        "signals": [
            "earlier today", "this morning but it stopped",
            "had it yesterday", "happened last night",
            "went away", "resolved", "stopped after"
        ],
        "action": "reduce_severity_by_one_level_but_flag"
    },
    "historical": {
        "signals": [
            "last year", "years ago", "when I was younger",
            "I used to", "history of", "previously",
            "diagnosed with", "had in 2020", "back in",
            "my doctor told me I had"
        ],
        "action": "no_safety_escalation_use_as_context"
    },
    "hypothetical": {
        "signals": [
            "what if", "if someone had", "hypothetically",
            "would it mean if", "could it be that",
            "is it possible that"
        ],
        "action": "no_safety_escalation_respond_normally"
    },
    "third_person": {
        "signals": [
            "my father", "my mother", "my friend",
            "my spouse", "someone I know", "my patient",
            "a person who"
        ],
        "action": "reduce_severity_but_provide_resources_if_emergency_level"
    }
}
```

### Stage 3 Classification Prompt

This prompt runs ONLY when Stage 1 (pattern matching) produces a hit, to determine if it's a true positive:

```
You are a safety classification system. A user's message has been flagged by
pattern matching for potential safety concern.

FLAGGED PATTERN: {pattern_category}
MATCHED TEXT: {matched_text}
FULL USER MESSAGE: {full_message}
USER CONTEXT: {is this their first message? do they have a medical history loaded?}

Classify this as:
1. TRUE_EMERGENCY - User is describing an active, present-tense emergency
2. TRUE_URGENT - User is describing symptoms that need prompt but not immediate care
3. HISTORICAL_CONTEXT - User is describing past medical history, not a current concern
4. HYPOTHETICAL - User is asking a hypothetical or educational question
5. THIRD_PARTY - User is describing someone else's situation
6. FALSE_POSITIVE - Pattern matched but context clearly shows no safety concern

Return ONLY the classification and a one-sentence justification.
Be conservative: if there is genuine ambiguity about whether this is active,
classify as TRUE_EMERGENCY or TRUE_URGENT. Err on the side of safety.
```

### Specific False Positive Scenarios

| Input | Pattern Match | Correct Classification | Why |
|-------|--------------|----------------------|-----|
| "I have a history of chest pain" | chest pain | HISTORICAL_CONTEXT | "history of" signals past event |
| "My dad had a heart attack at 55" | heart attack | THIRD_PARTY | "My dad" = third person |
| "What does chest pain usually mean?" | chest pain | HYPOTHETICAL | "what does...mean" = educational |
| "I'm having chest pain and shortness of breath" | chest pain + SOB | TRUE_EMERGENCY | Present tense, first person, multiple symptoms |
| "The chest pain I mentioned to my doctor last week" | chest pain | HISTORICAL_CONTEXT | Past interaction with doctor |
| "I sometimes get chest discomfort after eating" | chest discomfort | TRUE_URGENT (downgraded from emergency) | Ongoing symptom but not acute; warrants medical follow-up |

---

## The Graceful Refusal

When the system determines it should not engage with a topic, it must refuse without being dismissive or abandoning the user.

### Refusal Categories and Responses

**Active Emergency:**
```
[Provide emergency resources -- see Emergency Response above]
[Do NOT provide any health exploration content]
[Do NOT continue the conversation about the health topic]
[End with: "Once you've been evaluated and are safe, I'm here to help you
explore and understand your health. Right now, the priority is getting you
care."]
```

**Diagnostic Request:**
```
"I understand you're looking for answers about what's causing [symptoms]. That's
a completely reasonable thing to want. However, diagnosing a condition requires
physical examination, lab work, imaging, and clinical judgment that I simply
cannot replicate. What I can do is help you understand the landscape of
possibilities and prepare excellent questions for your doctor. Would you like
me to do that instead?"
```

**Medication Prescribing:**
```
"I can't recommend specific medications or dosages -- that requires a physician
who knows your full medical picture. What I can offer is general information
about how different classes of medication work for [condition], which might
help you have a more informed conversation with your doctor about your options."
```

**Pediatric Emergency:**
```
"For children, I'm going to err strongly on the side of caution. Please contact
your pediatrician or go to a pediatric emergency room. Children can deteriorate
quickly, and this needs in-person evaluation.

Pediatric emergency resources:
- 911 for emergencies
- Your pediatrician's after-hours line
- Poison Control: 1-800-222-1222 (for ingestions)"
```

**Pregnancy-Related Concerns:**
```
"Pregnancy introduces unique medical considerations that significantly change
how symptoms are evaluated and treated. For the safety of both you and your
baby, please contact your OB-GYN or midwife directly. If you're experiencing
[specific emergency symptoms], go to labor and delivery or the emergency room
now.

I can explore general pregnancy health topics with you, but any symptom
evaluation needs your prenatal care team."
```

---

## Implementation Checklist

1. **Stage 1 regex patterns** run on every user input, every time, with no exceptions
2. **Emergency responses** are hardcoded templates, not LLM-generated (prevents drift)
3. **Crisis hotline numbers** are verified quarterly and regionalized based on user locale
4. **False positive rate** is monitored; target < 5% false positive rate on historical/hypothetical content
5. **True positive capture rate** target is > 99% for EMERGENCY severity patterns
6. **Mental health patterns** are reviewed by a licensed mental health professional before deployment
7. **All safety escalations are logged** for quality assurance review
8. **Safety layer cannot be disabled** by any downstream agent or user instruction
9. **Jailbreak resistance**: The safety layer operates independently of the specialist agent prompt; it cannot be overridden by prompt injection in user messages
10. **Locale awareness**: Emergency numbers (911 vs. 112 vs. 999 vs. 000) adapt to user's region
