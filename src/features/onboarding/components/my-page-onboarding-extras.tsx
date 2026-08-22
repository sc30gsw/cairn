import { CatalogSamplesPreview } from "~/features/onboarding/components/catalog-samples-preview";
import { SetupChecklist } from "~/features/onboarding/components/setup-checklist";
import { useSetupStatus } from "~/features/onboarding/hooks/use-setup-status";

export function MyPageOnboardingExtras() {
  const { status } = useSetupStatus();
  const catalogSamples = status.hasPresets ? null : <CatalogSamplesPreview />;

  if (status.isComplete) {
    return catalogSamples;
  }

  return (
    <>
      <SetupChecklist />
      {catalogSamples}
    </>
  );
}
