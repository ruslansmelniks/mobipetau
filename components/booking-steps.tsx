import { cn } from "@/lib/utils"

type BookingStep = "pet" | "services" | "appointment" | "payment" | "confirmation"

interface BookingStepsProps {
  currentStep: BookingStep
}

export function BookingSteps({ currentStep }: BookingStepsProps) {
  const steps = [
    { id: "pet", label: "Select the pet" },
    { id: "services", label: "Select services" },
    { id: "appointment", label: "Appointment details" },
    { id: "payment", label: "Add payment details" },
    { id: "confirmation", label: "Confirmation" },
  ]

  // Helper function to determine if a step is active, completed, or upcoming
  const getStepStatus = (stepId: string) => {
    const currentIndex = steps.findIndex((step) => step.id === currentStep)
    const stepIndex = steps.findIndex((step) => step.id === stepId)

    if (stepIndex < currentIndex) return "completed"
    if (stepIndex === currentIndex) return "active"
    return "upcoming"
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center flex-1">
            {/* Step circle */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center z-10",
                getStepStatus(step.id) === "active"
                  ? "bg-teal-500 text-white"
                  : getStepStatus(step.id) === "completed"
                    ? "bg-teal-500 text-white"
                    : "bg-white border border-gray-200 text-gray-400",
              )}
              style={{ margin: "0 auto" }}
            >
              {getStepStatus(step.id) === "completed" ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <span className="text-xs">{index + 1}</span>
              )}
            </div>

            {/* Step label */}
            <span
              className={cn(
                "text-xs mt-2 text-center",
                getStepStatus(step.id) === "active"
                  ? "text-teal-500 font-medium"
                  : getStepStatus(step.id) === "completed"
                    ? "text-teal-500"
                    : "text-gray-400",
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
