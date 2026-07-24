import type { ApplicationSchema } from "@/lib/api/admin-applications-service";

/**
 * The standard application form every NEW event starts with. Once an event's
 * schema is edited in the builder and saved, it diverges and becomes custom to
 * that event — this template is only the create-time default.
 *
 * Kept as a plain object literal (not shared by reference) — callers should
 * clone it (see `cloneDefaultApplicationSchema`) before handing it to the
 * builder, which mutates its working copy.
 */
export const DEFAULT_APPLICATION_SCHEMA: ApplicationSchema = {
  version: 2,
  steps: [
    {
      key: "contact_role",
      title: "Let's get started",
      navHint: "Basic info & business context",
      navLabel: "Contact & Role",
      subtitle:
        "Please provide your contact details and current professional context.",
      sections: [
        {
          label: "BASIC INFORMATION",
          fields: [
            {
              key: "first_name",
              type: "text",
              label: "First Name",
              mapped: "first_name",
              required: true,
              maxLength: 80,
              columnSpan: 1,
              placeholder: "Enter your first name",
            },
            {
              key: "last_name",
              type: "text",
              label: "Last Name",
              mapped: "last_name",
              required: true,
              maxLength: 80,
              columnSpan: 1,
              placeholder: "Enter your last name",
            },
            {
              key: "preferred_name",
              type: "text",
              label: "Preferred Name",
              optional: true,
              maxLength: 80,
              columnSpan: 2,
              placeholder: "What should we call you?",
              optionalLabel: "optional",
            },
            {
              key: "email",
              icon: "mail",
              type: "email",
              label: "Email Address",
              mapped: "email",
              required: true,
              columnSpan: 1,
              placeholder: "you@company.com",
            },
            {
              key: "phone",
              icon: "phone",
              type: "tel",
              label: "Mobile Phone",
              mapped: "phone",
              required: true,
              maxLength: 32,
              columnSpan: 1,
              placeholder: "(555) 123-4567",
            },
          ],
        },
        {
          label: "BUSINESS CONTEXT",
          fields: [
            {
              key: "current_title",
              type: "text",
              label: "Current Title",
              required: true,
              maxLength: 120,
              columnSpan: 1,
              placeholder: "CEO, Founder, etc.",
            },
            {
              key: "organization",
              type: "text",
              label: "Organization Name",
              required: true,
              maxLength: 160,
              columnSpan: 1,
              placeholder: "Company or organization name",
            },
            {
              key: "organization_type",
              type: "select",
              label: "Organization Type",
              options: [
                "Privately held business",
                "Public company",
                "Family-owned business",
                "Ministry / Church",
                "Nonprofit",
                "Education",
                "Government / Civic",
                "Other",
              ],
              required: true,
              columnSpan: 2,
              placeholder: "Select an option...",
            },
            {
              key: "team_size",
              type: "select",
              label: "Number of Employees",
              options: [
                "Just me",
                "1–10",
                "11–50",
                "51–200",
                "201–500",
                "501–1,000",
                "1,000+",
              ],
              required: true,
              columnSpan: 1,
              placeholder: "Select range...",
            },
            {
              key: "years_leading",
              type: "select",
              label: "Years in Leadership",
              options: ["Less than 2", "2–5", "6–10", "11–20", "20+"],
              required: true,
              columnSpan: 1,
              placeholder: "Select range...",
            },
          ],
        },
      ],
    },
    {
      key: "leadership_season",
      title: "Leadership Season",
      navHint: "Understanding stages",
      navLabel: "Leadership Season",
      subtitle:
        "Help us understand your current moment. These questions guide us in creating the most meaningful experience for you.",
      sections: [
        {
          label: "CURRENT LEADERSHIP SEASON",
          fields: [
            {
              key: "season",
              type: "checkbox_group",
              label: "What best describes your current leadership season?",
              options: [
                {
                  icon: "rocket",
                  label: "Rapid growth and increased responsibility",
                  value: "rapid_growth",
                },
                {
                  icon: "shuffle",
                  label: "Organizational transition or restructuring",
                  value: "transition",
                },
                {
                  icon: "trending-down",
                  label: "Plateau or loss of clarity",
                  value: "plateau",
                },
                {
                  icon: "battery-low",
                  label: "Personal fatigue or decision fatigue",
                  value: "fatigue",
                },
                {
                  icon: "maximize",
                  label: "Preparing for next-level expansion",
                  value: "expansion",
                },
                {
                  icon: "users",
                  label: "Succession planning",
                  value: "succession",
                },
                {
                  icon: "life-buoy",
                  label: "Crisis navigation",
                  value: "crisis",
                },
                {
                  icon: "more-horizontal",
                  label: "Other",
                  value: "other",
                },
              ],
              helpText: "Select up to 2 options that resonate most",
              required: true,
              maxSelect: 2,
              columnSpan: 2,
            },
          ],
        },
        {
          label: "WHAT PROMPTED YOU",
          fields: [
            {
              key: "prompted_by",
              type: "text",
              label: "In one sentence, what prompted you to apply?",
              helpText: "What shifted, increased, or felt misaligned?",
              required: true,
              maxLength: 150,
              columnSpan: 2,
              placeholder:
                "e.g., Success is present, but margin and peace feel distant…",
            },
          ],
        },
        {
          label: "AREA OF FOCUS",
          fields: [
            {
              key: "clarity_area",
              icon: "compass",
              type: "select",
              label: "Where do you most need clarity right now?",
              options: [
                "Personal alignment & identity",
                "Family & relationships",
                "Vision & strategy",
                "Succession & legacy",
                "Team & culture",
                "Stewardship & generosity",
                "Faith & spiritual rhythm",
                "Pace & sustainability",
              ],
              required: true,
              columnSpan: 2,
              placeholder: "Select your primary area of need",
            },
          ],
        },
      ],
    },
    {
      key: "alignment_formation",
      title: "Alignment & Formation",
      navHint: "Spiritual context & rhythms",
      navLabel: "Alignment & Formation",
      subtitle:
        "Help us understand your spiritual context and practices. These questions are designed to assess fit, not evaluate theology.",
      sections: [
        {
          label: "SPIRITUAL FOUNDATIONS",
          fields: [
            {
              key: "spiritual_foundation",
              type: "select",
              label:
                "How would you describe your current spiritual foundation in leadership?",
              options: [
                "Central — it shapes my daily leadership",
                "Important — present but not always integrated",
                "Forming — actively growing in this area",
                "Exploring — open and curious",
                "Private — kept separate from my work",
              ],
              required: true,
              columnSpan: 2,
              placeholder: "Select your current foundation...",
            },
          ],
        },
        {
          label: "FORMATION RHYTHMS",
          fields: [
            {
              key: "rhythms",
              type: "checkbox_group",
              label:
                "Do you regularly practice any rhythms of reflection or formation?",
              options: [
                {
                  icon: "book-open",
                  label: "Scripture study",
                  value: "scripture",
                },
                {
                  icon: "feather",
                  label: "Structured prayer",
                  value: "prayer",
                },
                {
                  icon: "edit-3",
                  label: "Journaling",
                  value: "journaling",
                },
                {
                  icon: "calendar",
                  label: "Sabbath rhythm",
                  value: "sabbath",
                },
                {
                  icon: "user-check",
                  label: "Coaching or spiritual direction",
                  value: "coaching",
                },
                {
                  icon: "minus",
                  label: "None currently",
                  value: "none",
                },
                {
                  icon: "more-horizontal",
                  label: "Other",
                  value: "other",
                },
              ],
              helpText: "Select all that apply",
              required: true,
              columnSpan: 2,
            },
          ],
        },
        {
          label: "DESIRED OUTCOME",
          fields: [
            {
              key: "desired_outcome",
              type: "textarea",
              label: "What outcome would make this retreat meaningful for you?",
              helpText: "Describe the shift you hope to experience.",
              required: true,
              maxLength: 400,
              columnSpan: 2,
              placeholder:
                "e.g., I hope to reconnect with my sense of purpose, gain clarity on the next season of leadership, and find renewed peace in my decision-making…",
            },
          ],
        },
      ],
    },
    {
      key: "commitment_logistics",
      title: "Commitment & Logistics",
      navHint: "Retreat readiness & details",
      navLabel: "Commitment & Logistics",
      subtitle:
        "These final questions help us confirm your readiness and ensure we can accommodate your needs.",
      sections: [
        {
          label: "RETREAT ENGAGEMENT",
          fields: [
            {
              key: "engagement",
              type: "radio",
              label:
                "Are you prepared to fully disengage from daily business operations during the retreat?",
              options: [
                "Yes, I will fully disconnect",
                "I will minimize engagement",
                "I am unsure",
              ],
              required: true,
              columnSpan: 2,
            },
          ],
        },
        {
          label: "HOW YOU FOUND US",
          fields: [
            {
              key: "referred_by",
              type: "select",
              label: "How did you hear about Aligned?",
              options: [
                "A friend or colleague",
                "Social media",
                "Curt Landry's content",
                "Podcast",
                "Web search",
                "Past attendee",
                "Other",
              ],
              required: true,
              columnSpan: 2,
              placeholder: "Select how you heard about us...",
            },
          ],
        },
        {
          label: "PREVIOUS EXPERIENCE",
          fields: [
            {
              key: "previous_attendance",
              type: "radio",
              label:
                "Have you attended a Summit Leadership Center retreat before?",
              options: ["No", "Yes—Aligned", "Yes—Other Summit retreat"],
              required: true,
              columnSpan: 2,
            },
          ],
        },
        {
          label: "ACCOMMODATIONS (OPTIONAL)",
          fields: [
            {
              key: "accommodations",
              type: "textarea",
              label:
                "Is there anything we should know regarding health, mobility, or dietary needs?",
              helpText: "Dietary restrictions, accessibility needs, etc.",
              optional: true,
              maxLength: 400,
              columnSpan: 2,
              placeholder:
                "e.g., Vegetarian diet, wheelchair accessibility required, food allergies…",
            },
          ],
        },
      ],
    },
    {
      key: "review_submit",
      title: "Review & Submit",
      navHint: "Final confirmation",
      navLabel: "Review & Submit",
      subtitle:
        "Before you submit, please confirm your readiness and agreement.",
      sections: [
        {
          label: "PERSONAL COMMITMENT",
          fields: [
            {
              key: "_about",
              body: "This retreat is designed for business leaders willing to examine alignment, identity, and stewardship. It requires openness, reflection, and a commitment to personal growth.",
              icon: "compass",
              type: "info_callout",
              label: "About This Retreat",
              variant: "info",
              columnSpan: 2,
            },
            {
              key: "ready_commitment",
              type: "checkbox",
              label: "Do you feel ready for that process?",
              required: true,
              columnSpan: 2,
              description:
                "Yes, I am applying with intention. I understand the nature of this retreat and am prepared to engage fully.",
            },
          ],
        },
        {
          label: "AGREEMENT",
          fields: [
            {
              key: "agree_application_based",
              type: "checkbox",
              label: "I understand this is an application-based retreat.",
              required: true,
              columnSpan: 2,
            },
            {
              key: "agree_no_guarantee",
              type: "checkbox",
              label:
                "I understand submission does not guarantee acceptance.",
              required: true,
              columnSpan: 2,
            },
            {
              key: "agree_contact",
              type: "checkbox",
              label: "I agree to be contacted regarding next steps.",
              required: true,
              columnSpan: 2,
            },
          ],
        },
        {
          fields: [
            {
              key: "_what_next",
              body: "✓ Our team will review your application within 5-7 business days\n✓ You'll receive an email with our decision and next steps\n✓ If accepted, you'll receive retreat details and payment information",
              icon: "lightbulb",
              type: "info_callout",
              label: "What Happens Next?",
              variant: "info",
              columnSpan: 2,
            },
          ],
        },
      ],
    },
  ],
};

/** Fresh deep copy so the builder can mutate without touching the template. */
export function cloneDefaultApplicationSchema(): ApplicationSchema {
  return structuredClone(DEFAULT_APPLICATION_SCHEMA);
}
