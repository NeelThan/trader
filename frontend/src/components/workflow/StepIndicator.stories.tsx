import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StepIndicator, StepIndicatorWithPhases } from "./StepIndicator";

const meta: Meta<typeof StepIndicator> = {
  title: "Workflow/StepIndicator",
  component: StepIndicator,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    currentStep: {
      control: { type: "range", min: 1, max: 8, step: 1 },
    },
  },
  decorators: [
    (Story) => (
      <div className="p-6 bg-background">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StepIndicator>;

export const Step1: Story = {
  name: "Step 1 - Market Selection",
  args: {
    currentStep: 1,
    completedSteps: [],
  },
};

export const Step3WithCompleted: Story = {
  name: "Step 3 - With Completed Steps",
  args: {
    currentStep: 3,
    completedSteps: [1, 2],
  },
};

export const Step6MiddleProgress: Story = {
  name: "Step 6 - Middle Progress",
  args: {
    currentStep: 6,
    completedSteps: [1, 2, 3, 4, 5],
  },
};

export const Step8AllComplete: Story = {
  name: "Step 8 - Final Step",
  args: {
    currentStep: 8,
    completedSteps: [1, 2, 3, 4, 5, 6, 7],
  },
};

export const Interactive: Story = {
  name: "Interactive (Click to Navigate)",
  args: {
    currentStep: 3,
    completedSteps: [1, 2],
    onStepClick: (step: number) => console.log(`Clicked step ${step}`),
  },
};

// WithPhases variant
export const WithPhases: StoryObj<typeof StepIndicatorWithPhases> = {
  render: () => (
    <StepIndicatorWithPhases
      currentStep={4}
      completedSteps={[1, 2, 3]}
      onStepClick={(step) => console.log(`Clicked step ${step}`)}
    />
  ),
};

export const AllStepsShowcase: Story = {
  name: "All Step States",
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm text-muted-foreground mb-2">Step 1 - Just Started</h3>
        <StepIndicator currentStep={1} completedSteps={[]} />
      </div>
      <div>
        <h3 className="text-sm text-muted-foreground mb-2">Step 4 - In Progress</h3>
        <StepIndicator currentStep={4} completedSteps={[1, 2, 3]} />
      </div>
      <div>
        <h3 className="text-sm text-muted-foreground mb-2">Step 8 - Almost Done</h3>
        <StepIndicator currentStep={8} completedSteps={[1, 2, 3, 4, 5, 6, 7]} />
      </div>
    </div>
  ),
};
